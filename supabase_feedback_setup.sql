-- ============================================================
-- Bot V5: Feedback System (chạy trong Supabase Dashboard)
-- SQL Editor → paste toàn bộ file này → Run
-- ============================================================

-- 1. Bảng lưu feedback 👍/👎 từ khách hàng
CREATE TABLE IF NOT EXISTS bot_message_feedback (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       text,
  message_id       text NOT NULL,
  customer_question text,
  bot_answer       text,
  feedback         text NOT NULL CHECK (feedback IN ('up', 'down')),
  source_faq_ids   text[] DEFAULT '{}',
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_message_feedback_session_idx ON bot_message_feedback (session_id);
CREATE INDEX IF NOT EXISTS bot_message_feedback_created_idx ON bot_message_feedback (created_at DESC);

-- 2. Hàm atomic increment usage_count (tránh race condition)
CREATE OR REPLACE FUNCTION increment_faq_usage(faq_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE customer_faqs SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = faq_id;
$$;

-- 3. Row Level Security — public read/insert (no update/delete from client)
ALTER TABLE bot_message_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_insert_feedback" ON bot_message_feedback;
CREATE POLICY "allow_insert_feedback" ON bot_message_feedback
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_read_feedback" ON bot_message_feedback;
CREATE POLICY "allow_read_feedback" ON bot_message_feedback
  FOR SELECT USING (true);

-- Xong! Bot V5 Feedback System đã sẵn sàng.
