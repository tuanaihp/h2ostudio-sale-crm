import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  titleClassName?: string;
  multiline?: boolean;
  disabled?: boolean;
  editButtonClassName?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({ value, onSave, className = '', titleClassName = '', multiline = false, disabled = false, editButtonClassName = 'text-dark/40 hover:text-primary' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    const safeValue = currentValue || '';
    if (safeValue.trim() !== (value || '')) {
      onSave(safeValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCurrentValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing && !disabled) {
    return (
      <div className={`relative flex items-center gap-2 ${className}`}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-full p-2 bg-white border border-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-dark min-h-[100px] resize-y"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-full p-2 bg-white border border-primary/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-dark"
          />
        )}
        <div className="flex flex-col gap-1 absolute -right-10 top-0">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }} className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
            <Check size={14} />
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancel(); }} className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative flex items-center ${className}`}>
      <span className={`block ${titleClassName}`}>{value}</span>
      {!disabled && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(true); }}
          className={`shrink-0 ml-1 p-1.5 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-sm pointer-events-auto ${editButtonClassName}`}
          title="Chỉnh sửa"
        >
          <Edit2 size={12} className="text-white" />
        </button>
      )}
    </div>
  );
};
