import React, { useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, MessageCircle, Share2, LogOut, User as UserIcon, Loader2, Heart, Home, Settings as SettingsIcon, Trash2, Bell } from 'lucide-react';
import { APP_CONFIG } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { getDisplayImageUrl } from '../utils/image';
import { LiveChatWidget } from './LiveChatWidget';
import { LuckyWheelWidget } from './LuckyWheelWidget';
import { PromoBanner } from './PromoBanner';

import { PartnerBrandsIcons } from './PartnerBrandsIcons';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onShare?: () => void;
  onChat?: () => void;
  showBottomBar?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title, 
  showBack = false, 
  onShare, 
  onChat,
  showBottomBar = false 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, handleLogout, isAuthReady, isAdmin, isSuperAdmin, favorites, settings, unreadCount } = useApp();

  // Cổng bí mật: bấm logo 5 lần nhanh → trang đăng nhập admin
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLogoTap = (e: React.MouseEvent) => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0; }, 2000);
    if (logoTapCount.current >= 5) {
      e.preventDefault();
      logoTapCount.current = 0;
      navigate('/admin/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-light-gray">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button 
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 hover:bg-light-gray rounded-full transition-colors"
                title="Quay lại"
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <Link
              to="/"
              onClick={handleLogoTap}
              className="text-base xs:text-lg sm:text-2xl font-serif font-bold tracking-tighter bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent whitespace-nowrap select-none"
            >
              {APP_CONFIG.brandName}
            </Link>
            <div className="hidden sm:block ml-2">
              <PartnerBrandsIcons />
            </div>
          </div>
          
          {title && (
            <h1 className="absolute left-1/2 -translate-x-1/2 text-[10px] xs:text-xs sm:text-sm font-semibold uppercase tracking-widest bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent truncate max-w-[200px] sm:max-w-[400px]">
              {title}
            </h1>
          )}

          <div className="flex items-center gap-3">
            <Link to="/favorites" className="relative p-2 text-dark/70 hover:text-dark transition-colors mr-2 hidden sm:block">
              <Heart size={20} className={favorites.length > 0 ? "text-red-500 fill-red-500" : ""} />
              {favorites.length > 0 && (
                <>
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">
                    {favorites.length}
                  </span>
                  {/* Coach Mark for Favorites */}
                  {location.pathname !== '/favorites' && (
                    <div className="absolute top-full mt-2 right-0 bg-white text-dark text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap pointer-events-none animate-bounce border border-primary/20">
                      Album yêu thích của bạn!
                      <div className="absolute bottom-full right-3 border-8 border-transparent border-b-white" />
                    </div>
                  )}
                  {location.pathname !== '/favorites' && (
                    <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20 pointer-events-none" />
                  )}
                </>
              )}
            </Link>
            {!isAuthReady ? (
              <Loader2 size={20} className="animate-spin text-primary" />
            ) : (
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <div className="hidden sm:block text-right">
                      <p className="text-[10px] font-bold text-dark/40 uppercase tracking-widest leading-none">
                        {isAdmin ? 'Admin' : 'Khách'}
                      </p>
                      <p className="text-xs font-medium text-dark truncate max-w-[100px]">{user.user_metadata?.full_name || user.email}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Link
                          to="/admin/consultations"
                          className="relative p-2 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors text-primary flex items-center gap-2 px-3"
                          title="Quản lý khách hàng"
                        >
                          <UserIcon size={18} />
                          <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Quản lý</span>
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse z-10">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </Link>
                        {isSuperAdmin && (
                          <Link 
                            to="/admin/settings" 
                            className="p-2 hover:bg-light-gray rounded-full transition-colors text-dark/70"
                            title="Cấu hình hệ thống"
                          >
                            <SettingsIcon size={20} />
                          </Link>
                        )}
                        <Link 
                          to="/admin/trash" 
                          className="p-2 hover:bg-light-gray rounded-full transition-colors text-dark/70"
                          title="Thùng rác"
                        >
                          <Trash2 size={20} />
                        </Link>
                      </div>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleLogout();
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100"
                        title="Đăng xuất"
                      >
                        <LogOut size={16} />
                        <span>Đăng xuất</span>
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </header>

      <PromoBanner />

      {/* Main Content */}
      <main className={`flex-1 ${showBottomBar ? 'pb-24' : 'pb-12'}`}>
        {children}
      </main>

      <LiveChatWidget />
      <LuckyWheelWidget />

      {/* Footer */}
      <footer className="bg-light-gray py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent mb-2 inline-block">{APP_CONFIG.brandName}</h2>
          <p className="text-sm text-dark/60 mb-6 max-w-xs mx-auto">
            {APP_CONFIG.description}
          </p>
          <div className="flex justify-center gap-6 mb-8">
            <a href={APP_CONFIG.facebookMessengerUrl} target="_blank" rel="noopener noreferrer" className="text-dark hover:text-primary transition-colors">Facebook</a>
            <a href={APP_CONFIG.zaloUrl} target="_blank" rel="noopener noreferrer" className="text-dark hover:text-primary transition-colors">Zalo</a>
            <a href={`tel:${APP_CONFIG.hotline}`} className="text-dark hover:text-primary transition-colors">Hotline</a>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-dark/40">
            © 2016 {APP_CONFIG.brandName}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Bottom Action Bar (Mobile Sticky) */}
      {showBottomBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-lg border-t border-light-gray sm:hidden">
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <Link 
              to="/favorites"
              className="flex flex-col items-center justify-center bg-white border border-light-gray rounded-[1rem] h-12 w-14 relative shrink-0"
            >
              <Heart size={18} className={favorites.length > 0 ? "text-red-500 fill-red-500" : "text-dark/70"} />
              {favorites.length > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">
                    {favorites.length}
                  </span>
                  {/* Coach Mark for Favorites Mobile */}
                  {location.pathname !== '/favorites' && (
                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white text-dark text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap pointer-events-none animate-bounce border border-primary/20">
                      Album yêu thích của bạn!
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
                    </div>
                  )}
                  {location.pathname !== '/favorites' && (
                    <span className="absolute inset-0 rounded-[1rem] bg-primary animate-ping opacity-20 pointer-events-none" />
                  )}
                </>
              )}
            </Link>
            
            <button 
              onClick={onShare}
              className="flex flex-col items-center justify-center bg-white border border-light-gray rounded-[1rem] h-12 w-14 shrink-0"
            >
              <Share2 size={18} className="text-dark/70" />
            </button>

            {/* Partner Brands or Default Chat */}
            <div className="flex-1 flex gap-2 h-12 justify-end">
              <PartnerBrandsIcons />
              {settings.showPartnerBrands === false && (
                <button 
                  onClick={onChat}
                  className="flex-1 btn-primary h-12 rounded-[1rem] w-full"
                >
                  <MessageCircle size={18} />
                  <span className="text-sm">Tư vấn ngay</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
