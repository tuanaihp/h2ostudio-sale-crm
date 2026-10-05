// H2O Studio Sale Album — Cổng MCP chuẩn H2O cho Joyce OS.
// Transport: POST JSON-RPC 2.0 (initialize / notifications/initialized /
//            tools/list / tools/call)
// Xác thực: Authorization: Bearer <H2O_MCP_TOKEN>
// Chỉ phơi tool ĐỌC — consultations/styles/albums là tài sản CRM của app.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const MCP_TOKEN = process.env.H2O_MCP_TOKEN || '';

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SERVER = { name: 'h2ostudio-sale-album', version: '1.0.0' };
const PROTOCOL = '2025-06-18';

type Args = Record<string, unknown>;
const lim = (a: Args, def = 20, max = 50) => {
  const n = Number(a.limit);
  return Number.isFinite(n) ? Math.max(1, Math.min(max, Math.floor(n))) : def;
};

async function countCol(table: string, filter?: (q: any) => any): Promise<number | null> {
  let q = sb().from(table).select('id', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

const TOOLS = [
  {
    name: 'studio_health',
    description: 'Sức khoẻ app + tổng consultations / styles / albums / photos.',
    inputSchema: { type: 'object', properties: {} },
    async run() {
      return {
        ok: true,
        app: 'h2ostudio-sale-album',
        totals: {
          consultations: await countCol('consultations'),
          styles: await countCol('styles', (q) => q.eq('deleted', false)),
          albums: await countCol('albums', (q) => q.eq('deleted', false)),
          photos: await countCol('photos', (q) => q.eq('deleted', false)),
        },
      };
    },
  },
  {
    name: 'studio_report',
    description: 'Báo cáo lead: consultations theo status, lead mới hôm nay, lead quá hạn (>48h chưa gọi), doanh thu HĐ tháng này.',
    inputSchema: { type: 'object', properties: {} },
    async run() {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const staleBefore = new Date(now.getTime() - 48 * 3600_000).toISOString();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: all } = await sb().from('consultations')
        .select('status, created_at, contract_value');
      const byStatus: Record<string, number> = {};
      let newToday = 0, staleNew = 0, revenueMonth = 0;
      for (const c of all || []) {
        byStatus[c.status || 'unknown'] = (byStatus[c.status || 'unknown'] || 0) + 1;
        if (c.created_at >= todayStart.toISOString()) newToday += 1;
        if (c.status === 'new' && c.created_at < staleBefore) staleNew += 1;
        if (c.status === 'registered' && c.created_at >= monthStart) revenueMonth += Number(c.contract_value || 0);
      }
      return {
        leadsByStatus: byStatus,
        newLeadsToday: newToday,
        staleLeadsOver48h: staleNew,
        contractRevenueThisMonthVnd: revenueMonth,
      };
    },
  },
  {
    name: 'studio_list_consultations',
    description: 'Lead tư vấn gần nhất. Args: limit, status (new|contacted|registered).',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'string' } } },
    async run(a: Args) {
      let q = sb().from('consultations')
        .select('id, name, phone, status, message, source, shooting_date, wedding_date, contract_value, follow_up_date, tags, created_at')
        .order('created_at', { ascending: false }).limit(lim(a));
      if (a.status) q = q.eq('status', String(a.status));
      const { data, error } = await q;
      return error ? { error: error.message } : data;
    },
  },
  {
    name: 'studio_upcoming_shoots',
    description: 'Lịch chụp sắp tới (consultations có shooting_date trong N ngày). Args: days (mặc định 7).',
    inputSchema: { type: 'object', properties: { days: { type: 'number' } } },
    async run(a: Args) {
      const days = Number.isFinite(Number(a.days)) ? Math.max(1, Number(a.days)) : 7;
      const today = new Date().toISOString().slice(0, 10);
      const until = new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);
      const { data, error } = await sb().from('consultations')
        .select('id, name, phone, status, shooting_date, wedding_date, contract_value')
        .gte('shooting_date', today).lte('shooting_date', until)
        .order('shooting_date').limit(50);
      return error ? { error: error.message } : data;
    },
  },
];

// ── WRITE (giới hạn hẹp) — mặc định TẮT, bật bằng H2O_MCP_WRITE=1 ────────────
// Chỉ được đổi status / notes / follow_up_date của 1 consultation theo id —
// không xoá, không sửa tiền HĐ, không đụng bảng khác.
const WRITE_TOOLS = new Set(['studio_update_consultation']);
const writeOn = () => ['1', 'true', 'on'].includes((process.env.H2O_MCP_WRITE || '').toLowerCase());

const WRITE_TOOL_DEFS = [
  {
    name: 'studio_update_consultation',
    description:
      'Cập nhật 1 lead tư vấn: status (new|contacted|registered), notes, follow_up_date (YYYY-MM-DD). ' +
      'Args: id (bắt buộc), status?, notes?, follow_up_date?.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['new', 'contacted', 'registered'] },
        notes: { type: 'string' },
        follow_up_date: { type: 'string' },
      },
      required: ['id'],
    },
    async run(a: Args) {
      const patch: Record<string, unknown> = {};
      if (a.status !== undefined) {
        const st = String(a.status);
        if (!['new', 'contacted', 'registered'].includes(st))
          return { error: `status "${st}" không hợp lệ (new|contacted|registered).` };
        patch.status = st;
      }
      if (a.notes !== undefined) patch.notes = String(a.notes).slice(0, 2000);
      if (a.follow_up_date !== undefined) {
        const d = String(a.follow_up_date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: 'follow_up_date phải YYYY-MM-DD.' };
        patch.follow_up_date = d;
      }
      if (!Object.keys(patch).length) return { error: 'Không có field nào để cập nhật.' };
      const { data, error } = await sb().from('consultations')
        .update(patch).eq('id', String(a.id))
        .select('id, name, status, notes, follow_up_date').maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: 'Không tìm thấy lead.' };
      return { updated: true, consultation: data };
    },
  },
];

const ALL_TOOLS = [...TOOLS, ...WRITE_TOOL_DEFS];
const TOOL_INDEX: Record<string, (typeof ALL_TOOLS)[number]> =
  Object.fromEntries(ALL_TOOLS.map((t) => [t.name, t]));

// Vercel serverless handler (api/mcp.ts → /api/mcp)
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, mcp-session-id');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!MCP_TOKEN) return res.status(503).json({ error: 'H2O_MCP_TOKEN chưa cấu hình.' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(503).json({ error: 'Supabase server env chưa cấu hình.' });
  if ((req.headers.authorization || '') !== `Bearer ${MCP_TOKEN}`)
    return res.status(401).json({ error: 'Sai hoặc thiếu Bearer token.' });

  const msg = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const id = msg.id ?? null;
  const reply = (result: unknown) => res.status(200).json({ jsonrpc: '2.0', id, result });
  const rpcErr = (code: number, m: string) => res.status(200).json({ jsonrpc: '2.0', id, error: { code, message: m } });

  switch (msg.method) {
    case 'initialize':
      return reply({ protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: SERVER });
    case 'notifications/initialized':
    case 'initialized':
      return res.status(202).end();
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({
        tools: (writeOn() ? ALL_TOOLS : TOOLS)
          .map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      });
    case 'tools/call': {
      const name = String(msg.params?.name || '');
      if (WRITE_TOOLS.has(name) && !writeOn())
        return rpcErr(-32601, `Tool "${name}" đang tắt — đặt H2O_MCP_WRITE=1 trên server để mở.`);
      const tool = TOOL_INDEX[name];
      if (!tool) return rpcErr(-32602, `Không có tool "${name}".`);
      try {
        const data = await tool.run(msg.params?.arguments || {});
        return reply({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
      } catch (e) {
        return reply({ content: [{ type: 'text', text: `Lỗi: ${e instanceof Error ? e.message : String(e)}` }], isError: true });
      }
    }
    default:
      return rpcErr(-32601, `Method "${msg.method}" không hỗ trợ.`);
  }
}
