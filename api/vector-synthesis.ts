// Vercel serverless function — Bot V3 Gemini synthesis từ top FAQs
// Mirrors /api/vector-synthesis trong server.ts (local dev Express)

import { GoogleGenAI } from "@google/genai";

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 synthesis calls per IP per minute

function getRateLimitKey(req: any): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getRateLimitKey(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau' });
  }

  try {
    const { question, faqs, studioInfo, knowledgeContext } = req.body;
    if (!question || !Array.isArray(faqs) || !faqs.length) {
      return res.status(400).json({ error: 'Missing question or faqs' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Thiếu GEMINI_API_KEY' });
    }

    const context = faqs.slice(0, 5).map((f: any, i: number) =>
      `[${i + 1}] Câu hỏi: ${f.question}\n    Trả lời: ${f.answer}`
    ).join('\n\n');

    const systemInstruction = `Bạn là tư vấn viên của H2O Studio — studio chụp ảnh cưới chuyên nghiệp.
Xưng "em", gọi khách là "anh/chị". Trả lời tự nhiên, thân thiện, ngắn gọn (2–4 câu).
Chỉ dùng thông tin từ tài liệu đã cho, không bịa đặt giá hoặc thông tin chưa có.
Nếu câu hỏi hoàn toàn ngoài phạm vi: "Anh/chị để lại SĐT để tư vấn viên gọi lại chi tiết nhé ạ".
Không nhắc bạn là AI hay bot.${studioInfo ? `\n\nThông tin studio:\n${studioInfo}` : ''}${knowledgeContext ? `\n\n${knowledgeContext}` : ''}`;

    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: `Tài liệu tham khảo:\n${context}\n\nCâu hỏi của khách: ${question}` }] }],
      config: { systemInstruction, temperature: 0.3, maxOutputTokens: 400 },
    });

    return res.json({ text: response.text || '' });
  } catch (err: any) {
    console.error('Vector synthesis error:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi synthesis' });
  }
}
