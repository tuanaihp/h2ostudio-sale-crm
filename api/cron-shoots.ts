// C3: Nhắc lịch chụp ngày mai → Lark, chạy lúc 17:00 chiều (giờ VN)
import { requireCronAuth, querySupabase, sendLark } from './_cron';

export default async function handler(req: any, res: any) {
  if (!requireCronAuth(req, res)) return;

  try {
    // Tính ngày mai theo giờ Việt Nam (UTC+7)
    const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const tomorrowVN = new Date(vnNow);
    tomorrowVN.setDate(tomorrowVN.getDate() + 1);
    const tomorrowStr = tomorrowVN.toISOString().split('T')[0]; // YYYY-MM-DD

    const shoots = await querySupabase(
      `consultations?shooting_date=eq.${tomorrowStr}&select=name,phone,assigned_to,contract_value,notes&order=name.asc`
    );

    if (shoots.length === 0) {
      return res.json({ ok: true, sent: false, reason: `Không có lịch chụp ngày ${tomorrowStr}` });
    }

    const displayDate = tomorrowVN.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const list = shoots
      .map((s, i) => {
        const staff = s.assigned_to ? ` · ${s.assigned_to}` : '';
        const value = s.contract_value ? ` · ${(s.contract_value / 1_000_000).toFixed(0)}tr` : '';
        return `${i + 1}. ${s.name} — ${s.phone}${staff}${value}`;
      })
      .join('\n');

    const sent = await sendLark(
      `teamsaleh2o\n📸 Lịch chụp ngày mai — ${displayDate}\n━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━\nChuẩn bị cho ${shoots.length} buổi chụp!`
    );

    return res.json({ ok: true, sent, count: shoots.length, date: tomorrowStr });
  } catch (err: any) {
    console.error('[cron-shoots]', err);
    return res.status(500).json({ error: 'Cron failed' });
  }
}
