# RUNBOOK — Triển khai bảo mật H2O Sale Album lên Production

Code đã fix xong trong repo. Các bước dưới đây **bắt buộc làm tay** trên
Supabase/Vercel/Cloudflare dashboard — không làm thì lỗ hổng vẫn còn mở.

---

## BƯỚC 1 — Chạy migration Supabase (bắt buộc)

1. Supabase Dashboard → **SQL Editor** → New query
2. Dán TOÀN BỘ nội dung `supabase_security_fix_v3.sql` → Run
3. File idempotent — chạy lại nhiều lần không hại. Nếu báo NOTICE về
   `bot_feedback_unique_vote` → dọn data trùng rồi chạy lại.

**Kiểm chứng sau khi chạy:**

```sql
-- Không còn policy WRITE nào USING (true) ngoài các bảng public-insert
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

Các bảng được phép public-INSERT: `consultations`, `chat_sessions`,
`chat_messages`, `album_likes`, `bot_unmatched_logs`, `bot_message_feedback`,
`customer_faqs` (chỉ is_approved=false). Mọi bảng khác: write phải qua
`is_staff_or_above()` / `is_admin_or_above()`.

## BƯỚC 2 — Rotate toàn bộ secrets đã từng lộ

Các giá trị sau **đã nằm trong client bundle / settings public** → phải đổi
mới, không được dùng lại:

| Secret | Nơi rotate |
|---|---|
| Password `staff@h2ostudio.com` | Supabase → Authentication → Users (đổi pass hoặc xóa user) |
| Telegram bot token | @BotFather → `/revoke` → token mới → Vercel env `TELEGRAM_BOT_TOKEN` |
| Lark webhook URL | Lark group → Bot settings → webhook mới → Vercel env `LARK_WEBHOOK_URL` |
| R2 upload secret | Giá trị mới → cả Vercel env `R2_UPLOAD_SECRET` lẫn Worker env `UPLOAD_SECRET` |
| OpenAI/custom chat key (nếu đã lưu trong settings) | Provider dashboard → Vercel env |
| Gemini API key | Google AI Studio → Vercel env `GEMINI_API_KEY` |

## BƯỚC 3 — Vercel Environment Variables

Settings → Environment Variables (xem `.env.example` đầy đủ):

**Bắt buộc (server-only):**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — crons + RPC admin
- `CRON_SECRET` — random dài (vd `openssl rand -hex 32`); Vercel Cron gửi
  header `Authorization: Bearer <CRON_SECRET>`
- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `LARK_WEBHOOK_URL`, `LARK_KEYWORD`
- `R2_WORKER_URL`, `R2_UPLOAD_SECRET`

**Client (public):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_SCRIPT_URL` (nếu còn dùng Drive fallback)
- `VITE_ADMIN_EMAIL` — chỉ bootstrap fallback, có thể bỏ sau khi có super_admin

## BƯỚC 4 — Cloudflare Worker

1. Worker `r2-upload-worker.js` (bản mới đã validate path/MIME/size + fail-closed
   auth) → deploy lại: `wrangler deploy` hoặc paste vào dashboard.
2. Set secret mới: `wrangler secret put UPLOAD_SECRET` — phải khớp
   `R2_UPLOAD_SECRET` ở Vercel.

## BƯỚC 5 — Bootstrap admin đầu tiên

1. Deploy code mới → mở `/admin` → **đăng nhập Google** bằng email admin thật
   (cần bật Google provider trong Supabase → Authentication → Providers, thêm
   redirect URL của domain).
2. Sau khi login, chạy trong SQL Editor:
   ```sql
   select bootstrap_admin();
   ```
   → trả `true` là thành công (chỉ chạy được khi chưa có super_admin nào).
3. Vào `/admin` — phải thấy đầy đủ menu. Từ đây quản lý staff khác qua UI
   (user_roles) thay vì share password.

## BƯỚC 6 — Smoke test

| Test | Kỳ vọng |
|---|---|
| Ẩn danh mở site → chat với bot | Bot trả lời, tin nhắn lưu, badge unread hiện ở admin |
| F5 giữa phiên chat | Lịch sử chat còn nguyên (access_token trong localStorage) |
| Ẩn danh gọi `supabase.from('chat_sessions').select('*')` | Trả rỗng (RLS chặn) |
| Ẩn danh gọi `supabase.from('settings').select('*')` | Trả rỗng |
| PhoneGate nhập SĐT | Lead vào `consultations`, notify Telegram/Lark đến |
| Admin upload ảnh | Qua `/api/r2-upload`, thành công; không phải staff → 401/403 |
| Share link album lên Zalo/FB | Preview đúng ảnh+tên album (api/bot.ts OG) |
| Cron tay: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron-digest` | 200 + gửi Lark |

## BƯỚC 7 — Dọn dẹp còn lại (tùy chọn)

- `cron-followup` chưa được schedule trong `vercel.json` — endpoint đã bảo mật,
  thêm vào `crons[]` nếu muốn bật.
- Sitemap: khi có domain production, tạo `public/sitemap.xml` với URL tuyệt đối
  và uncomment dòng Sitemap trong `public/robots.txt`.
- Bundle chính ~684 kB — cân nhắc manualChunks nếu muốn tối ưu.
- Nếu Firebase project cũ (`gen-lang-client-0731961518`) không còn dùng → xóa
  project trên Google Cloud để khỏi lo dữ liệu cũ.
