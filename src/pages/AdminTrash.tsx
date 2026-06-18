import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import { Style, Album, Photo } from '../types';
import { Trash2, RotateCcw, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

interface DeletedStyle extends Style {
  deletedAtDate?: Date;
}
interface DeletedAlbum extends Album {
  styleId: string;
  styleSlug: string;
  styleTitle: string;
  deletedAtDate?: Date;
}
interface DeletedPhoto extends Photo {
  styleId: string;
  styleSlug: string;
  albumId: string;
  albumSlug: string;
  albumTitle: string;
  deletedAtDate?: Date;
}

const AdminTrash: React.FC = () => {
  const { user, isAdmin, isAuthReady, restoreStyle, permanentDeleteStyle, restoreAlbum, permanentDeleteAlbum, restorePhoto, permanentDeletePhoto } = useApp();

  const [deletedStyles, setDeletedStyles] = useState<DeletedStyle[]>([]);
  const [deletedAlbums, setDeletedAlbums] = useState<DeletedAlbum[]>([]);
  const [deletedPhotos, setDeletedPhotos] = useState<DeletedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrashItems = async () => {
    setIsLoading(true);
    try {
      const [stylesRes, albumsRes, photosRes] = await Promise.all([
        supabase.from('styles').select('*').eq('deleted', true),
        supabase.from('albums').select('*').eq('deleted', true),
        supabase.from('photos').select('*').eq('deleted', true),
      ]);

      // Also fetch non-deleted styles/albums for name lookup
      const { data: allStyles } = await supabase.from('styles').select('id, slug, title');
      const { data: allAlbums } = await supabase.from('albums').select('id, slug, title, style_id');

      const styleMap = Object.fromEntries((allStyles || []).map(s => [s.id, s]));
      const albumMap = Object.fromEntries((allAlbums || []).map(a => [a.id, a]));

      const newDeletedStyles: DeletedStyle[] = (stylesRes.data || []).map(row => ({
        id: row.id, slug: row.slug || '', title: row.title || '', description: row.description || '',
        coverImage: row.cover_image || '', design: row.design, order: row.order || 0,
        deleted: true, deletedAt: row.deleted_at, albums: [],
        deletedAtDate: row.deleted_at ? new Date(row.deleted_at) : undefined,
      })).sort((a, b) => (b.deletedAtDate?.getTime() || 0) - (a.deletedAtDate?.getTime() || 0));

      const newDeletedAlbums: DeletedAlbum[] = (albumsRes.data || []).map(row => {
        const parentStyle = styleMap[row.style_id] || {};
        return {
          id: row.id, slug: row.slug || '', title: row.title || '', description: row.description || '',
          coverImage: row.cover_image || '', design: row.design, order: row.order || 0,
          deleted: true, deletedAt: row.deleted_at, photos: [],
          styleId: row.style_id || '',
          styleSlug: parentStyle.slug || '',
          styleTitle: parentStyle.title || '',
          deletedAtDate: row.deleted_at ? new Date(row.deleted_at) : undefined,
        };
      }).sort((a, b) => (b.deletedAtDate?.getTime() || 0) - (a.deletedAtDate?.getTime() || 0));

      const newDeletedPhotos: DeletedPhoto[] = (photosRes.data || []).map(row => {
        const parentAlbum = albumMap[row.album_id] || {};
        const parentStyle = styleMap[parentAlbum.style_id] || {};
        return {
          id: row.id, image: row.image || '', alt: row.alt || '',
          design: row.design, order: row.order || 0,
          deleted: true, deletedAt: row.deleted_at,
          styleId: parentAlbum.style_id || '',
          styleSlug: parentStyle.slug || '',
          albumId: row.album_id || '',
          albumSlug: parentAlbum.slug || '',
          albumTitle: parentAlbum.title || '',
          deletedAtDate: row.deleted_at ? new Date(row.deleted_at) : undefined,
        };
      }).sort((a, b) => (b.deletedAtDate?.getTime() || 0) - (a.deletedAtDate?.getTime() || 0));

      setDeletedStyles(newDeletedStyles);
      setDeletedAlbums(newDeletedAlbums);
      setDeletedPhotos(newDeletedPhotos);
    } catch (error) {
      console.error('Failed to fetch trash items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthReady && isAdmin) fetchTrashItems();
  }, [isAuthReady, isAdmin]);

  if (!isAuthReady) return null;
  if (!user || !isAdmin) return <Navigate to="/admin/login" />;

  const handleRestoreStyle = async (styleId: string) => { await restoreStyle(styleId); await fetchTrashItems(); };
  const handlePermanentDeleteStyle = async (styleId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn style này? Không thể khôi phục sau khi xóa.')) {
      await permanentDeleteStyle(styleId); await fetchTrashItems();
    }
  };
  const handleRestoreAlbum = async (styleSlug: string, albumId: string) => { await restoreAlbum(styleSlug, albumId); await fetchTrashItems(); };
  const handlePermanentDeleteAlbum = async (styleSlug: string, albumId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn album này? Không thể khôi phục sau khi xóa.')) {
      await permanentDeleteAlbum(styleSlug, albumId); await fetchTrashItems();
    }
  };
  const handleRestorePhoto = async (styleSlug: string, albumSlug: string, photoId: string) => { await restorePhoto(styleSlug, albumSlug, photoId); await fetchTrashItems(); };
  const handlePermanentDeletePhoto = async (styleSlug: string, albumSlug: string, photoId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn ảnh này? Không thể khôi phục sau khi xóa.')) {
      await permanentDeletePhoto(styleSlug, albumSlug, photoId); await fetchTrashItems();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/consultations" className="p-2 -ml-2 text-gray-500 hover:text-dark hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Trash2 className="text-red-500" size={24} />
              Thùng Rác
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Đang tải dữ liệu thùng rác...</p>
          </div>
        ) : (
          <div className="space-y-12">
            <section>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                Albums đã xóa ({deletedAlbums.length})
              </h2>
              {deletedAlbums.length === 0 ? (
                <p className="text-gray-500 italic text-sm">Không có album nào trong thùng rác.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deletedAlbums.map(album => (
                    <div key={album.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                      <div className="bg-gray-100 aspect-video relative">
                        {album.coverImage && <img src={album.coverImage} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />}
                        <div className="absolute inset-0 bg-red-500/10" />
                      </div>
                      <div className="p-4 flex-1">
                        <h3 className="font-bold text-dark">{album.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">Thuộc Style: {album.styleTitle}</p>
                        {album.deletedAtDate && (
                          <p className="text-xs text-red-500 flex items-center gap-1 mb-4">
                            <AlertTriangle size={12} /> Đã xóa lúc {album.deletedAtDate.toLocaleString('vi-VN')}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-auto">
                          <button onClick={() => handleRestoreAlbum(album.styleSlug, album.id)} className="flex-1 bg-dark text-white rounded-lg py-2 text-sm font-medium hover:bg-dark/90 transition-colors flex items-center justify-center gap-2">
                            <RotateCcw size={16} /> Khôi phục
                          </button>
                          <button onClick={() => handlePermanentDeleteAlbum(album.styleSlug, album.id)} className="flex-1 bg-red-50 text-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                            <Trash2 size={16} /> Xóa vĩnh viễn
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                Ảnh đã xóa ({deletedPhotos.length})
              </h2>
              {deletedPhotos.length === 0 ? (
                <p className="text-gray-500 italic text-sm">Không có ảnh nào trong thùng rác.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {deletedPhotos.map(photo => (
                    <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col group">
                      <div className="bg-gray-100 aspect-square relative">
                        {photo.image && <img src={photo.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />}
                        <div className="absolute inset-0 bg-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                          <button onClick={() => handleRestorePhoto(photo.styleSlug, photo.albumSlug, photo.id)} className="w-full bg-white text-dark rounded-lg py-1.5 text-xs font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1">
                            <RotateCcw size={14} /> Khôi phục
                          </button>
                          <button onClick={() => handlePermanentDeletePhoto(photo.styleSlug, photo.albumSlug, photo.id)} className="w-full bg-red-500 text-white rounded-lg py-1.5 text-xs font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-1">
                            <Trash2 size={14} /> Xóa vĩnh viễn
                          </button>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 truncate" title={`Album: ${photo.albumTitle}`}>
                          Album: <span className="font-medium text-dark">{photo.albumTitle}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminTrash;
