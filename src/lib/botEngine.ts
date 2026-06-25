// H2O Smart Bot Engine — Intent + Phase + Keyword Matching
// Không cần AI API, hoạt động 100% trên frontend

// ── Từ điển viết tắt tiếng Việt phổ biến trong chat ─────────────────────────

const ABBREVIATIONS: Record<string, string> = {
  bn: 'bao nhiêu', bnh: 'bao nhiêu', bnn: 'bao nhiêu',
  mk: 'makeup', mukep: 'makeup', mke: 'makeup', makup: 'makeup',
  k: 'không', ko: 'không', kk: 'không', khong: 'không',
  dc: 'được', đc: 'được', đk: 'được',
  vs: 'với', cx: 'cũng', ck: 'chú rể', cd: 'cô dâu',
  sdt: 'số điện thoại', đt: 'điện thoại', ddt: 'điện thoại',
  uk: 'oke', ok: 'được', oke: 'được',
  saiz: 'size', saizz: 'size', bigsize: 'size lớn', sz: 'size',
  ntn: 'như thế nào', nse: 'như thế nào',
  sv: 'studio', ht: 'hỗ trợ', ct: 'chi tiết', tt: 'thông tin',
  r: 'rồi', rr: 'rồi', xog: 'xong', xg: 'xong',
  qc: 'quảng cáo', km: 'khuyến mãi',
  ng: 'ngày', t: 'tháng', nam: 'năm',
  ad: 'admin', mng: 'mọi người',
  a: 'anh', e: 'em', c: 'chị', b: 'bạn',
};

// ── Bảng đồng nghĩa cụm từ — chuẩn hóa trước khi so khớp ───────────────────
// Cụm dài trước để tránh partial match; áp dụng SAU normalizeVietnamese
const SYNONYM_MAP: [string, string][] = [
  ['chi phí chụp', 'giá chụp'],
  ['tiền cọc',     'đặt cọc'],
  ['cọc trước',    'đặt cọc'],
  ['tiền đặt',     'đặt cọc'],
  ['đặt trước',    'đặt cọc'],
  ['giữ lịch',     'đặt lịch'],
  ['giữ ngày',     'đặt lịch'],
  ['hẹn ngày',     'đặt lịch'],
  ['chụp hình',    'chụp ảnh'],
  ['hình cưới',    'ảnh cưới'],
  ['bộ hình',      'bộ ảnh'],
  ['mấy tiếng',    'bao lâu'],
  ['mấy giờ',      'bao lâu'],
  ['lâu không',    'bao lâu'],
  ['người mập',    'size lớn'],
  ['cô dâu mập',   'size lớn'],
  ['người béo',    'size lớn'],
  ['nặng cân',     'size lớn'],
  ['đổi ngày',     'đổi lịch'],
  ['dời lịch',     'đổi lịch'],
  ['dời ngày',     'đổi lịch'],
  ['số tài khoản', 'tài khoản'],
  ['chuyển tiền',  'chuyển khoản'],
  ['chi phí',      'giá'],
  ['mấy tiền',     'bao nhiêu'],
  ['giá tiền',     'giá'],
];

// ── Service types — loại dịch vụ ─────────────────────────────────────────────

const SERVICE_KEYWORDS: Record<string, string[]> = {
  anh_cuoi: [
    'ảnh cưới', 'chụp cưới', 'hình cưới', 'chụp ảnh cưới', 'chụp hình cưới',
    'album cưới', 'phóng sự cưới', 'chụp ngày cưới', 'ảnh phóng sự cưới',
    'bộ ảnh cưới', 'chụp đám cưới',
  ],
  vay_cuoi: [
    'váy cưới', 'thuê váy', 'áo cưới', 'đầm cưới', 'mướn váy', 'thuê đầm',
    'mượn váy', 'váy cô dâu', 'áo cưới cô dâu', 'cho thuê váy',
  ],
  makeup: [
    'makeup cô dâu', 'trang điểm cô dâu', 'trang điểm cưới', 'làm đẹp cô dâu',
    'tóc cô dâu', 'kiểu tóc cưới', 'makeup cưới', 'makeup ngày cưới',
    'làm tóc cô dâu',
  ],
  ao_dai: ['áo dài cưới', 'áo dài cô dâu', 'thuê áo dài cưới'],
  quay_phim: [
    'quay phim cưới', 'video đám cưới', 'quay video cưới', 'quay phim ngày cưới',
    'quay chụp ngày cưới',
  ],
};

// ── Sales phase keywords — giai đoạn bán hàng ────────────────────────────────

const PHASE_KEYWORDS: Record<string, string[]> = {
  pricing: [
    'giá', 'chi phí', 'tiền', 'bao nhiêu', 'phí', 'bảng giá', 'báo giá',
    'mấy tiền', 'giá tiền', 'giá cả', 'gói bao nhiêu', 'giá gói',
  ],
  booking: [
    'đặt lịch', 'giữ lịch', 'đặt ngày', 'book', 'còn lịch', 'lịch chụp',
    'còn slot', 'đặt chỗ', 'muốn đặt', 'hẹn ngày', 'ngày nào trống',
  ],
  deposit: [
    'đặt cọc', 'cọc', 'tiền cọc', 'chuyển khoản', 'thanh toán', 'đặt trước',
    'tiền đặt', 'cọc trước', 'pay', 'tài khoản ngân hàng',
  ],
  after_sale: [
    'nhận ảnh', 'chọn ảnh', 'khi nào có ảnh', 'bao lâu có ảnh', 'giao ảnh',
    'ra ảnh', 'bao lâu xong', 'khi nào xong', 'nhận bộ ảnh', 'chọn hình',
  ],
  complaint: [
    'không hài lòng', 'góp ý', 'phàn nàn', 'thất vọng', 'chưa đẹp',
    'khiếu nại', 'sai hẹn', 'chậm trễ',
  ],
  benefit: [
    'bao gồm', 'có gì', 'trong gói', 'quyền lợi', 'gồm những gì', 'kèm gì',
    'dịch vụ gồm', 'bao gồm gì', 'được gì',
  ],
  objection: [
    'lo lắng', 'băn khoăn', 'chưa chắc', 'cân nhắc', 'suy nghĩ thêm',
    'để hỏi thêm', 'bàn với', 'hỏi lại sau',
  ],
  consult: [
    'tư vấn', 'muốn biết', 'thông tin', 'tham khảo', 'hỏi về', 'hỏi thêm',
    'xem thử', 'giới thiệu', 'cho biết',
  ],
};

// ── Lead score tích lũy theo phase ───────────────────────────────────────────

export const PHASE_LEAD_SCORES: Record<string, number> = {
  consult: 10, pricing: 20, benefit: 15,
  booking: 40, deposit: 80, objection: 5,
  followup: 10, after_sale: 5, complaint: -10,
};

// ── Quick replies gợi ý theo service type ────────────────────────────────────

export const QUICK_REPLIES_MAP: Record<string, string[]> = {
  anh_cuoi: ['📸 Xem bảng giá', '📅 Muốn đặt lịch', '🎨 Xem concept'],
  vay_cuoi: ['💰 Giá thuê váy?', '📏 Hỏi về size', '📅 Thử váy khi nào?'],
  makeup: ['💄 Giá makeup?', '📸 Xem ảnh mẫu', '📅 Đặt lịch makeup'],
  ao_dai: ['👘 Xem mẫu áo dài', '💰 Bảng giá', '📅 Đặt lịch'],
  quay_phim: ['🎥 Giá quay phim?', '📅 Đặt lịch', '📸 Xem clip mẫu'],
  default: ['📸 Ảnh cưới', '👗 Váy cưới', '💄 Makeup & tóc'],
};

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface BotContext {
  serviceType: string | null;
  phase: string | null;
  leadScore: number;
}

export interface AnyFaq {
  id: string | number;
  question: string;
  answer: string;
  tags?: string[] | null;
  usage_count?: number;
  keywords?: string[] | null;
  next_question?: string | null;
  lead_score?: number | null;
  service_type?: string | null;
  handoff_trigger?: boolean | null;
  category?: string;
}

export interface BotMatchResult {
  type: 'answer' | 'clarify' | 'fallback';
  score: number;
  answer: string;
  nextQuestion: string | null;
  leadScoreAdd: number;
  handoffTrigger: boolean;
  serviceType: string | null;
  phase: string | null;
  faqId: string | number | null;
  quickReplies: string[];
}

// ── Core functions ────────────────────────────────────────────────────────────

// Tầng 1: Chuẩn hóa văn bản — viết thường + thay thế viết tắt
export function normalizeVietnamese(text: string): string {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const normalized = words.map(word => {
    const plain = word.replace(/[^a-z]/gi, '');
    return ABBREVIATIONS[word] || ABBREVIATIONS[plain] || word;
  });
  return normalized.join(' ').replace(/\s+/g, ' ').trim();
}

// Áp dụng synonym map lên chuỗi đã normalize — thay cụm từ đồng nghĩa về dạng chuẩn
export function expandSynonyms(text: string): string {
  let result = text;
  for (const [from, to] of SYNONYM_MAP) {
    if (result.includes(from)) result = result.split(from).join(to);
  }
  return result;
}

// Tầng 2: Nhận diện loại dịch vụ
export function detectServiceType(normalizedMsg: string): string | null {
  for (const [stype, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some(kw => normalizedMsg.includes(kw))) return stype;
  }
  return null;
}

// Tầng 3: Nhận diện giai đoạn bán hàng
export function detectPhase(normalizedMsg: string): string | null {
  for (const [phase, keywords] of Object.entries(PHASE_KEYWORDS)) {
    if (keywords.some(kw => normalizedMsg.includes(kw))) return phase;
  }
  return null;
}

// Lấy quick replies theo service type
export function getQuickReplies(serviceType: string | null): string[] {
  return QUICK_REPLIES_MAP[serviceType ?? 'default'] ?? QUICK_REPLIES_MAP.default;
}

// Tầng 4: Tính điểm khớp keyword —
// FAQ có keywords[] (mới): tính % keyword xuất hiện trong câu hỏi khách
// FAQ không có keywords (cũ): tính overlap từ trong câu hỏi đã lưu
// expandedWordSet: union từ expandQuery + synonym expansion để match từng từ riêng lẻ
function scoreKeywords(
  normalizedMsg: string,
  expandedWordSet: Set<string>,
  keywords: string[],
): number {
  if (!keywords || keywords.length === 0) return 0;
  const matched = keywords.filter(kw => {
    const normKw = normalizeVietnamese(kw.toLowerCase());
    // Pass 1: khớp cụm từ nguyên vẹn (sau synonym expansion)
    if (normalizedMsg.includes(normKw)) return true;
    // Pass 2: mọi từ trong keyword đều có trong expanded word set
    const kwWords = normKw.split(/\s+/).filter(w => w.length >= 2);
    return kwWords.length > 0 && kwWords.every(w => expandedWordSet.has(w));
  }).length;
  return matched / keywords.length;
}

function scoreQuestionOverlap(expandedWords: string[], faqQuestion: string): number {
  const qNorm = normalizeVietnamese(faqQuestion);
  const qWords = qNorm.split(/\s+/).filter(w => w.length >= 2);
  if (qWords.length === 0) return 0;
  const matched = qWords.filter(qw =>
    expandedWords.some(ew => ew.includes(qw) || qw.includes(ew))
  ).length;
  return matched / qWords.length;
}

// Tầng 5: Main matching — trả về kết quả tốt nhất + bước tiếp theo
export function matchBotFaq(
  normalizedMsg: string,
  expandedWords: string[],
  faqs: AnyFaq[],
  context: BotContext,
): BotMatchResult {
  const detectedService = detectServiceType(normalizedMsg) ?? context.serviceType;
  const detectedPhase = detectPhase(normalizedMsg) ?? context.phase;

  // Synonym expansion: "tiền cọc" → "đặt cọc", "chụp hình" → "chụp ảnh", v.v.
  const msgForScoring = expandSynonyms(normalizedMsg);
  // Union từ expandQuery (synonyms.ts) + từ trong chuỗi đã expand → tập từ đầy đủ nhất
  const expandedWordSet = new Set<string>([
    ...expandedWords,
    ...msgForScoring.split(/\s+/).filter(w => w.length >= 2),
  ]);

  const scored = faqs.map(faq => {
    let score: number;

    if (faq.keywords && faq.keywords.length > 0) {
      score = scoreKeywords(msgForScoring, expandedWordSet, faq.keywords);
      if (score < 0.3 && faq.tags && faq.tags.length > 0) {
        score = Math.max(score, scoreKeywords(msgForScoring, expandedWordSet, faq.tags) * 0.75);
      }
    } else {
      score = scoreQuestionOverlap(Array.from(expandedWordSet), faq.question);
      if (score < 0.3 && faq.tags && faq.tags.length > 0) {
        score = Math.max(score, scoreKeywords(msgForScoring, expandedWordSet, faq.tags) * 0.65);
      }
    }

    // Context boost: cùng service_type → ưu tiên cao hơn
    if (faq.service_type && faq.service_type === detectedService) score *= 1.25;
    // Context boost: cùng phase/category
    if (faq.category && faq.category === detectedPhase) score *= 1.15;

    return { faq, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const leadScoreAdd = PHASE_LEAD_SCORES[detectedPhase ?? ''] ?? 0;
  const quickReplies = getQuickReplies(detectedService);

  const fallback: BotMatchResult = {
    type: 'fallback', score: 0, answer: '', nextQuestion: null,
    leadScoreAdd, handoffTrigger: false,
    serviceType: detectedService, phase: detectedPhase, faqId: null, quickReplies,
  };

  if (!best || best.score < 0.2) return fallback;

  // Confident match ≥ 50%: trả lời ngay
  if (best.score >= 0.5) {
    return {
      type: 'answer', score: best.score,
      answer: best.faq.answer,
      nextQuestion: best.faq.next_question ?? null,
      leadScoreAdd: leadScoreAdd + (best.faq.lead_score ?? 0),
      handoffTrigger: best.faq.handoff_trigger ?? false,
      serviceType: best.faq.service_type ?? detectedService,
      phase: detectedPhase, faqId: best.faq.id, quickReplies,
    };
  }

  // Semi-match 20–49%: hỏi lại để rõ hơn
  const top2 = scored.filter(s => s.score >= 0.2).slice(0, 2);
  if (top2.length >= 2) {
    const opt1 = top2[0].faq.question;
    const opt2 = top2[1].faq.question;
    return {
      type: 'clarify', score: best.score,
      answer: `Ý em đang muốn hỏi về:\n• ${opt1}\n• ${opt2}\n\nEm muốn biết điều nào ạ? 😊`,
      nextQuestion: null, leadScoreAdd,
      handoffTrigger: false, serviceType: detectedService, phase: detectedPhase, faqId: null,
      quickReplies: [
        opt1.length > 42 ? opt1.slice(0, 40) + '...' : opt1,
        opt2.length > 42 ? opt2.slice(0, 40) + '...' : opt2,
      ],
    };
  }

  // Single semi-match: trả lời với độ tự tin thấp
  return {
    type: 'answer', score: best.score,
    answer: best.faq.answer,
    nextQuestion: best.faq.next_question ?? null,
    leadScoreAdd: leadScoreAdd + (best.faq.lead_score ?? 0),
    handoffTrigger: best.faq.handoff_trigger ?? false,
    serviceType: best.faq.service_type ?? detectedService,
    phase: detectedPhase, faqId: best.faq.id, quickReplies,
  };
}
