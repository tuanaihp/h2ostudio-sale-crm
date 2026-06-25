-- H2O Bot AI — Price Packages Migration
-- Chạy file này trong Supabase SQL Editor

-- 1. Tạo bảng price_packages
CREATE TABLE IF NOT EXISTS price_packages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  price        text        NOT NULL DEFAULT '',
  description  text        DEFAULT '',
  image_url    text        DEFAULT '',
  service_type text        DEFAULT '',
  keywords     text[]      DEFAULT '{}',
  enabled      boolean     DEFAULT true,
  order_num    integer     DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 2. RLS
ALTER TABLE price_packages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'price_packages' AND policyname = 'allow_all_price_packages'
  ) THEN
    CREATE POLICY "allow_all_price_packages"
      ON price_packages FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_price_packages_enabled ON price_packages(enabled, order_num);

-- 4. Thêm image_url vào chat_messages (bot có thể gửi kèm ảnh báo giá)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
