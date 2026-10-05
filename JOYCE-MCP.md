# H2O Studio Sale Album — Cổng MCP cho Joyce OS

App deploy: root repo — Vite SPA + Supabase + Vercel serverless `api/*.ts`.
CRM lead nằm ở bảng `consultations` (xem CLAUDE.md §4).

## Endpoint

```
POST https://<domain-app>/api/mcp
```

File: `api/mcp.ts` (Vercel serverless, tự map thành route `/api/mcp`) —
JSON-RPC 2.0: `initialize`, `notifications/initialized`, `ping`,
`tools/list`, `tools/call`.

## Xác thực

```
Authorization: Bearer <H2O_MCP_TOKEN>
```

Env cần trên Vercel:

- `H2O_MCP_TOKEN` — chuỗi ngẫu nhiên ≥24 ký tự (server-side)
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — đã sẵn (api/_auth.ts,
  api/_cron.ts đang dùng). Không đặt → `503`.

## Tool phơi ra (chỉ đọc)

| Tool | Mô tả | Args |
|---|---|---|
| `studio_health` | Tổng consultations / styles / albums / photos | — |
| `studio_report` | Lead theo status, lead mới hôm nay, lead >48h chưa gọi, doanh thu HĐ tháng | — |
| `studio_list_consultations` | Lead gần nhất | `limit`, `status` |
| `studio_upcoming_shoots` | Lịch chụp trong N ngày tới | `days` (mặc định 7) |

**Ghi (mặc định TẮT — bật bằng `H2O_MCP_WRITE=1` trên Vercel):**

| `studio_update_consultation` | Đổi status / notes / follow_up_date của 1 lead | `id`, `status` (new/contacted/registered), `notes`, `follow_up_date` |

Chỉ update đúng 3 field trên 1 consultation theo id — không xoá, không sửa
giá trị HĐ. Bật khi muốn Joyce "đánh dấu lead đã gọi" qua Telegram.

`studio_report.staleLeadsOver48h` khớp rule `isStaleNew` trong
AdminConsultations (lead `new` tạo >48h trước).

## Cấu hình trong Joyce

Trang **Kết nối** → Thêm MCP → transport **HTTP**:

```
Tên:    h2ostudio-sale-album
URL:    https://<domain-app>/api/mcp
Header: Authorization: Bearer <H2O_MCP_TOKEN>
```

## Kiểm thử tay

```bash
curl -X POST https://<domain-app>/api/mcp \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"studio_report","arguments":{}}}'
```
