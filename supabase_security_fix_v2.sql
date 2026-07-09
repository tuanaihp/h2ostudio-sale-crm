-- ============================================================
-- H2O Studio — Security Fix V2 (FABLE 5 Audit 2026-07-09)
-- Chạy TOÀN BỘ file này trong Supabase SQL Editor
-- Thay thế hoàn toàn supabase_security_fix.sql (v1 chưa drop old policies)
-- ============================================================

-- ── 1. STYLES — drop old, tạo mới chỉ admin/staff ────────────────────────────
DROP POLICY IF EXISTS "write_styles" ON styles;
DROP POLICY IF EXISTS "allow_write_styles" ON styles;

CREATE POLICY "write_styles" ON styles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  );

-- ── 2. ALBUMS — drop old, tạo mới chỉ admin/staff ───────────────────────────
DROP POLICY IF EXISTS "write_albums" ON albums;
DROP POLICY IF EXISTS "allow_write_albums" ON albums;

CREATE POLICY "write_albums" ON albums
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  );

-- ── 3. PHOTOS — drop old, tạo mới chỉ admin/staff ───────────────────────────
DROP POLICY IF EXISTS "write_photos" ON photos;
DROP POLICY IF EXISTS "allow_write_photos" ON photos;

CREATE POLICY "write_photos" ON photos
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  );

-- ── 4. CONSULTATIONS — drop old (cả tên cũ + tên mới từ v1), tạo lại ─────────
DROP POLICY IF EXISTS "insert_consultation" ON consultations;
DROP POLICY IF EXISTS "manage_consultations" ON consultations;
DROP POLICY IF EXISTS "update_consultation" ON consultations;
DROP POLICY IF EXISTS "delete_consultation" ON consultations;
DROP POLICY IF EXISTS "allow_insert_consultations" ON consultations;
DROP POLICY IF EXISTS "allow_update_consultations" ON consultations;
DROP POLICY IF EXISTS "allow_delete_consultations" ON consultations;

-- Khách gửi form: không cần đăng nhập
CREATE POLICY "insert_consultation" ON consultations
  FOR INSERT WITH CHECK (true);

-- Chỉ admin/staff xem danh sách khách hàng
CREATE POLICY "manage_consultations" ON consultations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  );

-- Chỉ admin/staff cập nhật thông tin khách
CREATE POLICY "update_consultation" ON consultations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  );

-- Chỉ admin xoá
CREATE POLICY "delete_consultation" ON consultations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin'))
  );

-- ── 5. USER_ROLES — CRITICAL: drop "manage_roles" cho phép tự promote ─────────
-- NGUY HIỂM: manage_roles FOR ALL = authenticated → bất kỳ user đăng nhập có thể
-- self-promote lên admin bằng: supabase.from('user_roles').insert({ role: 'admin' })
DROP POLICY IF EXISTS "manage_roles" ON user_roles;
DROP POLICY IF EXISTS "read_own_role" ON user_roles;
DROP POLICY IF EXISTS "allow_read_roles" ON user_roles;
DROP POLICY IF EXISTS "allow_manage_roles" ON user_roles;

-- User chỉ đọc được role của chính mình
CREATE POLICY "read_own_role" ON user_roles
  FOR SELECT USING (auth.uid() = id);

-- Chỉ super_admin mới thêm/sửa/xoá roles
CREATE POLICY "manage_roles" ON user_roles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('superadmin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('superadmin', 'super_admin'))
  );

-- ── 6. SETTINGS — tạo lại write policy (drop v1 tên cũ) ──────────────────────
DROP POLICY IF EXISTS "write_settings" ON settings;
DROP POLICY IF EXISTS "allow_update_settings" ON settings;

CREATE POLICY "write_settings" ON settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin'))
  );

-- ── 7. SETTINGS READ — hạn chế đọc trực tiếp (dùng get_public_settings() RPC) ─
-- Sau khi đã xác nhận SettingsContext dùng RPC, uncomment các dòng dưới:
-- DROP POLICY IF EXISTS "read_settings" ON settings;
-- CREATE POLICY "read_settings" ON settings
--   FOR SELECT USING (
--     EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
--   );
--
-- Tạm thời giữ USING (true) để app không bị vỡ trong khi chuyển đổi.
-- Đảm bảo get_public_settings() đã được tạo (từ supabase_security_fix.sql).

-- ── 8. CUSTOMER_FAQS — đảm bảo RLS đúng ──────────────────────────────────────
ALTER TABLE customer_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "allow_insert_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "allow_update_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "allow_delete_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "public_read_faqs" ON customer_faqs;

-- Khách hàng (widget chat) đọc FAQ để bot trả lời
CREATE POLICY "public_read_faqs" ON customer_faqs
  FOR SELECT USING (true);

-- Chỉ admin/staff thêm/sửa/xoá FAQ
CREATE POLICY "allow_insert_faqs" ON customer_faqs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  );

CREATE POLICY "allow_update_faqs" ON customer_faqs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin'))
  );

CREATE POLICY "allow_delete_faqs" ON customer_faqs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin'))
  );

-- ── 9. BOT_MESSAGE_FEEDBACK — nếu bảng đã tồn tại ────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot_message_feedback') THEN
    DROP POLICY IF EXISTS "allow_delete_feedback" ON bot_message_feedback;
    EXECUTE $p$
      CREATE POLICY "allow_delete_feedback" ON bot_message_feedback
        FOR DELETE USING (
          EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin'))
        )
    $p$;
  END IF;
END $$;

-- ── 10. Xác nhận get_public_settings() đã tồn tại ────────────────────────────
-- (Đã tạo trong supabase_security_fix.sql — chỉ kiểm tra lại)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_public_settings') THEN
    RAISE NOTICE 'CẢNH BÁO: get_public_settings() chưa được tạo. Chạy supabase_security_fix.sql trước!';
  ELSE
    RAISE NOTICE 'OK: get_public_settings() đã tồn tại.';
  END IF;
END $$;

-- ============================================================
-- XONG! Kiểm tra lại bằng cách vào Authentication → Policies trong Supabase Dashboard
-- Mỗi bảng nhạy cảm phải KHÔNG còn policy nào dùng USING (auth.role() = 'authenticated')
-- ngoại trừ: consultations INSERT (USING true) và customer_faqs SELECT (USING true)
-- ============================================================
