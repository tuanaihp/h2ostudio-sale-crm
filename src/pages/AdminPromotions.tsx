import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import {
  ChevronLeft, ChevronRight, Plus, Edit3, Trash2, Save, X,
  Calendar, List, TrendingUp, Eye, EyeOff, Megaphone,
  ToggleLeft, ToggleRight, Users, ArrowLeft, Check, AlertCircle,
  Sparkles, UserCheck, Phone, MessageCircle, Loader2,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isWithinInterval, parseISO, addMonths, subMonths, isToday,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import type { Promotion, DbPromotionRow } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiPromoProposal {
  title: string;
  shortDesc: string;
  content: string;
  emoji: string;
  color: string;
  bgColor: string;
  startDate: string;
  endDate: string;
  ctaText: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJIS = ['🎉', '🔥', '💕', '🎁', '🌹', '✨', '💎', '🎊', '🌸', '💫', '⭐', '🏆'];

const COLORS = [
  { bg: '#FFF0F0', color: '#E53E3E', label: 'Đỏ' },
  { bg: '#FFF4E8', color: '#DD6B20', label: 'Cam' },
  { bg: '#FFFFF0', color: '#B7791F', label: 'Vàng' },
  { bg: '#EBF8FF', color: '#2B6CB0', label: 'Xanh dương' },
  { bg: '#F0FFF4', color: '#276749', label: 'Xanh lá' },
  { bg: '#FFF5F3', color: '#A4756B', label: 'Hồng studio' },
  { bg: '#FFF0F5', color: '#D53F8C', label: 'Hồng đậm' },
  { bg: '#FAF0FF', color: '#7B2D8B', label: 'Tím' },
  { bg: '#F7FAFC', color: '#4A5568', label: 'Xám' },
];

const WEEK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const BLANK_FORM = {
  title: '',
  shortDesc: '',
  content: '',
  emoji: '🎉',
  color: '#E53E3E',
  bgColor: '#FFF0F0',
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd'),
  ctaText: 'Đăng ký nhận ưu đãi',
  showOnWebsite: true,
  enabled: true,
};

const STATUS_CONFIG_MINI: Record<string, { label: string; cls: string }> = {
  new:        { label: 'Mới',     cls: 'bg-red-100 text-red-600' },
  called:     { label: 'Đã gọi',  cls: 'bg-yellow-100 text-yellow-700' },
  contacted:  { label: 'Đã gọi',  cls: 'bg-yellow-100 text-yellow-700' },
  consulting: { label: 'Tư vấn',  cls: 'bg-blue-100 text-blue-700' },
  quoted:     { label: 'Báo giá', cls: 'bg-purple-100 text-purple-700' },
  registered: { label: 'Đã chốt', cls: 'bg-green-100 text-green-700' },
};

const EXAMPLE_COMMANDS = [
  'tạo KM cho tất cả ngày đặc biệt trong năm 2026',
  'tạo KM mùa cưới tháng 10-12/2026 với ưu đãi giảm 15-20%',
  'tạo KM Valentine, 8/3, Giáng Sinh 2026',
  'tạo 5 chương trình KM thu hút khách cưới mùa hè 2026',
];

// ─── DB mapper ────────────────────────────────────────────────────────────────

const dbToPromo = (row: DbPromotionRow): Promotion => ({
  id: row.id,
  title: row.title,
  shortDesc: row.short_desc || '',
  content: row.content || '',
  emoji: row.emoji || '🎉',
  color: row.color || '#A4756B',
  bgColor: row.bg_color || '#FFF5F3',
  startDate: row.start_date,
  endDate: row.end_date,
  ctaText: row.cta_text || 'Đăng ký nhận ưu đãi',
  showOnWebsite: row.show_on_website !== false,
  enabled: row.enabled !== false,
  createdAt: row.created_at,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const promoStatus = (p: Promotion): 'active' | 'upcoming' | 'ended' => {
  const now = new Date();
  try {
    if (now < parseISO(p.startDate)) return 'upcoming';
    if (now > parseISO(p.endDate)) return 'ended';
    return 'active';
  } catch { return 'ended'; }
};

const promoCoverDay = (p: Promotion, day: Date): boolean => {
  if (!p.enabled) return false;
  try {
    return isWithinInterval(day, { start: parseISO(p.startDate), end: parseISO(p.endDate) });
  } catch { return false; }
};

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  upcoming: 'bg-blue-100 text-blue-700',
  ended:    'bg-gray-100 text-gray-500',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Đang chạy', upcoming: 'Sắp diễn ra', ended: 'Đã kết thúc',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPromotions() {
  const { isAdmin, isAuthReady, consultations, updateConsultationTags } = useApp();

  // ── Existing state ──────────────────────────────────────────────────────────
  const [promos, setPromos]               = useState<Promotion[]>([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState<'calendar' | 'list' | 'stats' | 'customers'>('calendar');
  const [viewMonth, setViewMonth]         = useState(new Date());
  const [selectedDay, setSelectedDay]     = useState<Date | null>(null);
  const [showModal, setShowModal]         = useState(false);
  const [editingPromo, setEditingPromo]   = useState<Promotion | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [statsYear, setStatsYear]         = useState(new Date().getFullYear());
  const [form, setForm]                   = useState({ ...BLANK_FORM });

  // ── AI Bulk Create state ────────────────────────────────────────────────────
  const [aiModal, setAiModal]               = useState(false);
  const [aiCommand, setAiCommand]           = useState('');
  const [aiLoading, setAiLoading]           = useState(false);
  const [aiProposals, setAiProposals]       = useState<AiPromoProposal[]>([]);
  const [selectedProposals, setSelectedProposals] = useState<Set<number>>(new Set());
  const [importingAi, setImportingAi]       = useState(false);
  const [aiError, setAiError]               = useState('');

  // ── AI Content state ────────────────────────────────────────────────────────
  const [aiContentLoading, setAiContentLoading] = useState(false);

  // ── Customers tab state ─────────────────────────────────────────────────────
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch]       = useState('');
  const [showAssign, setShowAssign]           = useState(false);

  if (isAuthReady && !isAdmin) return <Navigate to="/admin/login" replace />;

  useEffect(() => { loadPromos(); }, []);

  const loadPromos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('promotions').select('*').order('start_date', { ascending: false });
    setPromos((data || []).map(r => dbToPromo(r as DbPromotionRow)));
    setLoading(false);
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────

  const calDays = (): (Date | null)[] => {
    const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
    const dow = getDay(startOfMonth(viewMonth));
    const offset = dow === 0 ? 6 : dow - 1;
    return [...Array(offset).fill(null), ...days];
  };

  const promosForDay = (day: Date) => promos.filter(p => promoCoverDay(p, day));
  const selectedPromos = selectedDay ? promosForDay(selectedDay) : [];

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const openCreate = (prefillDate?: Date) => {
    const d = prefillDate ? format(prefillDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    setEditingPromo(null);
    setForm({ ...BLANK_FORM, startDate: d, endDate: d });
    setShowModal(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingPromo(p);
    setForm({
      title: p.title, shortDesc: p.shortDesc, content: p.content,
      emoji: p.emoji, color: p.color, bgColor: p.bgColor,
      startDate: p.startDate, endDate: p.endDate,
      ctaText: p.ctaText, showOnWebsite: p.showOnWebsite, enabled: p.enabled,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.startDate || !form.endDate) return;
    setSaving(true);
    const row = {
      title: form.title, short_desc: form.shortDesc, content: form.content,
      emoji: form.emoji, color: form.color, bg_color: form.bgColor,
      start_date: form.startDate, end_date: form.endDate,
      cta_text: form.ctaText, show_on_website: form.showOnWebsite, enabled: form.enabled,
      updated_at: new Date().toISOString(),
    };
    if (editingPromo) {
      await supabase.from('promotions').update(row).eq('id', editingPromo.id);
    } else {
      await supabase.from('promotions').insert({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    }
    await loadPromos();
    setShowModal(false);
    setSaving(false);
  };

  const deletePromo = async (id: string) => {
    await supabase.from('promotions').delete().eq('id', id);
    setPromos(prev => prev.filter(p => p.id !== id));
    if (selectedDay) {
      const stillHas = promos.filter(p => p.id !== id && promoCoverDay(p, selectedDay));
      if (!stillHas.length) setSelectedDay(null);
    }
    setConfirmDelete(null);
  };

  const toggleEnabled = async (p: Promotion) => {
    await supabase.from('promotions').update({ enabled: !p.enabled }).eq('id', p.id);
    setPromos(prev => prev.map(x => x.id === p.id ? { ...x, enabled: !x.enabled } : x));
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const leadCountForPromo = (p: Promotion) => {
    const tag = `🎉 KM: ${p.title}`;
    return consultations.filter(c => {
      const year = new Date(c.createdAt).getFullYear();
      return year === statsYear && (c.tags || []).includes(tag);
    }).length;
  };

  const statsData = promos
    .map(p => ({ promo: p, count: leadCountForPromo(p) }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...statsData.map(x => x.count), 1);

  // ── AI Bulk Create ────────────────────────────────────────────────────────

  const callAiBulk = async () => {
    if (!aiCommand.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiProposals([]);
    try {
      const res = await fetch('/api/ai-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: aiCommand, type: 'bulk' }),
      });
      const data = await res.json();
      if (data.result && Array.isArray(data.result)) {
        setAiProposals(data.result);
        setSelectedProposals(new Set(data.result.map((_: AiPromoProposal, i: number) => i)));
      } else {
        setAiError(data.error || 'AI không trả về kết quả. Thử lại với lệnh khác.');
      }
    } catch {
      setAiError('Lỗi kết nối. Vui lòng thử lại.');
    }
    setAiLoading(false);
  };

  const importAiProposals = async () => {
    const toImport = aiProposals.filter((_, i) => selectedProposals.has(i));
    if (!toImport.length) return;
    setImportingAi(true);
    for (const p of toImport) {
      await supabase.from('promotions').insert({
        id: crypto.randomUUID(),
        title: p.title, short_desc: p.shortDesc, content: p.content,
        emoji: p.emoji || '🎉', color: p.color || '#A4756B', bg_color: p.bgColor || '#FFF5F3',
        start_date: p.startDate, end_date: p.endDate,
        cta_text: p.ctaText || 'Đăng ký nhận ưu đãi',
        show_on_website: true, enabled: true,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      });
    }
    await loadPromos();
    setAiModal(false);
    setAiProposals([]);
    setSelectedProposals(new Set());
    setAiCommand('');
    setImportingAi(false);
  };

  // ── AI Content ────────────────────────────────────────────────────────────

  const callAiContent = async () => {
    if (!form.title.trim()) return;
    setAiContentLoading(true);
    try {
      const res = await fetch('/api/ai-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content',
          context: `${form.title} (${form.startDate} đến ${form.endDate})`,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setForm(f => ({
          ...f,
          shortDesc: data.result.shortDesc || f.shortDesc,
          content:   data.result.content   || f.content,
          ctaText:   data.result.ctaText   || f.ctaText,
        }));
      }
    } catch {}
    setAiContentLoading(false);
  };

  const openEditWithAi = async (p: Promotion) => {
    openEdit(p);
    setAiContentLoading(true);
    try {
      const res = await fetch('/api/ai-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'content',
          context: `${p.title} (${p.startDate} đến ${p.endDate})`,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setForm(f => ({
          ...f,
          shortDesc: data.result.shortDesc || f.shortDesc,
          content:   data.result.content   || f.content,
          ctaText:   data.result.ctaText   || f.ctaText,
        }));
      }
    } catch {}
    setAiContentLoading(false);
  };

  // ── Customers ─────────────────────────────────────────────────────────────

  const getPromoCustomers = (promo: Promotion) => {
    const tag = `🎉 KM: ${promo.title}`;
    return consultations.filter(c => (c.tags || []).includes(tag));
  };

  const assignToPromo = async (consultationId: string, promo: Promotion) => {
    const tag = `🎉 KM: ${promo.title}`;
    const c = consultations.find(x => x.id === consultationId);
    if (!c) return;
    const newTags = Array.from(new Set([...(c.tags || []), tag]));
    await updateConsultationTags(consultationId, newTags);
  };

  // ─────────────────────────────────────────────────────────────────────────

  const selectedPromoForCustomers = selectedPromoId ? promos.find(p => p.id === selectedPromoId) : null;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top nav ────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/admin/consultations"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-primary" />
              <h1 className="font-bold text-gray-900 text-sm">Lịch Khuyến Mãi</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {([
              ['calendar', Calendar, 'Lịch'],
              ['list', List, 'Danh sách'],
              ['stats', TrendingUp, 'Thống kê'],
              ['customers', Users, 'Khách hàng'],
            ] as const).map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  tab === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAiModal(true); setAiProposals([]); setAiError(''); }}
              className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">AI tạo KM</span>
            </button>
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Tạo KM</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ════════════════ CALENDAR TAB ════════════════ */}
        {tab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Calendar */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
              {/* Month nav */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <button onClick={() => setViewMonth(m => subMonths(m, 1))}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <h2 className="font-bold text-gray-800 text-base capitalize">
                  {format(viewMonth, 'MMMM yyyy', { locale: vi })}
                </h2>
                <button onClick={() => setViewMonth(m => addMonths(m, 1))}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b">
                {WEEK_DAYS.map(d => (
                  <div key={d} className={`text-center text-[11px] font-bold py-2 ${d === 'CN' ? 'text-red-500' : 'text-gray-400'}`}>{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7">
                {calDays().map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="border-b border-r border-gray-50 min-h-[80px]" />;
                  const dayPromos = promosForDay(day);
                  const isSelected = selectedDay && format(day, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd');
                  const isWeekend = [0, 6].includes(getDay(day));
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`border-b border-r border-gray-100 min-h-[80px] p-1.5 text-left transition-colors hover:bg-gray-50 ${
                        isSelected ? 'bg-primary/5 ring-2 ring-primary/20 ring-inset' : ''
                      }`}
                    >
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                        isToday(day) ? 'bg-primary text-white' : isWeekend ? 'text-red-400' : 'text-gray-700'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      <div className="space-y-0.5">
                        {dayPromos.slice(0, 2).map(p => (
                          <div key={p.id} className="truncate text-[10px] font-medium px-1.5 py-0.5 rounded-sm leading-snug"
                            style={{ backgroundColor: p.bgColor, color: p.color }}>
                            {p.emoji} {p.title}
                          </div>
                        ))}
                        {dayPromos.length > 2 && (
                          <div className="text-[10px] text-gray-400 px-1">+{dayPromos.length - 2} nữa</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              {promos.filter(p => p.enabled).length > 0 && (
                <div className="px-4 py-3 border-t flex flex-wrap gap-3">
                  {promos.filter(p => p.enabled && promoStatus(p) !== 'ended').map(p => (
                    <div key={p.id} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-gray-600 truncate max-w-[120px]">{p.emoji} {p.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Selected day detail */}
            <div className="space-y-4">
              {selectedDay ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-sm capitalize">
                      {format(selectedDay, 'EEEE, dd/MM/yyyy', { locale: vi })}
                    </h3>
                    <button
                      onClick={() => openCreate(selectedDay)}
                      className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Plus size={13} /> Thêm KM
                    </button>
                  </div>
                  {selectedPromos.length === 0 ? (
                    <div className="bg-white rounded-2xl border p-6 text-center">
                      <Calendar size={32} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-sm text-gray-400">Không có KM nào ngày này</p>
                      <button onClick={() => openCreate(selectedDay)}
                        className="mt-3 text-xs text-primary font-semibold hover:underline">
                        + Tạo khuyến mãi
                      </button>
                    </div>
                  ) : (
                    selectedPromos.map(p => (
                      <PromoCard key={p.id} promo={p}
                        onEdit={() => openEdit(p)}
                        onAiContent={() => openEditWithAi(p)}
                        onDelete={() => setConfirmDelete(p.id)}
                        onToggle={() => toggleEnabled(p)}
                        confirmDelete={confirmDelete}
                        onConfirmDelete={() => deletePromo(p.id)}
                        onCancelDelete={() => setConfirmDelete(null)}
                      />
                    ))
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
                  <Calendar size={40} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-sm font-medium">Chọn một ngày</p>
                  <p className="text-xs mt-1">để xem hoặc thêm khuyến mãi</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════ LIST TAB ════════════════ */}
        {tab === 'list' && (
          <div className="space-y-3">
            {loading && <div className="text-center py-12 text-gray-400 text-sm">Đang tải...</div>}
            {!loading && promos.length === 0 && (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <Megaphone size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">Chưa có chương trình khuyến mãi nào</p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button onClick={() => openCreate()}
                    className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
                    + Tạo thủ công
                  </button>
                  <button onClick={() => setAiModal(true)}
                    className="bg-violet-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors flex items-center gap-1.5">
                    <Sparkles size={14} /> AI tạo hàng loạt
                  </button>
                </div>
              </div>
            )}
            {promos.map(p => {
              const status = promoStatus(p);
              const customerCount = getPromoCustomers(p).length;
              return (
                <div key={p.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${!p.enabled ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4 p-4">
                    <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: p.bgColor }}>
                      {p.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm">{p.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                        {!p.enabled && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-400">Tắt</span>
                        )}
                        {!p.showOnWebsite && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-yellow-100 text-yellow-600 flex items-center gap-1">
                            <EyeOff size={9} /> Ẩn website
                          </span>
                        )}
                        {customerCount > 0 && (
                          <button
                            onClick={() => { setSelectedPromoId(p.id); setTab('customers'); }}
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                            style={{ backgroundColor: p.bgColor, color: p.color }}
                          >
                            <Users size={9} /> {customerCount} khách
                          </button>
                        )}
                      </div>
                      {p.shortDesc && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.shortDesc}</p>}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {format(parseISO(p.startDate), 'dd/MM/yyyy')} → {format(parseISO(p.endDate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEditWithAi(p)}
                        className="p-2 rounded-lg hover:bg-violet-50 transition-colors text-gray-400 hover:text-violet-600"
                        title="AI viết nội dung">
                        <Sparkles size={14} />
                      </button>
                      <button onClick={() => toggleEnabled(p)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                        title={p.enabled ? 'Tắt' : 'Bật'}>
                        {p.enabled ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                      </button>
                      <button onClick={() => openEdit(p)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary">
                        <Edit3 size={15} />
                      </button>
                      {confirmDelete === p.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deletePromo(p.id)}
                            className="px-2 py-1 bg-red-600 text-white text-[11px] rounded-lg font-bold">Xóa</button>
                          <button onClick={() => setConfirmDelete(null)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={13} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(p.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  {p.content && (
                    <div className="px-4 pb-3 ml-5 pl-9">
                      <p className="text-xs text-gray-500 line-clamp-2">{p.content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════ STATS TAB ════════════════ */}
        {tab === 'stats' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-gray-800">Thống kê hiệu quả KM</h2>
              <div className="flex items-center gap-1 bg-white border rounded-lg px-1">
                <button onClick={() => setStatsYear(y => y - 1)}
                  className="p-1.5 hover:bg-gray-50 rounded transition-colors"><ChevronLeft size={15} /></button>
                <span className="text-sm font-bold text-gray-700 px-1">{statsYear}</span>
                <button onClick={() => setStatsYear(y => y + 1)}
                  className="p-1.5 hover:bg-gray-50 rounded transition-colors"><ChevronRight size={15} /></button>
              </div>
            </div>

            {statsData.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center text-gray-400">
                <TrendingUp size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">Chưa có dữ liệu khuyến mãi</p>
              </div>
            ) : (
              <>
                {statsData.filter(x => x.count > 0).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {statsData.filter(x => x.count > 0).slice(0, 3).map((x, i) => (
                      <div key={x.promo.id} className="bg-white rounded-2xl border p-4 relative overflow-hidden"
                        style={{ borderTopColor: x.promo.color, borderTopWidth: 3 }}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                              #{i + 1} {i === 0 ? '🏆 Tốt nhất' : i === 1 ? '🥈' : '🥉'}
                            </p>
                            <p className="font-bold text-gray-900 text-sm">{x.promo.emoji} {x.promo.title}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {format(parseISO(x.promo.startDate), 'dd/MM')} – {format(parseISO(x.promo.endDate), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-black" style={{ color: x.promo.color }}>{x.count}</p>
                            <p className="text-[10px] text-gray-400">leads</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedPromoId(x.promo.id); setTab('customers'); }}
                          className="mt-2 text-[11px] font-semibold hover:underline"
                          style={{ color: x.promo.color }}
                        >
                          Xem danh sách khách →
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-white rounded-2xl border p-5">
                  <h3 className="font-bold text-gray-700 text-sm mb-4">Leads theo chương trình — {statsYear}</h3>
                  <div className="space-y-3">
                    {statsData.map(x => (
                      <div key={x.promo.id} className="flex items-center gap-3">
                        <div className="w-36 shrink-0 text-right">
                          <p className="text-xs font-semibold text-gray-700 truncate">{x.promo.emoji} {x.promo.title}</p>
                          <p className="text-[10px] text-gray-400">
                            {format(parseISO(x.promo.startDate), 'dd/MM')} – {format(parseISO(x.promo.endDate), 'dd/MM')}
                          </p>
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${(x.count / maxCount) * 100}%`, backgroundColor: x.promo.color, minWidth: x.count > 0 ? '2rem' : '0' }}>
                            {x.count > 0 && <span className="text-white text-[10px] font-bold">{x.count}</span>}
                          </div>
                        </div>
                        {x.count === 0 && <span className="text-[11px] text-gray-400">0 leads</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3 items-start">
                  <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Leads được tính khi khách đăng ký trong thời gian KM đang chạy và tự động được gắn tag <strong>🎉 KM: [tên KM]</strong>.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════ CUSTOMERS TAB ════════════════ */}
        {tab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Promo selector */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Chọn chương trình</p>
              {promos.length === 0 && (
                <div className="bg-white rounded-2xl border p-6 text-center text-gray-400">
                  <p className="text-sm">Chưa có chương trình nào</p>
                </div>
              )}
              <div className="space-y-2">
                {promos.map(p => {
                  const count = getPromoCustomers(p).length;
                  const isActive = selectedPromoId === p.id;
                  return (
                    <button key={p.id}
                      onClick={() => setSelectedPromoId(p.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                        isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                          style={{ backgroundColor: p.bgColor }}>
                          {p.emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isActive ? 'text-primary' : 'text-gray-900'}`}>{p.title}</p>
                          <p className="text-xs text-gray-400">
                            {format(parseISO(p.startDate), 'dd/MM')} – {format(parseISO(p.endDate), 'dd/MM')}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${count > 0 ? '' : 'text-gray-300'}`}
                          style={count > 0 ? { backgroundColor: p.bgColor, color: p.color } : {}}>
                          {count}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Customer list */}
            <div className="lg:col-span-2">
              {selectedPromoForCustomers ? (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <span>{selectedPromoForCustomers.emoji} {selectedPromoForCustomers.title}</span>
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {getPromoCustomers(selectedPromoForCustomers).length} khách đã được gắn vào KM này
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowAssign(true); setAssignSearch(''); }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
                    >
                      <UserCheck size={13} /> Gắn thêm khách
                    </button>
                  </div>

                  {/* Info banner */}
                  <div className="px-4 py-3 rounded-xl text-xs flex items-start gap-2"
                    style={{ backgroundColor: selectedPromoForCustomers.bgColor, color: selectedPromoForCustomers.color }}>
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>Khách tự động được gắn KM này khi đăng ký trong thời gian chương trình chạy (tag <strong>🎉 KM: {selectedPromoForCustomers.title}</strong>). Bạn cũng có thể gắn thêm thủ công.</span>
                  </div>

                  {/* Customer cards */}
                  {getPromoCustomers(selectedPromoForCustomers).length === 0 ? (
                    <div className="bg-white rounded-2xl border p-10 text-center text-gray-400">
                      <Users size={36} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-sm font-medium">Chưa có khách nào</p>
                      <p className="text-xs mt-1">Gắn thủ công hoặc chờ khách đăng ký trong thời gian KM</p>
                      <button onClick={() => { setShowAssign(true); setAssignSearch(''); }}
                        className="mt-3 text-xs text-primary font-semibold hover:underline flex items-center gap-1 mx-auto">
                        <UserCheck size={12} /> Gắn thêm khách ngay
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getPromoCustomers(selectedPromoForCustomers).map(c => {
                        const statusCfg = STATUS_CONFIG_MINI[c.status] || STATUS_CONFIG_MINI.new;
                        return (
                          <div key={c.id} className="bg-white rounded-xl border px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-gray-900">{c.name}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${statusCfg.cls}`}>
                                  {statusCfg.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">{c.phone}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <a href={`tel:${c.phone}`}
                                className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                                title="Gọi ngay">
                                <Phone size={13} />
                              </a>
                              <a href={`https://zalo.me/${c.phone}`} target="_blank" rel="noopener noreferrer"
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                                title="Nhắn Zalo">
                                <MessageCircle size={13} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border p-12 text-center text-gray-400">
                  <Users size={40} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-sm font-medium">Chọn một chương trình KM</p>
                  <p className="text-xs mt-1">để xem và quản lý khách hàng</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ Create/Edit Modal ══════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h3 className="font-bold text-gray-900">
                {editingPromo ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* AI Content loading overlay */}
              {aiContentLoading && (
                <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
                  <Loader2 size={14} className="text-violet-600 animate-spin shrink-0" />
                  <p className="text-xs text-violet-700 font-semibold">AI đang viết nội dung...</p>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tên chương trình *</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="VD: Flash Sale 8/3 — Giảm 20% gói cưới"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Emoji + Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Icon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                        className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                          form.emoji === e ? 'ring-2 ring-primary bg-primary/10 scale-110' : 'hover:bg-gray-100'
                        }`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Màu sắc</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLORS.map(c => (
                      <button key={c.color}
                        onClick={() => setForm(f => ({ ...f, color: c.color, bgColor: c.bg }))}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          form.color === c.color ? 'border-gray-800 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                  <div className="mt-2 px-2 py-1 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: form.bgColor, color: form.color }}>
                    {form.emoji} {form.title || 'Xem trước'}
                  </div>
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ngày bắt đầu *</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ngày kết thúc *</label>
                  <input type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Short desc */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mô tả ngắn (hiện trên lịch)</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="VD: Giảm 20% tất cả gói chụp ảnh cưới"
                  value={form.shortDesc}
                  onChange={e => setForm(f => ({ ...f, shortDesc: e.target.value }))}
                />
              </div>

              {/* Full content + AI button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600">Nội dung chi tiết</label>
                  <button
                    onClick={callAiContent}
                    disabled={!form.title.trim() || aiContentLoading}
                    className="flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {aiContentLoading
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Sparkles size={11} />}
                    AI gợi ý nội dung
                  </button>
                </div>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Mô tả đầy đủ chương trình: điều kiện, gói áp dụng, cách đăng ký..."
                  rows={4}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                />
              </div>

              {/* CTA text */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nút CTA (trên website)</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Đăng ký nhận ưu đãi"
                  value={form.ctaText}
                  onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-4">
                <button onClick={() => setForm(f => ({ ...f, showOnWebsite: !f.showOnWebsite }))}
                  className="flex items-center gap-2 text-sm">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${form.showOnWebsite ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.showOnWebsite ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-600">Hiện trên website</span>
                </button>
                <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                  className="flex items-center gap-2 text-sm">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${form.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.enabled ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-600">Kích hoạt</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t shrink-0">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button
                onClick={save}
                disabled={!form.title.trim() || !form.startDate || !form.endDate || saving}
                className="flex-1 bg-primary text-white text-sm font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
                {editingPromo ? 'Lưu thay đổi' : 'Tạo khuyến mãi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ AI Bulk Create Modal ═══════════════════════════════════════════════ */}
      {aiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">AI Tạo Lịch Khuyến Mãi</h3>
                  <p className="text-xs text-gray-500">Ra lệnh bằng tiếng Việt — AI tạo hàng loạt ngay</p>
                </div>
              </div>
              <button onClick={() => setAiModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">

              {/* Command input */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Lệnh của bạn</label>
                <textarea
                  value={aiCommand}
                  onChange={e => setAiCommand(e.target.value)}
                  placeholder="VD: tạo chương trình khuyến mãi cho tất cả ngày đặc biệt trong năm 2026"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) callAiBulk(); }}
                />
                {/* Example commands */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EXAMPLE_COMMANDS.map((cmd, i) => (
                    <button key={i}
                      onClick={() => setAiCommand(cmd)}
                      className="text-[11px] px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full hover:bg-violet-100 transition-colors font-medium"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              {aiProposals.length === 0 && (
                <button
                  onClick={callAiBulk}
                  disabled={!aiCommand.trim() || aiLoading}
                  className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {aiLoading
                    ? <><Loader2 size={16} className="animate-spin" /> AI đang phân tích và tạo lịch KM...</>
                    : <><Sparkles size={16} /> Tạo với AI (Ctrl+Enter)</>}
                </button>
              )}

              {/* Error */}
              {aiError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle size={13} className="shrink-0" />
                  {aiError}
                  <button onClick={callAiBulk} className="ml-auto font-bold underline">Thử lại</button>
                </div>
              )}

              {/* Proposals preview */}
              {aiProposals.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">
                        AI tạo được {aiProposals.length} chương trình
                      </h4>
                      <p className="text-xs text-gray-500">Đã chọn {selectedProposals.size}/{aiProposals.length}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (selectedProposals.size === aiProposals.length) setSelectedProposals(new Set());
                          else setSelectedProposals(new Set(aiProposals.map((_, i) => i)));
                        }}
                        className="text-xs text-violet-600 font-semibold hover:underline"
                      >
                        {selectedProposals.size === aiProposals.length ? 'Bỏ tất cả' : 'Chọn tất cả'}
                      </button>
                      <button onClick={() => { setAiProposals([]); setAiError(''); }}
                        className="text-xs text-gray-400 hover:text-gray-600 font-semibold hover:underline">
                        ← Thử lại
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {aiProposals.map((p, i) => (
                      <label key={i}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedProposals.has(i) ? 'border-violet-300 bg-violet-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input type="checkbox"
                          checked={selectedProposals.has(i)}
                          onChange={() => {
                            const next = new Set(selectedProposals);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            setSelectedProposals(next);
                          }}
                          className="mt-1 rounded accent-violet-600"
                        />
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                          style={{ backgroundColor: p.bgColor || '#FFF5F3' }}>
                          {p.emoji || '🎉'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-gray-900 truncate">{p.title}</p>
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color || '#A4756B' }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{p.startDate} → {p.endDate}</p>
                          {p.shortDesc && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.shortDesc}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {aiProposals.length > 0 && (
              <div className="flex gap-3 px-6 py-4 border-t shrink-0">
                <button onClick={() => setAiModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  Hủy
                </button>
                <button
                  onClick={importAiProposals}
                  disabled={selectedProposals.size === 0 || importingAi}
                  className="flex-1 bg-violet-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importingAi
                    ? <><Loader2 size={15} className="animate-spin" /> Đang import...</>
                    : <><Check size={15} /> Import {selectedProposals.size} chương trình</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Assign Customer Modal ══════════════════════════════════════════════ */}
      {showAssign && selectedPromoForCustomers && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">Gắn khách vào KM</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedPromoForCustomers.emoji} {selectedPromoForCustomers.title}
                </p>
              </div>
              <button
                onClick={() => { setShowAssign(false); setAssignSearch(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b shrink-0">
              <input
                autoFocus
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc số điện thoại..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {(() => {
                const tag = `🎉 KM: ${selectedPromoForCustomers.title}`;
                const searchLower = assignSearch.toLowerCase();
                const unassigned = consultations.filter(c => {
                  if ((c.tags || []).includes(tag)) return false;
                  if (!assignSearch) return true;
                  return c.name.toLowerCase().includes(searchLower) || c.phone.includes(assignSearch);
                }).slice(0, 30);

                if (unassigned.length === 0) return (
                  <p className="text-center text-sm text-gray-400 py-8">
                    {assignSearch ? 'Không tìm thấy khách phù hợp' : 'Tất cả khách đã được gắn KM này'}
                  </p>
                );

                return unassigned.map(c => {
                  const statusCfg = STATUS_CONFIG_MINI[c.status] || STATUS_CONFIG_MINI.new;
                  return (
                    <button key={c.id}
                      onClick={() => assignToPromo(c.id, selectedPromoForCustomers)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{c.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono">{c.phone}</p>
                      </div>
                      <UserCheck size={14} className="text-gray-300 shrink-0" />
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PromoCard sub-component ──────────────────────────────────────────────────

interface PromoCardProps {
  promo: Promotion;
  onEdit: () => void;
  onAiContent?: () => void;
  onDelete: () => void;
  onToggle: () => void;
  confirmDelete: string | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

const PromoCard: React.FC<PromoCardProps> = ({
  promo, onEdit, onAiContent, onDelete, onToggle, confirmDelete, onConfirmDelete, onCancelDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const status = promoStatus(promo);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!promo.enabled ? 'opacity-60' : ''}`}
      style={{ borderTopColor: promo.color, borderTopWidth: 3 }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: promo.bgColor }}>
            {promo.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{promo.title}</h4>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_BADGE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {format(parseISO(promo.startDate), 'dd/MM')} – {format(parseISO(promo.endDate), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {onAiContent && (
                  <button onClick={onAiContent}
                    className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
                    title="AI viết nội dung cho KM này">
                    <Sparkles size={13} />
                  </button>
                )}
                <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors">
                  <Edit3 size={14} />
                </button>
                {confirmDelete === promo.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={onConfirmDelete} className="px-2 py-1 bg-red-600 text-white text-[10px] rounded-lg font-bold">OK</button>
                    <button onClick={onCancelDelete} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={12} /></button>
                  </div>
                ) : (
                  <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {promo.shortDesc && <p className="text-xs text-gray-600 mt-2">{promo.shortDesc}</p>}

        {promo.content && (
          <div className="mt-2">
            <p className={`text-xs text-gray-500 ${expanded ? '' : 'line-clamp-2'}`}>{promo.content}</p>
            {promo.content.length > 100 && (
              <button onClick={() => setExpanded(v => !v)}
                className="text-[11px] text-primary font-semibold mt-1 hover:underline">
                {expanded ? 'Thu gọn' : 'Xem thêm'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-3 flex items-center justify-between gap-2">
        <button onClick={onToggle}
          className={`text-[11px] font-semibold flex items-center gap-1 ${promo.enabled ? 'text-green-600' : 'text-gray-400'}`}>
          {promo.enabled ? <><ToggleRight size={13} /> Đang bật</> : <><ToggleLeft size={13} /> Đang tắt</>}
        </button>
        {!promo.showOnWebsite && (
          <span className="text-[10px] text-yellow-600 flex items-center gap-1">
            <EyeOff size={10} /> Ẩn website
          </span>
        )}
      </div>
    </div>
  );
};
