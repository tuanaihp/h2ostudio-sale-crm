import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import { expandQuery } from '../utils/synonyms';
import {
  Bot, Home, BookOpen, FileText, MessageSquare, Settings,
  ToggleLeft, ToggleRight, ChevronRight, Brain, Zap, Save,
  Send, RefreshCw, ExternalLink, TrendingUp, HelpCircle,
  Scroll, Gift, AlertCircle, CheckCircle2,
} from 'lucide-react';

type Tab = 'home' | 'knowledge' | 'instructions' | 'test' | 'settings';
interface TestMsg {
  role: 'user' | 'bot';
  text: string;
  matched?: { type: 'faq' | 'script'; title: string; score: number; phase?: string };
}

const PHASE_LABELS: Record<string, string> = {
  opening: '👋 Opening', discovery: '🔍 Discovery', value_prop: '💎 Value Prop',
  offer: '🎯 Offer', fomo: '⏰ FOMO', closing: '✅ Closing',
  pre_shoot: '📋 Pre-shoot', followup: '📩 Follow-up',
};
const CAT_LABELS: Record<string, string> = {
  pricing: '💰 Giá cả', delivery: '📦 Giao ảnh', makeup: '💄 Makeup',
  dress: '👗 Trang phục', dress_rental: '🎭 Thuê áo', payment: '💳 Thanh toán',
  preparation: '📝 Chuẩn bị', outdoor: '🌿 Ngoại cảnh', logistics: '🚚 Vận chuyển',
  product_detail: '📷 Sản phẩm', hair: '💇 Tóc', groom_prep: '🤵 Chú rể',
  outdoor_cost: '🎟️ Phí địa điểm', pricing_outdoor: '💰 Giá NC', khac: '❓ Khác',
};

export default function AdminBotStudio() {
  const { settings, updateSettings, isAdmin } = useApp() as any;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  const [tab, setTab] = useState<Tab>('home');
  const [stats, setStats] = useState({ faqs: 0, scripts: 0, promos: 0, unanswered: 0 });
  const [topFaqs, setTopFaqs] = useState<any[]>([]);
  const [scriptsByPhase, setScriptsByPhase] = useState<Record<string, number>>({});
  const [faqsByCat, setFaqsByCat] = useState<Record<string, number>>({});
  const [unansweredList, setUnansweredList] = useState<any[]>([]);

  // Instructions
  const DEFAULT_GREETING = 'Chào em nha! Em đang muốn tham khảo " 𝑻𝒓𝒐̣𝒏 𝒈𝒐́𝒊 𝒄𝒉𝒖̣𝒑 𝒂̉𝒏𝒉 𝒄𝒖̛𝒐̛́𝒊 " hay " 𝑽𝒂́𝒚 𝒄𝒖̛𝒐̛́𝒊 " ? Để chị tư vấn chi tiết cho em nhé!\n(Nếu trường hợp cần hỗ trợ gấp hãy gọi ngay Mrs.Thủy H2O 0783327323 or 0399558699)';
  const [greeting, setGreeting] = useState('');
  const [customInstr, setCustomInstr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  // Test chat
  const [testMsgs, setTestMsgs] = useState<TestMsg[]>([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const testBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { testBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [testMsgs]);

  // Sync settings → local state when loaded
  useEffect(() => {
    if (settings) {
      setGreeting(settings.chatBotGreeting || DEFAULT_GREETING);
      setCustomInstr(settings.chatBotCustomInstructions || '');
    }
  }, [settings?.chatBotGreeting, settings?.chatBotCustomInstructions]);

  const loadStats = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [
      { count: faqCount }, { count: scriptCount }, { count: promoCount }, { count: unanswCount },
      { data: topFaqData }, { data: scriptData }, { data: faqCatData }, { data: unanswData },
    ] = await Promise.all([
      supabase.from('customer_faqs').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      supabase.from('sale_scripts').select('*', { count: 'exact', head: true }).eq('enabled', true),
      supabase.from('promotions').select('*', { count: 'exact', head: true }).eq('enabled', true).lte('start_date', todayStr).gte('end_date', todayStr),
      supabase.from('customer_faqs').select('*', { count: 'exact', head: true }).eq('is_approved', false).eq('answer', ''),
      supabase.from('customer_faqs').select('id, question, usage_count').eq('is_approved', true).order('usage_count', { ascending: false }).limit(5),
      supabase.from('sale_scripts').select('phase').eq('enabled', true),
      supabase.from('customer_faqs').select('category').eq('is_approved', true),
      supabase.from('customer_faqs').select('id, question, created_at').eq('is_approved', false).eq('answer', '').order('created_at', { ascending: false }).limit(5),
    ]);
    setStats({ faqs: faqCount || 0, scripts: scriptCount || 0, promos: promoCount || 0, unanswered: unanswCount || 0 });
    setTopFaqs(topFaqData || []);
    setUnansweredList(unanswData || []);
    const byPhase: Record<string, number> = {};
    (scriptData || []).forEach((s: any) => { byPhase[s.phase] = (byPhase[s.phase] || 0) + 1; });
    setScriptsByPhase(byPhase);
    const byCat: Record<string, number> = {};
    (faqCatData || []).forEach((f: any) => { const c = f.category || 'khac'; byCat[c] = (byCat[c] || 0) + 1; });
    setFaqsByCat(byCat);
  };

  const runTestBot = async () => {
    if (!testInput.trim() || testLoading) return;
    const msg = testInput.trim();
    setTestInput('');
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
      let text = best?.score > 0
        ? (best.type === 'faq' ? best.item.answer : (best.item.content as string).slice(0, 450))
        : 'Không tìm thấy câu trả lời phù hợp trong kho kiến thức.';
      const matched = best?.score > 0 ? { type: best.type, title: best.title, score: Math.round(best.score * 10) / 10, phase: best.phase } : undefined;
      setTestMsgs(prev => [...prev, { role: 'bot', text, matched }]);
    } catch { setTestMsgs(prev => [...prev, { role: 'bot', text: 'Lỗi khi chạy test.' }]); }
    finally { setTestLoading(false); }
  };

  const saveInstructions = async () => {
    setSaving(true);
    await updateSettings({ chatBotGreeting: greeting, chatBotCustomInstructions: customInstr });
    setSaving(false); setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2500);
  };

  const toggle = (key: string) => updateSettings({ [key]: !(settings as any)?.[key] });

  const NAV = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'knowledge', label: 'Kiến thức AI', icon: BookOpen },
    { id: 'instructions', label: 'Hướng dẫn', icon: FileText },
    { id: 'test', label: 'Chat thử', icon: MessageSquare },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ] as const;

  const botOn = settings?.chatBotEnabled || settings?.chatBotTier2Enabled;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 leading-tight">H2O Bot AI</p>
              <p className="text-[10px] text-gray-400">Studio</p>
            </div>
          </div>
          <div className={`mt-3 px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 w-fit
            ${botOn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${botOn ? 'bg-green-500' : 'bg-gray-400'}`} />
            {botOn ? 'AI đang BẬT' : 'AI đang TẮT'}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${tab === id ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}>
              <Icon size={15} />
              {label}
              {id === 'home' && stats.unanswered > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 min-w-[18px] text-center">{stats.unanswered}</span>
              )}
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
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">

          {/* ══ TAB: HOME ══ */}
          {tab === 'home' && <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">H2O Bot AI Studio</h1>
              <p className="text-sm text-gray-500 mt-0.5">Quản lý AI tư vấn khách hàng tự động</p>
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'chatBotEnabled', label: 'Bot Tầng 1', sub: 'TF-IDF Matching', icon: Brain, color: 'bg-blue-50 text-blue-600', activeColor: 'text-blue-500', desc: `Kho: ${stats.faqs} FAQ + ${stats.scripts} kịch bản` },
                { key: 'chatBotTier2Enabled', label: 'Bot Tầng 2', sub: 'AI (Gemini / Custom)', icon: Zap, color: 'bg-purple-50 text-purple-600', activeColor: 'text-purple-500', desc: settings?.integrationChatApiEnabled ? `Model: ${settings?.integrationChatApiModelName || 'Custom'}` : 'Gemini 2.0 Flash' },
              ].map(({ key, label, sub, icon: Icon, color, activeColor, desc }) => (
                <div key={key} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon size={17} /></div>
                      <div><p className="text-sm font-semibold text-gray-800">{label}</p><p className="text-[10px] text-gray-400">{sub}</p></div>
                    </div>
                    <button onClick={() => toggle(key)} className={`transition-colors ${(settings as any)?.[key] ? activeColor : 'text-gray-300'}`}>
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
                { label: 'Câu hỏi FAQ', value: stats.faqs, icon: HelpCircle, cls: 'bg-blue-50 text-blue-600', link: '/admin/knowledge-base' },
                { label: 'Kịch bản sale', value: stats.scripts, icon: Scroll, cls: 'bg-green-50 text-green-600', link: '/admin/scripts' },
                { label: 'Ưu đãi đang chạy', value: stats.promos, icon: Gift, cls: 'bg-orange-50 text-orange-600', link: '/admin/promotions' },
              ].map(({ label, value, icon: Icon, cls, link }) => (
                <Link key={label} to={link}
                  className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${cls}`}><Icon size={17} /></div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  <p className="text-xs text-purple-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">Quản lý <ChevronRight size={11} /></p>
                </Link>
              ))}
            </div>

            {/* Action cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { emoji: '🎯', title: 'Thêm câu hỏi', desc: 'Bổ sung FAQ từ hội thoại thực tế', link: '/admin/knowledge-base' },
                { emoji: '📝', title: 'Thêm kịch bản', desc: 'Viết thêm script bán hàng', link: '/admin/scripts' },
                { emoji: '💬', title: 'Chat thử', desc: 'Test bot với câu hỏi thực tế', action: () => setTab('test') },
              ].map(({ emoji, title, desc, link, action }) => {
                const inner = (
                  <div className="text-left">
                    <span className="text-2xl">{emoji}</span>
                    <p className="text-sm font-semibold text-gray-800 mt-2">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    <p className="text-xs text-purple-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">Mở <ChevronRight size={11} /></p>
                  </div>
                );
                const cls = 'bg-white rounded-2xl border border-gray-200 p-4 hover:border-purple-200 hover:shadow-sm transition-all group';
                return link
                  ? <Link key={title} to={link} className={cls}>{inner}</Link>
                  : <button key={title} onClick={action} className={cls}>{inner}</button>;
              })}
            </div>

            {/* Unanswered */}
            {unansweredList.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={15} className="text-amber-600" />
                  <h3 className="text-sm font-semibold text-amber-800">Câu hỏi khách hỏi mà bot chưa biết ({stats.unanswered})</h3>
                </div>
                <div className="space-y-2">
                  {unansweredList.map((q: any) => (
                    <div key={q.id} className="flex gap-2 bg-white rounded-xl px-3 py-2 border border-amber-100">
                      <HelpCircle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-gray-700">{q.question}</p>
                    </div>
                  ))}
                </div>
                <Link to="/admin/knowledge-base" className="mt-3 text-xs text-amber-700 font-medium flex items-center gap-1 hover:underline">
                  Thêm câu trả lời <ExternalLink size={11} />
                </Link>
              </div>
            )}
          </>}

          {/* ══ TAB: KNOWLEDGE ══ */}
          {tab === 'knowledge' && <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Kiến thức AI</h2>
                <p className="text-sm text-gray-500">Dữ liệu bot học từ hội thoại thực tế H2O</p>
              </div>
              <button onClick={loadStats} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <RefreshCw size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">📚 FAQ ({stats.faqs})</h3>
                  <Link to="/admin/knowledge-base" className="text-xs text-purple-600 font-medium flex items-center gap-0.5 hover:underline">Quản lý <ExternalLink size={10} /></Link>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(faqsByCat).sort(([,a],[,b]) => b-a).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{CAT_LABELS[cat] || cat}</span>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{count}</span>
                    </div>
                  ))}
                </div>
                {topFaqs.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-2">Top được hỏi nhiều</p>
                    {topFaqs.map((f: any) => (
                      <div key={f.id} className="flex items-start gap-1.5 mb-1.5">
                        <TrendingUp size={10} className="text-green-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-gray-600 leading-tight flex-1">{f.question}</p>
                        <span className="text-[10px] text-gray-400 shrink-0">{f.usage_count || 0}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">🎭 Kịch bản ({stats.scripts})</h3>
                  <Link to="/admin/scripts" className="text-xs text-purple-600 font-medium flex items-center gap-0.5 hover:underline">Quản lý <ExternalLink size={10} /></Link>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(scriptsByPhase).sort(([,a],[,b]) => b-a).map(([phase, count]) => (
                    <div key={phase} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{PHASE_LABELS[phase] || phase}</span>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>}

          {/* ══ TAB: INSTRUCTIONS ══ */}
          {tab === 'instructions' && <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Hướng dẫn Bot</h2>
              <p className="text-sm text-gray-500">Tuỳ chỉnh cách bot chào hỏi và phản hồi khách</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">👋 Lời chào đầu tiên</h3>
              <p className="text-xs text-gray-400 mb-3">Hiển thị tự động khi khách mới mở chat lần đầu</p>
              <textarea value={greeting} onChange={e => setGreeting(e.target.value)} rows={4}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" />
              <button onClick={() => setGreeting(DEFAULT_GREETING)} className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 underline">
                Đặt lại mặc định
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-0.5">🤖 Hướng dẫn thêm cho AI Tầng 2</h3>
              <p className="text-xs text-gray-400 mb-3">Được thêm vào system prompt của Gemini/GPT — chỉ áp dụng khi Bot Tầng 2 đang BẬT</p>
              <textarea value={customInstr} onChange={e => setCustomInstr(e.target.value)} rows={5}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                placeholder="VD: Luôn đề cập ưu đãi đang chạy khi khách hỏi giá. Không bao giờ báo giá ngoài các gói đã có trong kịch bản..." />
            </div>
            <button onClick={saveInstructions} disabled={saving}
              className="flex items-center gap-2 bg-purple-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : saveOk ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {saving ? 'Đang lưu...' : saveOk ? 'Đã lưu!' : 'Lưu cài đặt'}
            </button>
          </>}

          {/* ══ TAB: TEST CHAT ══ */}
          {tab === 'test' && <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Chat thử nghiệm</h2>
              <p className="text-sm text-gray-500">Mô phỏng Bot Tầng 1 — xem FAQ/script nào được match và với score bao nhiêu</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: 520 }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {testMsgs.length === 0 && (
                  <div className="text-center text-gray-400 text-sm pt-12">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                    <p>Nhập câu hỏi như khách hàng thực tế</p>
                    <p className="text-xs mt-1 opacity-70">VD: "gói chụp cưới bao nhiêu?" / "combo 9999 có gì?"</p>
                  </div>
                )}
                {testMsgs.map((m, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'bot' && (
                        <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-[9px] font-bold mr-1.5 shrink-0 self-end">AI</div>
                      )}
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                    {m.matched && (
                      <div className="ml-10 bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 text-xs">
                        <p className="font-semibold text-yellow-800">🎯 Match: {m.matched.type === 'faq' ? '📚 FAQ' : '🎭 Script'}</p>
                        <p className="text-yellow-700 mt-0.5 truncate">"{m.matched.title}"</p>
                        <div className="flex gap-4 mt-1 text-yellow-600">
                          <span>Score: <strong>{m.matched.score}</strong></span>
                          {m.matched.phase && <span>Phase: <strong>{m.matched.phase}</strong></span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {testLoading && (
                  <div className="flex items-end gap-1.5">
                    <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0">AI</div>
                    <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex gap-1">
                      {[0,1,2].map(i => <span key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.18}s` }} />)}
                    </div>
                  </div>
                )}
                <div ref={testBottomRef} />
              </div>
              <div className="border-t bg-white p-3 flex gap-2">
                <input className="flex-1 border border-gray-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="Nhập câu hỏi của khách hàng..." value={testInput}
                  onChange={e => setTestInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runTestBot()} />
                <button onClick={runTestBot} disabled={!testInput.trim() || testLoading}
                  className="bg-purple-600 text-white rounded-full p-2.5 disabled:opacity-40 hover:bg-purple-700 transition-colors"><Send size={15} /></button>
                {testMsgs.length > 0 && (
                  <button onClick={() => setTestMsgs([])} className="p-2.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <RefreshCw size={15} />
                  </button>
                )}
              </div>
            </div>
          </>}

          {/* ══ TAB: SETTINGS ══ */}
          {tab === 'settings' && <>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cài đặt Bot</h2>
              <p className="text-sm text-gray-500">Bật/tắt và cấu hình chi tiết cách bot hoạt động</p>
            </div>
            <div className="space-y-3">
              {[
                { key: 'chatBotEnabled', emoji: '🧠', label: 'Bot Tầng 1 (TF-IDF)', desc: 'Tìm kiếm FAQ + script tự động theo từ khóa' },
                { key: 'chatBotTier2Enabled', emoji: '⚡', label: 'Bot Tầng 2 (AI)', desc: 'Dùng Gemini/GPT tạo câu trả lời thông minh hơn' },
                { key: 'liveChatEnabled', emoji: '💬', label: 'Live Chat Widget', desc: 'Hiển thị khung chat trên website cho khách' },
                { key: 'chatAutoOpenEnabled', emoji: '🚀', label: 'Tự động mở chat', desc: 'Tự bật khung chat sau vài giây khách vào web' },
              ].map(({ key, emoji, label, desc }) => (
                <div key={key} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{emoji}</span>
                    <div><p className="text-sm font-semibold text-gray-800">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
                  </div>
                  <button onClick={() => toggle(key)} className={`transition-colors ${(settings as any)?.[key] ? 'text-purple-500' : 'text-gray-300'}`}>
                    {(settings as any)?.[key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              ))}

              {/* Thinking delay */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xl">⏱️</span>
                  <div><p className="text-sm font-semibold text-gray-800">Độ trễ "đang gõ..."</p><p className="text-xs text-gray-400">Bot giả lập đang nhập để trông tự nhiên hơn</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="range" min={300} max={3000} step={100}
                    value={settings?.chatBotThinkingDelay ?? 1200}
                    onChange={e => updateSettings({ chatBotThinkingDelay: Number(e.target.value) })}
                    className="flex-1 accent-purple-600" />
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">{((settings?.chatBotThinkingDelay ?? 1200) / 1000).toFixed(1)}s</span>
                </div>
              </div>

              {/* Auto-open delay */}
              {settings?.chatAutoOpenEnabled && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-xl">⏳</span>
                    <div><p className="text-sm font-semibold text-gray-800">Thời gian trước khi chat tự mở</p><p className="text-xs text-gray-400">Sau bao lâu thì chat widget tự bật</p></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="range" min={5} max={60} step={5}
                      value={settings?.chatAutoOpenDelay ?? 20}
                      onChange={e => updateSettings({ chatAutoOpenDelay: Number(e.target.value) })}
                      className="flex-1 accent-purple-600" />
                    <span className="text-sm font-semibold text-gray-700 w-12 text-right">{settings?.chatAutoOpenDelay ?? 20}s</span>
                  </div>
                </div>
              )}

              <Link to="/admin/settings" className="flex items-center gap-1.5 text-sm text-purple-600 font-medium hover:underline px-1">
                Cài đặt nâng cao (API key, Zalo, Telegram...) <ExternalLink size={13} />
              </Link>
            </div>
          </>}

        </div>
      </main>
    </div>
  );
}
