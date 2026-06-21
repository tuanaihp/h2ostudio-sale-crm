import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit2, Trash2, BookOpen, X, TrendingUp, MessageSquare, CheckCircle, BookMarked, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import type { CustomerFaq, DbCustomerFaqRow } from '../types';

const CATEGORIES = [
  { value: 'all',        label: 'Tất cả' },
  { value: 'opening',    label: '💌 Mở đầu' },
  { value: 'discovery',  label: '📌 Khơi gợi nhu cầu' },
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
  opening:    'bg-pink-100 text-pink-700',
  discovery:  'bg-blue-100 text-blue-700',
  value_prop: 'bg-purple-100 text-purple-700',
  offer:      'bg-orange-100 text-orange-700',
  fomo:       'bg-red-100 text-red-700',
  closing:    'bg-green-100 text-green-700',
  pre_shoot:  'bg-teal-100 text-teal-700',
  followup:   'bg-yellow-100 text-yellow-700',
  faq:        'bg-indigo-100 text-indigo-700',
  khac:       'bg-gray-100 text-gray-600',
};

const dbToFaq = (row: DbCustomerFaqRow): CustomerFaq => ({
  id: row.id,
  question: row.question,
  answer: row.answer,
  category: row.category,
  tags: row.tags || [],
  usageCount: row.usage_count,
  source: row.source as 'manual' | 'from_chat',
  isApproved: row.is_approved,
  createdAt: row.created_at,
});

const EMPTY_FORM = { question: '', answer: '', category: 'faq', tags: '' };

// Các phase của Kho Kịch Bản (khớp với AdminScripts PHASES)
const SCRIPT_PHASES = [
  { key: 'opening',    emoji: '💌', label: 'Mở đầu' },
  { key: 'discovery',  emoji: '📌', label: 'Khơi gợi nhu cầu' },
  { key: 'value_prop', emoji: '💎', label: 'Giá trị – USP' },
  { key: 'offer',      emoji: '🔥', label: 'Ưu đãi đặc biệt' },
  { key: 'fomo',       emoji: '⏳', label: 'Tạo FOMO' },
  { key: 'closing',    emoji: '💳', label: 'Chốt cọc' },
  { key: 'pre_shoot',  emoji: '🌈', label: 'Trước ngày chụp' },
  { key: 'followup',   emoji: '🔔', label: 'Follow-up' },
  { key: 'faq',        emoji: '❓', label: 'Q&A – Từ chối' },
];

export default function AdminKnowledgeBase() {
  const [faqs, setFaqs]                   = useState<CustomerFaq[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [catFilter, setCatFilter]         = useState('all');
  const [showModal, setShowModal]         = useState(false);
  const [editingFaq, setEditingFaq]       = useState<CustomerFaq | null>(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  // Push to script modal
  const [pushModal, setPushModal]         = useState<{ faq: CustomerFaq; phase: string } | null>(null);
  const [pushSaving, setPushSaving]       = useState(false);
  const [pushedIds, setPushedIds]         = useState<Set<string>>(new Set());

  useEffect(() => { loadFaqs(); }, []);

  const loadFaqs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('customer_faqs').select('*')
      .order('usage_count', { ascending: false });
    setFaqs((data || []).map(r => dbToFaq(r as DbCustomerFaqRow)));
    setLoading(false);
  };

  const openAdd = (prefill?: Partial<typeof EMPTY_FORM>) => {
    setEditingFaq(null);
    setForm({ ...EMPTY_FORM, ...prefill });
    setShowModal(true);
  };

  const openEdit = (faq: CustomerFaq) => {
    setEditingFaq(faq);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, tags: faq.tags.join(', ') });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (editingFaq) {
      await supabase.from('customer_faqs').update({
        question: form.question.trim(), answer: form.answer.trim(),
        category: form.category, tags, updated_at: new Date().toISOString(),
      }).eq('id', editingFaq.id);
    } else {
      await supabase.from('customer_faqs').insert({
        id: crypto.randomUUID(),
        question: form.question.trim(), answer: form.answer.trim(),
        category: form.category, tags, source: 'manual',
        is_approved: true, usage_count: 0, created_at: new Date().toISOString(),
      });
    }
    setSaving(false);
    setShowModal(false);
    loadFaqs();
  };

  const deleteFaq = async (id: string) => {
    await supabase.from('customer_faqs').delete().eq('id', id);
    setConfirmDelete(null);
    setFaqs(prev => prev.filter(f => f.id !== id));
  };

  const openPushModal = (faq: CustomerFaq) => {
    // Tự động chọn phase tương ứng với category; khac → faq
    const autoPhase = SCRIPT_PHASES.find(p => p.key === faq.category)?.key ?? 'faq';
    setPushModal({ faq, phase: autoPhase });
  };

  const confirmPush = async () => {
    if (!pushModal) return;
    setPushSaving(true);
    const { faq, phase } = pushModal;
    const phaseLabel = SCRIPT_PHASES.find(p => p.key === phase)?.label ?? phase;
    const { data: existing } = await supabase
      .from('sale_scripts').select('id').eq('phase', phase).order('order_num', { ascending: false }).limit(1);
    const nextOrder = existing && existing.length > 0 ? ((existing[0] as any).order_num ?? 0) + 1 : 0;
    await supabase.from('sale_scripts').insert({
      id: crypto.randomUUID(),
      title: faq.question.slice(0, 80),
      phase,
      content: `❓ Câu hỏi: ${faq.question}\n\n💬 Trả lời:\n${faq.answer}`,
      tags: [...faq.tags, 'from_faq'],
      order_num: nextOrder,
      enabled: true,
    });
    setPushSaving(false);
    setPushModal(null);
    setPushedIds(prev => new Set([...prev, faq.id]));
  };

  const filtered = faqs.filter(f => {
    const matchCat = catFilter === 'all' || f.category === catFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || f.question.toLowerCase().includes(q)
      || f.answer.toLowerCase().includes(q)
      || f.tags.some(t => t.includes(q));
    return matchCat && matchSearch;
  });

  const totalUsage = faqs.reduce((s, f) => s + f.usageCount, 0);
  const fromChatCount = faqs.filter(f => f.source === 'from_chat').length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3 flex-wrap">
        <Link to="/admin/consultations" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <BookOpen size={22} className="text-primary shrink-0" />
        <h1 className="text-xl font-bold text-dark">Kho Câu Hỏi Thực Tế</h1>
        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">{faqs.length} câu hỏi</span>
        <div className="ml-auto">
          <button
            onClick={() => openAdd()}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={16} />
            Thêm câu hỏi
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng câu hỏi', value: faqs.length, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/5' },
            { label: 'Từ chat thực tế', value: fromChatCount, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Bot đã dùng', value: `${totalUsage} lần`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Đã duyệt', value: faqs.filter(f => f.isApproved).length, icon: CheckCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className={`${s.bg} ${s.color} p-2.5 rounded-xl shrink-0`}><s.icon size={18} /></div>
              <div>
                <p className="text-xl font-bold text-dark">{s.value}</p>
                <p className="text-[11px] text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search + Filter ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Tìm câu hỏi, câu trả lời, tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => {
              const count = c.value === 'all' ? faqs.length : faqs.filter(f => f.category === c.value).length;
              return (
                <button
                  key={c.value}
                  onClick={() => setCatFilter(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    catFilter === c.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.label} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── FAQ List ── */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Đang tải kho câu hỏi...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <BookOpen size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-600">
              {search || catFilter !== 'all' ? 'Không tìm thấy câu hỏi nào' : 'Kho câu hỏi đang trống'}
            </p>
            <p className="text-xs mt-1 text-gray-400">
              {!search && catFilter === 'all' && 'Thêm thủ công hoặc lưu từ chat với khách — kho sẽ tự lớn dần'}
            </p>
            <button onClick={() => openAdd()} className="mt-4 text-primary text-sm font-bold hover:underline">
              + Thêm câu hỏi đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(faq => (
              <div key={faq.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                >
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${CAT_COLORS[faq.category] || CAT_COLORS.khac}`}>
                        {CATEGORIES.find(c => c.value === faq.category)?.label ?? faq.category}
                      </span>
                      {faq.source === 'from_chat' && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">💬 Chat thực tế</span>
                      )}
                      {faq.usageCount > 0 && (
                        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold">
                          ✅ Bot dùng {faq.usageCount}×
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-dark">❓ {faq.question}</p>
                    {expandedId !== faq.id && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">💬 {faq.answer}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Push to script */}
                    {pushedIds.has(faq.id) ? (
                      <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold">✅ Đã thêm</span>
                    ) : (
                      <button
                        onClick={() => openPushModal(faq)}
                        className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
                        title="Thêm vào Kho Kịch Bản Chốt Sale"
                      >
                        <BookMarked size={12} />
                        <span className="hidden sm:inline">→ Kịch bản</span>
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(faq)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <Edit2 size={14} />
                    </button>
                    {confirmDelete === faq.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteFaq(faq.id)} className="text-[11px] bg-red-500 text-white px-2 py-1 rounded-lg font-bold">Xoá</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-bold">Huỷ</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(faq.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xoá (chỉ xoá khỏi Kho Câu Hỏi)"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded answer */}
                {expandedId === faq.id && (
                  <div className="border-t bg-gray-50 px-4 py-3">
                    <p className="text-xs font-bold text-gray-500 mb-1">💬 Câu trả lời:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{faq.answer}</p>
                    {faq.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {faq.tags.map(t => (
                          <span key={t} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-[11px] text-blue-800 space-y-1">
          <p>🤖 <b>Bot Tầng 1</b> tự động tìm trong kho này bằng từ khóa + từ điển đồng nghĩa. Kho càng nhiều Q&A thực tế → bot càng chính xác.</p>
          <p>💬 Để lưu nhanh từ chat: mở <b>Chat khách</b> → hover vào tin nhắn khách → click nút <b>📌 Lưu vào kho</b>.</p>
        </div>

      </div>

      {/* ── Push to Script Modal ── */}
      {pushModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <BookMarked size={18} className="text-amber-600" />
                <h3 className="font-bold text-dark">Thêm vào Kho Kịch Bản Chốt Sale</h3>
              </div>
              <button onClick={() => setPushModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Preview Q&A */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-dark mb-1">❓ {pushModal.faq.question}</p>
                <p className="text-gray-500 text-xs line-clamp-3">💬 {pushModal.faq.answer}</p>
              </div>

              {/* Phase picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  📂 Chọn giai đoạn trong Kho Kịch Bản
                  <span className="ml-1 text-gray-400 font-normal">(tự động theo nhóm câu hỏi)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SCRIPT_PHASES.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setPushModal(m => m ? { ...m, phase: p.key } : m)}
                      className={`text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        pushModal.phase === p.key
                          ? 'bg-amber-50 border-amber-400 text-amber-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span>{p.emoji}</span> <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2.5 text-[11px] text-blue-700">
                <span className="shrink-0 mt-0.5">ℹ️</span>
                <span>
                  Câu hỏi sẽ được thêm vào giai đoạn <b>{SCRIPT_PHASES.find(p => p.key === pushModal.phase)?.label}</b> trong Kho Kịch Bản.
                  Xóa trong Kho Câu Hỏi <b>không ảnh hưởng</b> đến kịch bản đã thêm.
                </span>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => setPushModal(null)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                onClick={confirmPush}
                disabled={pushSaving}
                className="flex-1 bg-amber-600 text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pushSaving ? 'Đang thêm...' : (
                  <><BookMarked size={15} /> Xác nhận thêm vào Kịch Bản</>
                )}
              </button>
            </div>
            <div className="px-5 pb-4 text-center">
              <Link
                to="/admin/scripts"
                className="text-xs text-amber-600 hover:underline flex items-center justify-center gap-1"
                target="_blank"
              >
                Xem Kho Kịch Bản <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-dark">{editingFaq ? '✏️ Sửa câu hỏi' : '➕ Thêm câu hỏi mới'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">❓ Câu hỏi của khách <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={2}
                  placeholder="VD: Giá chụp ảnh cưới bao nhiêu vậy studio?"
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">💬 Câu trả lời tốt nhất <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  rows={5}
                  placeholder="Nhập câu trả lời chốt sale hiệu quả nhất — bot sẽ dùng chính xác câu này để trả lời khách..."
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">📂 Nhóm</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5"># Tags (cách nhau dấu phẩy)</label>
                  <input
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="giá, cưới, gói chụp..."
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={save}
                disabled={!form.question.trim() || !form.answer.trim() || saving}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving ? 'Đang lưu...' : editingFaq ? '✅ Cập nhật' : '💾 Lưu vào kho'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
