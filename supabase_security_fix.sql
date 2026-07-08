-- ============================================================
-- H2O Studio — Security Fix (chạy trong Supabase SQL Editor)
-- ============================================================
-- 1. get_public_settings() — RPC trả về settings KHÔNG có thông tin nhạy cảm
-- 2. RLS write policies — chỉ cho phép admin/staff (không phải tất cả authenticated users)
-- 3. Hướng dẫn đổi bucket album-images thành private
-- ============================================================

-- ── 1. get_public_settings() ─────────────────────────────────────────────────
-- Hàm này dùng SECURITY DEFINER để đọc settings nhưng strip sensitive fields
-- trước khi trả về. Bất kỳ user nào (kể cả anonymous) đều gọi được.

CREATE OR REPLACE FUNCTION get_public_settings()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(
      (SELECT
        (data - 'telegramBotToken'
              - 'telegramChatId'
              - 'larkWebhookUrl'
              - 'integrationChatApiKey'
              - 'aiImageApiKey'
              - 'integrationSheetApiKey'
              - 'integrationZaloAccessToken'
        )
      FROM settings WHERE id = 'global'),
    '{}'::jsonb
    );
$$;

-- Cấp quyền gọi hàm cho mọi user (bao gồm anon)
GRANT EXECUTE ON FUNCTION get_public_settings() TO anon, authenticated;

-- ── 2. RLS write policies — chỉ admin/staff được write ───────────────────────
-- Hiện tại: USING (auth.role() = 'authenticated') — bất kỳ user đăng nhập đều write được
-- Fix: kiểm tra bảng user_roles, chỉ role 'admin' hoặc 'staff' mới được phép

-- customers
DROP POLICY IF EXISTS "allow_insert_customers" ON customers;
DROP POLICY IF EXISTS "allow_update_customers" ON customers;
DROP POLICY IF EXISTS "allow_delete_customers" ON customers;

CREATE POLICY "allow_insert_customers" ON customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

CREATE POLICY "allow_update_customers" ON customers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

CREATE POLICY "allow_delete_customers" ON customers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- shoots
DROP POLICY IF EXISTS "allow_insert_shoots" ON shoots;
DROP POLICY IF EXISTS "allow_update_shoots" ON shoots;
DROP POLICY IF EXISTS "allow_delete_shoots" ON shoots;

CREATE POLICY "allow_insert_shoots" ON shoots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

CREATE POLICY "allow_update_shoots" ON shoots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

CREATE POLICY "allow_delete_shoots" ON shoots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- customer_faqs
DROP POLICY IF EXISTS "allow_insert_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "allow_update_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "allow_delete_faqs" ON customer_faqs;

CREATE POLICY "allow_insert_faqs" ON customer_faqs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

CREATE POLICY "allow_update_faqs" ON customer_faqs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
    )
  );

CREATE POLICY "allow_delete_faqs" ON customer_faqs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- settings (chỉ superadmin/admin được update)
DROP POLICY IF EXISTS "allow_update_settings" ON settings;
DROP POLICY IF EXISTS "write_settings" ON settings;

CREATE POLICY "allow_update_settings" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- ── 3. Xoá bỏ read public settings (sensitive) ────────────────────────────────
-- Giữ nguyên policy SELECT (USING true) cho settings vì app dùng nó.
-- Frontend sẽ được cập nhật để dùng get_public_settings() thay vì đọc trực tiếp.
-- Khi đã test xong, có thể xoá policy này:
--
-- DROP POLICY IF EXISTS "read_settings" ON settings;
-- CREATE POLICY "read_settings" ON settings
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM user_roles
--       WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin')
--     )
--   );

-- ── 4. bot_message_feedback — insert/read public (không cần auth) ─────────────
-- Nên giữ nguyên để widget chat của khách gửi được feedback không cần đăng nhập.
-- Nhưng delete phải là admin:
DROP POLICY IF EXISTS "allow_delete_feedback" ON bot_message_feedback;
CREATE POLICY "allow_delete_feedback" ON bot_message_feedback
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- HƯỚNG DẪN ĐỔI BUCKET album-images sang PRIVATE (không thể làm bằng SQL)
-- ============================================================
-- 1. Vào Supabase Dashboard → Storage → album-images
-- 2. Click "Edit bucket" (icon bút chì)
-- 3. Bỏ tick "Public bucket"
-- 4. Save
-- 5. Nếu app cần hiển thị ảnh, dùng supabase.storage.createSignedUrl() thay vì
--    URL public. Signed URL có thời hạn (ví dụ 3600 giây).
-- HOẶC: giữ public bucket nhưng tạo policy Storage chỉ cho phép authenticated
--    users download (nếu ảnh chỉ cho staff xem).
-- ============================================================
