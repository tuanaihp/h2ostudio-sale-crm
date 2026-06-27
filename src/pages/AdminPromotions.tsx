import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import { uploadImageToStorage } from '../utils/image';
import {
  ChevronLeft, ChevronRight, Plus, Edit3, Trash2, Save, X,
  Calendar, List, TrendingUp, Eye, EyeOff, Megaphone,
  ToggleLeft, ToggleRight, Users, ArrowLeft, Check, AlertCircle,
  Sparkles, UserCheck, Phone, MessageCircle, Loader2, Image as ImageIcon, Palette, Upload,
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

interface SaleDay {
  id: string;
  dayDate: string;
  stage: string;
  format: string;
  subject: string;
  quote: string;
  caption: string;
  imagePrompt: string;
  bgImageUrl: string;
  fontColor: string;
  highlightColor: string;
  quotePosition: number;
  fontSize: number;
  imageSize: string;
  fontFamily: string;
  logoUrl: string;
  logoPosition: string;
  logoSize: number;
  taskStatus: string;
  contentStatus: string;
  assignedTo: string;
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
  ctaText: 'Xem ngay ưu đãi!',
  showOnWebsite: true,
  enabled: true,
  imageUrl: '',
};

const IMAGE_MODELS = [
  { id: 'dall-e-3', label: 'DALL-E 3 — Chất lượng cao ⭐', quality: 'standard', note: '$0.04/ảnh' },
  { id: 'dall-e-3-hd', label: 'DALL-E 3 HD — Sắc nét tối đa', quality: 'hd', note: '$0.08/ảnh' },
  { id: 'dall-e-2', label: 'DALL-E 2 — Nhanh & Rẻ', quality: undefined, note: '$0.02/ảnh' },
] as const;

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

// ─── Lịch 365 constants ───────────────────────────────────────────────────────

const STAGES       = ['Educate', 'Awareness', 'Consideration', 'Conversion', 'Retention'];
const FORMATS      = ['Offer', 'Story', 'Educate', 'Entertain', 'Inspire'];
const CONTENT_STATUS_OPTS = [
  { v: 'draft',     l: 'Draft',   cls: 'bg-gray-100 text-gray-600' },
  { v: 'ready',     l: 'Ready',   cls: 'bg-green-100 text-green-700' },
  { v: 'published', l: 'Đã đăng', cls: 'bg-blue-100 text-blue-700' },
];
const IMAGE_SIZES   = ['Vuông (1:1)', 'Ngang (16:9)', 'Dọc (9:16)', 'Story (4:5)'];
const FONT_FAMILIES = ['Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Dancing Script'];
const LOGO_POS_OPTS = ['Dưới - Phải', 'Dưới - Trái', 'Trên - Phải', 'Trên - Trái', 'Giữa'];
const VI_MONTHS     = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                       'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

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
  ctaText: row.cta_text || 'Xem ngay ưu đãi!',
  showOnWebsite: row.show_on_website !== false,
  enabled: row.enabled !== false,
  createdAt: row.created_at,
  imageUrl: row.image_url || '',
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
  const { isAdmin, isAuthReady, consultations, updateConsultationTags, settings } = useApp();

  // ── Existing state ──────────────────────────────────────────────────────────
  const [promos, setPromos]               = useState<Promotion[]>([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState<'cal365' | 'calendar' | 'list' | 'stats' | 'customers'>('cal365');
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

  // ── AI Image state ───────────────────────────────────────────────────────────
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [imageGenModel, setImageGenModel] = useState<'dall-e-3' | 'dall-e-3-hd' | 'dall-e-2'>('dall-e-3');
  const [imagePreview, setImagePreview] = useState('');
  const [imageGenError, setImageGenError] = useState('');
  const [imagePosX, setImagePosX] = useState(50);
  const [imagePosY, setImagePosY] = useState(50);

  // ── Lịch 365 state ──────────────────────────────────────────────────────────
  const [calView, setCalView]               = useState<'year' | 'month'>('year');
  const [calYear, setCalYear]               = useState(new Date().getFullYear());
  const [calMonth365, setCalMonth365]       = useState(new Date());
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);
  const [saleDays, setSaleDays]             = useState<SaleDay[]>([]);
  const [saleDayLoading, setSaleDayLoading] = useState(false);
  const [saleForm, setSaleForm]             = useState<Partial<SaleDay>>({});
  const [savingSaleDay, setSavingSaleDay]   = useState(false);
  const [aiFieldLoading, setAiFieldLoading] = useState('');
  const [sdImgLoading, setSdImgLoading]     = useState(false);

  // ── Customers tab state ─────────────────────────────────────────────────────
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch]       = useState('');
  const [showAssign, setShowAssign]           = useState(false);

  if (isAuthReady && !isAdmin) return <Navigate to="/admin/login" replace />;

  useEffect(() => { loadPromos(); }, []);
  useEffect(() => { loadSaleDays(calYear); }, [calYear]);

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
    setImagePreview('');
    setImageGenError('');
    setImagePosX(50);
    setImagePosY(50);
    setShowModal(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingPromo(p);
    setForm({
      title: p.title, shortDesc: p.shortDesc, content: p.content,
      emoji: p.emoji, color: p.color, bgColor: p.bgColor,
      startDate: p.startDate, endDate: p.endDate,
      ctaText: p.ctaText, showOnWebsite: p.showOnWebsite, enabled: p.enabled,
      imageUrl: p.imageUrl || '',
    });
    setImagePreview(p.imageUrl || '');
    setImageGenError('');
    setImagePosX(50);
    setImagePosY(50);
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
      image_url: form.imageUrl || '',
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

  // ── AI Image Generation ───────────────────────────────────────────────────

  const callAiImage = async () => {
    if (!form.title.trim()) return;
    if (settings?.aiImageEnabled === false) {
      setImageGenError('AI Tạo Ảnh đang tắt. Vào Settings → Cổng kết nối → bật Image AI.');
      return;
    }
    const apiKey = settings?.aiImageApiKey || settings?.integrationChatApiKey;
    if (!apiKey) {
      setImageGenError('Cần API Key OpenAI. Vào Settings → Cổng kết nối → nhập API Key Image AI.');
      return;
    }
    const imageModel = settings?.aiImageModel || imageGenModel;
    setImageGenLoading(true);
    setImageGenError('');
    setImagePreview('');
    try {
      const actualModel = imageModel === 'dall-e-3-hd' ? 'dall-e-3' : imageModel;
      const quality = imageModel === 'dall-e-3-hd' ? 'hd' : 'standard';
      const res = await fetch('/api/ai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoTitle: form.title,
          shortDesc: form.shortDesc,
          emoji: form.emoji,
          color: form.color,
          apiKey,
          model: actualModel,
          quality,
        }),
      });
      const data = await res.json();
      if (data.error) { setImageGenError(data.error); return; }
      if (data.b64) {
        const dataUrl = `data:image/png;base64,${data.b64}`;
        setImagePreview(dataUrl);
      }
    } catch (e: any) {
      setImageGenError(e?.message || 'Lỗi kết nối');
    }
    setImageGenLoading(false);
  };

  const useGeneratedImage = async () => {
    if (!imagePreview || !imagePreview.startsWith('data:')) return;
    setImageGenLoading(true);
    try {
      const path = `promotions/${Date.now()}.png`;
      const url = await uploadImageToStorage(imagePreview, path);
      setForm(f => ({ ...f, imageUrl: url }));
      setImagePreview(url);
    } catch (e: any) {
      setImageGenError(e?.message || 'Lỗi upload ảnh');
    }
    setImageGenLoading(false);
  };

  const cropImageToPosition = () => {
    if (!imagePreview || !imagePreview.startsWith('data:')) return;
    const img = new Image();
    img.onload = () => {
      const minDim = Math.min(img.width, img.height);
      const sourceX = Math.round((img.width  - minDim) * (imagePosX / 100));
      const sourceY = Math.round((img.height - minDim) * (imagePosY / 100));
      const canvas = document.createElement('canvas');
      canvas.width  = minDim;
      canvas.height = minDim;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, sourceX, sourceY, minDim, minDim, 0, 0, minDim, minDim);
      setImagePreview(canvas.toDataURL('image/jpeg', 0.92));
      setImagePosX(50);
      setImagePosY(50);
    };
    img.src = imagePreview;
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
        body: JSON.stringify({
          command: aiCommand, type: 'bulk',
          apiKey: settings?.integrationChatApiKey,
          apiUrl: settings?.integrationChatApiUrl,
          modelName: settings?.integrationChatApiModelName,
        }),
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
        cta_text: p.ctaText || 'Xem ngay ưu đãi!',
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
          apiKey: settings?.integrationChatApiKey,
          apiUrl: settings?.integrationChatApiUrl,
          modelName: settings?.integrationChatApiModelName,
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
          apiKey: settings?.integrationChatApiKey,
          apiUrl: settings?.integrationChatApiUrl,
          modelName: settings?.integrationChatApiModelName,
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

  // ── Sale Days (Lịch 365) ──────────────────────────────────────────────────

  const dbToSaleDay = (row: any): SaleDay => ({
    id: row.id, dayDate: row.day_date,
    stage: row.stage || '', format: row.format || '',
    subject: row.subject || '', quote: row.quote || '',
    caption: row.caption || '', imagePrompt: row.image_prompt || '',
    bgImageUrl: row.bg_image_url || '', fontColor: row.font_color || '#FFFFFF',
    highlightColor: row.highlight_color || '#00CB53',
    quotePosition: row.quote_position ?? 50, fontSize: row.font_size ?? 24,
    imageSize: row.image_size || 'Vuông (1:1)', fontFamily: row.font_family || 'Inter',
    logoUrl: row.logo_url || '', logoPosition: row.logo_position || 'Dưới - Phải',
    logoSize: row.logo_size ?? 40, taskStatus: row.task_status || 'todo',
    contentStatus: row.content_status || 'draft', assignedTo: row.assigned_to || '',
  });

  const loadSaleDays = async (year: number) => {
    setSaleDayLoading(true);
    try {
      const { data } = await supabase.from('sale_days').select('*').eq('year', year);
      setSaleDays((data || []).map(dbToSaleDay));
    } catch { /* table may not exist yet */ }
    setSaleDayLoading(false);
  };

  const openSaleDay = (dateStr: string) => {
    setSelectedCalDay(dateStr);
    const existing = saleDays.find(d => d.dayDate === dateStr);
    setSaleForm(existing ? { ...existing } : {
      dayDate: dateStr, stage: '', format: '', subject: '', quote: '',
      caption: '', imagePrompt: '', bgImageUrl: '', fontColor: '#FFFFFF',
      highlightColor: '#00CB53', quotePosition: 50, fontSize: 24,
      imageSize: 'Vuông (1:1)', fontFamily: 'Inter', logoUrl: '',
      logoPosition: 'Dưới - Phải', logoSize: 40,
      taskStatus: 'todo', contentStatus: 'draft', assignedTo: '',
    });
  };

  const saveSaleDay = async () => {
    if (!selectedCalDay) return;
    setSavingSaleDay(true);
    const existing = saleDays.find(d => d.dayDate === selectedCalDay);
    const row = {
      day_date: selectedCalDay,
      year: parseInt(selectedCalDay.split('-')[0]),
      month: parseInt(selectedCalDay.split('-')[1]),
      stage: saleForm.stage || '', format: saleForm.format || '',
      subject: saleForm.subject || '', quote: saleForm.quote || '',
      caption: saleForm.caption || '', image_prompt: saleForm.imagePrompt || '',
      bg_image_url: saleForm.bgImageUrl || '', font_color: saleForm.fontColor || '#FFFFFF',
      highlight_color: saleForm.highlightColor || '#00CB53',
      quote_position: saleForm.quotePosition ?? 50, font_size: saleForm.fontSize ?? 24,
      image_size: saleForm.imageSize || 'Vuông (1:1)', font_family: saleForm.fontFamily || 'Inter',
      logo_url: saleForm.logoUrl || '', logo_position: saleForm.logoPosition || 'Dưới - Phải',
      logo_size: saleForm.logoSize ?? 40, task_status: saleForm.taskStatus || 'todo',
      content_status: saleForm.contentStatus || 'draft', assigned_to: saleForm.assignedTo || '',
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      await supabase.from('sale_days').update(row).eq('id', existing.id);
    } else {
      await supabase.from('sale_days').insert({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    }
    await loadSaleDays(calYear);
    setSavingSaleDay(false);
  };

  const genAiSaleContent = async (field: 'subject' | 'quote' | 'caption') => {
    setAiFieldLoading(field);
    try {
      const prompts: Record<string, string> = {
        subject: `Tạo 1 chủ đề bài đăng mạng xã hội ngắn gọn (15-25 từ) cho studio ảnh cưới H2O Studio. Stage: ${saleForm.stage || 'Educate'}. Format: ${saleForm.format || 'Offer'}. Ngày: ${selectedCalDay}. Chỉ trả về chủ đề, không giải thích thêm.`,
        quote: `Tạo 1 câu trích dẫn hay về tình yêu hoặc hôn nhân (20-35 từ tiếng Việt) phù hợp cho studio ảnh cưới. Chỉ trả về câu trích dẫn, không thêm gì khác.`,
        caption: `Viết caption mạng xã hội (50-80 từ) cho studio ảnh cưới H2O Studio. Chủ đề: "${saleForm.subject || 'ảnh cưới đẹp'}". Stage: ${saleForm.stage || 'Educate'}. Thêm 2-3 emoji phù hợp, kết thúc bằng CTA. Chỉ trả về caption.`,
      };
      const res = await fetch('/api/ai-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'field', prompt: prompts[field],
          apiKey: settings?.integrationChatApiKey,
          apiUrl: settings?.integrationChatApiUrl,
          modelName: settings?.integrationChatApiModelName,
        }),
      });
      const data = await res.json();
      const text = data.result || data.text || '';
      if (text) setSaleForm(f => ({ ...f, [field]: typeof text === 'string' ? text : '' }));
    } catch { /* ignore */ }
    setAiFieldLoading('');
  };

  const callSaleDayImage = async () => {
    if (settings?.aiImageEnabled === false) return;
    const apiKey = settings?.aiImageApiKey || settings?.integrationChatApiKey;
    if (!apiKey) return;
    setSdImgLoading(true);
    try {
      const res = await fetch('/api/ai-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoTitle: saleForm.subject || 'ảnh cưới đẹp',
          shortDesc: saleForm.imagePrompt || 'phong cách sang trọng, nữ tính',
          emoji: '📸', color: '#E53E3E',
          apiKey, model: 'dall-e-3', quality: 'standard',
        }),
      });
      const data = await res.json();
      if (data.b64) {
        const dataUrl = `data:image/png;base64,${data.b64}`;
        const uploaded = await uploadImageToStorage(
          await (await fetch(dataUrl)).blob() as File,
          'sale-days'
        );
        setSaleForm(f => ({ ...f, bgImageUrl: uploaded }));
      }
    } catch { /* ignore */ }
    setSdImgLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────

  const selectedPromoForCustomers = selectedPromoId ? promos.find(p => p.id === selectedPromoId) : null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
              <Megaphone size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">Lịch Khuyến Mãi</p>
              <p className="text-[10px] text-gray-400">{promos.length} chương trình</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {([
            ['cal365',    Calendar,    'Lịch 365'],
            ['list',      List,        'Danh sách KM'],
            ['stats',     TrendingUp,  'Thống kê'],
            ['customers', Users,       'Khách hàng'],
            ['calendar',  Calendar,    'Lịch KM cũ'],
          ] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === key ? 'bg-rose-50 text-rose-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <Link to="/admin/consultations"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors">
            ← Về trang Admin
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto flex flex-col">

        {/* Action bar */}
        <div className="sticky top-0 z-20 bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-gray-800 text-sm">
            {tab === 'cal365'    && '📅 Lịch Content 365 Ngày'}
            {tab === 'calendar'  && '📅 Lịch Khuyến Mãi'}
            {tab === 'list'      && '📋 Danh Sách KM'}
            {tab === 'stats'     && '📈 Thống Kê'}
            {tab === 'customers' && '👥 Khách Hàng'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAiModal(true); setAiProposals([]); setAiError(''); }}
              className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Sparkles size={14} />
              AI tạo KM
            </button>
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              Tạo KM
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6 w-full">

        {/* ════════════════ LỊCH 365 TAB ════════════════ */}
        {tab === 'cal365' && (
          <div className="space-y-4">

            {/* ── YEAR VIEW ── */}
            {calView === 'year' && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-bold text-gray-800">Promotion Engine 365</h2>
                    <div className="flex items-center gap-0.5 bg-white border rounded-lg px-1 py-0.5">
                      <button onClick={() => setCalYear(y => y - 1)} className="p-1.5 hover:bg-gray-50 rounded transition-colors"><ChevronLeft size={14} /></button>
                      <span className="text-sm font-bold text-gray-700 px-2">Năm {calYear}</span>
                      <button onClick={() => setCalYear(y => y + 1)} className="p-1.5 hover:bg-gray-50 rounded transition-colors"><ChevronRight size={14} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setAiModal(true); setAiProposals([]); setAiError(''); }}
                      className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      <Sparkles size={13} /> AI Lên Lịch Sale
                    </button>
                  </div>
                </div>

                {saleDayLoading && <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthKey = `${calYear}-${String(i + 1).padStart(2, '0')}`;
                    const monthDate = new Date(calYear, i, 1);
                    const daysInMonth = saleDays.filter(d => d.dayDate.startsWith(monthKey));
                    const readyCount = daysInMonth.filter(d => d.contentStatus === 'ready').length;
                    const publishedCount = daysInMonth.filter(d => d.contentStatus === 'published').length;
                    const isEmpty = daysInMonth.length === 0;
                    const firstSubject = daysInMonth.find(d => d.subject)?.subject || '';
                    return (
                      <div key={i} className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="px-4 py-3 border-b bg-gray-50/70 flex items-center justify-between">
                          <span className="font-bold text-gray-800 text-sm">{VI_MONTHS[i]}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isEmpty ? 'bg-gray-100 text-gray-400' : 'bg-rose-100 text-rose-600'}`}>
                            {isEmpty ? 'EMPTY' : `${daysInMonth.length} ngày`}
                          </span>
                        </div>
                        <div className="px-4 py-3 space-y-1.5">
                          <div className="flex items-start justify-between text-xs gap-2">
                            <span className="text-gray-400 shrink-0">Chủ đề:</span>
                            <span className="text-gray-600 text-right text-[11px] line-clamp-1">
                              {firstSubject ? firstSubject.slice(0, 28) + (firstSubject.length > 28 ? '...' : '') : 'Chưa có chủ đề'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Chiến dịch:</span>
                            <span className="text-gray-600 font-semibold">{daysInMonth.length} ngày đã lên</span>
                          </div>
                          {(readyCount + publishedCount) > 0 && (
                            <div className="flex gap-1 flex-wrap mt-1">
                              {readyCount > 0 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">{readyCount} ready</span>}
                              {publishedCount > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">{publishedCount} đăng</span>}
                            </div>
                          )}
                        </div>
                        <div className="px-4 pb-3 flex items-center justify-between border-t border-gray-50 pt-2">
                          <button
                            onClick={() => { setCalMonth365(monthDate); setCalView('month'); setSelectedCalDay(null); }}
                            className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5"
                          >
                            Chi tiết →
                          </button>
                          <button
                            onClick={() => { setCalMonth365(monthDate); setCalView('month'); setSelectedCalDay(null); }}
                            className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── MONTH VIEW ── */}
            {calView === 'month' && (
              <>
                {/* Month nav header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setCalView('year'); setSelectedCalDay(null); }}
                      className="p-2 rounded-xl bg-white border hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setCalMonth365(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all"><ChevronLeft size={14} /></button>
                    <h2 className="font-bold text-gray-800 capitalize">
                      {format(calMonth365, 'MMMM yyyy', { locale: vi })} — Lịch Content Sale
                    </h2>
                    <button onClick={() => setCalMonth365(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all"><ChevronRight size={14} /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setAiModal(true); setAiProposals([]); setAiError(''); }}
                      className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      <Sparkles size={12} /> AI Gợi ý Sale
                    </button>
                  </div>
                </div>

                {/* Calendar + Day panel */}
                <div className="flex gap-4 items-start">

                  {/* Calendar grid */}
                  <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${selectedCalDay ? 'flex-1 min-w-0' : 'w-full'}`}>
                    <div className="grid grid-cols-7 border-b bg-gray-50">
                      {WEEK_DAYS.map(d => (
                        <div key={d} className="py-2.5 text-center text-xs font-bold text-gray-500">{d}</div>
                      ))}
                    </div>
                    {(() => {
                      const monthDays = eachDayOfInterval({ start: startOfMonth(calMonth365), end: endOfMonth(calMonth365) });
                      const dow = getDay(startOfMonth(calMonth365));
                      const offset = dow === 0 ? 6 : dow - 1;
                      const cells: (Date | null)[] = [...Array(offset).fill(null), ...monthDays];
                      while (cells.length % 7 !== 0) cells.push(null);
                      const rows: (Date | null)[][] = [];
                      for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
                      return rows.map((row, ri) => (
                        <div key={ri} className="grid grid-cols-7 border-b last:border-b-0">
                          {row.map((day, ci) => {
                            if (!day) return <div key={ci} className="border-r last:border-r-0 bg-gray-50/40" style={{ minHeight: '88px' }} />;
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayData = saleDays.find(d => d.dayDate === dateStr);
                            const isSelected = selectedCalDay === dateStr;
                            const statusCfg = CONTENT_STATUS_OPTS.find(s => s.v === dayData?.contentStatus);
                            return (
                              <div
                                key={ci}
                                onClick={() => openSaleDay(dateStr)}
                                className={`border-r last:border-r-0 p-1.5 cursor-pointer transition-colors group ${
                                  isSelected ? 'bg-rose-50 ring-2 ring-rose-400 ring-inset' :
                                  isToday(day) ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'
                                }`}
                                style={{ minHeight: '88px' }}
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                                    isToday(day) ? 'bg-amber-400 text-white' :
                                    isSelected ? 'bg-rose-500 text-white' : 'text-gray-700 group-hover:bg-gray-100'
                                  }`}>
                                    {format(day, 'd')}
                                  </span>
                                  {statusCfg && (
                                    <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${statusCfg.cls}`}>{statusCfg.l}</span>
                                  )}
                                </div>
                                {dayData?.subject && (
                                  <p className="text-[10px] text-gray-600 leading-tight line-clamp-2">{dayData.subject}</p>
                                )}
                                {dayData?.stage && !dayData?.subject && (
                                  <span className="text-[9px] bg-violet-100 text-violet-700 px-1 py-0.5 rounded-full">{dayData.stage}</span>
                                )}
                                {!dayData && (
                                  <Plus size={10} className="text-gray-200 group-hover:text-gray-400 mt-1 transition-colors" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Day detail panel */}
                  {selectedCalDay && (
                    <div className="w-80 shrink-0 space-y-3" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>

                      {/* Panel header */}
                      <div className="bg-white rounded-2xl border shadow-sm p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">
                              Ngày {parseInt(selectedCalDay.split('-')[2])}/{parseInt(selectedCalDay.split('-')[1])}
                            </span>
                            {(() => {
                              const s = CONTENT_STATUS_OPTS.find(x => x.v === (saleForm.contentStatus || 'draft'));
                              return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s?.cls || 'bg-gray-100 text-gray-600'}`}>{s?.l}</span>;
                            })()}
                          </div>
                          <button onClick={() => setSelectedCalDay(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400">Chỉnh tiêu đề, caption, prompt ảnh và trạng thái đăng bài.</p>
                      </div>

                      {/* Stage + Format + Subject + Quote + Caption */}
                      <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Stage</label>
                            <select value={saleForm.stage || ''} onChange={e => setSaleForm(f => ({ ...f, stage: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300">
                              <option value="">-- Chọn --</option>
                              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Format</label>
                            <select value={saleForm.format || ''} onChange={e => setSaleForm(f => ({ ...f, format: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300">
                              <option value="">-- Chọn --</option>
                              {FORMATS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Subject */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Chủ đề</label>
                            <button onClick={() => genAiSaleContent('subject')} disabled={aiFieldLoading === 'subject'}
                              className="text-[10px] text-violet-600 font-bold flex items-center gap-1 hover:underline disabled:opacity-50">
                              {aiFieldLoading === 'subject' ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                              AI Tạo chủ đề
                            </button>
                          </div>
                          <textarea value={saleForm.subject || ''} onChange={e => setSaleForm(f => ({ ...f, subject: e.target.value }))}
                            placeholder="Nhập chủ đề bài đăng..." rows={2}
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300" />
                        </div>

                        {/* Quote */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Trích dẫn hay</label>
                            <button onClick={() => genAiSaleContent('quote')} disabled={aiFieldLoading === 'quote'}
                              className="text-[10px] text-violet-600 font-bold flex items-center gap-1 hover:underline disabled:opacity-50">
                              {aiFieldLoading === 'quote' ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                              AI Tạo trích dẫn
                            </button>
                          </div>
                          <textarea value={saleForm.quote || ''} onChange={e => setSaleForm(f => ({ ...f, quote: e.target.value }))}
                            placeholder="Nhập yêu cầu thêm cho AI..." rows={2}
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300" />
                          {saleForm.quote && (
                            <p className="text-xs text-gray-700 mt-1.5 p-2 bg-gray-50 rounded-lg italic border border-gray-100">"{saleForm.quote}"</p>
                          )}
                        </div>

                        {/* Caption */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Caption</label>
                            <button onClick={() => genAiSaleContent('caption')} disabled={aiFieldLoading === 'caption'}
                              className="text-[10px] text-violet-600 font-bold flex items-center gap-1 hover:underline disabled:opacity-50">
                              {aiFieldLoading === 'caption' ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                              AI Tạo Caption
                            </button>
                          </div>
                          <textarea value={saleForm.caption || ''} onChange={e => setSaleForm(f => ({ ...f, caption: e.target.value }))}
                            placeholder="Nhập yêu cầu thêm cho AI (kể chuyện cảm động, thêm nhiều emoji...)." rows={3}
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300" />
                        </div>
                      </div>

                      {/* Image Designer */}
                      <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Palette size={13} className="text-rose-400" /> Thiết kế hình ảnh
                        </p>

                        {/* Preview */}
                        <div
                          className="rounded-xl overflow-hidden relative flex items-center justify-center text-center"
                          style={{
                            background: saleForm.bgImageUrl
                              ? `url(${saleForm.bgImageUrl}) center/cover no-repeat`
                              : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                            aspectRatio: saleForm.imageSize?.includes('16:9') ? '16/9' : saleForm.imageSize?.includes('9:16') ? '9/16' : '1/1',
                            minHeight: '120px', maxHeight: '200px',
                          }}
                        >
                          <div className="absolute inset-0 bg-black/30" />
                          <div className="relative z-10 p-4 max-w-full">
                            {saleForm.quote ? (
                              <p className="font-bold leading-snug"
                                style={{ fontSize: `${Math.min((saleForm.fontSize || 24) * 0.65, 18)}px`, color: saleForm.fontColor || '#FFFFFF', fontFamily: saleForm.fontFamily || 'Inter' }}>
                                {saleForm.quote}
                              </p>
                            ) : (
                              <p className="text-white/40 text-xs">Trích dẫn sẽ hiển thị ở đây</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">Kích thước ảnh</label>
                            <select value={saleForm.imageSize || 'Vuông (1:1)'} onChange={e => setSaleForm(f => ({ ...f, imageSize: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                              {IMAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">Font chữ</label>
                            <select value={saleForm.fontFamily || 'Inter'} onChange={e => setSaleForm(f => ({ ...f, fontFamily: e.target.value }))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                              {FONT_FAMILIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">Màu chữ</label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={saleForm.fontColor || '#FFFFFF'} onChange={e => setSaleForm(f => ({ ...f, fontColor: e.target.value }))}
                                className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                              <span className="text-[11px] text-gray-500 font-mono">{saleForm.fontColor || '#FFFFFF'}</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold mb-1 block">Màu highlight</label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={saleForm.highlightColor || '#00CB53'} onChange={e => setSaleForm(f => ({ ...f, highlightColor: e.target.value }))}
                                className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                              <span className="text-[11px] text-gray-500 font-mono">{saleForm.highlightColor || '#00CB53'}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-400 font-bold mb-1 block">
                            Cỡ chữ: {saleForm.fontSize || 24}px
                          </label>
                          <input type="range" min={12} max={60} value={saleForm.fontSize || 24}
                            onChange={e => setSaleForm(f => ({ ...f, fontSize: parseInt(e.target.value) }))}
                            className="w-full accent-rose-500" />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-400 font-bold mb-1 block">Vị trí logo</label>
                          <select value={saleForm.logoPosition || 'Dưới - Phải'} onChange={e => setSaleForm(f => ({ ...f, logoPosition: e.target.value }))}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                            {LOGO_POS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-400 font-bold mb-1 block">Gợi ý Prompt ảnh (AI)</label>
                          <textarea value={saleForm.imagePrompt || ''} onChange={e => setSaleForm(f => ({ ...f, imagePrompt: e.target.value }))}
                            placeholder="Ảnh social media cho ảnh cưới, phong cách sang nhẹ, nữ tính, tông hồng pastel..." rows={2}
                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={callSaleDayImage} disabled={sdImgLoading}
                            className="flex items-center justify-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-bold px-3 py-2 rounded-lg hover:bg-violet-200 disabled:opacity-50 transition-colors">
                            {sdImgLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                            AI tạo ảnh nền
                          </button>
                          <label className="flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                            <ImageIcon size={11} /> Tải ảnh nền
                            <input type="file" accept="image/*" className="hidden" onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const url = await uploadImageToStorage(file, 'sale-days');
                              setSaleForm(f => ({ ...f, bgImageUrl: url }));
                            }} />
                          </label>
                        </div>

                        {saleForm.bgImageUrl && (
                          <button onClick={() => setSaleForm(f => ({ ...f, bgImageUrl: '' }))}
                            className="text-[11px] text-red-400 hover:text-red-600 hover:underline flex items-center gap-1">
                            <X size={10} /> Xóa ảnh nền
                          </button>
                        )}
                      </div>

                      {/* Publishing + Status */}
                      <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          🚀 Hệ thống Đăng bài
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button className="text-[11px] font-bold px-2 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">FB Creator Studio</button>
                          <button className="text-[11px] font-bold px-2 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors">TikTok Creator</button>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Trạng thái</label>
                          <select value={saleForm.contentStatus || 'draft'} onChange={e => setSaleForm(f => ({ ...f, contentStatus: e.target.value }))}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-300">
                            {CONTENT_STATUS_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Save */}
                      <button onClick={saveSaleDay} disabled={savingSaleDay}
                        className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                        {savingSaleDay ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {savingSaleDay ? 'Đang lưu...' : 'Lưu thiết kế'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

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
      </main>

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
                  placeholder="Xem ngay ưu đãi!"
                  value={form.ctaText}
                  onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
                />
              </div>

              {/* ── AI Image Generation ── */}
              <div className="border border-violet-200 bg-violet-50/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette size={14} className="text-violet-600" />
                    <span className="text-xs font-bold text-violet-800">AI Tạo Ảnh Banner (DALL-E)</span>
                  </div>
                  {/* Model selector */}
                  <select
                    value={imageGenModel}
                    onChange={e => setImageGenModel(e.target.value as typeof imageGenModel)}
                    className="text-[11px] border border-violet-200 bg-white rounded-lg px-2 py-1 text-violet-700 font-semibold focus:outline-none focus:ring-1 focus:ring-violet-300"
                  >
                    {IMAGE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label} ({m.note})</option>
                    ))}
                  </select>
                </div>

                {/* Preview area */}
                {(imagePreview || form.imageUrl) ? (
                  <div className="space-y-2">
                    {/* Image with position control */}
                    <div className="relative group rounded-xl overflow-hidden">
                      <img
                        src={imagePreview || form.imageUrl}
                        alt="AI generated banner"
                        className="w-full h-36 object-cover rounded-xl transition-none"
                        style={{ objectPosition: `${imagePosX}% ${imagePosY}%` }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {imagePreview.startsWith('data:') && (
                          <button
                            onClick={useGeneratedImage}
                            disabled={imageGenLoading}
                            className="flex items-center gap-1.5 bg-white text-violet-700 text-xs font-bold px-3 py-2 rounded-xl hover:bg-violet-50 transition-colors"
                          >
                            {imageGenLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Dùng ảnh này
                          </button>
                        )}
                        <button
                          onClick={() => { setImagePreview(''); setForm(f => ({ ...f, imageUrl: '' })); setImagePosX(50); setImagePosY(50); }}
                          className="flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-700 transition-colors"
                        >
                          <X size={12} /> Xóa
                        </button>
                      </div>
                      {imagePreview.startsWith('data:') && (
                        <div className="absolute bottom-0 inset-x-0 bg-amber-500/90 text-white text-[10px] font-bold text-center py-1.5">
                          ⚠ Chưa lưu — Hover vào ảnh và click "Dùng ảnh này" để upload
                        </div>
                      )}
                    </div>

                    {/* Position sliders */}
                    <div className="bg-violet-50/60 rounded-xl px-3 py-2 space-y-1.5 border border-violet-100">
                      <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">Chỉnh vị trí ảnh</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-violet-500 w-20 shrink-0">← Trái/Phải →</span>
                        <input type="range" min={0} max={100} value={imagePosX}
                          onChange={e => setImagePosX(Number(e.target.value))}
                          className="flex-1 h-1.5 accent-violet-500 cursor-pointer" />
                        <span className="text-[9px] font-mono text-violet-400 w-7 text-right">{imagePosX}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-violet-500 w-20 shrink-0">↑ Trên/Dưới ↓</span>
                        <input type="range" min={0} max={100} value={imagePosY}
                          onChange={e => setImagePosY(Number(e.target.value))}
                          className="flex-1 h-1.5 accent-violet-500 cursor-pointer" />
                        <span className="text-[9px] font-mono text-violet-400 w-7 text-right">{imagePosY}%</span>
                      </div>
                      {imagePreview?.startsWith('data:') && (imagePosX !== 50 || imagePosY !== 50) && (
                        <button onClick={cropImageToPosition}
                          className="w-full text-[10px] py-1 mt-0.5 bg-violet-100 border border-violet-200 text-violet-700 rounded-lg hover:bg-violet-200 font-bold transition-colors">
                          ✂ Cắt & chốt vùng này
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-violet-200 rounded-xl h-24 flex items-center justify-center text-violet-400">
                    <div className="text-center">
                      <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
                      <p className="text-[11px]">Chưa có ảnh banner</p>
                    </div>
                  </div>
                )}

                {imageGenError && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    {imageGenError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={callAiImage}
                    disabled={!form.title.trim() || imageGenLoading}
                    className="flex items-center justify-center gap-1.5 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {imageGenLoading
                      ? <><Loader2 size={12} className="animate-spin" /> Đang vẽ...</>
                      : <><Sparkles size={12} /> {imagePreview || form.imageUrl ? 'Tạo lại' : 'Tạo bằng AI'}</>}
                  </button>

                  {/* Upload từ máy */}
                  <label className="flex items-center justify-center gap-1.5 py-2 bg-white border-2 border-violet-200 text-violet-700 text-xs font-bold rounded-xl hover:bg-violet-50 cursor-pointer transition-colors">
                    <Upload size={12} /> Tải ảnh lên
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          setImageGenError('Ảnh quá lớn (tối đa 5MB)');
                          return;
                        }
                        setImageGenError('');
                        setImagePosX(50);
                        setImagePosY(50);
                        const reader = new FileReader();
                        reader.onloadend = () => setImagePreview(reader.result as string);
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-violet-500 text-center">
                  AI: cần API Key OpenAI (Settings → Cổng kết nối) · Tải lên: tối đa 5MB
                </p>
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

        {promo.imageUrl && (
          <div className="mt-3 -mx-0 rounded-xl overflow-hidden">
            <img src={promo.imageUrl} alt={promo.title} className="w-full h-28 object-cover" />
          </div>
        )}

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
