# Studio Webapp — Blueprint & Claude Prompt

> Copy file này vào root của dự án mới và đổi tên thành `CLAUDE.md`.
> Điền vào các chỗ `[...]` cho phù hợp với studio mới.
> Claude Code sẽ đọc file này và hiểu toàn bộ context ngay từ đầu.

---

## 1. THÔNG TIN DỰ ÁN

```
Tên studio: [VD: Makeup Studio / Beauty Studio / ...]
Loại dịch vụ: [VD: makeup cô dâu, chụp ảnh thẻ, spa, ...]
Hotline: [SĐT]
Zalo URL: [https://zalo.me/...]
Facebook: [https://m.me/...]
Mô tả ngắn: [VD: Studio makeup chuyên nghiệp tại TP.HCM]
```

---

## 2. TECH STACK (không thay đổi)

| Layer | Công nghệ | Ghi chú |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript + Vite | |
| Styling | Tailwind CSS | config trong tailwind.config.js |
| Animation | motion/react | KHÔNG dùng framer-motion |
| Icons | lucide-react | |
| Date | date-fns | |
| Database | Supabase (PostgreSQL) | Auth + Realtime + Storage |
| Images | Cloudflare R2 | Primary CDN |
| Hosting | Vercel | Auto-deploy từ GitHub |
| Notifications | Lark webhook + Google Apps Script | |

**KHÔNG dùng:** Firebase, Redux, Axios, moment.js, react-query (dùng Supabase trực tiếp).

---

## 3. KIẾN TRÚC CONTEXT (bắt buộc theo pattern này)

Tách thành **5 context riêng biệt**, KHÔNG gộp vào 1 file lớn:

```
src/context/
├── AppContext.tsx        ← thin composer + useApp() backward-compat hook
├── AuthContext.tsx       ← user, isAdmin, isSuperAdmin, login, logout
├── SettingsContext.tsx   ← settings từ Supabase, Realtime subscription
├── ConsultationContext.tsx ← CRM leads, pagination, submit, update, delete
├── ContentContext.tsx    ← styles/albums/photos CRUD
└── ToastContext.tsx      ← showToast(message, type) global
```

**AppContext.tsx pattern:**
```typescript
export const AppProvider = ({ children }) => (
  <AuthProvider>
    <SettingsProvider>
      <ConsultationProvider>
        <ContentProvider>
          <ToastProvider>{children}</ToastProvider>
        </ContentProvider>
      </ConsultationProvider>
    </SettingsProvider>
  </AuthProvider>
);

export const useApp = () => ({
  ...useAuth(), ...useSettings(), ...useConsultations(), ...useContent(),
});
```

---

## 4. DATABASE SCHEMA (Supabase)

### Bảng `styles` (danh mục dịch vụ / phong cách)
```sql
id text PRIMARY KEY,
slug text UNIQUE,
title text,
description text,
cover_image text,
design jsonb,          -- EditorState (overlay text/logo)
order integer,
category text,         -- phân loại thêm nếu cần
deleted boolean DEFAULT false,
deleted_at timestamptz,
updated_at timestamptz DEFAULT now()
```

### Bảng `albums` (bộ ảnh / gói dịch vụ)
```sql
id text PRIMARY KEY,
style_id text REFERENCES styles(id),
slug text,
title text,
description text,
cover_image text,
cover_image_pos jsonb,  -- {x, y}
design jsonb,
order integer,
suggested_layout text,
suitable_for text,
display_likes text,
deleted boolean DEFAULT false,
deleted_at timestamptz
```

### Bảng `photos`
```sql
id text PRIMARY KEY,
album_id text REFERENCES albums(id),
style_id text,
image text,
alt text,
design jsonb,
order integer,
deleted boolean DEFAULT false,
deleted_at timestamptz
```

### Bảng `consultations` (CRM leads)
```sql
id text PRIMARY KEY,
name text NOT NULL,
phone text NOT NULL,
message text,
date text,
created_at timestamptz DEFAULT now(),
status text DEFAULT 'new',   -- 'new' | 'contacted' | 'registered'
notes text,
tags text[],
concept_id text,             -- style_id hoặc style_id:album_id
shooting_date date,
engagement_date date,
wedding_date date,
delivery_date date,
favorite_ids text[],
source text,
lucky_gift text,
assigned_to text,
follow_up_date date,
contract_value numeric
```

### Bảng `settings`
```sql
id text PRIMARY KEY DEFAULT 'global',
data jsonb    -- toàn bộ AppSettings dưới dạng JSON
```

### Bảng `user_roles`
```sql
id uuid PRIMARY KEY,
email text UNIQUE,
phone_number text,
role text,         -- 'admin' | 'super_admin' | 'staff'
display_name text
```

**Row Level Security:** Bật RLS cho tất cả bảng. `consultations` chỉ admin đọc được. `styles/albums/photos` public read, admin write.

---

## 5. CẤU TRÚC FILE

```
src/
├── pages/
│   ├── Home.tsx                ← trang chủ, gallery styles
│   ├── StyleDetail.tsx         ← danh sách albums của 1 style
│   ├── AlbumDetail.tsx         ← danh sách photos của 1 album
│   ├── PhotoView.tsx           ← xem ảnh full (ID-based URL, không dùng index)
│   ├── Favorites.tsx           ← danh sách yêu thích
│   ├── AdminConsultations.tsx  ← CRM chính (list + kanban + calendar)
│   ├── AdminContent.tsx        ← quản lý styles/albums/photos
│   ├── AdminSettings.tsx       ← cấu hình hệ thống
│   ├── AdminLogin.tsx
│   └── AdminTrash.tsx
├── components/
│   ├── Layout.tsx              ← header + footer + bottom bar mobile
│   ├── PhoneGate.tsx           ← popup yêu cầu SĐT trước khi xem full
│   ├── LiveChatWidget.tsx      ← chat bubble nổi
│   ├── LuckyWheelWidget.tsx    ← vòng quay may mắn
│   ├── AiChatBubble.tsx        ← AI tư vấn
│   ├── ScheduleCalendar.tsx    ← lịch chụp dạng calendar
│   ├── ErrorBoundary.tsx
│   └── PartnerBrandsIcons.tsx
├── context/                    ← 5 contexts như mục 3
├── utils/
│   ├── config.ts               ← GOOGLE_SCRIPT_URL, LARK_FALLBACK_URL, R2_WORKER_URL
│   └── image.ts                ← getDisplayImageUrl() với 3-tier fallback
├── types.ts                    ← tất cả interfaces + DbRow types
├── supabase.ts                 ← createClient
└── data/
    └── mockData.ts             ← APP_CONFIG (brandName, hotline, zaloUrl...)
api/
├── chat.ts                     ← Vercel serverless: AI chat (Gemini/OpenAI)
└── bot.ts                      ← Vercel serverless: OG meta tags cho SEO
```

---

## 6. ROUTING (React Router v6 + lazy loading)

```typescript
// Tất cả pages dùng lazy() + Suspense
const Home = lazy(() => import('./pages/Home'));
const AdminConsultations = lazy(() => import('./pages/AdminConsultations'));
// ...

// Routes
/ → Home
/style/:styleSlug → StyleDetail
/style/:styleSlug/album/:albumSlug → AlbumDetail
/style/:styleSlug/album/:albumSlug/photo/:photoId → PhotoView (ID-based, không dùng index)
/favorites → Favorites
/admin → Navigate to /admin/consultations
/admin/consultations → AdminConsultations (auth guard)
/admin/content → AdminContent (auth guard)
/admin/settings → AdminSettings (super_admin only)
/admin/login → AdminLogin
/admin/trash → AdminTrash
```

---

## 7. IMAGE UPLOAD — 3-TIER FALLBACK

```typescript
// utils/image.ts
export const uploadImage = async (base64: string, filename: string) => {
  // 1. Thử Cloudflare R2 Worker
  try {
    const res = await fetch(R2_WORKER_URL, { method: 'POST', body: JSON.stringify({ image: base64, filename }) });
    if (res.ok) return (await res.json()).url;
  } catch {}

  // 2. Thử Google Drive
  try { /* ... */ } catch {}

  // 3. Fallback Supabase Storage
  const { data } = await supabase.storage.from('images').upload(filename, blob);
  return supabase.storage.from('images').getPublicUrl(data.path).data.publicUrl;
};
```

R2 Worker URL: lưu trong `VITE_R2_WORKER_URL` (Vercel env var).

---

## 8. THÔNG BÁO LARK + GOOGLE SHEETS

Khi có lead mới (`submitConsultation`):
```typescript
fetch(GOOGLE_SCRIPT_URL, {
  method: 'POST', mode: 'no-cors',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({
    action: 'lead',
    leadData: { id, name, phone, message, source, luckyGift, date },
    larkConfig: { url: settings.larkWebhookUrl || LARK_FALLBACK_URL },
  }),
});
```

Khi cập nhật lead: gửi `action: 'update_lead'` với `leadId` và `updateData`.
Lark webhook URL: cấu hình trong Admin → Settings (lưu vào bảng `settings`).

---

## 9. AUTO-TAG KHI SUBMIT (đã implement)

```typescript
const autoTags: string[] = [];
if (data.luckyGift) autoTags.push('Có quà');
if (data.source === 'lucky_wheel') autoTags.push('Vòng quay');
if ((data.favoriteIds?.length || 0) >= 3) autoTags.push('Tiềm năng cao');
else if ((data.favoriteIds?.length || 0) > 0) autoTags.push('Đã thích album');
if (autoTags.length > 0) row.tags = autoTags;
```

---

## 10. ADMIN CRM — TÍNH NĂNG TỰ ĐỘNG (NHÓM A — đã implement)

### Helper functions cần có trong AdminConsultations.tsx:

```typescript
// Lead mới chưa liên hệ >48h → nền cam
const isStaleNew = (c) => c.status === 'new' && getHoursOld(c.createdAt) > 48;

// Lead mới chưa liên hệ 4–48h → badge vàng cảnh báo
const isUrgentNew = (c) => {
  if (c.status !== 'new') return false;
  const h = getHoursOld(c.createdAt);
  return h >= 4 && h < 48;
};

// Đếm ngày còn lại đến ngày chụp
const getShootingCountdown = (shootingDate) => {
  if (!shootingDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const shoot = new Date(shootingDate); shoot.setHours(0,0,0,0);
  return Math.round((shoot - today) / 86400000);
};

// Priority sort: hot+stale → hot → stale → urgent → new → contacted → registered
const getLeadPriority = (c) => {
  const isHot = (c.favoriteIds?.length||0) >= 3 || !!c.luckyGift || c.source === 'lucky_wheel';
  if (c.status === 'new') {
    if (isHot && isStaleNew(c)) return 0;
    if (isHot) return 1;
    if (isStaleNew(c)) return 2;
    if (isUrgentNew(c)) return 3;
    return 4;
  }
  return c.status === 'contacted' ? 5 : 6;
};
```

### TodayPanel component:
- Hiển thị khi có: lead chưa gọi >4h / hẹn gọi hôm nay / chụp ngày mai (D-1) / chụp sau 3 ngày (D-3)
- Màu đỏ nếu khẩn cấp, màu vàng nếu nhắc nhở thường
- Có thể thu gọn/mở rộng

### Stats rows:
- Row 1: Tổng data / Mới (stale count) / Đã liên hệ / Tỷ lệ chốt
- Row 2: Leads tuần này (trend %) / Doanh thu tháng / Lịch chụp 7 ngày tới

### Badges trong bảng:
- `D-1!` đỏ nhấp nháy cạnh ngày chụp
- `D-3` cam cảnh báo
- `Xh chưa gọi` vàng (4–48h)
- `XN chưa gọi` cam (>48h)

---

## 11. APPSETTNGS INTERFACE (types.ts)

```typescript
export interface AppSettings {
  brandLogo?: string;
  watermarkOpacity?: number;
  watermarkPosition?: string;
  chatEnabled?: boolean;
  chatMessages?: ChatMessageConfig[];
  luckyWheelEnabled?: boolean;
  luckyWheelGifts?: LuckyGift[];
  staffPhones?: string[];
  luckyWheelCTA?: string;
  luckyWheelSubCTA?: string;
  luckyWheelNotificationText?: string;
  luckyWheelNotificationEnabled?: boolean;
  partnerBrand1?: PartnerBrand;
  partnerBrand2?: PartnerBrand;
  showPartnerBrands?: boolean;
  larkWebhookUrl?: string;
  larkNotificationEnabled?: boolean;
  aiConsultantEnabled?: boolean;
  aiConsultantName?: string;
  aiConsultantPrompt?: string;
  integrationChatApiEnabled?: boolean;
  integrationChatApiUrl?: string;
  integrationChatApiKey?: string;
  integrationChatApiModelName?: string;
  integrationChatApiHeaders?: string;
  integrationSheetEnabled?: boolean;
  integrationSheetId?: string;
  integrationSheetName?: string;
  integrationZaloEnabled?: boolean;
  integrationZaloOaId?: string;
  integrationZaloAccessToken?: string;
  integrationScriptNotes?: string;
  welcomeMessage?: string;
  secondWelcomeMessage?: string;
}
```

---

## 12. ENVIRONMENT VARIABLES (Vercel)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ADMIN_EMAIL=admin@studio.com      ← fallback admin check
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/...
VITE_R2_WORKER_URL=https://xxx.workers.dev
VITE_R2_UPLOAD_SECRET=your-secret
GEMINI_API_KEY=AIza...                 ← server-side only (api/chat.ts)
```

---

## 13. QUY TẮC CODE (QUAN TRỌNG)

### Làm:
- Dùng TypeScript strict, define interfaces cho mọi DB row (`DbStyleRow`, `DbAlbumRow`...)
- Dùng `useCallback` cho mọi function trong context
- Dùng soft-delete (`deleted: true`) thay hard-delete cho styles/albums/photos
- Dùng batch upsert cho reorder: `supabase.from('photos').upsert(items.map((p,i) => ({id:p.id,order:i})), {onConflict:'id'})`
- URL ảnh dùng ID-based, không dùng index (`/photo/photo-123` thay vì `/photo/0`)
- Pagination cho consultations: PAGE_SIZE = 50, "Xem thêm" button
- Toast thay alert/confirm cho UX tốt hơn
- Lazy load tất cả pages với `React.lazy()` + `<Suspense>`

### KHÔNG làm:
- KHÔNG hardcode email admin vào code (dùng `VITE_ADMIN_EMAIL` env var)
- KHÔNG dùng Firebase (đã migrate sang Supabase)
- KHÔNG dùng index-based photo URLs
- KHÔNG để 1 Context file >400 lines (tách ra)
- KHÔNG call `window.confirm()` cho xóa (dùng modal confirm)
- KHÔNG để `any` type trong DB interfaces
- KHÔNG import data từ JSON vào DB (chỉ export backup, không import)

---

## 14. TÍNH NĂNG CẦN BUILD (checklist)

### Phase 1 — Nền tảng:
- [ ] Supabase setup (schema + RLS + Auth)
- [ ] Cloudflare R2 Worker setup
- [ ] 5 contexts (Auth/Settings/Consultation/Content/Toast)
- [ ] Routing với lazy loading
- [ ] Layout component (header + footer + mobile bottom bar)

### Phase 2 — Customer-facing:
- [ ] Home page (gallery styles)
- [ ] Style → Album → Photo navigation
- [ ] Favorites system (localStorage)
- [ ] PhoneGate (popup thu SĐT trước khi xem full)
- [ ] Consultation form
- [ ] Lucky Wheel widget
- [ ] AI Chat bubble

### Phase 3 — Admin:
- [ ] Admin login (Supabase Auth)
- [ ] AdminContent (quản lý styles/albums/photos)
- [ ] AdminConsultations (CRM: list + kanban + calendar)
- [ ] AdminSettings (cấu hình tất cả features)
- [ ] AdminTrash (xem/phục hồi đã xóa)

### Phase 4 — Automation (Nhóm A — không cần bên thứ 3):
- [ ] TodayPanel (cần xử lý hôm nay)
- [ ] Badge >4h chưa gọi (isUrgentNew)
- [ ] Badge D-1/D-3 ngày chụp
- [ ] Priority sort tự động
- [ ] Stats tuần/tháng/lịch chụp
- [ ] Auto-tag khi submit

### Phase 5 — Tối ưu:
- [ ] Lark notification khi có lead mới
- [ ] Lark khi đổi trạng thái / chốt HĐ
- [ ] Google Sheets sync
- [ ] Vercel Cron: digest sáng + nhắc follow-up

---

## 15. PROMPT MẪU ĐỂ BẮT ĐẦU

Khi bắt đầu dự án mới, paste prompt này vào Claude Code:

```
Tôi muốn xây dựng một webapp studio cho [TÊN STUDIO] — [MÔ TẢ DỊCH VỤ].

Stack: React 19 + TypeScript + Vite + Supabase + Cloudflare R2 + Vercel + Tailwind CSS.

Hãy đọc CLAUDE.md trong repo này để hiểu toàn bộ kiến trúc, pattern code, 
database schema, và feature list cần implement.

Bắt đầu từ Phase 1: setup Supabase schema và 5 context files theo đúng 
pattern trong CLAUDE.md. Điền thông tin studio vào APP_CONFIG trong mockData.ts:
- brandName: [TÊN STUDIO]
- hotline: [SĐT]
- zaloUrl: [ZALO URL]
- facebookMessengerUrl: [FB URL]
- description: [MÔ TẢ]
```

---

## 16. GHI CHÚ DEPLOY

1. **Vercel**: Connect GitHub repo → auto deploy khi push main
2. **Env vars**: Thêm tất cả biến trong mục 12 vào Vercel dashboard
3. **Supabase**: Enable Realtime cho bảng `consultations` và `settings`
4. **R2**: Tạo bucket + Worker, bật CORS cho domain Vercel
5. **Custom domain**: Thêm trong Vercel → Settings → Domains

---

## 17. SETUP LARK WEBHOOK (production-tested)

### Bước 1 — Tạo bot trong nhóm Lark

1. Mở app Lark → vào nhóm chat của team sale (hoặc tạo nhóm mới)
2. Click tên nhóm ở trên → **Bots** → **Add bot** → **Custom Bot**
3. Đặt tên bot (VD: "Thông báo khách hàng [Tên Studio]")
4. **Cài đặt bảo mật:**
   - ✅ **Bật "Đặt từ khóa"** → nhập 1 từ khóa bí mật (VD: `teamsaleh2o`) → đây là keyword filter bảo vệ webhook
   - ❌ Không cần bật IP whitelist hay xác nhận chữ ký
5. Copy **URL Webhook** → dán vào code

> ⚠️ **QUAN TRỌNG:** URL Webhook là bí mật — không commit lên GitHub public, không đăng lên blog hay issue.

---

### Bước 2 — Cấu hình trong code

**`src/utils/config.ts`** — paste URL webhook vào đây:
```typescript
export const LARK_FALLBACK_URL = 'https://open.larksuite.com/open-apis/bot/v2/hook/YOUR_HOOK_ID';
```

Hoặc tốt hơn, thêm vào **Vercel environment variables**:
```
LARK_WEBHOOK_URL = https://open.larksuite.com/open-apis/bot/v2/hook/YOUR_HOOK_ID
```

---

### Bước 3 — BẮTBUỘC: Thêm keyword vào tất cả tin nhắn

Vì đã bật keyword filter, **mọi tin nhắn gửi qua webhook đều phải chứa từ khóa** đã đặt. Không có từ khóa → Lark trả về `code: 19024 "Key Words Not Found"` và block tin nhắn.

```typescript
// ✅ ĐÚNG — có keyword ở đầu
const text = `teamsaleh2o\n📋 Nội dung tin nhắn...`;

// ❌ SAI — không có keyword → bị block
const text = `📋 Nội dung tin nhắn...`;
```

**Áp dụng cho tất cả nơi gọi Lark:**
- `api/cron-digest.ts` — digest sáng
- `api/cron-stale.ts` — cảnh báo stale leads
- `api/cron-shoots.ts` — nhắc lịch chụp
- Google Apps Script (nếu dùng) — thêm keyword vào body gửi Lark

---

### Bước 4 — Test webhook

Trong terminal **PowerShell** (Windows):
```powershell
Invoke-RestMethod -Uri "YOUR_WEBHOOK_URL" -Method POST -ContentType "application/json" -Body '{"msg_type":"text","content":{"text":"YOUR_KEYWORD\nTest OK!"}}'
```

> ⚠️ **Không dùng `curl` trong PowerShell** — đó là alias của `Invoke-WebRequest`, không tương thích cú pháp Unix. Phải dùng `Invoke-RestMethod` hoặc `curl.exe` (nếu đã cài Git Bash curl).

**Kết quả mong đợi:**
- `{"code": 0}` → thành công, nhóm Lark nhận được tin
- `{"code": 19024, "msg": "Key Words Not Found"}` → thiếu keyword trong message
- `{"code": 19021}` → URL webhook sai hoặc bot bị xóa

---

### Bước 5 — Vercel Cron (tự động gửi theo lịch)

Thêm vào **`vercel.json`**:
```json
{
  "crons": [
    { "path": "/api/cron-digest",  "schedule": "0 1 * * *"  },
    { "path": "/api/cron-stale",   "schedule": "30 1 * * *" },
    { "path": "/api/cron-shoots",  "schedule": "0 10 * * *" }
  ]
}
```

| Cron | UTC | Giờ VN | Tác dụng |
|------|-----|--------|----------|
| `cron-digest` | 01:00 | 08:00 sáng | Danh sách khách mới 24h |
| `cron-stale` | 01:30 | 08:30 sáng | Cảnh báo lead >48h chưa gọi |
| `cron-shoots` | 10:00 | 17:00 chiều | Lịch chụp ngày mai |

> **Lưu ý:** Vercel Cron yêu cầu Pro plan. Nếu dùng Hobby plan, dùng [cron-job.org](https://cron-job.org) (miễn phí) để gọi các endpoint thủ công theo lịch.

---

### Checklist Lark Setup

- [ ] Tạo bot trong nhóm Lark team
- [ ] Ghi lại từ khóa keyword filter đã đặt
- [ ] Dán webhook URL vào `config.ts` hoặc Vercel env var `LARK_WEBHOOK_URL`
- [ ] Thêm keyword vào đầu tất cả message trong cron functions
- [ ] Test bằng `Invoke-RestMethod` → nhận được `code: 0`
- [ ] Thêm cron config vào `vercel.json`
- [ ] Deploy và test thủ công các endpoint `/api/cron-*`

---

*Blueprint này được tạo từ dự án H2O Studio Sale Album — đã production-tested.*
*Cập nhật lần cuối: 2026-06-19*
