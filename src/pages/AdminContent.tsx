import React, { useState, useRef, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  LogOut,
  Layers,
  BookOpen,
  Users,
  Settings,
  ArrowUp,
  ArrowDown,
  Loader2,
  X,
} from 'lucide-react';
import { ImageEditorModal } from '../components/ImageEditorModal';
import { EditableText } from '../components/EditableText';
import { compressImage, uploadImageToStorage, getDisplayImageUrl } from '../utils/image';
import { EditorState, Style, Album } from '../types';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const CoverThumb: React.FC<{ src: string; alt?: string; onClick?: () => void; actionLabel?: string }> = ({
  src,
  alt = '',
  onClick,
  actionLabel = 'Đổi ảnh bìa',
}) => {
  const url = getDisplayImageUrl(src);
  return (
    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 group">
      {url ? (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300">
          <ImageIcon size={24} />
        </div>
      )}
      {onClick && (
        <button
          onClick={onClick}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-medium"
          title={actionLabel}
        >
          <RefreshCw size={14} />
          <span className="text-[10px]">Đổi bìa</span>
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────

const ConfirmDeleteModal: React.FC<{
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận xoá</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Xoá
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Photo Grid (inside expanded album)
// ─────────────────────────────────────────────

interface PhotoGridProps {
  styleSlug: string;
  albumSlug: string;
  photos: import('../types').Photo[];
  onDeletePhoto: (photoId: string) => void;
  onReplacePhoto: (photoId: string, file: File) => void;
  onMovePhoto: (photoId: string, dir: 'prev' | 'next') => void;
  replacingId: string | null;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onDeletePhoto,
  onReplacePhoto,
  onMovePhoto,
  replacingId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingReplace, setPendingReplace] = useState<string | null>(null);

  const handleReplaceClick = (photoId: string) => {
    setPendingReplace(photoId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingReplace) {
      onReplacePhoto(pendingReplace, file);
    }
    e.target.value = '';
    setPendingReplace(null);
  };

  if (photos.length === 0) {
    return (
      <p className="text-gray-400 text-sm italic py-4 text-center">
        Chưa có ảnh nào trong album này.
      </p>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((photo, idx) => {
          const url = getDisplayImageUrl(photo.image);
          const isReplacing = replacingId === photo.id;
          return (
            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
              {url && <img src={url} alt={photo.alt} className="w-full h-full object-cover" />}
              {isReplacing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 size={20} className="text-white animate-spin" />
                </div>
              )}
              {/* Hover overlay */}
              {!isReplacing && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  <button
                    onClick={() => handleReplaceClick(photo.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-medium transition-colors w-full justify-center"
                    title="Thay ảnh"
                  >
                    <RefreshCw size={12} />
                    Thay ảnh
                  </button>
                  <button
                    onClick={() => onDeletePhoto(photo.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-red-500/80 hover:bg-red-500 rounded-lg text-white text-xs font-medium transition-colors w-full justify-center"
                    title="Xoá ảnh"
                  >
                    <Trash2 size={12} />
                    Xoá
                  </button>
                  <div className="flex gap-1 w-full">
                    <button
                      onClick={() => onMovePhoto(photo.id, 'prev')}
                      disabled={idx === 0}
                      className="flex-1 flex items-center justify-center py-1 bg-white/20 hover:bg-white/30 disabled:opacity-30 rounded-lg transition-colors"
                      title="Di chuyển lên trước"
                    >
                      <ArrowUp size={12} className="text-white" />
                    </button>
                    <button
                      onClick={() => onMovePhoto(photo.id, 'next')}
                      disabled={idx === photos.length - 1}
                      className="flex-1 flex items-center justify-center py-1 bg-white/20 hover:bg-white/30 disabled:opacity-30 rounded-lg transition-colors"
                      title="Di chuyển ra sau"
                    >
                      <ArrowDown size={12} className="text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────
// Album Row (inside expanded style)
// ─────────────────────────────────────────────

interface AlbumRowProps {
  style: Style;
  album: Album;
  albumIndex: number;
  albumCount: number;
}

const AlbumRow: React.FC<AlbumRowProps> = ({ style, album, albumIndex, albumCount }) => {
  const {
    deleteAlbum,
    updateAlbumText,
    updateAlbumCover,
    moveAlbum,
    fetchPhotos,
    deletePhoto,
    movePhoto,
  } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [replacingPhotoId, setReplacingPhotoId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);

  const handleToggle = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !photosLoaded) {
      await fetchPhotos(style.id, album.id);
      setPhotosLoaded(true);
    }
  }, [expanded, photosLoaded, fetchPhotos, style.id, album.id]);

  const handleSaveCover = async (editorState: EditorState) => {
    if (!editorState.mainImage) return;
    setIsSavingCover(true);
    try {
      const url = await uploadImageToStorage(
        editorState.mainImage,
        `albums/${style.slug}/${album.slug}/cover_${Date.now()}.jpg`,
        style.title
      );
      await updateAlbumCover(style.slug, album.slug, url);
    } finally {
      setIsSavingCover(false);
      setCoverModalOpen(false);
    }
  };

  const handleUploadPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Photo upload is handled by parent via addPhoto — direct upload here
  };

  const handleReplacePhoto = async (photoId: string, file: File) => {
    setReplacingPhotoId(photoId);
    try {
      const base64 = await compressImage(file, 2048, 2048, 0.85);
      const url = await uploadImageToStorage(
        base64,
        `albums/${style.slug}/${album.slug}/photo_${Date.now()}.jpg`,
        style.title
      );
      // updatePhoto is available in context
      const { updatePhoto } = useAppRef.current!;
      await updatePhoto(style.slug, album.slug, photoId, url);
    } finally {
      setReplacingPhotoId(null);
    }
  };

  // We need updatePhoto from context — let's use a ref trick via closure
  const appCtx = useApp();
  const useAppRef = useRef(appCtx);
  useAppRef.current = appCtx;

  const photos = album.photos?.filter((p) => !p.deleted) ?? [];

  return (
    <>
      <ImageEditorModal
        isOpen={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        onSave={handleSaveCover}
        isSaving={isSavingCover}
        title={`Đổi ảnh bìa album: ${album.title}`}
      />
      <ConfirmDeleteModal
        isOpen={deleteConfirm}
        message={`Bạn có chắc muốn xoá album "${album.title}"? Album sẽ vào thùng rác.`}
        onConfirm={() => { deleteAlbum(style.slug, album.id); setDeleteConfirm(false); }}
        onCancel={() => setDeleteConfirm(false)}
      />

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        {/* Album header row */}
        <div
          className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          onClick={handleToggle}
        >
          {/* Cover thumb */}
          <div onClick={(e) => e.stopPropagation()}>
            <CoverThumb
              src={album.coverImage}
              alt={album.title}
              onClick={() => setCoverModalOpen(true)}
            />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <EditableText
              value={album.title}
              onSave={(v) => updateAlbumText(style.slug, album.slug, 'title', v)}
              titleClassName="font-medium text-gray-800 text-sm truncate"
              editButtonClassName="text-gray-400 hover:text-gray-700"
            />
            <p className="text-xs text-gray-400 mt-0.5">{photos.length} ảnh</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => moveAlbum(style.id, album.id, 'prev')}
              disabled={albumIndex === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition-colors"
              title="Lên trên"
            >
              <ArrowUp size={14} />
            </button>
            <button
              onClick={() => moveAlbum(style.id, album.id, 'next')}
              disabled={albumIndex === albumCount - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition-colors"
              title="Xuống dưới"
            >
              <ArrowDown size={14} />
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Xoá album"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Expand chevron */}
          <div className="text-gray-400 ml-1">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>

        {/* Expanded: photo grid */}
        {expanded && (
          <div className="p-4 border-t border-gray-100 bg-white">
            {/* Upload button */}
            <AlbumPhotoUploader styleSlug={style.slug} albumSlug={album.slug} styleTitle={style.title} />
            <div className="mt-4">
              <PhotoGrid
                styleSlug={style.slug}
                albumSlug={album.slug}
                photos={photos}
                onDeletePhoto={(photoId) => deletePhoto(style.slug, album.slug, photoId)}
                onReplacePhoto={handleReplacePhoto}
                onMovePhoto={(photoId, dir) => movePhoto(style.id, album.id, photoId, dir)}
                replacingId={replacingPhotoId}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────
// Photo uploader (add new photos to an album)
// ─────────────────────────────────────────────

const AlbumPhotoUploader: React.FC<{
  styleSlug: string;
  albumSlug: string;
  styleTitle: string;
}> = ({ styleSlug, albumSlug, styleTitle }) => {
  const { addPhoto } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files: File[] = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    for (let i = 0; i < files.length; i++) {
      try {
        const base64 = await compressImage(files[i], 2048, 2048, 0.85);
        const editorState: EditorState = {
          mainImage: base64,
          mainImagePos: { x: 0, y: 0, scale: 1 },
          text: '',
          textFont: 'Inter',
          textColor: '#FFFFFF',
          textPos: { x: 50, y: 80 },
          logo1: null,
          logo1Pos: { x: 10, y: 10, scale: 0.2 },
          logo2: null,
          logo2Pos: { x: 80, y: 10, scale: 0.15 },
        };
        await addPhoto(styleSlug, albumSlug, editorState);
        setProgress({ done: i + 1, total: files.length });
      } catch (err) {
        console.error('Upload photo error:', err);
      }
    }
    setUploading(false);
    setProgress(null);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading && progress ? `Đang tải ${progress.done}/${progress.total}...` : 'Thêm ảnh'}
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// Style Row (top-level accordion)
// ─────────────────────────────────────────────

interface StyleRowProps {
  style: Style;
  styleIndex: number;
  styleCount: number;
  onAddAlbum: (styleId: string, styleSlug: string, styleTitle: string) => void;
}

const StyleRow: React.FC<StyleRowProps> = ({ style, styleIndex, styleCount, onAddAlbum }) => {
  const {
    deleteStyle,
    updateStyleText,
    updateStyleCover,
    moveStyle,
    fetchAlbums,
  } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [albumsLoaded, setAlbumsLoaded] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleToggle = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !albumsLoaded) {
      await fetchAlbums(style.id);
      setAlbumsLoaded(true);
    }
  }, [expanded, albumsLoaded, fetchAlbums, style.id]);

  const handleSaveCover = async (editorState: EditorState) => {
    if (!editorState.mainImage) return;
    setIsSavingCover(true);
    try {
      const url = await uploadImageToStorage(
        editorState.mainImage,
        `styles/${style.slug}/cover_${Date.now()}.jpg`,
        style.title
      );
      await updateStyleCover(style.id, url);
    } finally {
      setIsSavingCover(false);
      setCoverModalOpen(false);
    }
  };

  const albums = (style.albums ?? []).filter((a) => !a.deleted);

  return (
    <>
      <ImageEditorModal
        isOpen={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        onSave={handleSaveCover}
        isSaving={isSavingCover}
        title={`Đổi ảnh bìa phong cách: ${style.title}`}
      />
      <ConfirmDeleteModal
        isOpen={deleteConfirm}
        message={`Bạn có chắc muốn xoá phong cách "${style.title}"? Phong cách và toàn bộ album sẽ vào thùng rác.`}
        onConfirm={() => { deleteStyle(style.id); setDeleteConfirm(false); }}
        onCancel={() => setDeleteConfirm(false)}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Style header */}
        <div
          className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={handleToggle}
        >
          {/* Cover */}
          <div onClick={(e) => e.stopPropagation()}>
            <CoverThumb
              src={style.coverImage}
              alt={style.title}
              onClick={() => setCoverModalOpen(true)}
            />
          </div>

          {/* Title & meta */}
          <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <EditableText
              value={style.title}
              onSave={(v) => updateStyleText(style.slug, 'title', v)}
              titleClassName="font-semibold text-gray-900 truncate"
              editButtonClassName="text-gray-400 hover:text-gray-700"
            />
            <p className="text-xs text-gray-400 mt-0.5">{albums.length} album</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => moveStyle(style.id, 'prev')}
              disabled={styleIndex === 0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Lên trên"
            >
              <ArrowUp size={16} />
            </button>
            <button
              onClick={() => moveStyle(style.id, 'next')}
              disabled={styleIndex === styleCount - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Xuống dưới"
            >
              <ArrowDown size={16} />
            </button>
            <button
              onClick={() => onAddAlbum(style.id, style.slug, style.title)}
              className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
              title="Thêm album"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Xoá phong cách"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Chevron */}
          <div className="text-gray-400 ml-1">
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        </div>

        {/* Albums list */}
        {expanded && (
          <div className="border-t border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">
            {albums.length === 0 ? (
              <p className="text-gray-400 text-sm italic text-center py-2">
                Chưa có album nào. Nhấn + để thêm album mới.
              </p>
            ) : (
              albums.map((album, idx) => (
                <AlbumRow
                  key={album.id}
                  style={style}
                  album={album}
                  albumIndex={idx}
                  albumCount={albums.length}
                />
              ))
            )}
            {/* Add album shortcut at bottom */}
            <button
              onClick={() => onAddAlbum(style.id, style.slug, style.title)}
              className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors text-sm font-medium justify-center"
            >
              <Plus size={16} />
              Thêm album mới
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ─────────────────────────────────────────────
// Main AdminContent page
// ─────────────────────────────────────────────

const AdminContent: React.FC = () => {
  const {
    styles,
    isAdmin,
    isAuthReady,
    handleLogout,
    addStyle,
    addAlbum,
  } = useApp();

  // Modal state for adding a style
  const [addStyleModalOpen, setAddStyleModalOpen] = useState(false);
  const [isSavingStyle, setIsSavingStyle] = useState(false);

  // Modal state for adding an album
  const [addAlbumTarget, setAddAlbumTarget] = useState<{
    styleId: string;
    styleSlug: string;
    styleTitle: string;
  } | null>(null);
  const [isSavingAlbum, setIsSavingAlbum] = useState(false);

  // ── Auth guard ──
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-gray-500 font-medium animate-pulse">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" />;
  }

  // ── Handlers ──
  const handleSaveStyle = async (editorState: EditorState) => {
    setIsSavingStyle(true);
    try {
      await addStyle(editorState);
    } finally {
      setIsSavingStyle(false);
      setAddStyleModalOpen(false);
    }
  };

  const handleSaveAlbum = async (editorState: EditorState) => {
    if (!addAlbumTarget) return;
    setIsSavingAlbum(true);
    try {
      await addAlbum(addAlbumTarget.styleSlug, editorState);
    } finally {
      setIsSavingAlbum(false);
      setAddAlbumTarget(null);
    }
  };

  const activeStyles = styles.filter((s) => !s.deleted);

  const navLinks = [
    { to: '/admin/consultations', label: 'Khách hàng', icon: <Users size={16} /> },
    { to: '/admin/content', label: 'Nội dung', icon: <Layers size={16} />, active: true },
    { to: '/admin/settings', label: 'Cài đặt', icon: <Settings size={16} /> },
    { to: '/admin/trash', label: 'Thùng rác', icon: <Trash2 size={16} /> },
  ];

  return (
    <>
      {/* Add Style Modal */}
      <ImageEditorModal
        isOpen={addStyleModalOpen}
        onClose={() => setAddStyleModalOpen(false)}
        onSave={handleSaveStyle}
        isSaving={isSavingStyle}
        title="Thêm phong cách mới"
      />

      {/* Add Album Modal */}
      <ImageEditorModal
        isOpen={!!addAlbumTarget}
        onClose={() => setAddAlbumTarget(null)}
        onSave={handleSaveAlbum}
        isSaving={isSavingAlbum}
        title={addAlbumTarget ? `Thêm album vào: ${addAlbumTarget.styleTitle}` : 'Thêm album'}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Sticky Header / Nav */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              {/* Brand */}
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-primary" />
                <span className="font-bold text-gray-900 text-sm">H2O Studio Admin</span>
              </div>

              {/* Nav links */}
              <nav className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      link.active
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {link.icon}
                    <span className="hidden sm:inline">{link.label}</span>
                  </Link>
                ))}
              </nav>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-100"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* Page title + Add Style button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý nội dung</h1>
              <p className="text-gray-500 text-sm mt-1">
                {activeStyles.length} phong cách · Quản lý album &amp; ảnh
              </p>
            </div>
            <button
              onClick={() => setAddStyleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Thêm phong cách
            </button>
          </div>

          {/* Styles accordion list */}
          {activeStyles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Layers size={48} className="text-gray-200" />
              <p className="text-gray-400 text-lg font-medium">Chưa có phong cách nào</p>
              <button
                onClick={() => setAddStyleModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus size={16} />
                Thêm phong cách đầu tiên
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeStyles.map((style, idx) => (
                <StyleRow
                  key={style.id}
                  style={style}
                  styleIndex={idx}
                  styleCount={activeStyles.length}
                  onAddAlbum={(styleId, styleSlug, styleTitle) =>
                    setAddAlbumTarget({ styleId, styleSlug, styleTitle })
                  }
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default AdminContent;
