import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Search, ChevronDown, ChevronUp, Copy, Check, Camera } from 'lucide-react';
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

  const updateStage = async (stage: string) => {
    if (!activeId) return;
    await supabase.from('chat_sessions').update({ stage }).eq('id', activeId);
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, stage } : s));
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
            {filtered.map(session => (
              <button
                key={session.id}
                onClick={() => setActiveId(session.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-white transition-colors ${
                  activeId === session.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    session.status === 'waiting' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
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
                    {session.status === 'waiting' && (
                      <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold mt-0.5 inline-block">
                        Chờ phản hồi
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
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
            <div className="border-b px-4 py-3 flex items-center gap-3 bg-white shrink-0">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-gray-400">Giai đoạn:</span>
                  <select
                    value={activeSession?.stage || 'new'}
                    onChange={e => updateStage(e.target.value)}
                    className="text-[10px] border-0 bg-transparent text-blue-600 font-semibold focus:outline-none cursor-pointer"
                  >
                    {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 && (
                <p className="text-center text-xs text-gray-400 mt-6">Cuộc trò chuyện bắt đầu — nhắn gì đó để chào khách 👋</p>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'customer' && (
                    <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 mr-2 shrink-0 self-end">
                      {activeSession ? initials(activeSession) : '?'}
                    </div>
                  )}
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
    </div>
  );
}
