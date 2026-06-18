import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { StyleCard } from '../components/StyleCard';
import { AlbumCard } from '../components/AlbumCard';
import { OptimizedImage } from '../components/OptimizedImage';
import { DesignPreview } from '../components/DesignPreview';
import { Layout } from '../components/Layout';
import { Helmet } from 'react-helmet-async';
import { Heart, Send, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConsultationModal } from '../components/ConsultationModal';
import { ChatModal } from '../components/ChatModal';
import { motion } from 'motion/react';

export const Favorites: React.FC = () => {
  const { styles, favorites } = useApp();
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');

  const favoriteItems = useMemo(() => {
    const items: { type: 'style' | 'album' | 'photo', data: any, styleSlug?: string, albumSlug?: string, index?: number }[] = [];
    
    styles.forEach(style => {
      if (favorites.includes(style.id)) {
        items.push({ type: 'style', data: style });
      }
      
      (style.albums || []).forEach(album => {
        if (favorites.includes(album.id)) {
          items.push({ type: 'album', data: album, styleSlug: style.slug });
        }
        
        (album.photos || []).forEach((photo, index) => {
          if (favorites.includes(photo.id)) {
            items.push({ type: 'photo', data: photo, styleSlug: style.slug, albumSlug: album.slug, index });
          }
        });
      });
    });
    
    return items;
  }, [styles, favorites]);

  if (favoriteItems.length === 0) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Heart className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-dark mb-2">Chưa có mục yêu thích</h2>
          <p className="text-dark/60 max-w-md mb-8">
            Bạn chưa lưu bất kỳ concept, album hay bức ảnh nào. Hãy khám phá và thả tim cho những gì bạn thích nhé!
          </p>
          <Link 
            to="/"
            className="px-8 py-3 bg-dark text-white rounded-full font-medium hover:bg-dark/90 transition-colors"
          >
            Khám phá ngay
          </Link>
        </div>
      </Layout>
    );
  }

  const favoriteStyles = favoriteItems.filter(item => item.type === 'style');
  const favoriteAlbums = favoriteItems.filter(item => item.type === 'album');
  const favoritePhotos = favoriteItems.filter(item => item.type === 'photo');

  const handleSendToStudio = () => {
    let message = "Chào H2O STUDIO, mình quan tâm danh sách concept/album sau:\n\n";
    
    if (favoriteStyles.length > 0) {
      message += `📚 CONCEPT YÊU THÍCH:\n`;
      favoriteStyles.forEach(s => {
        message += `- ${s.data.title}: ${window.location.origin}/style/${s.data.slug}\n`;
      });
      message += '\n';
    }
    
    if (favoriteAlbums.length > 0) {
      message += `🖼️ ALBUM YÊU THÍCH:\n`;
      favoriteAlbums.forEach(a => {
        message += `- ${a.data.title}: ${window.location.origin}/style/${a.styleSlug}/album/${a.data.slug}\n`;
      });
      message += '\n';
    }

    if (favoritePhotos.length > 0) {
      message += `📸 CÓ THÊM ${favoritePhotos.length} ẢNH LẺ YÊU THÍCH.\n\n`;
    }

    message += "Tư vấn cho mình nhé!";

    setInitialMessage(message);
    setIsConsultModalOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 pb-32">
        <Helmet>
          <title>Album Yêu Thích - H2O STUDIO</title>
          <meta name="description" content="Tổng hợp những ý tưởng và concept bạn yêu thích nhất tại H2O STUDIO." />
        </Helmet>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-dark mb-4 flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-500 fill-red-500" />
              Album Yêu Thích
            </h1>
            <p className="text-dark/60">Tổng hợp những ý tưởng và concept bạn yêu thích nhất tại H2O STUDIO.</p>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendToStudio}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-secondary to-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 transition-all relative group"
          >
            <Send size={20} />
            Gửi Nhận Báo Giá
            
            {/* Coach Mark for Final Step */}
            <div className="absolute bottom-full mb-4 right-0 bg-white text-dark text-[10px] font-bold px-3 py-2 rounded-xl shadow-2xl whitespace-nowrap pointer-events-none animate-bounce border border-primary/20">
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                Gửi ngay để nhận ưu đãi & báo giá!
              </span>
              <div className="absolute top-full right-8 border-8 border-transparent border-t-white" />
            </div>
            
            <span className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse pointer-events-none" />
          </motion.button>
        </div>

        {favoriteStyles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-dark mb-6 border-b pb-2">Concept Yêu Thích</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {favoriteStyles.map((item, index) => (
                <StyleCard key={item.data.id} style={item.data} index={index} />
              ))}
            </div>
          </div>
        )}

        {favoriteAlbums.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-dark mb-6 border-b pb-2">Album Yêu Thích</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {favoriteAlbums.map((item, index) => (
                <AlbumCard key={item.data.id} album={item.data} styleSlug={item.styleSlug!} index={index} />
              ))}
            </div>
          </div>
        )}

        {favoritePhotos.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-dark mb-6 border-b pb-2">Ảnh Yêu Thích</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {favoritePhotos.map((item) => (
                <Link 
                  key={item.data.id}
                  to={`/style/${item.styleSlug}/album/${item.albumSlug}/photo/${item.index}`}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100 block"
                >
                  {item.data.design ? (
                    <DesignPreview design={item.data.design} fallbackImage={item.data.image} className="w-full h-full transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <OptimizedImage 
                      src={item.data.image} 
                      alt="Favorite photo"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      containerClassName="absolute inset-0 w-full h-full"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  <div className="absolute top-2 right-2 p-1.5 bg-red-500/20 text-red-500 rounded-full backdrop-blur-md">
                    <Heart className="w-4 h-4" fill="currentColor" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <ChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        title="Gửi Album Yêu Thích cho H2O STUDIO"
        initialMessage={initialMessage}
        onOpenConsultation={() => setIsConsultModalOpen(true)}
        showExtraOptions={false}
      />

      <ConsultationModal 
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        initialMessage={initialMessage}
      />
    </Layout>
  );
};
