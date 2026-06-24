import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { expandQuery } from '../utils/synonyms';
import { useApp } from '../context/AppContext';
import { sendLeadNotifications } from '../utils/sendLeadNotifications';
import { APP_CONFIG } from '../data/mockData';

const SESSION_KEY   = 'h2o_live_session_id';
const AUTO_OPEN_KEY = 'h2o_chat_auto_opened';

interface Msg {
  id: string;
  sender: 'customer' | 'admin';
  content: string;
  created_at: string;
}

export function playNotifSound() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

interface Props {
  /** Khi dùng standalone (không có props) → tự quản lý state + tự có nút bubble */
  controlledOpen?: boolean;
  onClose?: () => void;
  chatBotEnabled?: boolean;
  chatBotTier2Enabled?: boolean;
  integrationConfig?: {
    chatApiEnabled?: boolean; chatApiUrl?: string;
    chatApiKey?: string; chatApiModelName?: string;
  };
}

export function LiveChatBubble({ controlledOpen, onClose, chatBotEnabled, chatBotTier2Enabled, integrationConfig }: Props = {}) {
  const { settings } = useApp();
  const isControlled = controlledOpen !== undefined;

  // Tên nhân viên từ settings
  const staffName = settings?.chatStaffName?.trim() || '';
  const staffInitials = staffName
    ? staffName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : 'H';

  const [_open, _setOpen] = useState(false);
  const open    = isControlled ? (controlledOpen ?? false) : _open;
  const setOpen = (v: boolean) => {
    if (isControlled) { if (!v && onClose) onClose(); }
    else _setOpen(v);
  };

  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [isAnon, setIsAnon]         = useState(true);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [isThinking, setIsThinking] = useState(false); // bot đang gõ...
  const [hasNew, setHasNew]         = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [formName, setFormName]     = useState('');
  const [formPhone, setFormPhone]   = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formDone, setFormDone]     = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const openRef    = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);

  // Auto-open sau 10 giây — chỉ khi standalone (không controlled)
  useEffect(() => {
    if (isControlled) return;
    if (sessionStorage.getItem(AUTO_OPEN_KEY)) return;
    const timer = setTimeout(() => {
      if (openRef.current) return;
      sessionStorage.setItem(AUTO_OPEN_KEY, '1');
      playNotifSound();
      _setOpen(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isControlled]);

  useEffect(() => {
    if (!open) return;
    initSession();
    return () => { channelRef.current?.unsubscribe(); };
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showForm]);

  const subscribe = (sid: string) => {
    channelRef.current?.unsubscribe();
    channelRef.current = supabase
      .channel(`live_${sid}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'chat_messages', filter: `session_id=eq.${sid}`,
      }, (payload) => {
        const msg = payload.new as Msg;
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender === 'admin' && !openRef.current) {
          setHasNew(true);
          playNotifSound();
        }
      })
      .subscribe();
  };

  const initSession = async () => {
    const savedId = localStorage.getItem(SESSION_KEY);
    if (savedId) {
      const { data } = await supabase
        .from('chat_sessions').select('id, phone, name')
        .eq('id', savedId).maybeSingle();
      if (data) {
        setSessionId(data.id);
        const anon = (data.phone as string).startsWith('anon_');
        setIsAnon(anon);
        setFormDone(!anon);
        const { data: msgs } = await supabase
          .from('chat_messages').select('id, sender, content, created_at')
          .eq('session_id', data.id).order('created_at', { ascending: true });
        setMessages((msgs || []) as Msg[]);
        subscribe(data.id);
        if (anon && (msgs || []).length > 0) setShowForm(true);
        return;
      }
    }
    const sid  = crypto.randomUUID();
    const anon = `anon_${sid.slice(0, 8)}`;
    localStorage.setItem(SESSION_KEY, sid);
    await supabase.from('chat_sessions').insert({
      id: sid, phone: anon, name: '',
      status: 'waiting', stage: 'new',
      last_message: '', last_message_at: new Date().toISOString(),
      unread_admin: 0, created_at: new Date().toISOString(),
    });
    setSessionId(sid);
    setIsAnon(true);
    setMessages([]);
    subscribe(sid);
    setTimeout(() => setShowForm(true), 1500);
  };

  // Tầng 1: tìm trong customer_faqs (Q&A thực tế) + sale_scripts, dùng từ điển đồng nghĩa
  const callBotTier1 = async (customerMessage: string, sid: string) => {
    try {
      setIsThinking(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const [{ data: faqData }, { data: scriptData }, { data: promoData }] = await Promise.all([
        supabase.from('customer_faqs').select('id, question, answer, tags, usage_count').eq('is_approved', true),
        supabase.from('sale_scripts').select('id, phase, title, content, tags').eq('enabled', true).order('order_num', { ascending: true }),
        supabase.from('promotions').select('title, short_desc, emoji, end_date').eq('enabled', true).eq('show_on_website', true).lte('start_date', todayStr).gte('end_date', todayStr).limit(2),
      ]);

      const thinkingDelay1 = settings?.chatBotThinkingDelay ?? 1200;
      await new Promise(r => setTimeout(r, thinkingDelay1 + Math.random() * 500));

      // Mở rộng từ khóa bằng từ điển đồng nghĩa
      const words = expandQuery(customerMessage);

      // TF-IDF: tính IDF cho từng từ từ toàn bộ kho FAQ + kịch bản
      // Từ xuất hiện ở nhiều doc (phổ biến như "có", "không") → IDF thấp → ít điểm
      // Từ xuất hiện ít doc (đặc trưng như "ngoại cảnh", "đặt cọc") → IDF cao → nhiều điểm
      const allDocs: string[] = [
        ...(faqData || []).map((f: any) => [f.question, f.answer, ...(f.tags || [])].join(' ').toLowerCase()),
        ...(scriptData || []).map((s: any) => [s.title, s.content, ...(s.tags || [])].join(' ').toLowerCase()),
      ];
      const N = Math.max(allDocs.length, 1);
      const df: Record<string, number> = {};
      allDocs.forEach(doc => {
        new Set(doc.split(/\s+/).filter(w => w.length >= 2)).forEach(w => { df[w] = (df[w] || 0) + 1; });
      });
      // Smoothed IDF: log((N+1)/(df+1)) + 1 — tránh chia cho 0, từ lạ vẫn được tính
      const idf = (w: string) => Math.log((N + 1) / ((df[w] || 0) + 1)) + 1;

      const scoreItem = (text1: string, text2: string, tags: string[], w3: number, w2: number, w1: number) => {
        let score = 0;
        words.forEach(w => {
          const weight = idf(w); // từ phổ biến → nhỏ; từ đặc trưng → lớn
          if (text1.toLowerCase().includes(w)) score += w3 * weight;
          if (tags.some(t => t.toLowerCase().includes(w))) score += w2 * weight;
          if (text2.toLowerCase().includes(w)) score += w1 * weight;
        });
        return score;
      };

      // FAQ thực tế: câu hỏi (+4), tags (+2), câu trả lời (+1)
      // + usage_count boost: FAQ được dùng nhiều → ưu tiên cao hơn (log scale tránh FAQ cũ lấn át)
      const scoredFaqs = (faqData || []).map((f: any) => ({
        type: 'faq' as const, item: f,
        score: scoreItem(f.question, f.answer, f.tags || [], 4, 2, 1)
          + Math.log1p(f.usage_count || 0) * 0.3,
      }));

      // Kịch bản: tiêu đề (+3), tags (+2), nội dung (+1)
      const scoredScripts = (scriptData || []).map((s: any) => ({
        type: 'script' as const, item: s,
        score: scoreItem(s.title, s.content, s.tags || [], 3, 2, 1),
      }));

      const best = [...scoredFaqs, ...scoredScripts].sort((a, b) => b.score - a.score)[0];

      // Format promotions footer (tối đa 2 KM đang chạy)
      const activePromos = promoData || [];
      const promoFooter = activePromos.length > 0
        ? '\n\n🎉 Ưu đãi đang chạy:\n' + activePromos.map((p: any) => {
            const endDate = new Date(p.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            return `${p.emoji} ${p.title} — ${p.short_desc} (hết ${endDate})`;
          }).join('\n')
        : '';

      // Kiểm tra câu hỏi có liên quan giá/ưu đãi không
      const PRICE_KEYWORDS = ['giá', 'phí', 'tiền', 'bao nhiêu', 'ưu đãi', 'khuyến', 'giảm', 'sale', 'offer'];
      const isPriceQuery = PRICE_KEYWORDS.some(k => customerMessage.toLowerCase().includes(k));

      let text: string;
      if (best && best.score > 0) {
        if (best.type === 'faq') {
          text = best.item.answer;
          supabase.from('customer_faqs')
            .update({ usage_count: (best.item.usage_count || 0) + 1 })
            .eq('id', best.item.id).then(() => {});
          // Thêm promo nếu câu hỏi về giá hoặc FAQ thuộc nhóm offer/fomo/closing
          const promoPhases = ['offer', 'fomo', 'closing'];
          if ((isPriceQuery || promoPhases.includes(best.item.category)) && promoFooter) {
            text += promoFooter;
          }
        } else {
          const c = best.item.content as string;
          text = c.length > 450 ? c.slice(0, 450) + '...' : c;
          // Thêm promo nếu kịch bản thuộc giai đoạn báo giá/chốt
          const promoPhases = ['offer', 'fomo', 'closing'];
          if ((isPriceQuery || promoPhases.includes(best.item.phase)) && promoFooter) {
            text += promoFooter;
          }
        }
      } else {
        // Fallback: không match được — thêm Zalo/Hotline để khách liên hệ trực tiếp
        const zaloUrl = APP_CONFIG.zaloUrl;
        const hotline = APP_CONFIG.hotline;
        let cta = '';
        if (zaloUrl) cta += `\n💬 Chat Zalo ngay: ${zaloUrl}`;
        if (hotline) cta += `\n📞 Hotline: ${hotline}`;
        text = `Dạ em cảm ơn anh/chị đã liên hệ H2O Studio! Để được tư vấn chi tiết và nhanh nhất, anh/chị vui lòng để lại số điện thoại ạ 💕${cta}`;
        if (promoFooter) text += promoFooter;
        // Tự học: lưu câu hỏi chưa trả lời để admin duyệt
        const q = customerMessage.trim();
        if (q.length >= 8) {
          supabase.from('customer_faqs').insert({
            id: crypto.randomUUID(),
            question: q, answer: '', category: 'khac', tags: [],
            source: 'from_chat_auto', is_approved: false, usage_count: 0,
            created_at: new Date().toISOString(),
          }).then(() => {});
        }
      }

      const botId  = crypto.randomUUID();
      const botNow = new Date().toISOString();
      await supabase.from('chat_messages').insert({ id: botId, session_id: sid, sender: 'admin', content: text, created_at: botNow });
      await supabase.from('chat_sessions').update({ last_message: text, last_message_at: botNow }).eq('id', sid);
    } catch (e) {
      console.error('Bot Tầng 1 error:', e);
    } finally {
      setIsThinking(false);
    }
  };

  // Tầng 2: Gemini/ChatGPT + kịch bản làm context
  const callBotTier2 = async (customerMessage: string, currentMessages: Msg[], sid: string) => {
    try {
      setIsThinking(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const [{ data: sess }, { data: scriptData }, { data: promoData }] = await Promise.all([
        supabase.from('chat_sessions').select('stage').eq('id', sid).maybeSingle(),
        supabase.from('sale_scripts').select('id, phase, title, content').eq('enabled', true).order('order_num', { ascending: true }),
        supabase.from('promotions').select('title, short_desc, emoji, end_date, content').eq('enabled', true).eq('show_on_website', true).lte('start_date', todayStr).gte('end_date', todayStr).limit(3),
      ]);

      const thinkingDelay = settings?.chatBotThinkingDelay ?? 1200;
      await new Promise(r => setTimeout(r, thinkingDelay + Math.random() * 400));

      const res = await fetch('/api/live-chat-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: customerMessage,
          stage: (sess as any)?.stage || 'new',
          scripts: scriptData || [],
          history: currentMessages.slice(-10),
          integrationConfig,
          activePromos: promoData || [],
        }),
      });
      if (!res.ok) return;
      const { text } = await res.json();
      if (!text) return;

      const botId  = crypto.randomUUID();
      const botNow = new Date().toISOString();
      await supabase.from('chat_messages').insert({ id: botId, session_id: sid, sender: 'admin', content: text, created_at: botNow });
      await supabase.from('chat_sessions').update({ last_message: text, last_message_at: botNow }).eq('id', sid);
    } catch (e) {
      console.error('Bot Tầng 2 error:', e);
    } finally {
      setIsThinking(false);
    }
  };

  const send = async () => {
    if (!input.trim() || !sessionId || sending) return;
    setSending(true);
    const id      = crypto.randomUUID();
    const now     = new Date().toISOString();
    const content = input.trim();
    const nextMsgs = [...messages, { id, sender: 'customer' as const, content, created_at: now }];
    setMessages(nextMsgs);
    setInput('');
    await supabase.from('chat_messages').insert({ id, session_id: sessionId, sender: 'customer', content, created_at: now });
    await supabase.from('chat_sessions').update({
      last_message: content, last_message_at: now, status: 'waiting',
      unread_admin: messages.filter(m => m.sender === 'customer').length + 1,
    }).eq('id', sessionId);
    if (isAnon && !formDone) setTimeout(() => setShowForm(true), 800);
    setSending(false);

    // Tầng 2 ưu tiên hơn Tầng 1; nếu cả hai đều bật thì chạy Tầng 2
    if (chatBotTier2Enabled && sessionId) {
      callBotTier2(content, nextMsgs, sessionId);
    } else if (chatBotEnabled && sessionId) {
      callBotTier1(content, sessionId);
    }
  };

  const submitInfo = async () => {
    const phone = formPhone.trim();
    const name  = formName.trim();
    if (phone.length < 9 || !sessionId) return;
    setFormSaving(true);
    await supabase.from('chat_sessions').update({ phone, name, status: 'waiting' }).eq('id', sessionId);
    const { data: existing } = await supabase
      .from('consultations').select('id').eq('phone', phone).limit(1).maybeSingle();
    if (!existing) {
      const consultId = crypto.randomUUID();
      await supabase.from('consultations').insert({
        id: consultId, name: name || phone, phone,
        status: 'new', source: 'website_chat',
        message: 'Khách liên hệ qua Live Chat trên website',
        created_at: new Date().toISOString(),
      });
      await supabase.from('chat_sessions').update({ consultation_id: consultId }).eq('id', sessionId);
    } else {
      await supabase.from('chat_sessions').update({ consultation_id: (existing as any).id }).eq('id', sessionId);
    }
    localStorage.setItem('h2o_user_phone', phone);
    const confirmId = crypto.randomUUID();
    await supabase.from('chat_messages').insert({
      id: confirmId, session_id: sessionId, sender: 'customer',
      content: `📋 Thông tin của tôi: ${name ? name + ' — ' : ''}${phone}`,
      created_at: new Date().toISOString(),
    });
    // Gửi thông báo Telegram + Lark
    sendLeadNotifications({ name: name || phone, phone, source: 'website_chat', settings });
    setIsAnon(false);
    setFormDone(true);
    setShowForm(false);
    setFormSaving(false);
  };

  // Panel chat — Compact Bubble (không che màn hình)
  const chatPanel = (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 16 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="fixed z-50 bg-white flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-100
                 right-3 w-[calc(100vw-24px)] max-w-[320px] max-h-[min(420px,62vh)]
                 sm:bottom-8 sm:right-8 sm:w-[340px] sm:max-h-none sm:h-[500px]"
      style={{ transformOrigin: 'bottom right', bottom: 'max(96px, calc(env(safe-area-inset-bottom) + 92px))' }}
    >

      {/* Header */}
      <div className="bg-gradient-to-br from-secondary via-primary to-primary text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
              {staffName ? staffInitials : <User size={18} />}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-primary rounded-full" />
          </div>
          <div>
            <p className="font-bold text-sm">{staffName || 'Tư vấn viên H2O Studio'}</p>
            <p className="text-xs text-white/80">H2O Studio · đang trực tuyến 🟢</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 space-y-2">
        <div className="flex justify-start">
          <div className="w-7 h-7 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center text-white text-[11px] font-bold mr-1.5 shrink-0 self-end">{staffInitials}</div>
          <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100 px-3 py-2 text-sm shadow-sm max-w-[78%]">
            <p>Xin chào! Tư vấn viên H2O Studio sẵn sàng hỗ trợ anh/chị 💕</p>
            <p className="text-[10px] text-gray-400 mt-0.5">H2O Studio</p>
          </div>
        </div>

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'admin' && (
              <div className="w-7 h-7 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center text-white text-[11px] font-bold mr-1.5 shrink-0 self-end">{staffInitials}</div>
            )}
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
              msg.sender === 'customer'
                ? 'bg-gradient-to-br from-secondary via-primary to-primary text-white rounded-br-sm'
                : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-[10px] mt-0.5 ${msg.sender === 'customer' ? 'text-white/70' : 'text-gray-400'}`}>
                {format(new Date(msg.created_at), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}

        {showForm && !formDone && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 mx-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-primary" />
                <p className="text-xs font-semibold text-primary">Để lại thông tin nhận tư vấn</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">Tư vấn viên sẽ gọi lại xác nhận lịch cho anh/chị 😊</p>
            <div className="space-y-1.5">
              <input
                className="w-full border border-primary/20 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Tên anh/chị (không bắt buộc)"
                value={formName} onChange={e => setFormName(e.target.value)}
              />
              <input
                className="w-full border border-primary/20 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Số điện thoại *" type="tel"
                value={formPhone} onChange={e => setFormPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitInfo()}
              />
              <button
                onClick={submitInfo}
                disabled={formPhone.trim().length < 9 || formSaving}
                className="w-full bg-gradient-to-r from-secondary to-primary text-white rounded-lg py-1.5 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {formSaving ? 'Đang lưu...' : 'Gửi thông tin'}
              </button>
            </div>
          </div>
        )}

        {/* Typing indicator — nhân viên đang gõ */}
        {isThinking && (
          <div className="flex justify-start items-end gap-1.5">
            <div className="w-7 h-7 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {staffInitials}
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm border border-gray-100 px-4 py-3 shadow-sm flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.8s' }}
                />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 pb-1">{staffName || 'H2O Studio'} đang gõ...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white p-3 flex gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
        <input
          className="flex-1 border border-gray-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Nhắn tin với tư vấn viên..."
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={sending} autoFocus={open}
        />
        <button
          onClick={send} disabled={!input.trim() || sending}
          className="bg-gradient-to-br from-secondary to-primary text-white rounded-full p-2.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send size={15} />
        </button>
      </div>
    </motion.div>
  );

  // Standalone mode: có nút bubble riêng
  if (!isControlled) {
    return (
      <div className="fixed right-4 z-50 flex flex-col items-end sm:right-6"
           style={{ bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 16px))' }}>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { _setOpen(true); setHasNew(false); }}
            className="w-14 h-14 bg-gradient-to-br from-secondary via-primary to-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center relative hover:opacity-90 transition-opacity"
          >
            <User size={24} />
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white" />
            </span>
            {hasNew && (
              <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse">!</span>
            )}
          </motion.button>
        )}
        <AnimatePresence>{open && chatPanel}</AnimatePresence>
      </div>
    );
  }

  // Controlled mode: không có nút riêng, panel nổi fixed
  return <AnimatePresence>{open && chatPanel}</AnimatePresence>;
}
