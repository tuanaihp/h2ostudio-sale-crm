// Proxy gửi Lark notification với keyword filter — tránh CORS khi gọi từ browser
const LARK_URL = process.env.LARK_WEBHOOK_URL || 'https://open.larksuite.com/open-apis/bot/v2/hook/addf1821-ec82-4dcb-8ae6-327006f2acf5';
const LARK_KEYWORD = process.env.LARK_KEYWORD || 'teamsaleh2o';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, phone, source, luckyGift, favoriteCount } = req.body || {};

    const lines = [
      LARK_KEYWORD,
      '🔔 KHÁCH MỚI ĐĂNG KÝ!',
      '━━━━━━━━━━━━━━━━',
      `👤 Tên: ${name || '—'}`,
      `📞 SĐT: ${phone || '—'}`,
    ];
    if (source) lines.push(`📌 Nguồn: ${source === 'lucky_wheel' ? 'Vòng quay may mắn' : source}`);
    if (luckyGift) lines.push(`🎁 Quà: ${luckyGift}`);
    if (favoriteCount > 0) lines.push(`❤️ Đã thích: ${favoriteCount} album`);
    lines.push('━━━━━━━━━━━━━━━━');
    lines.push('👉 Vào CRM để liên hệ ngay!');

    const resp = await fetch(LARK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text: lines.join('\n') } }),
    });

    const result = await resp.json();
    return res.json(result);
  } catch (err: any) {
    console.error('[lark-notify]', err);
    return res.status(500).json({ error: err.message });
  }
}
