export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    command, type, context,
    apiKey, apiUrl, modelName,
  } = req.body || {};

  if (!apiKey) {
    return res.status(200).json({
      error: 'Chưa cấu hình API Key AI. Vào Settings → Cổng kết nối → nhập API Key và chọn model.',
    });
  }

  const endpoint = apiUrl || 'https://api.openai.com/v1/chat/completions';
  const model    = modelName || 'gpt-4o-mini';

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

  } else if (type === 'content') {
    prompt = `Bạn là chuyên gia marketing cho H2O Studio — studio chụp ảnh cưới chuyên nghiệp tại Việt Nam.

Tên chương trình khuyến mãi: "${context}"

Tạo nội dung hấp dẫn. Chỉ trả về JSON object, không giải thích, không markdown:
{
  "shortDesc": "1 câu mô tả siêu hấp dẫn, đánh vào cảm xúc (< 80 ký tự)",
  "content": "3-4 câu nội dung đầy đủ: mức ưu đãi cụ thể, điều kiện áp dụng, cách nhận ưu đãi, thời hạn đăng ký",
  "ctaText": "Text nút CTA ngắn gọn kêu gọi hành động (< 25 ký tự)"
}`;

  } else {
    return res.status(400).json({ error: 'type không hợp lệ (bulk hoặc content)' });
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Bạn là trợ lý marketing chuyên nghiệp. Chỉ trả về JSON đúng format được yêu cầu.' },
          { role: 'user',   content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `AI API error ${response.status}`;
      return res.status(200).json({ error: errMsg });
    }

    const raw = data?.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ error: 'AI không trả về JSON hợp lệ', raw });

    return res.status(200).json({ result: JSON.parse(jsonMatch[0]) });
  } catch (err: any) {
    console.error('ai-promo error:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi kết nối AI' });
  }
}
