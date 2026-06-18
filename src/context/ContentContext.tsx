import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { uploadImageToStorage, deleteImageFromStorage } from '../utils/image';
import type { Style, Album, Photo, EditorState, DbStyleRow, DbAlbumRow, DbPhotoRow } from '../types';
import { STYLES as MOCK_STYLES } from '../data/mockData';
import { useAuth } from './AuthContext';

// ─── DB mappers ───────────────────────────────────────────────────────────────

const dbToStyle = (row: DbStyleRow): Style => ({
  id: row.id, slug: row.slug || '', title: row.title || '', description: row.description || '',
  coverImage: row.cover_image || '', design: row.design ?? undefined, order: row.order ?? 0,
  category: row.category, deleted: row.deleted, deletedAt: row.deleted_at, albums: [],
});

const dbToAlbum = (row: DbAlbumRow): Album => ({
  id: row.id, slug: row.slug || '', title: row.title || '', description: row.description || '',
  coverImage: row.cover_image || '', coverImagePos: row.cover_image_pos,
  design: row.design ?? undefined, order: row.order ?? 0,
  suggestedLayout: row.suggested_layout, suitableFor: row.suitable_for,
  displayLikes: row.display_likes, deleted: row.deleted, deletedAt: row.deleted_at, photos: [],
});

const dbToPhoto = (row: DbPhotoRow): Photo => ({
  id: row.id, image: row.image || '', alt: row.alt || '',
  design: row.design ?? undefined, order: row.order ?? 0,
  deleted: row.deleted, deletedAt: row.deleted_at,
});

// ─── Context type ─────────────────────────────────────────────────────────────

interface ContentContextType {
  styles: Style[];
  setStyles: React.Dispatch<React.SetStateAction<Style[]>>;
  isDataLoaded: boolean;
  fetchAlbums: (styleId: string) => Promise<void>;
  fetchPhotos: (styleId: string, albumId: string) => Promise<void>;
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
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isAuthReady } = useAuth();

  const [styles, setStyles] = useState<Style[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const stylesRef = useRef<Style[]>([]);
  const requestedAlbumsRef = useRef<Set<string>>(new Set());
  const requestedPhotosRef = useRef<Set<string>>(new Set());

  useEffect(() => { stylesRef.current = styles; }, [styles]);

  // ─── Seed ───────────────────────────────────────────────────────────────────
  const seedInitialData = useCallback(async () => {
    if (!user) return;
    try {
      for (const style of MOCK_STYLES) {
        const { albums, ...styleData } = style;
        await supabase.from('styles').upsert({
          id: styleData.id, slug: styleData.slug, title: styleData.title,
          description: styleData.description, cover_image: styleData.coverImage,
          design: styleData.design, order: styleData.order,
        }, { onConflict: 'id' });

        for (const album of albums) {
          const { photos, ...albumData } = album;
          await supabase.from('albums').upsert({
            id: albumData.id, style_id: style.id, slug: albumData.slug,
            title: albumData.title, description: albumData.description,
            cover_image: albumData.coverImage, design: albumData.design, order: albumData.order,
          }, { onConflict: 'id' });

          if (photos.length > 0) {
            await supabase.from('photos').upsert(
              photos.map(p => ({
                id: p.id, album_id: album.id, style_id: style.id,
                image: p.image, alt: p.alt, design: p.design, order: p.order,
              })),
              { onConflict: 'id' }
            );
          }
        }
      }
    } catch (err) { console.error('Error seeding data:', err); }
  }, [user]);

  // ─── Load styles ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthReady) return;

    const loadStyles = async () => {
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('deleted', false)
        .order('order', { ascending: true });

      if (error) { console.warn('Could not load styles:', error.message); setIsDataLoaded(true); return; }

      if (!data || data.length === 0) {
        if (isAdmin) {
          await seedInitialData();
          const { data: seeded } = await supabase.from('styles').select('*').eq('deleted', false).order('order', { ascending: true });
          setStyles((seeded ?? []).map(row => ({ ...dbToStyle(row as DbStyleRow), albums: [] })));
        }
        setIsDataLoaded(true);
        return;
      }

      setStyles(prev =>
        data.map(row => {
          const existing = prev.find(s => s.id === row.id);
          return { ...dbToStyle(row as DbStyleRow), albums: existing?.albums || [] };
        })
      );
      setIsDataLoaded(true);
    };

    loadStyles();
  }, [isAuthReady, isAdmin, seedInitialData]);

  // ─── Lazy fetch albums / photos ─────────────────────────────────────────────
  const fetchAlbums = useCallback(async (styleId: string) => {
    if (requestedAlbumsRef.current.has(styleId)) return;
    requestedAlbumsRef.current.add(styleId);

    const { data } = await supabase
      .from('albums').select('*').eq('style_id', styleId).eq('deleted', false).order('order', { ascending: true });

    setStyles(prev => prev.map(s => {
      if (s.id !== styleId) return s;
      const albums = (data ?? []).map(row => {
        const existing = (s.albums || []).find(a => a.id === row.id);
        return { ...dbToAlbum(row as DbAlbumRow), photos: existing?.photos || [] };
      });
      return { ...s, albums };
    }));
  }, []);

  const fetchPhotos = useCallback(async (styleId: string, albumId: string) => {
    const key = `${styleId}_${albumId}`;
    if (requestedPhotosRef.current.has(key)) return;
    requestedPhotosRef.current.add(key);

    const { data } = await supabase
      .from('photos').select('*').eq('album_id', albumId).eq('deleted', false).order('order', { ascending: true });

    setStyles(prev => prev.map(s => {
      if (s.id !== styleId) return s;
      return {
        ...s,
        albums: (s.albums || []).map(a =>
          a.id === albumId ? { ...a, photos: (data ?? []).map(r => dbToPhoto(r as DbPhotoRow)) } : a
        ),
      };
    }));
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const touchStyle = useCallback((styleId: string) => {
    supabase.from('styles').update({ updated_at: new Date().toISOString() }).eq('id', styleId);
  }, []);

  // ─── Move helpers ─────────────────────────────────────────────────────────────
  const moveStyle = useCallback(async (styleId: string, direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    let updatedStyles: Style[] | null = null;
    setStyles(prev => {
      const idx = prev.findIndex(s => s.id === styleId);
      if (idx < 0) return prev;
      const newIdx = direction === 'prev' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      updatedStyles = next;
      return next;
    });
    if (updatedStyles) {
      try { await reorderStyles(updatedStyles); } catch (err) { console.error(err); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const moveAlbum = useCallback(async (styleId: string, albumId: string, direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    let updatedAlbums: Album[] | null = null;
    setStyles(prev => {
      const sIdx = prev.findIndex(s => s.id === styleId);
      if (sIdx < 0) return prev;
      const style = prev[sIdx];
      const albums = style.albums || [];
      const aIdx = albums.findIndex(a => a.id === albumId);
      if (aIdx < 0) return prev;
      const newIdx = direction === 'prev' ? aIdx - 1 : aIdx + 1;
      if (newIdx < 0 || newIdx >= albums.length) return prev;
      const newAlbums = [...albums];
      [newAlbums[aIdx], newAlbums[newIdx]] = [newAlbums[newIdx], newAlbums[aIdx]];
      updatedAlbums = newAlbums;
      const next = [...prev];
      next[sIdx] = { ...style, albums: newAlbums };
      return next;
    });
    if (updatedAlbums) {
      try { await reorderAlbums(styleId, updatedAlbums); } catch (err) { console.error(err); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const movePhoto = useCallback(async (styleId: string, albumId: string, photoId: string, direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    let updatedPhotos: Photo[] | null = null;
    setStyles(prev => {
      const sIdx = prev.findIndex(s => s.id === styleId);
      if (sIdx < 0) return prev;
      const style = prev[sIdx];
      const aIdx = (style.albums || []).findIndex(a => a.id === albumId);
      if (aIdx < 0) return prev;
      const album = style.albums![aIdx];
      const photos = album.photos || [];
      const pIdx = photos.findIndex(p => p.id === photoId);
      if (pIdx < 0) return prev;
      const newIdx = direction === 'prev' ? pIdx - 1 : pIdx + 1;
      if (newIdx < 0 || newIdx >= photos.length) return prev;
      const newPhotos = [...photos];
      [newPhotos[pIdx], newPhotos[newIdx]] = [newPhotos[newIdx], newPhotos[pIdx]];
      updatedPhotos = newPhotos;
      const newAlbums = [...style.albums!];
      newAlbums[aIdx] = { ...album, photos: newPhotos };
      const next = [...prev];
      next[sIdx] = { ...style, albums: newAlbums };
      return next;
    });
    if (updatedPhotos) {
      try { await reorderPhotos(styleId, albumId, updatedPhotos); } catch (err) { console.error(err); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ─── Reorder (batch) ─────────────────────────────────────────────────────────
  const reorderStyles = useCallback(async (newStyles: Style[]) => {
    if (!user || !isAdmin) return;
    await supabase.from('styles').upsert(
      newStyles.map((s, i) => ({ id: s.id, order: i })), { onConflict: 'id' }
    );
  }, [user, isAdmin]);

  const reorderAlbums = useCallback(async (styleId: string, newAlbums: Album[]) => {
    if (!user || !isAdmin) return;
    await supabase.from('albums').upsert(
      newAlbums.map((a, i) => ({ id: a.id, order: i })), { onConflict: 'id' }
    );
    touchStyle(styleId);
  }, [user, isAdmin, touchStyle]);

  const reorderPhotos = useCallback(async (styleId: string, albumId: string, newPhotos: Photo[]) => {
    if (!user || !isAdmin) return;
    await supabase.from('photos').upsert(
      newPhotos.map((p, i) => ({ id: p.id, order: i })), { onConflict: 'id' }
    );
    touchStyle(styleId);
  }, [user, isAdmin, touchStyle]);

  // ─── Style CRUD ──────────────────────────────────────────────────────────────
  const addStyle = useCallback(async (state: EditorState) => {
    if (!user || !isAdmin) return;
    const id = `style-${Date.now()}`;
    const slug = `new-style-${Date.now()}`;
    const order = stylesRef.current.length;

    const uploadedState = { ...state };
    if (uploadedState.mainImage) uploadedState.mainImage = await uploadImageToStorage(uploadedState.mainImage, `styles/${id}/mainImage.jpg`, uploadedState.text);
    if (uploadedState.logo1) uploadedState.logo1 = await uploadImageToStorage(uploadedState.logo1, `styles/${id}/logo1.png`, uploadedState.text);
    if (uploadedState.logo2) uploadedState.logo2 = await uploadImageToStorage(uploadedState.logo2, `styles/${id}/logo2.png`, uploadedState.text);

    const newStyle: Style = {
      id, slug, title: uploadedState.text || 'Phong cách mới',
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
  }, [user, isAdmin]);

  const addAlbum = useCallback(async (styleSlug: string, state: EditorState) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    if (!style) return;

    const id = `album-${Date.now()}`;
    const slug = `new-album-${Date.now()}`;
    const order = style.albums?.length || 0;

    const uploadedState = { ...state };
    if (uploadedState.mainImage) uploadedState.mainImage = await uploadImageToStorage(uploadedState.mainImage, `styles/${style.id}/albums/${id}/mainImage.jpg`, uploadedState.text);
    if (uploadedState.logo1) uploadedState.logo1 = await uploadImageToStorage(uploadedState.logo1, `styles/${style.id}/albums/${id}/logo1.png`, uploadedState.text);
    if (uploadedState.logo2) uploadedState.logo2 = await uploadImageToStorage(uploadedState.logo2, `styles/${style.id}/albums/${id}/logo2.png`, uploadedState.text);

    const newAlbum: Album = {
      id, slug, title: uploadedState.text || 'Album mới',
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
    touchStyle(style.id);
  }, [user, isAdmin, touchStyle]);

  const addPhoto = useCallback(async (styleSlug: string, albumSlug: string, state: EditorState) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;

    const id = `photo-${Date.now()}`;
    const order = album.photos?.length || 0;

    const uploadedState = { ...state };
    if (uploadedState.mainImage) uploadedState.mainImage = await uploadImageToStorage(uploadedState.mainImage, `styles/${style.id}/albums/${album.id}/photos/${id}/mainImage.jpg`, album.title);
    if (uploadedState.logo1) uploadedState.logo1 = await uploadImageToStorage(uploadedState.logo1, `styles/${style.id}/albums/${album.id}/photos/${id}/logo1.png`, album.title);
    if (uploadedState.logo2) uploadedState.logo2 = await uploadImageToStorage(uploadedState.logo2, `styles/${style.id}/albums/${album.id}/photos/${id}/logo2.png`, album.title);

    const newPhoto: Photo = {
      id, image: uploadedState.mainImage || 'https://picsum.photos/seed/new-photo/800/1200',
      alt: uploadedState.text || 'Ảnh mới', design: uploadedState, order,
    };
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: s.albums.map(a => a.id === album.id ? { ...a, photos: [...(a.photos || []), newPhoto] } : a),
    } : s));

    const { error } = await supabase.from('photos').insert({
      id, album_id: album.id, style_id: style.id,
      image: newPhoto.image, alt: newPhoto.alt, design: uploadedState, order,
    });
    if (error) { setStyles(stylesRef.current); throw error; }
    touchStyle(style.id);
  }, [user, isAdmin, touchStyle]);

  // ─── Soft delete ─────────────────────────────────────────────────────────────
  const deleteStyle = useCallback(async (styleId: string) => {
    if (!user || !isAdmin) return;
    const oldStyles = [...stylesRef.current];
    setStyles(prev => prev.filter(s => s.id !== styleId));
    const { error } = await supabase.from('styles').update({ deleted: true, deleted_at: new Date().toISOString() }).eq('id', styleId);
    if (error) { setStyles(oldStyles); throw error; }
  }, [user, isAdmin]);

  const deleteAlbum = useCallback(async (styleSlug: string, albumId: string) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    if (!style) return;
    const oldStyles = [...stylesRef.current];
    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, albums: (s.albums || []).filter(a => a.id !== albumId) } : s));
    const { error } = await supabase.from('albums').update({ deleted: true, deleted_at: new Date().toISOString() }).eq('id', albumId);
    if (error) { setStyles(oldStyles); throw error; }
    touchStyle(style.id);
  }, [user, isAdmin, touchStyle]);

  const deletePhoto = useCallback(async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const oldStyles = [...stylesRef.current];
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? { ...a, photos: (a.photos || []).filter(p => p.id !== photoId) } : a),
    } : s));
    const { error } = await supabase.from('photos').update({ deleted: true, deleted_at: new Date().toISOString() }).eq('id', photoId);
    if (error) { setStyles(oldStyles); throw error; }
    touchStyle(style.id);
  }, [user, isAdmin, touchStyle]);

  // ─── Restore ─────────────────────────────────────────────────────────────────
  const restoreStyle = useCallback(async (styleId: string) => {
    if (!user || !isAdmin) return;
    await supabase.from('styles').update({ deleted: false, deleted_at: null }).eq('id', styleId);
  }, [user, isAdmin]);

  const restoreAlbum = useCallback(async (styleSlug: string, albumId: string) => {
    if (!user || !isAdmin) return;
    await supabase.from('albums').update({ deleted: false, deleted_at: null }).eq('id', albumId);
  }, [user, isAdmin]);

  const restorePhoto = useCallback(async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (!user || !isAdmin) return;
    await supabase.from('photos').update({ deleted: false, deleted_at: null }).eq('id', photoId);
  }, [user, isAdmin]);

  // ─── Permanent delete ────────────────────────────────────────────────────────
  const permanentDeleteStyle = useCallback(async (styleId: string) => {
    if (!user || !isAdmin) return;
    const oldStyles = [...stylesRef.current];
    const style = stylesRef.current.find(s => s.id === styleId);
    setStyles(prev => prev.filter(s => s.id !== styleId));
    try {
      if (style?.coverImage) deleteImageFromStorage(style.coverImage).catch(console.error);
      if (style?.design?.mainImage) deleteImageFromStorage(style.design.mainImage).catch(console.error);
      if (style?.design?.logo1) deleteImageFromStorage(style.design.logo1).catch(console.error);
      if (style?.design?.logo2) deleteImageFromStorage(style.design.logo2).catch(console.error);
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
    } catch (err) { setStyles(oldStyles); throw err; }
  }, [user, isAdmin]);

  const permanentDeleteAlbum = useCallback(async (styleSlug: string, albumId: string) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    if (!style) return;
    const oldStyles = [...stylesRef.current];
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
      touchStyle(style.id);
    } catch (err) { setStyles(oldStyles); throw err; }
  }, [user, isAdmin, touchStyle]);

  const permanentDeletePhoto = useCallback(async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const oldStyles = [...stylesRef.current];
    const photo = (album.photos || []).find(p => p.id === photoId);
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? { ...a, photos: (a.photos || []).filter(p => p.id !== photoId) } : a),
    } : s));
    try {
      if (photo?.image) deleteImageFromStorage(photo.image).catch(console.error);
      if (photo?.design?.mainImage) deleteImageFromStorage(photo.design.mainImage).catch(console.error);
      const { error } = await supabase.from('photos').delete().eq('id', photoId);
      if (error) throw error;
      touchStyle(style.id);
    } catch (err) { setStyles(oldStyles); throw err; }
  }, [user, isAdmin, touchStyle]);

  // ─── Update ──────────────────────────────────────────────────────────────────
  const updatePhoto = useCallback(async (styleSlug: string, albumSlug: string, photoId: string, base64OrUrlImage: string) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const oldStyles = [...stylesRef.current];
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
      touchStyle(style.id);
    } catch (err) { setStyles(oldStyles); throw err; }
  }, [user, isAdmin, touchStyle]);

  const updateAlbumCover = useCallback(async (styleSlug: string, albumSlug: string, coverImage: string) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    const oldStyles = [...stylesRef.current];
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? { ...a, coverImage, design: undefined } : a),
    } : s));
    try {
      if (album.coverImage && coverImage !== album.coverImage) deleteImageFromStorage(album.coverImage).catch(console.error);
      const { error } = await supabase.from('albums').update({ cover_image: coverImage, design: null }).eq('id', album.id);
      if (error) throw error;
      touchStyle(style.id);
    } catch (err) { setStyles(oldStyles); throw err; }
  }, [user, isAdmin, touchStyle]);

  const updateStyleCover = useCallback(async (styleId: string, coverImage: string) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.id === styleId);
    const oldStyles = [...stylesRef.current];
    setStyles(prev => prev.map(s => s.id === styleId ? { ...s, coverImage, design: undefined } : s));
    try {
      if (style?.coverImage && coverImage !== style.coverImage) deleteImageFromStorage(style.coverImage).catch(console.error);
      const { error } = await supabase.from('styles').update({ cover_image: coverImage, design: null, updated_at: new Date().toISOString() }).eq('id', styleId);
      if (error) throw error;
    } catch (err) { setStyles(oldStyles); throw err; }
  }, [user, isAdmin]);

  const updateAlbumCoverPos = useCallback(async (styleSlug: string, albumSlug: string, pos: { x: number; y: number }) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    const album = style?.albums?.find(a => a.slug === albumSlug);
    if (!style || !album) return;
    setStyles(prev => prev.map(s => s.id === style.id ? {
      ...s, albums: (s.albums || []).map(a => a.id === album.id ? { ...a, coverImagePos: pos } : a),
    } : s));
    await supabase.from('albums').update({ cover_image_pos: pos }).eq('id', album.id);
    touchStyle(style.id);
  }, [user, isAdmin, touchStyle]);

  const updateAlbumText = useCallback(async (styleSlug: string, albumSlug: string, field: 'title' | 'description' | 'suggestedLayout' | 'suitableFor' | 'displayLikes', value: string) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
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
    touchStyle(style.id);
  }, [user, isAdmin, touchStyle]);

  const updateStyleText = useCallback(async (styleSlug: string, field: 'title' | 'description', value: string) => {
    if (!user || !isAdmin) return;
    const style = stylesRef.current.find(s => s.slug === styleSlug);
    if (!style) return;
    setStyles(prev => prev.map(s => s.id === style.id ? { ...s, [field]: value } : s));
    await supabase.from('styles').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', style.id);
  }, [user, isAdmin]);

  return (
    <ContentContext.Provider value={{
      styles, setStyles, isDataLoaded,
      fetchAlbums, fetchPhotos,
      addStyle, addAlbum, addPhoto,
      deleteStyle, deleteAlbum, deletePhoto,
      restoreStyle, restoreAlbum, restorePhoto,
      permanentDeleteStyle, permanentDeleteAlbum, permanentDeletePhoto,
      updatePhoto, updateAlbumCover, updateStyleCover, updateAlbumCoverPos,
      updateAlbumText, updateStyleText,
      reorderStyles, reorderAlbums, reorderPhotos,
      moveStyle, moveAlbum, movePhoto,
    }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = (): ContentContextType => {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within ContentProvider');
  return ctx;
};
