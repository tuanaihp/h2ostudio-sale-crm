import React, { useState, useRef } from 'react';
import { X, Upload, Move, Type, Image as ImageIcon, Sliders, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EditorState } from '../types';
import { compressImage, getDisplayImageUrl } from '../utils/image';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (state: EditorState) => void;
  title: string;
  isSaving?: boolean;
}

const INITIAL_STATE: EditorState = {
  mainImage: null,
  mainImagePos: { x: 0, y: 0, scale: 1 },
  text: "H2O STUDIO Concept",
  textFont: "Inter",
  textColor: "#FFFFFF",
  textPos: { x: 50, y: 80 },
  logo1: null,
  logo1Pos: { x: 10, y: 10, scale: 0.2 },
  logo2: null,
  logo2Pos: { x: 80, y: 10, scale: 0.15 },
};

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ 
  isOpen, onClose, onSave, title, isSaving = false 
}) => {
  const [state, setState] = useState<EditorState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'image' | 'text' | 'logo1' | 'logo2'>('image');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logo1InputRef = useRef<HTMLInputElement>(null);
  const logo2InputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'logo1' | 'logo2') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file);
        if (type === 'main') setState(prev => ({ ...prev, mainImage: base64 }));
        if (type === 'logo1') setState(prev => ({ ...prev, logo1: base64 }));
        if (type === 'logo2') setState(prev => ({ ...prev, logo2: base64 }));
      } catch (error) {
        console.error("Error compressing image:", error);
        alert("Có lỗi xảy ra khi tải ảnh lên. Kích thước ảnh có thể quá lớn, vui lòng thử lại ảnh khác.");
      }
    }
  };

  const fonts = ["Inter", "Playfair Display", "Montserrat", "Cormorant Garamond", "Courier New"];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full h-full sm:h-auto sm:max-w-5xl bg-white sm:rounded-3xl overflow-hidden flex flex-col sm:flex-row"
          >
            {/* Preview Area */}
            <div className="flex-1 bg-light-gray relative flex items-center justify-center p-4 overflow-hidden min-h-[300px]">
              <div className="relative aspect-[3/4] w-full max-w-[400px] bg-white shadow-2xl overflow-hidden rounded-lg">
                {/* Main Image */}
                {state.mainImage ? (
                  <img 
                    src={getDisplayImageUrl(state.mainImage)} 
                    className="absolute transition-transform duration-75"
                    style={{
                      transform: `translate(${state.mainImagePos.x}%, ${state.mainImagePos.y}%) scale(${state.mainImagePos.scale})`,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-dark/20">
                    <ImageIcon size={48} />
                    <p className="text-sm font-bold mt-2">Chưa có ảnh</p>
                  </div>
                )}

                {/* Text Overlay */}
                <div 
                  className="absolute pointer-events-none"
                  style={{
                    left: `${state.textPos.x}%`,
                    top: `${state.textPos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    color: state.textColor,
                    fontFamily: state.textFont,
                    textAlign: 'center',
                    width: '80%'
                  }}
                >
                  <h4 className="text-xl font-bold drop-shadow-md">{state.text}</h4>
                </div>

                {/* Logo 1 */}
                {state.logo1 && (
                  <img 
                    src={getDisplayImageUrl(state.logo1)} 
                    className="absolute"
                    style={{
                      left: `${state.logo1Pos.x}%`,
                      top: `${state.logo1Pos.y}%`,
                      width: `${state.logo1Pos.scale * 100}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Logo 2 */}
                {state.logo2 && (
                  <img 
                    src={getDisplayImageUrl(state.logo2)} 
                    className="absolute"
                    style={{
                      left: `${state.logo2Pos.x}%`,
                      top: `${state.logo2Pos.y}%`,
                      width: `${state.logo2Pos.scale * 100}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </div>

            {/* Controls Area */}
            <div className="w-full sm:w-[350px] bg-white border-l border-light-gray flex flex-col h-[50vh] sm:h-[80vh]">
              <div className="p-4 border-b border-light-gray flex justify-between items-center">
                <h3 className="font-bold text-lg bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">{title}</h3>
                <button onClick={onClose} className="p-2 hover:bg-light-gray rounded-full">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-light-gray">
                <button 
                  onClick={() => setActiveTab('image')}
                  className={`flex-1 py-3 flex justify-center ${activeTab === 'image' ? 'text-primary border-b-2 border-primary' : 'text-dark/40'}`}
                >
                  <ImageIcon size={20} />
                </button>
                <button 
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 py-3 flex justify-center ${activeTab === 'text' ? 'text-primary border-b-2 border-primary' : 'text-dark/40'}`}
                >
                  <Type size={20} />
                </button>
                <button 
                  onClick={() => setActiveTab('logo1')}
                  className={`flex-1 py-3 flex justify-center ${activeTab === 'logo1' ? 'text-primary border-b-2 border-primary' : 'text-dark/40'}`}
                >
                  <span className="font-bold text-xs">L1</span>
                </button>
                <button 
                  onClick={() => setActiveTab('logo2')}
                  className={`flex-1 py-3 flex justify-center ${activeTab === 'logo2' ? 'text-primary border-b-2 border-primary' : 'text-dark/40'}`}
                >
                  <span className="font-bold text-xs">L2</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeTab === 'image' && (
                  <div className="space-y-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-light-gray rounded-xl flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
                    >
                      <Upload size={24} className="text-dark/40" />
                      <span className="text-xs font-bold uppercase tracking-wider">Tải ảnh chính</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'main')} />
                    
                    <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-dark/40">Vị trí & Tỉ lệ</label>
                      <div className="space-y-2">
                        <p className="text-xs flex justify-between">Ngang: <span>{state.mainImagePos.x}%</span></p>
                        <input type="range" min="-100" max="100" value={state.mainImagePos.x} onChange={(e) => setState(prev => ({ ...prev, mainImagePos: { ...prev.mainImagePos, x: parseInt(e.target.value) } }))} className="w-full accent-primary" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs flex justify-between">Dọc: <span>{state.mainImagePos.y}%</span></p>
                        <input type="range" min="-100" max="100" value={state.mainImagePos.y} onChange={(e) => setState(prev => ({ ...prev, mainImagePos: { ...prev.mainImagePos, y: parseInt(e.target.value) } }))} className="w-full accent-primary" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs flex justify-between">Thu phóng: <span>{state.mainImagePos.scale.toFixed(1)}x</span></p>
                        <input type="range" min="0.5" max="3" step="0.1" value={state.mainImagePos.scale} onChange={(e) => setState(prev => ({ ...prev, mainImagePos: { ...prev.mainImagePos, scale: parseFloat(e.target.value) } }))} className="w-full accent-primary" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'text' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-dark/40">Nội dung</label>
                      <input 
                        type="text" 
                        value={state.text} 
                        onChange={(e) => setState(prev => ({ ...prev, text: e.target.value }))}
                        className="w-full p-3 bg-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-dark/40">Font chữ</label>
                      <select 
                        value={state.textFont} 
                        onChange={(e) => setState(prev => ({ ...prev, textFont: e.target.value }))}
                        className="w-full p-3 bg-light-gray rounded-xl text-sm"
                      >
                        {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-dark/40">Màu sắc</label>
                      <input 
                        type="color" 
                        value={state.textColor} 
                        onChange={(e) => setState(prev => ({ ...prev, textColor: e.target.value }))}
                        className="w-full h-10 p-1 bg-light-gray rounded-xl cursor-pointer"
                      />
                    </div>
                    <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-dark/40">Vị trí chữ</label>
                      <div className="space-y-2">
                        <p className="text-xs flex justify-between">Ngang: <span>{state.textPos.x}%</span></p>
                        <input type="range" min="0" max="100" value={state.textPos.x} onChange={(e) => setState(prev => ({ ...prev, textPos: { ...prev.textPos, x: parseInt(e.target.value) } }))} className="w-full accent-primary" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs flex justify-between">Dọc: <span>{state.textPos.y}%</span></p>
                        <input type="range" min="0" max="100" value={state.textPos.y} onChange={(e) => setState(prev => ({ ...prev, textPos: { ...prev.textPos, y: parseInt(e.target.value) } }))} className="w-full accent-primary" />
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === 'logo1' || activeTab === 'logo2') && (
                  <div className="space-y-4">
                    <button 
                      onClick={() => activeTab === 'logo1' ? logo1InputRef.current?.click() : logo2InputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-light-gray rounded-xl flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
                    >
                      <Upload size={24} className="text-dark/40" />
                      <span className="text-xs font-bold uppercase tracking-wider">Tải {activeTab === 'logo1' ? 'Logo chính' : 'Logo phụ'}</span>
                    </button>
                    <input type="file" ref={activeTab === 'logo1' ? logo1InputRef : logo2InputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, activeTab)} />
                    
                    <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-dark/40">Vị trí & Kích thước</label>
                      <div className="space-y-2">
                        <p className="text-xs flex justify-between">Ngang: <span>{activeTab === 'logo1' ? state.logo1Pos.x : state.logo2Pos.x}%</span></p>
                        <input type="range" min="0" max="100" value={activeTab === 'logo1' ? state.logo1Pos.x : state.logo2Pos.x} onChange={(e) => setState(prev => ({ ...prev, [activeTab + 'Pos']: { ...prev[(activeTab + 'Pos') as keyof EditorState] as any, x: parseInt(e.target.value) } }))} className="w-full accent-primary" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs flex justify-between">Dọc: <span>{activeTab === 'logo1' ? state.logo1Pos.y : state.logo2Pos.y}%</span></p>
                        <input type="range" min="0" max="100" value={activeTab === 'logo1' ? state.logo1Pos.y : state.logo2Pos.y} onChange={(e) => setState(prev => ({ ...prev, [activeTab + 'Pos']: { ...prev[(activeTab + 'Pos') as keyof EditorState] as any, y: parseInt(e.target.value) } }))} className="w-full accent-primary" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs flex justify-between">Kích thước: <span>{((activeTab === 'logo1' ? state.logo1Pos.scale : state.logo2Pos.scale) * 100).toFixed(0)}%</span></p>
                        <input type="range" min="0.05" max="0.5" step="0.01" value={activeTab === 'logo1' ? state.logo1Pos.scale : state.logo2Pos.scale} onChange={(e) => setState(prev => ({ ...prev, [activeTab + 'Pos']: { ...prev[(activeTab + 'Pos') as keyof EditorState] as any, scale: parseFloat(e.target.value) } }))} className="w-full accent-primary" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-light-gray flex flex-col gap-3">
                <div className="flex gap-3">
                  <button 
                    onClick={onClose} 
                    disabled={isSaving}
                    className="flex-1 py-3 border border-light-gray rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={() => onSave(state)} 
                    disabled={isSaving || !state.mainImage}
                    className="flex-[2] btn-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-500"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      "Lưu thiết kế"
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-center text-dark/40 italic">
                  Thiết kế sẽ được lưu vào bộ sưu tập của app
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
