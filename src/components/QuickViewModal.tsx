import React from 'react';
import { Style, Album } from '../types';
import { X, ArrowRight, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OptimizedImage } from './OptimizedImage';
import { Link } from 'react-router-dom';

interface QuickViewModalProps {
  style: Style | null;
  albums: Album[];
  onClose: () => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ style, albums, onClose }) => {
  if (!style) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="relative w-full max-w-2xl bg-white rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h3 className="text-lg sm:text-xl font-black bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
                {style.title}
              </h3>
              <p className="text-xs text-dark/60 font-medium uppercase tracking-wider mt-1">
                Xem nhanh các Album nổi bật
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-light-gray rounded-full text-dark/40 hover:text-dark transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-6">
              {albums.length > 0 ? (
                albums.map((album, idx) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link 
                      to={`/album/${album.slug}`}
                      onClick={onClose}
                      className="flex gap-4 group"
                    >
                      <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                        <OptimizedImage 
                          src={album.coverImage} 
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1 py-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-dark group-hover:text-primary transition-colors line-clamp-1">
                            {album.title}
                          </h4>
                          <p className="text-xs text-dark/60 line-clamp-2 mt-1 leading-relaxed">
                            {album.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest">
                          <span>Xem chi tiết</span>
                          <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-light-gray rounded-full flex items-center justify-center mx-auto mb-4 text-dark/20">
                    <Camera size={32} />
                  </div>
                  <p className="text-dark/40 font-medium italic">Chưa có album nào trong phong cách này</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-light-gray/50 border-t border-gray-100">
            <Link
              to={`/style/${style.slug}`}
              onClick={onClose}
              className="w-full py-4 px-6 bg-gradient-to-r from-secondary to-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-primary/20"
            >
              <span className="text-center leading-snug">Xem tất cả Album {style.title}</span>
              <ArrowRight size={20} className="shrink-0" />
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
