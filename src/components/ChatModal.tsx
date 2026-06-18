import React, { useState } from 'react';
import { MessageCircle, Phone, X, Edit3, FileText, Copy, Facebook } from 'lucide-react';
import { APP_CONFIG } from '../data/mockData';
import { motion, AnimatePresence } from 'motion/react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  initialMessage?: string;
  title?: string;
  onOpenConsultation?: () => void;
  showExtraOptions?: boolean;
}

export const ChatModal: React.FC<ChatModalProps> = ({ 
  isOpen, 
  onClose, 
  context, 
  initialMessage, 
  title, 
  onOpenConsultation,
  showExtraOptions = true
}) => {
  const fallbackMessage = context 
    ? `Chào H2O STUDIO, em đang quan tâm concept ${context}, nhờ tư vấn giúp em layout phù hợp.`
    : `Chào H2O STUDIO, em cần tư vấn về dịch vụ chụp ảnh.`;
    
  const finalMessage = initialMessage || fallbackMessage;
  const encodedMessage = encodeURIComponent(finalMessage);

  // Extract phone from APP_CONFIG.zaloUrl (format https://zalo.me/0979514059)
  const phoneMatch = APP_CONFIG.zaloUrl.match(/\d+$/);
  const phone = phoneMatch ? phoneMatch[0] : (APP_CONFIG as any).hotline;

  const [isCopied, setIsCopied] = useState(false);

  const zaloLink = `https://zalo.me/${phone}?text=${encodedMessage}`;
  const fbLink = `${APP_CONFIG.facebookMessengerUrl}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(finalMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-dark leading-tight">
                  {title || "Kết nối với H2O"}
                </h3>
                <p className="text-sm text-dark/40 font-medium">Chọn phương thức bạn muốn liên hệ</p>
              </div>
              <button onClick={onClose} className="p-3 bg-light-gray hover:bg-gray-200 rounded-full transition-all active:scale-90">
                <X size={20} className="text-dark" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="mb-4">
                <button 
                  onClick={handleCopyMessage}
                  className="w-full relative overflow-hidden group p-4 bg-blue-50/50 rounded-2xl border border-[#0084FF]/20 text-left transition-all hover:bg-blue-50 hover:border-[#0084FF]/40 animate-[pulse_3s_ease-in-out_infinite]"
                >
                  <div className="relative z-10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-[#0084FF] uppercase tracking-wider flex items-center gap-2">
                        <Copy size={16} />
                        {isCopied ? "ĐÃ SAO CHÉP THÀNH CÔNG!" : "SAO CHÉP GỬI NGAY"}
                      </p>
                    </div>
                    <p className="text-sm border-l-2 border-[#0084FF]/30 pl-3 py-1 text-dark/80 italic mt-1 bg-white/50 rounded-r-lg">"{finalMessage}"</p>
                  </div>
                </button>
              </div>

              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={zaloLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#0068FF] hover:bg-[#0054cc] text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                <MessageCircle size={20} />
                Gửi tư vấn Zalo ngay!
              </motion.a>

              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={fbLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#0866FF] hover:bg-[#0054cc] text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                <Facebook size={20} />
                Gửi tư vấn Fanpage ngay!
              </motion.a>

              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href={`tel:${APP_CONFIG.hotline}`}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-dark hover:bg-black text-white rounded-2xl font-bold transition-all shadow-lg shadow-dark/20"
              >
                <Phone size={20} />
                Gọi Hotline: {APP_CONFIG.hotline}
              </motion.a>
            </div>

            <div className="mt-8 pt-6 border-t border-light-gray">
              <p className="text-center text-[10px] text-dark/30 font-bold uppercase tracking-[0.2em]">
                H2O STUDIO • Since 2018
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
