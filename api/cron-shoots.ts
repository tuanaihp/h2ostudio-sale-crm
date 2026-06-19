// C3: Nhắc lịch chụp ngày mai → Lark, chạy lúc 17:00 chiều (giờ VN)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const LARK_URL = process.env.LARK_WEBHOOK_URL || 'https://open.larksuite.com/open-apis/bot/v2/hook/addf1821-ec82-4dcb-8ae6-327006f2acf5';
const CRON_SECRET = process.env.CRON_SECRET || '';

export default async function handler(req: any, res: any) {
  if (CRON_SECRET && req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Tính ngày mai theo giờ Việt Nam (UTC+7)
    const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const tomorrowVN = new Date(vnNow);
    tomorrowVN.setDate(tomorrowVN.getDate() + 1);
    const tomorrowStr = tomorrowVN.toISOString().split('T')[0]; // YYYY-MM-DD

    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/consultations?shooting_date=eq.${tomorrowStr}&select=name,phone,assigned_to,contract_value,notes&order=name.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );

    if (!resp.ok) throw new Error(`Supabase error: ${resp.status}`);
    const shoots = await resp.json() as any[];

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

    await fetch(LARK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: `teamsaleh2o\n📸 Lịch chụp ngày mai — ${displayDate}\n━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━\nChuẩn bị cho ${shoots.length} buổi chụp!` },
      }),
    });

    return res.json({ ok: true, sent: true, count: shoots.length, date: tomorrowStr });
  } catch (err: any) {
    console.error('[cron-shoots]', err);
    return res.status(500).json({ error: err.message });
  }
}
