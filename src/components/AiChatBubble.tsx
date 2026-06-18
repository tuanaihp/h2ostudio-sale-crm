import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MessageSquare, X, Send, User, Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AiChatBubble: React.FC = () => {
  const { settings } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const enabled = settings?.aiConsultantEnabled;
  const aiName = settings?.aiConsultantName || 'Trợ lý H2O';
  const systemInstruction = settings?.aiConsultantPrompt || 'Bạn là nhân viên tư vấn nhiệt tình của H2O Studio. Hãy tư vấn với giọng điệu chuyên nghiệp, thân thiện, trả lời ngắn gọn và dễ hiểu.';

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!enabled) return null;

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          systemInstruction,
          integrationConfig: {
            chatApiEnabled: settings?.integrationChatApiEnabled,
            chatApiUrl: settings?.integrationChatApiUrl,
            chatApiKey: settings?.integrationChatApiKey,
            chatApiModelName: settings?.integrationChatApiModelName,
            chatApiHeaders: settings?.integrationChatApiHeaders,
            sheetEnabled: settings?.integrationSheetEnabled,
            sheetId: settings?.integrationSheetId,
            sheetName: settings?.integrationSheetName,
            sheetApiKey: settings?.integrationSheetApiKey,
            scriptNotes: settings?.integrationScriptNotes,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Lỗi kết nối máy chủ');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Xin lỗi, hiện tại tôi không thể trả lời. Vui lòng thử lại sau hoặc gọi hotline nhé.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-dark text-white rounded-full shadow-lg shadow-dark/20 flex items-center justify-center relative hover:bg-dark/90 transition-colors"
          >
            <User size={24} />
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white"></span>
            </span>
          </motion.button>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-[90vw] max-w-[380px] sm:w-[380px] h-[500px] max-h-[80vh] flex flex-col mt-4 bottom-0 right-0 origin-bottom-right"
            >
              {/* Header */}
              <div className="bg-dark text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                      <Bot size={20} className="text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-dark rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{aiName}</h3>
                    <p className="text-xs text-white/70">Đang trực tuyến</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">
                      Chào bạn! Mình là {aiName}.<br/>
                      Mình có thể tư vấn, báo giá và giải đáp mọi thắc mắc về các gói chụp ảnh cưới. Bạn cần mình hỗ trợ gì không?
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user' 
                        ? 'bg-dark text-white rounded-tr-sm' 
                        : 'bg-white border border-gray-100 shadow-sm text-dark rounded-tl-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 focus:outline-none focus:border-dark/20 text-sm transition-colors"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 flex items-center justify-center bg-dark text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark/90 transition-colors shrink-0"
                >
                  <Send size={16} className="ml-1" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
