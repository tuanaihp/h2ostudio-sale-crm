import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { GOOGLE_SCRIPT_URL, LARK_FALLBACK_URL } from '../utils/config';
import type { Consultation, DbConsultationRow } from '../types';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

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
  submitConsultation: (data: {
    name: string; phone: string; email?: string; message?: string;
    date?: Date; favoriteIds?: string[]; source?: string; luckyGift?: string;
  }) => Promise<void>;
  updateConsultationStatus: (id: string, status: 'new' | 'contacted' | 'registered') => Promise<void>;
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

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [hasMoreConsultations, setHasMoreConsultations] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(0);

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
          setConsultations(prev => [dbToConsultation(payload.new as DbConsultationRow), ...prev]);
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

  // ─── Submit ────────────────────────────────────────────────────────────────
  const submitConsultation = useCallback(async (data: {
    name: string; phone: string; email?: string; message?: string;
    date?: Date; favoriteIds?: string[]; source?: string; luckyGift?: string;
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

    const { error } = await supabase.from('consultations').insert(row);
    if (error) throw new Error(error.message);

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
  const updateConsultationStatus = useCallback(async (id: string, status: 'new' | 'contacted' | 'registered') => {
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
      submitConsultation, updateConsultationStatus, updateConsultationRegistration,
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
