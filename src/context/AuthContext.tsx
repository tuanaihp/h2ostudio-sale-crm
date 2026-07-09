import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, loginWithGoogle, logout } from '../supabase';

const LIKE_SESSION_KEY = 'h2o_like_session';
const getLikeSessionId = () => {
  let id = localStorage.getItem(LIKE_SESSION_KEY);
  if (!id) {
    id = `ls-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(LIKE_SESSION_KEY, id);
  }
  return id;
};
import type { User } from '@supabase/supabase-js';
import type { DbUserRoleRow } from '../types';

// Hardcoded staff phones (primary admin phone whitelist)
const HARDCODED_STAFF_PHONES = [
  '0899252393', '0973685994', '0363234909',
  '+84899252393', '+84973685994', '+84363234909',
];

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthReady: boolean;
  userPhone: string | null;
  setUserPhone: (phone: string, name?: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  login: () => Promise<void>;
  handleLogout: () => Promise<void>;
  checkPhoneInWhitelist: (phone: string | null | undefined, extraPhones?: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [userPhone, setUserPhoneState] = useState<string | null>(() =>
    localStorage.getItem('h2o_user_phone')
  );
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('h2o_favorites');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('h2o_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    const sessionId = getLikeSessionId();
    setFavorites(prev => {
      const isAdding = !prev.includes(id);
      if (isAdding) {
        supabase.from('album_likes')
          .upsert({ album_id: id, session_id: sessionId }, { onConflict: 'album_id,session_id' })
          .then(() => {});
      } else {
        supabase.from('album_likes')
          .delete().eq('album_id', id).eq('session_id', sessionId)
          .then(() => {});
      }
      return isAdding ? [...prev, id] : prev.filter(fId => fId !== id);
    });
  }, []);

  const checkPhoneInWhitelist = useCallback((
    p: string | null | undefined,
    extraPhones: string[] = []
  ): boolean => {
    if (!p) return false;
    const raw = p.replace(/[\s.\-()]/g, '');
    const noVN = raw.startsWith('+84') ? '0' + raw.slice(3) : raw;
    const withVN = raw.startsWith('0') ? '+84' + raw.slice(1) : raw;
    const all = [...HARDCODED_STAFF_PHONES, ...extraPhones];
    return all.includes(raw) || all.includes(noVN) || all.includes(withVN);
  }, []);

  const isSuperAdmin = useMemo(() =>
    userRole === 'super_admin' || userRole === 'supper_admin' ||
    // Chỉ dùng user?.phone từ Supabase session (server-verified), không từ localStorage
    checkPhoneInWhitelist(user?.phone),
    [userRole, user?.phone, checkPhoneInWhitelist]
  );

  const isAdmin = useMemo(() =>
    isSuperAdmin || userRole === 'admin' || userRole === 'staff' ||
    // Chỉ dùng user?.phone từ Supabase session (server-verified), không từ localStorage
    checkPhoneInWhitelist(user?.phone),
    [isSuperAdmin, userRole, user?.phone, checkPhoneInWhitelist]
  );

  const loadUserRole = useCallback(async (currentUser: User) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle<DbUserRoleRow>();

      if (data) {
        setUserRole(data.role);
      } else {
        const email = currentUser.email || '';
        const adminEmail = (import.meta as any).env?.VITE_ADMIN_EMAIL || '';
        if (adminEmail && email === adminEmail) {
          setUserRole('super_admin');
          await supabase.from('user_roles').upsert({
            id: currentUser.id, email,
            phone_number: currentUser.phone || '',
            role: 'super_admin', display_name: 'Admin Principal',
          });
        } else {
          setUserRole('client');
        }
      }
    } catch (err) {
      console.warn('Could not load user role:', err);
      setUserRole('client');
    }
    setIsAuthReady(true);
  }, []);

  useEffect(() => {
    // Fallback: nếu Supabase auth treo >3s thì bỏ qua, render trang bình thường
    const fallback = setTimeout(() => setIsAuthReady(true), 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      clearTimeout(fallback);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) { setUserRole(null); setIsAuthReady(true); }
      else { await loadUserRole(currentUser); }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { clearTimeout(fallback); setIsAuthReady(true); }
    });
    return () => { subscription.unsubscribe(); clearTimeout(fallback); };
  }, [loadUserRole]);

  const setUserPhone = useCallback((phone: string, customerName?: string) => {
    localStorage.setItem('h2o_user_phone', phone);
    setUserPhoneState(phone);
    // Server check trước khi insert — tránh tạo bản ghi trùng SĐT
    supabase.from('consultations').select('id').eq('phone', phone).limit(1).maybeSingle()
      .then(({ data: existing }) => {
        if (existing) return; // SĐT đã tồn tại, bỏ qua
        supabase.from('consultations').insert({
          id: `consult-${Date.now()}`,
          name: customerName || `Khách mới (${phone})`,
          phone,
          status: 'new',
          message: 'Khách hàng vượt qua màn hình đăng ký xem ảnh (PhoneGate) và cung cấp thông tin để trải nghiệm.',
        }).then(({ error }) => { if (error) console.warn('PhoneGate insert failed:', error.message); });
      });
  }, []);

  const login = useCallback(async () => {
    try { await loginWithGoogle(); } catch (err) { console.error('Login failed:', err); }
  }, []);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch (err) { console.error('Logout failed:', err); }
    finally {
      localStorage.removeItem('h2o_user_phone');
      setUserPhoneState(null);
      window.location.href = '/';
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, userRole, isAdmin, isSuperAdmin, isAuthReady,
      userPhone, setUserPhone, favorites, toggleFavorite,
      login, handleLogout, checkPhoneInWhitelist,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
