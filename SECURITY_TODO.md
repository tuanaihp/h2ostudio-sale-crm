# SECURITY_TODO — H2O Studio Sale Album
Audit: FABLE 5 | Ngày: 2026-07-09

## CRITICAL — Chặn trước khi deploy

- [x] **H2O-SEC-001**: user_roles privilege escalation — sửa bằng `supabase_security_fix_v2.sql`
- [x] **H2O-SEC-002**: Old RLS policies chưa drop — drop + recreate bằng `supabase_security_fix_v2.sql`
- [x] **H2O-SEC-005**: localStorage phone dùng cho isAdmin — sửa `AuthContext.tsx`

## HIGH — Sửa trước khi go-live

- [ ] **H2O-SEC-003**: settings table vẫn public read (`USING (true)`) — chạy phần DROP trong `supabase_security_fix_v2.sql` sau khi đã xác nhận RPC hoạt động
- [x] **H2O-SEC-004**: styles/albums/photos write = any authenticated — sửa trong `supabase_security_fix_v2.sql`

## MEDIUM — Sprint tiếp theo

- [ ] **H2O-SEC-006**: CRON_SECRET phải được set trong Vercel env vars (kiểm tra Vercel Dashboard)
- [ ] **H2O-SEC-007**: `xlsx` prototype pollution — không có fix, theo dõi; cân nhắc thay bằng `exceljs`
- [ ] **H2O-SEC-008**: `ws` memory exhaustion — chạy `npm audit fix` (đã fix trong session này)
- [ ] **H2O-SEC-009**: Thiếu security headers — thêm vào `vercel.json`

## LOW — Dọn dần

- [ ] **H2O-SEC-010**: `dangerouslySetInnerHTML` trong PartnerBrandsIcons.tsx — chuyển sang Emotion/CSS class để tránh dùng pattern nguy hiểm dù hiện tại an toàn
