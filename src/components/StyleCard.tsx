import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Style } from '../types';
import { DesignPreview } from './DesignPreview';
import { EditableText } from './EditableText';
import { OptimizedImage } from './OptimizedImage';
import { motion } from 'motion/react';
import { Trash2, Upload, GripVertical, Heart, Eye, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { compressImage, uploadImageToStorage, getDisplayImageUrl } from '../utils/image';
import { parseLikes, formatLikes } from '../utils/likes';

interface StyleCardProps {
  style: Style;
  index: number;
  onQuickView?: (style: Style) => void;
}

export const StyleCard = React.memo<StyleCardProps>(({ style, index, onQuickView }) => {
  const { deleteStyle, updateStyleCover, isAdmin, updateStyleText, favorites, toggleFavorite, moveStyle, settings } = useApp();
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFavorite = favorites.includes(style.id);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteStyle(style.id);
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

  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView?.(style);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file);
        const imageUrl = await uploadImageToStorage(compressedImage, `styles/${style.id}/cover_${Date.now()}.jpg`, style.title);
        await updateStyleCover(style.id, imageUrl);
      } catch (error: any) {
        console.error("Error compressing/uploading image:", error);
        alert(`Có lỗi xảy ra khi tải ảnh lên: ${error.message || "Lỗi đường truyền hoặc kích thước ảnh quá lớn"}`);
      }
    }
  };

  const getTotalStyleLikes = (style: Style): string => {
    if (!style.albums || style.albums.length === 0) return '0';
    const total = style.albums.reduce((sum, album) => sum + parseLikes(album.displayLikes, album.id), 0);
    return formatLikes(total);
  };

  const hasHotConcept = React.useMemo(() => {
    if (!style.albums) return false;
    return style.albums.some(album => parseLikes(album.displayLikes, album.id) >= 5000);
  }, [style.albums]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "50px" }}
      transition={{ delay: (index % 4) * 0.05 }}
      className="group relative aspect-[3/4] overflow-hidden rounded-2xl card-shadow"
    >
      <Link 
        to={`/style/${style.slug}`}
        className="block w-full h-full"
      >
        {style.design ? (
          <DesignPreview design={style.design} className="absolute inset-0 w-full h-full" fallbackImage={style.coverImage} />
        ) : (
          <>
            <OptimizedImage 
              src={style.coverImage} 
              alt={style.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              containerClassName="absolute inset-0 w-full h-full"
              referrerPolicy="no-referrer"
            />
            {settings?.brandLogo && (
              <div className={`absolute pointer-events-none z-[1] p-2 flex inset-0 ${
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(style.id);
            }}
            className={`p-2 rounded-full backdrop-blur-md transition-all duration-300 relative ${
              isFavorite 
                ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                : 'bg-black/20 text-white/70 hover:bg-black/40 hover:text-white opacity-0 group-hover:opacity-100'
            }`}
          >
            {/* Coach Mark Pulse */}
            {!isFavorite && favorites.length === 0 && (
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40 pointer-events-none" />
            )}
            <Heart className="w-5 h-5 relative z-10" fill={isFavorite ? "currentColor" : "none"} />
            
            {/* Tooltip for first-time users */}
            {!isFavorite && favorites.length === 0 && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white text-dark text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none animate-bounce">
                Thả tim để chọn!
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-white" />
              </div>
            )}
          </button>

          <button
            onClick={handleQuickViewClick}
            className="p-2 bg-black/20 text-white/70 hover:bg-black/40 hover:text-white rounded-full backdrop-blur-md transition-all duration-300 opacity-0 group-hover:opacity-100"
            title="Xem nhanh album"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 p-4 text-white w-full">
          {hasHotConcept && (
            <div className="mb-2 inline-flex relative pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-500 rounded-full blur animate-pulse" />
              <div className="relative bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-xl flex items-center gap-1.5 border border-white/20">
                <Heart size={10} className="text-white fill-white animate-pulse" />
                HOT TRENDING
                <TrendingUp size={10} className="text-white" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 mb-1" onClick={e => isAdmin && e.preventDefault()}>
            <EditableText 
              value={style.title}
              onSave={(value) => updateStyleText(style.slug, 'title', value)}
              disabled={!isAdmin}
              className="text-base sm:text-lg font-bold leading-tight flex-1 min-w-0"
              titleClassName="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent transition-colors shadow-sm drop-shadow-md pb-1 line-clamp-1"
              editButtonClassName="hover:bg-primary/50"
            />
            <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-white/90 shrink-0 bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm shadow-md">
              <Heart size={12} className="fill-red-500 text-red-500" />
              {getTotalStyleLikes(style)}
            </div>
          </div>
          <div onClick={e => isAdmin && e.preventDefault()} className="mt-1">
            <EditableText 
              value={style.description}
              onSave={(value) => updateStyleText(style.slug, 'description', value)}
              disabled={!isAdmin}
              className="text-[10px] sm:text-xs opacity-80 w-full"
              titleClassName="line-clamp-1"
              editButtonClassName="hover:bg-primary/50"
            />
          </div>
        </div>
      </Link>

      {!showConfirm && isAdmin && (
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <div className="flex gap-1">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveStyle(index, 'prev'); }}
              className="p-2 bg-primary/80 hover:bg-primary backdrop-blur-sm text-white rounded-l-full shadow-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Di chuyển sang trái"
              disabled={index === 0}
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveStyle(index, 'next'); }}
              className="p-2 bg-primary/80 hover:bg-primary backdrop-blur-sm text-white rounded-r-full shadow-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Di chuyển sang phải"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button 
            onClick={handleUploadClick}
            className="p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
            title="Thay đổi ảnh bìa"
          >
            <Upload size={16} />
          </button>
          <button 
            onClick={handleDeleteClick}
            className="p-2 bg-black/40 hover:bg-red-500/80 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
            title="Xóa phong cách"
          >
            <Trash2 size={16} />
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
        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center transition-all">
          <p className="text-white mb-4 text-sm font-medium">Bạn có chắc chắn muốn xóa phong cách này?</p>
          <div className="flex gap-3">
            <button 
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Xóa
            </button>
            <button 
              onClick={cancelDelete}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
});
