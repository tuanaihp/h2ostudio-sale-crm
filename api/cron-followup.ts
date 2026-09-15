// C4: Nhắc lead mới chưa được gọi sau 2h — Lark + Telegram.
// LƯU Ý: endpoint này không nằm trong vercel.json crons — gọi tay qua
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron-followup
// hoặc thêm vào vercel.json nếu muốn schedule.
import { requireCronAuth, querySupabase, sendLark, sendTelegram } from './_cron';

export default async function handler(req: any, res: any) {
  if (!requireCronAuth(req, res)) return;

  try {
    // Lead mới 2–6h chưa được gọi (chưa có trạng thái called/contacted)
    const from6h = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const to2h   = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const leads = await querySupabase(
      `consultations?status=eq.new&created_at=gt.${encodeURIComponent(from6h)}&created_at=lt.${encodeURIComponent(to2h)}&select=name,phone,source,favorite_ids,lucky_gift,created_at&order=created_at.asc`
    );

    if (leads.length === 0) {
      return res.json({ ok: true, sent: false, reason: 'Không có lead mới 2–6h' });
    }

    const list = leads.map((l, i) => {
      const mins = Math.floor((Date.now() - new Date(l.created_at).getTime()) / 60000);
      const hot = (l.favorite_ids?.length >= 3 || l.lucky_gift) ? '🔥 ' : '';
      return `${i + 1}. ${hot}${l.name} — ${l.phone} (${mins}p chưa gọi)`;
    }).join('\n');

    const msg = `teamsaleh2o\n⏰ Khách mới chưa được gọi — Gọi ngay!\n━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━\n⚡ Gọi sớm trong 5 phút tỉ lệ chốt cao nhất!`;

    const [larkOk, tgOk] = await Promise.all([sendLark(msg), sendTelegram(msg)]);
    return res.json({ ok: true, sent: larkOk || tgOk, count: leads.length });
  } catch (err: any) {
    console.error('[cron-followup]', err);
    return res.status(500).json({ error: 'Cron failed' });
  }
}
