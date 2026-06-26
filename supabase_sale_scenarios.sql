-- Bảng kịch bản sale (forced flow system)
-- Chạy file này 1 lần trong Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sale_scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_keywords TEXT[] DEFAULT '{}',
  steps JSONB DEFAULT '[]'::jsonb,
  enabled BOOLEAN DEFAULT TRUE,
  scenario_type TEXT DEFAULT 'keyword',
  followup_delay_minutes INTEGER DEFAULT 120,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Steps JSONB format:
-- [
--   { "id": "uuid", "content": "Nội dung tin nhắn", "delay_seconds": 0, "wait_for_reply": true },
--   { "id": "uuid", "content": "Tin nhắn tự động", "delay_seconds": 5, "wait_for_reply": false }
-- ]
--
-- scenario_type values:
--   'keyword'   — kích hoạt khi khách hàng nhắn từ khóa
--   'objection' — kích hoạt khi bot nhận diện intent từ chối
--   'followup'  — nhắc lại sau khoảng thời gian im lặng

ALTER TABLE sale_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON sale_scenarios
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for anon" ON sale_scenarios
  FOR SELECT USING (TRUE);
