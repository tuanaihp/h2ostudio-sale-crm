import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Search, ChevronDown, ChevronUp, Copy, Check, Camera, BookmarkPlus } from 'lucide-react';
import { supabase } from '../supabase';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Consultation, Style, Album } from '../types';
import { useApp } from '../context/AppContext';

interface Session {
  id: string;
  consultation_id?: string;
  phone: string;
  name: string;
  status: 'waiting' | 'open' | 'closed';
  stage: string;
  last_message: string;
  last_message_at: string;
  unread_admin: number;
  created_at: string;
}

interface Msg {
  id: string;
  session_id: string;
  sender: 'customer' | 'admin';
  content: string;
  created_at: string;
}

interface Script {
  id: string;
  phase: string;
  title: string;
  content: string;
}

const STAGE_OPTIONS = [
  { value: 'new',        label: 'Mới tiếp cận' },
  { value: 'discovery',  label: 'Khơi gợi nhu cầu' },
  { value: 'consulting', label: 'Đang tư vấn' },
  { value: 'offer',      label: 'Đang báo giá' },
  { value: 'fomo',       label: 'Tạo urgency' },
  { value: 'closing',    label: 'Đang chốt cọc' },
  { value: 'pre_shoot',  label: 'Đã chốt — dặn dò' },
  { value: 'followup',   label: 'Follow-up' },
];

const STAGE_TO_PHASES: Record<string, string[]> = {
  new:        ['opening'],
  discovery:  ['discovery'],
  consulting: ['value_prop', 'discovery'],
  offer:      ['offer'],
  fomo:       ['fomo'],
  closing:    ['closing'],
  pre_shoot:  ['pre_shoot'],
  followup:   ['followup'],
};

const STAGE_PIPELINE = [
  { value: 'new',        short: 'Mới' },
  { value: 'discovery',  short: 'Khơi gợi' },
  { value: 'consulting', short: 'Tư vấn' },
  { value: 'offer',      short: 'Báo giá' },
  { value: 'fomo',       short: 'Urgency' },
  { value: 'closing',    short: 'Chốt' },
  { value: 'pre_shoot',  short: 'Đã chốt' },
  { value: 'followup',   short: 'Follow-up' },
];

const QUICK_REPLIES: Record<string, { label: string; text: string }[]> = {
  new: [
    { label: '👋 Chào', text: 'Chào em nha! Em đang muốn tham khảo "Trọn gói chụp ảnh cưới" hay "Váy cưới"? Để chị tư vấn chi tiết cho em nhé!' },
    { label: '📋 Hỏi nhu cầu', text: 'Vợ chồng em có ngày cưới chưa bé, vợ chồng em dự định chụp studio hay ngoại cảnh nè em' },
    { label: '📍 Hỏi vị trí', text: 'Vợ chồng em ở đâu em nhỉ? Vợ chồng em dự định bao giờ chụp chưa nè?' },
  ],
  discovery: [
    { label: '⏳ Sắp xếp sớm', text: 'Vậy thời gian này vợ chồng em sắp xếp chụp là vừa thời gian chọn ảnh và duyệt ảnh nữa em nè' },
    { label: '🎨 Hỏi concept', text: 'Vợ chồng em dự định sẽ chụp mấy concept chưa nè? Để chị gửi thêm ảnh concept cho em xem nha 📸' },
    { label: '💡 Studio tiện lợi', text: 'Chụp studio thì lúc nào cũng thoải mái rồi em — không bị nóng, không mất thời gian di chuyển, cô dâu bầu nghén cũng không mệt mà concept rất đa dạng em nè' },
  ],
  consulting: [
    { label: '⏱ Thời gian chụp', text: 'Make up và làm tóc sẽ khoảng 2 tiếng sau đó vck e lên chụp tại studio không phải di chuyển đi đâu nên sẽ không mất nhiều thời gian em nè' },
    { label: '💄 Tự chọn makeup', text: 'Được nha bé iu. Tất cả từ tone make up, kiểu tóc, concept hay trang phục đều là vợ chồng em chọn hết nè. Bên chị sẽ chỉ tư vấn để đúng với mong muốn của vợ chồng em thôi nha' },
    { label: '🖼 Gửi concept', text: 'Để chị gửi em xem thêm các concept chụp tại studio nữa cho vck e dễ quyết định nhé. Hai vợ chồng em có concept nào ưng ý chưa nè gửi chị tư vấn thêm cho em nha' },
  ],
  offer: [
    { label: '💰 Gửi bảng giá', text: 'Chị gửi chi tiết cho em các gói chụp tại studio nha\n\n📷 Gói 1 concept: 4.999.000đ\n📷 Gói 2 concept: 6.999.000đ\n📷 Combo trọn bộ: 9.999.000đ' },
    { label: '🔥 Ưu đãi 48h', text: '🔥 ƯU ĐÃI ĐẶC BIỆT DÀNH RIÊNG CHO EM TRONG 48H\n\nBook lịch Online trong 48h được tặng quà trị giá 3.500.000đ:\n🎁 Nâng cấp chất liệu ảnh (1.500.000đ)\n🎁 Voucher nâng cấp váy (1.500.000đ)\n🎁 Makeup chú rể (500.000đ)\n🎁 Ưu tiên chọn lịch chụp' },
    { label: '🆙 Upsell 12999', text: 'Nếu em muốn đa dạng concept hơn em có thể tham khảo combo 12999 nè — chụp 3 concept, váy cao cấp 6tr, thêm ảnh treo tường. Tính ra chênh không nhiều so với 9999 mà vợ chồng em được nhiều hơn em nè' },
  ],
  fomo: [
    { label: '📅 Lịch sắp kín', text: 'Hôm nay đã có 4 cặp book rồi, lịch chụp đẹp cuối tuần chỉ còn 1-2 slot thôi em ơi! Em chỉ cần cọc 1 triệu là giữ được ưu đãi luôn nha 🌸' },
    { label: '⏰ Ưu đãi 48h hết', text: 'Hôm nay là ngày cuối bên chị tặng gói quà 3tr500k cho khách book Online đó em ơi! ✅ Chỉ cần cọc 1 triệu, giữ ưu đãi — chọn lịch chụp sau cũng được nha' },
    { label: '🖼 Gửi thêm concept', text: 'Chị gửi thêm concept bên chị cho em xem nha — toàn concept độc quyền luôn nè. Nhìn là mê luôn cơ 😍' },
  ],
  closing: [
    { label: '📝 Lấy thông tin', text: 'Vck em đăng ký giữ lịch chụp gửi chị xin thông tin tên và số điện thoại của vợ chồng em nhé' },
    { label: '🏦 Thông tin CK', text: 'Em chuyển khoản ghi họ tên của em và gửi chị ảnh chụp màn hình là được nhớ\n\n➡️ MB Bank – STK: 9098688688888 – NGUYEN THU THUY\n➡️ Vietcombank – STK: 0031000367971 – NGUYEN THU THUY' },
    { label: '✅ Xác nhận cọc', text: 'Chị nhận nha bé\n\nChị hẹn vck em 8h30 [ngày chụp] bé nha\n\nChị gửi phần dặn dò ngày chụp vợ chồng em nhé' },
  ],
  pre_shoot: [
    { label: '📋 Checklist', text: '📝 Chuẩn bị cho ngày chụp nha em:\n\n👰 Cô dâu: quần lót nude/trắng, miếng dán ngực, nails xinh, ngủ đủ giấc, ăn sáng no\n🤵 Chú rể: áo sơ mi trắng, thắt lưng, giày da đen\n🎁 Thiếu gì studio có sẵn — yên tâm nha!\n\n📅 Hẹn gặp vk ck lúc 8h30 nhé 💕' },
    { label: '💳 Nhắc thanh toán', text: 'Ngày chụp hình vợ chồng em cọc thêm 90% hoặc thanh toán hết giúp chị nhớ nha bé 😊' },
    { label: '📍 Gửi định vị', text: 'Hẹn gặp vợ chồng em nhé! 📍 H2O Studio - Gần UBND Đại Bản - An Dương - Hải Phòng\n📞 Ms. Thuỷ H2O: 0783 327 323' },
  ],
  followup: [
    { label: '💬 Hỏi thăm sau chụp', text: 'Hôm nay đi chụp về em thấy thế nào em nè? 🌸\n\nEm có thấy hài lòng với buổi chụp hôm nay không em?\n\nCó gì cho chị xin feedback của vợ chồng em với nha ❤️' },
    { label: '📸 Báo giao ảnh', text: 'Chiều mai ekip photo sẽ gửi ảnh cho vợ chồng em trước 14h chiều nhé\n\nCó bạn bè chuẩn bị cưới nhớ giới thiệu qua H2O em nhé 💕' },
    { label: '🔔 Follow-up chưa chốt', text: 'Chào em nha! Hôm qua chị có tư vấn cho em về các gói chụp cưới, không biết vk ck em đã suy nghĩ xong chưa nè?\n\n📌 Hôm nay là ngày cuối tặng gói quà 3tr5 + ưu tiên chọn lịch đó em ơi! ✅ Chỉ cần cọc 1 triệu là giữ được ngay nha' },
  ],
};

const CRM_STATUS_STYLE: Record<string, string> = {
  new:        'bg-red-100 text-red-700',
  called:     'bg-yellow-100 text-yellow-700',
  contacted:  'bg-yellow-100 text-yellow-700',
  consulting: 'bg-blue-100 text-blue-700',
  quoted:     'bg-purple-100 text-purple-700',
  registered: 'bg-green-100 text-green-700',
};
const CRM_STATUS_LABEL: Record<string, string> = {
  new: 'Mới', called: 'Đã gọi', contacted: 'Đã gọi',
  consulting: 'Tư vấn', quoted: 'Báo giá', registered: 'Đã chốt',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string | null;
  consultations: Consultation[];
}

export function AdminChatPanel({ isOpen, onClose, initialPhone, consultations }: Props) {
  const { styles } = useApp();

  const [sessions, setSessions]           = useState<Session[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [messages, setMessages]           = useState<Msg[]>([]);
  const [input, setInput]                 = useState('');
  const [search, setSearch]               = useState('');
  const [sending, setSending]             = useState(false);
  const [scriptsOpen, setScriptsOpen]     = useState(false);
  const [scripts, setScripts]             = useState<Script[]>([]);
  const [allScripts, setAllScripts]       = useState<Script[]>([]);
  const [atQuery, setAtQuery]             = useState<string | null>(null);
  const [copied, setCopied]               = useState<string | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [albumSearch, setAlbumSearch]     = useState('');

  // Lưu vào kho câu hỏi
  const [saveFaqTarget, setSaveFaqTarget] = useState<{ question: string; answer: string } | null>(null);
  const [saveFaqForm, setSaveFaqForm]     = useState({ question: '', answer: '', category: 'khac', tags: '' });
  const [saveFaqSaving, setSaveFaqSaving] = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const sessionCh    = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messageCh    = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const activeSession      = sessions.find(s => s.id === activeId);
  const linkedConsultation = activeSession
    ? consultations.find(c => c.id === activeSession.consultation_id || c.phone === activeSession.phone)
    : null;

  // Load ALL scripts once when panel opens (for @ search)
  useEffect(() => {
    if (!isOpen) return;
    supabase.from('sale_scripts').select('id, phase, title, content, tags')
      .eq('enabled', true).order('order_num', { ascending: true })
      .then(({ data }) => setAllScripts((data || []) as Script[]));
  }, [isOpen]);

  // Load sessions + realtime subscription
  useEffect(() => {
    if (!isOpen) return;
    loadSessions();
    sessionCh.current = supabase
      .channel('admin_sessions_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, loadSessions)
      .subscribe();
    return () => { sessionCh.current?.unsubscribe(); };
  }, [isOpen]);

  // Auto-select from initialPhone
  useEffect(() => {
    if (!initialPhone || !isOpen) return;
    const match = sessions.find(s => s.phone === initialPhone);
    if (match) setActiveId(match.id);
  }, [initialPhone, sessions, isOpen]);

  // Load messages when session switches
  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    markRead(activeId);
    fetchScripts(activeId);
    messageCh.current?.unsubscribe();
    messageCh.current = supabase
      .channel(`admin_msgs_${activeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `session_id=eq.${activeId}`,
      }, (payload) => {
        const msg = payload.new as Msg;
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        markRead(activeId);
      })
      .subscribe();
    return () => { messageCh.current?.unsubscribe(); };
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadSessions = async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('last_message_at', { ascending: false });
    setSessions((data || []) as Session[]);
  };

  const loadMessages = async (sid: string) => {
    const { data } = await supabase
      .from('chat_messages').select('*').eq('session_id', sid)
      .order('created_at', { ascending: true });
    setMessages((data || []) as Msg[]);
  };

  const markRead = async (sid: string) => {
    await supabase.from('chat_sessions').update({ unread_admin: 0, status: 'open' }).eq('id', sid);
    setSessions(prev => prev.map(s => s.id === sid ? { ...s, unread_admin: 0, status: 'open' } : s));
  };

  const fetchScripts = async (sid: string) => {
    const session = sessions.find(s => s.id === sid);
    const phases = STAGE_TO_PHASES[session?.stage || 'new'] || ['opening'];
    const { data } = await supabase
      .from('sale_scripts').select('id, phase, title, content')
      .in('phase', phases).eq('enabled', true).order('order_num', { ascending: true });
    setScripts((data || []) as Script[]);
  };

  // Chat stage → CRM status map (chỉ cập nhật khi stage tiến về phía trước)
  const STAGE_TO_CRM_STATUS: Record<string, string> = {
    discovery:  'consulting',
    consulting: 'consulting',
    offer:      'quoted',
    fomo:       'quoted',
    closing:    'quoted',
    pre_shoot:  'registered',
    followup:   'contacted',
  };

  const updateStage = async (stage: string) => {
    if (!activeId) return;
    await supabase.from('chat_sessions').update({ stage }).eq('id', activeId);
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, stage } : s));

    // Sync CRM status nếu có consultation liên kết
    const crmStatus = STAGE_TO_CRM_STATUS[stage];
    const consultId = activeSession?.consultation_id;
    if (crmStatus && consultId) {
      supabase.from('consultations').update({ status: crmStatus }).eq('id', consultId).then(() => {});
    }

    const phases = STAGE_TO_PHASES[stage] || ['opening'];
    const { data } = await supabase.from('sale_scripts').select('id, phase, title, content')
      .in('phase', phases).eq('enabled', true).order('order_num', { ascending: true });
    setScripts((data || []) as Script[]);
  };

  const send = async () => {
    if (!input.trim() || !activeId || sending) return;
    setSending(true);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const content = input.trim();
    setMessages(prev => [...prev, { id, session_id: activeId, sender: 'admin', content, created_at: now }]);
    setInput('');
    await supabase.from('chat_messages').insert({ id, session_id: activeId, sender: 'admin', content, created_at: now });
    await supabase.from('chat_sessions').update({ last_message: content, last_message_at: now, status: 'open' }).eq('id', activeId);
    setSending(false);
  };

  const copyScript = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const useScript = (content: string) => {
    setInput(content);
    setScriptsOpen(false);
  };

  // @ script search helpers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    const atIdx = val.lastIndexOf('@');
    if (atIdx >= 0 && (atIdx === 0 || val[atIdx - 1] === ' ' || val[atIdx - 1] === '\n')) {
      setAtQuery(val.slice(atIdx + 1));
    } else {
      setAtQuery(null);
    }
  };

  const insertAtScript = (content: string) => {
    const atIdx = input.lastIndexOf('@');
    const newVal = atIdx >= 0 ? input.slice(0, atIdx) + content : content;
    setInput(newVal);
    setAtQuery(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const openSaveFaq = (msg: Msg, index: number) => {
    // Pre-fill answer với tin nhắn admin liền kề tiếp theo (nếu có)
    const nextAdminMsg = messages.slice(index + 1).find(m => m.sender === 'admin');
    setSaveFaqForm({ question: msg.content, answer: nextAdminMsg?.content || '', category: 'khac', tags: '' });
    setSaveFaqTarget({ question: msg.content, answer: nextAdminMsg?.content || '' });
  };

  const saveFaq = async () => {
    if (!saveFaqForm.question.trim() || !saveFaqForm.answer.trim()) return;
    setSaveFaqSaving(true);
    const tags = saveFaqForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    await supabase.from('customer_faqs').insert({
      id: crypto.randomUUID(),
      question: saveFaqForm.question.trim(),
      answer: saveFaqForm.answer.trim(),
      category: saveFaqForm.category,
      tags, source: 'from_chat', is_approved: true, usage_count: 0,
      created_at: new Date().toISOString(),
    });
    setSaveFaqSaving(false);
    setSaveFaqTarget(null);
  };

  const insertAlbumLink = (style: Style, album: Album) => {
    const url = `${window.location.origin}/style/${style.slug}/album/${album.slug}`;
    const link = `💕 Xem album này nhé anh/chị: ${url}`;
    setInput(prev => prev ? prev + '\n' + link : link);
    setShowAlbumPicker(false);
    setAlbumSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const allAlbumsForPicker = styles
    .filter((s: Style) => !s.deleted)
    .flatMap((s: Style) => (s.albums || []).filter((a: Album) => !a.deleted).map((a: Album) => ({ style: s, album: a })));

  const filteredAlbumsForPicker = albumSearch
    ? allAlbumsForPicker.filter(({ style, album }) => {
        const q = albumSearch.toLowerCase();
        return album.title.toLowerCase().includes(q) || style.title.toLowerCase().includes(q);
      })
    : allAlbumsForPicker;

  const atResults = atQuery !== null
    ? allScripts.filter(s => {
        if (!atQuery) return true;
        const q = atQuery.toLowerCase();
        return s.title.toLowerCase().includes(q)
          || s.phase.toLowerCase().includes(q)
          || s.content.toLowerCase().includes(q)
          || ((s as any).tags || []).some((t: string) => t.toLowerCase().includes(q));
      }).slice(0, 6)
    : [];

  const totalUnread = sessions.reduce((s, x) => s + (x.unread_admin || 0), 0);

  const filtered = sessions.filter(s =>
    (s.name + s.phone + s.last_message).toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  const isAnon     = (s: Session) => s.phone.startsWith('anon_');
  const displayName = (s: Session) => s.name || (isAnon(s) ? 'Khách ẩn danh' : s.phone);
  const displayPhone = (s: Session) => isAnon(s) ? 'Chưa để lại SĐT' : s.phone;
  const initials   = (s: Session) => s.name ? s.name[0].toUpperCase() : (isAnon(s) ? '?' : s.phone.slice(-2));

  // Urgency từ thời gian chờ: low(<1h)=green, medium(1-4h)=yellow, high(>4h)=red
  const getWaitUrgency = (s: Session) => {
    if (s.status !== 'waiting') return null;
    const diffH = (Date.now() - new Date(s.last_message_at).getTime()) / 3600000;
    if (diffH < 1)  return 'low';
    if (diffH < 4)  return 'medium';
    return 'high';
  };
  const URGENCY_BADGE: Record<string, string> = {
    low:    'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high:   'bg-red-100 text-red-700 font-bold animate-pulse',
  };
  const URGENCY_LABEL: Record<string, string> = {
    low:    'Chờ < 1h',
    medium: 'Chờ > 1h ⚡',
    high:   'Chờ > 4h 🔴',
  };
  const URGENCY_BORDER: Record<string, string> = {
    low:    'border-l-green-400',
    medium: 'border-l-yellow-400',
    high:   'border-l-red-500',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl h-full bg-white flex shadow-2xl">

        {/* ── LEFT: Session list ── */}
        <div className="w-72 border-r flex flex-col bg-gray-50 shrink-0">
          <div className="p-4 border-b bg-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Hộp thư chat</h3>
                {totalUnread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none">{totalUnread}</span>
                )}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={17} />
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full bg-gray-100 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tìm tên, SĐT..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="text-center text-xs text-gray-400 mt-10 px-4">
                Chưa có khách nào chat.<br />Khi khách bắt đầu chat trên website, tin nhắn sẽ hiện ở đây.
              </div>
            )}
            {filtered.map(session => {
              const urgency = getWaitUrgency(session);
              const isActive = activeId === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => setActiveId(session.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-white transition-colors border-l-2 ${
                    isActive
                      ? 'bg-blue-50 border-l-blue-500'
                      : urgency
                        ? URGENCY_BORDER[urgency]
                        : 'border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      urgency === 'high' ? 'bg-red-100 text-red-600' :
                      urgency === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {initials(session)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{session.name || session.phone}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatDistanceToNow(new Date(session.last_message_at), { locale: vi, addSuffix: false })}
                        </span>
                      </div>
                      {session.name && <p className="text-[10px] text-gray-400">{session.phone}</p>}
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-gray-500 truncate">{session.last_message || 'Bắt đầu trò chuyện'}</p>
                        {session.unread_admin > 0 && (
                          <span className="bg-red-500 text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1 shrink-0 ml-1">
                            {session.unread_admin}
                          </span>
                        )}
                      </div>
                      {urgency && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${URGENCY_BADGE[urgency]}`}>
                          {URGENCY_LABEL[urgency]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Conversation ── */}
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageCircle size={44} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium">Chọn một cuộc trò chuyện</p>
              <p className="text-xs mt-1">Tin nhắn từ khách hàng sẽ hiện ở đây theo thời gian thực</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0">

            {/* Header */}
            <div className="border-b px-4 py-3 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  (activeSession && getWaitUrgency(activeSession)) === 'high' ? 'bg-red-100 text-red-600' :
                  (activeSession && getWaitUrgency(activeSession)) === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {activeSession ? initials(activeSession) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900">
                      {activeSession ? displayName(activeSession) : 'Khách hàng'}
                      {activeSession && isAnon(activeSession) && (
                        <span className="ml-2 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold align-middle">Chưa có SĐT</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{activeSession ? displayPhone(activeSession) : ''}</p>
                    {linkedConsultation && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CRM_STATUS_STYLE[linkedConsultation.status] || 'bg-gray-100 text-gray-600'}`}>
                        CRM: {CRM_STATUS_LABEL[linkedConsultation.status] || linkedConsultation.status}
                      </span>
                    )}
                  </div>
                  {/* Customer profile mini */}
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-400">
                    {linkedConsultation?.source && (
                      <span>📥 {linkedConsultation.source.replace(/_/g, ' ')}</span>
                    )}
                    {activeSession?.created_at && (
                      <span>🕐 {formatDistanceToNow(new Date(activeSession.created_at), { locale: vi, addSuffix: true })}</span>
                    )}
                    {messages.length > 0 && (
                      <span>💬 {messages.length} tin</span>
                    )}
                    {activeSession && getWaitUrgency(activeSession) && (() => {
                      const u = getWaitUrgency(activeSession)!;
                      return (
                        <span className={`px-1.5 py-0.5 rounded-full font-semibold ${URGENCY_BADGE[u]}`}>
                          {URGENCY_LABEL[u]}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Stage pipeline visual */}
              <div className="mt-2.5 flex items-center gap-0 overflow-x-auto pb-0.5">
                {STAGE_PIPELINE.map((stage, idx) => {
                  const currentIdx = STAGE_PIPELINE.findIndex(s => s.value === activeSession?.stage);
                  const isPast    = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <React.Fragment key={stage.value}>
                      {idx > 0 && (
                        <div className={`h-px w-2.5 shrink-0 ${isPast ? 'bg-blue-400' : 'bg-gray-200'}`} />
                      )}
                      <button
                        onClick={() => updateStage(stage.value)}
                        title={STAGE_OPTIONS.find(o => o.value === stage.value)?.label}
                        className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-semibold transition-all ${
                          isCurrent ? 'bg-blue-600 text-white shadow-sm' :
                          isPast    ? 'bg-blue-100 text-blue-500' :
                          'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {stage.short}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 && (
                <p className="text-center text-xs text-gray-400 mt-6">Cuộc trò chuyện bắt đầu — nhắn gì đó để chào khách 👋</p>
              )}
              {messages.map((msg, idx) => (
                <div key={msg.id} className={`flex group ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'customer' && (
                    <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 mr-2 shrink-0 self-end">
                      {activeSession ? initials(activeSession) : '?'}
                    </div>
                  )}
                  <div className="flex items-end gap-1.5">
                    <div className={`max-w-[68%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      msg.sender === 'admin'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender === 'admin' ? 'text-blue-200' : 'text-gray-400'}`}>
                        {format(new Date(msg.created_at), 'HH:mm')}
                        {' · '}
                        {msg.sender === 'admin' ? 'Bạn' : (activeSession?.name || 'Khách')}
                      </p>
                    </div>
                    {/* Nút Lưu vào kho — chỉ hiện trên tin nhắn của khách */}
                    {msg.sender === 'customer' && (
                      <button
                        onClick={() => openSaveFaq(msg, idx)}
                        title="📌 Lưu vào kho câu hỏi"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg shrink-0 mb-1"
                      >
                        <BookmarkPlus size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Script hints */}
            {scripts.length > 0 && (
              <div className="border-t bg-amber-50 shrink-0">
                <button
                  onClick={() => setScriptsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs text-amber-700 font-semibold hover:bg-amber-100 transition-colors"
                >
                  <span>💡 Kịch bản gợi ý cho giai đoạn này ({scripts.length})</span>
                  {scriptsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {scriptsOpen && (
                  <div className="px-4 pb-3 space-y-2 max-h-44 overflow-y-auto">
                    {scripts.map(s => (
                      <div key={s.id} className="bg-white rounded-lg border border-amber-200 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-amber-800">{s.title}</p>
                          <div className="flex gap-2 shrink-0 items-center">
                            <button
                              onClick={() => copyScript(s.content, s.id)}
                              className="text-gray-400 hover:text-amber-600 transition-colors"
                              title="Copy"
                            >
                              {copied === s.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                            </button>
                            <button
                              onClick={() => useScript(s.content)}
                              className="text-[11px] text-blue-600 font-semibold hover:underline"
                            >
                              Dùng
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{s.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* @ Script dropdown */}
            {atQuery !== null && (
              <div className="border-t bg-white px-3 pt-2 pb-1">
                <p className="text-[10px] text-gray-400 mb-1.5 font-medium">
                  {atQuery ? `Kịch bản khớp "@${atQuery}"` : 'Tất cả kịch bản — gõ thêm để lọc'}
                </p>
                {atResults.length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">Không tìm thấy kịch bản nào</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {atResults.map(s => (
                      <button
                        key={s.id}
                        onClick={() => insertAtScript(s.content)}
                        className="w-full text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 transition-colors"
                      >
                        <p className="text-xs font-semibold text-amber-800">{s.title}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{s.content}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Album picker */}
            {showAlbumPicker && (
              <div className="border-t bg-white px-3 pt-3 pb-2 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700">📷 Chọn album để gửi link</p>
                  <button
                    onClick={() => { setShowAlbumPicker(false); setAlbumSearch(''); }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="w-full bg-gray-100 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Tìm album theo tên hoặc style..."
                    value={albumSearch}
                    onChange={e => setAlbumSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                {filteredAlbumsForPicker.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center">Không tìm thấy album nào</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-0.5">
                    {filteredAlbumsForPicker.map(({ style, album }) => (
                      <button
                        key={album.id}
                        onClick={() => insertAlbumLink(style, album)}
                        className="text-left rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                      >
                        <div className="h-16 bg-gray-100 overflow-hidden">
                          {album.coverImage ? (
                            <img
                              src={album.coverImage}
                              alt={album.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera size={18} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="p-1.5">
                          <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{album.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{style.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick reply chips */}
            {activeSession && !showAlbumPicker && atQuery === null && (
              <div className="border-t bg-gray-50 px-3 py-2 flex gap-1.5 overflow-x-auto shrink-0">
                {(QUICK_REPLIES[activeSession.stage || 'new'] || QUICK_REPLIES.new).map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(qr.text); setTimeout(() => inputRef.current?.focus(), 50); }}
                    className="shrink-0 text-[11px] bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-700 px-2.5 py-1 rounded-full transition-colors font-medium whitespace-nowrap"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}

            {/* Reply input */}
            <div className="border-t bg-white p-3 flex gap-2 items-end shrink-0">
              <button
                onClick={() => { setShowAlbumPicker(v => !v); setAlbumSearch(''); }}
                title="Chọn album để gửi link"
                className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                  showAlbumPicker
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300'
                }`}
              >
                <Camera size={16} />
              </button>
              <textarea
                ref={inputRef}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Nhập tin nhắn... (@tên để tìm kịch bản · Enter gửi)"
                value={input}
                onChange={handleInputChange}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setAtQuery(null); setShowAlbumPicker(false); return; }
                  if (e.key === 'Enter' && !e.shiftKey && atQuery === null) { e.preventDefault(); send(); }
                }}
                rows={2}
                disabled={sending}
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="bg-blue-600 text-white rounded-xl px-4 disabled:opacity-40 hover:bg-blue-700 transition-colors py-2.5 shrink-0"
              >
                <Send size={16} />
              </button>
            </div>

          </div>
        )}
      </div>

      {/* ── Modal Lưu vào kho câu hỏi ── */}
      {saveFaqTarget && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <BookmarkPlus size={18} className="text-amber-500" />
                <h3 className="font-bold text-dark text-sm">📌 Lưu vào Kho Câu Hỏi</h3>
              </div>
              <button onClick={() => setSaveFaqTarget(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">❓ Câu hỏi của khách</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
                  rows={2}
                  value={saveFaqForm.question}
                  onChange={e => setSaveFaqForm(f => ({ ...f, question: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  💬 Câu trả lời tốt nhất
                  {saveFaqForm.answer && <span className="ml-1 font-normal text-gray-400">(tự động từ tin nhắn kế tiếp của bạn)</span>}
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
                  rows={4}
                  placeholder="Nhập câu trả lời chốt sale tốt nhất..."
                  value={saveFaqForm.answer}
                  onChange={e => setSaveFaqForm(f => ({ ...f, answer: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">📂 Nhóm</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    value={saveFaqForm.category}
                    onChange={e => setSaveFaqForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option value="opening">💌 Mở đầu</option>
                    <option value="discovery">📌 Khơi gợi nhu cầu</option>
                    <option value="value_prop">💎 Giá trị – USP</option>
                    <option value="offer">🔥 Ưu đãi đặc biệt</option>
                    <option value="fomo">⏳ Tạo FOMO</option>
                    <option value="closing">💳 Chốt cọc</option>
                    <option value="pre_shoot">🌈 Trước ngày chụp</option>
                    <option value="followup">🔔 Follow-up</option>
                    <option value="faq">❓ Q&A – Từ chối</option>
                    <option value="khac">💬 Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1"># Tags (cách nhau dấu phẩy)</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    placeholder="giá, cưới..."
                    value={saveFaqForm.tags}
                    onChange={e => setSaveFaqForm(f => ({ ...f, tags: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => setSaveFaqTarget(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={saveFaq}
                disabled={!saveFaqForm.question.trim() || !saveFaqForm.answer.trim() || saveFaqSaving}
                className="flex-1 bg-amber-500 text-white rounded-xl py-2 text-sm font-bold hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                {saveFaqSaving ? 'Đang lưu...' : '💾 Lưu vào kho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
