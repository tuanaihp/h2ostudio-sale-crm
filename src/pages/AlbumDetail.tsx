import React, { useState, useRef, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ChatModal } from '../components/ChatModal';
import { AddPlaceholder } from '../components/AddPlaceholder';
import { ImageEditorModal } from '../components/ImageEditorModal';
import { ConsultationModal } from '../components/ConsultationModal';
import { DesignPreview } from '../components/DesignPreview';
import { EditableText } from '../components/EditableText';
import { OptimizedImage } from '../components/OptimizedImage';
import { motion } from 'motion/react';
import { Share2, MessageCircle, Heart, Trash2, Upload, Move, Check, X, GripVertical, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { EditorState, Photo } from '../types';
import { useApp } from '../context/AppContext';
import { compressImage, uploadImageToStorage, getDisplayImageUrl } from '../utils/image';
import { parseLikes, formatLikes } from '../utils/likes';

interface SortablePhotoProps {
  photo: Photo;
  index: number;
  slug: string;
  styleId: string;
  albumId: string;
  albumSlug: string;
  isAdmin: boolean;
  triggerPhotoUpload: (e: React.MouseEvent, photoId: string) => void;
  handleDeletePhoto: (e: React.MouseEvent, photoId: string) => void;
  onConsult: (e: React.MouseEvent, photo: Photo, index: number) => void;
}

const PhotoItem = React.memo<SortablePhotoProps>(({ 
  photo, index, slug, styleId, albumId, albumSlug, isAdmin, triggerPhotoUpload, handleDeletePhoto, onConsult 
}) => {
  const { movePhoto, settings } = useApp();
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "100px" }}
      transition={{ delay: (index % 4) * 0.05 }}
      className="relative group"
    >
      <Link
        to={`/style/${slug}/album/${albumSlug}/photo/${photo.id}`}
        className="block aspect-[3/4] overflow-hidden rounded-lg bg-light-gray relative"
      >
        {photo.design ? (
          <DesignPreview design={photo.design} className="w-full h-full" fallbackImage={photo.image} />
        ) : (
          <OptimizedImage
            src={photo.image}
            alt={photo.alt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            containerClassName="w-full h-full"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Hover overlay — "Xem ảnh" hint */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 pointer-events-none">
          <span className="text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
            <MessageCircle size={10} />
            Xem ảnh
          </span>
        </div>

        {/* Dynamic Watermark Overlay for thumbnails */}
        {!photo.design && settings?.brandLogo && (
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
              className="max-w-[40px] sm:max-w-[60px] h-auto drop-shadow-md"
              style={{ opacity: settings.watermarkOpacity || 0.5 }}
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </Link>
      
      {/* Consult Button for all users */}
      <button 
        onClick={(e) => onConsult(e, photo, index)}
        className="absolute bottom-2 right-2 p-2 bg-white/90 hover:bg-white text-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 scale-90 group-hover:scale-100"
        title="Tư vấn ảnh này"
      >
        <MessageCircle size={16} fill="currentColor" />
      </button>

      {isAdmin && (
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex gap-0.5">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); movePhoto(styleId, albumId, index, 'prev'); }}
              className="p-1.5 bg-primary/80 hover:bg-primary backdrop-blur-sm text-white rounded-l-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
              title="Di chuyển sang trái"
              disabled={index === 0}
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); movePhoto(styleId, albumId, index, 'next'); }}
              className="p-1.5 bg-primary/80 hover:bg-primary backdrop-blur-sm text-white rounded-r-full shadow-lg transition-all duration-300"
              title="Di chuyển sang phải"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <button 
            onClick={(e) => triggerPhotoUpload(e, photo.id)}
            className="p-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white rounded-full transition-all duration-300"
            title="Thay ảnh"
          >
            <Upload size={14} />
          </button>
          <button 
            onClick={(e) => handleDeletePhoto(e, photo.id)}
            className="p-1.5 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm text-white rounded-full transition-all duration-300"
            title="Xóa ảnh"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
});

const AlbumDetail: React.FC = () => {
  const { slug, albumSlug } = useParams<{ slug: string; albumSlug: string }>();
  const { styles, setStyles, addPhoto, updatePhoto, updateAlbumCover, updateAlbumCoverPos, updateAlbumText, deletePhoto, isAdmin, favorites, toggleFavorite, fetchPhotos, fetchAlbums, isDataLoaded } = useApp();
  const style = styles.find(s => s.slug === slug);
  const album = style?.albums?.find(a => a.slug === albumSlug);
  const [hasRequestedAlbums, setHasRequestedAlbums] = useState(false);
  const [hasRequestedPhotos, setHasRequestedPhotos] = useState(false);
  const [isFetchingAlbums, setIsFetchingAlbums] = useState(false);

  useEffect(() => {
    setHasRequestedAlbums(false);
    setHasRequestedPhotos(false);
  }, [slug, albumSlug]);
  
  useEffect(() => {
    if (style && (!style.albums || style.albums.length === 0) && !hasRequestedAlbums) {
      setHasRequestedAlbums(true);
      setIsFetchingAlbums(true);
      fetchAlbums(style.id).finally(() => setIsFetchingAlbums(false));
    }
  }, [style?.id, style?.albums, hasRequestedAlbums]);

  useEffect(() => {
    if (style && album && (!album.photos || album.photos.length === 0) && !hasRequestedPhotos) {
      setHasRequestedPhotos(true);
      fetchPhotos(style.id, album.id);
    }
  }, [style?.id, album?.id, album?.photos, hasRequestedPhotos]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('Tư vấn Concept');
  const [isLiked, setIsLiked] = useState(false);
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultInitialMessage, setConsultInitialMessage] = useState('');
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const batchUploadRef = useRef<HTMLInputElement>(null);
  const coverContainerRef = useRef<HTMLDivElement>(null);

  const [isRepositioningCover, setIsRepositioningCover] = useState(false);
  const [coverPos, setCoverPos] = useState(album?.coverImagePos || { x: 50, y: 50 });
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isRepositioningCover && album) {
      setCoverPos(album.coverImagePos || { x: 50, y: 50 });
    }
  }, [album?.coverImagePos, isRepositioningCover, album]);

  // Parallax cover background + sticky CTA visibility
  const coverBgRef = useRef<HTMLDivElement>(null);
  const [showStickyConsult, setShowStickyConsult] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setShowStickyConsult(y > 380);
      if (coverBgRef.current) {
        coverBgRef.current.style.transform = `translateY(${y * 0.28}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If we found the style but haven't found the album yet, check if we are still loading albums
  const isLoadingAlbums = style && (!style.albums || style.albums.length === 0);

  if (!isDataLoaded || isFetchingAlbums || (isLoadingAlbums && !hasRequestedAlbums)) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  if (!style || !album) {
    // If we've loaded data and explicitly can't find this style or album, redirect
    if (isDataLoaded && !isFetchingAlbums) {
      return <Navigate to="/" />;
    }
    // Otherwise show loading
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isRepositioningCover || !isAdmin) return;
    setIsDraggingCover(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingCover || !coverContainerRef.current || !isAdmin) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    
    const rect = coverContainerRef.current.getBoundingClientRect();
    const factorX = (dx / rect.width) * 100 * -1;
    const factorY = (dy / rect.height) * 100 * -1;

    setCoverPos(prev => ({
      x: Math.max(0, Math.min(100, prev.x + factorX)),
      y: Math.max(0, Math.min(100, prev.y + factorY))
    }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingCover || !isAdmin) return;
    setIsDraggingCover(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const saveCoverPos = () => {
    if (slug && albumSlug && isAdmin) {
      updateAlbumCoverPos(slug, albumSlug, coverPos);
      setIsRepositioningCover(false);
    }
  };

  const handleDeletePhoto = (e: React.MouseEvent, photoId: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    setDeletingPhotoId(photoId);
  };

  const confirmDeletePhoto = () => {
    if (slug && albumSlug && deletingPhotoId && isAdmin) {
      deletePhoto(slug, albumSlug, deletingPhotoId);
      setDeletingPhotoId(null);
    }
  };

  const handleSavePhoto = async (state: EditorState) => {
    if (slug && albumSlug && isAdmin) {
      setIsSaving(true);
      try {
        await addPhoto(slug, albumSlug, state);
        setIsEditorOpen(false);
      } catch (error: any) {
        console.error("Error saving photo:", error);
        alert(`Có lỗi xảy ra khi lưu ảnh: ${error.message || "Kích thước ảnh quá lớn hoặc lỗi đường truyền"}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedImage = await compressImage(file, 2048, 2048, 0.85, watermarkText);
        
        // Create a default editor state for the batch uploaded image
        const defaultState: EditorState = {
          mainImage: compressedImage,
          mainImagePos: { x: 0, y: 0, scale: 1 },
          text: "",
          textFont: "Inter",
          textColor: "#FFFFFF",
          textPos: { x: 50, y: 80 },
          logo1: null,
          logo1Pos: { x: 10, y: 10, scale: 0.2 },
          logo2: null,
          logo2Pos: { x: 80, y: 10, scale: 0.15 },
        };
        
        await addPhoto(slug!, albumSlug!, defaultState);
      }
    } catch (error: any) {
      console.error("Error in batch upload:", error);
      alert(`Có lỗi xảy ra khi tải ảnh lên: ${error.message || "Lỗi đường truyền hoặc kích thước ảnh quá lớn"}`);
    } finally {
      setIsUploading(false);
      if (batchUploadRef.current) {
        batchUploadRef.current.value = '';
      }
    }
  };

  const triggerPhotoUpload = (e: React.MouseEvent, photoId: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    setUploadingPhotoId(photoId);
    photoInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (file && slug && albumSlug && uploadingPhotoId) {
      try {
        const compressedImage = await compressImage(file);
        await updatePhoto(slug, albumSlug, uploadingPhotoId, compressedImage);
        setUploadingPhotoId(null);
      } catch (error: any) {
        console.error("Error compressing/uploading image:", error);
        alert(`Có lỗi xảy ra khi tải ảnh lên: ${error.message || "Lỗi đường truyền hoặc kích thước ảnh quá lớn"}`);
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (file && slug && albumSlug) {
      try {
        const compressedImage = await compressImage(file);
        const imageUrl = await uploadImageToStorage(compressedImage, `albums/${album.id}/cover_${Date.now()}.jpg`, album.title);
        await updateAlbumCover(slug, albumSlug, imageUrl);
      } catch (error: any) {
        console.error("Error compressing/uploading image:", error);
        alert(`Có lỗi xảy ra khi tải ảnh lên: ${error.message || "Lỗi đường truyền hoặc kích thước ảnh quá lớn"}`);
      }
    }
  };

  const handleShare = () => {
    const message = `Chào H2O STUDIO, mình muốn chia sẻ và hỏi thêm về album này: ${album.title} (${style.title})\nLink: ${window.location.href}`;
    setModalTitle("Chia sẻ phong cách");
    setChatInitialMessage(message);
    setIsChatOpen(true);
  };

  const handleConsult = (e: React.MouseEvent, photo: Photo, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/style/${slug}/album/${albumSlug}/photo/${photo.id}`;
    const message = `Chào H2O STUDIO, mình đang quan tâm ảnh này trong album "${album.title}" (Ảnh số ${index + 1})\nLink: ${url}\nTư vấn giúp mình nhé!`;
    setModalTitle("Tư vấn ảnh này");
    setChatInitialMessage(message);
    setIsChatOpen(true);
  };

  return (
    <Layout 
      title={album.title} 
      showBack 
      showBottomBar
      onShare={handleShare}
      onChat={() => {
        const message = `Chào H2O STUDIO, mình cần tư vấn về concept "${album.title}" (từ bộ sưu tập ${style.title})\nLink: ${window.location.href}\nTư vấn cho mình nhé!`;
        setModalTitle("Tư vấn Concept");
        setChatInitialMessage(message);
        setIsChatOpen(true);
      }}
    >
      <Helmet>
        <title>{`${album.title} - H2O STUDIO`}</title>
        <meta name="description" content={album.description} />
        <meta property="og:title" content={`${album.title} - H2O STUDIO`} />
        <meta property="og:description" content={album.description} />
        <meta property="og:image" content={album.coverImage} />
      </Helmet>
      
      {/* Cover Image Section */}
      <div className="relative w-full h-[50vh] sm:h-[70vh] bg-dark flex items-center justify-center overflow-hidden group">
        {/* Blurred Background — parallax on scroll */}
        <div
          ref={coverBgRef}
          className="absolute inset-0 opacity-40 blur-3xl scale-125 will-change-transform"
          style={{ backgroundImage: `url(${getDisplayImageUrl(album.coverImage)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        
        {/* Main Image in a Frame */}
        <div className="relative z-10 w-full h-full p-4 sm:p-8 flex items-center justify-center">
          <div className="relative max-w-full max-h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/20">
            <motion.img 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              src={getDisplayImageUrl(album.coverImage)} 
              alt={album.title}
              className="max-w-full max-h-full object-contain block"
              referrerPolicy="no-referrer"
              draggable={false}
            />
            
            {/* Admin Controls Overlay */}
            {isAdmin && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white shadow-xl transition-all hover:scale-110"
                  title="Tải lên ảnh bìa mới"
                >
                  <Upload size={28} />
                </button>
              </div>
            )}
          </div>
        </div>

        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleCoverUpload}
        />

        <button 
          onClick={() => toggleFavorite(album.id)}
          className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all active:scale-90 z-20 shadow-lg"
        >
          <Heart size={24} fill={favorites.includes(album.id) ? "#FF5FA8" : "none"} stroke={favorites.includes(album.id) ? "#FF5FA8" : "currentColor"} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6 sm:-mt-10 relative z-20">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl mb-4 sm:mb-8">
          <div className="flex flex-col gap-0.5 sm:gap-1 mb-2 sm:mb-4">
            <div className="flex justify-between items-center">
              <span className="text-primary text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                {style.title}
              </span>
              <div className="flex items-center gap-1 text-dark/40 text-xs font-bold">
                <Heart size={12} className="fill-red-500 text-red-500" />
                <EditableText 
                  value={album.displayLikes || formatLikes(parseLikes(undefined, album.id))} 
                  onSave={(val) => slug && albumSlug && updateAlbumText(slug, albumSlug, 'displayLikes', val)} 
                  disabled={!isAdmin}
                />
                lượt thích
              </div>
            </div>
            <h2 className="text-base xs:text-lg sm:text-2xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
              <EditableText 
                value={album.title} 
                onSave={(val) => slug && albumSlug && updateAlbumText(slug, albumSlug, 'title', val)} 
                disabled={!isAdmin}
              />
            </h2>
          </div>
          <div className="text-dark/70 text-xs sm:text-sm leading-snug sm:leading-relaxed mb-3 sm:mb-6">
            <EditableText 
              value={album.description} 
              onSave={(val) => slug && albumSlug && updateAlbumText(slug, albumSlug, 'description', val)} 
              multiline
              className="w-full"
              disabled={!isAdmin}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-light-gray">
            <div>
              <p className="text-[9px] sm:text-[10px] uppercase text-dark/40 font-bold mb-0.5 sm:mb-1">Layout gợi ý</p>
              <div className="text-[11px] sm:text-xs font-medium">
                <EditableText 
                  value={album.suggestedLayout || "Nàng thơ, trong trẻo"} 
                  onSave={(val) => slug && albumSlug && updateAlbumText(slug, albumSlug, 'suggestedLayout', val)} 
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] uppercase text-dark/40 font-bold mb-0.5 sm:mb-1">Phù hợp</p>
              <div className="text-[11px] sm:text-xs font-medium">
                <EditableText 
                  value={album.suitableFor || "Chụp studio, kỷ niệm"} 
                  onSave={(val) => slug && albumSlug && updateAlbumText(slug, albumSlug, 'suitableFor', val)} 
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={photoInputRef}
            onChange={handlePhotoUpload}
          />
          {(album.photos || []).map((photo, index) => (
            <PhotoItem 
              key={photo.id}
              photo={photo}
              index={index}
              slug={slug!}
              styleId={style.id}
              albumId={album.id}
              albumSlug={albumSlug!}
              isAdmin={isAdmin}
              triggerPhotoUpload={triggerPhotoUpload}
              handleDeletePhoto={handleDeletePhoto}
              onConsult={handleConsult}
            />
          ))}
          {isAdmin && (
            <>
              <AddPlaceholder label="Thêm 1 Ảnh (Design)" onClick={() => setIsEditorOpen(true)} />
              <div className="flex flex-col gap-2">
                <div 
                  onClick={() => batchUploadRef.current?.click()}
                  className="aspect-[3/4] rounded-2xl border-2 border-dashed border-dark/20 flex flex-col items-center justify-center text-dark/40 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-dark/5 group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <span className="font-medium">{isUploading ? 'Đang tải...' : 'Tải nhiều ảnh'}</span>
                </div>
                <input
                  type="text"
                  placeholder="Nhập watermark (tùy chọn)"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-light-gray rounded-lg border-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <input 
                type="file" 
                ref={batchUploadRef}
                onChange={handleBatchUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
            </>
          )}
        </div>

        <ImageEditorModal 
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSavePhoto}
          title="Thiết kế Ảnh mới"
          isSaving={isSaving}
        />

        {/* Desktop CTAs */}
        <div className="hidden sm:flex gap-4 mt-12 justify-center">
          <button onClick={handleShare} className="btn-outline">
            <Share2 size={20} />
            <span>Chia sẻ phong cách</span>
          </button>
              <button onClick={() => {
                const message = `Chào H2O STUDIO, mình cần tư vấn về concept "${album.title}" (từ bộ sưu tập ${style.title})\nLink: ${window.location.href}\nTư vấn cho mình nhé!`;
                setConsultInitialMessage(message);
                setIsConsultModalOpen(true);
              }} className="btn-primary">
                <MessageCircle size={20} />
                <span>Chat tư vấn ngay</span>
              </button>
        </div>

        {/* Cross-selling Section */}
        <div className="mt-16 pt-8 border-t border-light-gray">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-dark">Khách thường xem cùng album này</h3>
              <p className="text-xs text-dark/50 mt-0.5">Chọn thêm để tư vấn combo tiết kiệm hơn</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {style.albums.filter(a => a.id !== album.id).slice(0, 4).map(relatedAlbum => (
              <Link
                key={relatedAlbum.id}
                to={`/style/${slug}/album/${relatedAlbum.slug}`}
                className="group block"
              >
                <div className="aspect-[3/4] rounded-xl overflow-hidden mb-2 relative">
                  <OptimizedImage
                    src={relatedAlbum.coverImage}
                    alt={relatedAlbum.title}
                    className="w-full h-full object-cover group-hover:scale-95 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <span className="text-white text-[10px] font-bold uppercase tracking-widest">Xem album</span>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-dark truncate">{relatedAlbum.title}</h4>
                <p className="text-[10px] text-dark/60 uppercase tracking-wider">{style.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky floating CTA — appears after scroll */}
      {showStickyConsult && !isAdmin && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-2">
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={() => {
              const message = `Chào H2O STUDIO, mình cần tư vấn về concept "${album.title}" (từ bộ sưu tập ${style.title})\nLink: ${window.location.href}\nTư vấn cho mình nhé!`;
              setConsultInitialMessage(message);
              setIsConsultModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-full text-white font-bold shadow-2xl text-sm"
            style={{ background: 'linear-gradient(135deg, #A4756B, #ECB697)' }}
          >
            <MessageCircle size={18} />
            Tư vấn concept này
          </motion.button>
        </div>
      )}

      {/* Consultation Modal */}
      <ConsultationModal
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        initialMessage={consultInitialMessage || chatInitialMessage}
      />

      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        title={modalTitle}
        initialMessage={chatInitialMessage}
        onOpenConsultation={() => setIsConsultModalOpen(true)}
      />

      {deletingPhotoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-dark mb-2">Xóa ảnh</h3>
            <p className="text-dark/70 mb-6">Bạn có chắc chắn muốn xóa ảnh này khỏi album không? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingPhotoId(null)}
                className="flex-1 py-2.5 rounded-xl font-medium bg-light-gray text-dark hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDeletePhoto}
                className="flex-1 py-2.5 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AlbumDetail;
