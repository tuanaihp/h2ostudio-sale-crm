import React from 'react';
import { useApp } from '../context/AppContext';
import { getDisplayImageUrl } from '../utils/image';

interface PartnerBrandsIconsProps {
  className?: string;
}

export const PartnerBrandsIcons: React.FC<PartnerBrandsIconsProps> = ({ className = '' }) => {
  const { settings } = useApp();

  if (settings.showPartnerBrands === false) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes swapImg {
          0%, 45% { opacity: 1; transform: scale(1) translateY(0); }
          50%, 95% { opacity: 0; transform: scale(0.5) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes swapText {
          0%, 45% { opacity: 0; transform: scale(0.5) translateY(-10px); }
          50%, 95% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.5) translateY(-10px); }
        }
        .anim-swap-img { animation: swapImg 4s ease-in-out infinite; }
        .anim-swap-text { animation: swapText 4s ease-in-out infinite; }
        @keyframes heart3d {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
        }
        .anim-heart-3d { animation: heart3d 2s ease-in-out infinite; }
        .anim-delay-half { animation-delay: 2s; }
      `}} />

      {(!settings.partnerBrand1 || settings.partnerBrand1.name !== '') && (
        <div className="relative group shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-[1rem] shadow-lg overflow-hidden border border-[#ff4d8c]/20">
          <a 
            href={settings.partnerBrand1?.url || 'https://google.com'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="relative w-full h-full flex items-center justify-center will-change-transform bg-white"
            title={settings.partnerBrand1?.ctaText || "Tham khảo mẫu váy wedding mới nhất!"}
          >
            <img 
              src={getDisplayImageUrl(settings.partnerBrand1?.image) || 'https://images.unsplash.com/photo-1594552072238-18e59aa1c29e?w=200&h=200&fit=crop'} 
              alt={settings.partnerBrand1?.name || 'LAMARY BRIDAL'} 
              className="absolute inset-0 w-full h-full object-cover anim-swap-img"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#ff4d8c] to-[#d926a9] anim-swap-text">
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white anim-heart-3d mb-0.5">
                {/* Custom style heart imitating the shape in the user image, or a nice thick heart */}
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="text-white text-[7px] sm:text-[8px] font-bold leading-tight text-center drop-shadow-md px-1 tracking-tight">
                {settings.partnerBrand1?.ctaText || "Mẫu váy!"}
              </span>
            </div>
          </a>
        </div>
      )}
      
      {(!settings.partnerBrand2 || settings.partnerBrand2.name !== '') && (
        <div className="relative group shrink-0 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-[1rem] shadow-lg overflow-hidden border border-[#ff4d8c]/20">
          <a 
            href={settings.partnerBrand2?.url || 'https://google.com'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="relative w-full h-full flex items-center justify-center will-change-transform bg-white"
            title={settings.partnerBrand2?.ctaText || "Tham khảo layout makeup!"}
          >
            <img 
              src={getDisplayImageUrl(settings.partnerBrand2?.image) || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop'} 
              alt={settings.partnerBrand2?.name || 'THUYH2O MAKEUP'} 
              className="absolute inset-0 w-full h-full object-cover anim-swap-img anim-delay-half"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#ff4d8c] to-[#d926a9] anim-swap-text anim-delay-half">
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white anim-heart-3d mb-0.5">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span className="text-white text-[7px] sm:text-[8px] font-bold leading-tight text-center drop-shadow-md px-1 tracking-tight">
                {settings.partnerBrand2?.ctaText || "Makeup!"}
              </span>
            </div>
          </a>
        </div>
      )}
    </div>
  );
};
