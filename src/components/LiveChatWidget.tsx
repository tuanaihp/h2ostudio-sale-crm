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

  // Ẩn toàn bộ widget nếu admin đã tắt
  if (settings?.liveChatEnabled === false) return null;

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
        typingTimeoutRef.current = setTimeout(() => {
          setTypedMessage(currentMessage.content.slice(0, typedMessage.length + 1));
        }, 50);
      } else {
        setIsTyping(false);
        closeTimeoutRef.current = setTimeout(() => {
          setShowBubble(false);
          scheduleNextMessage(currentMessageIndex + 1);
        }, 10000);
      }
    }
  }, [typedMessage, isTyping, showBubble, currentMessageIndex, chatMessages]);

  // Auto-mở live chat sau 10 giây (chỉ 1 lần)
  useEffect(() => {
    if (sessionStorage.getItem(AUTO_OPEN_KEY)) return;
    const timer = setTimeout(() => {
      if (liveChatOpenRef.current) return;
      sessionStorage.setItem(AUTO_OPEN_KEY, '1');
      playNotifSound();
      setLiveChatOpen(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <>
      <AnimatePresence>
        {!liveChatOpen && (
          <motion.div
            key="chat-widget"
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-40 flex flex-col items-end gap-4"
          >
            <AnimatePresence>
              {showBubble && currentMessage && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-white px-5 py-4 rounded-[1.5rem] shadow-2xl border border-gray-100 text-sm font-medium relative pr-12 max-w-[280px] sm:max-w-[320px] cursor-pointer"
                  style={{ color: currentMessage.textColor || '#1a1a1a' }}
                  onClick={openLiveChat}
                >
                  <span className="whitespace-pre-line leading-relaxed block">
                    {typedMessage}
                    {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />}
                  </span>
                  <button
                    onClick={handleCloseBubble}
                    className="absolute top-2 right-2 p-1.5 text-dark/20 hover:text-dark/60 transition-colors bg-light-gray rounded-full"
                  >
                    <X size={12} />
                  </button>
                  <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-4">
              <motion.a
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                href={`tel:${APP_CONFIG.hotline}`}
                className="w-14 h-14 bg-white text-primary rounded-2xl shadow-2xl flex items-center justify-center transition-all border-2 border-primary/10"
                title="Gọi Hotline"
              >
                <Phone size={24} fill="currentColor" />
              </motion.a>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={openLiveChat}
                className="w-16 h-16 bg-gradient-to-br from-secondary via-primary to-primary text-white rounded-[1.8rem] shadow-2xl flex items-center justify-center transition-all relative group overflow-hidden"
              >
                <span className="absolute inset-0 bg-white/20 animate-ping rounded-full opacity-40" />
                <div className="relative z-10 flex flex-col items-center">
                  <MessageCircle size={28} />
                  <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">Chat</span>
                </div>
                <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live chat panel — controlled bởi LiveChatWidget */}
      <LiveChatBubble
        controlledOpen={liveChatOpen}
        onClose={() => setLiveChatOpen(false)}
        chatBotEnabled={settings?.chatBotEnabled === true}
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
