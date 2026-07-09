# SECURITY_RULES — H2O Studio Sale Album
Phiên bản: 1.0 | Ngày: 2026-07-09 | Audit: FABLE 5

## 15 Luật bất biến (áp dụng mọi PR)

1. **Không hardcode secret** — tất cả key/token/password vào `.env` (Vercel env vars), không commit.
2. **service_role chỉ ở backend** — không bao giờ để Supabase service_role key ở frontend bundle.
3. **Không password plaintext** — dự án này không quản lý password trực tiếp (Supabase Auth xử lý).
4. **Không tin dữ liệu từ client** — mọi kiểm tra quyền phải dựa vào JWT/DB, không dựa vào body/localStorage/header client gửi.
5. **API private phải verify auth** — mọi endpoint admin phải kiểm `Authorization` header hoặc Supabase session.
6. **API quan trọng verify ROLE** — role lấy từ `user_roles` DB, không từ req.body hay localStorage.
7. **Bảng nhạy cảm bật RLS** — `consultations`, `user_roles`, `settings`, `customer_faqs` phải có RLS đúng theo role.
8. **Không `USING (true)` trên bảng nhạy cảm** — settings chứa token → phải dùng `get_public_settings()` RPC thay vì đọc thẳng bảng.
9. **user_roles chỉ super_admin mới quản lý** — không để user tự INSERT/UPDATE role của mình.
10. **Không dùng localStorage làm bằng chứng quyền** — `isAdmin` phải đến từ Supabase JWT session, không từ localStorage phone.
11. **Storage ảnh khách private** — nếu ảnh chỉ cho client xem, bucket phải private + signed URL.
12. **Không log token/phone/auth** — không `console.log` giá trị nhạy cảm ra production.
13. **Mọi lần sửa bảo mật → ghi audit log** — ghi vào `SECURITY_AUDIT_LOG.md`.
14. **CRON_SECRET phải set** — không để cron job endpoints không có auth.
15. **Frontend chỉ ẩn/hiện UI** — quyết định quyền thật nằm ở RLS + API guard, không phải ở FE code.

## Ma trận role

| Role | Đọc public | Đọc consultations | Ghi/xoá content | Quản lý user_roles |
|------|-----------|-------------------|-----------------|--------------------|
| anon | ✅ (styles, albums, photos) | ❌ | ❌ | ❌ |
| authenticated (client) | ✅ | ❌ | ❌ | ❌ |
| staff | ✅ | ✅ | ✅ | ❌ |
| admin | ✅ | ✅ | ✅ | ❌ |
| superadmin | ✅ | ✅ | ✅ | ✅ |
