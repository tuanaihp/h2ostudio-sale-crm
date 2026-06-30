// Auto-save Q&A pairs từ hội thoại thực tế vào kho FAQ (is_approved: false)
// Dùng chung cho: bot reply (tất cả tier) + admin manual reply

import { supabase } from '../supabase';

// Câu quá ngắn hoặc chitchat → không lưu
const SKIP_PATTERNS = [
  /^(ok|oke|okay|thks|thanks|cảm ơn|cảm on|cam on|dạ|da|vâng|vang|ừ|u|uh|hiểu rồi|hieu roi|bye|hi|hello|chào|chao|xin chào|ha|haha|ah|ồ|ừm|hmm|👍|❤️|😊|😘)$/i,
];

const MIN_QUESTION_LEN = 8;  // ký tự tối thiểu cho câu hỏi
const MIN_ANSWER_LEN   = 15; // ký tự tối thiểu cho câu trả lời

function isChitchat(text: string): boolean {
  const t = text.trim().toLowerCase();
  return SKIP_PATTERNS.some(p => p.test(t));
}

function cleanAnswer(text: string): string {
  // Bỏ phần fallback CTA chứa zalo/hotline nếu không muốn lưu vào FAQ
  // Giữ nguyên nội dung thực tế
  return text.trim();
}

function detectCategory(question: string): string {
  const q = question.toLowerCase();
  if (/giá|phí|tiền|bao nhiêu|bảng giá|báo giá|chi phí/.test(q)) return 'closing';
  if (/bao gồm|có gì|trong gói|quyền lợi|gồm gì|được gì/.test(q)) return 'value_prop';
  if (/đặt lịch|giữ lịch|còn lịch|ngày trống|tháng mấy/.test(q)) return 'fomo';
  if (/đặt cọc|cọc|chuyển khoản|thanh toán/.test(q)) return 'closing';
  if (/ở đâu|địa chỉ|vị trí|tìm đến/.test(q)) return 'khac';
  if (/hủy|đổi lịch|hoàn tiền/.test(q)) return 'faq';
  return 'khac';
}

/**
 * Tự động lưu cặp Q&A vào kho customer_faqs.
 * - is_approved: false → cần admin duyệt trong tab "Chưa trả lời"
 * - Bỏ qua nếu câu quá ngắn, chitchat, hoặc câu hỏi đã tồn tại gần giống
 * - source: 'from_chat_live' để phân biệt với FAQ tự thêm
 */
export async function autoSaveFaqPair(params: {
  question: string;
  answer: string;
  sessionId?: string;
}): Promise<void> {
  const { question, answer, sessionId } = params;

  const q = question.trim();
  const a = cleanAnswer(answer);

  // Bỏ qua nếu quá ngắn hoặc chitchat
  if (q.length < MIN_QUESTION_LEN) return;
  if (a.length < MIN_ANSWER_LEN) return;
  if (isChitchat(q)) return;

  // Bỏ qua nếu là fallback message không có thông tin thực
  if (a.includes('để lại số điện thoại') && a.length < 120) return;

  try {
    // Kiểm tra trùng: so sánh 40 ký tự đầu câu hỏi (case-insensitive)
    const prefix = q.substring(0, 40).replace(/[%_]/g, '\\$&'); // escape for LIKE
    const { data: existing } = await supabase
      .from('customer_faqs')
      .select('id, answer')
      .ilike('question', `${prefix}%`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Nếu đã có câu hỏi nhưng câu trả lời còn trống → cập nhật answer
      if (!existing.answer || existing.answer.trim().length < MIN_ANSWER_LEN) {
        await supabase.from('customer_faqs')
          .update({ answer: a, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
      // Đã có đủ Q&A → bỏ qua
      return;
    }

    // Chèn mới
    await supabase.from('customer_faqs').insert({
      id: crypto.randomUUID(),
      question: q,
      answer: a,
      category: detectCategory(q),
      tags: [],
      keywords: [],
      source: 'from_chat_live',
      is_approved: false,
      usage_count: 0,
      ...(sessionId ? { session_id: sessionId } : {}),
      created_at: new Date().toISOString(),
    });
  } catch {
    // Silent fail — không được để crash chat chính
  }
}
