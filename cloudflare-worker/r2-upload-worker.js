/**
 * Cloudflare Worker — R2 Upload Proxy
 *
 * Cách deploy:
 * 1. Vào dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste toàn bộ file này vào editor
 * 3. Vào Settings → Variables → thêm:
 *    - UPLOAD_SECRET = (tự đặt mật khẩu bất kỳ, VD: h2ostudio2026)
 *    - PUBLIC_DOMAIN = (custom domain hoặc r2.dev domain của bucket)
 * 4. Vào Settings → Bindings → R2 Bucket → đặt tên biến là BUCKET → chọn bucket của bạn
 * 5. Deploy
 * 6. Thêm vào Vercel env:
 *    VITE_R2_WORKER_URL = https://r2-upload.your-subdomain.workers.dev
 *    VITE_R2_UPLOAD_SECRET = (mật khẩu bạn đặt ở bước 3)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env) {
    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    // Kiểm tra secret key
    if (env.UPLOAD_SECRET) {
      const auth = request.headers.get('Authorization') || '';
      if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      }
    }

    const url = new URL(request.url);

    // --- DELETE ---
    if (url.pathname === '/delete') {
      try {
        const { path } = await request.json();
        if (!path) return new Response('Missing path', { status: 400, headers: CORS_HEADERS });
        await env.BUCKET.delete(path);
        return new Response(JSON.stringify({ status: 'success' }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ status: 'error', message: String(err) }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- UPLOAD ---
    try {
      const { base64, path, mimeType } = await request.json();
      if (!base64 || !path) {
        return new Response('Missing base64 or path', { status: 400, headers: CORS_HEADERS });
      }

      // Chuyển base64 → binary
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Upload lên R2
      await env.BUCKET.put(path, bytes, {
        httpMetadata: { contentType: mimeType || 'image/jpeg' },
      });

      const publicUrl = `https://${env.PUBLIC_DOMAIN}/${path}`;

      return new Response(JSON.stringify({ status: 'success', url: publicUrl }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ status: 'error', message: String(err) }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
