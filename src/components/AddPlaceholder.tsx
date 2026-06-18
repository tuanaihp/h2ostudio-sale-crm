import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface AddPlaceholderProps {
  label: string;
  onClick?: () => void;
  aspectRatio?: string;
}

export const AddPlaceholder: React.FC<AddPlaceholderProps> = ({ 
  label, 
  onClick, 
  aspectRatio = "aspect-[3/4]" 
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`group flex flex-col items-center justify-center border-2 border-dashed border-light-gray rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all w-full ${aspectRatio}`}
    >
      <div className="w-12 h-12 rounded-full bg-light-gray flex items-center justify-center text-dark/40 group-hover:bg-primary group-hover:text-white transition-all mb-3">
        <Plus size={24} />
      </div>
      <span className="text-xs font-bold text-dark/40 group-hover:text-primary transition-colors uppercase tracking-widest">
        {label}
      </span>
    </motion.button>
  );
};
