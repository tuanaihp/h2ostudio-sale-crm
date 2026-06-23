// C4: Nhắc lead mới chưa được gọi sau 2h — Lark + Telegram, chạy mỗi 2h
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const LARK_URL = process.env.LARK_WEBHOOK_URL || '';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

export default async function handler(req: any, res: any) {
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Lead mới 2–6h chưa được gọi (chưa có trạng thái called/contacted)
    const from2h = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const to2h   = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/consultations?status=eq.new&created_at=gt.${encodeURIComponent(from2h)}&created_at=lt.${encodeURIComponent(to2h)}&select=name,phone,source,favorite_ids,lucky_gift,created_at&order=created_at.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );

    if (!resp.ok) throw new Error(`Supabase error: ${resp.status}`);
    const leads = await resp.json() as any[];

    if (leads.length === 0) {
      return res.json({ ok: true, sent: false, reason: 'Không có lead mới 2–6h' });
    }

    const list = leads.map((l, i) => {
      const mins = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 60000);
      const hot = (l.favorite_ids?.length >= 3 || l.lucky_gift) ? '🔥 ' : '';
      return `${i + 1}. ${hot}${l.name} — ${l.phone} (${mins}p chưa gọi)`;
    }).join('\n');

    const msg = `teamsaleh2o\n⏰ Khách mới chưa được gọi — Gọi ngay!\n━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━\n⚡ Gọi sớm trong 5 phút tỉ lệ chốt cao nhất!`;

    const sends: Promise<any>[] = [];

    if (LARK_URL) {
      sends.push(fetch(LARK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg_type: 'text', content: { text: msg } }),
      }));
    }

    if (TG_TOKEN && TG_CHAT) {
      sends.push(fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT, text: msg }),
      }));
    }

    await Promise.allSettled(sends);
    return res.json({ ok: true, sent: true, count: leads.length });
  } catch (err: any) {
    console.error('[cron-followup]', err);
    return res.status(500).json({ error: err.message });
  }
}
