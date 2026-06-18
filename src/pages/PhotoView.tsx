import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { ChatModal } from '../components/ChatModal';
import { ConsultationModal } from '../components/ConsultationModal';
import { DesignPreview } from '../components/DesignPreview';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Share2, MessageCircle, Heart, Home, Loader2, Download, Play, Pause } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { getDisplayImageUrl } from '../utils/image';

const PhotoView: React.FC = () => {
  const { slug, albumSlug, photoId } = useParams<{ slug: string; albumSlug: string; photoId: string }>();
  const navigate = useNavigate();
  const { styles, favorites, toggleFavorite, settings, isAdmin, isDataLoaded } = useApp();
  
  const style = styles.find(s => s.slug === slug);
  const album = style?.albums?.find(a => a.slug === albumSlug);
  const currentIndex = parseInt(photoId || "0");
  const photo = album?.photos?.[currentIndex];

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Tư vấn Concept');
  const [chatInitialMessage, setChatInitialMessage] = useState('');
  const [direction, setDirection] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const isFavorite = photo ? favorites.includes(photo.id) : false;

  // Auto-play effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying && album?.photos) {
      if (currentIndex < album.photos.length - 1) {
        interval = setInterval(() => {
          setDirection(1);
          navigate(`/style/${slug}/album/${albumSlug}/photo/${currentIndex + 1}`);
        }, 3500); // 3.5 seconds per photo
      } else if (style && style.albums && style.albums.length > 1) {
        // Go to the NEXT album in the style sequentially to allow a continuous slideshow
        const currentAlbumIndex = style.albums.findIndex(a => a.id === album.id);
        const nextAlbumIndex = (currentAlbumIndex + 1) % style.albums.length;
        const nextAlbum = style.albums[nextAlbumIndex];
        
        interval = setInterval(() => {
          setDirection(1);
          navigate(`/style/${slug}/album/${nextAlbum.slug}/photo/0`);
        }, 3500);
      } else {
        // If no other albums or photos, stop
        setIsAutoPlaying(false);
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlaying, currentIndex, album, style, slug, albumSlug, navigate]);

  const isUnmodifiedDesign = photo?.design && 
    !photo.design.text && 
    !photo.design.logo1 && 
    !photo.design.logo2 && 
    photo.design.mainImagePos?.x === 0 && 
    photo.design.mainImagePos?.y === 0 && 
    photo.design.mainImagePos?.scale === 1;

  const showAsDesign = photo?.design && !isUnmodifiedDesign;

  // Use style's design text color as theme color for UI accents
  const themeColor = style?.design?.textColor || '#ec4899'; // Default to pink-500 if not found

  // Preload adjacent images
  useEffect(() => {
    if (!album?.photos) return;
    const imgs: HTMLImageElement[] = [];
    const preload = (idx: number) => {
      if (idx < 0 || idx >= album.photos.length) return;
      const img = new Image();
      img.src = album.photos[idx].image;
      imgs.push(img);
    };
    preload(currentIndex + 1);
    preload(currentIndex - 1);
    return () => {
      imgs.forEach(img => { img.src = ''; });
    };
  }, [currentIndex, album?.photos]);

  const handleNext = () => {
    if (album && album.photos && currentIndex < album.photos.length - 1) {
      setDirection(1);
      navigate(`/style/${slug}/album/${albumSlug}/photo/${currentIndex + 1}`);
    } else if (style && style.albums && style.albums.length > 1) {
      const currentAlbumIndex = style.albums.findIndex(a => a.id === album?.id);
      const nextAlbumIndex = (currentAlbumIndex + 1) % style.albums.length;
      const nextAlbum = style.albums[nextAlbumIndex];
      setDirection(1);
      navigate(`/style/${slug}/album/${nextAlbum.slug}/photo/0`);
    }
  };

  const handlePrev = () => {
    if (album && album.photos && currentIndex > 0) {
      setDirection(-1);
      navigate(`/style/${slug}/album/${albumSlug}/photo/${currentIndex - 1}`);
    }
  };

  const handleShare = () => {
    if (!album) return;
    const message = `Chào H2O STUDIO, mình muốn chia sẻ và hỏi thêm về ảnh này trong album ${album.title} (Ảnh số ${currentIndex + 1})\nLink: ${window.location.href}`;
    setModalTitle("Chia sẻ phong cách");
    setChatInitialMessage(message);
    setIsChatOpen(true);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(photo.image);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `h2o-studio-${album.slug}-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
      // Fallback: open in new tab
      window.open(photo.image, '_blank');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') navigate(`/style/${slug}/album/${albumSlug}`);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, album, slug, albumSlug, navigate]);

  if (!style || !album || !photo) {
    if (isDataLoaded) {
      return <Navigate to="/" />;
    }
    return (
      <div className="fixed inset-0 z-[200] bg-dark flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-dark flex flex-col">
      <Helmet>
        <title>{`Ảnh ${currentIndex + 1} - ${album.title} - H2O STUDIO`}</title>
        <meta property="og:title" content={`Ảnh ${currentIndex + 1} - ${album.title} - H2O STUDIO`} />
        <meta property="og:image" content={photo.image} />
      </Helmet>
      
      {/* Top Bar */}
      <div className="p-4 flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/style/${slug}/album/${albumSlug}`)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Quay lại album">
            <X size={24} />
          </button>
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Trang chủ">
            <Home size={20} />
          </button>
        </div>
        <div className="text-center">
          <p 
            className="text-xs font-bold uppercase tracking-widest bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(to right, ${themeColor}, white)` }}
          >
            {album.title}
          </p>
          <p className="text-sm font-medium">{currentIndex + 1} / {album.photos?.length || 0}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAutoPlaying(!isAutoPlaying)} 
            className={`p-2 rounded-full transition-colors ${isAutoPlaying ? 'bg-white/10 hover:bg-white/20' : 'hover:bg-white/10'}`} 
            title={isAutoPlaying ? "Tạm dừng tự động chuyển ảnh" : "Tự động chuyển ảnh"}
          >
            {isAutoPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          <button 
            onClick={() => photo && toggleFavorite(photo.id)} 
            className={`p-2 rounded-full transition-colors ${
              isFavorite ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-white/10'
            }`}
          >
            <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button onClick={handleShare} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Chia sẻ">
            <Share2 size={24} />
          </button>
          {isAdmin && (
            <button onClick={handleDownload} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Tải ảnh về">
              <Download size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Main Image View */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{ '--style-theme-color': themeColor } as React.CSSProperties}
      >
        <AnimatePresence initial={false} custom={direction}>
          {showAsDesign ? (
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={{
                enter: (direction: number) => ({
                  x: direction > 0 ? "100%" : "-100%",
                  opacity: 1
                }),
                center: {
                  x: 0,
                  opacity: 1
                },
                exit: (direction: number) => ({
                  x: direction > 0 ? "-100%" : "100%",
                  opacity: 1
                })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ 
                x: { type: "tween", ease: "linear", duration: 0.5 },
                opacity: { duration: 0.5 }
              }}
              className="absolute w-full h-full flex items-center justify-center p-4"
            >
              <DesignPreview design={photo.design} className="w-full max-w-lg aspect-[3/4] rounded-lg shadow-2xl" />
              {settings.brandLogo && (
                <div className={`absolute pointer-events-none z-10 p-4 flex inset-0 ${
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
                    className="max-w-[100px] sm:max-w-[150px] h-auto drop-shadow-md"
                    style={{ opacity: settings.watermarkOpacity || 0.5 }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={{
                enter: (direction: number) => ({
                  x: direction > 0 ? "100%" : "-100%",
                  opacity: 1
                }),
                center: {
                  x: 0,
                  opacity: 1
                },
                exit: (direction: number) => ({
                  x: direction > 0 ? "-100%" : "100%",
                  opacity: 1
                })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ 
                x: { type: "tween", ease: "linear", duration: 0.5 },
                opacity: { duration: 0.5 }
              }}
              className="absolute w-full h-full flex items-center justify-center"
            >
              {!loadedImages[photo.image] && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
              <img
                src={getDisplayImageUrl(photo.image)}
                alt={photo.alt}
                onLoad={() => setLoadedImages(prev => ({ ...prev, [photo.image]: true }))}
                onError={() => setLoadedImages(prev => ({ ...prev, [photo.image]: true }))}
                className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${loadedImages[photo.image] ? 'opacity-100' : 'opacity-0'}`}
                referrerPolicy="no-referrer"
              />
              {settings.brandLogo && (
                <div className={`absolute pointer-events-none z-10 p-4 flex inset-0 ${
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
                    className="max-w-[100px] sm:max-w-[150px] h-auto drop-shadow-md"
                    style={{ opacity: settings.watermarkOpacity || 0.5 }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white transition-all z-[100] rounded-full disabled:hidden flex items-center justify-center backdrop-blur-sm shadow-lg hover:brightness-110 active:scale-95"
          style={{ backgroundColor: `${themeColor}44` }} // 25% opacity
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
        <button 
          onClick={handleNext}
          disabled={!album.photos || currentIndex === album.photos.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white transition-all z-[100] rounded-full disabled:hidden flex items-center justify-center backdrop-blur-sm shadow-lg hover:brightness-110 active:scale-95"
          style={{ backgroundColor: `${themeColor}44` }} // 25% opacity
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      </div>

      {/* Bottom Bar */}
      <div className="p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-4">
        <button 
          onClick={() => {
            setModalTitle("Tư vấn Concept");
            setChatInitialMessage(`Chào H2O STUDIO, mình đang quan tâm concept này: ${album.title} (Ảnh ${currentIndex + 1})\nLink: ${window.location.href}\nTư vấn cho mình nhé!`);
            setIsChatOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-8 py-3 rounded-full text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-xl w-full max-w-xs"
          style={{ backgroundColor: themeColor }}
        >
          <MessageCircle size={20} />
          <span>Tư vấn concept này</span>
        </button>
      </div>

      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        title={modalTitle}
        initialMessage={chatInitialMessage}
        onOpenConsultation={() => setIsConsultModalOpen(true)}
      />

      <ConsultationModal 
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        initialMessage={`Chào H2O STUDIO, mình đang quan tâm concept này: ${album.title} (Ảnh ${currentIndex + 1})\nLink: ${window.location.href}\nTư vấn cho mình nhé!`}
      />
    </div>
  );
};

export default PhotoView;
