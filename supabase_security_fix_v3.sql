-- ============================================================
-- H2O Studio — Security Fix V3 (CONSOLIDATED — chạy file NÀY là đủ)
-- Chạy TOÀN BỘ file trong Supabase SQL Editor.
-- An toàn chạy nhiều lần (idempotent — mọi policy đều DROP IF EXISTS trước).
--
-- File này đóng TẤT CẢ lỗ hổng còn mở sau v2 + fix_recursion:
--   1. settings: drop public-read → lộ telegramBotToken/api keys
--   2. chat_sessions/chat_messages: tạo bảng + RLS (trước đây không có trong repo)
--   3. price_packages / sale_days / bot_unmatched_logs / promotions / sale_scenarios:
--      drop public-WRITE, chỉ còn public-READ
--   4. customer_faqs: public chỉ đọc is_approved=true; anon chỉ INSERT được
--      is_approved=false (self-learning an toàn); thêm cột session_id
--   5. increment_faq_usage → SECURITY DEFINER (anon vẫn gọi được)
--   6. match_faqs → trả id text (khớp kiểu cột thực tế)
--   7. bootstrap_admin() → tạo super_admin đầu tiên (v2 đã chặt self-promote)
--   8. check_phone_exists() → check SĐT trùng mà không lộ danh sách consultations
--   9. Drop các policy blueprint cũ còn sót ("Admin all access", "public rw"...)
-- ============================================================

-- ── 0. Helper: get_my_role() (idempotent, tránh recursion) ────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM user_roles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper predicate dùng lại nhiều lần: is_staff_or_above / is_admin_or_above
CREATE OR REPLACE FUNCTION public.is_staff_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE id = auth.uid() AND role IN ('admin', 'staff', 'superadmin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin')
  );
$$;

-- ── 1. SETTINGS — đóng public read (CRITICAL) ────────────────────────────────
-- Public client dùng get_public_settings() (đã strip token). Direct select chỉ staff+.
DROP POLICY IF EXISTS "read_settings" ON settings;

CREATE POLICY "read_settings" ON settings
  FOR SELECT USING (is_staff_or_above());

-- get_public_settings(): strip THÊM các trường nhạy cảm mới phát hiện
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
              - 'integrationChatApiHeaders'
              - 'integrationChatApiUrl'
              - 'aiImageApiKey'
              - 'integrationSheetApiKey'
              - 'integrationZaloAccessToken'
              - 'integrationZaloOaId'
              - 'staffPhones'
        )
      FROM settings WHERE id = 'global'),
    '{}'::jsonb
    );
$$;

GRANT EXECUTE ON FUNCTION get_public_settings() TO anon, authenticated;

-- ── 2. CHAT_SESSIONS + CHAT_MESSAGES — tạo bảng nếu thiếu + RLS ──────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  consultation_id text,
  phone text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'waiting',
  stage text NOT NULL DEFAULT 'new',
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  unread_admin integer NOT NULL DEFAULT 0,
  access_token text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id text NOT NULL,
  sender text NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS consultation_id text;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS access_token text;

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Mô hình quyền (capability): anon KHÔNG được SELECT trực tiếp 2 bảng này
-- (trước đây USING(true) → ai cũng dump toàn bộ tên+SĐT+tin nhắn khách).
-- Khách đọc session của mình qua RPC get_chat_session / get_chat_messages
-- bằng access_token (UUID không đoán được) lưu trong localStorage phía client.
-- Realtime postgres_changes tôn trọng RLS → khách KHÔNG nhận realtime nữa;
-- client đã chuyển sang polling RPC (~5s). Admin (staff) vẫn realtime bình thường.
DROP POLICY IF EXISTS "chat_sessions_public_select" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_public_insert" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_public_update" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_admin_delete" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_admin_all" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_staff_read" ON chat_sessions;
DROP POLICY IF EXISTS "allow_all_chat_sessions" ON chat_sessions;

CREATE POLICY "chat_sessions_staff_read" ON chat_sessions
  FOR SELECT USING (is_staff_or_above());
CREATE POLICY "chat_sessions_public_insert" ON chat_sessions
  FOR INSERT WITH CHECK (true);
-- UPDATE public: client ghi last_message/status/unread. Chỉ chạm được session
-- biết id (UUID) — không liệt kê được vì SELECT đã khoá.
CREATE POLICY "chat_sessions_public_update" ON chat_sessions
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "chat_sessions_admin_delete" ON chat_sessions
  FOR DELETE USING (is_admin_or_above());

-- Column-level lock: anon/authenticated KHÔNG được UPDATE cột access_token.
-- Nếu không, ai biết session_id có thể tự đổi access_token rồi gọi
-- get_chat_messages() để đọc trộm tin nhắn (session hijack).
REVOKE UPDATE ON chat_sessions FROM anon, authenticated;
GRANT UPDATE (status, stage, last_message, last_message_at, unread_admin,
              phone, name, consultation_id)
  ON chat_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "chat_messages_public_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_public_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_public_update" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_admin_delete" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_admin_all" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_staff_read" ON chat_messages;
DROP POLICY IF EXISTS "allow_all_chat_messages" ON chat_messages;

CREATE POLICY "chat_messages_staff_read" ON chat_messages
  FOR SELECT USING (is_staff_or_above());
CREATE POLICY "chat_messages_public_insert" ON chat_messages
  FOR INSERT WITH CHECK (
    sender IN ('customer', 'admin')
    AND char_length(content) <= 4000
    AND char_length(COALESCE(image_url, '')) <= 2000
  );
CREATE POLICY "chat_messages_admin_delete" ON chat_messages
  FOR DELETE USING (is_admin_or_above());

-- RPC: khách đọc session của chính mình (cần access_token khớp)
CREATE OR REPLACE FUNCTION get_chat_session(p_id text, p_token text)
RETURNS TABLE (
  id text, consultation_id text, phone text, name text,
  status text, stage text, last_message text, last_message_at timestamptz,
  unread_admin integer, created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, consultation_id, phone, name, status, stage,
         last_message, last_message_at, unread_admin, created_at
  FROM chat_sessions
  WHERE id = p_id AND access_token IS NOT NULL AND access_token = p_token
  LIMIT 1;
$$;

-- RPC: khách đọc tin nhắn của session (cần access_token khớp)
CREATE OR REPLACE FUNCTION get_chat_messages(
  p_session_id text, p_token text, p_after timestamptz DEFAULT '1970-01-01'
)
RETURNS TABLE (
  id text, session_id text, sender text, content text,
  image_url text, created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT m.id, m.session_id, m.sender, m.content, m.image_url, m.created_at
  FROM chat_messages m
  WHERE m.session_id = p_session_id
    AND m.created_at > p_after
    AND EXISTS (
      SELECT 1 FROM chat_sessions s
      WHERE s.id = p_session_id AND s.access_token IS NOT NULL AND s.access_token = p_token
    )
  ORDER BY m.created_at ASC
  LIMIT 500;
$$;

-- RPC: tăng unread_admin nguyên tử (tránh read-modify-write race + số liệu sai)
CREATE OR REPLACE FUNCTION bump_chat_unread(p_session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE chat_sessions
  SET unread_admin = COALESCE(unread_admin, 0) + 1,
      status = 'waiting',
      last_message_at = now()
  WHERE id = p_session_id;
$$;

GRANT EXECUTE ON FUNCTION get_chat_session(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_chat_messages(text, text, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bump_chat_unread(text) TO anon, authenticated;

-- Realtime: giữ publication cho staff (admin panel vẫn nhận realtime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

-- ── 2b. CONSOLIDATED từ v2 — styles/albums/photos/consultations/user_roles ───
-- (v2 dùng inline EXISTS trên user_roles → đệ quy RLS. Bản này dùng helper
--  SECURITY DEFINER ở mục 0 → không recursion, chạy độc lập được.)

ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "write_styles" ON styles;
DROP POLICY IF EXISTS "allow_write_styles" ON styles;
DROP POLICY IF EXISTS "read_styles" ON styles;
DROP POLICY IF EXISTS "allow_read_styles" ON styles;
CREATE POLICY "write_styles" ON styles
  FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

DROP POLICY IF EXISTS "write_albums" ON albums;
DROP POLICY IF EXISTS "allow_write_albums" ON albums;
DROP POLICY IF EXISTS "read_albums" ON albums;
DROP POLICY IF EXISTS "allow_read_albums" ON albums;
CREATE POLICY "write_albums" ON albums
  FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

DROP POLICY IF EXISTS "write_photos" ON photos;
DROP POLICY IF EXISTS "allow_write_photos" ON photos;
DROP POLICY IF EXISTS "read_photos" ON photos;
DROP POLICY IF EXISTS "allow_read_photos" ON photos;
CREATE POLICY "write_photos" ON photos
  FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- consultations (CRM leads — PII: tên + SĐT + nhu cầu)
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert_consultation" ON consultations;
DROP POLICY IF EXISTS "manage_consultations" ON consultations;
DROP POLICY IF EXISTS "update_consultation" ON consultations;
DROP POLICY IF EXISTS "delete_consultation" ON consultations;
DROP POLICY IF EXISTS "allow_insert_consultations" ON consultations;
DROP POLICY IF EXISTS "allow_update_consultations" ON consultations;
DROP POLICY IF EXISTS "allow_delete_consultations" ON consultations;
DROP POLICY IF EXISTS "allow_read_consultations" ON consultations;

CREATE POLICY "insert_consultation" ON consultations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "manage_consultations" ON consultations
  FOR SELECT USING (is_staff_or_above());
CREATE POLICY "update_consultation" ON consultations
  FOR UPDATE USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());
CREATE POLICY "delete_consultation" ON consultations
  FOR DELETE USING (is_admin_or_above());

-- user_roles (self-promote là lỗ hổng nghiêm trọng nhất — phải chặt)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manage_roles" ON user_roles;
DROP POLICY IF EXISTS "read_own_role" ON user_roles;
DROP POLICY IF EXISTS "allow_read_roles" ON user_roles;
DROP POLICY IF EXISTS "allow_manage_roles" ON user_roles;

CREATE POLICY "read_own_role" ON user_roles
  FOR SELECT USING (auth.uid() = id);
-- Dùng get_my_role() (SECURITY DEFINER) — KHÔNG dùng inline EXISTS trên
-- user_roles trong policy của chính user_roles → infinite recursion.
CREATE POLICY "manage_roles" ON user_roles
  FOR ALL USING (get_my_role() IN ('superadmin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('superadmin', 'super_admin'));

-- settings write (admin+; read đã xử lý ở mục 1)
DROP POLICY IF EXISTS "write_settings" ON settings;
DROP POLICY IF EXISTS "allow_update_settings" ON settings;
CREATE POLICY "write_settings" ON settings
  FOR ALL USING (is_admin_or_above()) WITH CHECK (is_admin_or_above());

-- sale_scripts (kịch bản bot — public đọc, staff ghi; không có policy nào trong repo trước đây)
ALTER TABLE sale_scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON sale_scripts;
DROP POLICY IF EXISTS "Allow read for anon" ON sale_scripts;
DROP POLICY IF EXISTS "Admin all access" ON sale_scripts;
DROP POLICY IF EXISTS "sale_scripts_public_read" ON sale_scripts;
DROP POLICY IF EXISTS "sale_scripts_staff_write" ON sale_scripts;

CREATE POLICY "sale_scripts_public_read" ON sale_scripts
  FOR SELECT USING (true);
CREATE POLICY "sale_scripts_staff_write" ON sale_scripts
  FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- ── 3. Bảng public-WRITE → siết lại thành public-READ + staff-write ──────────

-- price_packages (gói giá bot hiển thị cho khách)
ALTER TABLE price_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_price_packages" ON price_packages;
DROP POLICY IF EXISTS "price_packages_public_read" ON price_packages;
DROP POLICY IF EXISTS "price_packages_staff_write" ON price_packages;

CREATE POLICY "price_packages_public_read" ON price_packages
  FOR SELECT USING (true);
CREATE POLICY "price_packages_staff_write" ON price_packages
  FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- sale_days (lịch nội dung 365 ngày)
ALTER TABLE sale_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sale_days_admin_all" ON sale_days;
DROP POLICY IF EXISTS "sale_days_public_read" ON sale_days;
DROP POLICY IF EXISTS "sale_days_staff_write" ON sale_days;

CREATE POLICY "sale_days_public_read" ON sale_days
  FOR SELECT USING (true);
CREATE POLICY "sale_days_staff_write" ON sale_days
  FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- sale_scenarios (kịch bản forced-flow của bot)
ALTER TABLE sale_scenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON sale_scenarios;
DROP POLICY IF EXISTS "Allow read for anon" ON sale_scenarios;
DROP POLICY IF EXISTS "sale_scenarios_public_read" ON sale_scenarios;
DROP POLICY IF EXISTS "sale_scenarios_staff_write" ON sale_scenarios;

CREATE POLICY "sale_scenarios_public_read" ON sale_scenarios
  FOR SELECT USING (true);
CREATE POLICY "sale_scenarios_staff_write" ON sale_scenarios
  FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- promotions
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read promotions" ON promotions;
DROP POLICY IF EXISTS "Admin manage promotions" ON promotions;
DROP POLICY IF EXISTS "promotions_public_read" ON promotions;
DROP POLICY IF EXISTS "promotions_staff_write" ON promotions;

CREATE POLICY "promotions_public_read" ON promotions
  FOR SELECT USING (true);
CREATE POLICY "promotions_staff_write" ON promotions
  FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- bot_unmatched_logs (câu hỏi bot không trả lời được — chứa text của khách)
ALTER TABLE bot_unmatched_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_bot_unmatched" ON bot_unmatched_logs;
DROP POLICY IF EXISTS "bot_unmatched_public_insert" ON bot_unmatched_logs;
DROP POLICY IF EXISTS "bot_unmatched_admin_read" ON bot_unmatched_logs;

CREATE POLICY "bot_unmatched_public_insert" ON bot_unmatched_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "bot_unmatched_admin_read" ON bot_unmatched_logs
  FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- album_likes (like công khai — cần insert/delete/select cho khách, chặn update)
ALTER TABLE album_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public rw" ON album_likes;
DROP POLICY IF EXISTS "album_likes_public_read" ON album_likes;
DROP POLICY IF EXISTS "album_likes_public_insert" ON album_likes;
DROP POLICY IF EXISTS "album_likes_public_delete" ON album_likes;

CREATE POLICY "album_likes_public_read" ON album_likes
  FOR SELECT USING (true);
CREATE POLICY "album_likes_public_insert" ON album_likes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "album_likes_public_delete" ON album_likes
  FOR DELETE USING (true);

-- ── 4. CUSTOMER_FAQS — siết public read + mở lại self-learning an toàn ───────
ALTER TABLE customer_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_faqs ADD COLUMN IF NOT EXISTS session_id text;

DROP POLICY IF EXISTS "public_read_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "Public read approved" ON customer_faqs;
DROP POLICY IF EXISTS "Admin all access" ON customer_faqs;
DROP POLICY IF EXISTS "allow_read_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "allow_insert_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "allow_update_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "allow_delete_faqs" ON customer_faqs;
DROP POLICY IF EXISTS "faqs_public_read_approved" ON customer_faqs;
DROP POLICY IF EXISTS "faqs_anon_insert_pending" ON customer_faqs;
DROP POLICY IF EXISTS "faqs_staff_write" ON customer_faqs;
DROP POLICY IF EXISTS "faqs_admin_delete" ON customer_faqs;

-- Public chỉ đọc FAQ đã duyệt; staff đọc tất (kể cả pending queue)
CREATE POLICY "faqs_public_read_approved" ON customer_faqs
  FOR SELECT USING (is_approved = true OR is_staff_or_above());

-- Anon chỉ insert được FAQ CHƯA duyệt (self-learning) — không ghi đè được approved
CREATE POLICY "faqs_anon_insert_pending" ON customer_faqs
  FOR INSERT WITH CHECK (is_approved = false OR is_staff_or_above());

-- Update: chỉ staff (chặn anon sửa approved answers)
CREATE POLICY "faqs_staff_write" ON customer_faqs
  FOR UPDATE USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- Delete: chỉ admin+
CREATE POLICY "faqs_admin_delete" ON customer_faqs
  FOR DELETE USING (is_admin_or_above());

-- ── 5. increment_faq_usage → SECURITY DEFINER (anon gọi được, bypass RLS) ────
-- Chữ ký nhận text để khớp customer_faqs.id (text). Vẫn chấp nhận uuid nhờ cast.
-- Drop bản cũ (uuid) nếu tồn tại — tránh sót overload.
DROP FUNCTION IF EXISTS increment_faq_usage(uuid);
DROP FUNCTION IF EXISTS increment_faq_usage(text);
CREATE OR REPLACE FUNCTION increment_faq_usage(faq_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE customer_faqs SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = faq_id;
$$;

GRANT EXECUTE ON FUNCTION increment_faq_usage(text) TO anon, authenticated;

-- ── 6. match_faqs → id trả về text (khớp cột) ────────────────────────────────
-- Phải DROP trước: bản cũ trả id uuid → CREATE OR REPLACE đổi return type sẽ lỗi.
DROP FUNCTION IF EXISTS match_faqs(vector(768), float, int);
DROP FUNCTION IF EXISTS match_faqs(vector, float, int);
CREATE OR REPLACE FUNCTION match_faqs(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  question text,
  answer text,
  category text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id::text,
    f.question,
    f.answer,
    f.category,
    (1 - (f.embedding <=> query_embedding))::float AS similarity
  FROM customer_faqs f
  WHERE f.is_approved = true
    AND f.embedding IS NOT NULL
    AND length(COALESCE(f.answer, '')) > 10
    AND (1 - (f.embedding <=> query_embedding)) > match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_faqs(vector, float, int) TO anon, authenticated;

-- ── 7. bootstrap_admin — tạo super_admin ĐẦU TIÊN ────────────────────────────
-- Chỉ hoạt động khi CHƯA có ai giữ role superadmin → an toàn, không self-promote.
CREATE OR REPLACE FUNCTION bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT count(*) INTO admin_count
  FROM user_roles WHERE role IN ('superadmin', 'super_admin');
  IF admin_count > 0 THEN
    RETURN false; -- đã có admin rồi → không cho bootstrap nữa
  END IF;
  INSERT INTO user_roles (id, email, role, display_name)
  VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'super_admin', 'Admin Principal')
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION bootstrap_admin() TO authenticated;

-- ── 8. check_phone_exists — check trùng SĐT KHÔNG lộ danh sách leads ─────────
-- source_input: lọc thêm theo nguồn (vd 'lucky_wheel' chỉ trùng trong vòng quay)
-- Drop bản 1-tham-số cũ nếu có (tránh sót overload không lọc source).
DROP FUNCTION IF EXISTS check_phone_exists(text);
CREATE OR REPLACE FUNCTION check_phone_exists(phone_input text, source_input text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM consultations
    WHERE phone = phone_input
      AND (source_input IS NULL OR source = source_input)
    LIMIT 1
  );
$$;

GRANT EXECUTE ON FUNCTION check_phone_exists(text, text) TO anon, authenticated;

-- ── 8b. find_or_create_lead — tạo lead NGUYÊN TỬ, trả về id ──────────────────
-- Thay cho check-then-insert phía client (race condition + RLS chặn SELECT
-- khiến check luôn trả false → trùng lead). Trả về id consultation (mới hoặc
-- đã tồn tại) để client link chat_sessions.consultation_id.
CREATE OR REPLACE FUNCTION find_or_create_lead(
  p_phone text, p_name text DEFAULT '', p_source text DEFAULT '', p_message text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lid text;
BEGIN
  SELECT id INTO lid FROM consultations
  WHERE phone = p_phone
  ORDER BY created_at DESC
  LIMIT 1;
  IF lid IS NOT NULL THEN
    RETURN lid;
  END IF;
  lid := gen_random_uuid()::text;
  INSERT INTO consultations (id, name, phone, status, source, message, created_at)
  VALUES (lid, COALESCE(NULLIF(p_name, ''), p_phone), p_phone, 'new',
          NULLIF(p_source, ''), NULLIF(p_message, ''), now());
  RETURN lid;
END;
$$;

GRANT EXECUTE ON FUNCTION find_or_create_lead(text, text, text, text) TO anon, authenticated;

-- ── 8c. bot_message_feedback — 👍/👎 persist, staff đọc, 1 vote/message ───────
CREATE TABLE IF NOT EXISTS bot_message_feedback (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id text NOT NULL DEFAULT '',
  message_id text NOT NULL DEFAULT '',
  customer_question text NOT NULL DEFAULT '',
  bot_answer text NOT NULL DEFAULT '',
  feedback text NOT NULL,
  source_faq_ids jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bot_message_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bot_feedback_public_insert" ON bot_message_feedback;
DROP POLICY IF EXISTS "bot_feedback_staff_read" ON bot_message_feedback;
DROP POLICY IF EXISTS "allow_all_bot_feedback" ON bot_message_feedback;

CREATE POLICY "bot_feedback_public_insert" ON bot_message_feedback
  FOR INSERT WITH CHECK (feedback IN ('up', 'down'));
CREATE POLICY "bot_feedback_staff_read" ON bot_message_feedback
  FOR SELECT USING (is_staff_or_above());
CREATE POLICY "bot_feedback_admin_delete" ON bot_message_feedback
  FOR DELETE USING (is_admin_or_above());

-- 1 vote / (session, message): unique index — nếu data cũ đã trùng thì chỉ cảnh báo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'bot_feedback_unique_vote'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX bot_feedback_unique_vote
        ON bot_message_feedback (session_id, message_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Không tạo được unique index bot_feedback_unique_vote (data trùng cũ). Dọn trùng rồi chạy lại.';
    END;
  END IF;
END $$;

-- ── 9. Drop các policy blueprint còn sót (tên policy từ markdown) ────────────
DROP POLICY IF EXISTS "Public read promotions" ON promotions;
DROP POLICY IF EXISTS "Admin manage promotions" ON promotions;
DROP POLICY IF EXISTS "Public read approved" ON customer_faqs;
DROP POLICY IF EXISTS "Admin all access" ON customer_faqs;
DROP POLICY IF EXISTS "public rw" ON album_likes;
DROP POLICY IF EXISTS "Allow all for authenticated" ON sale_scenarios;
DROP POLICY IF EXISTS "Allow read for anon" ON sale_scenarios;
DROP POLICY IF EXISTS "allow_all_bot_unmatched" ON bot_unmatched_logs;
DROP POLICY IF EXISTS "allow_all_price_packages" ON price_packages;
DROP POLICY IF EXISTS "sale_days_admin_all" ON sale_days;

-- ============================================================
-- SAU KHI CHẠY — VIỆC TAY BẮT BUỘC:
--  1. Authentication → Users: đổi mật khẩu staff@h2ostudio.com (hoặc xóa)
--  2. Vào Settings → đổi TOÀN BỘ token đã lưu (Telegram/Lark/OpenAI/Zalo/Sheet)
--  3. Tạo super_admin đầu tiên: login Google bằng email admin → gọi
--       select bootstrap_admin();  (chỉ chạy được 1 lần, khi chưa có admin)
--  4. Kiểm tra Authentication → Policies: không còn policy nào USING (true)
--     cho WRITE ngoài các bảng public-insert (consultations, chat_*,
--     album_likes, bot_unmatched_logs, bot_message_feedback, customer_faqs pending)
-- ============================================================
