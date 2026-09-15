// Shared helpers cho cron endpoints. Prefix _ → không deploy thành endpoint.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const LARK_URL = process.env.LARK_WEBHOOK_URL || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

/** Fail-closed auth cho cron. Trả false = đã response lỗi, handler nên return. */
export function requireCronAuth(req: any, res: any): boolean {
  if (!CRON_SECRET) {
    res.status(500).json({ error: 'CRON_SECRET chưa được cấu hình trên server' });
    return false;
  }
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * Query PostgREST bằng SERVICE ROLE key (bypass RLS — chỉ dùng server-side).
 * Anon key bị RLS chặn SELECT consultations → cron không bao giờ thấy data.
 */
export async function querySupabase(pathAndQuery: string): Promise<any[]> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY trên server env');
  }
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!resp.ok) throw new Error(`Supabase error: ${resp.status}`);
  return resp.json();
}

/** Gửi text message vào Lark group. Trả false nếu chưa cấu hình hoặc gửi lỗi. */
export async function sendLark(text: string): Promise<boolean> {
  if (!LARK_URL) return false;
  try {
    const resp = await fetch(LARK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text } }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/** Gửi text message qua Telegram bot. Trả false nếu chưa cấu hình hoặc lỗi. */
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';
  if (!token || !chatId) return false;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
