import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { StyleCard } from '../components/StyleCard';
import { QuickViewModal } from '../components/QuickViewModal';
import { AddPlaceholder } from '../components/AddPlaceholder';
import { ImageEditorModal } from '../components/ImageEditorModal';
import { ConsultationModal } from '../components/ConsultationModal';
import { PromoMarquee } from '../components/PromoMarquee';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { EditorState, Style } from '../types';
import { useApp } from '../context/AppContext';
import { useSearchParams } from 'react-router-dom';
import { Heart, Sparkles, X } from 'lucide-react';

const Home: React.FC = () => {
  const { styles, addStyle, isAdmin, isSuperAdmin, favorites, settings } = useApp();
  const [searchParams] = useSearchParams();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultInitialMessage, setConsultInitialMessage] = useState('');
  const [quickViewStyle, setQuickViewStyle] = useState<Style | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const brideName = searchParams.get('bride') || searchParams.get('name');
  const groomName = searchParams.get('groom');

  useEffect(() => {
    if (brideName || groomName) {
      const timer = setTimeout(() => setShowWelcome(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [brideName, groomName]);

  const quickViewAlbums = quickViewStyle?.albums || [];

  const handleSaveStyle = async (state: EditorState) => {
    setIsSaving(true);
    try {
      await addStyle(state);
      setIsEditorOpen(false);
    } catch (error: any) {
      console.error("Error saving style:", error);
      alert(`Có lỗi xảy ra khi lưu phong cách: ${error.message || "Lỗi đường truyền hoặc kích thước ảnh quá lớn"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(styles, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `h2o_studio_backup_${new Date().toLocaleDateString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };



  return (
    <Layout 
      onChat={() => {
        setConsultInitialMessage(`Chào H2O STUDIO, mình đang tìm hiểu về các concept ảnh cưới của Studio.\nLink: ${window.location.href}\nTư vấn giúp mình nhé!`);
        setIsConsultModalOpen(true);
      }} 
      showBottomBar
    >
      <Helmet>
        <title>H2O STUDIO - Ảnh Cưới Concept</title>
        <meta name="description" content="Khám phá và lựa chọn concept hoàn hảo cho ngày trọng đại của bạn tại H2O STUDIO." />
        <meta property="og:title" content="H2O STUDIO - Ảnh Cưới Concept" />
        <meta property="og:description" content="Khám phá và lựa chọn concept hoàn hảo cho ngày trọng đại của bạn tại H2O STUDIO." />
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Personalized Welcome Banner */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className="fixed top-20 left-4 right-4 z-[60] sm:left-auto sm:right-8 sm:w-80"
            >
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-primary/20 p-5 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary" />
                <button 
                  onClick={() => setShowWelcome(false)}
                  className="absolute top-2 right-2 p-1 text-dark/20 hover:text-dark/60 transition-colors"
                >
                  <X size={16} />
                </button>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Sparkles className="text-primary" size={24} />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-dark text-base sm:text-lg leading-tight">
                      Chào mừng {brideName}{groomName ? ` & ${groomName}` : ''}!
                    </h4>
                    <p className="text-xs text-dark/60 mt-1">
                      H2O Studio rất vinh dự được đồng hành cùng bạn. Hãy thả tim những concept bạn yêu thích nhé!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Management Tools */}
        {isSuperAdmin && (
          <div className="flex justify-end gap-3 mb-4">
            <button 
              onClick={() => (window as any).forceSeed?.()} 
              className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-700 transition-colors mr-auto"
              title="Nhấn để nạp lại dữ liệu mẫu nếu Database trống"
            >
              NẠP DỮ LIỆU
            </button>
            <button onClick={exportData} className="text-[10px] uppercase tracking-widest font-bold text-dark/40 hover:text-primary transition-colors">
              Sao lưu (Tải về)
            </button>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h2 className="text-2xl xs:text-3xl sm:text-4xl font-bold leading-tight mb-4">
            <span className="bg-gradient-to-r from-[#ff4d8c] to-[#d926a9] bg-clip-text text-transparent">WEDDING</span> <br />
            <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent italic font-serif">Ảnh Cưới Concept</span>
          </h2>
          <p className="text-dark/60 text-sm max-w-xs mx-auto mb-8">
            Khám phá và lựa chọn concept hoàn hảo cho ngày trọng đại của bạn.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {styles.map((style, index) => (
            <StyleCard 
              key={style.id} 
              style={style} 
              index={index} 
              onQuickView={(s) => setQuickViewStyle(s)}
            />
          ))}
          {isAdmin && <AddPlaceholder label="Thêm Style" onClick={() => setIsEditorOpen(true)} />}
        </div>

        <ImageEditorModal 
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveStyle}
          title="Thiết kế Style mới"
          isSaving={isSaving}
        />

        <ConsultationModal 
          isOpen={isConsultModalOpen}
          onClose={() => setIsConsultModalOpen(false)}
          initialMessage={consultInitialMessage}
        />

        <QuickViewModal 
          style={quickViewStyle}
          albums={quickViewAlbums}
          onClose={() => setQuickViewStyle(null)}
        />

        <PromoMarquee />
      </div>
    </Layout>
  );
};

export default Home;
