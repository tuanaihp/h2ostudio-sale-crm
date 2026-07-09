# SECURITY_AUDIT_LOG — H2O Studio Sale Album

## 2026-07-09 — FABLE 5 Audit (Claude Sonnet 4.6)

**Scope:** Full repo audit — React 19 + Vite + Supabase + Vercel + Cloudflare R2  
**Môi trường:** Production (Vercel branch main)  
**Người audit:** Claude Sonnet 4.6 (AI agent, FABLE 5 skill v1.2.0)

### Findings

| ID | Mức | Tiêu đề | Trạng thái |
|----|-----|---------|------------|
| H2O-SEC-001 | CRITICAL | user_roles privilege escalation — any authenticated user tự promote admin | Fixed (supabase_security_fix_v2.sql) |
| H2O-SEC-002 | CRITICAL | Old RLS policies không drop — security fix v1 không có hiệu lực | Fixed (supabase_security_fix_v2.sql) |
| H2O-SEC-003 | HIGH | settings table public read tồn tại token nhạy cảm | Partial — RPC đã có, cần drop policy cũ (xem v2) |
| H2O-SEC-004 | HIGH | styles/albums/photos write = any authenticated | Fixed (supabase_security_fix_v2.sql) |
| H2O-SEC-005 | HIGH | localStorage phone dùng trong isAdmin → F12 bypass | Fixed (AuthContext.tsx) |
| H2O-SEC-006 | MEDIUM | CRON_SECRET optional — cron endpoints không auth nếu không set | Todo — kiểm Vercel Dashboard |
| H2O-SEC-007 | MEDIUM | xlsx prototype pollution — no fix available | Todo — theo dõi advisory |
| H2O-SEC-008 | MEDIUM | ws memory exhaustion | Fixed (npm audit fix) |
| H2O-SEC-009 | MEDIUM | Thiếu security headers | Todo — thêm vercel.json |
| H2O-SEC-010 | LOW | dangerouslySetInnerHTML trong PartnerBrandsIcons (CSS only, không phải user input) | Todo — refactor khi tiện |

### Block đã thực hiện

| Hành động | Trạng thái |
|-----------|------------|
| Tạo supabase_security_fix_v2.sql — drop old policies + fix user_roles + settings + content tables | Tạo file, chờ user chạy trong Supabase SQL Editor |
| Sửa AuthContext.tsx — loại bỏ localStorage phone khỏi isAdmin | Done — committed |
| npm audit fix — vá ws vulnerability | Done — committed |

### Kết luận

**CHƯA ĐƯỢC DEPLOY** tới khi chạy `supabase_security_fix_v2.sql` vì còn H2O-SEC-001 (privilege escalation trong user_roles).

---

## 2026-07-09 — Security pre-fix (trước audit FABLE 5)

- Tạo `get_public_settings()` RPC — strip sensitive tokens khỏi settings read
- Cập nhật `SettingsContext.tsx` — admin dùng table, public dùng RPC
- Tạo `api/embed.ts` + `api/vector-synthesis.ts` — Bot V3 hoạt động trên Vercel production
- Cài `@types/react` — fix TypeScript declaration errors
