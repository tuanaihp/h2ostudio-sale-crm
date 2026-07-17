// Bot Tầng 2: LLM với kịch bản + khuyến mãi đang chạy làm context
import { checkRateLimit, getClientIp, validateExternalUrl } from './_security';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  // Rate limit: 20 req/min/IP
  const ip = getClientIp(req);
  if (!checkRateLimit(`live-chat-bot:${ip}`, 20)) {
    return res.status(429).json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 1 phút' });
  }

  const { message, stage, scripts, faqs, history, integrationConfig, activePromos, customInstructions, blockedTopics, studioInfo, paymentInfo, knowledgeContext } = req.body || {};

  // SSRF guard: validate chatApiUrl trước khi server gọi ra ngoài
  if (integrationConfig?.chatApiEnabled && integrationConfig?.chatApiUrl) {
    const check = validateExternalUrl(integrationConfig.chatApiUrl);
    if (!check.ok) {
      return res.status(400).json({ error: `Chat API URL không hợp lệ: ${check.reason}` });
    }
  }

  const scriptsText = (scripts || []).slice(0, 12)
    .map((s: any) => `## ${s.title} [${s.phase}]\n${s.content}`)
    .join('\n\n---\n\n');

  const faqsText = (faqs || []).slice(0, 30)
    .filter((f: any) => f.question && f.answer)
    .map((f: any) => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  let promoContext = '';
  if (activePromos && activePromos.length > 0) {
    const promoLines = activePromos.map((p: any) => {
      const endDate = new Date(p.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      return `${p.emoji} ${p.title}: ${p.short_desc} (hết hạn ${endDate})`;
    }).join('\n');
    promoContext = `\n\nƯU ĐÃI ĐANG CHẠY (nhắc khi khách hỏi giá/ưu đãi):\n${promoLines}`;
  }

  const systemInstruction = `Bạn là tư vấn viên của H2O Studio, chuyên tư vấn chụp ảnh cưới.
Giai đoạn hiện tại: ${stage || 'new'}

KỊCH BẢN TƯ VẤN:
${scriptsText || 'Chào khách, hỏi nhu cầu và tư vấn nhiệt tình.'}${promoContext}
${faqsText ? `\nCÂU HỎI THỰC TẾ KHÁCH HAY HỎI (khi khách hỏi câu tương tự, ưu tiên dùng câu trả lời này):\n${faqsText}\n` : ''}${knowledgeContext ? `\nKIẾN THỨC VỀ DOANH NGHIỆP (dùng khi khách hỏi):\n${knowledgeContext}\n` : ''}${studioInfo ? `\nTHÔNG TIN STUDIO:\n${studioInfo}\n` : ''}${paymentInfo ? `\nTHÔNG TIN THANH TOÁN:\n${paymentInfo}\n` : ''}${customInstructions ? `\nHƯỚNG DẪN THÊM:\n${customInstructions}\n` : ''}${blockedTopics ? `\nCHỦ ĐỀ KHÔNG TƯ VẤN (từ chối lịch sự):\n${blockedTopics}\n` : ''}
QUY TẮC QUAN TRỌNG:
- Xưng "em", gọi khách là "anh/chị"
- Trả lời ngắn gọn, tự nhiên (2-3 câu), không rườm rà
- Bám sát kịch bản, không bịa giá hoặc thông tin ngoài kịch bản
- Nếu khách hỏi giá/ưu đãi → nhắc ưu đãi đang chạy (nếu có)
- Nếu khách hỏi ngoài phạm vi → mời để lại SĐT hoặc chat Zalo
- KHÔNG tiết lộ bạn là AI hay bot`;

  const historyMsgs = (history || []).slice(-8).map((m: any) => ({
    role: m.sender === 'customer' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Gọi Custom API nếu được cấu hình
  if (integrationConfig?.chatApiEnabled && integrationConfig?.chatApiUrl) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (integrationConfig.chatApiKey) headers['Authorization'] = `Bearer ${integrationConfig.chatApiKey}`;

      const proxyRes = await fetch(integrationConfig.chatApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: integrationConfig.chatApiModelName || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            ...historyMsgs,
            { role: 'user', content: message },
          ],
        }),
      });
      const data: any = await proxyRes.json();
      return res.json({ text: data?.choices?.[0]?.message?.content || '' });
    } catch (err: any) {
      console.error('[live-chat-bot] Custom API error:', err.message);
    }
  }

  // Fallback: Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: 'Thiếu GEMINI_API_KEY — cấu hình trong Settings → Cổng kết nối' });
  }

  try {
    const contents = [
      ...historyMsgs.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
        }),
      }
    );
    const data: any = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ text });
  } catch (err: any) {
    console.error('[live-chat-bot] Gemini error:', err.message);
    return res.status(500).json({ error: 'Lỗi kết nối dịch vụ AI' });
  }
}
