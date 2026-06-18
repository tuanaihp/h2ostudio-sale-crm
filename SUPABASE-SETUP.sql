-- ============================================================
-- H2O Studio Sale CRM - Supabase Setup SQL
-- Chay file nay trong: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- TABLES
CREATE TABLE IF NOT EXISTS styles (
  id TEXT PRIMARY KEY,
  slug TEXT,
  title TEXT,
  description TEXT,
  cover_image TEXT,
  cover_image_pos JSONB,
  design JSONB,
  "order" INTEGER DEFAULT 0,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  style_id TEXT REFERENCES styles(id) ON DELETE CASCADE,
  slug TEXT,
  title TEXT,
  description TEXT,
  cover_image TEXT,
  cover_image_pos JSONB,
  design JSONB,
  "order" INTEGER DEFAULT 0,
  suggested_layout TEXT,
  suitable_for TEXT,
  display_likes TEXT,
  category TEXT,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  album_id TEXT REFERENCES albums(id) ON DELETE CASCADE,
  style_id TEXT,
  image TEXT,
  alt TEXT,
  design JSONB,
  "order" INTEGER DEFAULT 0,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  date TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  tags TEXT[],
  concept_id TEXT,
  shooting_date TEXT,
  engagement_date TEXT,
  wedding_date TEXT,
  delivery_date TEXT,
  favorite_ids TEXT[],
  source TEXT,
  lucky_gift TEXT,
  assigned_to TEXT,
  follow_up_date TEXT,
  contract_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  role TEXT DEFAULT 'client',
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (id, data)
VALUES ('global', '{"staffPhones": ["0899252393", "0973685994", "0363234909"]}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- STYLES
DROP POLICY IF EXISTS "read_styles" ON styles;
DROP POLICY IF EXISTS "write_styles" ON styles;
CREATE POLICY "read_styles" ON styles FOR SELECT
  USING ((deleted = false OR deleted IS NULL) OR auth.role() = 'authenticated');
CREATE POLICY "write_styles" ON styles FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ALBUMS
DROP POLICY IF EXISTS "read_albums" ON albums;
DROP POLICY IF EXISTS "write_albums" ON albums;
CREATE POLICY "read_albums" ON albums FOR SELECT
  USING ((deleted = false OR deleted IS NULL) OR auth.role() = 'authenticated');
CREATE POLICY "write_albums" ON albums FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- PHOTOS
DROP POLICY IF EXISTS "read_photos" ON photos;
DROP POLICY IF EXISTS "write_photos" ON photos;
CREATE POLICY "read_photos" ON photos FOR SELECT
  USING ((deleted = false OR deleted IS NULL) OR auth.role() = 'authenticated');
CREATE POLICY "write_photos" ON photos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- CONSULTATIONS (khach hang co the gui form, chi admin moi xem duoc)
DROP POLICY IF EXISTS "insert_consultation" ON consultations;
DROP POLICY IF EXISTS "manage_consultations" ON consultations;
CREATE POLICY "insert_consultation" ON consultations FOR INSERT WITH CHECK (true);
CREATE POLICY "manage_consultations" ON consultations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "update_consultation" ON consultations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "delete_consultation" ON consultations FOR DELETE USING (auth.role() = 'authenticated');

-- USER ROLES
DROP POLICY IF EXISTS "read_own_role" ON user_roles;
DROP POLICY IF EXISTS "manage_roles" ON user_roles;
CREATE POLICY "read_own_role" ON user_roles FOR SELECT USING (auth.uid() = id OR auth.role() = 'authenticated');
CREATE POLICY "manage_roles" ON user_roles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- SETTINGS
DROP POLICY IF EXISTS "read_settings" ON settings;
DROP POLICY IF EXISTS "write_settings" ON settings;
CREATE POLICY "read_settings" ON settings FOR SELECT USING (true);
CREATE POLICY "write_settings" ON settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- REALTIME (de admin thay don tu khach hang ngay lap tuc)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- ============================================================
-- STORAGE BUCKET cho anh album
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('album-images', 'album-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read images" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload images" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete images" ON storage.objects;
CREATE POLICY "Public read images" ON storage.objects FOR SELECT USING (bucket_id = 'album-images');
CREATE POLICY "Auth upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'album-images' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete images" ON storage.objects FOR DELETE USING (bucket_id = 'album-images' AND auth.role() = 'authenticated');

-- ============================================================
-- HUONG DAN SAU KHI CHAY SQL:
-- 1. Authentication -> Providers -> Google -> Enable (neu muon dang nhap Google)
--    Them Google Client ID va Secret tu Google Cloud Console
-- 2. Authentication -> Users -> Add user:
--    Email: staff@h2ostudio.com | Password: H2oStudioStaff2026!
--    Email: maxsamuelbldhp@gmail.com | Password: (dat mat khau cho admin)
-- ============================================================
