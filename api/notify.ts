// Gộp lark-notify + telegram-notify vào 1 function (Hobby giới hạn 12 functions).
//   POST /api/notify?channel=lark      — proxy Lark webhook với keyword filter
//   POST /api/notify?channel=telegram  — proxy Telegram bot (HTML links)
// URL cũ /api/lark-notify và /api/telegram-notify vẫn hoạt động qua vercel.json rewrites.
const LARK_DEFAULT_URL = process.env.LARK_WEBHOOK_URL || '';
const LARK_KEYWORD = process.env.LARK_KEYWORD || 'teamsaleh2o';

interface AlbumInfo {
  title: string;
  url: string;
  styleName?: string;
}

async function sendLarkChannel(req: any, res: any) {
  const { name, phone, source, luckyGift, favoriteCount, albums } = req.body || {};
  // Chỉ dùng URL từ env — không nhận webhookUrl từ client (tránh SSRF)
  const LARK_URL: string = LARK_DEFAULT_URL;
  if (!LARK_URL) return res.status(500).json({ error: 'Notification service not configured' });
  const albumList: AlbumInfo[] = Array.isArray(albums) ? albums : [];

  // Build Lark "post" format — supports clickable links
  const contentLines: any[][] = [];

  // Header keyword (required by Lark filter)
  contentLines.push([{ tag: 'text', text: LARK_KEYWORD }]);
  contentLines.push([{ tag: 'text', text: '🔔 KHÁCH MỚI ĐĂNG KÝ!' }]);
  contentLines.push([{ tag: 'text', text: '━━━━━━━━━━━━━━━━' }]);
  contentLines.push([{ tag: 'text', text: `👤 Tên: ${name || '—'}` }]);
  contentLines.push([{ tag: 'text', text: `📞 SĐT: ${phone || '—'}` }]);

  if (source) {
    contentLines.push([{ tag: 'text', text: `📌 Nguồn: ${source === 'lucky_wheel' ? 'Vòng quay may mắn' : source}` }]);
  }
  if (luckyGift) {
    contentLines.push([{ tag: 'text', text: `🎁 Quà: ${luckyGift}` }]);
  }

  if (albumList.length > 0) {
    contentLines.push([{ tag: 'text', text: '━━━━━━━━━━━━━━━━' }]);
    contentLines.push([{ tag: 'text', text: `📸 CONCEPT YÊU THÍCH (${albumList.length} album):` }]);
    albumList.forEach((a, i) => {
      contentLines.push([
        { tag: 'text', text: `${i + 1}. ` },
        { tag: 'a', text: a.title, href: a.url },
        ...(a.styleName ? [{ tag: 'text', text: ` — ${a.styleName}` }] : []),
      ]);
    });
  } else if (favoriteCount > 0) {
    contentLines.push([{ tag: 'text', text: `❤️ Đã thích: ${favoriteCount} album` }]);
  }

  contentLines.push([{ tag: 'text', text: '━━━━━━━━━━━━━━━━' }]);
  contentLines.push([{ tag: 'text', text: '👉 Vào CRM để liên hệ ngay!' }]);

  const resp = await fetch(LARK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msg_type: 'post',
      content: {
        post: {
          vi_vn: { title: '🔔 H2O Studio — Khách mới', content: contentLines },
          zh_cn: { title: '🔔 H2O Studio — Khách mới', content: contentLines },
        },
      },
    }),
  });

  const result = await resp.json();

  // If post format fails (e.g. webhook doesn't support it), fallback to text
  if (result.code && result.code !== 0) {
    const textLines = [
      LARK_KEYWORD,
      '🔔 KHÁCH MỚI ĐĂNG KÝ!',
      '━━━━━━━━━━━━━━━━',
      `👤 Tên: ${name || '—'}`,
      `📞 SĐT: ${phone || '—'}`,
    ];
    if (source) textLines.push(`📌 Nguồn: ${source === 'lucky_wheel' ? 'Vòng quay may mắn' : source}`);
    if (luckyGift) textLines.push(`🎁 Quà: ${luckyGift}`);
    if (albumList.length > 0) {
      textLines.push('━━━━━━━━━━━━━━━━');
      textLines.push(`📸 CONCEPT YÊU THÍCH (${albumList.length} album):`);
      albumList.forEach((a, i) => textLines.push(`${i + 1}. ${a.title}: ${a.url}`));
    } else if (favoriteCount > 0) {
      textLines.push(`❤️ Đã thích: ${favoriteCount} album`);
    }
    textLines.push('━━━━━━━━━━━━━━━━');
    textLines.push('👉 Vào CRM để liên hệ ngay!');

    const fallback = await fetch(LARK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text: textLines.join('\n') } }),
    });
    return res.json(await fallback.json());
  }

  return res.json(result);
}

async function sendTelegramChannel(req: any, res: any) {
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
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const CHANNELS: Record<string, (req: any, res: any) => any> = {
  lark: sendLarkChannel,
  telegram: sendTelegramChannel,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const channel = CHANNELS[(req.query?.channel || '').toString()];
  if (!channel) return res.status(400).json({ error: 'Missing/invalid ?channel= (lark|telegram)' });

  try {
    return await channel(req, res);
  } catch (err: any) {
    console.error('[notify]', err);
    return res.status(500).json({ error: 'Gửi thông báo thất bại' });
  }
}
