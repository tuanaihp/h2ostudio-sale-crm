import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ScrollToTop } from './components/ScrollToTop';
import { AppProvider } from './context/AppContext';
import { PhoneGate } from './components/PhoneGate';

const Home = lazy(() => import('./pages/Home'));
const StyleDetail = lazy(() => import('./pages/StyleDetail'));
const AlbumDetail = lazy(() => import('./pages/AlbumDetail'));
const PhotoView = lazy(() => import('./pages/PhotoView'));
const Favorites = lazy(() => import('./pages/Favorites').then(m => ({ default: m.Favorites })));
const AdminConsultations = lazy(() => import('./pages/AdminConsultations'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminTrash = lazy(() => import('./pages/AdminTrash'));
const AdminContent = lazy(() => import('./pages/AdminContent'));
const AiChatBubble = lazy(() => import('./components/AiChatBubble').then(m => ({ default: m.AiChatBubble })));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function AppContent() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/style/:slug" element={<StyleDetail />} />
          <Route path="/style/:slug/album/:albumSlug" element={
            <PhoneGate><AlbumDetail /></PhoneGate>
          } />
          <Route path="/style/:slug/album/:albumSlug/photo/:photoId" element={
            <PhoneGate><PhotoView /></PhoneGate>
          } />
          <Route path="/favorites" element={
            <PhoneGate><Favorites /></PhoneGate>
          } />
          <Route path="/admin" element={<Navigate to="/admin/consultations" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/consultations" element={<AdminConsultations />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/trash" element={<AdminTrash />} />
          <Route path="/admin/content" element={<AdminContent />} />
        </Routes>
      </Suspense>
      {!isAdmin && (
        <Suspense fallback={null}>
          <AiChatBubble />
        </Suspense>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}
