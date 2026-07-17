// Vercel serverless function — Bot V3 Gemini synthesis từ top FAQs
import { GoogleGenAI } from "@google/genai";
import { checkRateLimit, getClientIp } from './_security';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 20 req/min/IP
  const ip = getClientIp(req);
  if (!checkRateLimit(`vector-synthesis:${ip}`, 20)) {
    return res.status(429).json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 1 phút' });
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
    return res.status(500).json({ error: 'Lỗi synthesis' });
  }
}
