// C1: Gửi digest khách mới 24h qua → Lark, chạy lúc 8:00 sáng (giờ VN)
import { requireCronAuth, querySupabase, sendLark } from './_cron';

export default async function handler(req: any, res: any) {
  if (!requireCronAuth(req, res)) return;

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const leads = await querySupabase(
      `consultations?status=eq.new&created_at=gte.${encodeURIComponent(since)}&select=name,phone,source,lucky_gift,created_at&order=created_at.desc`
    );

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

    const sent = await sendLark(
      `teamsaleh2o\n📋 Digest khách mới — ${today}\n━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━\n✅ Tổng ${leads.length} khách mới trong 24h`
    );

    return res.json({ ok: true, sent, count: leads.length });
  } catch (err: any) {
    console.error('[cron-digest]', err);
    return res.status(500).json({ error: 'Cron failed' });
  }
}
