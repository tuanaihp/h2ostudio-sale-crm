-- Bảng lịch content sale 365 ngày
-- Mỗi row = 1 ngày cụ thể, chứa toàn bộ nội dung bài đăng

create table if not exists sale_days (
  id uuid primary key default gen_random_uuid(),
  day_date date not null unique,
  year int not null,
  month int not null,
  stage text default '',
  format text default '',
  subject text default '',
  quote text default '',
  caption text default '',
  image_prompt text default '',
  bg_image_url text default '',
  font_color text default '#FFFFFF',
  highlight_color text default '#00CB53',
  quote_position int default 50,
  font_size int default 24,
  image_size text default 'Vuông (1:1)',
  font_family text default 'Inter',
  logo_url text default '',
  logo_position text default 'Dưới - Phải',
  logo_size int default 40,
  task_status text default 'todo',
  content_status text default 'draft',
  assigned_to text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index để query nhanh theo year/month
create index if not exists idx_sale_days_year on sale_days(year);
create index if not exists idx_sale_days_month on sale_days(year, month);

-- RLS
alter table sale_days enable row level security;

-- Cho phép admin đọc/ghi tất cả
create policy "sale_days_admin_all" on sale_days
  for all using (true) with check (true);
