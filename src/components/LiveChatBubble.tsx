import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { supabase } from '../supabase';
import { format } from 'date-fns';

interface Msg {
  id: string;
  sender: 'customer' | 'admin';
  content: string;
  created_at: string;
}

export function LiveChatBubble() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('h2o_user_phone');
    if (saved) setPhone(saved);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!phone) return;
    initSession();
    return () => { channelRef.current?.unsubscribe(); };
  }, [phone]);

  const initSession = async () => {
    const { data: existing } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('phone', phone)
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let sid = existing?.id as string | undefined;
    if (!sid) {
      sid = crypto.randomUUID();
      const name = '';
      await supabase.from('chat_sessions').insert({
        id: sid, phone, name,
        status: 'waiting', stage: 'new',
        last_message: '', last_message_at: new Date().toISOString(),
        unread_admin: 0, created_at: new Date().toISOString(),
      });
    }
    setSessionId(sid);

    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('id, sender, content, created_at')
      .eq('session_id', sid)
      .order('created_at', { ascending: true });
    setMessages((msgs || []) as Msg[]);

    channelRef.current = supabase
      .channel(`live_${sid}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `session_id=eq.${sid}`,
      }, (payload) => {
        const msg = payload.new as Msg;
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.sender === 'admin') setHasNew(true);
      })
      .subscribe();
  };

  const handlePhone = () => {
    const p = phoneInput.trim();
    if (p.length < 9) return;
    localStorage.setItem('h2o_user_phone', p);
    setPhone(p);
  };

  const send = async () => {
    if (!input.trim() || !sessionId || sending) return;
    setSending(true);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const content = input.trim();
    setMessages(prev => [...prev, { id, sender: 'customer', content, created_at: now }]);
    setInput('');
    await supabase.from('chat_messages').insert({ id, session_id: sessionId, sender: 'customer', content, created_at: now });
    await supabase.from('chat_sessions').update({
      last_message: content, last_message_at: now, status: 'waiting',
      unread_admin: messages.filter(m => m.sender === 'customer').length + 1,
    }).eq('id', sessionId);
    setSending(false);
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
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">!</span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 left-4 z-50 w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col" style={{ height: 480 }}>
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between rounded-t-2xl shrink-0">
            <div>
              <p className="font-bold text-sm">Chat với tư vấn viên</p>
              <p className="text-xs text-blue-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                H2O Studio · phản hồi trong vài phút
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-blue-700 rounded-full p-1 transition-colors">
              <X size={18} />
            </button>
          </div>

          {!phone ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                <MessageCircle size={28} className="text-blue-500" />
              </div>
              <p className="text-sm text-gray-600 text-center">Nhập số điện thoại để chat với tư vấn viên H2O Studio</p>
              <input
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: 0987 123 456"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePhone()}
                autoFocus
              />
              <button
                onClick={handlePhone}
                className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Bắt đầu chat
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                <p className="text-center text-xs text-gray-400 py-2">
                  Xin chào! Tư vấn viên H2O Studio sẽ hỗ trợ bạn 💕
                </p>
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
                <div ref={bottomRef} />
              </div>

              <div className="border-t bg-white p-3 flex gap-2 rounded-b-2xl shrink-0">
                <input
                  className="flex-1 border border-gray-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhắn tin..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  disabled={sending}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="bg-blue-600 text-white rounded-full p-2.5 disabled:opacity-40 hover:bg-blue-700 transition-colors"
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
