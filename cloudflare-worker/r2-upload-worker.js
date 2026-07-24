/**
 * Cloudflare Worker — R2 Upload Proxy cho H2O Studio
 *
 * HƯỚNG DẪN DEPLOY:
 * ==================
 * 1. Vào dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Đặt tên: r2-upload-h2ostudio (hoặc tên bất kỳ)
 * 3. Click "Edit code" → xóa code cũ → paste toàn bộ file này
 * 4. Click "Deploy"
 *
 * SAU KHI DEPLOY — cấu hình thêm trong Worker Settings:
 * ========================================================
 * A) Settings → Bindings → R2 Bucket → Add binding:
 *    Variable name: BUCKET
 *    Bucket: h2ostudio-album-images
 *
 * B) Settings → Variables → Add variable (type: Secret):
 *    UPLOAD_SECRET = (đặt mật khẩu bất kỳ, VD: h2ostudio2026)
 *    PUBLIC_DOMAIN = pub-b5046a0852444fc2af23edc3243b730a.r2.dev
 *
 * C) Deploy lại (Save & Deploy) sau khi thêm biến
 *
 * SAU KHI CÓ WORKER URL — thêm vào Vercel Dashboard → Settings → Environment Variables:
 * ======================================================================================
 *    VITE_R2_WORKER_URL    = https://r2-upload-h2ostudio.your-subdomain.workers.dev
 *    VITE_R2_UPLOAD_SECRET = (mật khẩu đã đặt ở bước B)
 *
 * Sau đó Redeploy project trên Vercel để env mới có hiệu lực.
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
        return new Response(JSON.stringify({ status: 'error', message: 'Delete failed' }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- UPLOAD ---
    try {
      const { base64, path, mimeType } = await request.json();
      if (!base64 || !path) {
        return new Response(JSON.stringify({ error: 'Missing base64 or path' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Chuyển base64 → binary
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Upload lên R2 bucket
      await env.BUCKET.put(path, bytes, {
        httpMetadata: { contentType: mimeType || 'image/jpeg' },
      });

      // Trả về URL public của file
      const publicDomain = env.PUBLIC_DOMAIN || 'pub-b5046a0852444fc2af23edc3243b730a.r2.dev';
      const publicUrl = `https://${publicDomain}/${path}`;

      return new Response(JSON.stringify({ status: 'success', url: publicUrl }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ status: 'error', message: 'Upload failed' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};
