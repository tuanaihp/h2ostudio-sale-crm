// Gộp 4 cron jobs vào 1 function (Hobby giới hạn 12 functions).
//   /api/cron?job=digest   — digest khách mới 24h → Lark (8:00 VN)
//   /api/cron?job=stale    — khách chưa liên hệ >48h → Lark (8:30 VN)
//   /api/cron?job=shoots   — lịch chụp ngày mai → Lark (17:00 VN)
//   /api/cron?job=followup — lead mới 2–6h chưa gọi → Lark + Telegram (gọi tay)
import { requireCronAuth, querySupabase, sendLark, sendTelegram } from './_cron';

const VN_TZ = { timeZone: 'Asia/Ho_Chi_Minh' };

async function jobDigest(req: any, res: any) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const leads = await querySupabase(
    `consultations?status=eq.new&created_at=gte.${encodeURIComponent(since)}&select=name,phone,source,lucky_gift,created_at&order=created_at.desc`
  );

  if (leads.length === 0) {
    return res.json({ ok: true, sent: false, reason: 'Không có khách mới trong 24h' });
  }

  const today = new Date().toLocaleDateString('vi-VN', { ...VN_TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
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
}

async function jobStale(req: any, res: any) {
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
}

async function jobShoots(req: any, res: any) {
  // Tính ngày mai theo giờ Việt Nam (UTC+7)
  const vnNow = new Date(new Date().toLocaleString('en-US', VN_TZ));
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
}

async function jobFollowup(req: any, res: any) {
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
}

const JOBS: Record<string, (req: any, res: any) => any> = {
  digest: jobDigest,
  stale: jobStale,
  shoots: jobShoots,
  followup: jobFollowup,
};

export default async function handler(req: any, res: any) {
  if (!requireCronAuth(req, res)) return;

  const job = JOBS[(req.query?.job || '').toString()];
  if (!job) return res.status(400).json({ error: 'Missing/invalid ?job= (digest|stale|shoots|followup)' });

  try {
    return await job(req, res);
  } catch (err: any) {
    console.error('[cron]', err);
    return res.status(500).json({ error: 'Cron failed' });
  }
}
