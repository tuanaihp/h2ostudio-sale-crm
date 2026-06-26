// H2O Bot Engine V2 — Phase-Aware Sales Script Bot
// Luồng: Intent → Service → Slots → Phase Transition → Rule Engine
//        → TF-IDF (tập lọc) → Script Expansion → FAQ Injection
//        → Business Rules → Response Builder → Update State

import { normalizeVietnamese, expandSynonyms, detectServiceType, getQuickReplies } from './botEngine';
import { expandQuery } from '../utils/synonyms';
import type { AnyFaq } from './botEngine';
import type {
  CustomerIntent, SalesPhase, CustomerSlots,
  ConversationStateV2, BotV2Result,
} from '../types/botV2';
import type { SaleScenario } from '../types';

// ── 1. Intent keywords ────────────────────────────────────────────────────────
const INTENT_KEYWORDS: Record<CustomerIntent, string[]> = {
  greeting:   ['chào', 'hello', 'hi', 'xin chào', 'alo', 'hey', 'cho hỏi', 'helo', 'a ơi', 'chị ơi', 'em ơi'],
  consult:    ['tư vấn', 'muốn biết', 'hỏi về', 'tham khảo', 'xem thử', 'giới thiệu',
               'cho biết', 'thông tin', 'hỏi thêm', 'muốn hỏi', 'cần biết', 'tìm hiểu',
               'muốn tham khảo', 'cho em hỏi'],
  pricing:    ['giá', 'phí', 'tiền', 'bao nhiêu', 'bảng giá', 'báo giá', 'mấy tiền',
               'giá cả', 'chi phí', 'gói bao nhiêu', 'giá gói', 'giá chụp', 'phí chụp'],
  benefit:    ['bao gồm', 'có gì', 'trong gói', 'quyền lợi', 'gồm những gì', 'được gì',
               'dịch vụ gồm', 'kèm gì', 'gói có', 'bao gồm gì', 'gồm có', 'gói chụp gồm',
               'combo gồm', 'bao gồm những gì'],
  booking:    ['đặt lịch', 'giữ lịch', 'book', 'còn lịch', 'lịch chụp',
               'ngày nào trống', 'muốn đặt', 'hẹn ngày', 'đặt ngày chụp'],
  deposit:    ['đặt cọc', 'cọc', 'chuyển khoản', 'thanh toán', 'tiền cọc',
               'đặt trước', 'trả trước', 'cọc bao nhiêu', 'số tài khoản', 'stk'],
  schedule:   ['tháng mấy', 'cuối tuần', 'còn slot', 'còn ngày trống', 'lịch còn', 'ngày trống'],
  objection:  ['đắt quá', 'mắc quá', 'cân nhắc', 'suy nghĩ thêm', 'hỏi lại sau',
               'bàn với', 'chưa chắc', 'lo lắng', 'băn khoăn', 'chưa quyết'],
  confirm:    ['ok', 'được', 'đồng ý', 'cho em đặt', 'muốn đặt ngay', 'chốt',
               'xác nhận', 'em lấy', 'anh lấy', 'lấy gói', 'đặt ngay', 'chị note'],
  after_sale: ['nhận ảnh', 'chọn ảnh', 'khi nào có ảnh', 'giao ảnh',
               'ra ảnh', 'bao lâu xong', 'bao lâu có ảnh', 'khi nào xong', 'duyệt ảnh'],
  complaint:  ['không hài lòng', 'phàn nàn', 'thất vọng', 'khiếu nại', 'sai hẹn', 'chưa đẹp'],
  chitchat:   ['cảm ơn', 'thanks', 'thks', 'dạ', 'ừ', 'vâng', 'okay', 'oke', 'ok ạ', 'hiểu rồi'],
};

// ── 2. Intent → SalesPhase ────────────────────────────────────────────────────
const INTENT_TO_PHASE: Record<CustomerIntent, SalesPhase> = {
  greeting:   'opening',
  consult:    'discovery',
  pricing:    'value_prop',
  benefit:    'value_prop',
  booking:    'fomo',
  deposit:    'closing',
  schedule:   'fomo',
  objection:  'qa',
  confirm:    'closing',
  after_sale: 'followup',
  complaint:  'followup',
  chitchat:   'discovery', // giữ phase hiện tại
};

// ── Phase order — chỉ tiến không lùi ────────────────────────────────────────
export const PHASE_ORDER: SalesPhase[] = [
  'opening', 'discovery', 'value_prop', 'offer', 'fomo', 'closing', 'pre_shoot', 'followup',
];

// ── Phase labels (cho admin debug panel) ─────────────────────────────────────
export const PHASE_LABELS: Record<SalesPhase, string> = {
  opening:    'Mở đầu',
  discovery:  'Khởi gợi nhu cầu',
  value_prop: 'Giá trị – USP',
  offer:      'Ưu đãi đặc biệt',
  fomo:       'Tạo FOMO',
  closing:    'Chốt cọc',
  pre_shoot:  'Trước ngày chụp',
  followup:   'Follow-up',
  qa:         'Q&A – Từ chối',
};

// ── Lead scores per intent ────────────────────────────────────────────────────
const INTENT_LEAD_SCORES: Record<CustomerIntent, number> = {
  greeting: 0, consult: 10, pricing: 20, benefit: 15,
  booking: 40, deposit: 80, schedule: 25, objection: 5,
  confirm: 60, after_sale: 5, complaint: -10, chitchat: 0,
};

// ── Quick replies per phase ───────────────────────────────────────────────────
export const PHASE_QUICK_REPLIES: Record<SalesPhase, string[]> = {
  opening:    ['📸 Ảnh cưới studio', '👗 Váy cưới', '💄 Makeup & tóc'],
  discovery:  ['📸 Xem combo studio', '🌿 Xem combo ngoại cảnh', '💰 Xem bảng giá'],
  value_prop: ['💰 Xem bảng giá', '🎨 Xem concept ảnh', '📅 Muốn đặt lịch'],
  offer:      ['🎁 Xem ưu đãi hiện tại', '📅 Đặt lịch ngay', '📞 Gọi tư vấn'],
  fomo:       ['📅 Giữ lịch trước', '💰 Xem bảng giá', '📞 Gọi ngay'],
  closing:    ['💳 Đặt cọc ngay', '📅 Xác nhận lịch', '📞 Gọi tư vấn'],
  pre_shoot:  ['📋 Xem checklist chuẩn bị', '📍 Địa chỉ studio', '📞 Liên hệ'],
  followup:   ['📸 Xem ảnh mẫu', '💬 Nhắn Zalo', '⭐ Đánh giá dịch vụ'],
  qa:         ['💰 Xem bảng giá', '📸 Xem ảnh mẫu', '📞 Gọi tư vấn'],
};

// ── Slot patterns cho Script Expansion ────────────────────────────────────────
// Nếu line trong script chứa pattern VÀ slot đã được fill → bỏ line đó
const SLOT_QUESTION_PATTERNS: Array<{ slot: keyof CustomerSlots; patterns: string[] }> = [
  {
    slot: 'location',
    patterns: [
      'studio hay ngoại cảnh', 'ngoại cảnh hay studio', 'outdoor hay studio',
      'chụp studio hay', 'chụp ở đâu', 'studio không', 'ngoại cảnh không',
      'muốn chụp studio', 'muốn chụp ngoại', 'dự định chụp',
    ],
  },
  {
    slot: 'weddingMonth',
    patterns: [
      'tháng mấy', 'cưới khi nào', 'ngày cưới chưa', 'bao giờ cưới',
      'dự định cưới tháng', 'cưới tháng', 'ngày cưới', 'lịch cưới',
    ],
  },
  {
    slot: 'serviceType',
    patterns: [
      'muốn tư vấn gì', 'chụp ảnh hay váy', 'dịch vụ gì', 'ảnh cưới hay váy cưới',
      'thuê váy hay chụp',
    ],
  },
  {
    slot: 'conceptCount',
    patterns: ['mấy concept', 'bao nhiêu concept', 'chụp mấy bộ', 'mấy set ảnh', 'mấy concept'],
  },
];

// ── FAQ categories cho intent-based injection ─────────────────────────────────
const INTENT_FAQ_CATEGORIES: Partial<Record<CustomerIntent, string[]>> = {
  pricing:    ['pricing', 'offer', 'closing'],
  benefit:    ['benefit', 'pricing', 'closing'],
  booking:    ['booking', 'schedule'],
  deposit:    ['payment', 'closing'],
  after_sale: ['after_sale', 'service'],
  objection:  ['objection', 'qa', 'faq'],
};

// Intent mà FAQ trả lời trực tiếp (chính xác hơn script)
export const FAQ_PRIMARY_INTENTS: CustomerIntent[] = ['benefit', 'deposit', 'after_sale'];

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 1 — Intent Detection
// ══════════════════════════════════════════════════════════════════════════════
export function detectIntentV2(
  normalizedMsg: string,
): { intent: CustomerIntent; confidence: number } {
  const scores: Partial<Record<CustomerIntent, number>> = {};

  for (const [key, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const intent = key as CustomerIntent;
    let hits = 0;
    for (const kw of keywords) {
      if (normalizedMsg.includes(kw)) {
        // Cụm từ dài → trọng số cao hơn
        hits += kw.split(/\s+/).length;
      }
    }
    if (hits > 0) scores[intent] = hits;
  }

  const sorted = (Object.entries(scores) as [CustomerIntent, number][])
    .sort(([, a], [, b]) => b - a);

  if (sorted.length === 0) return { intent: 'consult', confidence: 0.3 };

  const [topIntent, topScore] = sorted[0];
  const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0);
  const confidence = Math.min(topScore / Math.max(totalScore, 1), 1);

  return { intent: topIntent, confidence };
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 2 — Service Detection (mở rộng V1)
// ══════════════════════════════════════════════════════════════════════════════
function detectServiceV2(
  normalizedMsg: string,
  currentService: string | null,
): string | null {
  // Studio / outdoor detection trước (specific hơn)
  if (/\bstudio\b|phòng chụp|trong nhà|indoor/.test(normalizedMsg)) return 'anh_cuoi';
  if (/ngoại cảnh|outdoor|ngoài trời/.test(normalizedMsg)) return 'anh_cuoi';
  return detectServiceType(normalizedMsg) ?? currentService;
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 3 — Slot Extraction
// ══════════════════════════════════════════════════════════════════════════════
export function extractSlotsV2(
  normalizedMsg: string,
  currentSlots: CustomerSlots,
): { slots: CustomerSlots; filled: string[] } {
  const updated = { ...currentSlots };
  const filled: string[] = [];

  // Location: studio / outdoor / both
  if (!updated.location) {
    if (/\bstudio\b|phòng chụp|trong nhà|indoor|chụp trong/.test(normalizedMsg)) {
      updated.location = 'studio'; filled.push('location=studio');
    } else if (/ngoại cảnh|outdoor|ngoài trời|phong cảnh/.test(normalizedMsg)) {
      updated.location = 'outdoor'; filled.push('location=outdoor');
    } else if (/cả studio|cả ngoại cảnh|kết hợp|combo.*ngoại/.test(normalizedMsg)) {
      updated.location = 'both'; filled.push('location=both');
    }
  }

  // Wedding month
  if (!updated.weddingMonth) {
    const m = normalizedMsg.match(/tháng\s*(\d{1,2})/);
    if (m) {
      updated.weddingMonth = `tháng ${m[1]}`;
      filled.push(`month=${m[1]}`);
    }
  }

  // Wedding year
  if (!updated.weddingYear) {
    const y = normalizedMsg.match(/năm\s*(20\d{2})/);
    if (y) {
      updated.weddingYear = y[1];
      filled.push(`year=${y[1]}`);
    }
  }

  // Budget / combo
  if (!updated.budget) {
    if (/3[.,]?999|3tr9|3 triệu 9|ba triệu/.test(normalizedMsg)) {
      updated.budget = 'combo_3999'; filled.push('budget=3999');
    } else if (/9[.,]?999|9tr9|mười triệu|10 triệu|chín triệu/.test(normalizedMsg)) {
      updated.budget = 'combo_9999'; filled.push('budget=9999');
    } else if (/12[.,]?999|13 triệu|mười hai triệu/.test(normalizedMsg)) {
      updated.budget = 'combo_12999'; filled.push('budget=12999');
    } else if (/15 triệu|mười lăm triệu|15tr/.test(normalizedMsg)) {
      updated.budget = 'combo_15000'; filled.push('budget=15000');
    }
  }

  // Concept count
  if (!updated.conceptCount) {
    const cm = normalizedMsg.match(/(\d+)\s*concept/);
    if (cm) {
      updated.conceptCount = parseInt(cm[1]);
      filled.push(`concept=${cm[1]}`);
    }
  }

  // Phone number
  if (!updated.phoneNumber) {
    const pm = normalizedMsg.match(/0[3-9]\d{8}/);
    if (pm) {
      updated.phoneNumber = pm[0];
      filled.push('phone');
    }
  }

  return { slots: updated, filled };
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 4 — Phase Transition (chỉ tiến, không lùi)
// ══════════════════════════════════════════════════════════════════════════════
export function transitionPhaseV2(
  intent: CustomerIntent,
  currentPhase: SalesPhase,
): SalesPhase {
  if (intent === 'chitchat') return currentPhase;

  const target = INTENT_TO_PHASE[intent];

  // qa và followup có thể nhảy bất kỳ lúc nào
  if (target === 'qa' || target === 'followup') return target;

  const curIdx = PHASE_ORDER.indexOf(currentPhase);
  const tgtIdx = PHASE_ORDER.indexOf(target);

  // Chỉ tiến → nếu target thấp hơn current, giữ nguyên
  return tgtIdx > curIdx ? target : currentPhase;
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 4b — Slot-Based Phase Promotion
// Khi slots đủ thông tin → tự tiến phase dù intent không rõ
// VD: khách trả lời "Tháng 11" → weddingMonth fill → promote discovery → value_prop
// ══════════════════════════════════════════════════════════════════════════════
function promotePhaseFromSlots(
  phase: SalesPhase,
  slots: CustomerSlots,
  flags: ConversationStateV2['flags'],
): SalesPhase {
  // discovery → value_prop: biết location + tháng cưới → đủ để gửi combo
  if (phase === 'discovery' && slots.location !== null && slots.weddingMonth !== null) {
    return 'value_prop';
  }

  // value_prop → offer: đã gửi bảng giá → tiến sang ưu đãi
  if (phase === 'value_prop' && flags.hasSentPricing) {
    return 'offer';
  }

  // offer → closing: đã tạo FOMO → tiến sang chốt cọc
  if (phase === 'offer' && flags.hasSentFOMO) {
    return 'closing';
  }

  return phase;
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 5 — Rule Engine: lọc scripts theo phase
// ══════════════════════════════════════════════════════════════════════════════
function filterCandidateScripts(
  allScripts: any[],
  targetPhase: SalesPhase,
  state: ConversationStateV2,
): any[] {
  // Primary: exact phase match
  let candidates = allScripts.filter(s => s.phase === targetPhase);

  // Nếu quá ít → mở rộng sang phase liền kề
  if (candidates.length < 2) {
    const idx = PHASE_ORDER.indexOf(targetPhase);
    const adj = [PHASE_ORDER[idx - 1], PHASE_ORDER[idx + 1]].filter(Boolean) as SalesPhase[];
    candidates = allScripts.filter(s =>
      s.phase === targetPhase || adj.includes(s.phase as SalesPhase)
    );
  }

  // Ưu tiên script chưa gửi → tránh lặp lại
  const unsent = candidates.filter(s => !state.sentScriptIds.includes(s.id));
  return unsent.length > 0 ? unsent : candidates;
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 6 — TF-IDF Ranking (chỉ trên tập đã lọc)
// ══════════════════════════════════════════════════════════════════════════════
function rankScriptsV2(
  candidates: any[],
  allWords: string[],
): { script: any | null; score: number } {
  if (candidates.length === 0) return { script: null, score: 0 };

  const N = Math.max(candidates.length, 1);
  const df: Record<string, number> = {};
  candidates.forEach(s => {
    const doc = [s.title, s.content, ...(s.tags || [])].join(' ').toLowerCase();
    new Set(doc.split(/\s+/).filter((w: string) => w.length >= 2))
      .forEach((w: string) => { df[w] = (df[w] || 0) + 1; });
  });
  const idf = (w: string) => Math.log((N + 1) / ((df[w] || 0) + 1)) + 1;

  const scored = candidates.map(s => {
    let sc = 0;
    allWords.forEach(w => {
      const wt = idf(w);
      if (s.title.toLowerCase().includes(w)) sc += 3 * wt;
      if ((s.tags || []).some((t: string) => t.toLowerCase().includes(w))) sc += 2 * wt;
      if (s.content.toLowerCase().includes(w)) sc += 1 * wt;
    });
    return { script: s, score: sc };
  }).sort((a, b) => b.score - a.score);

  return { script: scored[0]?.script ?? null, score: scored[0]?.score ?? 0 };
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 7 — Script Expansion: bỏ câu hỏi đã có câu trả lời
// ══════════════════════════════════════════════════════════════════════════════
export function expandScriptContent(content: string, slots: CustomerSlots): string {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const filtered = lines.filter(line => {
    const lower = line.toLowerCase();
    for (const { slot, patterns } of SLOT_QUESTION_PATTERNS) {
      const matchesPattern = patterns.some(p => lower.includes(p));
      if (!matchesPattern) continue;
      // Slot đã biết → bỏ câu hỏi này
      if (slots[slot] !== null && slots[slot] !== undefined) {
        return false;
      }
    }
    return true;
  });

  // Không trả về chuỗi rỗng
  return filtered.length > 0 ? filtered.join('\n') : content;
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 8 — FAQ Injection: tìm FAQ bổ sung phù hợp
// ══════════════════════════════════════════════════════════════════════════════
function injectFaqV2(
  allFaqs: AnyFaq[],
  intent: CustomerIntent,
  serviceType: string | null,
  allWords: string[],
  state: ConversationStateV2,
): AnyFaq | null {
  if (['greeting', 'chitchat', 'confirm'].includes(intent)) return null;

  const targetCats = INTENT_FAQ_CATEGORIES[intent] || [];

  const candidates = allFaqs.filter(f => {
    if (!f.answer || f.answer.length < 10) return false;
    if (String(f.id).startsWith('__virt')) return false; // bỏ qua virtual FAQs trong injection
    if (String(f.id).startsWith('__pkg_')) return false; // bỏ qua price_packages — chỉ dùng khi là primary answer
    if (state.sentFaqIds.includes(String(f.id))) return false;
    const fSvc = (f as any).service_type as string | null;
    if (serviceType && fSvc && fSvc !== serviceType) return false;
    if (targetCats.length > 0 && f.category) return targetCats.includes(f.category);
    return true;
  });

  if (candidates.length === 0) return null;

  const scored = candidates.map(f => {
    const kws: string[] = f.keywords && f.keywords.length > 0
      ? f.keywords
      : (f.tags || []);
    const kwHits = allWords.filter(w =>
      kws.some(k => k.toLowerCase().includes(w))
    ).length;
    const score = kws.length > 0 ? kwHits / kws.length : 0;
    return { faq: f, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].faq : null;
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 9 — Business Rules Engine
// ══════════════════════════════════════════════════════════════════════════════
interface BusinessAction {
  appendFOMO: boolean;
  appendHoldDateCTA: boolean;
  appendDepositCTA: boolean;
  isHandoff: boolean;
  rulesFired: string[];
}

function applyBusinessRulesV2(
  intent: CustomerIntent,
  phase: SalesPhase,
  flags: ConversationStateV2['flags'],
): BusinessAction {
  const action: BusinessAction = {
    appendFOMO: false, appendHoldDateCTA: false,
    appendDepositCTA: false, isHandoff: false, rulesFired: [],
  };

  // Rule 1: FOMO khi hỏi lịch và chưa gửi FOMO
  if (['booking', 'schedule'].includes(intent) && !flags.hasSentFOMO) {
    action.appendFOMO = true;
    action.appendHoldDateCTA = true;
    action.rulesFired.push('fomo_booking');
  }

  // Rule 2: CTA đặt cọc khi khách confirm hoặc đang ở phase closing
  if (intent === 'confirm' && (phase === 'closing' || phase === 'fomo')) {
    action.appendDepositCTA = true;
    action.rulesFired.push('cta_deposit');
  }

  // Rule 3: Handoff khi phàn nàn
  if (intent === 'complaint') {
    action.isHandoff = true;
    action.rulesFired.push('handoff_complaint');
  }

  return action;
}

// ══════════════════════════════════════════════════════════════════════════════
// BƯỚC 10 — Response Builder: ghép script + FAQ + CTA
// ══════════════════════════════════════════════════════════════════════════════
function buildResponseV2(
  scriptContent: string,
  injectedFaq: AnyFaq | null,
  businessAction: BusinessAction,
): string {
  const parts: string[] = [];

  if (scriptContent) parts.push(scriptContent);

  // FAQ inject — bản ngắn, bổ sung sau script
  if (injectedFaq?.answer && scriptContent) {
    const brief = injectedFaq.answer.length > 260
      ? injectedFaq.answer.slice(0, 260) + '...'
      : injectedFaq.answer;
    parts.push('\n' + brief);
  } else if (injectedFaq?.answer && !scriptContent) {
    parts.push(injectedFaq.answer);
  }

  // Business rule outputs
  if (businessAction.appendFOMO) {
    parts.push('\n🔥 Lịch tháng này đang được đặt nhanh lắm em ơi! Em muốn chị giữ slot trước cho vợ chồng em không ạ? 💕');
  }
  if (businessAction.appendHoldDateCTA) {
    parts.push('Chỉ cọc 1.000.000đ là giữ được lịch + toàn bộ ưu đãi hiện tại nha em!');
  }
  if (businessAction.appendDepositCTA) {
    parts.push(
      '\n💳 Đặt cọc 1.000.000đ để giữ lịch:\n' +
      '➡️ MB Bank: 9098688688888 – NGUYEN THU THUY\n' +
      '➡️ Vietcombank: 0031000367971 – NGUYEN THU THUY\n' +
      'Ghi nội dung: [Tên] cọc chụp ảnh – Gửi chị ảnh CK nha em!',
    );
  }

  return parts.join('\n').trim();
}

// ══════════════════════════════════════════════════════════════════════════════
// SCENARIO HELPERS
// ══════════════════════════════════════════════════════════════════════════════

// Resolve nội dung của một step:
// 1. scriptIds → TF-IDF trên tập scripts đã tag
// 2. phase → TF-IDF trên tất cả scripts trong phase
// 3. content cố định
function resolveStepContent(
  step: SaleScenario['steps'][number],
  scriptData: any[],
  allWords: string[],
  state: ConversationStateV2,
): string {
  const shortMsg = allWords.length < 3; // "dạ", "ok", "ừ" → skip TF-IDF

  // Priority 1: TF-IDF trên tập scripts đã tag
  if (step.scriptIds && step.scriptIds.length > 0 && scriptData.length > 0) {
    const tagged = scriptData.filter(s => step.scriptIds!.includes(s.id));
    if (tagged.length > 0) {
      const unsent = tagged.filter(s => !state.sentScriptIds.includes(s.id));
      const candidates = unsent.length > 0 ? unsent : tagged;
      const pick = shortMsg ? candidates[0] : rankScriptsV2(candidates, allWords).script;
      if (pick?.content) {
        const expanded = expandScriptContent(pick.content, state.slots);
        if (expanded.trim()) return expanded;
      }
    }
  }
  // Priority 2: TF-IDF trên toàn phase
  if (step.phase && scriptData.length > 0) {
    const phaseCandidates = filterCandidateScripts(scriptData, step.phase as SalesPhase, state);
    if (phaseCandidates.length > 0) {
      const pick = shortMsg ? phaseCandidates[0] : rankScriptsV2(phaseCandidates, allWords).script;
      if (pick?.content) {
        const expanded = expandScriptContent(pick.content, state.slots);
        if (expanded.trim()) return expanded;
      }
    }
  }
  return step.content;
}

// Tính bước tiếp theo cần gửi trong một scenario.
// fromIdx: chỉ số bước sẽ gửi ngay (main response).
// Trả về: nội dung main, danh sách auto-step kèm delay, và chỉ số của bước
// waitForReply tiếp theo (hoặc steps.length nếu hết scenario).
function advanceScenario(
  scenario: SaleScenario,
  fromIdx: number,
  scriptData: any[],
  allWords: string[],
  state: ConversationStateV2,
): { mainContent: string; mainImageUrl?: string; autoSteps: Array<{content: string; delaySeconds: number; imageUrl?: string}>; nextReplyIdx: number } | null {
  const mainStep = scenario.steps[fromIdx];
  if (!mainStep) return null;

  const mainContent = resolveStepContent(mainStep, scriptData, allWords, state);
  const mainImageUrl = mainStep.imageUrl || undefined;
  const autoSteps: Array<{content: string; delaySeconds: number; imageUrl?: string}> = [];
  let idx = fromIdx + 1;

  while (idx < scenario.steps.length) {
    const s = scenario.steps[idx];
    if (s.waitForReply) break;
    autoSteps.push({ content: resolveStepContent(s, scriptData, allWords, state), delaySeconds: s.delaySeconds, imageUrl: s.imageUrl || undefined });
    idx++;
  }

  return { mainContent, mainImageUrl, autoSteps, nextReplyIdx: idx };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN — processMessageV2
// ══════════════════════════════════════════════════════════════════════════════
export function processMessageV2(params: {
  rawMessage: string;
  scriptData: any[];
  faqData: AnyFaq[];
  state: ConversationStateV2;
  scenarioData?: SaleScenario[];
}): BotV2Result {
  const { rawMessage, scriptData, faqData, state, scenarioData = [] } = params;

  // ── Step 1: Normalize ──
  const normalized = normalizeVietnamese(rawMessage);
  const synonymMapped = expandSynonyms(normalized);
  const expandedWords = expandQuery(synonymMapped);
  const allWords = Array.from(new Set([
    ...expandedWords,
    ...synonymMapped.split(/\s+/).filter(w => w.length >= 2),
  ]));

  // ── Step 1b: Scenario (Forced Flow) ──
  if (scenarioData.length > 0) {
    // Đang trong một scenario đang hoạt động → tiếp tục bước tiếp theo
    if (state.activeScenarioId) {
      const activeScenario = scenarioData.find(s => s.id === state.activeScenarioId && s.enabled);
      if (activeScenario && state.activeScenarioStep < activeScenario.steps.length) {
        const result = advanceScenario(activeScenario, state.activeScenarioStep, scriptData, allWords, state);
        if (result) {
          const isDone = result.nextReplyIdx >= activeScenario.steps.length;
          const { slots: updatedSlots } = extractSlotsV2(synonymMapped, state.slots);
          return {
            text: result.mainContent,
            newState: {
              ...state,
              turnCount: state.turnCount + 1,
              slots: updatedSlots,
              activeScenarioId: isDone ? null : state.activeScenarioId,
              activeScenarioStep: result.nextReplyIdx,
            },
            quickReplies: [],
            nextQuestion: null,
            leadScoreAdd: 2,
            faqId: null,
            handoffTrigger: false,
            debug: {
              intent: 'consult',
              intentConfidence: 1,
              detectedService: state.slots.serviceType,
              selectedPhase: state.currentPhase,
              scriptId: null,
              scriptTitle: `[Flow] ${activeScenario.name} bước ${state.activeScenarioStep + 1}`,
              scriptScore: 99,
              candidateScriptCount: 1,
              injectedFaqId: null,
              injectedFaqTitle: null,
              businessRulesFired: [`flow_continue:${activeScenario.name}`],
              slotsFilledThisTurn: [],
            },
            scenarioAutoSteps: result.autoSteps,
            scenarioMainImageUrl: result.mainImageUrl,
          };
        }
      }
      // Scenario đã xong hoặc không tìm thấy → reset, tiếp tục bot thường
    }

    // Chưa có scenario → best-match: chọn kịch bản có nhiều keyword khớp nhất
    if (!state.activeScenarioId) {
      // Tính điểm match cho mỗi scenario (số keyword khớp)
      const scored = scenarioData
        .filter(s => s.enabled && s.steps.length > 0 && (s.scenarioType === 'keyword' || s.scenarioType === 'followup'))
        .map(s => ({
          scenario: s,
          matchCount: s.triggerKeywords.filter(kw =>
            kw.trim() && normalized.includes(normalizeVietnamese(kw.trim()))
          ).length,
        }))
        .filter(x => x.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount); // nhiều match nhất lên đầu

      const best = scored[0];
      if (best) {
        const scenario = best.scenario;
        const result = advanceScenario(scenario, 0, scriptData, allWords, state);
          if (result) {
            const isDone = result.nextReplyIdx >= scenario.steps.length;
            const { slots: updatedSlots } = extractSlotsV2(synonymMapped, state.slots);
            return {
              text: result.mainContent,
              newState: {
                ...state,
                turnCount: state.turnCount + 1,
                slots: updatedSlots,
                activeScenarioId: isDone ? null : scenario.id,
                activeScenarioStep: result.nextReplyIdx,
              },
              quickReplies: [],
              nextQuestion: null,
              leadScoreAdd: 5,
              faqId: null,
              handoffTrigger: false,
              debug: {
                intent: 'consult',
                intentConfidence: 1,
                detectedService: updatedSlots.serviceType,
                selectedPhase: state.currentPhase,
                scriptId: null,
                scriptTitle: `[Flow] ${scenario.name} bắt đầu`,
                scriptScore: 99,
                candidateScriptCount: 1,
                injectedFaqId: null,
                injectedFaqTitle: null,
                businessRulesFired: [`flow_start:${scenario.name}`],
                slotsFilledThisTurn: [],
              },
              scenarioAutoSteps: result.autoSteps,
              scenarioMainImageUrl: result.mainImageUrl,
            };
          }
      }
    }
  }

  // ── Step 2: Intent ──
  const { intent, confidence } = detectIntentV2(synonymMapped);

  // ── Step 3: Service ──
  const service = detectServiceV2(synonymMapped, state.slots.serviceType);

  // ── Step 4: Slots ──
  const { slots, filled: slotsFilledThisTurn } = extractSlotsV2(synonymMapped, state.slots);
  if (service && !slots.serviceType) slots.serviceType = service;

  // ── Step 5: Phase transition ──
  const intentPhase = transitionPhaseV2(intent, state.currentPhase);
  // Step 5b: Slot-based promotion — tiến phase khi slots đủ (VD: biết location+tháng → value_prop)
  const newPhase = promotePhaseFromSlots(intentPhase, slots, state.flags);

  // ── Step 6: Rule Engine — lọc scripts ──
  const candidateScripts = filterCandidateScripts(scriptData, newPhase, state);

  // ── Step 7: TF-IDF rank trên tập nhỏ ──
  const { script: bestScript, score: scriptScore } = rankScriptsV2(candidateScripts, allWords);

  // ── Step 8: Script Expansion ──
  const rawContent = bestScript?.content ?? '';
  const scriptContent = rawContent ? expandScriptContent(rawContent, slots) : '';

  // ── Step 9: FAQ Injection ──
  // Bỏ qua injection khi: script match rất tốt (score > 12) HOẶC script là câu hỏi ngắn (< 120 ký tự, kết thúc '?')
  const isQualifyingQuestion = scriptContent.trim().length < 120 && scriptContent.trim().endsWith('?');
  const skipInjection = (bestScript && scriptScore > 12) || isQualifyingQuestion;
  const injectedFaq = skipInjection ? null : injectFaqV2(faqData, intent, service, allWords, state);

  // ── Step 10: Business Rules ──
  const businessAction = applyBusinessRulesV2(intent, newPhase, state.flags);

  // ── Step 11: Response Builder ──
  let text: string;
  let mainFaqId: string | number | null = null;

  if (FAQ_PRIMARY_INTENTS.includes(intent) && injectedFaq?.answer) {
    // Câu hỏi factual → FAQ trả lời chính xác hơn script
    text = injectedFaq.answer;
    mainFaqId = injectedFaq.id;
    if (businessAction.appendFOMO) {
      text += '\n\n🔥 Lịch tháng này đang được đặt nhanh lắm em ơi! 💕';
    }
    if (businessAction.appendDepositCTA) {
      text += '\n\n💳 Đặt cọc 1.000.000đ:\n➡️ MB Bank: 9098688688888 – NGUYEN THU THUY\nGhi nội dung: [Tên] cọc chụp ảnh';
    }
  } else {
    text = buildResponseV2(scriptContent, injectedFaq, businessAction);
  }

  // Giới hạn độ dài
  if (text.length > 680) text = text.slice(0, 680) + '...';

  // ── Step 12: Update State ──
  const leadScoreAdd = INTENT_LEAD_SCORES[intent] ?? 0;
  const injFaqId = injectedFaq ? String(injectedFaq.id) : null;

  const newState: ConversationStateV2 = {
    ...state,
    turnCount: state.turnCount + 1,
    currentPhase: newPhase,
    lastIntent: intent,
    slots,
    sentScriptIds: bestScript && !FAQ_PRIMARY_INTENTS.includes(intent)
      ? [...state.sentScriptIds, bestScript.id]
      : state.sentScriptIds,
    sentFaqIds: injFaqId
      ? [...state.sentFaqIds, injFaqId]
      : state.sentFaqIds,
    flags: {
      hasSentFOMO:    state.flags.hasSentFOMO    || businessAction.appendFOMO,
      hasSentCombo:   state.flags.hasSentCombo   || (newPhase === 'value_prop' && !!bestScript),
      hasSentUSP:     state.flags.hasSentUSP     || (bestScript?.phase === 'value_prop'),
      hasSentPricing: state.flags.hasSentPricing || intent === 'pricing',
    },
    leadScore: state.leadScore + leadScoreAdd,
    // Giữ nguyên scenario state khi không ở trong scenario
    activeScenarioId: state.activeScenarioId,
    activeScenarioStep: state.activeScenarioStep,
  };

  const quickReplies = PHASE_QUICK_REPLIES[newPhase] ?? getQuickReplies(service);

  return {
    text,
    newState,
    quickReplies,
    nextQuestion: bestScript?.next_question ?? null,
    leadScoreAdd,
    faqId: mainFaqId,
    handoffTrigger: businessAction.isHandoff,
    debug: {
      intent,
      intentConfidence: Math.round(confidence * 100) / 100,
      detectedService: service,
      selectedPhase: newPhase,
      scriptId: bestScript?.id ?? null,
      scriptTitle: bestScript?.title ?? null,
      scriptScore: Math.round(scriptScore * 10) / 10,
      candidateScriptCount: candidateScripts.length,
      injectedFaqId: injFaqId,
      injectedFaqTitle: injectedFaq?.question ?? null,
      businessRulesFired: businessAction.rulesFired,
      slotsFilledThisTurn,
    },
    scenarioAutoSteps: [],
    scenarioMainImageUrl: undefined,
  };
}
