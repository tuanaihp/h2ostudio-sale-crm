// C2: Cảnh báo khách mới chưa liên hệ >48h → Lark, chạy lúc 8:30 sáng (giờ VN)
import { requireCronAuth, querySupabase, sendLark } from './_cron';

export default async function handler(req: any, res: any) {
  if (!requireCronAuth(req, res)) return;

  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const stale = await querySupabase(
      `consultations?status=eq.new&created_at=lt.${encodeURIComponent(cutoff)}&select=name,phone,source,favorite_ids,lucky_gift,created_at&order=created_at.asc`
    );

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

    const sent = await sendLark(
      `teamsaleh2o\n⚠️ Khách chưa được liên hệ trên 48h\n━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━\nCần xử lý ngay ${stale.length} lead!`
    );

    return res.json({ ok: true, sent, count: stale.length });
  } catch (err: any) {
    console.error('[cron-stale]', err);
    return res.status(500).json({ error: 'Cron failed' });
  }
}
