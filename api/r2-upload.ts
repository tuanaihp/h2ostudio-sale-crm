// POST /api/r2-upload — proxy upload ảnh lên Cloudflare R2 qua Worker.
// Giữ R2_UPLOAD_SECRET ở SERVER (env không VITE_) → không lộ trong client bundle.
// Yêu cầu: Supabase JWT của staff/admin trong Authorization header.
import { checkRateLimit, getClientIp } from './_security';
import { verifyUser, isStaff } from './_auth';

const R2_WORKER_URL = process.env.R2_WORKER_URL || process.env.VITE_R2_WORKER_URL || '';
const R2_UPLOAD_SECRET = process.env.R2_UPLOAD_SECRET || '';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_BASE64_BYTES = 12 * 1024 * 1024; // ~9MB binary sau decode
const PATH_RE = /^[a-zA-Z0-9][a-zA-Z0-9_\-/.]{0,400}$/;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  if (!checkRateLimit(`r2up:${ip}`, 30)) {
    return res.status(429).json({ error: 'Quá nhiều request, thử lại sau' });
  }

  if (!R2_WORKER_URL || !R2_UPLOAD_SECRET) {
    return res.status(503).json({ error: 'R2 chưa được cấu hình trên server' });
  }

  const user = await verifyUser(req);
  if (!isStaff(user)) return res.status(401).json({ error: 'Chỉ nhân viên mới được upload' });

  const { base64, path, mimeType } = req.body || {};
  if (!base64 || typeof base64 !== 'string' || typeof path !== 'string' || !path) {
    return res.status(400).json({ error: 'Missing base64 or path' });
  }
  if (!PATH_RE.test(path) || path.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  if (mimeType && !ALLOWED_MIME.includes(mimeType)) {
    return res.status(400).json({ error: 'Định dạng ảnh không được hỗ trợ' });
  }
  if (base64.length > MAX_BASE64_BYTES * 1.4) {
    return res.status(413).json({ error: 'Ảnh quá lớn (tối đa ~9MB)' });
  }

  try {
    const resp = await fetch(R2_WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${R2_UPLOAD_SECRET}`,
      },
      body: JSON.stringify({ base64, path, mimeType: mimeType || 'image/jpeg' }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(resp.status).json({ error: data?.message || 'R2 upload failed' });
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: 'Không kết nối được R2' });
  }
}
