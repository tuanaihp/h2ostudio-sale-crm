// Offline RAG Engine v2 — H2O Bot AI
// Pipeline: Normalize → Intent → Service → Phase → QueryExpansion
//           → BM25 → TF-IDF Re-rank → Rule Engine → Context Builder
//           → Template Builder → Response

import { normalizeVietnamese, expandSynonyms, detectServiceType } from './botEngine';
import { expandQuery } from '../utils/synonyms';
import type { ConversationStateV2 } from '../types/botV2';

// ── BM25 constants ────────────────────────────────────────────────────────────
const K1 = 1.5;
const B  = 0.75;

// ── Minimum score to return a match (else → fallbackToAI) ────────────────────
const RAG_THRESHOLD = 1.2;

// ── Field weights for scoring ─────────────────────────────────────────────────
const FIELD_W = { keywords: 3.0, title: 2.0, tags: 1.5, content: 1.0 };

// ── Intent map ────────────────────────────────────────────────────────────────
const INTENT_KEYWORDS: Record<string, string[]> = {
  pricing:  ['giá', 'phí', 'tiền', 'bao nhiêu', 'bảng giá', 'báo giá', 'mấy tiền',
             'chi phí', 'gói bao nhiêu', 'giá gói', 'giá chụp'],
  benefit:  ['bao gồm', 'có gì', 'trong gói', 'quyền lợi', 'gồm những gì', 'được gì',
             'kèm gì', 'gói có', 'combo gồm'],
  booking:  ['đặt lịch', 'giữ lịch', 'book', 'còn lịch', 'ngày nào trống', 'hẹn ngày',
             'đặt ngày chụp', 'còn slot', 'tháng mấy'],
  deposit:  ['đặt cọc', 'cọc', 'chuyển khoản', 'thanh toán', 'tiền cọc', 'đặt trước',
             'trả trước', 'số tài khoản', 'stk'],
  consult:  ['tư vấn', 'muốn biết', 'hỏi về', 'tham khảo', 'xem thử', 'giới thiệu',
             'thông tin', 'hỏi thêm', 'tìm hiểu', 'cho em hỏi'],
  greeting: ['chào', 'hello', 'hi', 'xin chào', 'alo', 'cho hỏi'],
};

const PHASE_FOR_INTENT: Record<string, string> = {
  pricing: 'value_prop', benefit: 'value_prop', consult: 'discovery',
  booking: 'fomo', deposit: 'closing', greeting: 'opening',
};

// ── Template keys ─────────────────────────────────────────────────────────────
type TemplateKey = 'pricing_with_cta' | 'service_info' | 'booking_cta' | 'deposit_info' | 'default';

// ── Types ─────────────────────────────────────────────────────────────────────

interface KnowledgeBlock {
  id: string;
  type: 'faq' | 'script';
  title: string;
  content: string;
  keywords: string[];
  tags: string[];
  serviceType: string;
  phase: string;
  priority: number;
  nextQuestion?: string;
  handoffTrigger?: boolean;
  imageUrl?: string;
}

export interface RagResult {
  text: string;
  quickReplies: string[];
  imageUrl?: string;
  nextQuestion?: string;
  handoffNeeded?: boolean;
  matched: boolean;
  score: number;
  matchedDocId?: string;
  templateUsed?: string;
  intent?: string;
  fallbackToAI?: boolean;
}

// ── Tokenizer ─────────────────────────────────────────────────────────────────
function tokenize(text: string): string[] {
  return normalizeVietnamese(text)
    .split(/[\s,.:;!?()[\]{}'"\/\\-]+/)
    .filter(t => t.length >= 2);
}

// ── Build corpus of KnowledgeBlocks from FAQ + script data ───────────────────
function buildCorpus(faqs: any[], scripts: any[]): KnowledgeBlock[] {
  const blocks: KnowledgeBlock[] = [];

  for (const f of faqs) {
    blocks.push({
      id: f.id,
      type: 'faq',
      title: f.question || '',
      content: f.answer || '',
      keywords: Array.isArray(f.keywords) ? f.keywords : [],
      tags: Array.isArray(f.tags) ? f.tags : [],
      serviceType: f.service_type || '',
      phase: f.category || '',
      priority: f.usage_count ? Math.min(f.usage_count * 5, 100) : 20,
      nextQuestion: f.next_question || undefined,
      handoffTrigger: f.handoff_trigger || false,
      imageUrl: f.__imageUrl || undefined,
    });
  }

  for (const s of scripts) {
    blocks.push({
      id: s.id,
      type: 'script',
      title: s.title || '',
      content: s.content || '',
      keywords: Array.isArray(s.tags) ? s.tags : [],
      tags: Array.isArray(s.tags) ? s.tags : [],
      serviceType: '',
      phase: s.phase || '',
      priority: 40,
    });
  }

  return blocks;
}

// ── IDF: log((N+1) / (df+1)) ─────────────────────────────────────────────────
function buildIDF(corpus: KnowledgeBlock[]): Map<string, number> {
  const df = new Map<string, number>();
  const N = corpus.length;

  for (const block of corpus) {
    const allTokens = new Set<string>([
      ...tokenize(block.title),
      ...tokenize(block.content),
      ...block.keywords.flatMap(k => tokenize(k)),
      ...block.tags.flatMap(t => tokenize(t)),
    ]);
    for (const tok of allTokens) {
      df.set(tok, (df.get(tok) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);
  }
  return idf;
}

// ── BM25 score for a single field ─────────────────────────────────────────────
function bm25Field(
  queryTerms: string[],
  fieldTokens: string[],
  avgLen: number,
  idf: Map<string, number>,
  fieldWeight: number,
): number {
  const dl = fieldTokens.length;
  if (dl === 0) return 0;
  let score = 0;
  for (const term of queryTerms) {
    const tf = fieldTokens.filter(t => t === term).length;
    if (tf === 0) continue;
    const idfVal = idf.get(term) || 0.5;
    const tfNorm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (dl / avgLen)));
    score += idfVal * tfNorm * fieldWeight;
  }
  return score;
}

// ── Detect intent from normalized message ─────────────────────────────────────
function detectIntent(normalized: string): string {
  let best = 'consult';
  let bestScore = 0;
  for (const [intent, kws] of Object.entries(INTENT_KEYWORDS)) {
    const score = kws.filter(kw => normalized.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return best;
}

// ── Template Builder ───────────────────────────────────────────────────────────
function buildFromTemplate(
  topDoc: KnowledgeBlock,
  relatedDocs: KnowledgeBlock[],
  promos: any[],
  intent: string,
  serviceType: string,
): { text: string; quickReplies: string[]; templateKey: TemplateKey } {
  const now = new Date();
  const hour = now.getHours();
  const isBusinessHours = hour >= 8 && hour < 21;

  // CTA based on time
  const cta = isBusinessHours
    ? 'Anh/chị muốn đặt lịch tư vấn hoặc xem thêm thông tin không ạ? Em hỗ trợ ngay!'
    : 'Anh/chị để lại số điện thoại, sáng mai em sẽ liên hệ tư vấn chi tiết ạ!';

  // Active promo
  const promoText = promos.length > 0
    ? '\n\n🎁 Ưu đãi đang chạy:\n' + promos.map((p: any) => {
        const end = new Date(p.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        return `${p.emoji || '🎉'} ${p.title} — ${p.short_desc} (hết ${end})`;
      }).join('\n')
    : '';

  if (intent === 'pricing' || intent === 'benefit' || intent === 'consult') {
    // Find a related pricing doc
    const pricingDoc = relatedDocs.find(d => d.phase === 'closing' || d.phase === 'value_prop') || relatedDocs[0];
    let text = topDoc.content;
    if (pricingDoc && pricingDoc.id !== topDoc.id) {
      text += `\n\n${pricingDoc.content}`;
    }
    text += promoText;
    text += `\n\n📅 ${cta}`;
    return {
      text,
      quickReplies: ['Xem bảng giá chi tiết', 'Đặt lịch tư vấn', 'Gói bao gồm gì?'],
      templateKey: 'pricing_with_cta',
    };
  }

  if (intent === 'booking' || intent === 'schedule') {
    const text = topDoc.content + `\n\n📅 ${cta}`;
    return {
      text,
      quickReplies: ['Xem lịch trống', 'Gọi tư vấn ngay', 'Xem bảng giá'],
      templateKey: 'booking_cta',
    };
  }

  if (intent === 'deposit') {
    const text = topDoc.content + `\n\n💳 Anh/chị cần hỗ trợ thêm về thanh toán, em giải đáp ngay ạ!`;
    return {
      text,
      quickReplies: ['Đặt cọc bao nhiêu?', 'Các hình thức thanh toán', 'Hủy lịch thì sao?'],
      templateKey: 'deposit_info',
    };
  }

  // Default: just return the top doc content
  const text = topDoc.content + (promoText ? promoText : '');
  return {
    text,
    quickReplies: topDoc.nextQuestion ? [topDoc.nextQuestion] : ['Xem thêm thông tin', 'Tư vấn ngay'],
    templateKey: 'default',
  };
}

// ── Main RAG search function ───────────────────────────────────────────────────
export async function offlineRagSearch(params: {
  message: string;
  faqs: any[];
  scripts: any[];
  promos: any[];
  state: ConversationStateV2;
}): Promise<RagResult> {
  const { message, faqs, scripts, promos, state } = params;

  // Step 1: Normalize
  const normalized = normalizeVietnamese(message);

  // Step 2: Intent Detection
  const intent = detectIntent(normalized);

  // Step 3: Service Detection
  const detectedService = detectServiceType(normalized);

  // Step 4: Phase from intent + conversation state
  const intentPhase = PHASE_FOR_INTENT[intent] || 'discovery';

  // Step 5: Query Expansion
  const expandedTokens = Array.from(new Set([
    ...tokenize(normalized),
    ...expandQuery(normalized).flatMap(w => tokenize(w)),
  ]));

  if (expandedTokens.length === 0) {
    return { text: '', quickReplies: [], matched: false, score: 0, fallbackToAI: true };
  }

  // Step 6: Build corpus + IDF
  const corpus = buildCorpus(faqs, scripts);
  if (corpus.length === 0) {
    return { text: '', quickReplies: [], matched: false, score: 0, fallbackToAI: true };
  }

  const idf = buildIDF(corpus);

  // Average doc lengths per field
  const avgTitleLen   = corpus.reduce((s, b) => s + tokenize(b.title).length, 0) / corpus.length;
  const avgContentLen = corpus.reduce((s, b) => s + tokenize(b.content).length, 0) / corpus.length;
  const avgKwLen      = corpus.reduce((s, b) => s + b.keywords.flatMap(k => tokenize(k)).length, 0) / corpus.length;
  const avgTagLen     = corpus.reduce((s, b) => s + b.tags.flatMap(t => tokenize(t)).length, 0) / corpus.length;

  // Step 7: BM25 scoring for each block
  const scored = corpus.map(block => {
    const titleToks   = tokenize(block.title);
    const contentToks = tokenize(block.content);
    const kwToks      = block.keywords.flatMap(k => tokenize(k));
    const tagToks     = block.tags.flatMap(t => tokenize(t));

    let score = 0;
    score += bm25Field(expandedTokens, titleToks,   Math.max(avgTitleLen, 1),   idf, FIELD_W.title);
    score += bm25Field(expandedTokens, contentToks, Math.max(avgContentLen, 1), idf, FIELD_W.content);
    score += bm25Field(expandedTokens, kwToks,      Math.max(avgKwLen, 1),      idf, FIELD_W.keywords);
    score += bm25Field(expandedTokens, tagToks,     Math.max(avgTagLen, 1),     idf, FIELD_W.tags);

    // Step 8: Rule Engine bonuses
    if (detectedService && block.serviceType &&
        block.serviceType.toLowerCase().includes(detectedService.toLowerCase())) {
      score += 2.0;
    }
    if (intentPhase && block.phase === intentPhase) score += 1.5;
    if (block.priority > 0) score += (block.priority / 100) * 1.5;

    // Boost scripted content for conversational phases
    if (block.type === 'script' && (intent === 'greeting' || intent === 'consult')) score += 0.5;
    // Boost FAQ for pricing/benefit queries
    if (block.type === 'faq' && (intent === 'pricing' || intent === 'benefit' || intent === 'deposit')) score += 0.5;

    // Already-shown docs get a small penalty (avoid repetition)
    const faqIds   = state.sentFaqIds   as unknown as { has?: (id: string) => boolean } | string[] | undefined;
    const scrIds   = state.sentScriptIds as unknown as { has?: (id: string) => boolean } | string[] | undefined;
    const faqSeen  = Array.isArray(faqIds) ? faqIds.includes(block.id) : faqIds?.has?.(block.id);
    const scrSeen  = Array.isArray(scrIds) ? scrIds.includes(block.id) : scrIds?.has?.(block.id);
    if (faqSeen || scrSeen) score *= 0.6;

    return { block, score };
  });

  // Sort by score desc
  const top = scored.filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

  if (top.length === 0 || top[0].score < RAG_THRESHOLD) {
    return { text: '', quickReplies: [], matched: false, score: top[0]?.score || 0, fallbackToAI: true };
  }

  const topDoc   = top[0].block;
  const relDocs  = top.slice(1, 3).map(r => r.block);

  // Step 9: Context Builder — find related docs (same service or adjacent phase)
  const ADJACENT_PHASES: Record<string, string[]> = {
    discovery:  ['value_prop', 'offer'],
    value_prop: ['discovery', 'fomo', 'offer'],
    fomo:       ['value_prop', 'closing'],
    closing:    ['fomo'],
  };
  const adjacentPhases = ADJACENT_PHASES[intentPhase] || [];
  const contextDocs = corpus
    .filter(b => b.id !== topDoc.id && !relDocs.find(r => r.id === b.id))
    .filter(b => adjacentPhases.includes(b.phase) || (detectedService && b.serviceType === detectedService))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2);

  const allRelated = [...relDocs, ...contextDocs].slice(0, 3);

  // Step 10: Template Builder
  const { text, quickReplies, templateKey } = buildFromTemplate(
    topDoc, allRelated, promos, intent, detectedService,
  );

  if (!text.trim()) {
    return { text: '', quickReplies: [], matched: false, score: top[0].score, fallbackToAI: true };
  }

  return {
    text,
    quickReplies,
    imageUrl: topDoc.imageUrl,
    nextQuestion: topDoc.nextQuestion,
    handoffNeeded: topDoc.handoffTrigger,
    matched: true,
    score: Math.round(top[0].score * 100) / 100,
    matchedDocId: topDoc.id,
    templateUsed: templateKey,
    intent,
    fallbackToAI: false,
  };
}
