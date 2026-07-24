-- ============================================================
-- H2O Studio — Fix infinite recursion trong user_roles RLS
-- Chạy file này TRƯỚC trong Supabase SQL Editor
-- Lỗi: "infinite recursion detected in policy for relation user_roles"
-- Nguyên nhân: manage_roles policy tự query user_roles → vòng lặp
-- ============================================================

-- Bước 1: Tạo helper function SECURITY DEFINER
-- Function này bypass RLS khi check role → không gây recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM user_roles WHERE id = auth.uid() LIMIT 1;
$$;

-- Bước 2: Xoá các policy gây recursion trên user_roles
DROP POLICY IF EXISTS "manage_roles"   ON user_roles;
DROP POLICY IF EXISTS "read_own_role"  ON user_roles;
DROP POLICY IF EXISTS "allow_read_roles" ON user_roles;
DROP POLICY IF EXISTS "allow_manage_roles" ON user_roles;

-- Bước 3: Tạo lại policy KHÔNG dùng subquery vào user_roles

-- User chỉ đọc được role của mình (auth.uid() = id — không recursive)
CREATE POLICY "read_own_role" ON user_roles
  FOR SELECT USING (auth.uid() = id);

-- Chỉ super_admin quản lý roles (dùng get_my_role() thay vì subquery)
CREATE POLICY "manage_roles" ON user_roles
  FOR ALL
  USING (get_my_role() IN ('superadmin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('superadmin', 'super_admin'));

-- ============================================================
-- XONG! Sau khi chạy xong, refresh trang web là albums hiện lại.
-- ============================================================
