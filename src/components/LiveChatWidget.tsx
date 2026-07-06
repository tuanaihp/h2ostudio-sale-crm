import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Phone } from 'lucide-react';
import { LiveChatBubble, playNotifSound } from './LiveChatBubble';
import { motion, AnimatePresence } from 'motion/react';
import { APP_CONFIG } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { ChatMessageConfig } from '../types';

const AUTO_OPEN_KEY = 'h2o_chat_auto_opened';

export const LiveChatWidget: React.FC = () => {
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const [showBubble, setShowBubble]     = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [isTyping, setIsTyping]         = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1);
  const { settings } = useApp();

  const chatMessages: ChatMessageConfig[] = settings?.chatEnabled === false ? [] : (settings?.chatMessages && settings.chatMessages.length > 0
    ? settings.chatMessages
    : [
        {
          id: 'msg-1',
          content: settings?.welcomeMessage || "Chào bạn nhé!\nBạn hãy xem và chọn concept mình yêu thích bằng cách thả tim album\nSau đó vào Album Yêu Thích chọn Gửi Nhận Báo Giá nhé",
          delaySeconds: 10,
          textColor: '#1a1a1a',
          enabled: true
        },
        {
          id: 'msg-2',
          content: settings?.secondWelcomeMessage || "Bạn chọn được concept chưa!\nBạn hãy thả tim concept mình yêu thích\nSau đó vào Album Yêu Thích chọn Gửi Nhận Báo Giá - H2O sẽ nhận tư vấn ngay nhé",
          delaySeconds: 30,
          textColor: '#1a1a1a',
          enabled: true
        }
      ]).filter(msg => msg.enabled !== false);

  const typingTimeoutRef      = useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef       = useRef<NodeJS.Timeout | null>(null);
  const nextMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const liveChatOpenRef       = useRef(false);
  useEffect(() => { liveChatOpenRef.current = liveChatOpen; }, [liveChatOpen]);

  const scheduleNextMessage = (index: number) => {
    if (index >= chatMessages.length) return;
    const delay = chatMessages[index].delaySeconds * 1000;
    nextMessageTimeoutRef.current = setTimeout(() => {
      setCurrentMessageIndex(index);
      setTypedMessage('');
      setIsTyping(true);
      setShowBubble(true);
    }, delay);
  };

  useEffect(() => {
    if (chatMessages.length > 0 && currentMessageIndex === -1) {
      scheduleNextMessage(0);
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (nextMessageTimeoutRef.current) clearTimeout(nextMessageTimeoutRef.current);
    };
  }, [chatMessages]);

  useEffect(() => {
    if (currentMessageIndex === -1 || currentMessageIndex >= chatMessages.length) return;
    const currentMessage = chatMessages[currentMessageIndex];
    if (isTyping && showBubble) {
      if (typedMessage.length < currentMessage.content.length) {
        const speed = settings?.chatTypingSpeed ?? 50;
        typingTimeoutRef.current = setTimeout(() => {
          setTypedMessage(currentMessage.content.slice(0, typedMessage.length + 1));
        }, speed);
      } else {
        setIsTyping(false);
        closeTimeoutRef.current = setTimeout(() => {
          setShowBubble(false);
          scheduleNextMessage(currentMessageIndex + 1);
        }, 10000);
      }
    }
  }, [typedMessage, isTyping, showBubble, currentMessageIndex, chatMessages]);

  // Auto-mở live chat sau N giây (cấu hình trong AdminSettings, mặc định 20s)
  useEffect(() => {
    if (settings?.chatAutoOpenEnabled === false) return;
    if (sessionStorage.getItem(AUTO_OPEN_KEY)) return;
    const delayMs = (settings?.chatAutoOpenDelay ?? 20) * 1000;
    const timer = setTimeout(() => {
      if (liveChatOpenRef.current) return;
      sessionStorage.setItem(AUTO_OPEN_KEY, '1');
      playNotifSound();
      setLiveChatOpen(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [settings?.chatAutoOpenEnabled, settings?.chatAutoOpenDelay]);

  const handleCloseBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBubble(false);
    setIsTyping(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (nextMessageTimeoutRef.current) clearTimeout(nextMessageTimeoutRef.current);
    scheduleNextMessage(currentMessageIndex + 1);
  };

  const openLiveChat = () => {
    setLiveChatOpen(true);
    setShowBubble(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (nextMessageTimeoutRef.current) clearTimeout(nextMessageTimeoutRef.current);
  };

  const currentMessage = currentMessageIndex >= 0 && currentMessageIndex < chatMessages.length
    ? chatMessages[currentMessageIndex]
    : null;

  // Ẩn widget chỉ khi admin đã TẮT RÕ RÀNG liveChatEnabled = false
  // (undefined = chưa set = vẫn hiện)
  if (settings?.liveChatEnabled === false && settings?.chatBotEnabled !== true && settings?.chatBotTier2Enabled !== true && settings?.chatBotV2Enabled !== true && settings?.chatBotV3Enabled !== true) {
    return null;
  }
  if (settings?.liveChatEnabled === false) {
    return (
      <LiveChatBubble
        chatBotEnabled={settings?.chatBotEnabled === true}
        chatBotTier2Enabled={settings?.chatBotTier2Enabled === true}
        chatBotV2Enabled={settings?.chatBotV2Enabled === true}
        chatBotV3Enabled={settings?.chatBotV3Enabled === true}
        integrationConfig={{
          chatApiEnabled: settings?.integrationChatApiEnabled,
          chatApiUrl: settings?.integrationChatApiUrl,
          chatApiKey: settings?.integrationChatApiKey,
          chatApiModelName: settings?.integrationChatApiModelName,
        }}
      />
    );
  }

  return (
    <>
      {/* Preview tin nhắn nổi từ phải — độc lập với nút chat */}
      <AnimatePresence>
        {showBubble && currentMessage && !liveChatOpen && (
          <motion.div
            key={`preview-${currentMessageIndex}`}
            initial={{ opacity: 0, x: 100, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, y: -20, scale: 0.88, transition: { duration: 0.5, ease: 'easeIn' } }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed right-4 z-[9999] bg-white rounded-[1.4rem] shadow-2xl border border-gray-100 text-sm font-medium cursor-pointer max-w-[260px] sm:max-w-[300px]"
            style={{
              bottom: 'max(220px, calc(env(safe-area-inset-bottom) + 220px))',
              color: currentMessage.textColor || '#1a1a1a',
            }}
            onClick={openLiveChat}
          >
            {/* Typing indicator với tên nhân viên */}
            {isTyping && typedMessage.length === 0 && (
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {settings?.chatStaffName ? settings.chatStaffName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase() : 'H'}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-500 font-medium">{settings?.chatStaffName || 'H2O Studio'}</span>
                  <span className="flex gap-0.5 ml-1">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div className="px-4 py-3 pr-9 relative">
              <span className="whitespace-pre-line leading-relaxed block text-[13px]">
                {typedMessage}
                {isTyping && typedMessage.length > 0 && <span className="inline-block w-1 h-3.5 ml-0.5 bg-primary animate-pulse align-middle rounded-sm" />}
              </span>
              <button
                onClick={handleCloseBubble}
                className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-500 transition-colors rounded-full bg-gray-50"
              >
                <X size={11} />
              </button>
            </div>
            {/* Đuôi bong bóng trỏ xuống bên phải */}
            <div className="absolute -bottom-2 right-7 w-4 h-4 bg-white border-b border-r border-gray-100 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nút bấm cố định — luôn hiển thị */}
      <div
        className="fixed right-4 z-[9999] flex flex-col items-center gap-3 sm:right-6"
        style={{ bottom: 'max(80px, calc(env(safe-area-inset-bottom) + 80px))' }}
      >
        {/* Nút gọi điện */}
        <motion.a
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          href={`tel:${APP_CONFIG.hotline}`}
          className="w-12 h-12 bg-white text-primary rounded-2xl shadow-xl flex items-center justify-center border border-primary/10"
          title="Gọi Hotline"
        >
          <Phone size={20} fill="currentColor" />
        </motion.a>

        {/* Nút chat */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          onClick={liveChatOpen ? () => setLiveChatOpen(false) : openLiveChat}
          className="w-14 h-14 bg-gradient-to-br from-secondary via-primary to-primary text-white rounded-[1.4rem] shadow-2xl shadow-primary/30 flex items-center justify-center relative overflow-hidden"
        >
          {/* Ping ring */}
          <span className="absolute inset-0 rounded-[1.4rem] bg-white/20 animate-ping opacity-30" />
          <AnimatePresence mode="wait">
            {liveChatOpen ? (
              <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                <X size={22} />
              </motion.span>
            ) : (
              <motion.div key="chat" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.18 }} className="flex flex-col items-center relative z-10">
                <MessageCircle size={24} />
                <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">Chat</span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Chấm đỏ thông báo */}
          {!liveChatOpen && (
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
          )}
        </motion.button>
      </div>

      {/* Panel chat full */}
      <LiveChatBubble
        controlledOpen={liveChatOpen}
        onClose={() => setLiveChatOpen(false)}
        chatBotEnabled={settings?.chatBotEnabled === true}
        chatBotTier2Enabled={settings?.chatBotTier2Enabled === true}
        chatBotV2Enabled={settings?.chatBotV2Enabled === true}
        chatBotV3Enabled={settings?.chatBotV3Enabled === true}
        integrationConfig={{
          chatApiEnabled: settings?.integrationChatApiEnabled,
          chatApiUrl: settings?.integrationChatApiUrl,
          chatApiKey: settings?.integrationChatApiKey,
          chatApiModelName: settings?.integrationChatApiModelName,
        }}
      />
    </>
  );
};
