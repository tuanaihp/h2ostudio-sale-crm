import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const loginWithGoogle = () => {
  // Nếu đang ở trang admin → về admin/consultations sau login
  // Nếu đang ở trang public (style, album...) → quay lại đúng trang đó
  const isAdminPage = window.location.pathname.startsWith('/admin');
  const returnTo = isAdminPage ? '/admin/consultations' : window.location.pathname + window.location.search;
  // Lưu returnTo để App redirect về sau khi OAuth callback
  if (!isAdminPage) sessionStorage.setItem('h2o_auth_return_to', returnTo);
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/admin/consultations` },
  });
};

export const logout = () => supabase.auth.signOut();

export type { User } from '@supabase/supabase-js';
