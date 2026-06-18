import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { APP_CONFIG } from '../data/mockData';
import { CheckCircle, MessageCircle, Calendar as CalendarIcon, Sparkles, Facebook, Copy } from 'lucide-react';
import { validateVietnamesePhone } from '../utils/phone';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({ isOpen, onClose, initialMessage }) => {
  const { submitConsultation, favorites, consultations } = useApp();
  const [consultForm, setConsultForm] = useState({ name: '', phone: '', message: '', date: undefined as Date | undefined, source: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [isTyping, setIsTyping] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setConsultForm(prev => ({ ...prev, message: initialMessage || '' }));
      if (favorites.length > 0) {
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, initialMessage, favorites.length]);

  const handleSubmitConsult = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    if (!consultForm.name || !consultForm.phone) return;
    
    if (!validateVietnamesePhone(consultForm.phone)) {
      setPhoneError('Số điện thoại không hợp lệ (VD: 0912345678)');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitConsultation({
        ...consultForm,
        favoriteIds: favorites
      });
      setIsSuccess(true);
    } catch (err: any) {
      alert(`Có lỗi xảy ra, vui lòng thử lại. Chi tiết lỗi: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setConsultForm({ name: '', phone: '', message: '', date: undefined, source: '' });
    setShowCalendar(false);
    setPhoneError('');
    onClose();
  };

  const { zaloLink, messengerLink, finalMessage } = useMemo(() => {
    let msg = consultForm.message || initialMessage || "";
    if (!msg && favorites.length > 0) {
      msg = `Chào H2O STUDIO, mình quan tâm đến ${favorites.length} ảnh/concept mình đã thả tim.\nTư vấn cho mình nhé!`;
    } else if (!msg) {
      msg = "Chào H2O STUDIO, mình muốn nhận báo giá tư vấn concept này!";
    }
    const encodedMessage = encodeURIComponent(msg);
    const phoneMatch = APP_CONFIG.zaloUrl.match(/\d+$/);
    const zaloPhone = phoneMatch ? phoneMatch[0] : APP_CONFIG.hotline;
    return {
      finalMessage: msg,
      zaloLink: `https://zalo.me/${zaloPhone}?text=${encodedMessage}`,
      messengerLink: APP_CONFIG.facebookMessengerUrl,
    };
  }, [consultForm.message, initialMessage, favorites.length]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(finalMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative overflow-hidden"
      >
        {/* Decorative background for CX */}
        {!isSuccess && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-primary opacity-20" />
        )}

        {isSuccess ? (
          <div className="text-center py-6">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-dark mb-2">Gửi thành công!</h3>
            <p className="text-dark/60 mb-8 text-sm">
              H2O đã nhận được yêu cầu. Bạn hãy nhắn tin qua Zalo hoặc Fanpage để nhận nhanh báo giá kèm hình ảnh mẫu nhé!
            </p>
            <div className="flex flex-col gap-3">
              <div className="mb-2">
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
                    <p className="text-xs text-dark/70 italic line-clamp-3 border-l-2 border-[#0084FF]/30 pl-2 mt-1">"{finalMessage}"</p>
                  </div>
                </button>
              </div>

              <a 
                href={zaloLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#0068FF] hover:bg-[#0054cc] text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                <MessageCircle size={20} />
                Gửi tư vấn Zalo ngay!
              </a>
              <a 
                href={messengerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#0866FF] hover:bg-[#0054cc] text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                <Facebook size={20} />
                Gửi tư vấn Fanpage ngay!
              </a>
              <button 
                onClick={handleClose}
                className="w-full px-6 py-3 rounded-xl text-sm font-bold text-dark/40 hover:bg-light-gray transition-colors mt-2"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-dark mb-4">Gửi Yêu Cầu Ngay</h3>
            
            {/* Style Analysis CX Feature - Chat Style */}
            {favorites.length > 0 && (
              <div className="mb-6 flex items-end gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center shrink-0 shadow-sm relative">
                  <span className="text-white text-[10px] font-bold">H2O</span>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="bg-light-gray/50 rounded-2xl rounded-bl-none p-3 max-w-[85%] border border-light-gray relative">
                  {isTyping ? (
                    <div className="flex gap-1 items-center h-5 px-2">
                      <span className="w-1.5 h-1.5 bg-dark/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-dark/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-dark/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <p className="text-xs text-dark/80 leading-relaxed">
                        Concept bạn thích rất có gu thẩm mỹ ấy ạ! H2O sẽ tư vấn chi tiết nhất cho phong cách của bạn nhé ! 🥰
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            <p className="text-dark/60 text-sm mb-6">
              Ekip H2O sẽ nhận thông tin liên hệ gửi tư vấn ngay cho Dâu Rể nhé!
            </p>
            <form onSubmit={handleSubmitConsult} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-dark/40 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  required
                  value={consultForm.name}
                  onChange={e => setConsultForm({...consultForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-dark/40 mb-1">Số điện thoại</label>
                <input 
                  type="tel" 
                  required
                  value={consultForm.phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setConsultForm({...consultForm, phone: val});
                    if (phoneError) setPhoneError('');
                  }}
                  maxLength={10}
                  className={`w-full px-4 py-3 bg-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 ${phoneError ? 'border border-red-500 focus:ring-red-500/20' : 'focus:ring-primary/20'}`}
                  placeholder="090xxxxxxx"
                />
                {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                {!phoneError && consultForm.phone.length === 10 && consultations.some(c => c.phone === consultForm.phone) && (
                  <p className="text-amber-600 text-xs mt-1 font-medium">Số điện thoại này đã có trong hệ thống — yêu cầu của bạn vẫn sẽ được ghi nhận.</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-dark/40 mb-1">Bạn biết đến H2O Studio qua đâu?</label>
                <select
                  value={consultForm.source}
                  onChange={e => setConsultForm({...consultForm, source: e.target.value})}
                  className="w-full px-4 py-3 bg-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Chọn nguồn --</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Tiktok">Tiktok</option>
                  <option value="Bạn bè giới thiệu">Bạn bè giới thiệu</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-dark/40 mb-1">Lời nhắn / Concept quan tâm</label>
                <textarea 
                  value={consultForm.message}
                  onChange={e => setConsultForm({...consultForm, message: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-light-gray rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Mình cần tư vấn..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-dark/40 hover:bg-light-gray transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] btn-primary"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
};
