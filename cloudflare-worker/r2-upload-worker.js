/**
 * Cloudflare Worker — R2 Upload Proxy cho H2O Studio (bản hardened)
 *
 * THAY ĐỔI so với bản cũ:
 * - Auth BẮT BUỘC (fail-closed): thiếu UPLOAD_SECRET → mọi request đều 503
 * - Secret giờ chỉ nằm ở Vercel server env (R2_UPLOAD_SECRET) — KHÔNG còn trong
 *   client bundle. Client gọi /api/r2-upload, server mới gọi worker này.
 * - Validate path (regex + chặn ".."), MIME allowlist, giới hạn kích thước
 * - /delete vẫn tồn tại nhưng chỉ reachable qua /api/r2-delete (staff-only)
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
 *    UPLOAD_SECRET = (chuỗi ngẫu nhiên mạnh, VD: openssl rand -hex 32)
 *    PUBLIC_DOMAIN = pub-b5046a0852444fc2af23edc3243b730a.r2.dev
 *
 * C) Deploy lại (Save & Deploy) sau khi thêm biến
 *
 * SAU KHI CÓ WORKER URL — thêm vào Vercel Dashboard → Environment Variables:
 * ========================================================================
 *    R2_WORKER_URL    = https://r2-upload-h2ostudio.your-subdomain.workers.dev
 *    R2_UPLOAD_SECRET = (cùng mật khẩu ở bước B) — KHÔNG có prefix VITE_
 *
 * Sau đó Redeploy project trên Vercel để env mới có hiệu lực.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_BYTES = 12 * 1024 * 1024; // 12MB binary
const PATH_RE = /^[a-zA-Z0-9][a-zA-Z0-9_\-/.]{0,400}$/;

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    // Auth fail-CLOSED: thiếu secret server-side → từ chối mọi request
    if (!env.UPLOAD_SECRET) {
      return new Response('Server misconfigured: UPLOAD_SECRET not set', {
        status: 503, headers: CORS_HEADERS,
      });
    }
    const auth = request.headers.get('Authorization') || '';
    if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
      return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // --- DELETE ---
    if (url.pathname === '/delete') {
      try {
        const { path } = await request.json();
        if (!path || !PATH_RE.test(path) || path.includes('..')) {
          return new Response(JSON.stringify({ error: 'Invalid path' }), {
            status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
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
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      if (!PATH_RE.test(path) || path.includes('..')) {
        return new Response(JSON.stringify({ error: 'Invalid path' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      if (mimeType && !ALLOWED_MIME.includes(mimeType)) {
        return new Response(JSON.stringify({ error: 'MIME type not allowed' }), {
          status: 415, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const binaryStr = atob(base64);
      if (binaryStr.length > MAX_BYTES) {
        return new Response(JSON.stringify({ error: 'File too large' }), {
          status: 413, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      await env.BUCKET.put(path, bytes, {
        httpMetadata: { contentType: mimeType || 'image/jpeg' },
      });

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
