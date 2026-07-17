// Shared security utilities — dùng chung cho tất cả API handlers
// Prefix _ → Vercel KHÔNG deploy file này thành endpoint công khai

// ─── Rate Limiting ──────────────────────────────────────────────────────────
// In-memory per-instance (không đồng bộ across Vercel instances).
// Production scale: thay bằng Upstash Redis (@upstash/ratelimit + @upstash/redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(forwarded)
    ? forwarded[0]
    : (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null);
  return raw || req.socket?.remoteAddress || 'unknown';
}

export function checkRateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ─── SSRF Guard ─────────────────────────────────────────────────────────────
// Block localhost, private IP ranges, cloud metadata endpoints
const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.|::1|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;

export function validateExternalUrl(rawUrl: unknown): { ok: boolean; reason?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') return { ok: false, reason: 'URL không hợp lệ' };
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return { ok: false, reason: 'URL không hợp lệ' }; }
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'Chỉ chấp nhận HTTPS URL' };
  if (PRIVATE_HOST_RE.test(parsed.hostname)) return { ok: false, reason: 'URL trỏ vào mạng nội bộ' };
  return { ok: true };
}

// Google Sheets ID — alphanumeric + underscore + dash, 20-60 ký tự
export function validateSheetId(id: unknown): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{20,60}$/.test(id);
}
