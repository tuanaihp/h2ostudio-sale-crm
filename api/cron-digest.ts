// C1: Gửi digest khách mới 24h qua → Lark, chạy lúc 8:00 sáng (giờ VN)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const LARK_URL = process.env.LARK_WEBHOOK_URL || 'https://open.larksuite.com/open-apis/bot/v2/hook/addf1821-ec82-4dcb-8ae6-327006f2acf5';
const CRON_SECRET = process.env.CRON_SECRET || '';

export default async function handler(req: any, res: any) {
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/consultations?status=eq.new&created_at=gte.${encodeURIComponent(since)}&select=name,phone,source,lucky_gift,created_at&order=created_at.desc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );

    if (!resp.ok) throw new Error(`Supabase error: ${resp.status}`);
    const leads = await resp.json() as any[];

    if (leads.length === 0) {
      return res.json({ ok: true, sent: false, reason: 'Không có khách mới trong 24h' });
    }

    const today = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
    const list = leads
      .map((l, i) => {
        const extras = [l.source, l.lucky_gift ? `🎁 ${l.lucky_gift}` : ''].filter(Boolean).join(' · ');
        return `${i + 1}. ${l.name} — ${l.phone}${extras ? ` (${extras})` : ''}`;
      })
      .join('\n');

    await fetch(LARK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: `📋 Digest khách mới — ${today}\n━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━\n✅ Tổng ${leads.length} khách mới trong 24h` },
      }),
    });

    return res.json({ ok: true, sent: true, count: leads.length });
  } catch (err: any) {
    console.error('[cron-digest]', err);
    return res.status(500).json({ error: err.message });
  }
}
