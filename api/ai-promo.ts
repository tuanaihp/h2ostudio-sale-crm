import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const { command, type, context } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY chưa được cấu hình' });

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
    "emoji": "1 emoji phù hợp chủ đề ngày lễ",
    "color": "#hexcode màu đậm (chữ)",
    "bgColor": "#hexcode màu nền rất nhạt",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "ctaText": "Text nút CTA < 25 ký tự"
  }
]

Các ngày lễ chính 2026 (dương lịch):
- Tết Dương Lịch: 01/01/2026
- Tết Nguyên Đán: 15-21/02/2026 (Bính Ngọ - AL 01-07/01)
- Valentine: 14/02/2026
- Quốc tế Phụ nữ: 08/03/2026
- Giỗ Tổ Hùng Vương: 16/04/2026 (AL 10/3)
- Giải phóng 30/04 & Lao động 1/5: 30/04-01/05/2026
- Ngày Cha (Chủ nhật 3 tháng 6): 21/06/2026
- Ngày Mẹ (Chủ nhật 2 tháng 5): 10/05/2026
- Thất Tịch: 23/08/2026 (AL 07/07 Bính Ngọ)
- Trung Thu: 07/10/2026 (AL 15/08)
- Phụ nữ Việt Nam: 20/10/2026
- Halloween: 31/10/2026
- Giáng Sinh: 24-25/12/2026
- Tất Niên: 28-31/12/2026

Màu theo chủ đề (ví dụ gợi ý):
- Valentine/Tình yêu: color #D53F8C, bgColor #FFF0F5
- Phụ nữ (8/3, 20/10): color #7B2D8B, bgColor #FAF0FF
- Tết/Đỏ: color #E53E3E, bgColor #FFF0F0
- Giáng Sinh/Xanh: color #276749, bgColor #F0FFF4
- Vàng/Ấm: color #B7791F, bgColor #FFFFF0
- Cam: color #C05621, bgColor #FFFAF0
- Xanh dương: color #2B6CB0, bgColor #EBF8FF

Chỉ JSON array, không có text khác.`;
  } else if (type === 'content') {
    prompt = `Bạn là chuyên gia marketing cho H2O Studio — studio chụp ảnh cưới chuyên nghiệp tại Việt Nam.

Tên chương trình khuyến mãi: "${context}"

Tạo nội dung hấp dẫn. Chỉ trả về JSON object, không giải thích, không markdown:
{
  "shortDesc": "1 câu mô tả siêu hấp dẫn, đánh vào cảm xúc (< 80 ký tự)",
  "content": "3-4 câu nội dung đầy đủ: mức ưu đãi cụ thể (% hoặc số tiền), điều kiện áp dụng (gói nào), cách nhận ưu đãi (gọi/Zalo/website), thời hạn đăng ký",
  "ctaText": "Text nút CTA ngắn gọn kêu gọi hành động (< 25 ký tự)"
}`;
  } else {
    return res.status(400).json({ error: 'type không hợp lệ (bulk hoặc content)' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.8 },
    });

    const raw = response.text || '';
    const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ error: 'AI không trả về JSON hợp lệ', raw });

    return res.status(200).json({ result: JSON.parse(jsonMatch[0]) });
  } catch (err: any) {
    console.error('ai-promo error:', err);
    return res.status(500).json({ error: err?.message || 'Lỗi khi gọi AI' });
  }
}
