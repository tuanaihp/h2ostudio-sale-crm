import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, ArrowRight, Lock, ChevronLeft, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { validateVietnamesePhone } from '../utils/phone';
import { sendLeadNotifications } from '../utils/sendLeadNotifications';

export const PhoneGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userPhone, setUserPhone, isAdmin, login, isAuthReady, settings } = useApp();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [visitedCount, setVisitedCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAdmin || userPhone) return;

    try {
      const visited = JSON.parse(localStorage.getItem('h2o_visited_items') || '[]');
      if (!visited.includes(location.pathname)) {
        visited.push(location.pathname);
        localStorage.setItem('h2o_visited_items', JSON.stringify(visited));
      }
      setVisitedCount(visited.length);
    } catch (e) {
      console.error(e);
    }
  }, [location.pathname, isAdmin, userPhone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên của bạn');
      return;
    }
    if (!validateVietnamesePhone(phone)) {
      setError('Số điện thoại không hợp lệ (VD: 0912345678)');
      return;
    }
    setUserPhone(phone, name);
    sendLeadNotifications({ name: name.trim(), phone, source: 'phone_gate', settings });
  };

  // If auth is not ready, show nothing or a subtle loader to prevent flash
  if (!isAuthReady) return null;

  // If user is admin, has phone, or hasn't viewed 5 unique items yet
  if (isAdmin || userPhone || visitedCount <= 5) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-black blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-black blur-[120px]" />
      </div>

      <button 
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-20"
        title="Quay lại"
      >
        <ChevronLeft size={24} className="text-gray-600" />
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full text-center relative z-10"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-secondary to-primary text-white rounded-full flex items-center justify-center shadow-2xl relative">
            <Lock className="w-8 h-8" />
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
              !
            </div>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-serif mb-4 tracking-tight bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent font-bold">
          Giới hạn xem trước
        </h1>
        <p className="text-gray-500 mb-10 leading-relaxed max-w-lg mx-auto">
          Bạn đã xem miễn phí 5 concept độc quyền. Để tiếp tục khám phá kho tàng giao diện và nhận được tư vấn tốt nhất từ H2O STUDIO, vui lòng để lại thông tin của bạn.
        </p>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Tên của bạn"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg"
            />
          </div>
          
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="Số điện thoại"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg"
            />
          </div>
          
          <AnimatePresence>
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-500 text-sm font-medium"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-secondary to-primary text-white py-4 rounded-2xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-primary/20 group"
          >
            Tiếp tục khám phá
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col items-center gap-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">
            H2O STUDIO &copy; 2016 • Wedding Concept Gallery
          </p>
          <button 
            type="button"
            onClick={login}
            className="text-[10px] text-gray-300 hover:text-gray-500 transition-colors"
          >
            Admin Login
          </button>
        </div>
      </motion.div>
    </div>
  );
};
