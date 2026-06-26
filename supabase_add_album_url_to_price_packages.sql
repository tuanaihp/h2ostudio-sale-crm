-- Thêm cột album_url vào bảng price_packages
-- Chạy file này 1 lần trong Supabase SQL Editor

ALTER TABLE price_packages
  ADD COLUMN IF NOT EXISTS album_url TEXT DEFAULT NULL;
