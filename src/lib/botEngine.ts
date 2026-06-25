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
  // Giá cả
  ['chi phí chụp',      'giá chụp'],
  ['chi phí',           'giá'],
  ['mấy tiền',          'bao nhiêu'],
  ['giá tiền',          'giá'],
  ['học phí',           'giá'],
  // Đặt cọc
  ['tiền cọc',          'đặt cọc'],
  ['cọc trước',         'đặt cọc'],
  ['tiền đặt',          'đặt cọc'],
  ['đặt trước',         'đặt cọc'],
  ['trả trước',         'đặt cọc'],
  // Đặt lịch
  ['giữ lịch',          'đặt lịch'],
  ['giữ ngày',          'đặt lịch'],
  ['hẹn ngày',          'đặt lịch'],
  ['đặt hẹn',          'đặt lịch'],
  ['book ngày',         'đặt lịch'],
  // Ảnh / hình
  ['chụp hình',         'chụp ảnh'],
  ['hình cưới',         'ảnh cưới'],
  ['bộ hình',           'bộ ảnh'],
  ['tấm hình',          'tấm ảnh'],
  // Thời gian
  ['mấy tiếng',         'bao lâu'],
  ['mấy giờ',           'bao lâu'],
  ['mấy ngày',          'bao lâu'],
  ['lâu không',         'bao lâu'],
  ['nhanh không',       'bao lâu'],
  // Ngoại hình — body type (upgrade 1)
  ['cô dâu béo',        'size lớn'],
  ['cô dâu mập',        'size lớn'],
  ['người mập',         'size lớn'],
  ['người béo',         'size lớn'],
  ['nặng cân',          'size lớn'],
  ['cân nặng lớn',      'size lớn'],
  ['người gầy',         'size nhỏ'],
  ['cô dâu gầy',        'size nhỏ'],
  ['dáng nhỏ',          'size nhỏ'],
  ['người thấp',        'size nhỏ'],
  // Từ đơn ngoại hình — đứng cuối để không chặn phrase trên
  ['béo',               'mập'],
  ['gầy',               'size nhỏ'],
  // Hủy / đổi lịch
  ['đổi ngày',          'đổi lịch'],
  ['dời lịch',          'đổi lịch'],
  ['dời ngày',          'đổi lịch'],
  ['hủy bỏ',            'hủy lịch'],
  ['không đi nữa',      'hủy lịch'],
  // Thanh toán
  ['số tài khoản',      'tài khoản'],
  ['chuyển tiền',       'chuyển khoản'],
  ['momo',              'chuyển khoản'],
  ['vnpay',             'chuyển khoản'],
  ['banking',           'chuyển khoản'],
  ['internet banking',  'chuyển khoản'],
  // Liên hệ
  ['nhắn tin zalo',     'liên hệ'],
  ['inbox',             'liên hệ'],
  ['nhắn fb',           'liên hệ'],
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

// ── Stop words — từ phổ thông không có giá trị phân biệt FAQ ────────────────
const STOP_WORDS = new Set([
  'có', 'không', 'ạ', 'và', 'hoặc', 'hay', 'thì', 'là', 'của', 'cho', 'với',
  'về', 'được', 'đã', 'sẽ', 'bị', 'các', 'những', 'này', 'đó', 'khi', 'nếu',
  'mà', 'nhưng', 'vì', 'do', 'từ', 'tại', 'ra', 'vào', 'lên', 'xuống',
  'ở', 'đến', 'qua', 'lại', 'cũng', 'rồi', 'thôi', 'nha', 'nhé', 'đây',
  'bên', 'mình', 'em', 'anh', 'chị', 'bạn', 'tôi', 'ơi', 'à', 'ừ', 'cơ',
]);

// Trọng số tự động: cụm nhiều từ = đặc thù hơn = điểm cao hơn
function getKeywordWeight(kw: string): number {
  const norm = normalizeVietnamese(kw.toLowerCase()).trim();
  if (STOP_WORDS.has(norm) || norm.length <= 2) return 0;
  const wordCount = norm.split(/\s+/).filter(w => w.length >= 2).length;
  if (wordCount >= 3) return 2.0;  // "chụp ảnh cưới studio" → rất đặc thù
  if (wordCount === 2) return 1.5;  // "đặt cọc" → đặc thù vừa
  return 1.0;                       // "giá" → bình thường
}

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

// Chuẩn hóa số đo cơ thể — chạy TRƯỚC khi so khớp keyword (upgrade 2)
function normalizeBodyNumbers(text: string): string {
  return text
    .replace(/\b\d+\s*kg\b/gi, 'cân nặng')       // "80kg", "70 kg" → "cân nặng"
    .replace(/\b\d+\s*cm\b/gi, 'chiều cao')       // "155cm", "160 cm" → "chiều cao"
    .replace(/\b1m\d{2}\b/gi, 'chiều cao')        // "1m55", "1m60" → "chiều cao"
    .replace(/\b1[.,]\d{2}\s*m\b/gi, 'chiều cao') // "1.55m", "1,60m" → "chiều cao"
    .replace(/\b\d+\s*lbs\b/gi, 'cân nặng');      // "180lbs" → "cân nặng"
}

// Tầng 1: Chuẩn hóa văn bản — viết thường + thay thế viết tắt + số đo
export function normalizeVietnamese(text: string): string {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const normalized = words.map(word => {
    const plain = word.replace(/[^a-z]/gi, '');
    return ABBREVIATIONS[word] || ABBREVIATIONS[plain] || word;
  });
  const joined = normalized.join(' ').replace(/\s+/g, ' ').trim();
  return normalizeBodyNumbers(joined);
}

// Áp dụng synonym map lên chuỗi đã normalize — thay cụm từ đồng nghĩa về dạng chuẩn
export function expandSynonyms(text: string): string {
  let result = text;
  for (const [from, to] of SYNONYM_MAP) {
    if (result.includes(from)) result = result.split(from).join(to);
  }
  return result;
}

// Tầng 2a: Nhận diện loại dịch vụ — exact phrase match
export function detectServiceType(normalizedMsg: string): string | null {
  for (const [stype, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some(kw => normalizedMsg.includes(kw))) return stype;
  }
  return null;
}

// Tầng 2b: Nhận diện dịch vụ lỏng — khi exact match thất bại (upgrade 3)
// Dùng word set thay vì cụm từ nguyên vẹn → bắt được "sv có chụp ko", "e cần thuê váy"
function detectServiceTypeLoose(wordSet: Set<string>): string | null {
  const hasPhoto   = wordSet.has('chụp') || wordSet.has('ảnh') || wordSet.has('hình') || wordSet.has('album');
  const hasWedding = wordSet.has('cưới') || wordSet.has('lễ cưới') || wordSet.has('ngày cưới');
  const hasDress   = wordSet.has('váy') || wordSet.has('đầm') || wordSet.has('áo cưới');
  const hasMakeup  = wordSet.has('makeup') || wordSet.has('trang điểm') || wordSet.has('tóc');
  const hasVideo   = wordSet.has('quay') || wordSet.has('video') || wordSet.has('phim');
  const hasAoDai   = wordSet.has('áo') && wordSet.has('dài');

  if (hasAoDai) return 'ao_dai';
  if (hasDress) return 'vay_cuoi';
  if (hasMakeup && !hasPhoto) return 'makeup';
  if (hasVideo && hasWedding) return 'quay_phim';
  if (hasPhoto) return 'anh_cuoi';
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

// Tầng 4: Tính điểm khớp keyword với trọng số (Weighted Keyword Matching)
// - Stop word → bỏ qua (weight 0)
// - Cụm 3+ từ → weight 2.0 (rất đặc thù)
// - Cụm 2 từ → weight 1.5
// - Từ đơn → weight 1.0
// - Pass 1: phrase match; Pass 2: word-set fallback
function scoreKeywords(
  normalizedMsg: string,
  expandedWordSet: Set<string>,
  keywords: string[],
): number {
  if (!keywords || keywords.length === 0) return 0;
  let totalWeight = 0;
  let matchedWeight = 0;
  for (const kw of keywords) {
    const weight = getKeywordWeight(kw);
    if (weight === 0) continue;
    totalWeight += weight;
    const normKw = normalizeVietnamese(kw.toLowerCase());
    const isMatch = normalizedMsg.includes(normKw) || (() => {
      const kwWords = normKw.split(/\s+/).filter(w => w.length >= 2);
      return kwWords.length > 0 && kwWords.every(w => expandedWordSet.has(w));
    })();
    if (isMatch) matchedWeight += weight;
  }
  return totalWeight === 0 ? 0 : matchedWeight / totalWeight;
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
  // Bước expand trước — cần expandedWordSet cho detectServiceTypeLoose (upgrade 3)
  const msgForScoring = expandSynonyms(normalizedMsg);
  const expandedWordSet = new Set<string>([
    ...expandedWords,
    ...msgForScoring.split(/\s+/).filter(w => w.length >= 2),
  ]);

  // Nhận diện dịch vụ: exact → exact-on-expanded → loose word-set → context memory
  const detectedService =
    detectServiceType(normalizedMsg) ??
    detectServiceType(msgForScoring) ??
    detectServiceTypeLoose(expandedWordSet) ??
    context.serviceType;
  const detectedPhase = detectPhase(normalizedMsg) ?? context.phase;

  const scored = faqs.map(faq => {
    let score: number;

    if (faq.keywords && faq.keywords.length > 0) {
      score = scoreKeywords(msgForScoring, expandedWordSet, faq.keywords);
      if (score < 0.3 && faq.tags && faq.tags.length > 0) {
        score = Math.max(score, scoreKeywords(msgForScoring, expandedWordSet, faq.tags) * 0.75);
      }
    } else {
      // No keywords → score=0, defer to Fuse.js (scoreQuestionOverlap cho false positive vì synonym expansion quá rộng)
      score = 0;
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

// ── Multi-Intent Detection (Upgrade 3) ───────────────────────────────────────
// Tách một tin nhắn nhiều câu hỏi thành các segment độc lập.
// Trả về mảng >= 2 phần tử nếu phát hiện nhiều intent, ngược lại [message] nguyên.
const MULTI_INTENT_SPLITTER = new RegExp(
  [
    '[?！]',                                                           // dấu hỏi
    ',\\s*(?=bao nhiêu|bao lâu|có |chụp|thuê|giá|khi nào|ở đâu|như thế nào|cần|muốn|hết bao|được không|còn lịch)',
    '\\s+(?:và|còn|thêm nữa|ngoài ra)\\s+(?=bao|có |chụp|thuê|giá|khi|ở đâu)',
  ].join('|'),
  'i',
);

export function splitIntents(message: string): string[] {
  const segments = message
    .split(MULTI_INTENT_SPLITTER)
    .map(s => s.trim())
    .filter(s => s.length >= 6);
  return segments.length >= 2 ? segments : [message.trim()];
}
