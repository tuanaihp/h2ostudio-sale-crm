import { checkRateLimit, getClientIp, validateExternalUrl } from './_security';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  // Rate limit: 10 req/min/IP
  const ip = getClientIp(req);
  if (!checkRateLimit(`ai-promo:${ip}`, 10)) {
    return res.status(429).json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 1 phút' });
  }

  const { command, type, context, apiKey, apiUrl, modelName } = req.body || {};

  if (type !== 'bulk' && type !== 'content') {
    return res.status(400).json({ error: 'type không hợp lệ (bulk hoặc content)' });
  }

  // SSRF guard: validate apiUrl trước khi server gọi ra ngoài
  if (apiUrl) {
    const check = validateExternalUrl(apiUrl);
    if (!check.ok) {
      return res.status(400).json({ error: `API URL không hợp lệ: ${check.reason}` });
    }
  }

  let prompt = '';

  if (type === 'bulk') {
    prompt = `Bạn là chuyên gia marketing cho studio chụp ảnh cưới tại Việt Nam.

Yêu cầu của admin: "${command}"

Tạo danh sách chương trình khuyến mãi phù hợp cho studio chụp ảnh cưới. Chỉ trả về JSON array, không giải thích, không markdown:
[
  {
    "title": "Tên KM ngắn gọn hấp dẫn (< 50 ký tự)",
    "shortDesc": "1 câu mô tả súc tích (< 80 ký tự)",
    "content": "Nội dung chi tiết 3-4 câu: ưu đãi cụ thể, điều kiện áp dụng, cách đăng ký, thời hạn",
    "emoji": "1 emoji phù hợp chủ đề",
    "color": "#hexcode màu đậm (chữ)",
    "bgColor": "#hexcode màu nền rất nhạt",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "ctaText": "Text nút CTA < 25 ký tự"
  }
]

Các ngày lễ chính 2026:
- Tết Dương Lịch: 01/01 | Valentine: 14/02 | Tết Nguyên Đán: 15-21/02
- Phụ nữ 8/3 | Giải phóng 30/4 | Lao động 1/5 | Ngày Mẹ 10/5 | Ngày Cha 21/6
- Thất Tịch 23/8 | Trung Thu 7/10 | Phụ nữ VN 20/10 | Giáng Sinh 24-25/12

Màu gợi ý:
- Valentine/Tình yêu: color #D53F8C, bgColor #FFF0F5
- Phụ nữ: color #7B2D8B, bgColor #FAF0FF
- Tết/Đỏ: color #E53E3E, bgColor #FFF0F0
- Giáng Sinh: color #276749, bgColor #F0FFF4
- Vàng/Ấm: color #B7791F, bgColor #FFFFF0
- Xanh dương: color #2B6CB0, bgColor #EBF8FF

Chỉ JSON array, không có text khác.`;
  } else {
    prompt = `Bạn là chuyên gia marketing cho H2O Studio — studio chụp ảnh cưới chuyên nghiệp tại Việt Nam.

Tên chương trình khuyến mãi: "${context}"

Tạo nội dung hấp dẫn. Chỉ trả về JSON object, không giải thích, không markdown:
{
  "shortDesc": "1 câu mô tả siêu hấp dẫn, đánh vào cảm xúc (< 80 ký tự)",
  "content": "3-4 câu nội dung đầy đủ: mức ưu đãi cụ thể, điều kiện áp dụng, cách nhận ưu đãi, thời hạn đăng ký",
  "ctaText": "Text nút CTA ngắn gọn kêu gọi hành động (< 25 ký tự)"
}`;
  }

  const parseResult = (raw: string) => {
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const candidates = [stripped, raw];
    for (const text of candidates) {
      const m = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
      if (!m) continue;
      try { return JSON.parse(m[0]); } catch { continue; }
    }
    return null;
  };

  // Thử Custom API trước (nếu có apiKey)
  if (apiKey) {
    try {
      const endpoint = apiUrl || 'https://api.openai.com/v1/chat/completions';
      const model = modelName || 'gpt-4o-mini';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Bạn là trợ lý marketing chuyên nghiệp. Chỉ trả về JSON đúng format được yêu cầu.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const raw = data?.choices?.[0]?.message?.content || '';
        const result = parseResult(raw);
        if (result) return res.json({ result });
        return res.json({ error: 'AI không trả về JSON hợp lệ', raw });
      }

      const errMsg: string = data?.error?.message || '';
      const isBalanceOrAuth = /balance|quota|insufficient|unauthorized|invalid.*key/i.test(errMsg);
      if (!isBalanceOrAuth) {
        return res.json({ error: 'Lỗi kết nối dịch vụ AI' });
      }
      console.warn('[ai-promo] Custom API lỗi balance/auth, thử Gemini fallback');
    } catch (err: any) {
      console.warn('[ai-promo] Custom API exception, thử Gemini fallback:', err.message);
    }
  }

  // Fallback: Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.json({
      error: 'Tài khoản AI hết credit. Vui lòng nạp thêm hoặc thêm GEMINI_API_KEY vào Vercel env vars để dùng miễn phí.',
    });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: 'Bạn là trợ lý marketing chuyên nghiệp. QUAN TRỌNG: Chỉ trả về JSON thuần túy, KHÔNG dùng markdown, KHÔNG dùng code block, KHÔNG giải thích, KHÔNG có text thừa ngoài JSON.' }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
      }
    );

    const data: any = await geminiRes.json();
    const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const result = parseResult(raw);
    if (result) return res.json({ result });
    return res.json({ error: 'Gemini không trả về JSON hợp lệ', raw });
  } catch (err: any) {
    console.error('[ai-promo] Gemini error:', err.message);
    return res.status(500).json({ error: 'Lỗi kết nối dịch vụ AI' });
  }
}
