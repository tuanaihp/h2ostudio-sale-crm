import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { GOOGLE_SCRIPT_URL, LARK_FALLBACK_URL } from '../utils/config';
import type { Consultation, DbConsultationRow } from '../types';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useToast } from './ToastContext';

const PAGE_SIZE = 50;

// ─── DB mapper ────────────────────────────────────────────────────────────────

const dbToConsultation = (row: DbConsultationRow): Consultation => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  message: row.message,
  date: row.date,
  createdAt: row.created_at,
  status: row.status,
  notes: row.notes,
  tags: row.tags,
  conceptId: row.concept_id,
  shootingDate: row.shooting_date,
  engagementDate: row.engagement_date,
  weddingDate: row.wedding_date,
  deliveryDate: row.delivery_date,
  favoriteIds: row.favorite_ids,
  source: row.source,
  luckyGift: row.lucky_gift,
  assignedTo: row.assigned_to,
  followUpDate: row.follow_up_date,
  contractValue: row.contract_value,
});

const consultationToDB = (data: Partial<Consultation>): Partial<DbConsultationRow> => {
  const row: Partial<DbConsultationRow> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.phone !== undefined) row.phone = data.phone;
  if (data.message !== undefined) row.message = data.message;
  if (data.date !== undefined) row.date = data.date;
  if (data.status !== undefined) row.status = data.status;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.tags !== undefined) row.tags = data.tags;
  if (data.conceptId !== undefined) row.concept_id = data.conceptId;
  if (data.shootingDate !== undefined) row.shooting_date = data.shootingDate;
  if (data.engagementDate !== undefined) row.engagement_date = data.engagementDate;
  if (data.weddingDate !== undefined) row.wedding_date = data.weddingDate;
  if (data.deliveryDate !== undefined) row.delivery_date = data.deliveryDate;
  if (data.favoriteIds !== undefined) row.favorite_ids = data.favoriteIds;
  if (data.source !== undefined) row.source = data.source;
  if (data.luckyGift !== undefined) row.lucky_gift = data.luckyGift;
  if (data.assignedTo !== undefined) row.assigned_to = data.assignedTo;
  if (data.followUpDate !== undefined) row.follow_up_date = data.followUpDate;
  if (data.contractValue !== undefined) row.contract_value = data.contractValue;
  return row;
};

// ─── Context type ─────────────────────────────────────────────────────────────

interface ConsultationContextType {
  consultations: Consultation[];
  hasMoreConsultations: boolean;
  isLoadingMore: boolean;
  loadMoreConsultations: () => Promise<void>;
  unreadCount: number;
  markAllRead: () => void;
  checkPhoneDuplicate: (phone: string, source?: string) => Promise<boolean>;
  submitConsultation: (data: {
    name: string; phone: string; email?: string; message?: string;
    date?: Date; favoriteIds?: string[]; source?: string; luckyGift?: string;
    favoriteAlbums?: { title: string; url: string; styleName?: string }[];
  }) => Promise<void>;
  updateConsultationStatus: (id: string, status: Consultation['status']) => Promise<void>;
  updateConsultationRegistration: (id: string, data: Partial<Consultation>) => Promise<void>;
  updateConsultationNotes: (id: string, notes: string) => Promise<void>;
  updateConsultationTags: (id: string, tags: string[]) => Promise<void>;
  updateConsultationField: (id: string, field: string, value: unknown) => Promise<void>;
  deleteConsultation: (id: string) => Promise<void>;
}

const ConsultationContext = createContext<ConsultationContextType | undefined>(undefined);

export const ConsultationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isSuperAdmin, isAuthReady } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [hasMoreConsultations, setHasMoreConsultations] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(0);

  const [lastSeenAt, setLastSeenAt] = useState<string>(() => {
    const saved = localStorage.getItem('admin_last_seen_at');
    if (saved) return saved;
    const now = new Date().toISOString();
    localStorage.setItem('admin_last_seen_at', now);
    return now;
  });

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem('admin_last_seen_at', now);
    setLastSeenAt(now);
  }, []);

  const unreadCount = useMemo(
    () => consultations.filter(c => c.status === 'new' && c.createdAt > lastSeenAt).length,
    [consultations, lastSeenAt]
  );

  // ─── Load (paginated) ───────────────────────────────────────────────────────
  const loadConsultations = useCallback(async (reset = false) => {
    const page = reset ? 0 : pageRef.current;
    if (reset) { pageRef.current = 0; setConsultations([]); }

    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      if (error.code !== 'PGRST301') console.warn('Consultations error:', error.message);
      return;
    }

    const rows = (data ?? []) as DbConsultationRow[];
    setConsultations(prev => reset ? rows.map(dbToConsultation) : [...prev, ...rows.map(dbToConsultation)]);
    setHasMoreConsultations(rows.length === PAGE_SIZE);
    pageRef.current = page + 1;
  }, []);

  const loadMoreConsultations = useCallback(async () => {
    if (!hasMoreConsultations || isLoadingMore) return;
    setIsLoadingMore(true);
    await loadConsultations(false);
    setIsLoadingMore(false);
  }, [hasMoreConsultations, isLoadingMore, loadConsultations]);

  useEffect(() => {
    if (!isAuthReady || !isAdmin) return;

    loadConsultations(true);

    const channel = supabase.channel('consultations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newConsult = dbToConsultation(payload.new as DbConsultationRow);
          setConsultations(prev => [newConsult, ...prev]);
          showToast(`🔔 Khách mới: ${newConsult.name} · ${newConsult.phone}`, 'info');
        } else if (payload.eventType === 'UPDATE') {
          setConsultations(prev => prev.map(c =>
            c.id === (payload.new as DbConsultationRow).id ? dbToConsultation(payload.new as DbConsultationRow) : c
          ));
        } else if (payload.eventType === 'DELETE') {
          setConsultations(prev => prev.filter(c => c.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthReady, isAdmin, loadConsultations]);

  // ─── Sheets / Lark sync ────────────────────────────────────────────────────
  const syncLeadUpdateToSheets = useCallback((id: string, updateData: Record<string, unknown>) => {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'update_lead', leadId: id, updateData }),
    }).catch(err => console.error('Error syncing to Sheets:', err));
  }, []);

  // ─── Duplicate check (client localStorage → server fallback) ─────────────
  const checkPhoneDuplicate = useCallback(async (phone: string, source?: string): Promise<boolean> => {
    const localKey = source === 'lucky_wheel' ? 'h2o_lucky_wheel_played' : 'h2o_submitted_phones';
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      if (stored.includes(phone)) return true;
    } catch {}

    let query = supabase.from('consultations').select('id').eq('phone', phone);
    if (source === 'lucky_wheel') query = query.eq('source', 'lucky_wheel');
    const { data: existing } = await (query as any).limit(1).maybeSingle();

    if (existing) {
      try {
        const stored: string[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        if (!stored.includes(phone)) { stored.push(phone); localStorage.setItem(localKey, JSON.stringify(stored)); }
      } catch {}
      return true;
    }
    return false;
  }, []);

  // ─── Submit ────────────────────────────────────────────────────────────────
  const submitConsultation = useCallback(async (data: {
    name: string; phone: string; email?: string; message?: string;
    date?: Date; favoriteIds?: string[]; source?: string; luckyGift?: string;
    favoriteAlbums?: { title: string; url: string; styleName?: string }[];
  }) => {
    const id = `consult-${Date.now()}`;
    const row: Record<string, unknown> = { id, name: data.name, phone: data.phone, status: 'new' };
    if (data.email) row.email = data.email.trim();
    if (data.message) row.message = data.message.trim();
    if (data.source) row.source = data.source;
    if (data.luckyGift) row.lucky_gift = data.luckyGift;
    if (data.favoriteIds?.length) row.favorite_ids = data.favoriteIds;
    if (data.date) {
      try { row.date = typeof data.date === 'string' ? data.date : (data.date as Date).toISOString(); } catch { /* ignore */ }
    }

    // Auto-tags based on submission context
    const autoTags: string[] = [];
    if (data.luckyGift) autoTags.push('Có quà');
    if (data.source === 'lucky_wheel') autoTags.push('Vòng quay');
    if ((data.favoriteIds?.length || 0) >= 3) autoTags.push('Tiềm năng cao');
    else if ((data.favoriteIds?.length || 0) > 0) autoTags.push('Đã thích album');

    // Auto-tag with active promotion
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: activePromos } = await supabase
        .from('promotions').select('title')
        .eq('enabled', true).lte('start_date', today).gte('end_date', today).limit(1);
      if (activePromos && activePromos.length > 0) {
        autoTags.push(`🎉 KM: ${activePromos[0].title}`);
      }
    } catch { /* ignore */ }

    if (autoTags.length > 0) row.tags = autoTags;

    const { error } = await supabase.from('consultations').insert(row);
    if (error) throw new Error(error.message);

    // Lưu SĐT vào localStorage để tránh DB call lần sau
    try {
      const stored: string[] = JSON.parse(localStorage.getItem('h2o_submitted_phones') || '[]');
      if (!stored.includes(data.phone)) { stored.push(data.phone); localStorage.setItem('h2o_submitted_phones', JSON.stringify(stored)); }
    } catch {}

    // Tạo live chat session để nhân viên thấy ngay trong AdminChatPanel
    try {
      const chatSessionId = crypto.randomUUID();
      const hasAlbums = (data.favoriteAlbums?.length ?? 0) > 0;
      const msgLines: string[] = [
        hasAlbums ? '🔔 Khách hàng gửi yêu cầu báo giá!' : '🔔 Khách hàng yêu cầu tư vấn!',
        '',
        `👤 Tên: ${data.name}`,
        `📱 SĐT: ${data.phone}`,
      ];
      if (data.source) msgLines.push(`📋 Nguồn: ${data.source}`);
      if (data.luckyGift) msgLines.push(`🎁 Quà: ${data.luckyGift}`);
      if (hasAlbums) {
        msgLines.push('', `💝 Album yêu thích (${data.favoriteAlbums!.length} album):`);
        data.favoriteAlbums!.forEach(a => {
          msgLines.push(`• ${a.title}${a.styleName ? ` [${a.styleName}]` : ''}`);
          if (a.url) msgLines.push(`  ${a.url}`);
        });
      }
      if (data.message) msgLines.push('', `📝 Ghi chú: ${data.message.slice(0, 300)}`);
      const chatContent = msgLines.join('\n');
      const now = new Date().toISOString();

      supabase.from('chat_sessions').insert({
        id: chatSessionId, phone: data.phone, name: data.name,
        status: 'waiting', stage: 'new', consultation_id: id,
        last_message: chatContent, last_message_at: now, unread_admin: 1, created_at: now,
      }).then(({ error: e }) => { if (e) console.error('chat_session create:', e.message); });

      supabase.from('chat_messages').insert({
        id: crypto.randomUUID(), session_id: chatSessionId,
        sender: 'customer', content: chatContent, created_at: now,
      }).catch(() => {});

      localStorage.setItem('h2o_live_session_id', chatSessionId);
    } catch { /* non-critical */ }

    // Lark + Telegram — gửi song song, không block submit
    if (settings?.larkNotificationEnabled !== false) {
      fetch('/api/lark-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          source: data.source,
          luckyGift: data.luckyGift,
          favoriteCount: data.favoriteIds?.length || 0,
          albums: data.favoriteAlbums || [],
          webhookUrl: settings?.larkWebhookUrl || undefined,
        }),
      }).catch(err => console.error('Lark notify error:', err));
    }

    if (settings?.telegramNotificationEnabled && settings?.telegramBotToken && settings?.telegramChatId) {
      fetch('/api/telegram-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          source: data.source,
          luckyGift: data.luckyGift,
          albums: data.favoriteAlbums || [],
          botToken: settings.telegramBotToken,
          chatId: settings.telegramChatId,
        }),
      }).catch(err => console.error('Telegram notify error:', err));
    }

    const larkUrl = settings?.larkWebhookUrl || LARK_FALLBACK_URL;
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'lead',
        leadData: {
          id, name: data.name, phone: data.phone, email: data.email || '',
          message: (() => {
            let msg = data.message || '';
            const links = msg.match(/(https?:\/\/[^\s\n]+)/g) || [];
            links.forEach(l => { msg = msg.replace(l, ''); });
            msg = msg.replace(/Link danh sách:/g, '').replace(/Link:/g, '').trim();
            return msg.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l !== '-').join('\n');
          })(),
          referenceLinks: (data.message?.match(/(https?:\/\/[^\s\n]+)/g) || []).join(', '),
          source: data.source || '', luckyGift: data.luckyGift || '',
          date: new Date().toLocaleString('vi-VN'),
        },
        larkConfig: { url: larkUrl },
      }),
    }).catch(err => console.error('Error syncing to Sheets:', err));
  }, [settings?.larkWebhookUrl]);

  // ─── Update / Delete ───────────────────────────────────────────────────────
  const updateConsultationStatus = useCallback(async (id: string, status: Consultation['status']) => {
    if (!isAdmin) return;
    await supabase.from('consultations').update({ status }).eq('id', id);
    syncLeadUpdateToSheets(id, { status });
  }, [isAdmin, syncLeadUpdateToSheets]);

  const updateConsultationRegistration = useCallback(async (id: string, data: Partial<Consultation>) => {
    if (!isAdmin) return;
    const row = { ...consultationToDB(data), status: 'registered' as const };
    await supabase.from('consultations').update(row).eq('id', id);
    syncLeadUpdateToSheets(id, { ...data, status: 'registered' });
  }, [isAdmin, syncLeadUpdateToSheets]);

  const updateConsultationNotes = useCallback(async (id: string, notes: string) => {
    if (!isAdmin) return;
    await supabase.from('consultations').update({ notes }).eq('id', id);
    syncLeadUpdateToSheets(id, { notes });
  }, [isAdmin, syncLeadUpdateToSheets]);

  const updateConsultationTags = useCallback(async (id: string, tags: string[]) => {
    if (!isAdmin) return;
    await supabase.from('consultations').update({ tags }).eq('id', id);
    syncLeadUpdateToSheets(id, { tags: tags.join(', ') });
  }, [isAdmin, syncLeadUpdateToSheets]);

  const updateConsultationField = useCallback(async (id: string, field: string, value: unknown) => {
    if (!isAdmin) return;
    const colMap: Record<string, string> = {
      conceptId: 'concept_id', shootingDate: 'shooting_date', engagementDate: 'engagement_date',
      weddingDate: 'wedding_date', deliveryDate: 'delivery_date', favoriteIds: 'favorite_ids',
      luckyGift: 'lucky_gift', assignedTo: 'assigned_to', followUpDate: 'follow_up_date',
      contractValue: 'contract_value',
    };
    const col = colMap[field] || field;
    await supabase.from('consultations').update({ [col]: value }).eq('id', id);
    syncLeadUpdateToSheets(id, { [field]: Array.isArray(value) ? (value as unknown[]).join(', ') : value });
  }, [isAdmin, syncLeadUpdateToSheets]);

  const deleteConsultation = useCallback(async (id: string) => {
    if (!isSuperAdmin) return;
    await supabase.from('consultations').delete().eq('id', id);
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete_lead', leadId: id }),
    }).catch(console.error);
  }, [isSuperAdmin]);

  return (
    <ConsultationContext.Provider value={{
      consultations, hasMoreConsultations, isLoadingMore, loadMoreConsultations,
      unreadCount, markAllRead,
      checkPhoneDuplicate, submitConsultation,
      updateConsultationStatus, updateConsultationRegistration,
      updateConsultationNotes, updateConsultationTags, updateConsultationField, deleteConsultation,
    }}>
      {children}
    </ConsultationContext.Provider>
  );
};

export const useConsultations = (): ConsultationContextType => {
  const ctx = useContext(ConsultationContext);
  if (!ctx) throw new Error('useConsultations must be used within ConsultationProvider');
  return ctx;
};
