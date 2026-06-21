import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, ChevronRight, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { validateVietnamesePhone } from '../utils/phone';

export const LuckyWheelWidget: React.FC = () => {
  const { favorites, settings, submitConsultation, checkPhoneDuplicate } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [step, setStep] = useState<'form' | 'wheel' | 'result'>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonGift, setWonGift] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState(0);
  
  const defaultGifts = [
    { id: '1', name: 'Voucher bạn thân 500k', isTargetable: true },
    { id: '2', name: '02 ảnh để bàn 20x30', isTargetable: true },
    { id: '3', name: 'Voucher Makeup Mẹ', isTargetable: true },
    { id: '4', name: '01 Vest chú rể', isTargetable: true },
    { id: '5', name: '01 Váy đi bàn', isTargetable: true },
    { id: '6', name: 'Voucher thuê váy 1tr', isTargetable: true },
    { id: '7', name: '01 bộ kính áp tròng', isTargetable: true },
    { id: '8', name: '01 bộ mỹ ký hoa tai', isTargetable: true },
  ];

  const gifts = settings?.luckyWheelGifts && settings.luckyWheelGifts.length === 8 
    ? settings.luckyWheelGifts 
    : defaultGifts;

  const [isSubmittingData, setIsSubmittingData] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  useEffect(() => {
    if (settings.luckyWheelEnabled === false || settings.luckyWheelNotificationEnabled === false || favorites.length === 0 || isDismissed) return;

    const timer = setTimeout(() => {
      setShowNotification(true);
      // Auto-hide notification after 5 seconds
      setTimeout(() => setShowNotification(false), 5000);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, [settings.luckyWheelEnabled, settings.luckyWheelNotificationEnabled, favorites.length, isDismissed]);

  // Only show if user has liked at least one album and hasn't dismissed the widget
  if (settings.luckyWheelEnabled === false || favorites.length === 0 || isDismissed) return null;

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Vui lòng nhập tên của bạn');
      return;
    }
    if (!validateVietnamesePhone(phone)) {
      setError('Số điện thoại không hợp lệ (VD: 0912345678)');
      return;
    }

    // Client + server duplicate check (SĐT đã chơi rồi)
    setIsCheckingDuplicate(true);
    const alreadyPlayed = await checkPhoneDuplicate(phone, 'lucky_wheel');
    setIsCheckingDuplicate(false);
    if (alreadyPlayed) {
      setWonGift('Bạn đã nhận quà rồi');
      setStep('result');
      return;
    }

    setStep('wheel');
  };

  const spinWheel = () => {
    if (isSpinning || isSubmittingData) return;
    setIsSpinning(true);
    setIsSubmittingData(true);

    const targetableGifts = gifts.filter(g => g.isTargetable);
    const selectedGift = targetableGifts.length > 0 
      ? targetableGifts[Math.floor(Math.random() * targetableGifts.length)]
      : gifts[Math.floor(Math.random() * gifts.length)]; // Fallback if none are targetable

    const giftIndex = gifts.findIndex(g => g.id === selectedGift.id);
    
    const sliceAngle = 360 / gifts.length;
    // Calculate rotation to land on the selected gift
    // The pointer is at the top (0 degrees).
    // We want the center of the selected slice to be at 0 degrees after rotation.
    const targetRotation = 360 * 5 + (360 - (giftIndex * sliceAngle + sliceAngle / 2));
    
    setRotation(targetRotation);

    setTimeout(async () => {
      setIsSpinning(false);
      setWonGift(selectedGift.name);
      setStep('result');
      
      // Confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#ECB697', '#A4756B', '#FFD700', '#ff0000', '#00ff00', '#0000ff']
      });

      // Save to local storage
      const playedPhones = JSON.parse(localStorage.getItem('h2o_lucky_wheel_played') || '[]');
      if (!playedPhones.includes(phone)) {
        playedPhones.push(phone);
        localStorage.setItem('h2o_lucky_wheel_played', JSON.stringify(playedPhones));
      }

      // Save to Firestore
      try {
        await submitConsultation({
          name,
          phone,
          message: `Khách hàng quay trúng: ${selectedGift.name}`,
          source: 'lucky_wheel',
          luckyGift: selectedGift.name,
          favoriteIds: favorites
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIsSubmittingData(false);
      }
    }, 5000); // 5 seconds spin duration
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-64 right-4 sm:bottom-80 sm:right-8 z-40 flex flex-col items-end gap-2"
          >
            {/* 10s Notification Toast */}
            <AnimatePresence>
              {showNotification && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  className="bg-gradient-to-r from-[#A4756B] to-[#ECB697] text-white text-[10px] sm:text-xs font-bold px-4 py-2 rounded-2xl shadow-xl border-2 border-white mb-2 max-w-[180px] sm:max-w-[220px] text-center leading-tight"
                >
                  {settings.luckyWheelNotificationText || 'Chúc mừng Dâu Rể đã nhận được 1 vòng quay may mắn! 🎁'}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tooltip bubble - Only show on hover/touch */}
            <AnimatePresence>
              {isHovered && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="bg-white text-[#A4756B] text-xs font-bold px-4 py-2 rounded-2xl shadow-lg border border-[#ECB697]/30 relative mr-2 text-center leading-tight min-w-[150px]"
                >
                  <p className="mb-0.5">{settings.luckyWheelCTA || 'Quay là trúng!'}</p>
                  <p className="text-[10px] text-dark/60 font-medium">{settings.luckyWheelSubCTA || 'Dâu Rể cùng chơi - May mắn gấp đôi!'}</p>
                  <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-b border-r border-[#ECB697]/30 transform rotate-45"></div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              {/* Close button for the widget */}
              <button 
                onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
                className="absolute -top-2 -right-2 z-50 w-5 h-5 bg-white text-gray-500 rounded-full shadow-md flex items-center justify-center border border-gray-200 hover:bg-gray-100"
              >
                <X size={12} />
              </button>

              {/* Notification Badge */}
              <div className="absolute -top-1 -left-1 z-50 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md border-2 border-white animate-bounce">
                1
              </div>

              {/* Circular Wheel Icon */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onTouchStart={() => setIsHovered(true)}
                onClick={() => setIsOpen(true)}
                className="w-16 h-16 rounded-full shadow-2xl border-4 border-white relative overflow-hidden bg-white cursor-pointer group"
              >
                {/* Mini Wheel CSS */}
                <div 
                  className="absolute inset-0 group-hover:rotate-180 transition-transform duration-1000 ease-out"
                  style={{
                    background: `conic-gradient(
                      #ff4d4f 0deg 45deg,
                      #ffc53d 45deg 90deg,
                      #73d13d 90deg 135deg,
                      #40a9ff 135deg 180deg,
                      #ff4d4f 180deg 225deg,
                      #ffc53d 225deg 270deg,
                      #73d13d 270deg 315deg,
                      #40a9ff 315deg 360deg
                    )`
                  }}
                />
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-inner z-10"></div>
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[8px] border-t-white z-20"></div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`bg-gradient-to-b from-[#ECB697]/10 to-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border-2 border-[#ECB697]/30 ${step === 'wheel' ? 'bg-[#1a8b7c]' : ''}`}
              style={step === 'wheel' ? { background: 'linear-gradient(180deg, #2db7a3 0%, #1a8b7c 100%)' } : {}}
            >
              <button 
                onClick={() => setIsOpen(false)}
                className={`absolute top-4 right-4 p-2 rounded-full z-20 transition-colors ${step === 'wheel' ? 'text-white/70 hover:text-white bg-black/20' : 'text-dark/40 hover:text-dark bg-light-gray'}`}
              >
                <X size={20} />
              </button>

              {step === 'form' && (
                <div className="p-8 text-center bg-white">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#ECB697] to-[#A4756B] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-white">
                    <Gift size={36} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-dark mb-2">Vòng Quay May Mắn</h2>
                  <p className="text-sm text-dark/60 mb-6 italic bg-orange-50 p-3 rounded-xl border border-orange-100">
                    Lưu ý: Phần quà mang giá trị yêu thương từ H2O Studio. Hãy tham gia khi bạn đã sẵn sàng book lịch chụp để không bỏ lỡ ưu đãi nhé!
                  </p>

                  <form onSubmit={handleStart} className="space-y-4 text-left">
                    <div>
                      <label className="block text-sm font-bold text-dark mb-1">Tên của bạn</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-[#ECB697] focus:ring-2 focus:ring-[#ECB697]/20 transition-all"
                        placeholder="Nhập tên..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-dark mb-1">Số điện thoại</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-[#ECB697] focus:ring-2 focus:ring-[#ECB697]/20 transition-all"
                        placeholder="09..."
                      />
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
                    
                    <button
                      type="submit"
                      disabled={isCheckingDuplicate}
                      className="w-full py-4 bg-gradient-to-r from-[#ECB697] to-[#A4756B] text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-[#ECB697]/30 flex items-center justify-center gap-2 mt-2 text-lg disabled:opacity-70"
                    >
                      {isCheckingDuplicate ? 'Đang kiểm tra...' : <><span>Vào Quay Ngay</span> <ChevronRight size={20} /></>}
                    </button>
                  </form>
                </div>
              )}

              {step === 'wheel' && (
                <div className="p-8 text-center flex flex-col items-center">
                  <h2 className="text-3xl font-black text-white mb-2 drop-shadow-md uppercase tracking-wider">Vòng Quay</h2>
                  <h3 className="text-xl font-bold text-[#FFD700] mb-8 drop-shadow-md uppercase">May Mắn</h3>
                  
                  <div className="relative w-72 h-72 mb-8">
                    {/* Outer glow/border */}
                    <div className="absolute -inset-4 bg-white/20 rounded-full blur-md"></div>
                    <div className="absolute -inset-2 bg-gradient-to-b from-[#FFD700] to-[#FFA500] rounded-full shadow-2xl"></div>
                    
                    {/* Pointer */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 drop-shadow-lg">
                      <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 50L0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20L20 50Z" fill="#FF0000"/>
                        <circle cx="20" cy="15" r="5" fill="#FFFFFF"/>
                      </svg>
                    </div>
                    
                    {/* Wheel */}
                    <div 
                      className="w-full h-full rounded-full border-4 border-white overflow-hidden relative shadow-inner bg-white"
                      style={{ 
                        transform: `rotate(${rotation}deg)`, 
                        transition: isSpinning ? 'transform 5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' 
                      }}
                    >
                      {/* Wheel Slices using conic-gradient */}
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: `conic-gradient(
                            from -22.5deg,
                            #ff4d4f 0deg 45deg,
                            #ffc53d 45deg 90deg,
                            #73d13d 90deg 135deg,
                            #40a9ff 135deg 180deg,
                            #ff4d4f 180deg 225deg,
                            #ffc53d 225deg 270deg,
                            #73d13d 270deg 315deg,
                            #40a9ff 315deg 360deg
                          )`
                        }}
                      />
                      
                      {/* Text labels */}
                      {gifts.map((gift, index) => {
                        const angle = 360 / gifts.length;
                        const rotate = index * angle;
                        return (
                          <div 
                            key={gift.id}
                            className="absolute top-0 left-0 w-full h-full flex items-start justify-center pt-6"
                            style={{ transform: `rotate(${rotate}deg)` }}
                          >
                            <span className="text-[11px] font-black text-white w-20 text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
                              {gift.name}
                            </span>
                          </div>
                        );
                      })}
                      
                      {/* Center Button (QUAY) */}
                      <button 
                        onClick={spinWheel}
                        disabled={isSpinning}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-b from-[#FFD700] to-[#FFA500] rounded-full border-4 border-white shadow-[0_0_15px_rgba(0,0,0,0.3)] flex items-center justify-center z-10 cursor-pointer hover:scale-105 active:scale-95 transition-transform disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <div className="w-16 h-16 rounded-full border-2 border-white/50 flex items-center justify-center bg-gradient-to-b from-[#ff4d4f] to-[#cc0000]">
                          <span className="text-white font-black text-lg drop-shadow-md">QUAY</span>
                        </div>
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-white/80 text-sm font-medium">Bấm vào nút QUAY ở giữa để bắt đầu!</p>
                </div>
              )}

              {step === 'result' && (
                <div className="p-8 text-center bg-white relative overflow-hidden">
                  {/* Decorative background */}
                  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#ECB697]/20 to-transparent"></div>
                  
                  <div className="relative z-10">
                    <div className="inline-block bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-1.5 rounded-full font-black text-sm uppercase tracking-widest mb-6 shadow-lg transform -translate-y-2">
                      Chúc Mừng
                    </div>
                    
                    <div className="w-24 h-24 bg-gradient-to-br from-[#ECB697] to-[#A4756B] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-white transform rotate-3">
                      <Trophy size={48} className="text-white" />
                    </div>
                    
                    <h2 className="text-xl font-bold text-dark mb-2">Tuyệt vời, {name}!</h2>
                    <p className="text-dark/60 mb-4">Bạn đã quay trúng phần quà:</p>
                    
                    <div className="bg-gradient-to-r from-[#ECB697]/10 via-[#A4756B]/10 to-[#ECB697]/10 p-6 rounded-2xl border-2 border-[#ECB697] border-dashed mb-8 relative">
                      <div className="absolute -top-3 -left-3 w-6 h-6 bg-white border-2 border-[#ECB697] rounded-full"></div>
                      <div className="absolute -top-3 -right-3 w-6 h-6 bg-white border-2 border-[#ECB697] rounded-full"></div>
                      <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-white border-2 border-[#ECB697] rounded-full"></div>
                      <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-white border-2 border-[#ECB697] rounded-full"></div>
                      
                      <p className="text-2xl font-black text-[#A4756B] uppercase">{wonGift}</p>
                    </div>

                    <div className="bg-red-50 p-4 rounded-xl mb-6 border border-red-100 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                      <p className="text-sm text-red-600 font-bold mb-1 flex items-center justify-center gap-2">
                        <span className="animate-pulse">⏳</span> Đếm ngược 24:00:00
                      </p>
                      <p className="text-xs text-red-500/80 leading-relaxed">
                        Phần quà đã được lưu vào SĐT của bạn. Ưu đãi chỉ có giá trị khi book lịch trong vòng 24h tới. Chuyên viên H2O sẽ liên hệ ngay!
                      </p>
                    </div>

                    <button 
                      onClick={() => setIsOpen(false)}
                      className="w-full py-4 bg-dark text-white font-bold rounded-xl hover:bg-dark/90 transition-colors shadow-lg"
                    >
                      Xác nhận nhận quà
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
