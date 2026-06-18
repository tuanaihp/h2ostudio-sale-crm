import React from 'react';
import { EditorState } from '../types';
import { getDisplayImageUrl } from '../utils/image';

interface DesignPreviewProps {
  design: EditorState;
  className?: string;
  fallbackImage?: string;
}

export const DesignPreview: React.FC<DesignPreviewProps> = ({ design, className = "", fallbackImage }) => {
  const bgImage = design?.mainImage || fallbackImage;

  if (!design) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Main Image */}
      {bgImage && (
        <img
          src={getDisplayImageUrl(bgImage)}
          alt=""
          aria-hidden="true"
          className="absolute w-full h-full object-cover"
          style={{
            transform: design.mainImage && design.mainImagePos ? `translate(${design.mainImagePos.x}%, ${design.mainImagePos.y}%) scale(${design.mainImagePos.scale})` : 'none',
          }}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Text Overlay */}
      <div 
        className="absolute pointer-events-none w-[80%]"
        style={{
          left: `${design.textPos?.x ?? 50}%`,
          top: `${design.textPos?.y ?? 80}%`,
          transform: 'translate(-50%, -50%)',
          color: design.textColor || '#FFFFFF',
          fontFamily: design.textFont || 'Inter',
          textAlign: 'center',
        }}
      >
        <h4 className="text-[min(4vw,1.5rem)] font-bold drop-shadow-lg leading-tight">
          {design.text}
        </h4>
      </div>

      {/* Logo 1 */}
      {design.logo1 && design.logo1Pos && (
        <img
          src={getDisplayImageUrl(design.logo1)}
          alt=""
          aria-hidden="true"
          className="absolute"
          style={{
            left: `${design.logo1Pos.x}%`,
            top: `${design.logo1Pos.y}%`,
            width: `${design.logo1Pos.scale * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Logo 2 */}
      {design.logo2 && design.logo2Pos && (
        <img
          src={getDisplayImageUrl(design.logo2)}
          alt=""
          aria-hidden="true"
          className="absolute"
          style={{
            left: `${design.logo2Pos.x}%`,
            top: `${design.logo2Pos.y}%`,
            width: `${design.logo2Pos.scale * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
};
