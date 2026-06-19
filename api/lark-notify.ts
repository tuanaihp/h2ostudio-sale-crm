// Proxy gửi Lark notification với keyword filter — tránh CORS khi gọi từ browser
const LARK_URL = process.env.LARK_WEBHOOK_URL || 'https://open.larksuite.com/open-apis/bot/v2/hook/addf1821-ec82-4dcb-8ae6-327006f2acf5';
const LARK_KEYWORD = process.env.LARK_KEYWORD || 'teamsaleh2o';

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
    const { name, phone, source, luckyGift, favoriteCount, albums } = req.body || {};
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
  } catch (err: any) {
    console.error('[lark-notify]', err);
    return res.status(500).json({ error: err.message });
  }
}
