// C2: Cảnh báo khách mới chưa liên hệ >48h → Lark, chạy lúc 8:30 sáng (giờ VN)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const LARK_URL = process.env.LARK_WEBHOOK_URL || 'https://open.larksuite.com/open-apis/bot/v2/hook/addf1821-ec82-4dcb-8ae6-327006f2acf5';
const CRON_SECRET = process.env.CRON_SECRET || '';

export default async function handler(req: any, res: any) {
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/consultations?status=eq.new&created_at=lt.${encodeURIComponent(cutoff)}&select=name,phone,source,favorite_ids,lucky_gift,created_at&order=created_at.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );

    if (!resp.ok) throw new Error(`Supabase error: ${resp.status}`);
    const stale = await resp.json() as any[];

    if (stale.length === 0) {
      return res.json({ ok: true, sent: false, reason: 'Không có lead stale' });
    }

    const list = stale
      .map((l, i) => {
        const hoursOld = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 3600000);
        const hot = (l.favorite_ids?.length >= 3 || l.lucky_gift) ? '🔥' : '';
        return `${i + 1}. ${hot}${l.name} — ${l.phone} (${hoursOld}h chưa liên hệ)`;
      })
      .join('\n');

    await fetch(LARK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: `teamsaleh2o\n⚠️ Khách chưa được liên hệ trên 48h\n━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━\nCần xử lý ngay ${stale.length} lead!` },
      }),
    });

    return res.json({ ok: true, sent: true, count: stale.length });
  } catch (err: any) {
    console.error('[cron-stale]', err);
    return res.status(500).json({ error: err.message });
  }
}
