# SECURITY_AUDIT_LOG — H2O Studio Sale Album

## 2026-07-12 — Web Security Handbook Audit (30 rules, OWASP-based)

**Scope:** Full-pass audit theo web-security-handbook-master (30 rules)  
**Cơ sở:** OWASP Top 10 (2021), OWASP ASVS, OWASP SAMM, NIST CSF  
**Người audit:** Claude Sonnet 4.6 (AI agent)

### Kết quả đánh giá 30 rules

| Rule | Tên | Trạng thái | Ghi chú |
|------|-----|-----------|---------|
| RULE-01 | Không hardcode secret | PASS | .env + gitignore đúng |
| RULE-02 | Tách anon key / service key | PASS | Frontend dùng anon key, RLS guard |
| RULE-03 | Auth mọi API thay đổi data | FAIL | Xem H2O-SEC-011 |
| RULE-04 | Không gọi DB trực tiếp từ frontend | WARN | Dùng Supabase client — OK khi RLS đúng |
| RULE-05 | Phân quyền ở server | PARTIAL | RLS đang fix; localStorage fixed |
| RULE-06 | Danh tính từ token, không từ body | PASS | Supabase dùng auth.uid() |
| RULE-07 | Validate & whitelist input | FAIL | Xem H2O-SEC-013 |
| RULE-08 | Chống SQL Injection | PASS | Supabase parameterized queries |
| RULE-09 | Encode output trước khi render | PASS | React auto-escape; escHtml() trong API |
| RULE-10 | Content-Security-Policy | FIXED | Thêm vào vercel.json (2026-07-12) |
| RULE-11 | Không dùng CSS ẩn nội dung nhạy cảm | PASS | N/A |
| RULE-12 | Session cookie HttpOnly+Secure | WARN | Supabase token trong localStorage |
| RULE-13 | CSRF protection | PASS | Bearer token, không cookie |
| RULE-14 | Hash password | PASS | Google OAuth, không quản lý password |
| RULE-15 | Rate limit endpoints nhạy cảm | FAIL | Xem H2O-SEC-015 |
| RULE-16 | Rate limit trên serverless = Redis | FAIL | Xem H2O-SEC-016 |
| RULE-17 | RLS trên mọi bảng | PARTIAL | Policies đang fix (supabase_security_fix_v2.sql) |
| RULE-18 | Data trả phí qua API auth | N/A | Không có nội dung trả phí |
| RULE-19 | HTTPS + security headers | FIXED | Thêm HSTS/X-Frame/CSP vào vercel.json (2026-07-12) |
| RULE-20 | Không trả lỗi chi tiết về client | FIXED | telegram-notify + lark-notify fixed (2026-07-12) |
| RULE-21 | Quét & cập nhật dependency | PARTIAL | Dependabot setup (2026-07-12); xlsx còn lỗ hổng |
| RULE-22 | CI/CD security pipeline | FIXED | .github/workflows/security.yml (2026-07-12) |
| RULE-23 | DAST | PARTIAL | ZAP job trong security.yml, cần STAGING_URL |
| RULE-24 | WAF & DDoS | WARN | Vercel built-in; không có WAF |
| RULE-25 | Audit log + cảnh báo | WARN | Log thủ công (file này); không có SIEM |
| RULE-26 | Hardening VPS/Docker | N/A | Vercel managed, không self-host |
| RULE-27 | IAM & Secrets management | WARN | Vercel env vars — OK cho quy mô này |
| RULE-28 | Admin MFA | FAIL | Xem H2O-SEC-017 |
| RULE-29 | Backup 3-2-1 | FAIL | Xem H2O-SEC-018 |
| RULE-30 | Pentest định kỳ | WARN | Đang thực hiện audit thủ công |

### Findings mới (từ handbook audit)

| ID | Mức | Tiêu đề | Trạng thái |
|----|-----|---------|------------|
| H2O-SEC-011 | HIGH | API handlers không có auth (lark-notify, telegram-notify, ai-image, ai-promo, chat, embed) | Todo — thêm CRON_SECRET hoặc shared secret |
| H2O-SEC-012 | HIGH | SSRF trong lark-notify.ts — nhận webhookUrl từ body | Fixed (2026-07-12) |
| H2O-SEC-013 | MEDIUM | Không có input validation (Zod) trong API handlers | Todo |
| H2O-SEC-014 | MEDIUM | telegram-notify.ts nhận botToken/chatId từ body — abuse risk | Fixed (2026-07-12) |
| H2O-SEC-015 | MEDIUM | Hầu hết API endpoints không có rate limiting | Todo — ưu tiên ai-promo, ai-image |
| H2O-SEC-016 | MEDIUM | In-memory rate limit trong embed.ts + vector-synthesis.ts không hiệu quả trên Vercel | Todo — Upstash Redis |
| H2O-SEC-017 | LOW | Admin chưa có MFA bắt buộc | Todo — Supabase Auth MFA |
| H2O-SEC-018 | LOW | Không có backup database (Supabase free tier) | Todo — pg_dump weekly + R2 |

### Fixes thực hiện (2026-07-12)

| Hành động | File | Status |
|-----------|------|--------|
| Thêm security headers (HSTS, CSP, X-Frame, X-Content-Type, Referrer, Permissions) | vercel.json | Done |
| Setup GitHub Actions CI security pipeline (CodeQL + Gitleaks + npm audit + ZAP) | .github/workflows/security.yml | Done |
| Setup Dependabot tự động cập nhật dependency | .github/dependabot.yml | Done |
| Fix SSRF — lark-notify.ts không nhận webhookUrl từ body | api/lark-notify.ts | Done |
| Fix credential abuse — telegram-notify.ts không nhận botToken/chatId từ body | api/telegram-notify.ts | Done |
| Fix error disclosure — trả lỗi generic thay vì err.message | api/telegram-notify.ts, api/lark-notify.ts | Done |
| Xóa hardcoded Lark webhook URL khỏi source code | api/lark-notify.ts | Done |

---

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
| H2O-SEC-009 | MEDIUM | Thiếu security headers | Fixed (vercel.json 2026-07-12) |
| H2O-SEC-010 | LOW | dangerouslySetInnerHTML trong PartnerBrandsIcons (CSS only) | Todo — refactor khi tiện |

### Block đã thực hiện

| Hành động | Trạng thái |
|-----------|------------|
| Tạo supabase_security_fix_v2.sql — drop old policies + fix user_roles + settings + content tables | Tạo file, chờ user chạy trong Supabase SQL Editor |
| Sửa AuthContext.tsx — loại bỏ localStorage phone khỏi isAdmin | Done — committed |
| npm audit fix — vá ws vulnerability | Done — committed |

### Kết luận FABLE 5

**CHƯA AN TOÀN HOÀN TOÀN** tới khi chạy `supabase_security_fix_v2.sql` trong Supabase SQL Editor (H2O-SEC-001: privilege escalation vẫn đang tồn tại trong database).

---

## 2026-07-09 — Security pre-fix (trước audit FABLE 5)

- Tạo `get_public_settings()` RPC — strip sensitive tokens khỏi settings read
- Cập nhật `SettingsContext.tsx` — admin dùng table, public dùng RPC
- Tạo `api/embed.ts` + `api/vector-synthesis.ts` — Bot V3 hoạt động trên Vercel production
- Cài `@types/react` — fix TypeScript declaration errors
