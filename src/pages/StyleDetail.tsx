import React, { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AlbumCard } from '../components/AlbumCard';
import { AddPlaceholder } from '../components/AddPlaceholder';
import { ImageEditorModal } from '../components/ImageEditorModal';
import { ConsultationModal } from '../components/ConsultationModal';
import { EditableText } from '../components/EditableText';
import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import { EditorState } from '../types';
import { useApp } from '../context/AppContext';
import { parseLikes } from '../utils/likes';

const StyleDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { styles, setStyles, addAlbum, updateStyleText, isAdmin, fetchAlbums, isDataLoaded } = useApp();
  const style = React.useMemo(() => styles.find(s => s.slug === slug), [styles, slug]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const [hasRequestedAlbums, setHasRequestedAlbums] = useState(false);
  const [isFetchingAlbums, setIsFetchingAlbums] = useState(false);

  React.useEffect(() => {
    setHasRequestedAlbums(false);
  }, [slug]);

  // Track style đã xem vào localStorage (để gửi kèm khi khách đăng ký tư vấn)
  React.useEffect(() => {
    if (!style || isAdmin) return;
    try {
      const KEY = 'h2o_viewed_styles';
      const existing: { id: string; title: string; count: number }[] = JSON.parse(localStorage.getItem(KEY) || '[]');
      const idx = existing.findIndex(v => v.id === style.id);
      if (idx >= 0) { existing[idx].count = (existing[idx].count || 1) + 1; }
      else { existing.push({ id: style.id, title: style.title, count: 1 }); }
      localStorage.setItem(KEY, JSON.stringify(existing.slice(-8)));
    } catch {}
  }, [style?.id, isAdmin]);

  React.useEffect(() => {
    if (style && (!style.albums || style.albums.length === 0) && !hasRequestedAlbums) {
      setHasRequestedAlbums(true);
      setIsFetchingAlbums(true);
      fetchAlbums(style.id).finally(() => setIsFetchingAlbums(false));
    }
  }, [style?.id, style?.albums, hasRequestedAlbums]);

  const sortedAlbums = React.useMemo(() => {
    if (!style?.albums) return [];
    if (isAdmin) return style.albums; // Maintain standard order for admin drag-and-drop
    return [...style.albums].sort((a, b) => {
      const likesA = parseLikes(a.displayLikes, a.id);
      const likesB = parseLikes(b.displayLikes, b.id);
      return likesB - likesA;
    });
  }, [style?.albums, isAdmin]);

  // If we found the style but haven't found the albums yet, check if we are still loading albums
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

  if (!style) return <Navigate to="/" />;

  const handleSaveAlbum = async (state: EditorState) => {
    if (slug) {
      try {
        await addAlbum(slug, state);
        setIsEditorOpen(false);
      } catch (error) {
        console.error("Error saving album:", error);
        alert("Có lỗi xảy ra khi lưu album. Kích thước ảnh có thể quá lớn, vui lòng thử lại ảnh khác.");
      }
    }
  };

  return (
    <Layout 
      title={style.title} 
      showBack 
      onChat={() => {
        const message = `Chào H2O STUDIO, mình đang xem bộ sưu tập "${style.title}" rât đẹp và cần được tư vấn kỹ hơn.\nLink: ${window.location.href}\nTư vấn cho mình nhé!`;
        setInitialMessage(message);
        setIsConsultModalOpen(true);
      }}
      showBottomBar
    >
      <Helmet>
        <title>{`${style.title || ''} - H2O STUDIO`}</title>
        <meta name="description" content={style.description || ''} />
        <meta property="og:title" content={`${style.title || ''} - H2O STUDIO`} />
        <meta property="og:description" content={style.description || ''} />
        <meta property="og:image" content={style.coverImage || ''} />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="mb-8">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent mb-1"
          >
            <EditableText 
              value={style.title} 
              onSave={(val) => slug && updateStyleText(slug, 'title', val)} 
              disabled={!isAdmin}
            />
          </motion.h2>
          <div className="text-dark/60 text-sm">
            <EditableText 
              value={style.description || ""} 
              onSave={(val) => slug && updateStyleText(slug, 'description', val)} 
              multiline
              className="w-full max-w-md"
              disabled={!isAdmin}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {sortedAlbums.map((album, index) => (
            <AlbumCard
              key={album.id}
              album={album}
              styleSlug={style.slug}
              styleId={style.id}
              index={index}
              totalAlbums={sortedAlbums.length}
            />
          ))}
          {isAdmin && <AddPlaceholder label="Thêm Album" onClick={() => setIsEditorOpen(true)} aspectRatio="aspect-[4/5]" />}
        </div>

        <ImageEditorModal 
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveAlbum}
          title="Thiết kế Album mới"
        />
        <ConsultationModal 
          isOpen={isConsultModalOpen}
          onClose={() => setIsConsultModalOpen(false)}
          initialMessage={initialMessage}
        />
      </div>
    </Layout>
  );
};

export default StyleDetail;

