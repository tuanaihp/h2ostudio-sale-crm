// Proxy gửi Telegram notification — đơn giản hơn Lark, hỗ trợ HTML clickable links
interface AlbumInfo {
  title: string;
  url: string;
  styleName?: string;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, phone, source, luckyGift, albums } = req.body || {};

    // Credentials chỉ từ env — không nhận từ client để tránh abuse gửi tới bất kỳ bot nào
    const BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN || '';
    const CHAT_ID: string = process.env.TELEGRAM_CHAT_ID || '';

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ error: 'Notification service not configured' });
    }

    const albumList: AlbumInfo[] = Array.isArray(albums) ? albums : [];
    const sourceLabel = source === 'lucky_wheel' ? 'Vòng quay may mắn' : (source || '');

    const lines: string[] = [
      '🔔 <b>KHÁCH MỚI ĐĂNG KÝ!</b>',
      '─────────────────',
      `👤 <b>Tên:</b> ${escHtml(name || '—')}`,
      `📞 <b>SĐT:</b> ${escHtml(phone || '—')}`,
    ];

    if (sourceLabel) lines.push(`📌 <b>Nguồn:</b> ${escHtml(sourceLabel)}`);
    if (luckyGift) lines.push(`🎁 <b>Quà:</b> ${escHtml(luckyGift)}`);

    if (albumList.length > 0) {
      lines.push('─────────────────');
      lines.push(`📸 <b>CONCEPT YÊU THÍCH (${albumList.length} album):</b>`);
      albumList.forEach((a, i) => {
        const suffix = a.styleName ? ` — ${escHtml(a.styleName)}` : '';
        lines.push(`${i + 1}. <a href="${a.url}">${escHtml(a.title)}</a>${suffix}`);
      });
    }

    lines.push('─────────────────');
    lines.push('👉 Vào CRM để liên hệ ngay!');

    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const result = await resp.json();
    return res.json(result);
  } catch (err: any) {
    console.error('[telegram-notify]', err);
    return res.status(500).json({ error: 'Gửi thông báo thất bại' });
  }
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
