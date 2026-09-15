// OG meta renderer cho social crawlers (Zalo/Facebook/Telegram...).
// vercel.json rewrite UA crawler → endpoint này. Query Supabase (PostgREST).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function fetchRow(table: string, query: string): Promise<any | null> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    signal: AbortSignal.timeout(8_000),
  });
  if (!resp.ok) return null;
  const rows = await resp.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  // vercel.json rewrite truyền path gốc qua ?p=/$1 (rewrite thay req.url).
  // Truy cập trực tiếp /api/bot?p=/style/... cũng hoạt động (vd: test crawler).
  const path = url.searchParams.get('p') || url.pathname;

  let title = 'H2O STUDIO – Wedding Concept Gallery';
  let description = 'Thư viện ảnh cưới Concept chất lượng cao, nơi hiện thực hóa những khoảnh khắc hạnh phúc của bạn.';
  let imageUrl = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&h=630&q=80';

  try {
    // /style/:styleSlug/album/:albumSlug  hoặc  /style/:styleSlug
    const albumMatch = path.match(/\/style\/([^/]+)\/album\/([^/]+)/);
    const styleMatch = path.match(/\/style\/([^/]+)\/?$/);

    if (albumMatch || styleMatch) {
      const styleSlug = albumMatch?.[1] ?? styleMatch![1];
      const style = await fetchRow(
        'styles',
        `slug=eq.${encodeURIComponent(styleSlug)}&deleted=eq.false&select=id,title,description,cover_image&limit=1`
      );

      if (style) {
        title = style.title || title;
        description = style.description || description;
        imageUrl = style.cover_image || imageUrl;

        if (albumMatch && style.id) {
          const album = await fetchRow(
            'albums',
            `slug=eq.${encodeURIComponent(albumMatch[2])}&style_id=eq.${encodeURIComponent(style.id)}&deleted=eq.false&select=title,description,cover_image&limit=1`
          );
          if (album) {
            title = album.title || title;
            description = album.description || description;
            imageUrl = album.cover_image || imageUrl;
          }
        }
      }
    }
  } catch (err) {
    console.error('[bot] OG fetch error:', err);
  }

  const safeTitle = esc(title);
  const safeDesc = esc(description.slice(0, 300));
  const safeImage = esc(imageUrl);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle} - H2O STUDIO</title>
  <meta name="description" content="${safeDesc}">
  <meta property="og:title" content="${safeTitle} - H2O STUDIO">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle} - H2O STUDIO">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
</head>
<body>
  <p>Đang chuyển hướng...</p>
</body>
</html>`);
}
