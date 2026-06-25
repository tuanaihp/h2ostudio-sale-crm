-- H2O Smart Bot v2 — DB Migration
-- Chạy file này trong Supabase SQL Editor

-- 1. Thêm các cột mới vào customer_faqs
ALTER TABLE customer_faqs
  ADD COLUMN IF NOT EXISTS keywords     text[]  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_question text   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lead_score   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_type text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS handoff_trigger boolean DEFAULT false;

-- 2. Tạo bảng bot_unmatched_logs — ghi lại câu bot không trả lời được
CREATE TABLE IF NOT EXISTS bot_unmatched_logs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         text,
  message            text        NOT NULL,
  normalized_message text,
  detected_service   text,
  detected_phase     text,
  created_at         timestamptz DEFAULT now(),
  tagged_faq_id      uuid        REFERENCES customer_faqs(id) ON DELETE SET NULL,
  reviewed           boolean     DEFAULT false
);

-- 3. RLS cho bot_unmatched_logs
ALTER TABLE bot_unmatched_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "allow_all_bot_unmatched"
  ON bot_unmatched_logs FOR ALL
  USING (true) WITH CHECK (true);

-- 4. Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_bot_unmatched_reviewed ON bot_unmatched_logs(reviewed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faqs_service_type ON customer_faqs(service_type);
CREATE INDEX IF NOT EXISTS idx_faqs_keywords ON customer_faqs USING GIN(keywords);
