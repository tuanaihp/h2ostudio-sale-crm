import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { supabase } from '../supabase';
import { format } from 'date-fns';

const SESSION_KEY = 'h2o_live_session_id';

interface Msg {
  id: string;
  sender: 'customer' | 'admin';
  content: string;
  created_at: string;
}

export function LiveChatBubble() {
  const [open, setOpen]             = useState(false);
  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [isAnon, setIsAnon]         = useState(true);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [hasNew, setHasNew]         = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [formName, setFormName]     = useState('');
  const [formPhone, setFormPhone]   = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formDone, setFormDone]     = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Init session on open
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
        if (msg.sender === 'admin' && !open) setHasNew(true);
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

        // Show form if still anon and has messages already
        if (anon && (msgs || []).length > 0) setShowForm(true);
        return;
      }
    }

    // Create new anonymous session
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

    // Show info form after 1.5s (give time to read greeting)
    setTimeout(() => setShowForm(true), 1500);
  };

  const send = async () => {
    if (!input.trim() || !sessionId || sending) return;
    setSending(true);
    const id      = crypto.randomUUID();
    const now     = new Date().toISOString();
    const content = input.trim();
    setMessages(prev => [...prev, { id, sender: 'customer', content, created_at: now }]);
    setInput('');
    await supabase.from('chat_messages').insert({ id, session_id: sessionId, sender: 'customer', content, created_at: now });
    await supabase.from('chat_sessions').update({
      last_message: content, last_message_at: now, status: 'waiting',
      unread_admin: messages.filter(m => m.sender === 'customer').length + 1,
    }).eq('id', sessionId);

    // Show info form after first message if still anon
    if (isAnon && !formDone) setTimeout(() => setShowForm(true), 800);
    setSending(false);
  };

  const submitInfo = async () => {
    const phone = formPhone.trim();
    const name  = formName.trim();
    if (phone.length < 9 || !sessionId) return;
    setFormSaving(true);

    // Update session with real info
    await supabase.from('chat_sessions').update({ phone, name, status: 'waiting' }).eq('id', sessionId);

    // Find or create consultation
    const { data: existing } = await supabase
      .from('consultations').select('id').eq('phone', phone).limit(1).maybeSingle();

    if (!existing) {
      const consultId = crypto.randomUUID();
      await supabase.from('consultations').insert({
        id: consultId,
        name: name || phone,
        phone,
        status: 'new',
        source: 'website_chat',
        message: 'Khách liên hệ qua Live Chat trên website',
        created_at: new Date().toISOString(),
      });
      await supabase.from('chat_sessions').update({ consultation_id: consultId }).eq('id', sessionId);
    } else {
      await supabase.from('chat_sessions').update({ consultation_id: existing.id }).eq('id', sessionId);
    }

    // Save to localStorage for future sessions
    localStorage.setItem('h2o_user_phone', phone);

    // Send a system message confirming info saved
    const confirmId = crypto.randomUUID();
    await supabase.from('chat_messages').insert({
      id: confirmId,
      session_id: sessionId,
      sender: 'customer',
      content: `📋 Thông tin của tôi: ${name ? name + ' — ' : ''}${phone}`,
      created_at: new Date().toISOString(),
    });

    setIsAnon(false);
    setFormDone(true);
    setShowForm(false);
    setFormSaving(false);
  };

  const handleOpen = () => { setOpen(true); setHasNew(false); };

  return (
    <>
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 left-4 z-40 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2 px-4 py-3"
        >
          <MessageCircle size={18} />
          <span className="text-sm font-semibold">Tư vấn viên</span>
          {hasNew && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse">!</span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-4 left-4 z-50 w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
          style={{ height: 500 }}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between rounded-t-2xl shrink-0">
            <div>
              <p className="font-bold text-sm">Chat với tư vấn viên</p>
              <p className="text-xs text-blue-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
                H2O Studio · phản hồi trong vài phút
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-blue-700 rounded-full p-1 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-3 space-y-2">
              {/* Greeting */}
              <div className="flex justify-start">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1.5 shrink-0 self-end">H</div>
                <div className="bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100 px-3 py-2 text-sm shadow-sm max-w-[78%]">
                  <p>Xin chào! Tư vấn viên H2O Studio sẵn sàng hỗ trợ anh/chị 💕</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">H2O Studio</p>
                </div>
              </div>

              {/* Messages */}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'admin' && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1.5 shrink-0 self-end">H</div>
                  )}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    msg.sender === 'customer'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-0.5 ${msg.sender === 'customer' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}

              {/* Info collection form — shown inline in chat flow */}
              {showForm && !formDone && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mx-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <User size={14} className="text-blue-600" />
                      <p className="text-xs font-semibold text-blue-700">Để lại thông tin để nhận tư vấn</p>
                    </div>
                    <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  </div>
                  <p className="text-[11px] text-blue-600 mb-2">Tư vấn viên sẽ gọi lại xác nhận lịch cho anh/chị 😊</p>
                  <div className="space-y-1.5">
                    <input
                      className="w-full border border-blue-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Tên anh/chị (không bắt buộc)"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                    />
                    <input
                      className="w-full border border-blue-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Số điện thoại *"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitInfo()}
                      type="tel"
                    />
                    <button
                      onClick={submitInfo}
                      disabled={formPhone.trim().length < 9 || formSaving}
                      className="w-full bg-blue-600 text-white rounded-lg py-1.5 text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
                    >
                      {formSaving ? 'Đang lưu...' : 'Gửi thông tin'}
                    </button>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t bg-white p-3 flex gap-2 rounded-b-2xl shrink-0">
            <input
              className="flex-1 border border-gray-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhắn tin với tư vấn viên..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={sending}
              autoFocus={open}
            />
            <button
              onClick={send}
              disabled={!input.trim() || sending}
              className="bg-blue-600 text-white rounded-full p-2.5 disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
