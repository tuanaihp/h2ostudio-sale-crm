import React, { useState } from 'react';
import { motion } from 'motion/react';
import { getDisplayImageUrl } from '../utils/image';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  className = '',
  containerClassName = '',
  alt = 'Image',
  src,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const displaySrc = getDisplayImageUrl(src);

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${containerClassName}`}>
      {!isLoaded && (
        <div className="absolute inset-0 skeleton-shimmer" />
      )}
      <motion.img
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        alt={alt}
        src={displaySrc}
        {...props}
      />
    </div>
  );
};
