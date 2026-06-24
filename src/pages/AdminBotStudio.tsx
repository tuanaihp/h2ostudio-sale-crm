import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import { expandQuery } from '../utils/synonyms';
import type { CustomerFaq, DbCustomerFaqRow, SaleScript } from '../types';
import {
  Bot, Home, BookOpen, FileText, MessageSquare, Settings,
  ToggleLeft, ToggleRight, Brain, Zap, Save, Send, RefreshCw,
  ExternalLink, TrendingUp, HelpCircle, Scroll, Gift, AlertCircle,
  CheckCircle2, Plus, Search, Edit2, Trash2, X, Check, Copy,
  Edit3, Tag, ChevronRight, ChevronDown, ChevronUp, CheckCircle,
  BookMarked, Download,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES = [
  { key: 'opening',    emoji: '💌', label: 'Mở đầu',           desc: 'Lời chào và kết nối cảm xúc ban đầu' },
  { key: 'discovery',  emoji: '📌', label: 'Khởi gợi nhu cầu', desc: 'Câu hỏi mở, tìm hiểu mong muốn' },
  { key: 'value_prop', emoji: '💎', label: 'Giá trị – USP',     desc: 'Điểm khác biệt của studio' },
  { key: 'offer',      emoji: '🔥', label: 'Ưu đãi đặc biệt',  desc: 'Gói khuyến mãi, quà tặng' },
  { key: 'fomo',       emoji: '⏳', label: 'Tạo FOMO',          desc: 'Urgency, khan hiếm slot lịch chụp' },
  { key: 'closing',    emoji: '💳', label: 'Chốt cọc',          desc: 'Hướng dẫn đặt cọc và thanh toán' },
  { key: 'pre_shoot',  emoji: '🌈', label: 'Trước ngày chụp',   desc: 'Dặn dò chuẩn bị cho dâu rể' },
  { key: 'followup',   emoji: '🔔', label: 'Follow-up',          desc: 'Tin nhắn theo đuổi khách hôm trước' },
  { key: 'faq',        emoji: '❓', label: 'Q&A – Từ chối',      desc: 'Xử lý câu hỏi và phản đối phổ biến' },
] as const;
type PhaseKey = typeof PHASES[number]['key'];

const SCRIPT_ACCENT: Record<PhaseKey, { border: string; header: string; badge: string }> = {
  opening:    { border: 'border-l-pink-400',   header: 'bg-pink-50 text-pink-800',    badge: 'bg-pink-100 text-pink-700' },
  discovery:  { border: 'border-l-blue-400',   header: 'bg-blue-50 text-blue-800',    badge: 'bg-blue-100 text-blue-700' },
  value_prop: { border: 'border-l-amber-400',  header: 'bg-amber-50 text-amber-800',  badge: 'bg-amber-100 text-amber-700' },
  offer:      { border: 'border-l-red-400',    header: 'bg-red-50 text-red-800',      badge: 'bg-red-100 text-red-700' },
  fomo:       { border: 'border-l-orange-400', header: 'bg-orange-50 text-orange-800',badge: 'bg-orange-100 text-orange-700' },
  closing:    { border: 'border-l-green-400',  header: 'bg-green-50 text-green-800',  badge: 'bg-green-100 text-green-700' },
  pre_shoot:  { border: 'border-l-purple-400', header: 'bg-purple-50 text-purple-800',badge: 'bg-purple-100 text-purple-700' },
  followup:   { border: 'border-l-teal-400',   header: 'bg-teal-50 text-teal-800',    badge: 'bg-teal-100 text-teal-700' },
  faq:        { border: 'border-l-gray-400',   header: 'bg-gray-50 text-gray-700',    badge: 'bg-gray-100 text-gray-600' },
};
const getAccent = (phase: string) => SCRIPT_ACCENT[phase as PhaseKey] ?? SCRIPT_ACCENT.faq;

const FAQ_CATEGORIES = [
  { value: 'all',        label: 'Tất cả' },
  { value: 'opening',    label: '💌 Mở đầu' },
  { value: 'discovery',  label: '📌 Khởi gợi nhu cầu' },
  { value: 'value_prop', label: '💎 Giá trị – USP' },
  { value: 'offer',      label: '🔥 Ưu đãi đặc biệt' },
  { value: 'fomo',       label: '⏳ Tạo FOMO' },
  { value: 'closing',    label: '💳 Chốt cọc' },
  { value: 'pre_shoot',  label: '🌈 Trước ngày chụp' },
  { value: 'followup',   label: '🔔 Follow-up' },
  { value: 'faq',        label: '❓ Q&A – Từ chối' },
  { value: 'khac',       label: '💬 Khác' },
];
const CAT_COLORS: Record<string, string> = {
  opening: 'bg-pink-100 text-pink-700', discovery: 'bg-blue-100 text-blue-700',
  value_prop: 'bg-purple-100 text-purple-700', offer: 'bg-orange-100 text-orange-700',
  fomo: 'bg-red-100 text-red-700', closing: 'bg-green-100 text-green-700',
  pre_shoot: 'bg-teal-100 text-teal-700', followup: 'bg-yellow-100 text-yellow-700',
  faq: 'bg-indigo-100 text-indigo-700', khac: 'bg-gray-100 text-gray-600',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const dbToFaq = (row: DbCustomerFaqRow): CustomerFaq => ({
  id: row.id, question: row.question, answer: row.answer, category: row.category,
  tags: row.tags || [], usageCount: row.usage_count,
  source: row.source as CustomerFaq['source'], isApproved: row.is_approved, createdAt: row.created_at,
});
const dbToScript = (row: Record<string, unknown>): SaleScript => ({
  id: row.id as string, phase: row.phase as string, title: row.title as string,
  content: row.content as string, tags: (row.tags as string[] | null) || [],
  orderNum: (row.order_num as number) || 0, enabled: row.enabled !== false,
});
const highlightVars = (text: string): React.ReactNode => {
  const parts = text.split(/(\[[^\]]+\])/g);
  return <>{parts.map((part, i) => part.startsWith('[') && part.endsWith(']')
    ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic font-semibold">{part}</mark>
    : <span key={i}>{part}</span>)}</>;
};

// ─── ScriptModal ──────────────────────────────────────────────────────────────

const ScriptModal: React.FC<{
  script: Partial<SaleScript> | null; defaultPhase: string; saving: boolean;
  onSave: (d: Partial<SaleScript>) => void; onClose: () => void;
}> = ({ script, defaultPhase, saving, onSave, onClose }) => {
  const isNew = !script?.id;
  const [form, setForm] = useState({
    title: script?.title || '', phase: script?.phase || defaultPhase,
    content: script?.content || '', tags: (script?.tags || []).join(', '), enabled: script?.enabled !== false,
  });
  const canSave = form.title.trim().length > 0 && form.content.trim().length > 0;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!canSave) return;
    onSave({ ...(script?.id ? { id: script.id } : {}), title: form.title.trim(), phase: form.phase,
      content: form.content.trim(), tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [], enabled: form.enabled });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] rounded-t-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0 bg-gray-50">
          <h3 className="font-bold text-gray-900">{isNew ? '✨ Thêm kịch bản mới' : '✏️ Sửa kịch bản'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="VD: Lời chào mở đầu — Zalo"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Giai đoạn bán hàng</label>
              <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm bg-white">
                {PHASES.map(p => <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Nội dung <span className="text-red-500">*</span>
                <span className="ml-2 text-[10px] font-normal text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">Dùng [text] cho phần cần điền</span>
              </label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={12} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm resize-y font-mono leading-relaxed" />
              <p className="text-[10px] text-gray-400 mt-1 text-right">{form.content.length} ký tự</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1"><Tag size={11} /> Tags (phân cách bằng dấu phẩy)</label>
              <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="VD: zalo, điện thoại, ưu đãi"
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm" />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div><p className="text-sm font-medium text-gray-800">Hiển thị kịch bản này</p><p className="text-[10px] text-gray-400">Tắt để ẩn khỏi danh sách bot dùng</p></div>
              <button type="button" onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.enabled ? 'bg-purple-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
          <div className="px-5 py-4 border-t flex gap-3 shrink-0 bg-gray-50">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-100 border border-gray-200 text-sm">Hủy bỏ</button>
            <button type="submit" disabled={saving || !canSave}
              className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
              {isNew ? 'Thêm kịch bản' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── ScriptCard ───────────────────────────────────────────────────────────────

const ScriptCard: React.FC<{
  script: SaleScript; isSuperAdmin: boolean;
  onEdit: (s: SaleScript) => void; onDelete: (id: string) => void; onToggle: (id: string, e: boolean) => void;
}> = ({ script, isSuperAdmin, onEdit, onDelete, onToggle }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const accent = getAccent(script.phase);
  const isLong = script.content.length > 220;
  const copy = () => { navigator.clipboard.writeText(script.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${accent.border} shadow-sm hover:shadow-md transition-shadow ${!script.enabled ? 'opacity-50' : ''}`}>
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 text-sm leading-snug">{script.title}</h4>
          {script.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {script.tags.map(tag => <span key={tag} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${accent.badge}`}>#{tag}</span>)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {!script.enabled && <span className="text-[9px] text-gray-400 font-bold border border-gray-200 px-1.5 py-0.5 rounded-full">Ẩn</span>}
          <button onClick={() => onToggle(script.id, !script.enabled)}
            className={`p-1.5 rounded-lg transition-all text-xs font-bold ${script.enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
            {script.enabled ? '●' : '○'}
          </button>
          <button onClick={copy} className={`p-1.5 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'}`}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button onClick={() => onEdit(script)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
          {isSuperAdmin && (
            <button onClick={() => { if (window.confirm(`Xóa "${script.title}"?`)) onDelete(script.id); }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
          )}
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className={`text-xs text-gray-600 leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
          {highlightVars(script.content)}
        </div>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="mt-2 text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-0.5">
            {expanded ? <><ChevronDown size={11} />Thu gọn</> : <><ChevronRight size={11} />Xem đầy đủ ({script.content.length} ký tự)</>}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'knowledge' | 'instructions' | 'test' | 'settings';
type KnowledgeTab = 'faqs' | 'scripts';
interface TestMsg {
  role: 'user' | 'bot'; text: string;
  matched?: { type: 'faq' | 'script'; title: string; score: number; phase?: string };
}
interface PendingEdit { answer: string; category: string; }

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminBotStudio() {
  const { settings, updateSettings, isAdmin, isSuperAdmin } = useApp() as any;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  const [tab, setTab] = useState<Tab>('home');
  const [kTab, setKTab] = useState<KnowledgeTab>('faqs');

  // ── Home stats ──
  const [stats, setStats] = useState({ faqs: 0, scripts: 0, promos: 0, unanswered: 0 });
  const [topFaqs, setTopFaqs] = useState<any[]>([]);
  const [unansweredList, setUnansweredList] = useState<any[]>([]);

  // ── FAQ state ──
  const [faqs, setFaqs] = useState<CustomerFaq[]>([]);
  const [pendingFaqs, setPendingFaqs] = useState<CustomerFaq[]>([]);
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>({});
  const [pendingOpen, setPendingOpen] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [ignoringId, setIgnoringId] = useState<string | null>(null);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCatFilter, setFaqCatFilter] = useState('all');
  const [faqExpandedId, setFaqExpandedId] = useState<string | null>(null);
  const [faqModal, setFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<CustomerFaq | null>(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'faq', tags: '' });
  const [faqSaving, setFaqSaving] = useState(false);
  const [faqDeleteId, setFaqDeleteId] = useState<string | null>(null);
  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());
  const [pushModal, setPushModal] = useState<{ faq: CustomerFaq; phase: string } | null>(null);
  const [pushSaving, setPushSaving] = useState(false);

  // ── Scripts state ──
  const [scripts, setScripts] = useState<SaleScript[]>([]);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState('opening');
  const [scriptSearch, setScriptSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [scriptModal, setScriptModal] = useState<{ open: boolean; script: Partial<SaleScript> | null }>({ open: false, script: null });
  const [scriptSaving, setScriptSaving] = useState(false);

  // ── Instructions ──
  const DEFAULT_GREETING = 'Chào em nha! Em đang muốn tham khảo " 𝑻𝒓𝒐̣𝒏 𝒈𝒐́𝒊 𝒄𝒉𝒖̣𝒑 𝒂̉𝒏𝒉 𝒄𝒖̛𝒐̛́𝒊 " hay " 𝑽𝒂́𝒚 𝒄𝒖̛𝒐̛́𝒊 " ? Để chị tư vấn chi tiết cho em nhé!\n(Nếu trường hợp cần hỗ trợ gấp hãy gọi ngay Mrs.Thủy H2O 0783327323 or 0399558699)';
  const [greeting, setGreeting] = useState('');
  const [customInstr, setCustomInstr] = useState('');
  const [instrSaving, setInstrSaving] = useState(false);
  const [instrSaveOk, setInstrSaveOk] = useState(false);

  // ── Test chat ──
  const [testMsgs, setTestMsgs] = useState<TestMsg[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const testBottomRef = useRef<HTMLDivElement>(null);

  // ── Effects ──
  useEffect(() => { loadHomeStats(); }, []);
  useEffect(() => { if (tab === 'knowledge' && kTab === 'faqs' && faqs.length === 0) loadFaqs(); }, [tab, kTab]);
  useEffect(() => { if (tab === 'knowledge' && kTab === 'scripts' && scripts.length === 0) loadScripts(); }, [tab, kTab]);
  useEffect(() => { testBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [testMsgs]);
  useEffect(() => {
    if (settings) {
      setGreeting(settings.chatBotGreeting || DEFAULT_GREETING);
      setCustomInstr(settings.chatBotCustomInstructions || '');
    }
  }, [settings?.chatBotGreeting, settings?.chatBotCustomInstructions]);

  // ── Home stats ──
  const loadHomeStats = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [{ count: faqCount }, { count: scriptCount }, { count: promoCount }, { count: unanswCount },
      { data: topFaqData }, { data: unanswData }] = await Promise.all([
      supabase.from('customer_faqs').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      supabase.from('sale_scripts').select('*', { count: 'exact', head: true }).eq('enabled', true),
      supabase.from('promotions').select('*', { count: 'exact', head: true }).eq('enabled', true).lte('start_date', todayStr).gte('end_date', todayStr),
      supabase.from('customer_faqs').select('*', { count: 'exact', head: true }).eq('is_approved', false).eq('answer', ''),
      supabase.from('customer_faqs').select('id, question, usage_count').eq('is_approved', true).order('usage_count', { ascending: false }).limit(5),
      supabase.from('customer_faqs').select('id, question, created_at').eq('is_approved', false).eq('answer', '').order('created_at', { ascending: false }).limit(5),
    ]);
    setStats({ faqs: faqCount || 0, scripts: scriptCount || 0, promos: promoCount || 0, unanswered: unanswCount || 0 });
    setTopFaqs(topFaqData || []);
    setUnansweredList(unanswData || []);
  };

  // ── FAQ CRUD ──
  const loadFaqs = async () => {
    setFaqLoading(true);
    const { data } = await supabase.from('customer_faqs').select('*').order('created_at', { ascending: false });
    const all = (data || []).map(r => dbToFaq(r as DbCustomerFaqRow));
    const approved = all.filter(f => f.isApproved).sort((a, b) => b.usageCount - a.usageCount);
    setFaqs(approved);
    const pending = all.filter(f => !f.isApproved);
    setPendingFaqs(pending);
    const edits: Record<string, PendingEdit> = {};
    pending.forEach(f => { edits[f.id] = { answer: f.answer || '', category: f.category || 'khac' }; });
    setPendingEdits(edits);
    setFaqLoading(false);
  };
  const openAddFaq = () => { setEditingFaq(null); setFaqForm({ question: '', answer: '', category: 'faq', tags: '' }); setFaqModal(true); };
  const openEditFaq = (faq: CustomerFaq) => { setEditingFaq(faq); setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category, tags: faq.tags.join(', ') }); setFaqModal(true); };
  const saveFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return;
    setFaqSaving(true);
    const tags = faqForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editingFaq) {
      await supabase.from('customer_faqs').update({ question: faqForm.question.trim(), answer: faqForm.answer.trim(), category: faqForm.category, tags, updated_at: new Date().toISOString() }).eq('id', editingFaq.id);
    } else {
      await supabase.from('customer_faqs').insert({ id: crypto.randomUUID(), question: faqForm.question.trim(), answer: faqForm.answer.trim(), category: faqForm.category, tags, source: 'manual', is_approved: true, usage_count: 0, created_at: new Date().toISOString() });
    }
    setFaqSaving(false); setFaqModal(false); loadFaqs(); loadHomeStats();
  };
  const deleteFaq = async (id: string) => { await supabase.from('customer_faqs').delete().eq('id', id); setFaqDeleteId(null); setFaqs(prev => prev.filter(f => f.id !== id)); loadHomeStats(); };
  const approvePending = async (faq: CustomerFaq) => {
    const edit = pendingEdits[faq.id]; if (!edit?.answer?.trim()) return;
    setApprovingId(faq.id);
    await supabase.from('customer_faqs').update({ answer: edit.answer.trim(), category: edit.category, is_approved: true, updated_at: new Date().toISOString() }).eq('id', faq.id);
    setApprovingId(null); setPendingFaqs(prev => prev.filter(f => f.id !== faq.id));
    setPendingEdits(prev => { const n = { ...prev }; delete n[faq.id]; return n; });
    loadFaqs(); loadHomeStats();
  };
  const ignorePending = async (id: string) => {
    setIgnoringId(id); await supabase.from('customer_faqs').delete().eq('id', id);
    setIgnoringId(null); setPendingFaqs(prev => prev.filter(f => f.id !== id));
    setPendingEdits(prev => { const n = { ...prev }; delete n[id]; return n; }); loadHomeStats();
  };
  const confirmPushToScript = async () => {
    if (!pushModal) return; setPushSaving(true);
    const { faq, phase } = pushModal;
    const { data: existing } = await supabase.from('sale_scripts').select('id').eq('phase', phase).order('order_num', { ascending: false }).limit(1);
    const nextOrder = existing && existing.length > 0 ? ((existing[0] as any).order_num ?? 0) + 1 : 0;
    await supabase.from('sale_scripts').insert({ id: crypto.randomUUID(), title: faq.question.slice(0, 80), phase, content: `❓ Câu hỏi: ${faq.question}\n\n💬 Trả lời:\n${faq.answer}`, tags: [...faq.tags, 'from_faq'], order_num: nextOrder, enabled: true });
    setPushSaving(false); setPushModal(null); setPushedIds(prev => new Set([...prev, faq.id]));
    if (scripts.length > 0) loadScripts();
    loadHomeStats();
  };

  // ── Scripts CRUD ──
  const loadScripts = useCallback(async () => {
    setScriptLoading(true);
    const { data } = await supabase.from('sale_scripts').select('*').order('order_num').order('created_at');
    if (data) setScripts(data.map(dbToScript));
    setScriptLoading(false);
  }, []);
  const handleScriptSave = async (data: Partial<SaleScript>) => {
    setScriptSaving(true);
    try {
      if (data.id) {
        await supabase.from('sale_scripts').update({ title: data.title, phase: data.phase, content: data.content, tags: data.tags || [], enabled: data.enabled, updated_at: new Date().toISOString() }).eq('id', data.id);
      } else {
        const maxOrder = scripts.filter(s => s.phase === data.phase).length;
        await supabase.from('sale_scripts').insert({ id: crypto.randomUUID(), title: data.title, phase: data.phase, content: data.content, tags: data.tags || [], order_num: maxOrder, enabled: data.enabled !== false });
      }
      await loadScripts(); loadHomeStats();
      setScriptModal({ open: false, script: null });
    } finally { setScriptSaving(false); }
  };
  const handleScriptDelete = async (id: string) => { await supabase.from('sale_scripts').delete().eq('id', id); setScripts(prev => prev.filter(s => s.id !== id)); loadHomeStats(); };
  const handleScriptToggle = async (id: string, enabled: boolean) => {
    await supabase.from('sale_scripts').update({ enabled, updated_at: new Date().toISOString() }).eq('id', id);
    setScripts(prev => prev.map(s => s.id === id ? { ...s, enabled } : s)); loadHomeStats();
  };
  const handleScriptSearch = (term: string) => { setScriptSearch(term); setIsSearching(term.length > 0); };

  // ── Instructions ──
  const saveInstructions = async () => {
    setInstrSaving(true); await updateSettings({ chatBotGreeting: greeting, chatBotCustomInstructions: customInstr });
    setInstrSaving(false); setInstrSaveOk(true); setTimeout(() => setInstrSaveOk(false), 2500);
  };

  // ── Settings ──
  const toggle = (key: string) => updateSettings({ [key]: !(settings as any)?.[key] });

  // ── Test bot ──
  const runTestBot = async () => {
    if (!testInput.trim() || testLoading) return;
    const msg = testInput.trim(); setTestInput('');
    setTestMsgs(prev => [...prev, { role: 'user', text: msg }]);
    setTestLoading(true);
    try {
      const [{ data: faqData }, { data: scriptData }] = await Promise.all([
        supabase.from('customer_faqs').select('id, question, answer, tags, usage_count, category').eq('is_approved', true),
        supabase.from('sale_scripts').select('id, phase, title, content, tags').eq('enabled', true),
      ]);
      const words = expandQuery(msg);
      const allDocs = [
        ...(faqData || []).map((f: any) => [f.question, f.answer, ...(f.tags || [])].join(' ').toLowerCase()),
        ...(scriptData || []).map((s: any) => [s.title, s.content, ...(s.tags || [])].join(' ').toLowerCase()),
      ];
      const N = Math.max(allDocs.length, 1);
      const df: Record<string, number> = {};
      allDocs.forEach(doc => new Set(doc.split(/\s+/).filter((w: string) => w.length >= 2)).forEach((w: string) => { df[w] = (df[w] || 0) + 1; }));
      const idf = (w: string) => Math.log((N + 1) / ((df[w] || 0) + 1)) + 1;
      const score = (t1: string, t2: string, tags: string[]) => {
        let s = 0;
        words.forEach(w => { const wt = idf(w); if (t1.toLowerCase().includes(w)) s += 3 * wt; if (tags.some((t: string) => t.toLowerCase().includes(w))) s += 2 * wt; if (t2.toLowerCase().includes(w)) s += wt; });
        return s;
      };
      const all = [
        ...(faqData || []).map((f: any) => ({ type: 'faq' as const, item: f, title: f.question, phase: f.category, score: score(f.question, f.answer, f.tags || []) + Math.log1p(f.usage_count || 0) * 0.3 })),
        ...(scriptData || []).map((s: any) => ({ type: 'script' as const, item: s, title: s.title, phase: s.phase, score: score(s.title, s.content, s.tags || []) })),
      ].sort((a, b) => b.score - a.score);
      const best = all[0];
      const text = best?.score > 0
        ? (best.type === 'faq' ? best.item.answer : (best.item.content as string).slice(0, 450))
        : 'Không tìm thấy câu trả lời phù hợp trong kho kiến thức.';
      const matched = best?.score > 0 ? { type: best.type, title: best.title, score: Math.round(best.score * 10) / 10, phase: best.phase } : undefined;
      setTestMsgs(prev => [...prev, { role: 'bot', text, matched }]);
    } catch { setTestMsgs(prev => [...prev, { role: 'bot', text: 'Lỗi khi chạy test.' }]); }
    finally { setTestLoading(false); }
  };

  // ── Derived ──
  const botOn = settings?.chatBotEnabled || settings?.chatBotTier2Enabled;
  const filteredFaqs = faqs.filter(f => {
    const matchCat = faqCatFilter === 'all' || f.category === faqCatFilter;
    const q = faqSearch.toLowerCase();
    return matchCat && (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q) || f.tags.some(t => t.includes(q)));
  });
  const displayScripts = scripts.filter(s => {
    const matchPhase = isSearching || s.phase === selectedPhase;
    const q = scriptSearch.toLowerCase();
    return matchPhase && (!scriptSearch || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q)));
  });
  const currentPhase = PHASES.find(p => p.key === selectedPhase);

  const NAV = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'knowledge', label: 'Kiến thức AI', icon: BookOpen },
    { id: 'instructions', label: 'Hướng dẫn', icon: FileText },
    { id: 'test', label: 'Chat thử', icon: MessageSquare },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ] as const;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
              <Bot size={18} className="text-white" />
            </div>
            <div><p className="text-sm font-bold text-gray-800 leading-tight">H2O Bot AI</p><p className="text-[10px] text-gray-400">Studio</p></div>
          </div>
          <div className={`mt-3 px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 w-fit ${botOn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${botOn ? 'bg-green-500' : 'bg-gray-400'}`} />
            {botOn ? 'AI đang BẬT' : 'AI đang TẮT'}
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}>
              <Icon size={15} />
              {label}
              {id === 'home' && stats.unanswered > 0 && <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center">{stats.unanswered}</span>}
              {id === 'knowledge' && pendingFaqs.length > 0 && <span className="ml-auto bg-amber-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center">{pendingFaqs.length}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <Link to="/admin/consultations" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors">← Về trang Admin</Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto flex flex-col">

        {/* ══ HOME ══ */}
        {tab === 'home' && (
          <div className="max-w-3xl mx-auto p-6 space-y-6 w-full">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">H2O Bot AI Studio</h1>
              <p className="text-sm text-gray-500 mt-0.5">Quản lý AI tư vấn khách hàng tự động</p>
            </div>
            {/* Bot status */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'chatBotEnabled', label: 'Bot Tầng 1', sub: 'TF-IDF Matching', icon: Brain, color: 'bg-blue-50 text-blue-600', aColor: 'text-blue-500', desc: `Kho: ${stats.faqs} FAQ + ${stats.scripts} kịch bản` },
                { key: 'chatBotTier2Enabled', label: 'Bot Tầng 2', sub: 'AI (Gemini / Custom)', icon: Zap, color: 'bg-purple-50 text-purple-600', aColor: 'text-purple-500', desc: settings?.integrationChatApiEnabled ? `Model: ${settings?.integrationChatApiModelName || 'Custom'}` : 'Gemini 2.0 Flash' },
              ].map(({ key, label, sub, icon: Icon, color, aColor, desc }) => (
                <div key={key} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon size={17} /></div>
                      <div><p className="text-sm font-semibold text-gray-800">{label}</p><p className="text-[10px] text-gray-400">{sub}</p></div>
                    </div>
                    <button onClick={() => toggle(key)} className={`transition-colors ${(settings as any)?.[key] ? aColor : 'text-gray-300'}`}>
                      {(settings as any)?.[key] ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">{desc}</p>
                  <span className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${(settings as any)?.[key] ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {(settings as any)?.[key] ? '● Đang hoạt động' : '○ Đã tắt'}
                  </span>
                </div>
              ))}
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Câu hỏi FAQ', value: stats.faqs, icon: HelpCircle, cls: 'bg-blue-50 text-blue-600', action: () => { setTab('knowledge'); setKTab('faqs'); } },
                { label: 'Kịch bản sale', value: stats.scripts, icon: Scroll, cls: 'bg-green-50 text-green-600', action: () => { setTab('knowledge'); setKTab('scripts'); } },
                { label: 'Ưu đãi đang chạy', value: stats.promos, icon: Gift, cls: 'bg-orange-50 text-orange-600', link: '/admin/promotions' },
              ].map(({ label, value, icon: Icon, cls, action, link }: any) => {
                const inner = (
                  <div>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${cls}`}><Icon size={17} /></div>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    <p className="text-xs text-purple-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">Quản lý <ChevronRight size={11} /></p>
                  </div>
                );
                return link
                  ? <Link key={label} to={link} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow group">{inner}</Link>
                  : <button key={label} onClick={action} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow text-left group">{inner}</button>;
              })}
            </div>
            {/* Actions */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { emoji: '📚', title: 'Thêm câu hỏi', desc: 'Bổ sung FAQ từ hội thoại thực tế', action: () => { setTab('knowledge'); setKTab('faqs'); } },
                { emoji: '📝', title: 'Thêm kịch bản', desc: 'Viết thêm script bán hàng', action: () => { setTab('knowledge'); setKTab('scripts'); } },
                { emoji: '💬', title: 'Chat thử', desc: 'Test bot với câu hỏi thực tế', action: () => setTab('test') },
              ].map(({ emoji, title, desc, action }) => (
                <button key={title} onClick={action} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-purple-200 hover:shadow-sm transition-all text-left group">
                  <span className="text-2xl">{emoji}</span>
                  <p className="text-sm font-semibold text-gray-800 mt-2">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  <p className="text-xs text-purple-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">Mở <ChevronRight size={11} /></p>
                </button>
              ))}
            </div>
            {/* Unanswered alert */}
            {unansweredList.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3"><AlertCircle size={15} className="text-amber-600" /><h3 className="text-sm font-semibold text-amber-800">Câu hỏi khách hỏi mà bot chưa biết ({stats.unanswered})</h3></div>
                <div className="space-y-2">
                  {unansweredList.map((q: any) => (
                    <div key={q.id} className="flex gap-2 bg-white rounded-xl px-3 py-2 border border-amber-100">
                      <HelpCircle size={12} className="text-amber-400 mt-0.5 shrink-0" /><p className="text-xs text-gray-700">{q.question}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setTab('knowledge'); setKTab('faqs'); }} className="mt-3 text-xs text-amber-700 font-medium flex items-center gap-1 hover:underline">
                  Thêm câu trả lời →
                </button>
              </div>
            )}
            {/* Top FAQs */}
            {topFaqs.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">🔥 Top câu hỏi khách hỏi nhiều nhất</p>
                <div className="space-y-2">
                  {topFaqs.map((f: any, i) => (
                    <div key={f.id} className="flex items-center gap-3">
                      <span className="text-xs font-black text-gray-300 w-5 text-center">{i + 1}</span>
                      <p className="text-xs text-gray-700 flex-1">{f.question}</p>
                      <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold">{f.usage_count || 0}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ KNOWLEDGE ══ */}
        {tab === 'knowledge' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Sub-tab header */}
            <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 shrink-0">
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {([
                  { id: 'faqs' as const, emoji: '📚', label: 'Câu hỏi FAQ', count: faqs.length, badge: pendingFaqs.length },
                  { id: 'scripts' as const, emoji: '🎭', label: 'Kịch bản Sale', count: scripts.length, badge: 0 },
                ]).map(({ id, emoji, label, count, badge }) => (
                  <button key={id} onClick={() => setKTab(id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${kTab === id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {emoji} {label}
                    {count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${kTab === id ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'}`}>{count}</span>}
                    {badge > 0 && <span className="bg-amber-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center">{badge}</span>}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => { if (kTab === 'faqs') loadFaqs(); else loadScripts(); }} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"><RefreshCw size={15} /></button>
                {kTab === 'faqs'
                  ? <button onClick={openAddFaq} className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"><Plus size={15} /> Thêm câu hỏi</button>
                  : <button onClick={() => setScriptModal({ open: true, script: { phase: selectedPhase, enabled: true } })} className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"><Plus size={15} /> Thêm kịch bản</button>}
              </div>
            </div>

            {/* ── FAQ panel ── */}
            {kTab === 'faqs' && (
              <div className="flex-1 overflow-auto p-5 space-y-4">
                {pendingFaqs.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                    <button className="w-full flex items-center justify-between px-5 py-3.5 text-left" onClick={() => setPendingOpen(v => !v)}>
                      <div className="flex items-center gap-2.5">
                        <Brain size={17} className="text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold text-amber-800 text-sm">🤖 Bot tự học: {pendingFaqs.length} câu hỏi chưa được trả lời</span>
                          <p className="text-[11px] text-amber-600 mt-0.5">Điền đáp án → duyệt → bot dùng ngay từ lần sau</p>
                        </div>
                      </div>
                      {pendingOpen ? <ChevronUp size={16} className="text-amber-600 shrink-0" /> : <ChevronDown size={16} className="text-amber-600 shrink-0" />}
                    </button>
                    {pendingOpen && (
                      <div className="border-t border-amber-200 divide-y divide-amber-100">
                        {pendingFaqs.map(faq => {
                          const edit = pendingEdits[faq.id] || { answer: '', category: 'khac' };
                          return (
                            <div key={faq.id} className="px-5 py-4 bg-white/60 hover:bg-white/80 transition-colors">
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">🤖 Bot tự ghi lại</span>
                                  <span className="text-[10px] text-gray-400">{new Date(faq.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">❓ {faq.question}</p>
                                <textarea className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" rows={3}
                                  placeholder="Nhập câu trả lời để bot dùng khi khách hỏi câu tương tự..."
                                  value={edit.answer} onChange={e => setPendingEdits(prev => ({ ...prev, [faq.id]: { ...edit, answer: e.target.value } }))} />
                                <div className="flex items-center gap-2 flex-wrap">
                                  <select className="text-xs border border-amber-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                                    value={edit.category} onChange={e => setPendingEdits(prev => ({ ...prev, [faq.id]: { ...edit, category: e.target.value } }))}>
                                    {FAQ_CATEGORIES.filter(c => c.value !== 'all').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                  </select>
                                  <button onClick={() => approvePending(faq)} disabled={!edit.answer.trim() || approvingId === faq.id || ignoringId === faq.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 disabled:opacity-40">
                                    <CheckCircle size={12} />{approvingId === faq.id ? 'Đang duyệt...' : 'Duyệt & Lưu'}
                                  </button>
                                  <button onClick={() => ignorePending(faq.id)} disabled={approvingId === faq.id || ignoringId === faq.id}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-200 disabled:opacity-40">
                                    {ignoringId === faq.id ? '...' : 'Bỏ qua'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Search + filter */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      placeholder="Tìm câu hỏi, câu trả lời, tag..." value={faqSearch} onChange={e => setFaqSearch(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FAQ_CATEGORIES.map(c => {
                      const count = c.value === 'all' ? faqs.length : faqs.filter(f => f.category === c.value).length;
                      return (
                        <button key={c.value} onClick={() => setFaqCatFilter(c.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${faqCatFilter === c.value ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {c.label} <span className="opacity-60">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {faqLoading
                  ? <div className="text-center py-16"><div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Đang tải...</p></div>
                  : filteredFaqs.length === 0
                    ? <div className="text-center py-16 bg-white rounded-2xl border border-gray-100"><BookOpen size={40} className="mx-auto mb-3 text-gray-200" /><p className="font-medium text-gray-500">{faqSearch || faqCatFilter !== 'all' ? 'Không tìm thấy câu hỏi nào' : 'Kho câu hỏi đang trống'}</p><button onClick={openAddFaq} className="mt-4 text-purple-600 text-sm font-bold hover:underline">+ Thêm câu hỏi đầu tiên</button></div>
                    : (
                      <div className="space-y-2.5">
                        {filteredFaqs.map(faq => (
                          <div key={faq.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
                            <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setFaqExpandedId(faqExpandedId === faq.id ? null : faq.id)}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${CAT_COLORS[faq.category] || CAT_COLORS.khac}`}>
                                    {FAQ_CATEGORIES.find(c => c.value === faq.category)?.label ?? faq.category}
                                  </span>
                                  {faq.source === 'from_chat' && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">💬 Chat thực tế</span>}
                                  {faq.source === 'from_chat_auto' && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold">🤖 Bot tự học</span>}
                                  {faq.usageCount > 0 && <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold">✅ Bot dùng {faq.usageCount}×</span>}
                                </div>
                                <p className="font-semibold text-sm text-gray-900">❓ {faq.question}</p>
                                {faqExpandedId !== faq.id && <p className="text-xs text-gray-500 mt-1 line-clamp-1">💬 {faq.answer}</p>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                {pushedIds.has(faq.id)
                                  ? <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold">✅ Đã thêm</span>
                                  : <button onClick={() => setPushModal({ faq, phase: PHASES.find(p => p.key === faq.category)?.key ?? 'faq' })}
                                      className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200">
                                      <BookMarked size={12} /><span className="hidden sm:inline">→ Kịch bản</span>
                                    </button>}
                                <button onClick={() => openEditFaq(faq)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                {faqDeleteId === faq.id
                                  ? <div className="flex items-center gap-1"><button onClick={() => deleteFaq(faq.id)} className="text-[11px] bg-red-500 text-white px-2 py-1 rounded-lg font-bold">Xoá</button><button onClick={() => setFaqDeleteId(null)} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-bold">Huỷ</button></div>
                                  : <button onClick={() => setFaqDeleteId(faq.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>}
                              </div>
                            </div>
                            {faqExpandedId === faq.id && (
                              <div className="border-t bg-gray-50 px-4 py-3">
                                <p className="text-xs font-bold text-gray-500 mb-1">💬 Câu trả lời:</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{faq.answer}</p>
                                {faq.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2.5">{faq.tags.map(t => <span key={t} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>)}</div>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
              </div>
            )}

            {/* ── Scripts panel ── */}
            {kTab === 'scripts' && (
              <div className="flex flex-1 overflow-hidden">
                {/* Phase sidebar */}
                <aside className="w-52 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
                  <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Giai đoạn bán hàng</p>
                  </div>
                  {PHASES.map(phase => {
                    const count = scripts.filter(s => s.phase === phase.key).length;
                    const enabledCount = scripts.filter(s => s.phase === phase.key && s.enabled).length;
                    const isActive = !isSearching && selectedPhase === phase.key;
                    return (
                      <button key={phase.key} onClick={() => { setSelectedPhase(phase.key); handleScriptSearch(''); }}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 border-b border-gray-100 last:border-0 transition-colors relative ${isActive ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                        {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-purple-500 rounded-r" />}
                        <span className="text-base leading-none">{phase.emoji}</span>
                        <span className={`text-xs font-bold flex-1 truncate ${isActive ? 'text-purple-700' : 'text-gray-600'}`}>{phase.label}</span>
                        {count > 0 && <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 shrink-0 ${isActive ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{enabledCount}/{count}</span>}
                      </button>
                    );
                  })}
                  <div className="p-3 border-t border-gray-100 mt-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Tổng kho</p>
                    {PHASES.map(phase => { const c = scripts.filter(s => s.phase === phase.key).length; return c > 0 ? <div key={phase.key} className="flex justify-between py-0.5"><span className="text-[10px] text-gray-500">{phase.emoji} {phase.label}</span><span className="text-[10px] font-bold text-gray-700">{c}</span></div> : null; })}
                    <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
                      <span className="text-[10px] font-bold text-gray-500">Tổng cộng</span>
                      <span className="text-[10px] font-black text-purple-600">{scripts.length} kịch bản</span>
                    </div>
                  </div>
                </aside>
                {/* Script list */}
                <div className="flex-1 overflow-auto p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                        placeholder="Tìm kiếm kịch bản..." value={scriptSearch} onChange={e => handleScriptSearch(e.target.value)} />
                      {scriptSearch && <button onClick={() => handleScriptSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                    </div>
                  </div>
                  {!isSearching && currentPhase && (
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${getAccent(selectedPhase).header}`}>
                      <div><p className="font-black text-base">{currentPhase.emoji} {currentPhase.label}</p><p className="text-xs opacity-60 mt-0.5">{currentPhase.desc}</p></div>
                      <div className="text-right"><p className="text-xl font-black">{scripts.filter(s => s.phase === selectedPhase && s.enabled).length}</p><p className="text-[10px] opacity-60">kịch bản hoạt động</p></div>
                    </div>
                  )}
                  {isSearching && <div className="flex items-center justify-between"><p className="text-sm font-bold text-gray-900">Kết quả: "{scriptSearch}" — {displayScripts.length} kịch bản</p><button onClick={() => handleScriptSearch('')} className="text-xs text-purple-600 hover:underline">Bỏ tìm kiếm</button></div>}
                  {scriptLoading
                    ? <div className="py-20 text-center"><div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-gray-400 text-sm">Đang tải kịch bản...</p></div>
                    : displayScripts.length === 0
                      ? <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200"><BookOpen size={40} className="mx-auto mb-3 text-gray-200" /><p className="text-gray-400 font-medium">{scriptSearch ? `Không tìm thấy "${scriptSearch}"` : 'Chưa có kịch bản nào'}</p>{!scriptSearch && <button onClick={() => setScriptModal({ open: true, script: { phase: selectedPhase, enabled: true } })} className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 inline-flex items-center gap-2"><Plus size={15} /> Thêm kịch bản đầu tiên</button>}</div>
                      : <div className="space-y-3">
                          {displayScripts.map(script => <ScriptCard key={script.id} script={script} isSuperAdmin={isSuperAdmin} onEdit={s => setScriptModal({ open: true, script: s })} onDelete={handleScriptDelete} onToggle={handleScriptToggle} />)}
                          {!isSearching && <button onClick={() => setScriptModal({ open: true, script: { phase: selectedPhase, enabled: true } })} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2"><Plus size={15} /> Thêm kịch bản vào giai đoạn này</button>}
                        </div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ INSTRUCTIONS ══ */}
        {tab === 'instructions' && (
          <div className="max-w-3xl mx-auto p-6 space-y-6 w-full">
            <div><h2 className="text-xl font-bold text-gray-900">Hướng dẫn Bot</h2><p className="text-sm text-gray-500">Tuỳ chỉnh cách bot chào hỏi và phản hồi khách</p></div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">👋 Lời chào đầu tiên</h3>
              <p className="text-xs text-gray-400 mb-3">Hiển thị tự động khi khách mới mở chat lần đầu</p>
              <textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={4}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" />
              <button onClick={() => setGreeting(DEFAULT_GREETING)} className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 underline">Đặt lại mặc định</button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">🤖 Hướng dẫn thêm cho AI Tầng 2</h3>
              <p className="text-xs text-gray-400 mb-3">Được thêm vào system prompt của Gemini/GPT — chỉ áp dụng khi Bot Tầng 2 BẬT</p>
              <textarea value={customInstr} onChange={e => setCustomInstr(e.target.value)} rows={5}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                placeholder="VD: Luôn đề cập ưu đãi đang chạy khi khách hỏi giá. Không bao giờ báo giá ngoài các gói đã có trong kịch bản..." />
            </div>
            <button onClick={saveInstructions} disabled={instrSaving}
              className="flex items-center gap-2 bg-purple-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
              {instrSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : instrSaveOk ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {instrSaving ? 'Đang lưu...' : instrSaveOk ? 'Đã lưu!' : 'Lưu cài đặt'}
            </button>
          </div>
        )}

        {/* ══ TEST CHAT ══ */}
        {tab === 'test' && (
          <div className="max-w-3xl mx-auto p-6 space-y-4 w-full">
            <div><h2 className="text-xl font-bold text-gray-900">Chat thử nghiệm</h2><p className="text-sm text-gray-500">Mô phỏng Bot Tầng 1 — xem FAQ/script nào được match và với score bao nhiêu</p></div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: 520 }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {testMsgs.length === 0 && <div className="text-center text-gray-400 text-sm pt-12"><MessageSquare size={32} className="mx-auto mb-2 opacity-20" /><p>Nhập câu hỏi như khách hàng thực tế</p><p className="text-xs mt-1 opacity-70">VD: "gói chụp cưới bao nhiêu?" / "combo 9999 có gì?"</p></div>}
                {testMsgs.map((m, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'bot' && <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-[9px] font-bold mr-1.5 shrink-0 self-end">AI</div>}
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                    {m.matched && (
                      <div className="ml-10 bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 text-xs">
                        <p className="font-semibold text-yellow-800">🎯 Match: {m.matched.type === 'faq' ? '📚 FAQ' : '🎭 Script'}</p>
                        <p className="text-yellow-700 mt-0.5 truncate">"{m.matched.title}"</p>
                        <div className="flex gap-4 mt-1 text-yellow-600"><span>Score: <strong>{m.matched.score}</strong></span>{m.matched.phase && <span>Phase: <strong>{m.matched.phase}</strong></span>}</div>
                      </div>
                    )}
                  </div>
                ))}
                {testLoading && <div className="flex items-end gap-1.5"><div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0">AI</div><div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.18}s` }} />)}</div></div>}
                <div ref={testBottomRef} />
              </div>
              <div className="border-t bg-white p-3 flex gap-2">
                <input className="flex-1 border border-gray-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Nhập câu hỏi của khách hàng..." value={testInput}
                  onChange={e => setTestInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runTestBot()} />
                <button onClick={runTestBot} disabled={!testInput.trim() || testLoading} className="bg-purple-600 text-white rounded-full p-2.5 disabled:opacity-40 hover:bg-purple-700 transition-colors"><Send size={15} /></button>
                {testMsgs.length > 0 && <button onClick={() => setTestMsgs([])} className="p-2.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><RefreshCw size={15} /></button>}
              </div>
            </div>
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab === 'settings' && (
          <div className="max-w-3xl mx-auto p-6 space-y-6 w-full">
            <div><h2 className="text-xl font-bold text-gray-900">Cài đặt Bot</h2><p className="text-sm text-gray-500">Bật/tắt và cấu hình chi tiết cách bot hoạt động</p></div>
            <div className="space-y-3">
              {[
                { key: 'chatBotEnabled', emoji: '🧠', label: 'Bot Tầng 1 (TF-IDF)', desc: 'Tìm kiếm FAQ + script tự động theo từ khóa' },
                { key: 'chatBotTier2Enabled', emoji: '⚡', label: 'Bot Tầng 2 (AI)', desc: 'Dùng Gemini/GPT tạo câu trả lời thông minh hơn' },
                { key: 'liveChatEnabled', emoji: '💬', label: 'Live Chat Widget', desc: 'Hiển thị khung chat trên website cho khách' },
                { key: 'chatAutoOpenEnabled', emoji: '🚀', label: 'Tự động mở chat', desc: 'Tự bật khung chat sau vài giây khách vào web' },
              ].map(({ key, emoji, label, desc }) => (
                <div key={key} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex items-start gap-3"><span className="text-xl mt-0.5">{emoji}</span><div><p className="text-sm font-semibold text-gray-800">{label}</p><p className="text-xs text-gray-400">{desc}</p></div></div>
                  <button onClick={() => toggle(key)} className={`transition-colors ${(settings as any)?.[key] ? 'text-purple-500' : 'text-gray-300'}`}>
                    {(settings as any)?.[key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              ))}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start gap-3 mb-3"><span className="text-xl">⏱️</span><div><p className="text-sm font-semibold text-gray-800">Độ trễ "đang gõ..."</p><p className="text-xs text-gray-400">Bot giả lập đang nhập để trông tự nhiên hơn</p></div></div>
                <div className="flex items-center gap-3">
                  <input type="range" min={300} max={3000} step={100} value={settings?.chatBotThinkingDelay ?? 1200} onChange={e => updateSettings({ chatBotThinkingDelay: Number(e.target.value) })} className="flex-1 accent-purple-600" />
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">{((settings?.chatBotThinkingDelay ?? 1200) / 1000).toFixed(1)}s</span>
                </div>
              </div>
              {settings?.chatAutoOpenEnabled && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3 mb-3"><span className="text-xl">⏳</span><div><p className="text-sm font-semibold text-gray-800">Thời gian trước khi chat tự mở</p><p className="text-xs text-gray-400">Sau bao lâu thì chat widget tự bật</p></div></div>
                  <div className="flex items-center gap-3">
                    <input type="range" min={5} max={60} step={5} value={settings?.chatAutoOpenDelay ?? 20} onChange={e => updateSettings({ chatAutoOpenDelay: Number(e.target.value) })} className="flex-1 accent-purple-600" />
                    <span className="text-sm font-semibold text-gray-700 w-12 text-right">{settings?.chatAutoOpenDelay ?? 20}s</span>
                  </div>
                </div>
              )}
              <Link to="/admin/settings" className="flex items-center gap-1.5 text-sm text-purple-600 font-medium hover:underline px-1">
                Cài đặt nâng cao (API key, Zalo, Telegram...) <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* ── Push to Script Modal ── */}
      {pushModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b"><div className="flex items-center gap-2"><BookMarked size={18} className="text-amber-600" /><h3 className="font-bold text-gray-900">Thêm vào Kho Kịch Bản</h3></div><button onClick={() => setPushModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button></div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3"><p className="font-semibold text-gray-900 text-sm mb-1">❓ {pushModal.faq.question}</p><p className="text-gray-500 text-xs line-clamp-3">💬 {pushModal.faq.answer}</p></div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">📂 Chọn giai đoạn</label>
                <div className="grid grid-cols-3 gap-2">
                  {PHASES.map(p => <button key={p.key} onClick={() => setPushModal(m => m ? { ...m, phase: p.key } : m)} className={`text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${pushModal.phase === p.key ? 'bg-amber-50 border-amber-400 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}><span>{p.emoji}</span> <span>{p.label}</span></button>)}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setPushModal(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">Huỷ</button>
              <button onClick={confirmPushToScript} disabled={pushSaving} className="flex-1 bg-amber-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {pushSaving ? 'Đang thêm...' : <><BookMarked size={15} /> Xác nhận thêm</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ Modal ── */}
      {faqModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b"><h3 className="font-bold text-gray-900">{editingFaq ? '✏️ Sửa câu hỏi' : '➕ Thêm câu hỏi mới'}</h3><button onClick={() => setFaqModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button></div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">❓ Câu hỏi của khách <span className="text-red-500">*</span></label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={2}
                  placeholder="VD: Giá chụp ảnh cưới bao nhiêu vậy studio?" value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">💬 Câu trả lời tốt nhất <span className="text-red-500">*</span></label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={5}
                  placeholder="Nhập câu trả lời chốt sale hiệu quả nhất — bot sẽ dùng chính xác câu này..." value={faqForm.answer} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-700 mb-1.5">📂 Nhóm</label><select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" value={faqForm.category} onChange={e => setFaqForm(f => ({ ...f, category: e.target.value }))}>{FAQ_CATEGORIES.filter(c => c.value !== 'all').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1.5"># Tags (cách nhau dấu phẩy)</label><input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" placeholder="giá, cưới, gói chụp..." value={faqForm.tags} onChange={e => setFaqForm(f => ({ ...f, tags: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setFaqModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">Huỷ</button>
              <button onClick={saveFaq} disabled={!faqForm.question.trim() || !faqForm.answer.trim() || faqSaving} className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40">
                {faqSaving ? 'Đang lưu...' : editingFaq ? '✅ Cập nhật' : '💾 Lưu vào kho'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Script Modal ── */}
      {scriptModal.open && <ScriptModal script={scriptModal.script} defaultPhase={selectedPhase} saving={scriptSaving} onSave={handleScriptSave} onClose={() => setScriptModal({ open: false, script: null })} />}

    </div>
  );
}
