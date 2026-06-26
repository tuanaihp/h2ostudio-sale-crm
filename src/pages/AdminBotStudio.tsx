import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import { expandQuery } from '../utils/synonyms';
import { normalizeVietnamese, matchBotFaq } from '../lib/botEngine';
import { processMessageV2, FAQ_PRIMARY_INTENTS, PHASE_LABELS } from '../lib/botEngineV2';
import { createInitialStateV2, type ConversationStateV2, type BotV2Debug } from '../types/botV2';
import type { CustomerFaq, DbCustomerFaqRow, SaleScript, PricePackage } from '../types';
import { uploadImageToStorage, compressImage } from '../utils/image';
import {
  Bot, Home, BookOpen, FileText, MessageSquare, Settings,
  ToggleLeft, ToggleRight, Brain, Zap, Save, Send, RefreshCw,
  ExternalLink, TrendingUp, HelpCircle, Scroll, Gift, AlertCircle,
  CheckCircle2, Plus, Search, Edit2, Trash2, X, Check, Copy,
  Edit3, Tag, ChevronRight, ChevronDown, ChevronUp, CheckCircle,
  BookMarked, Download, Building2, Phone, Mail, MapPin, Clock,
  Package, ShoppingBag, ChevronLeft,
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
  keywords: row.keywords || [],
  nextQuestion: row.next_question || '',
  leadScore: row.lead_score || 0,
  serviceType: row.service_type || '',
  handoffTrigger: row.handoff_trigger || false,
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

type Tab = 'home' | 'knowledge' | 'instructions' | 'info' | 'test' | 'settings' | 'unanswered';
type KnowledgeTab = 'faqs' | 'scripts';
interface TestMsg {
  role: 'user' | 'bot'; text: string;
  tier?: 1 | 2;
  matched?: { type: 'faq' | 'script'; title: string; score: number; phase?: string };
  debugV2?: BotV2Debug;
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

  // ── Unmatched logs (Chưa trả lời) ──
  const [unmatchedLogs, setUnmatchedLogs] = useState<any[]>([]);
  const [unmatchedLoading, setUnmatchedLoading] = useState(false);
  const [unmatchedCount, setUnmatchedCount] = useState(0);

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
  const [faqForm, setFaqForm] = useState({
    question: '', answer: '', category: 'faq', tags: '',
    keywords: '', next_question: '', lead_score: 0, service_type: '', handoff_trigger: false,
  });
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
  const [offerContent, setOfferContent] = useState('');
  const [customInstr, setCustomInstr] = useState('');
  const [blockedTopics, setBlockedTopics] = useState('');
  const [studioInfo, setStudioInfo] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [instrSaving, setInstrSaving] = useState(false);
  const [instrSaveOk, setInstrSaveOk] = useState(false);

  // ── Info tab state ──
  interface CustomInfoItem { id: string; title: string; content: string; }
  const [infoSearch, setInfoSearch] = useState('');
  const [customInfoItems, setCustomInfoItems] = useState<CustomInfoItem[]>([]);
  const [customInfoModal, setCustomInfoModal] = useState<{ open: boolean; item: CustomInfoItem | null }>({ open: false, item: null });
  const [customInfoForm, setCustomInfoForm] = useState({ title: '', content: '' });
  const [priceListModal, setPriceListModal] = useState(false);
  const [priceListDraft, setPriceListDraft] = useState('');
  const [basicInfoModal, setBasicInfoModal] = useState(false);
  const [basicInfoForm, setBasicInfoForm] = useState({ name: '', description: '', website: '', phone: '', email: '', address: '', hours: '' });
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ purchaseInfo: '', paymentMethods: '', returnPolicy: '', discountPolicy: '' });
  const [infoModalSaving, setInfoModalSaving] = useState(false);

  // ── Price packages ──
  const [pricePackages, setPricePackages] = useState<PricePackage[]>([]);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [pkgModal, setPkgModal] = useState<{ open: boolean; pkg: PricePackage | null }>({ open: false, pkg: null });
  const [pkgForm, setPkgForm] = useState({ title: '', price: '', description: '', image_url: '', service_type: '', keywords: '', enabled: true });
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgImageUploading, setPkgImageUploading] = useState(false);

  // ── Test chat ──
  const [testMsgs, setTestMsgs] = useState<TestMsg[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testStateV2, setTestStateV2] = useState<ConversationStateV2>(() => createInitialStateV2('test-session'));
  const testBottomRef = useRef<HTMLDivElement>(null);

  // ── Chat settings ──
  const [chatBotEnabled, setChatBotEnabled] = useState(settings?.chatBotEnabled === true);
  const [chatBotTier2Enabled, setChatBotTier2Enabled] = useState(settings?.chatBotTier2Enabled === true);
  const [liveChatEnabled, setLiveChatEnabled] = useState(settings?.liveChatEnabled !== false);
  const [chatTypingSpeed, setChatTypingSpeed] = useState(settings?.chatTypingSpeed ?? 50);
  const [chatBotThinkingDelay, setChatBotThinkingDelay] = useState(settings?.chatBotThinkingDelay ?? 1500);
  const [chatAutoOpenEnabled, setChatAutoOpenEnabled] = useState(settings?.chatAutoOpenEnabled !== false);
  const [chatAutoOpenDelay, setChatAutoOpenDelay] = useState(settings?.chatAutoOpenDelay ?? 20);
  const [chatStaffName, setChatStaffName] = useState(settings?.chatStaffName ?? '');
  const [chatStaffNames, setChatStaffNames] = useState<string[]>(settings?.chatStaffNames ?? ['Lan Nguyễn', 'Tuấn Nguyễn', 'Quang An', 'Chung Nguyễn']);
  const [newStaffName, setNewStaffName] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>(settings?.chatMessages && settings.chatMessages.length > 0 ? settings.chatMessages : [{ id: '1', content: '', delaySeconds: 10, textColor: '#1a1a1a', enabled: true }]);
  const [chatSettingsSaving, setChatSettingsSaving] = useState(false);
  const [chatSettingsSaveOk, setChatSettingsSaveOk] = useState(false);

  // ── Effects ──
  useEffect(() => { loadHomeStats(); }, []);
  useEffect(() => { if (tab === 'knowledge' && kTab === 'faqs' && faqs.length === 0) loadFaqs(); }, [tab, kTab]);
  useEffect(() => { if (tab === 'knowledge' && kTab === 'scripts' && scripts.length === 0) loadScripts(); }, [tab, kTab]);
  useEffect(() => { if (tab === 'unanswered') loadUnmatchedLogs(); }, [tab]);
  useEffect(() => { if (tab === 'info') loadPricePackages(); }, [tab]);
  useEffect(() => { testBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [testMsgs]);
  useEffect(() => {
    if (settings) {
      setGreeting(settings.chatBotGreeting || DEFAULT_GREETING);
      setOfferContent(settings.chatBotOfferContent || '');
      setCustomInstr(settings.chatBotCustomInstructions || '');
      setBlockedTopics(settings.chatBotBlockedTopics || '');
      setStudioInfo(settings.botStudioInfo || '');
      setPaymentInfo(settings.botPaymentInfo || '');
      // Info tab
      try { setCustomInfoItems(JSON.parse(settings.botCustomInfoItems || '[]')); } catch { setCustomInfoItems([]); }
      setPriceListDraft(settings.botPriceList || '');
      setBasicInfoForm({
        name: settings.botBusinessName || '', description: settings.botBusinessDescription || '',
        website: settings.botBusinessWebsite || '', phone: settings.botBusinessPhone || '',
        email: settings.botBusinessEmail || '', address: settings.botBusinessAddress || '',
        hours: settings.botBusinessHours || '',
      });
      setPurchaseForm({
        purchaseInfo: settings.botPurchaseInfo || '', paymentMethods: settings.botPaymentMethods || '',
        returnPolicy: settings.botReturnPolicy || '', discountPolicy: settings.botDiscountPolicy || '',
      });
      setChatBotEnabled(settings.chatBotEnabled === true);
      setChatBotTier2Enabled(settings.chatBotTier2Enabled === true);
      setLiveChatEnabled(settings.liveChatEnabled !== false);
      setChatTypingSpeed(settings.chatTypingSpeed ?? 50);
      setChatBotThinkingDelay(settings.chatBotThinkingDelay ?? 1500);
      setChatAutoOpenEnabled(settings.chatAutoOpenEnabled !== false);
      setChatAutoOpenDelay(settings.chatAutoOpenDelay ?? 20);
      setChatStaffName(settings.chatStaffName ?? '');
      setChatStaffNames(settings.chatStaffNames ?? ['Lan Nguyễn', 'Tuấn Nguyễn', 'Quang An', 'Chung Nguyễn']);
      if (settings.chatMessages && settings.chatMessages.length > 0) setChatMessages(settings.chatMessages);
    }
  }, [settings?.chatBotGreeting, settings?.chatBotCustomInstructions, settings?.chatBotBlockedTopics, settings?.botStudioInfo, settings?.botPaymentInfo, settings?.botCustomInfoItems, settings?.botPriceList, settings?.botBusinessName, settings?.botPurchaseInfo]);

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
  const openAddFaq = (preQ = '', preService = '') => {
    setEditingFaq(null);
    setFaqForm({ question: preQ, answer: '', category: 'faq', tags: '', keywords: '', next_question: '', lead_score: 0, service_type: preService, handoff_trigger: false });
    setFaqModal(true);
  };
  const openEditFaq = (faq: CustomerFaq) => {
    setEditingFaq(faq);
    setFaqForm({
      question: faq.question, answer: faq.answer, category: faq.category, tags: faq.tags.join(', '),
      keywords: (faq.keywords || []).join(', '),
      next_question: faq.nextQuestion || '',
      lead_score: faq.leadScore || 0,
      service_type: faq.serviceType || '',
      handoff_trigger: faq.handoffTrigger || false,
    });
    setFaqModal(true);
  };
  const saveFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) return;
    setFaqSaving(true);
    const tags = faqForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    const keywords = faqForm.keywords ? faqForm.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) : null;
    const extraFields = {
      keywords,
      next_question: faqForm.next_question.trim() || null,
      lead_score: faqForm.lead_score || 0,
      service_type: faqForm.service_type || null,
      handoff_trigger: faqForm.handoff_trigger,
    };
    if (editingFaq) {
      await supabase.from('customer_faqs').update({ question: faqForm.question.trim(), answer: faqForm.answer.trim(), category: faqForm.category, tags, updated_at: new Date().toISOString(), ...extraFields }).eq('id', editingFaq.id);
    } else {
      await supabase.from('customer_faqs').insert({ id: crypto.randomUUID(), question: faqForm.question.trim(), answer: faqForm.answer.trim(), category: faqForm.category, tags, source: 'manual', is_approved: true, usage_count: 0, created_at: new Date().toISOString(), ...extraFields });
    }
    setFaqSaving(false); setFaqModal(false); loadFaqs(); loadHomeStats();
  };

  // ── Unmatched logs CRUD ──
  const loadUnmatchedLogs = async () => {
    setUnmatchedLoading(true);
    const { data, count } = await supabase
      .from('bot_unmatched_logs').select('*', { count: 'exact' })
      .eq('reviewed', false).order('created_at', { ascending: false }).limit(60);
    setUnmatchedLogs(data || []);
    setUnmatchedCount(count || 0);
    setUnmatchedLoading(false);
  };
  const markLogReviewed = async (id: string) => {
    await supabase.from('bot_unmatched_logs').update({ reviewed: true }).eq('id', id);
    setUnmatchedLogs(prev => prev.filter(l => l.id !== id));
    setUnmatchedCount(prev => Math.max(0, prev - 1));
  };
  const createFaqFromLog = (log: any) => {
    markLogReviewed(log.id);
    openAddFaq(log.message, log.detected_service || '');
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
    setInstrSaving(true);
    await updateSettings({ chatBotGreeting: greeting, chatBotOfferContent: offerContent, chatBotCustomInstructions: customInstr, chatBotBlockedTopics: blockedTopics, botStudioInfo: studioInfo, botPaymentInfo: paymentInfo });
    setInstrSaving(false); setInstrSaveOk(true); setTimeout(() => setInstrSaveOk(false), 2500);
  };

  // ── Chat settings helpers ──
  const addChatMessage = () => setChatMessages(prev => [...prev, { id: crypto.randomUUID(), content: '', delaySeconds: 30, textColor: '#1a1a1a', enabled: true }]);
  const updateChatMessage = (id: string, field: string, value: any) => setChatMessages(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  const removeChatMessage = (id: string) => setChatMessages(prev => prev.filter(m => m.id !== id));
  const saveChatSettings = async () => {
    setChatSettingsSaving(true);
    await updateSettings({ chatBotEnabled, chatBotTier2Enabled, liveChatEnabled, chatTypingSpeed, chatBotThinkingDelay, chatAutoOpenEnabled, chatAutoOpenDelay, chatStaffName, chatStaffNames, chatMessages });
    setChatSettingsSaving(false); setChatSettingsSaveOk(true); setTimeout(() => setChatSettingsSaveOk(false), 2500);
  };

  // ── Settings ──
  const toggle = (key: string) => {
    const defaultOn = key === 'liveChatEnabled';
    const current = (settings as any)?.[key] ?? (defaultOn ? true : false);
    updateSettings({ [key]: !current });
  };
  const isToggleOn = (key: string) => {
    const defaultOn = key === 'liveChatEnabled';
    const v = (settings as any)?.[key];
    return v === undefined ? defaultOn : Boolean(v);
  };

  // ── Info tab functions ──
  const saveCustomInfo = async () => {
    if (!customInfoForm.title.trim() || !customInfoForm.content.trim()) return;
    setInfoModalSaving(true);
    const item = customInfoModal.item;
    const newItems: CustomInfoItem[] = item
      ? customInfoItems.map(i => i.id === item.id ? { ...i, ...customInfoForm } : i)
      : [...customInfoItems, { id: crypto.randomUUID(), title: customInfoForm.title.trim(), content: customInfoForm.content.trim() }];
    setCustomInfoItems(newItems);
    await updateSettings({ botCustomInfoItems: JSON.stringify(newItems) });
    setInfoModalSaving(false);
    setCustomInfoModal({ open: false, item: null });
  };
  const deleteCustomInfo = async (id: string) => {
    const newItems = customInfoItems.filter(i => i.id !== id);
    setCustomInfoItems(newItems);
    await updateSettings({ botCustomInfoItems: JSON.stringify(newItems) });
  };
  const savePriceList = async () => {
    setInfoModalSaving(true);
    await updateSettings({ botPriceList: priceListDraft });
    setInfoModalSaving(false); setPriceListModal(false);
  };
  const saveBasicInfo = async () => {
    setInfoModalSaving(true);
    await updateSettings({
      botBusinessName: basicInfoForm.name, botBusinessDescription: basicInfoForm.description,
      botBusinessWebsite: basicInfoForm.website, botBusinessPhone: basicInfoForm.phone,
      botBusinessEmail: basicInfoForm.email, botBusinessAddress: basicInfoForm.address,
      botBusinessHours: basicInfoForm.hours,
    });
    setInfoModalSaving(false); setBasicInfoModal(false);
  };
  const savePurchaseInfo = async () => {
    setInfoModalSaving(true);
    await updateSettings({
      botPurchaseInfo: purchaseForm.purchaseInfo, botPaymentMethods: purchaseForm.paymentMethods,
      botReturnPolicy: purchaseForm.returnPolicy, botDiscountPolicy: purchaseForm.discountPolicy,
    });
    setInfoModalSaving(false); setPurchaseModal(false);
  };

  // ── Price packages CRUD ──
  const loadPricePackages = async () => {
    setPkgLoading(true);
    const { data } = await supabase.from('price_packages').select('*').order('order_num').order('created_at');
    setPricePackages((data || []).map((row: any): PricePackage => ({
      id: row.id, title: row.title, price: row.price || '',
      description: row.description || '', imageUrl: row.image_url || '',
      serviceType: row.service_type || '', keywords: row.keywords || [],
      enabled: row.enabled !== false, orderNum: row.order_num || 0,
      createdAt: row.created_at,
    })));
    setPkgLoading(false);
  };
  const savePricePackage = async () => {
    if (!pkgForm.title.trim()) return;
    setPkgSaving(true);
    const keywords = pkgForm.keywords ? pkgForm.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) : [];
    const row = {
      title: pkgForm.title.trim(), price: pkgForm.price.trim(),
      description: pkgForm.description.trim(), image_url: pkgForm.image_url,
      service_type: pkgForm.service_type, keywords, enabled: pkgForm.enabled,
      updated_at: new Date().toISOString(),
    };
    if (pkgModal.pkg) {
      await supabase.from('price_packages').update(row).eq('id', pkgModal.pkg.id);
    } else {
      await supabase.from('price_packages').insert({ ...row, id: crypto.randomUUID(), order_num: pricePackages.length, created_at: new Date().toISOString() });
    }
    setPkgSaving(false);
    setPkgModal({ open: false, pkg: null });
    loadPricePackages();
  };
  const deletePricePackage = async (id: string) => {
    if (!window.confirm('Xóa báo giá này?')) return;
    await supabase.from('price_packages').delete().eq('id', id);
    setPricePackages(prev => prev.filter(p => p.id !== id));
  };
  const uploadPkgImage = async (file: File) => {
    setPkgImageUploading(true);
    try {
      const base64 = await compressImage(file, 1200, 1200, 0.85);
      const url = await uploadImageToStorage(base64, `price_packages/${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
      setPkgForm(f => ({ ...f, image_url: url }));
    } catch (e: any) {
      alert('Lỗi upload ảnh: ' + (e.message || 'Thử lại'));
    } finally {
      setPkgImageUploading(false);
    }
  };

  // ── Test bot ──
  const runTestBot = async () => {
    if (!testInput.trim() || testLoading) return;
    const msg = testInput.trim(); setTestInput('');
    setTestMsgs(prev => [...prev, { role: 'user', text: msg }]);
    setTestLoading(true);

    // Tầng 2: gọi AI với đầy đủ context
    if (settings?.chatBotTier2Enabled) {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const [{ data: scriptData }, { data: promoData }, { data: faqData }] = await Promise.all([
          supabase.from('sale_scripts').select('id, phase, title, content').eq('enabled', true).order('order_num'),
          supabase.from('promotions').select('title, short_desc, emoji, end_date').eq('enabled', true).eq('show_on_website', true).lte('start_date', todayStr).gte('end_date', todayStr).limit(3),
          supabase.from('customer_faqs').select('question, answer, category').eq('is_approved', true).order('usage_count', { ascending: false }).limit(30),
        ]);
        const s = settings;
        const parts: string[] = [];
        if (s?.botBusinessName || s?.botBusinessPhone || s?.botBusinessAddress) {
          let bi = 'THÔNG TIN CƠ BẢN:';
          if (s?.botBusinessName) bi += `\n• Tên: ${s.botBusinessName}`;
          if (s?.botBusinessDescription) bi += `\n• Mô tả: ${s.botBusinessDescription}`;
          if (s?.botBusinessPhone) bi += `\n• SĐT: ${s.botBusinessPhone}`;
          if (s?.botBusinessEmail) bi += `\n• Email: ${s.botBusinessEmail}`;
          if (s?.botBusinessAddress) bi += `\n• Địa chỉ: ${s.botBusinessAddress}`;
          if (s?.botBusinessHours) bi += `\n• Giờ mở cửa: ${s.botBusinessHours}`;
          parts.push(bi);
        }
        if (s?.botPriceList) parts.push(`BẢNG GIÁ:\n${s.botPriceList}`);
        if (s?.botPurchaseInfo) parts.push(`THÔNG TIN ĐẶT LỊCH/CỌC:\n${s.botPurchaseInfo}`);
        if (s?.botPaymentMethods) parts.push(`PHƯƠNG THỨC THANH TOÁN:\n${s.botPaymentMethods}`);
        if (s?.botReturnPolicy) parts.push(`CHÍNH SÁCH HỦY/THAY ĐỔI:\n${s.botReturnPolicy}`);
        if (s?.botDiscountPolicy) parts.push(`KHUYẾN MÃI:\n${s.botDiscountPolicy}`);
        try { const items = JSON.parse(s?.botCustomInfoItems || '[]') as Array<{title: string; content: string}>; items.forEach(item => parts.push(`${item.title.toUpperCase()}:\n${item.content}`)); } catch {}
        const knowledgeContext = parts.join('\n\n---\n\n');

        const testHistory = testMsgs.slice(-8).map(m => ({ sender: m.role === 'user' ? 'customer' : 'admin', content: m.text }));
        const res = await fetch('/api/live-chat-bot', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg, stage: 'new',
            scripts: scriptData || [], faqs: faqData || [],
            history: testHistory,
            integrationConfig: { chatApiEnabled: settings?.integrationChatApiEnabled, chatApiUrl: settings?.integrationChatApiUrl, chatApiKey: settings?.integrationChatApiKey, chatApiModelName: settings?.integrationChatApiModelName },
            activePromos: promoData || [],
            customInstructions: settings?.chatBotCustomInstructions || '',
            blockedTopics: settings?.chatBotBlockedTopics || '',
            studioInfo: settings?.botStudioInfo || '',
            paymentInfo: settings?.botPaymentInfo || '',
            knowledgeContext,
          }),
        });
        const { text } = await res.json();
        setTestMsgs(prev => [...prev, { role: 'bot', text: text || 'Không có phản hồi.', tier: 2 }]);
      } catch { setTestMsgs(prev => [...prev, { role: 'bot', text: 'Lỗi khi gọi Bot Tầng 2.' }]); }
      finally { setTestLoading(false); }
      return;
    }

    // Tầng 1: Bot V2 Engine — giống live chat 100%
    try {
      const [{ data: faqData }, { data: scriptData }] = await Promise.all([
        supabase.from('customer_faqs').select('id, question, answer, tags, usage_count, category, keywords, next_question, lead_score, service_type').eq('is_approved', true),
        supabase.from('sale_scripts').select('id, phase, title, content, tags').eq('enabled', true),
      ]);
      const normalizedMsg = normalizeVietnamese(msg);
      const expandedWords = expandQuery(normalizedMsg);
      const botContextCompat = {
        serviceType: testStateV2.slots.serviceType,
        phase: testStateV2.currentPhase,
        leadScore: testStateV2.leadScore,
      };
      const engineResult = matchBotFaq(normalizedMsg, expandedWords, faqData || [], botContextCompat);
      const v2Result = processMessageV2({
        rawMessage: msg,
        scriptData: scriptData || [],
        faqData: faqData || [],
        state: testStateV2,
      });
      setTestStateV2(v2Result.newState);

      let text: string;
      let matched: TestMsg['matched'];

      const isFaqPrimary = FAQ_PRIMARY_INTENTS.includes(v2Result.debug.intent);
      if (isFaqPrimary && engineResult.type === 'answer') {
        text = engineResult.answer;
        const mFaq = engineResult.faqId ? (faqData || []).find((f: any) => f.id === String(engineResult.faqId)) : null;
        if (mFaq) matched = { type: 'faq', title: mFaq.question, score: Math.round(engineResult.score * 100), phase: mFaq.category };
      } else if (v2Result.text) {
        text = v2Result.text;
        if (v2Result.debug.scriptTitle) {
          matched = { type: 'script', title: v2Result.debug.scriptTitle, score: Math.round(v2Result.debug.scriptScore * 10) / 10, phase: v2Result.debug.selectedPhase };
        }
      } else if (engineResult.type !== 'fallback') {
        text = engineResult.answer;
        const mFaq = engineResult.faqId ? (faqData || []).find((f: any) => f.id === String(engineResult.faqId)) : null;
        if (mFaq) matched = { type: 'faq', title: mFaq.question, score: Math.round(engineResult.score * 100), phase: engineResult.phase ?? mFaq.category };
      } else {
        text = 'Không tìm thấy câu trả lời. Bạn có thể thêm FAQ hoặc bật Bot Tầng 2 (AI).';
      }
      setTestMsgs(prev => [...prev, { role: 'bot', text, tier: 1, matched, debugV2: v2Result.debug }]);
    } catch { setTestMsgs(prev => [...prev, { role: 'bot', text: 'Lỗi khi chạy test.' }]); }
    finally { setTestLoading(false); }
  };

  // ── Derived ──
  const botOn = (settings?.chatBotEnabled === true || settings?.chatBotTier2Enabled === true) && settings?.liveChatEnabled !== false;
  const filteredFaqs = faqs.filter(f => {
    const matchCat = faqCatFilter === 'all' || f.category === faqCatFilter;
    const q = faqSearch.toLowerCase();
    return matchCat && (!q
      || f.question.toLowerCase().includes(q)
      || f.answer.toLowerCase().includes(q)
      || f.tags.some(t => t.toLowerCase().includes(q))
      || (f.keywords || []).some(k => k.toLowerCase().includes(q))
    );
  });
  const displayScripts = scripts.filter(s => {
    const matchPhase = isSearching || s.phase === selectedPhase;
    const q = scriptSearch.toLowerCase();
    return matchPhase && (!scriptSearch || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q)));
  });
  const currentPhase = PHASES.find(p => p.key === selectedPhase);

  const NAV = [
    { id: 'home',         label: 'Trang chủ',      icon: Home },
    { id: 'knowledge',    label: 'Kiến thức AI',    icon: BookOpen },
    { id: 'info',         label: 'Thông tin',       icon: Building2 },
    { id: 'instructions', label: 'Hướng dẫn',       icon: FileText },
    { id: 'test',         label: 'Chat thử',        icon: MessageSquare },
    { id: 'settings',     label: 'Cài đặt',         icon: Settings },
    { id: 'unanswered',   label: 'Chưa trả lời',    icon: AlertCircle },
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
              {id === 'unanswered' && unmatchedCount > 0 && <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center">{unmatchedCount}</span>}
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
            {/* Bot status — 3 toggles, lưu ngay */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'liveChatEnabled', label: 'Widget Chat', sub: 'Hiển thị nút Chat', icon: MessageSquare, color: 'bg-green-50 text-green-600', aColor: 'text-green-500', desc: 'Bật/tắt toàn bộ khung chat trên website' },
                { key: 'chatBotEnabled', label: 'Bot Tầng 1', sub: 'TF-IDF Matching', icon: Brain, color: 'bg-blue-50 text-blue-600', aColor: 'text-blue-500', desc: `Kho: ${stats.faqs} FAQ + ${stats.scripts} kịch bản` },
                { key: 'chatBotTier2Enabled', label: 'Bot Tầng 2', sub: 'AI (Gemini / Custom)', icon: Zap, color: 'bg-purple-50 text-purple-600', aColor: 'text-purple-500', desc: settings?.integrationChatApiEnabled ? `Model: ${settings?.integrationChatApiModelName || 'Custom'}` : 'Gemini 2.0 Flash' },
              ].map(({ key, label, sub, icon: Icon, color, aColor, desc }) => (
                <div key={key} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon size={17} /></div>
                      <div><p className="text-sm font-semibold text-gray-800">{label}</p><p className="text-[10px] text-gray-400">{sub}</p></div>
                    </div>
                    <button onClick={() => toggle(key)} className={`transition-colors ${isToggleOn(key) ? aColor : 'text-gray-300'}`}>
                      {isToggleOn(key) ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">{desc}</p>
                  <span className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${isToggleOn(key) ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {isToggleOn(key) ? '● Đang hoạt động' : '○ Đã tắt'}
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
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">🎁 Nội dung nút "Xem ưu đãi hiện tại"</h3>
              <p className="text-xs text-gray-400 mb-3">Hiển thị khi khách bấm nút 🎁 trong chat. Ghi rõ ưu đãi, combo đặc biệt, điều kiện áp dụng.</p>
              <textarea value={offerContent} onChange={e => setOfferContent(e.target.value)} rows={5}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                placeholder={'VD: 🎉 Ưu đãi tháng này:\n\n💎 Combo Studio 9.999k — Tặng thêm 1 concept\n👗 Thuê váy đi bàn giảm 50%\n📅 Book trước 30 ngày tặng album bìa da\n\nNhắn chị để được tư vấn chi tiết ngay! 💕'} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">🏠 Thông tin Studio</h3>
              <p className="text-xs text-gray-400 mb-3">Địa chỉ, giờ làm việc, liên hệ — bot dùng khi khách hỏi về studio. Chỉ áp dụng Bot Tầng 2.</p>
              <textarea value={studioInfo} onChange={e => setStudioInfo(e.target.value)} rows={4}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                placeholder="VD: H2O Studio tại 123 Nguyễn Văn A, Q.Bình Thạnh. Mở cửa T2-CN 8:00-20:00. Hotline: 0783327323..." />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">💳 Thông tin thanh toán</h3>
              <p className="text-xs text-gray-400 mb-3">Số tài khoản, ngân hàng, điều khoản đặt cọc — bot dùng khi khách hỏi về thanh toán. Chỉ áp dụng Bot Tầng 2.</p>
              <textarea value={paymentInfo} onChange={e => setPaymentInfo(e.target.value)} rows={4}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                placeholder="VD: Đặt cọc 30% qua tài khoản Vietcombank 1234567890 - H2O Studio. Số dư còn lại thanh toán trước ngày chụp..." />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">🚫 Chủ đề không tư vấn</h3>
              <p className="text-xs text-gray-400 mb-3">Bot sẽ lịch sự từ chối khi khách hỏi về những chủ đề này. Chỉ áp dụng Bot Tầng 2.</p>
              <textarea value={blockedTopics} onChange={e => setBlockedTopics(e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                placeholder="VD: Chính trị, tôn giáo. Không so sánh với đối thủ cạnh tranh. Không tiết lộ thông tin nội bộ về chi phí vận hành..." />
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

        {/* ══ THÔNG TIN CỦA BẠN ══ */}
        {tab === 'info' && (
          <div className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto p-6 space-y-6 w-full">

              {/* Header */}
              <div>
                <h2 className="text-xl font-bold text-gray-900">Thông tin của bạn</h2>
                <p className="text-sm text-gray-500">Dạy AI cách phản hồi câu hỏi của khách hàng.</p>
              </div>

              {/* CTA buttons */}
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => { setCustomInfoForm({ title: '', content: '' }); setCustomInfoModal({ open: true, item: null }); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                  <Plus size={15} /> Thêm thông tin
                </button>
                <button onClick={() => { setPkgForm({ title: '', price: '', description: '', image_url: '', service_type: '', keywords: '', enabled: true }); setPkgModal({ open: true, pkg: null }); }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm">
                  <Plus size={15} /> Thêm báo giá mới
                </button>
              </div>

              {/* Quản lý thông tin */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Quản lý thông tin</h3>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                      placeholder="Tìm kiếm thông tin..." value={infoSearch} onChange={e => setInfoSearch(e.target.value)} />
                  </div>
                </div>

                {/* Thông tin về sản phẩm/dịch vụ */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center"><Package size={16} className="text-blue-600" /></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Thông tin về sản phẩm</p>
                        <p className="text-xs text-gray-400">{stats.faqs} câu hỏi FAQ · {stats.scripts} kịch bản sale</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setTab('knowledge'); setKTab('faqs'); }} className="text-xs text-purple-600 font-medium hover:underline">FAQ</button>
                      <button onClick={() => { setTab('knowledge'); setKTab('scripts'); }} className="text-xs text-purple-600 font-medium hover:underline">Kịch bản</button>
                    </div>
                  </div>
                </div>

                {/* Báo giá & Gói dịch vụ */}
                {(!infoSearch || 'báo giá gói dịch vụ'.includes(infoSearch.toLowerCase())) && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center"><Package size={16} className="text-green-600" /></div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Báo giá & Gói dịch vụ</p>
                          <p className="text-xs text-gray-400">{pricePackages.length > 0 ? `${pricePackages.filter(p => p.enabled).length} gói đang bật` : 'Chưa có gói báo giá'}</p>
                        </div>
                      </div>
                      <button onClick={() => { setPkgForm({ title: '', price: '', description: '', image_url: '', service_type: '', keywords: '', enabled: true }); setPkgModal({ open: true, pkg: null }); }}
                        className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors">
                        <Plus size={12} /> Thêm mới
                      </button>
                    </div>
                    {pkgLoading ? (
                      <div className="py-6 flex justify-center"><div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /></div>
                    ) : pricePackages.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {pricePackages.map(pkg => (
                          <div key={pkg.id} className={`px-4 py-3 flex items-center gap-3 ${!pkg.enabled ? 'opacity-50' : ''}`}>
                            {pkg.imageUrl ? (
                              <img src={pkg.imageUrl} alt={pkg.title} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-100" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-2xl">📦</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{pkg.title}</p>
                              {pkg.price && <p className="text-xs text-green-600 font-bold">{pkg.price}</p>}
                              {pkg.serviceType && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full inline-block mt-0.5">{pkg.serviceType.replace('_', ' ')}</span>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => { setPkgForm({ title: pkg.title, price: pkg.price, description: pkg.description, image_url: pkg.imageUrl, service_type: pkg.serviceType, keywords: pkg.keywords.join(', '), enabled: pkg.enabled }); setPkgModal({ open: true, pkg }); }}
                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                              <button onClick={() => deletePricePackage(pkg.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-gray-400">
                        <p className="text-2xl mb-2">📦</p>
                        <p className="text-sm font-medium text-gray-500">Chưa có gói báo giá nào</p>
                        <p className="text-xs mt-1">Nhấn "Thêm mới" để tạo gói đầu tiên với ảnh</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom info items */}
                {customInfoItems.filter(i => !infoSearch || i.title.toLowerCase().includes(infoSearch.toLowerCase()) || i.content.toLowerCase().includes(infoSearch.toLowerCase())).map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center"><span className="text-base">📝</span></div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-400 line-clamp-1">{item.content.slice(0, 60)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => { setCustomInfoForm({ title: item.title, content: item.content }); setCustomInfoModal({ open: true, item }); }} className="text-xs text-purple-600 font-medium hover:underline">Sửa</button>
                        <button onClick={() => deleteCustomInfo(item.id)} className="text-xs text-red-400 hover:text-red-600 hover:underline">Xoá</button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Thông tin doanh nghiệp */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Thông tin doanh nghiệp</h3>
                  <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {/* Thông tin cơ bản */}
                    <button onClick={() => setBasicInfoModal(true)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center"><Building2 size={16} className="text-amber-600" /></div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Thông tin cơ bản</p>
                          <p className="text-xs text-gray-400">
                            {settings?.botBusinessName || 'Tên studio, địa chỉ, giờ mở cửa, liên hệ'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>

                    {/* Mua hàng & thanh toán */}
                    <button onClick={() => setPurchaseModal(true)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center"><ShoppingBag size={16} className="text-green-600" /></div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Mua hàng, thanh toán và vận chuyển</p>
                          <p className="text-xs text-gray-400">
                            {settings?.botPurchaseInfo ? 'Đã cập nhật' : 'Thêm thông tin đặt cọc, phương thức thanh toán'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ══ TEST CHAT ══ */}
        {tab === 'test' && (
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ── Left: Chat area ── */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#f0f2f5]">

              {/* Toolbar */}
              <div className="px-4 py-2 flex items-center gap-2 shrink-0">
                <button onClick={() => { setTestMsgs([]); setTestStateV2(createInitialStateV2('test-session')); }} title="Làm mới đoạn chat"
                  className="p-2 hover:bg-black/10 rounded-full text-gray-500 transition-colors">
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-xl mx-auto px-4 py-2 space-y-2.5">

                  {/* Brand card */}
                  <div className="flex justify-center my-4">
                    <div className="bg-white rounded-2xl shadow-sm p-5 w-[240px] text-center">
                      {settings?.brandLogo
                        ? <img src={settings.brandLogo} alt="Logo" className="w-14 h-14 mx-auto rounded-full mb-2 object-cover" />
                        : <div className="w-14 h-14 mx-auto rounded-full mb-2 bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-xl">H2</div>
                      }
                      <p className="font-bold text-gray-900 text-sm leading-tight">Đoạn chat thử nghiệm</p>
                      <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">Thử chat với AI như bạn là khách hàng. Xem phản hồi và đóng góp ý kiến để góp phần cải thiện AI.</p>
                    </div>
                  </div>

                  {testMsgs.map((m, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.role === 'bot' && (
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">AI</div>
                        )}
                        <div className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${m.role === 'user' ? 'bg-[#7c3aed] text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'}`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                        </div>
                      </div>
                      {m.role === 'bot' && m.tier === 2 && (
                        <div className="ml-10 bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-xs flex items-center gap-2">
                          <span className="text-purple-600 font-bold">⚡ Bot Tầng 2 (AI)</span>
                          <span className="text-purple-400">— Gemini / Custom LLM</span>
                        </div>
                      )}
                      {m.debugV2 && (
                        <div className="ml-10 bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-xs space-y-1">
                          <p className="font-semibold text-blue-800">🧠 Bot V2 Debug</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-blue-700">
                            <span>Intent: <strong>{m.debugV2.intent}</strong> ({Math.round(m.debugV2.intentConfidence * 100)}%)</span>
                            <span>Phase: <strong>{PHASE_LABELS[m.debugV2.selectedPhase] ?? m.debugV2.selectedPhase}</strong></span>
                            {m.debugV2.detectedService && <span>Service: <strong>{m.debugV2.detectedService}</strong></span>}
                          </div>
                          {m.debugV2.scriptTitle && (
                            <div className="text-blue-600">
                              Script: <strong className="line-clamp-1">"{m.debugV2.scriptTitle}"</strong>
                              <span className="ml-2">Score: {Math.round(m.debugV2.scriptScore * 10) / 10} · {m.debugV2.candidateScriptCount} ứng viên</span>
                            </div>
                          )}
                          {m.debugV2.injectedFaqTitle && (
                            <div className="text-blue-600">FAQ kèm: <strong>"{m.debugV2.injectedFaqTitle}"</strong></div>
                          )}
                          {m.debugV2.businessRulesFired.length > 0 && (
                            <div className="text-orange-600">Rules: {m.debugV2.businessRulesFired.join(', ')}</div>
                          )}
                          {m.debugV2.slotsFilledThisTurn.length > 0 && (
                            <div className="text-green-600">Slots: {m.debugV2.slotsFilledThisTurn.join(', ')}</div>
                          )}
                        </div>
                      )}
                      {m.matched && (
                        <div className="ml-10 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs">
                          <p className="font-semibold text-amber-800">🎯 {m.matched.type === 'faq' ? '📚 FAQ' : '🎭 Script'} · Tầng 1</p>
                          <p className="text-amber-700 mt-0.5 line-clamp-1 font-medium">"{m.matched.title}"</p>
                          <div className="flex gap-4 mt-1 text-amber-600">
                            <span>Score: <strong>{m.matched.score}</strong></span>
                            {m.matched.phase && <span>Phase: <strong>{m.matched.phase}</strong></span>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {testLoading && (
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">AI</div>
                      <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 flex gap-1">
                        {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.18}s`, animationDuration: '0.8s' }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={testBottomRef} />
                </div>
              </div>

              {/* Suggested questions */}
              <div className="shrink-0 max-w-xl mx-auto w-full px-4 py-3">
                <p className="text-xs text-gray-400 mb-2">Xem cách AI phản hồi những câu hỏi thường gặp này.</p>
                <div className="flex flex-wrap gap-2">
                  {(topFaqs.length > 0 ? topFaqs.slice(0, 3) : [
                    { question: 'Giá chụp ảnh cưới bao nhiêu?' },
                    { question: 'Studio ở địa chỉ nào?' },
                    { question: 'Bao lâu thì nhận được ảnh?' },
                  ]).map((f: any, i: number) => (
                    <button key={i} onClick={() => setTestInput(f.question)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-colors shadow-sm">
                      <span className="text-purple-400 font-bold text-[10px]">✦</span>
                      <span className="max-w-[180px] truncate">{f.question}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="bg-white border-t shrink-0">
                <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-2">
                  <input
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-200 transition-colors"
                    placeholder="Khách hàng của bạn sẽ hỏi gì?"
                    value={testInput} onChange={e => setTestInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && runTestBot()}
                    autoFocus={tab === 'test'}
                  />
                  <button onClick={runTestBot} disabled={!testInput.trim() || testLoading}
                    className="bg-purple-600 text-white rounded-full p-2.5 disabled:opacity-40 hover:bg-purple-700 transition-colors shrink-0">
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right: Guide panel ── */}
            <div className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-l border-gray-200 shrink-0 overflow-y-auto">
              <div className="p-5 space-y-5">
                <h3 className="font-bold text-gray-900 text-base">Hướng dẫn</h3>
                <div className="space-y-4">
                  <div className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                    <span className="shrink-0 font-bold text-gray-300 mt-0.5">1.</span>
                    <span>Giả sử bạn là khách hàng. Hãy đặt câu hỏi trong đoạn chat hoặc chọn một số câu hỏi thường gặp để hỏi.</span>
                  </div>
                  <div className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                    <span className="shrink-0 font-bold text-gray-300 mt-0.5">2.</span>
                    <span>Hộp vàng bên dưới câu trả lời cho thấy <strong className="text-gray-700">FAQ / kịch bản nào được match</strong> và với điểm số bao nhiêu.</span>
                  </div>
                  <div className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                    <span className="shrink-0 font-bold text-gray-300 mt-0.5">3.</span>
                    <span>Bạn cũng có thể đến phần{' '}
                      <button onClick={() => { setTab('knowledge'); setKTab('faqs'); }}
                        className="text-purple-600 underline underline-offset-2 font-medium hover:text-purple-800">
                        Kiến thức AI
                      </button>{' '}
                      để thêm hoặc cập nhật thông tin cho bot.
                    </span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Trạng thái</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Bot Tầng 1 (TF-IDF)</span>
                      <span className={`font-bold ${settings?.chatBotEnabled ? 'text-green-600' : 'text-gray-300'}`}>{settings?.chatBotEnabled ? '● Bật' : '○ Tắt'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Bot Tầng 2 (AI)</span>
                      <span className={`font-bold ${settings?.chatBotTier2Enabled ? 'text-purple-600' : 'text-gray-300'}`}>{settings?.chatBotTier2Enabled ? '● Bật' : '○ Tắt'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Kho FAQ</span>
                      <span className="font-bold text-gray-700">{stats.faqs} câu hỏi</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Kịch bản sale</span>
                      <span className="font-bold text-gray-700">{stats.scripts} kịch bản</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ══ UNANSWERED ══ */}
        {tab === 'unanswered' && (
          <div className="max-w-3xl mx-auto p-6 space-y-6 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><AlertCircle size={20} className="text-red-500" />Câu hỏi Bot chưa trả lời được</h2>
                <p className="text-sm text-gray-500 mt-0.5">Những câu khách hỏi mà bot không hiểu. Gắn vào FAQ để bot học thêm.</p>
              </div>
              <button onClick={loadUnmatchedLogs} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                <RefreshCw size={12} />Tải lại
              </button>
            </div>

            {unmatchedLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /></div>
            ) : unmatchedLogs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle2 size={40} className="mx-auto mb-3 text-green-300" />
                <p className="font-semibold text-gray-600">Tuyệt vời! Bot đã trả lời được hết</p>
                <p className="text-sm mt-1">Không còn câu hỏi nào bị bỏ sót.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unmatchedLogs.map((log: any) => (
                  <div key={log.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">"{log.message}"</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {log.detected_service && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                              🎯 {log.detected_service.replace('_', ' ')}
                            </span>
                          )}
                          {log.detected_phase && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
                              📊 {log.detected_phase}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(log.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => createFaqFromLog(log)}
                          className="text-[11px] bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-1">
                          <Plus size={11} />Tạo FAQ
                        </button>
                        <button onClick={() => markLogReviewed(log.id)}
                          className="text-[11px] bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-1">
                          <X size={11} />Bỏ qua
                        </button>
                      </div>
                    </div>
                    {log.normalized_message && log.normalized_message !== log.message && (
                      <p className="text-[10px] text-gray-400 mt-2 italic">→ Đã chuẩn hóa: "{log.normalized_message}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 border border-blue-100">
              <p className="font-semibold mb-1">💡 Cách dùng tab này hiệu quả</p>
              <ul className="space-y-1 text-xs text-blue-600 list-disc list-inside">
                <li>Nhấn <strong>Tạo FAQ</strong> → điền câu trả lời → lưu → Bot tự học ngay</li>
                <li>Thêm <strong>Từ khóa nhận diện</strong> trong form FAQ để bot match chính xác hơn</li>
                <li>Nhấn <strong>Bỏ qua</strong> để loại câu hỏi không liên quan (spam, test...)</li>
              </ul>
            </div>
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab === 'settings' && (
          <div className="max-w-3xl mx-auto p-6 space-y-6 w-full">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cài đặt Chat</h2>
              <p className="text-sm text-gray-500">Cấu hình hành vi của chat · Để bật/tắt Widget và Bot → xem <button onClick={() => setTab('home')} className="text-primary underline font-medium">Trang chủ</button></p>
            </div>

            {/* Kịch bản tin nhắn tự động */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div><h3 className="text-sm font-semibold text-gray-800">💬 Kịch bản tin nhắn tự động</h3><p className="text-xs text-gray-400">Gửi tự động khi khách vào web (theo thứ tự)</p></div>
                <button onClick={addChatMessage} className="text-xs font-bold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20"><Plus size={13} /> Thêm tin nhắn</button>
              </div>
              <div className="space-y-3">
                {chatMessages.map((msg, index) => (
                  <div key={msg.id} className={`p-4 rounded-xl border relative ${msg.enabled === false ? 'opacity-50 bg-gray-50' : 'bg-gray-50'} border-gray-100`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={msg.enabled !== false} onChange={e => updateChatMessage(msg.id, 'enabled', e.target.checked)} />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <span className="text-sm font-semibold text-gray-700">Tin nhắn {index + 1}</span>
                      </div>
                      <button onClick={() => removeChatMessage(msg.id)} className="text-red-400 hover:text-red-600 p-1 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                    <textarea value={msg.content} onChange={e => updateChatMessage(msg.id, 'content', e.target.value)} rows={3}
                      placeholder="Nhập nội dung tin nhắn..." className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none text-sm mb-2" />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Thời gian chờ (giây)</label>
                        <input type="number" value={msg.delaySeconds} onChange={e => updateChatMessage(msg.id, 'delaySeconds', parseInt(e.target.value) || 0)} min="0" className="w-full p-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" />
                        <p className="text-[10px] text-gray-400 mt-0.5">{index === 0 ? '* Tính từ lúc khách vào web' : '* Tính từ lúc tin nhắn trước đóng'}</p>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Màu chữ</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={msg.textColor} onChange={e => updateChatMessage(msg.id, 'textColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                          <span className="text-xs font-mono text-gray-500">{msg.textColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {chatMessages.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Chưa có tin nhắn nào.</p>}
              </div>
            </div>

            {/* Tên nhân viên */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">👤 Tên nhân viên tư vấn hiển thị trong chat</h3>
              <div className="flex flex-wrap gap-2">
                {chatStaffNames.map(name => (
                  <button key={name} onClick={() => setChatStaffName(chatStaffName === name ? '' : name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${chatStaffName === name ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-700 border-gray-200 hover:border-rose-300'}`}>
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-secondary to-primary text-white text-[9px] font-bold flex items-center justify-center">
                      {name.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()}
                    </span>
                    {name}
                    {chatStaffName === name && <span className="ml-0.5">✓</span>}
                    <span onClick={e => { e.stopPropagation(); setChatStaffNames(ns => ns.filter(n => n !== name)); if (chatStaffName === name) setChatStaffName(''); }} className="ml-1 opacity-50 hover:opacity-100 cursor-pointer">×</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="Thêm tên mới VD: Lan Nguyễn" value={newStaffName} onChange={e => setNewStaffName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newStaffName.trim()) { setChatStaffNames(ns => [...ns, newStaffName.trim()]); setNewStaffName(''); }}} />
                <button onClick={() => { if (newStaffName.trim()) { setChatStaffNames(ns => [...ns, newStaffName.trim()]); setNewStaffName(''); }}}
                  className="px-3 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:opacity-90">+ Thêm</button>
              </div>
              {chatStaffName ? <p className="text-xs text-rose-600 font-medium">✅ Đang hiển thị tên <b>{chatStaffName}</b> trong khung chat</p>
                : <p className="text-xs text-gray-400">Bấm vào tên để chọn. Chưa chọn sẽ hiện "Tư vấn viên H2O Studio".</p>}
            </div>

            {/* Tốc độ + Tự động mở */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">⚡ Tốc độ & Hành vi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Tốc độ gõ chữ: <span className="text-primary">{chatTypingSpeed}ms/ký tự</span></label>
                  <input type="range" min={10} max={200} step={5} value={chatTypingSpeed} onChange={e => setChatTypingSpeed(Number(e.target.value))} className="w-full accent-primary" />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>Nhanh (10ms)</span><span>Chậm (200ms)</span></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Độ trễ bot suy nghĩ: <span className="text-primary">{(chatBotThinkingDelay/1000).toFixed(1)}s</span></label>
                  <input type="range" min={300} max={5000} step={100} value={chatBotThinkingDelay} onChange={e => setChatBotThinkingDelay(Number(e.target.value))} className="w-full accent-primary" />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>Nhanh (0.3s)</span><span>Chậm (5s)</span></div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-700">⏱️ Tự động mở chat</p>
                  {chatAutoOpenEnabled && (
                    <div className="mt-2">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Mở sau: <span className="text-emerald-600">{chatAutoOpenDelay} giây</span></label>
                      <input type="range" min={5} max={120} step={5} value={chatAutoOpenDelay} onChange={e => setChatAutoOpenDelay(Number(e.target.value))} className="w-full accent-emerald-500" />
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>Sớm (5s)</span><span>Muộn (120s)</span></div>
                      <p className="text-[11px] text-gray-400 mt-1">Khung chat tự mở sau {chatAutoOpenDelay}s (chỉ 1 lần/phiên).</p>
                    </div>
                  )}
                </div>
                <label className="relative cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only" checked={chatAutoOpenEnabled} onChange={e => setChatAutoOpenEnabled(e.target.checked)} />
                  <div className={`block w-11 h-6 rounded-full transition-colors ${chatAutoOpenEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow ${chatAutoOpenEnabled ? 'translate-x-5' : ''}`} />
                </label>
              </div>
            </div>

            <button onClick={saveChatSettings} disabled={chatSettingsSaving}
              className="flex items-center gap-2 bg-purple-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
              {chatSettingsSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : chatSettingsSaveOk ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {chatSettingsSaving ? 'Đang lưu...' : chatSettingsSaveOk ? 'Đã lưu!' : 'Lưu cài đặt'}
            </button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <h3 className="font-bold text-gray-900">{editingFaq ? '✏️ Sửa câu hỏi' : '➕ Thêm câu hỏi mới'}</h3>
              <button onClick={() => setFaqModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">❓ Câu hỏi của khách <span className="text-red-500">*</span></label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={2}
                  placeholder="VD: Giá chụp ảnh cưới bao nhiêu vậy studio?" value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">💬 Câu trả lời tốt nhất <span className="text-red-500">*</span></label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={4}
                  placeholder="Nhập câu trả lời chốt sale hiệu quả nhất — bot sẽ dùng chính xác câu này..." value={faqForm.answer} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))} />
              </div>
              {/* Smart matching fields */}
              <div className="border border-purple-100 rounded-xl p-3 bg-purple-50/50 space-y-3">
                <p className="text-[11px] font-bold text-purple-700 flex items-center gap-1.5"><Brain size={12} />Cài đặt Smart Matching</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">🔑 Từ khóa nhận diện <span className="font-normal text-gray-400">(cách nhau dấu phẩy)</span></label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                    placeholder="VD: giá chụp, bảng giá, chi phí, bao nhiêu tiền..."
                    value={faqForm.keywords} onChange={e => setFaqForm(f => ({ ...f, keywords: e.target.value }))} />
                  <p className="text-[10px] text-gray-400 mt-0.5">Bot so khớp % từ khóa này trong tin nhắn khách. Càng nhiều từ khóa → match càng chính xác.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">💬 Câu hỏi dẫn tiếp theo <span className="font-normal text-gray-400">(tùy chọn)</span></label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                    placeholder="VD: Em muốn biết thêm gì ạ? Anh/chị quan tâm gói chụp hay ngày chụp? 😊"
                    value={faqForm.next_question} onChange={e => setFaqForm(f => ({ ...f, next_question: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">🎯 Loại dịch vụ</label>
                    <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                      value={faqForm.service_type} onChange={e => setFaqForm(f => ({ ...f, service_type: e.target.value }))}>
                      <option value="">-- Tất cả --</option>
                      <option value="anh_cuoi">📸 Ảnh cưới</option>
                      <option value="vay_cuoi">👗 Váy cưới</option>
                      <option value="makeup">💄 Makeup & tóc</option>
                      <option value="ao_dai">👘 Áo dài</option>
                      <option value="quay_phim">🎥 Quay phim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">📈 Lead score cộng thêm</label>
                    <input type="number" min={0} max={100} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                      placeholder="0–100" value={faqForm.lead_score} onChange={e => setFaqForm(f => ({ ...f, lead_score: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">🚨 Yêu cầu nhân viên xử lý</p>
                    <p className="text-[10px] text-gray-400">Bật để thông báo nhân viên khi khách hỏi câu này</p>
                  </div>
                  <button type="button" onClick={() => setFaqForm(f => ({ ...f, handoff_trigger: !f.handoff_trigger }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${faqForm.handoff_trigger ? 'bg-red-500' : 'bg-gray-200'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${faqForm.handoff_trigger ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">📂 Nhóm</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                    value={faqForm.category} onChange={e => setFaqForm(f => ({ ...f, category: e.target.value }))}>
                    {FAQ_CATEGORIES.filter(c => c.value !== 'all').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5"># Tags (cách nhau dấu phẩy)</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="giá, cưới, gói chụp..." value={faqForm.tags} onChange={e => setFaqForm(f => ({ ...f, tags: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t shrink-0">
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

      {/* ── Custom Info Modal ── */}
      {customInfoModal.open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">{customInfoModal.item ? '✏️ Sửa thông tin' : '➕ Thêm thông tin'}</h3>
              <button onClick={() => setCustomInfoModal({ open: false, item: null })} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="VD: Chính sách hoàn tiền, Quy trình chụp ảnh..."
                  value={customInfoForm.title} onChange={e => setCustomInfoForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nội dung <span className="text-red-500">*</span></label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={6}
                  placeholder="Nhập nội dung chi tiết..."
                  value={customInfoForm.content} onChange={e => setCustomInfoForm(f => ({ ...f, content: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setCustomInfoModal({ open: false, item: null })} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">Huỷ</button>
              <button onClick={saveCustomInfo} disabled={!customInfoForm.title.trim() || !customInfoForm.content.trim() || infoModalSaving}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40">
                {infoModalSaving ? 'Đang lưu...' : customInfoModal.item ? '✅ Cập nhật' : '💾 Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Price List Modal ── */}
      {priceListModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900">📋 Bảng giá</h3>
              <button onClick={() => setPriceListModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-400 mb-3">Nhập bảng giá dạng văn bản. Bot sẽ dùng thông tin này để trả lời câu hỏi về giá.</p>
              <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none font-mono" rows={10}
                placeholder={"Gói Cơ Bản: 5.000.000đ\n- Bao gồm: 2 bộ trang phục, 60 ảnh đã chỉnh sửa\n- Thời gian: 4-6 tiếng\n\nGói Premium: 8.000.000đ\n- Bao gồm: 3 bộ trang phục, 100 ảnh, album in\n- Thời gian: 6-8 tiếng"}
                value={priceListDraft} onChange={e => setPriceListDraft(e.target.value)} />
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setPriceListModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">Huỷ</button>
              <button onClick={savePriceList} disabled={infoModalSaving}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40">
                {infoModalSaving ? 'Đang lưu...' : '💾 Lưu bảng giá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Basic Info Modal ── */}
      {basicInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2"><Building2 size={18} className="text-amber-600" /><h3 className="font-bold text-gray-900">Thông tin cơ bản</h3></div>
              <button onClick={() => setBasicInfoModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'name', label: 'Tên studio', placeholder: 'VD: H2O Studio', icon: '🏷️' },
                { key: 'description', label: 'Mô tả ngắn', placeholder: 'VD: Studio chụp ảnh cưới chuyên nghiệp tại TP.HCM', icon: '📝' },
                { key: 'website', label: 'Website', placeholder: 'VD: https://h2ostudio.vn', icon: '🌐' },
                { key: 'phone', label: 'Điện thoại', placeholder: 'VD: 0901 234 567', icon: '📞' },
                { key: 'email', label: 'Email', placeholder: 'VD: hello@h2ostudio.vn', icon: '✉️' },
                { key: 'address', label: 'Địa chỉ', placeholder: 'VD: 123 Nguyễn Huệ, Q.1, TP.HCM', icon: '📍' },
                { key: 'hours', label: 'Giờ mở cửa', placeholder: 'VD: Thứ 2-7: 8h-20h, CN: 9h-18h', icon: '🕐' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">{field.icon} {field.label}</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder={field.placeholder}
                    value={(basicInfoForm as any)[field.key]} onChange={e => setBasicInfoForm(f => ({ ...f, [field.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 p-5 border-t sticky bottom-0 bg-white">
              <button onClick={() => setBasicInfoModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">Huỷ</button>
              <button onClick={saveBasicInfo} disabled={infoModalSaving}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40">
                {infoModalSaving ? 'Đang lưu...' : '💾 Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Price Package Modal ── */}
      {pkgModal.open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-green-600" />
                <h3 className="font-bold text-gray-900">{pkgModal.pkg ? '✏️ Sửa gói báo giá' : '📦 Thêm gói báo giá mới'}</h3>
              </div>
              <button onClick={() => setPkgModal({ open: false, pkg: null })} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">📷 Ảnh báo giá</label>
                <div className="flex items-start gap-3">
                  {pkgForm.image_url ? (
                    <div className="relative shrink-0">
                      <img src={pkgForm.image_url} alt="preview" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                      <button onClick={() => setPkgForm(f => ({ ...f, image_url: '' }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 shrink-0">
                      <span className="text-3xl">📷</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-sm font-semibold ${pkgImageUploading ? 'border-purple-300 text-purple-400' : 'border-gray-300 text-gray-600 hover:border-purple-400 hover:text-purple-600'}`}>
                      {pkgImageUploading ? (
                        <><div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />Đang upload...</>
                      ) : (
                        <><Plus size={15} />{pkgForm.image_url ? 'Đổi ảnh' : 'Chọn ảnh'}</>
                      )}
                      <input type="file" accept="image/*" className="hidden" disabled={pkgImageUploading}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadPkgImage(f); e.target.value = ''; }} />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1.5">JPG, PNG — tối đa 5MB. Ảnh sẽ được nén tự động.</p>
                  </div>
                </div>
              </div>
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">📦 Tên gói <span className="text-red-500">*</span></label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="VD: Gói Studio Basic, Gói Premium Áo Dài..."
                  value={pkgForm.title} onChange={e => setPkgForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              {/* Price */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">💰 Giá <span className="text-red-500">*</span></label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="VD: 3.999.000đ, Từ 5 triệu, Liên hệ để được báo giá..."
                  value={pkgForm.price} onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">📝 Mô tả chi tiết</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={4}
                  placeholder={"VD: Bao gồm:\n- 100 ảnh đã chỉnh sửa\n- 2 bộ trang phục thuê tại studio\n- Album ảnh in 20x30cm\n- Thời gian chụp: 4-6 tiếng"}
                  value={pkgForm.description} onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              {/* Service type + keywords */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">🎯 Loại dịch vụ</label>
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
                    value={pkgForm.service_type} onChange={e => setPkgForm(f => ({ ...f, service_type: e.target.value }))}>
                    <option value="">-- Tất cả --</option>
                    <option value="anh_cuoi">📸 Ảnh cưới</option>
                    <option value="vay_cuoi">👗 Váy cưới</option>
                    <option value="makeup">💄 Makeup & tóc</option>
                    <option value="ao_dai">👘 Áo dài</option>
                    <option value="quay_phim">🎥 Quay phim</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">🔑 Từ khóa nhận diện</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="gói basic, studio basic, 3999..."
                    value={pkgForm.keywords} onChange={e => setPkgForm(f => ({ ...f, keywords: e.target.value }))} />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 -mt-1">Bot nhận diện gói này khi khách nhắc đến từ khóa. Phân cách bằng dấu phẩy.</p>
              {/* Enabled toggle */}
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <div><p className="text-sm font-medium text-gray-800">Hiển thị gói này cho bot dùng</p><p className="text-[10px] text-gray-400">Tắt để tạm ẩn mà không xóa</p></div>
                <button type="button" onClick={() => setPkgForm(f => ({ ...f, enabled: !f.enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${pkgForm.enabled ? 'bg-purple-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${pkgForm.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t sticky bottom-0 bg-white">
              <button onClick={() => setPkgModal({ open: false, pkg: null })} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">Huỷ</button>
              <button onClick={savePricePackage} disabled={!pkgForm.title.trim() || !pkgForm.price.trim() || pkgSaving || pkgImageUploading}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
                {pkgSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang lưu...</> : <><Save size={15} />{pkgModal.pkg ? 'Cập nhật' : 'Lưu gói báo giá'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Purchase Info Modal ── */}
      {purchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2"><ShoppingBag size={18} className="text-green-600" /><h3 className="font-bold text-gray-900">Mua hàng, thanh toán và vận chuyển</h3></div>
              <button onClick={() => setPurchaseModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">📅 Thông tin đặt lịch / đặt cọc</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={4}
                  placeholder="VD: Để giữ lịch chụp, khách cần đặt cọc 30% tổng giá trị gói. Liên hệ qua Zalo hoặc hotline để xác nhận ngày."
                  value={purchaseForm.purchaseInfo} onChange={e => setPurchaseForm(f => ({ ...f, purchaseInfo: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">💳 Phương thức thanh toán</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={3}
                  placeholder="VD: Chuyển khoản ngân hàng, tiền mặt, MoMo, ZaloPay"
                  value={purchaseForm.paymentMethods} onChange={e => setPurchaseForm(f => ({ ...f, paymentMethods: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">🔄 Chính sách huỷ / thay đổi lịch</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={3}
                  placeholder="VD: Huỷ trước 7 ngày: hoàn 50% cọc. Huỷ dưới 3 ngày: mất cọc. Dời lịch miễn phí 1 lần."
                  value={purchaseForm.returnPolicy} onChange={e => setPurchaseForm(f => ({ ...f, returnPolicy: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">🎁 Chính sách khuyến mãi / giảm giá</label>
                <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" rows={3}
                  placeholder="VD: Giảm 10% cho khách đặt trước 3 tháng. Tặng album mini cho cặp đôi chia sẻ Facebook."
                  value={purchaseForm.discountPolicy} onChange={e => setPurchaseForm(f => ({ ...f, discountPolicy: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t sticky bottom-0 bg-white">
              <button onClick={() => setPurchaseModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">Huỷ</button>
              <button onClick={savePurchaseInfo} disabled={infoModalSaving}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40">
                {infoModalSaving ? 'Đang lưu...' : '💾 Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
