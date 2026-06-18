import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Album } from '../types';
import { DesignPreview } from './DesignPreview';
import { EditableText } from './EditableText';
import { OptimizedImage } from './OptimizedImage';
import { motion } from 'motion/react';
import { Trash2, Upload, GripVertical, Heart, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { compressImage, uploadImageToStorage, getDisplayImageUrl } from '../utils/image';
import { parseLikes, formatLikes } from '../utils/likes';

interface AlbumCardProps {
  album: Album;
  styleSlug: string;
  styleId: string;
  index: number;
}

export const AlbumCard = React.memo<AlbumCardProps>(({ album, styleSlug, styleId, index }) => {
  const { deleteAlbum, updateAlbumCover, isAdmin, updateAlbumText, favorites, toggleFavorite, moveAlbum, settings } = useApp();
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFavorite = favorites.includes(album.id);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteAlbum(styleSlug, album.id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file);
        const imageUrl = await uploadImageToStorage(compressedImage, `albums/${album.id}/cover_${Date.now()}.jpg`, album.title);
        await updateAlbumCover(styleSlug, album.slug, imageUrl);
      } catch (error) {
        console.error("Error compressing/uploading image:", error);
        alert("Có lỗi xảy ra khi tải ảnh lên. Kích thước ảnh có thể quá lớn, vui lòng thử lại ảnh khác.");
      }
    }
  };

  const likesCount = parseLikes(album.displayLikes, album.id);
  const isHotConcept = index < 5 && likesCount >= 5000;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "50px" }}
      transition={{ delay: (index % 4) * 0.05 }}
      className="group relative"
    >
      <Link 
        to={`/style/${styleSlug}/album/${album.slug}`}
        className="block"
      >
        <div className={`aspect-[4/5] overflow-hidden rounded-2xl mb-3 card-shadow relative ${isHotConcept ? 'border-2 border-yellow-400' : ''}`}>
          {album.design ? (
            <DesignPreview design={album.design} className="absolute inset-0 w-full h-full" fallbackImage={album.coverImage} />
          ) : (
            <>
              <OptimizedImage 
                src={album.coverImage} 
                alt={album.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                containerClassName="w-full h-full"
                referrerPolicy="no-referrer"
              />
              {settings?.brandLogo && (
                <div className={`absolute pointer-events-none z-10 p-2 flex inset-0 ${
                  settings.watermarkPosition === 'top-left' ? 'items-start justify-start' :
                  settings.watermarkPosition === 'top-center' ? 'items-start justify-center' :
                  settings.watermarkPosition === 'top-right' ? 'items-start justify-end' :
                  settings.watermarkPosition === 'bottom-left' ? 'items-end justify-start' :
                  settings.watermarkPosition === 'bottom-center' ? 'items-end justify-center' :
                  settings.watermarkPosition === 'center' ? 'items-center justify-center' :
                  'items-end justify-end'
                }`}>
                  <img 
                    src={getDisplayImageUrl(settings.brandLogo)} 
                    alt="Watermark" 
                    className="max-w-[40px] h-auto drop-shadow-md"
                    style={{ opacity: settings.watermarkOpacity || 0.5 }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </>
          )}
          
          {isHotConcept && (
            <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-center py-1.5 text-[10px] font-bold uppercase tracking-widest shadow-md flex items-center justify-center gap-1.5 z-10">
              <Heart size={12} className="fill-white animate-pulse" /> HOT TRENDING <TrendingUp size={12} className="text-white" />
            </div>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(album.id);
            }}
            className={`absolute ${isHotConcept ? 'top-10' : 'top-4'} left-4 p-2 rounded-full backdrop-blur-md transition-all duration-300 z-10 ${
              isFavorite 
                ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                : 'bg-black/20 text-white/70 hover:bg-black/40 hover:text-white'
            }`}
          >
            <Heart className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} />
          </button>

          {/* Removed old trending badge since we now have top 5 HOT TRENDING */}
        </div>
        <div className="flex items-center justify-between gap-2">
          <EditableText 
            value={album.title}
            onSave={(value) => updateAlbumText(styleSlug, album.slug, 'title', value)}
            disabled={!isAdmin}
            className="text-xs sm:text-sm font-bold text-dark group-hover:bg-gradient-to-r group-hover:from-secondary group-hover:to-primary group-hover:bg-clip-text group-hover:text-transparent transition-all"
            titleClassName="truncate"
          />
          <div className="flex items-center gap-1 text-[10px] text-dark/40 font-bold shrink-0">
            <Heart size={10} className="fill-red-500 text-red-500" />
            <EditableText 
              value={album.displayLikes || formatLikes(parseLikes(undefined, album.id))}
              onSave={(value) => updateAlbumText(styleSlug, album.slug, 'displayLikes', value)}
              disabled={!isAdmin}
            />
          </div>
        </div>
      </Link>

      {!showConfirm && isAdmin && (
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
          <div className="flex gap-1">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveAlbum(styleId, index, 'prev'); }}
              className="p-1.5 bg-primary/80 hover:bg-primary backdrop-blur-sm text-white rounded-l-full shadow-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Di chuyển sang trái"
              disabled={index === 0}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveAlbum(styleId, index, 'next'); }}
              className="p-1.5 bg-primary/80 hover:bg-primary backdrop-blur-sm text-white rounded-r-full shadow-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Di chuyển sang phải"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button 
            onClick={handleUploadClick}
            className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
            title="Thay đổi ảnh bìa"
          >
            <Upload size={14} />
          </button>
          <button 
            onClick={handleDeleteClick}
            className="p-1.5 bg-black/40 hover:bg-red-500/80 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
            title="Xóa album"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleCoverUpload}
        accept="image/*"
        className="hidden"
      />

      {showConfirm && (
        <div className="absolute top-0 left-0 right-0 aspect-[4/5] z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 text-center transition-all rounded-2xl">
          <p className="text-white mb-2 text-xs font-medium">Xóa album này?</p>
          <div className="flex gap-2">
            <button 
              onClick={confirmDelete}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold transition-colors"
            >
              Xóa
            </button>
            <button 
              onClick={cancelDelete}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
});
