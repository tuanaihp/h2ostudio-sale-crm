// POST /api/r2-delete — xoá object trên R2 qua Worker (server-side secret).
// Chỉ staff/admin. Giới hạn path hợp lệ để tránh xoá bừa.
import { checkRateLimit, getClientIp } from './_security';
import { verifyUser, isStaff } from './_auth';

const R2_WORKER_URL = process.env.R2_WORKER_URL || process.env.VITE_R2_WORKER_URL || '';
const R2_UPLOAD_SECRET = process.env.R2_UPLOAD_SECRET || '';
const PATH_RE = /^[a-zA-Z0-9][a-zA-Z0-9_\-/.]{0,400}$/;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  if (!checkRateLimit(`r2del:${ip}`, 30)) {
    return res.status(429).json({ error: 'Quá nhiều request, thử lại sau' });
  }

  if (!R2_WORKER_URL || !R2_UPLOAD_SECRET) {
    return res.status(503).json({ error: 'R2 chưa được cấu hình trên server' });
  }

  const user = await verifyUser(req);
  if (!isStaff(user)) return res.status(401).json({ error: 'Chỉ nhân viên mới được xoá' });

  const { path } = req.body || {};
  if (!path || typeof path !== 'string' || !PATH_RE.test(path) || path.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  try {
    const resp = await fetch(`${R2_WORKER_URL}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${R2_UPLOAD_SECRET}`,
      },
      body: JSON.stringify({ path }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(resp.status).json({ error: data?.message || 'R2 delete failed' });
    return res.json(data);
  } catch {
    return res.status(502).json({ error: 'Không kết nối được R2' });
  }
}
