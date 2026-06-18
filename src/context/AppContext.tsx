import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Consultation, Style, Album, Photo, EditorState, AppSettings } from '../types';
import { STYLES as MOCK_STYLES } from '../data/mockData';
import { uploadImageToStorage, deleteImageFromStorage } from '../utils/image';
import { supabase, loginWithGoogle, logout } from '../supabase';
import type { User } from '@supabase/supabase-js';
import { GOOGLE_SCRIPT_URL, LARK_FALLBACK_URL } from '../utils/config';

// ─── DB row → TypeScript object mappers ───────────────────────────────────────

const dbToStyle = (row: any): Style => ({
  id: row.id,
  slug: row.slug || '',
  title: row.title || '',
  description: row.description || '',
  coverImage: row.cover_image || '',
  design: row.design,
  order: row.order ?? 0,
  category: row.category,
  deleted: row.deleted,
  deletedAt: row.deleted_at,
  albums: [],
});

const dbToAlbum = (row: any): Album => ({
  id: row.id,
  slug: row.slug || '',
  title: row.title || '',
  description: row.description || '',
  coverImage: row.cover_image || '',
  coverImagePos: row.cover_image_pos,
  design: row.design,
  order: row.order ?? 0,
  suggestedLayout: row.suggested_layout,
  suitableFor: row.suitable_for,
  displayLikes: row.display_likes,
  deleted: row.deleted,
  deletedAt: row.deleted_at,
  photos: [],
});

const dbToPhoto = (row: any): Photo => ({
  id: row.id,
  image: row.image || '',
  alt: row.alt || '',
  design: row.design,
  order: row.order ?? 0,
  deleted: row.deleted,
  deletedAt: row.deleted_at,
});

const dbToConsultation = (row: any): Consultation => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  message: row.message,
  date: row.date,
  createdAt: row.created_at,
  status: row.status,
  notes: row.notes,
  tags: row.tags,
  conceptId: row.concept_id,
  shootingDate: row.shooting_date,
  engagementDate: row.engagement_date,
  weddingDate: row.wedding_date,
  deliveryDate: row.delivery_date,
  favoriteIds: row.favorite_ids,
  source: row.source,
  luckyGift: row.lucky_gift,
  assignedTo: row.assigned_to,
  followUpDate: row.follow_up_date,
  contractValue: row.contract_value,
});

const consultationToDB = (data: Partial<Consultation>): any => {
  const row: any = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.phone !== undefined) row.phone = data.phone;
  if (data.message !== undefined) row.message = data.message;
  if (data.date !== undefined) row.date = data.date;
  if (data.status !== undefined) row.status = data.status;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.tags !== undefined) row.tags = data.tags;
  if (data.conceptId !== undefined) row.concept_id = data.conceptId;
  if (data.shootingDate !== undefined) row.shooting_date = data.shootingDate;
  if (data.engagementDate !== undefined) row.engagement_date = data.engagementDate;
  if (data.weddingDate !== undefined) row.wedding_date = data.weddingDate;
  if (data.deliveryDate !== undefined) row.delivery_date = data.deliveryDate;
  if (data.favoriteIds !== undefined) row.favorite_ids = data.favoriteIds;
  if (data.source !== undefined) row.source = data.source;
  if (data.luckyGift !== undefined) row.lucky_gift = data.luckyGift;
  if (data.assignedTo !== undefined) row.assigned_to = data.assignedTo;
  if (data.followUpDate !== undefined) row.follow_up_date = data.followUpDate;
  if (data.contractValue !== undefined) row.contract_value = data.contractValue;
  return row;
};

// ─── Context type ────────────────────────────────────────────────────────────

interface AppContextType {
  styles: Style[];
  setStyles: React.Dispatch<React.SetStateAction<Style[]>>;
  isDataLoaded: boolean;
  user: User | null;
  isAuthReady: boolean;
  login: () => Promise<void>;
  handleLogout: () => Promise<void>;
  addStyle: (editorState: EditorState) => Promise<void>;
  addAlbum: (styleSlug: string, editorState: EditorState) => Promise<void>;
  addPhoto: (styleSlug: string, albumSlug: string, editorState: EditorState) => Promise<void>;
  deleteStyle: (styleId: string) => Promise<void>;
  deleteAlbum: (styleSlug: string, albumId: string) => Promise<void>;
  deletePhoto: (styleSlug: string, albumSlug: string, photoId: string) => Promise<void>;
  restoreStyle: (styleId: string) => Promise<void>;
  restoreAlbum: (styleSlug: string, albumId: string) => Promise<void>;
  restorePhoto: (styleSlug: string, albumSlug: string, photoId: string) => Promise<void>;
  permanentDeleteStyle: (styleId: string) => Promise<void>;
  permanentDeleteAlbum: (styleSlug: string, albumId: string) => Promise<void>;
  permanentDeletePhoto: (styleSlug: string, albumSlug: string, photoId: string) => Promise<void>;
  updatePhoto: (styleSlug: string, albumSlug: string, photoId: string, image: string) => Promise<void>;
  updateAlbumCover: (styleSlug: string, albumSlug: string, coverImage: string) => Promise<void>;
  updateStyleCover: (styleId: string, coverImage: string) => Promise<void>;
  updateAlbumCoverPos: (styleSlug: string, albumSlug: string, pos: { x: number; y: number }) => Promise<void>;
  updateAlbumText: (styleSlug: string, albumSlug: string, field: 'title' | 'description' | 'suggestedLayout' | 'suitableFor' | 'displayLikes', value: string) => Promise<void>;
  updateStyleText: (styleSlug: string, field: 'title' | 'description', value: string) => Promise<void>;
  reorderStyles: (newStyles: Style[]) => Promise<void>;
  reorderAlbums: (styleId: string, newAlbums: Album[]) => Promise<void>;
  reorderPhotos: (styleId: string, albumId: string, newPhotos: Photo[]) => Promise<void>;
  moveStyle: (styleId: string, direction: 'prev' | 'next') => Promise<void>;
  moveAlbum: (styleId: string, albumId: string, direction: 'prev' | 'next') => Promise<void>;
  movePhoto: (styleId: string, albumId: string, photoId: string, direction: 'prev' | 'next') => Promise<void>;
  submitConsultation: (data: { name: string; phone: string; email?: string; message?: string; date?: Date; favoriteIds?: string[]; source?: string; luckyGift?: string }) => Promise<void>;
  consultations: Consultation[];
  updateConsultationStatus: (id: string, status: 'new' | 'contacted' | 'registered') => Promise<void>;
  updateConsultationRegistration: (id: string, data: Partial<Consultation>) => Promise<void>;
  updateConsultationNotes: (id: string, notes: string) => Promise<void>;
  updateConsultationTags: (id: string, tags: string[]) => Promise<void>;
  updateConsultationField: (id: string, field: string, value: any) => Promise<void>;
  deleteConsultation: (id: string) => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userPhone: string | null;
  setUserPhone: (phone: string, name?: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  fetchAlbums: (styleId: string) => Promise<void>;
  fetchPhotos: (styleId: string, albumId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [styles, setStyles] = useState<Style[]>([]);
  const stylesRef = useRef<Style[]>([]);
  const requestedAlbumsRef = useRef<Set<string>>(new Set());
  const requestedPhotosRef = useRef<Set<string>>(new Set());

  useEffect(() => { stylesRef.current = styles; }, [styles]);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    staffPhones: ['0899252393', '0973685994', '0363234909'],
  });
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
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('h2o_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
  };

  const setUserPhone = (phone: string, customerName?: string) => {
    localStorage.setItem('h2o_user_phone', phone);
    setUserPhoneState(phone);
    submitConsultation({
      name: customerName || `Khách mới (${phone})`,
      phone,
      message: 'Khách hàng vượt qua màn hình đăng ký xem ảnh (PhoneGate) và cung cấp thông tin để trải nghiệm.',
    }).catch(console.error);
  };

  const allStaffPhones = useMemo(() => [
    '0899252393', '0973685994', '0363234909',
    '+84899252393', '+84973685994', '+84363234909',
    ...(settings?.staffPhones || []),
  ], [settings?.staffPhones]);

  const checkPhoneInWhitelist = useCallback((p: string | null | undefined): boolean => {
    if (!p) return false;
    const raw = p.replace(/[\s.\-()]/g, '');
    const noVN = raw.startsWith('+84') ? '0' + raw.slice(3) : raw;
    const withVN = raw.startsWith('0') ? '+84' + raw.slice(1) : raw;
    return allStaffPhones.includes(raw) || allStaffPhones.includes(noVN) || allStaffPhones.includes(withVN);
  }, [allStaffPhones]);

  const isSuperAdmin = useMemo(() =>
    userRole === 'super_admin' ||
    userRole === 'supper_admin' ||
    checkPhoneInWhitelist(userPhone) ||
    checkPhoneInWhitelist(user?.phone),
  [userRole, userPhone, user?.phone, checkPhoneInWhitelist]);

  const isAdmin = useMemo(() =>
    isSuperAdmin ||
    userRole === 'admin' ||
    userRole === 'staff' ||
    checkPhoneInWhitelist(userPhone) ||
    checkPhoneInWhitelist(user?.phone),
  [isSuperAdmin, userRole, userPhone, user?.phone, checkPhoneInWhitelist]);

  // ─── Load user role from Supabase ──────────────────────────────────────────
  const loadUserRole = useCallback(async (currentUser: User) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (data) {
        setUserRole(data.role);
      } else {
        const email = currentUser.email || '';
        const adminEmail = (import.meta as any).env?.VITE_ADMIN_EMAIL || '';
        const isDefaultAdmin = adminEmail ? email === adminEmail : false;

        if (isDefaultAdmin) {
          setUserRole('super_admin');
          await supabase.from('user_roles').upsert({
            id: currentUser.id,
            email,
            phone_number: currentUser.phone || '',
            role: 'super_admin',
            display_name: 'Admin Principal',
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

  // ─── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) {
        setUserRole(null);
        setIsAuthReady(true);
      } else {
        await loadUserRole(currentUser);
      }
    });

    // Check initial session in case of OAuth redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, [loadUserRole]);

  // ─── Load settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('settings').select('data').eq('id', 'global').maybeSingle();
      if (data?.data) setSettings(data.data as AppSettings);
    };
    loadSettings();

    const channel = supabase.channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.global' },
        () => loadSettings()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ─── Load styles ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthReady) return;

    const loadStyles = async () => {
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('deleted', false)
        .order('order', { ascending: true });

      if (error) {
        console.warn('Could not load styles:', error.message);
        setIsDataLoaded(true);
        return;
      }

      if (!data || data.length === 0) {
        if (isAdmin) {
          await seedInitialData();
          const { data: seeded } = await supabase
            .from('styles')
            .select('*')
            .eq('deleted', false)
            .order('order', { ascending: true });
          setStyles((seeded || []).map(row => ({ ...dbToStyle(row), albums: [] })));
        }
        setIsDataLoaded(true);
        return;
      }

      setStyles(prev => {
        return data.map(row => {
          const existing = prev.find(s => s.id === row.id);
          return { ...dbToStyle(row), albums: existing?.albums || [] };
        });
      });
      setIsDataLoaded(true);
    };

    loadStyles();
  }, [isAuthReady, isAdmin]);

  // ─── Load consultations (real-time) ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthReady || !isAdmin) return;

    const loadConsultations = async () => {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== 'PGRST301') console.warn('Consultations error:', error.message);
        return;
      }
      setConsultations((data || []).map(dbToConsultation));
    };

    loadConsultations();

    const channel = supabase.channel('consultations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setConsultations(prev => [dbToConsultation(payload.new), ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setConsultations(prev => prev.map(c => c.id === (payload.new as any).id ? dbToConsultation(payload.new) : c));
        } else if (payload.eventType === 'DELETE') {
          setConsultations(prev => prev.filter(c => c.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthReady, isAdmin]);

  // ─── Seed initial data ──────────────────────────────────────────────────────
  const seedInitialData = async () => {
    if (!user) return;
    try {
      for (const style of MOCK_STYLES) {
        const { albums, ...styleData } = style;
        await supabase.from('styles').upsert({
          id: styleData.id,
          slug: styleData.slug,
          title: styleData.title,
          description: styleData.description,
          cover_image: styleData.coverImage,
          design: styleData.design,
          order: styleData.order,
        }, { onConflict: 'id' });

        for (const album of albums) {
          const { photos, ...albumData } = album;
          await supabase.from('albums').upsert({
            id: albumData.id,
            style_id: style.id,
            slug: albumData.slug,
            title: albumData.title,
            description: albumData.description,
            cover_image: albumData.coverImage,
            design: albumData.design,
            order: albumData.order,
          }, { onConflict: 'id' });

          if (photos.length > 0) {
            await supabase.from('photos').upsert(
              photos.map(p => ({
                id: p.id,
                album_id: album.id,
                style_id: style.id,
                image: p.image,
                alt: p.alt,
                design: p.design,
                order: p.order,
              })),
              { onConflict: 'id' }
            );
          }
        }
      }
    } catch (err) {
      console.error('Error seeding data:', err);
    }
  };

  // ─── Fetch albums / photos (lazy) ───────────────────────────────────────────
  const fetchAlbums = async (styleId: string) => {
    if (requestedAlbumsRef.current.has(styleId)) return;
    requestedAlbumsRef.current.add(styleId);

    const { data } = await supabase
      .from('albums')
      .select('*')
      .eq('style_id', styleId)
      .eq('deleted', false)
      .order('order', { ascending: true });

    setStyles(prev => prev.map(s => {
      if (s.id !== styleId) return s;
      const albums = (data || []).map(row => {
        const existing = (s.albums || []).find(a => a.id === row.id);
        return { ...dbToAlbum(row), photos: existing?.photos || [] };
      });
      return { ...s, albums };
    }));
  };

  const fetchPhotos = async (styleId: string, albumId: string) => {
    const key = `${styleId}_${albumId}`;
    if (requestedPhotosRef.current.has(key)) return;
    requestedPhotosRef.current.add(key);

    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', albumId)
      .eq('deleted', false)
      .order('order', { ascending: true });

    setStyles(prev => prev.map(s => {
      if (s.id !== styleId) return s;
      return {
        ...s,
        albums: (s.albums || []).map(a =>
          a.id === albumId ? { ...a, photos: (data || []).map(dbToPhoto) } : a
        ),
      };
    }));
  };

  // ─── Touch style (update updatedAt) ─────────────────────────────────────────
  const touchStyle = async (styleId: string) => {
    await supabase.from('styles').update({ updated_at: new Date().toISOString() }).eq('id', styleId);
  };

  // ─── Move helpers ───────────────────────────────────────────────────────────
  const moveStyle = async (styleId: string, direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    let updatedStyles: Style[] | null = null;

    setStyles(prev => {
      const currentIndex = prev.findIndex(s => s.id === styleId);
      if (currentIndex < 0) return prev;
      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newStyles = [...prev];
      [newStyles[currentIndex], newStyles[newIndex]] = [newStyles[newIndex], newStyles[currentIndex]];
      updatedStyles = newStyles;
      return newStyles;
    });

    if (updatedStyles) {
      try { await reorderStyles(updatedStyles); } catch (err) { console.error(err); }
    }
  };

  const moveAlbum = async (styleId: string, albumId: string, direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    let updatedAlbums: Album[] | null = null;

    setStyles(prev => {
      const styleIndex = prev.findIndex(s => s.id === styleId);
      if (styleIndex < 0) return prev;
      const style = prev[styleIndex];
      const albums = style.albums || [];
      const currentIndex = albums.findIndex(a => a.id === albumId);
      if (currentIndex < 0) return prev;
      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= albums.length) return prev;

      const newAlbums = [...albums];
      [newAlbums[currentIndex], newAlbums[newIndex]] = [newAlbums[newIndex], newAlbums[currentIndex]];
      updatedAlbums = newAlbums;

      const newStyles = [...prev];
      newStyles[styleIndex] = { ...style, albums: newAlbums };
      return newStyles;
    });

    if (updatedAlbums) {
      try { await reorderAlbums(styleId, updatedAlbums); } catch (err) { console.error(err); }
    }
  };

  const movePhoto = async (styleId: string, albumId: string, photoId: string, direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    let updatedPhotos: Photo[] | null = null;

    setStyles(prev => {
      const styleIndex = prev.findIndex(s => s.id === styleId);
      if (styleIndex < 0) return prev;
      const style = prev[styleIndex];
      const albumIndex = (style.albums || []).findIndex(a => a.id === albumId);
      if (albumIndex < 0) return prev;
      const album = style.albums![albumIndex];
      const photos = album.photos || [];
      const currentIndex = photos.findIndex(p => p.id === photoId);
      if (currentIndex < 0) return prev;
      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= photos.length) return prev;

      const newPhotos = [...photos];
      [newPhotos[currentIndex], newPhotos[newIndex]] = [newPhotos[newIndex], newPhotos[currentIndex]];
      updatedPhotos = newPhotos;

      const newAlbums = [...style.albums!];
      newAlbums[albumIndex] = { ...album, photos: newPhotos };
      const newStyles = [...prev];
      newStyles[styleIndex] = { ...style, albums: newAlbums };
      return newStyles;
    });

    if (updatedPhotos) {
      try { await reorderPhotos(styleId, albumId, updatedPhotos); } catch (err) { console.error(err); }
    }
  };

  // ─── Style CRUD ──────────────────────────────────────────────────────────────
  const addStyle = async (state: EditorState) => {
    if (!user || !isAdmin) return;
    const id = `style-${Date.now()}`;
    const slug = `new-style-${Date.now()}`;
    const order = styles.length;

    const uploadedState = { ...state };
    if (uploadedState.mainImage) uploadedState.mainImage = await uploadImageToStorage(uploadedState.mainImage, `styles/${id}/mainImage.jpg`, uploadedState.text);
    if (uploadedState.logo1) uploadedState.logo1 = await uploadImageToStorage(uploadedState.logo1, `styles/${id}/logo1.png`, uploadedState.text);
    if (uploadedState.logo2) uploadedState.logo2 = await uploadImageToStorage(uploadedState.logo2, `styles/${id}/logo2.png`, uploadedState.text);

    const newStyle: Style = {
      id, slug,
      title: uploadedState.text || 'Phong cách mới',
      description: 'Phong cách được thiết kế riêng',
      coverImage: uploadedState.mainImage || 'https://picsum.photos/seed/new/600/900',
      design: uploadedState, order, albums: [],
    };
    setStyles(prev => [...prev, newStyle]);

    const { error } = await supabase.from('styles').insert({
      id, slug, title: newStyle.title, description: newStyle.description,
      cover_image: newStyle.coverImage, design: uploadedState, order,
    });
    if (error) { setStyles(stylesRef.current); throw error; }
  };

  const addAlbum = async (styleSlug: string, state: EditorState) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;

    const id = `album-${Date.now()}`;
    const slug = `new-album-${Date.now()}`;
    const order = style.albums?.length || 0;

    const uploadedState = { ...state };
    if (uploadedState.mainImage) uploadedState.mainImage = await uploadImageToStorage(uploadedState.mainImage, `styles/${style.id}/albums/${id}/mainImage.jpg`, uploadedState.text);
    if (uploadedState.logo1) uploadedState.logo1 = await uploadImageToStorage(uploadedState.logo1, `styles/${style.id}/albums/${id}/logo1.png`, uploadedState.text);
    if (uploadedState.logo2) uploadedState.logo2 = await uploadImageToStorage(uploadedState.logo2, `styles/${style.id}/albums/${id}/logo2.png`, uploadedState.text);

    const newAlbum: Album = {
      id, slug,
      title: uploadedState.text || 'Album mới',
      description: 'Concept được thiết kế riêng',
      coverImage: uploadedState.mainImage || 'https://picsum.photos/seed/new-album/600/900',
      design: uploadedState, order, photos: [],
    };
    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, albums: [...(s.albums || []), newAlbum] } : s));

    const { error } = await supabase.from('albums').insert({
      id, style_id: style.id, slug, title: newAlbum.title, description: newAlbum.description,
      cover_image: newAlbum.coverImage, design: uploadedState, order,
    });
    if (error) { setStyles(stylesRef.current); throw error; }
    await touchStyle(style.id);
  };

  const addPhoto = async (styleSlug: string, albumSlug: string, state: EditorState) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;

    const id = `photo-${Date.now()}`;
    const order = album.photos?.length || 0;

    const uploadedState = { ...state };
    if (uploadedState.mainImage) uploadedState.mainImage = await uploadImageToStorage(uploadedState.mainImage, `styles/${style.id}/albums/${album.id}/photos/${id}/mainImage.jpg`, album.title);
    if (uploadedState.logo1) uploadedState.logo1 = await uploadImageToStorage(uploadedState.logo1, `styles/${style.id}/albums/${album.id}/photos/${id}/logo1.png`, album.title);
    if (uploadedState.logo2) uploadedState.logo2 = await uploadImageToStorage(uploadedState.logo2, `styles/${style.id}/albums/${album.id}/photos/${id}/logo2.png`, album.title);

    const newPhoto: Photo = {
      id,
      image: uploadedState.mainImage || 'https://picsum.photos/seed/new-photo/800/1200',
      alt: uploadedState.text || 'Ảnh mới',
      design: uploadedState, order,
    };
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: s.albums.map(a => a.id === album.id ? { ...a, photos: [...(a.photos || []), newPhoto] } : a),
    } : s));

    const { error } = await supabase.from('photos').insert({
      id, album_id: album.id, style_id: style.id,
      image: newPhoto.image, alt: newPhoto.alt, design: uploadedState, order,
    });
    if (error) { setStyles(stylesRef.current); throw error; }
    await touchStyle(style.id);
  };

  const deleteStyle = async (styleId: string) => {
    if (!user || !isAdmin) return;
    const oldStyles = [...styles];
    setStyles(prev => prev.filter(s => s.id !== styleId));
    const { error } = await supabase.from('styles').update({ deleted: true, deleted_at: new Date().toISOString() }).eq('id', styleId);
    if (error) { setStyles(oldStyles); throw error; }
  };

  const restoreStyle = async (styleId: string) => {
    if (!user || !isAdmin) return;
    await supabase.from('styles').update({ deleted: false, deleted_at: null }).eq('id', styleId);
  };

  const permanentDeleteStyle = async (styleId: string) => {
    if (!user || !isAdmin) return;
    const oldStyles = [...styles];
    const style = styles.find(s => s.id === styleId);
    setStyles(prev => prev.filter(s => s.id !== styleId));

    try {
      if (style?.coverImage) deleteImageFromStorage(style.coverImage).catch(console.error);
      if (style?.design?.mainImage) deleteImageFromStorage(style.design.mainImage).catch(console.error);
      if (style?.design?.logo1) deleteImageFromStorage(style.design.logo1).catch(console.error);
      if (style?.design?.logo2) deleteImageFromStorage(style.design.logo2).catch(console.error);

      // Fetch albums+photos to delete their images (CASCADE handles DB deletion)
      const { data: allAlbums } = await supabase.from('albums').select('id, cover_image, design').eq('style_id', styleId);
      for (const album of allAlbums || []) {
        if (album.cover_image) deleteImageFromStorage(album.cover_image).catch(console.error);
        const { data: allPhotos } = await supabase.from('photos').select('image, design').eq('album_id', album.id);
        for (const photo of allPhotos || []) {
          if (photo.image) deleteImageFromStorage(photo.image).catch(console.error);
        }
      }

      const { error } = await supabase.from('styles').delete().eq('id', styleId);
      if (error) throw error;
    } catch (err) {
      setStyles(oldStyles);
      throw err;
    }
  };

  const deleteAlbum = async (styleSlug: string, albumId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, albums: (s.albums || []).filter(a => a.id !== albumId) } : s));
    const { error } = await supabase.from('albums').update({ deleted: true, deleted_at: new Date().toISOString() }).eq('id', albumId);
    if (error) { setStyles(oldStyles); throw error; }
    await touchStyle(style.id);
  };

  const restoreAlbum = async (styleSlug: string, albumId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;
    await supabase.from('albums').update({ deleted: false, deleted_at: null }).eq('id', albumId);
  };

  const permanentDeleteAlbum = async (styleSlug: string, albumId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;
    const oldStyles = [...styles];
    const album = style.albums?.find(a => a.id === albumId);
    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, albums: (s.albums || []).filter(a => a.id !== albumId) } : s));

    try {
      if (album?.coverImage) deleteImageFromStorage(album.coverImage).catch(console.error);
      if (album?.design?.mainImage) deleteImageFromStorage(album.design.mainImage).catch(console.error);

      const { data: allPhotos } = await supabase.from('photos').select('image, design').eq('album_id', albumId);
      for (const photo of allPhotos || []) {
        if (photo.image) deleteImageFromStorage(photo.image).catch(console.error);
      }

      const { error } = await supabase.from('albums').delete().eq('id', albumId);
      if (error) throw error;
      await touchStyle(style.id);
    } catch (err) {
      setStyles(oldStyles);
      throw err;
    }
  };

  const deletePhoto = async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? { ...a, photos: (a.photos || []).filter(p => p.id !== photoId) } : a),
    } : s));
    const { error } = await supabase.from('photos').update({ deleted: true, deleted_at: new Date().toISOString() }).eq('id', photoId);
    if (error) { setStyles(oldStyles); throw error; }
    await touchStyle(style.id);
  };

  const restorePhoto = async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (!user || !isAdmin) return;
    await supabase.from('photos').update({ deleted: false, deleted_at: null }).eq('id', photoId);
  };

  const permanentDeletePhoto = async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const oldStyles = [...styles];
    const photo = (album.photos || []).find(p => p.id === photoId);
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? { ...a, photos: (a.photos || []).filter(p => p.id !== photoId) } : a),
    } : s));

    try {
      if (photo?.image) deleteImageFromStorage(photo.image).catch(console.error);
      if (photo?.design?.mainImage) deleteImageFromStorage(photo.design.mainImage).catch(console.error);
      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;
      await touchStyle(style.id);
    } catch (err) {
      setStyles(oldStyles);
      throw err;
    }
  };

  // ─── Update photo / cover / text ─────────────────────────────────────────────
  const updatePhoto = async (styleSlug: string, albumSlug: string, photoId: string, base64OrUrlImage: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;

    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? {
        ...a, photos: (a.photos || []).map(p => p.id === photoId ? { ...p, image: base64OrUrlImage, design: undefined } : p),
      } : a),
    } : s));

    try {
      let finalUrl = base64OrUrlImage;
      if (base64OrUrlImage.startsWith('data:image')) {
        const oldPhoto = album.photos?.find(p => p.id === photoId);
        if (oldPhoto?.image) deleteImageFromStorage(oldPhoto.image).catch(console.error);
        finalUrl = await uploadImageToStorage(base64OrUrlImage, `styles/${style.id}/albums/${album.id}/photos/${photoId}/mainImage.jpg`, album.title);
      }
      const { error } = await supabase.from('photos').update({ image: finalUrl, design: null }).eq('id', photoId);
      if (error) throw error;
      await touchStyle(style.id);
    } catch (err) {
      setStyles(oldStyles);
      throw err;
    }
  };

  const updateAlbumCover = async (styleSlug: string, albumSlug: string, coverImage: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;

    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? { ...a, coverImage, design: undefined } : a),
    } : s));

    try {
      if (album.coverImage && coverImage !== album.coverImage) deleteImageFromStorage(album.coverImage).catch(console.error);
      const { error } = await supabase.from('albums').update({ cover_image: coverImage, design: null }).eq('id', album.id);
      if (error) throw error;
      await touchStyle(style.id);
    } catch (err) {
      setStyles(oldStyles);
      throw err;
    }
  };

  const updateStyleCover = async (styleId: string, coverImage: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.id === styleId);
    const oldStyles = [...styles];
    setStyles(prev => prev.map(s => s.id === styleId ? { ...s, coverImage, design: undefined } : s));

    try {
      if (style?.coverImage && coverImage !== style.coverImage) deleteImageFromStorage(style.coverImage).catch(console.error);
      const { error } = await supabase.from('styles').update({ cover_image: coverImage, design: null, updated_at: new Date().toISOString() }).eq('id', styleId);
      if (error) throw error;
    } catch (err) {
      setStyles(oldStyles);
      throw err;
    }
  };

  const updateAlbumCoverPos = async (styleSlug: string, albumSlug: string, pos: { x: number; y: number }) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;

    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? { ...a, coverImagePos: pos } : a),
    } : s));

    await supabase.from('albums').update({ cover_image_pos: pos }).eq('id', album.id);
    await touchStyle(style.id);
  };

  const updateAlbumText = async (styleSlug: string, albumSlug: string, field: 'title' | 'description' | 'suggestedLayout' | 'suitableFor' | 'displayLikes', value: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;

    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? { ...a, [field]: value } : a),
    } : s));

    const colMap: Record<string, string> = {
      title: 'title', description: 'description',
      suggestedLayout: 'suggested_layout', suitableFor: 'suitable_for', displayLikes: 'display_likes',
    };
    await supabase.from('albums').update({ [colMap[field]]: value }).eq('id', album.id);
    await touchStyle(style.id);
  };

  const updateStyleText = async (styleSlug: string, field: 'title' | 'description', value: string) => {
    if (!user || !isAdmin) return;
    const style = styles.find(s => s.slug === styleSlug);
    if (!style) return;

    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, [field]: value } : s));
    await supabase.from('styles').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', style.id);
  };

  // ─── Reorder ─────────────────────────────────────────────────────────────────
  const reorderStyles = async (newStyles: Style[]) => {
    if (!user || !isAdmin) return;
    await supabase.from('styles').upsert(
      newStyles.map((style, index) => ({ id: style.id, order: index })),
      { onConflict: 'id' }
    );
  };

  const reorderAlbums = async (styleId: string, newAlbums: Album[]) => {
    if (!user || !isAdmin) return;
    await supabase.from('albums').upsert(
      newAlbums.map((album, index) => ({ id: album.id, order: index })),
      { onConflict: 'id' }
    );
    touchStyle(styleId);
  };

  const reorderPhotos = async (styleId: string, albumId: string, newPhotos: Photo[]) => {
    if (!user || !isAdmin) return;
    await supabase.from('photos').upsert(
      newPhotos.map((photo, index) => ({ id: photo.id, order: index })),
      { onConflict: 'id' }
    );
    touchStyle(styleId);
  };

  // ─── Consultation CRUD ───────────────────────────────────────────────────────
  const syncLeadUpdateToSheets = (id: string, updateData: any) => {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update_lead', leadId: id, updateData }),
    }).catch(err => console.error('Error syncing to Sheets:', err));
  };

  const submitConsultation = async (data: { name: string; phone: string; email?: string; message?: string; date?: Date; favoriteIds?: string[]; source?: string; luckyGift?: string }) => {
    const id = `consult-${Date.now()}`;
    const row: any = {
      id, name: data.name, phone: data.phone, status: 'new',
    };
    if (data.email) row.email = data.email.trim();
    if (data.message) row.message = data.message.trim();
    if (data.source) row.source = data.source;
    if (data.luckyGift) row.lucky_gift = data.luckyGift;
    if (data.favoriteIds?.length) row.favorite_ids = data.favoriteIds;
    if (data.date) {
      try { row.date = typeof data.date === 'string' ? data.date : data.date.toISOString(); } catch {}
    }

    const { error } = await supabase.from('consultations').insert(row);
    if (error) throw new Error(error.message);

    const larkUrl = settings?.larkWebhookUrl || LARK_FALLBACK_URL;
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'lead',
        leadData: {
          id, name: data.name, phone: data.phone, email: data.email || '',
          message: (() => {
            let msg = data.message || '';
            const links = msg.match(/(https?:\/\/[^\s\n]+)/g) || [];
            links.forEach(l => { msg = msg.replace(l, ''); });
            msg = msg.replace(/Link danh sách:/g, '').replace(/Link:/g, '').trim();
            return msg.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l !== '-').join('\n');
          })(),
          referenceLinks: (data.message?.match(/(https?:\/\/[^\s\n]+)/g) || []).join(', '),
          source: data.source || '', luckyGift: data.luckyGift || '',
          date: new Date().toLocaleString('vi-VN'),
        },
        larkConfig: { url: larkUrl },
      }),
    }).catch(err => console.error('Error syncing to Sheets:', err));
  };

  const updateConsultationStatus = async (id: string, status: 'new' | 'contacted' | 'registered') => {
    if (!isAdmin) return;
    await supabase.from('consultations').update({ status }).eq('id', id);
    syncLeadUpdateToSheets(id, { status });
  };

  const updateConsultationRegistration = async (id: string, data: Partial<Consultation>) => {
    if (!isAdmin) return;
    const row = { ...consultationToDB(data), status: 'registered' };
    await supabase.from('consultations').update(row).eq('id', id);
    syncLeadUpdateToSheets(id, { ...data, status: 'registered' });
  };

  const updateConsultationNotes = async (id: string, notes: string) => {
    if (!isAdmin) return;
    await supabase.from('consultations').update({ notes }).eq('id', id);
    syncLeadUpdateToSheets(id, { notes });
  };

  const updateConsultationTags = async (id: string, tags: string[]) => {
    if (!isAdmin) return;
    await supabase.from('consultations').update({ tags }).eq('id', id);
    syncLeadUpdateToSheets(id, { tags: tags.join(', ') });
  };

  const updateConsultationField = async (id: string, field: string, value: any) => {
    if (!isAdmin) return;
    const colMap: Record<string, string> = {
      conceptId: 'concept_id', shootingDate: 'shooting_date', engagementDate: 'engagement_date',
      weddingDate: 'wedding_date', deliveryDate: 'delivery_date', favoriteIds: 'favorite_ids',
      luckyGift: 'lucky_gift', assignedTo: 'assigned_to', followUpDate: 'follow_up_date',
      contractValue: 'contract_value',
    };
    const col = colMap[field] || field;
    await supabase.from('consultations').update({ [col]: value }).eq('id', id);
    syncLeadUpdateToSheets(id, { [field]: Array.isArray(value) ? value.join(', ') : value });
  };

  const deleteConsultation = async (id: string) => {
    if (!isSuperAdmin) return;
    await supabase.from('consultations').delete().eq('id', id);
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete_lead', leadId: id }),
    }).catch(console.error);
  };

  // ─── Auth ───────────────────────────────────────────────────────────────────
  const login = async () => {
    try { await loginWithGoogle(); } catch (err) { console.error('Login failed:', err); }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      localStorage.removeItem('h2o_user_phone');
      setUserPhoneState(null);
      window.location.href = '/';
    }
  };

  // ─── Settings ───────────────────────────────────────────────────────────────
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await supabase.from('settings').upsert({ id: 'global', data: merged, updated_at: new Date().toISOString() });
  };

  return (
    <AppContext.Provider value={{
      styles, setStyles, isDataLoaded, user, isAuthReady, login, handleLogout,
      addStyle, addAlbum, addPhoto,
      deleteStyle, restoreStyle, permanentDeleteStyle,
      deleteAlbum, restoreAlbum, permanentDeleteAlbum,
      deletePhoto, restorePhoto, permanentDeletePhoto,
      updatePhoto, updateAlbumCover, updateStyleCover, updateAlbumCoverPos,
      updateAlbumText, updateStyleText,
      reorderStyles, reorderAlbums, reorderPhotos,
      moveStyle, moveAlbum, movePhoto,
      submitConsultation, consultations,
      updateConsultationStatus, updateConsultationRegistration,
      updateConsultationNotes, updateConsultationTags, updateConsultationField, deleteConsultation,
      isAdmin, isSuperAdmin,
      userPhone, setUserPhone,
      favorites, toggleFavorite,
      settings, updateSettings,
      fetchAlbums, fetchPhotos,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
