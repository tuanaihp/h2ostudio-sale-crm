# Studio Webapp — Blueprint & Hướng dẫn Nhân bản

> **Mục đích:** Copy file này vào root dự án mới, đổi tên thành `CLAUDE.md`.  
> Điền vào các chỗ `[...]` cho phù hợp với studio mới.  
> Claude Code sẽ đọc file này và hiểu toàn bộ context ngay từ đầu.

---

## MỤC LỤC

1. [Thông tin dự án](#1-thông-tin-dự-án)
2. [Tech Stack](#2-tech-stack)
3. [Kiến trúc Context](#3-kiến-trúc-context)
4. [Database Schema (Supabase)](#4-database-schema-supabase)
5. [Cấu trúc file](#5-cấu-trúc-file)
6. [Routing](#6-routing)
7. [Image Upload — 3-tier Fallback](#7-image-upload--3-tier-fallback)
8. [Hệ thống Thông báo — Lark + Telegram](#8-hệ-thống-thông-báo--lark--telegram)
9. [Auto-tag khi Submit Lead](#9-auto-tag-khi-submit-lead)
10. [Admin CRM — Tính năng tự động](#10-admin-crm--tính-năng-tự-động)
11. [Live Chat & Bot AI & AdminChatPanel](#11-live-chat--bot-ai--adminchatpanel)
12. [Kho Câu Hỏi Thực Tế (Knowledge Base)](#12-kho-câu-hỏi-thực-tế-knowledge-base)
13. [Tự động hóa Sale (Sale Automation)](#13-tự-động-hóa-sale-sale-automation)
14. [Lịch Khuyến Mãi (Promotions)](#14-lịch-khuyến-mãi-promotions)
15. [AppSettings Interface](#15-appsettings-interface)
16. [Environment Variables (Vercel)](#16-environment-variables-vercel)
17. [Quy tắc Code](#17-quy-tắc-code)
18. [Checklist Build Phases](#18-checklist-build-phases)
19. [Deploy lên Vercel](#19-deploy-lên-vercel)
20. [Setup Lark Webhook — Chi tiết từng bước](#20-setup-lark-webhook--chi-tiết-từng-bước)
21. [Setup Telegram Bot — Chi tiết từng bước](#21-setup-telegram-bot--chi-tiết-từng-bước)
22. [Prompt mẫu để bắt đầu dự án mới](#22-prompt-mẫu-để-bắt-đầu-dự-án-mới)

---

## 1. Thông tin dự án

```
Tên studio      : [VD: H2O Studio / Beauty Studio / Makeup Studio]
Loại dịch vụ   : [VD: chụp ảnh cưới, makeup cô dâu, spa]
Hotline         : [SĐT]
Zalo URL        : [https://zalo.me/...]
Facebook        : [https://m.me/...]
Mô tả ngắn     : [VD: Studio chụp ảnh cưới chuyên nghiệp tại TP.HCM]
```

---

## 2. Tech Stack

| Layer | Công nghệ | Ghi chú |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript + Vite | |
| Styling | Tailwind CSS v4 | `@tailwindcss/vite` plugin |
| Animation | motion/react | **KHÔNG** dùng framer-motion |
| Icons | lucide-react | |
| Date | date-fns + react-day-picker | |
| Database | Supabase (PostgreSQL) | Auth + Realtime + Storage |
| Images | Cloudflare R2 | Primary CDN, fallback Supabase Storage |
| Hosting | Vercel | Deploy qua CLI (`vercel --prod`) |
| Thông báo | Lark Webhook + Telegram Bot API | Cả hai song song |
| AI Chat | Google Gemini API | `api/chat.ts` serverless |

**KHÔNG dùng:** Firebase, Redux, Axios, moment.js, react-query, framer-motion.

---

## 3. Kiến trúc Context

Tách thành **5 context riêng biệt**, không gộp vào 1 file lớn:

```
src/context/
├── AppContext.tsx          ← thin composer + useApp() backward-compat hook
├── AuthContext.tsx         ← user, isAdmin, isSuperAdmin, login, logout
├── SettingsContext.tsx     ← settings từ Supabase, Realtime subscription
├── ConsultationContext.tsx ← CRM leads, pagination, submit, update, delete
├── ContentContext.tsx      ← styles/albums/photos CRUD
└── ToastContext.tsx        ← showToast(message, type) global
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

**SettingsContext.tsx** — có Realtime subscription:
```typescript
useEffect(() => {
  const loadSettings = async () => { /* fetch from supabase */ };
  loadSettings();
  const channel = supabase.channel('settings-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.global' },
      () => loadSettings())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

> Realtime sync đảm bảo khi admin lưu settings mới (Telegram token, Lark URL...), toàn bộ sessions đang mở đều nhận được cập nhật ngay — không cần refresh.

---

## 4. Database Schema (Supabase)

### Bảng `styles`
```sql
id text PRIMARY KEY,
slug text UNIQUE,
title text,
description text,
cover_image text,
design jsonb,          -- EditorState overlay
order integer,
category text,
deleted boolean DEFAULT false,
deleted_at timestamptz,
updated_at timestamptz DEFAULT now()
```

### Bảng `albums`
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
concept_id text,
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
data jsonb,             -- toàn bộ AppSettings dưới dạng JSON blob
updated_at timestamptz
```

### Bảng `user_roles`
```sql
id uuid PRIMARY KEY,
email text UNIQUE,
phone_number text,
role text,             -- 'admin' | 'super_admin' | 'staff'
display_name text
```

**Row Level Security:** Bật RLS cho tất cả bảng.  
- `consultations`: chỉ admin đọc/ghi  
- `styles/albums/photos`: public read, admin write  
- `settings`: public read (để load config), admin write  

---

## 5. Cấu trúc file

```
src/
├── pages/
│   ├── Home.tsx                ← trang chủ, gallery styles
│   ├── StyleDetail.tsx         ← danh sách albums của 1 style
│   ├── AlbumDetail.tsx         ← danh sách photos + cross-sell + sticky CTA
│   ├── PhotoView.tsx           ← xem ảnh full (swipe + double-tap like)
│   ├── Favorites.tsx           ← danh sách yêu thích + ?preview= cho team sale
│   ├── AdminConsultations.tsx  ← CRM chính (list + kanban + calendar + nav bar)
│   ├── AdminContent.tsx        ← quản lý styles/albums/photos
│   ├── AdminSettings.tsx       ← cấu hình hệ thống (5 tabs)
│   ├── AdminLogin.tsx
│   ├── AdminTrash.tsx
│   ├── AdminScripts.tsx        ← kho kịch bản chốt sale (sale_scripts table)
│   ├── AdminPromotions.tsx     ← lịch khuyến mãi (3 tab: lịch / danh sách / thống kê)
│   └── AdminKnowledgeBase.tsx  ← kho câu hỏi thực tế (customer_faqs table)
├── components/
│   ├── Layout.tsx              ← header + footer + bottom bar mobile + <PromoBanner />
│   ├── AlbumCard.tsx           ← card album (social proof badge, zoom-out hover)
│   ├── OptimizedImage.tsx      ← skeleton shimmer loader
│   ├── ConsultationModal.tsx   ← form đăng ký nhận báo giá
│   ├── ChatModal.tsx
│   ├── PhoneGate.tsx           ← popup yêu cầu SĐT
│   ├── LiveChatWidget.tsx      ← CHAT button + auto-open 10s + Bot standalone fallback
│   ├── LiveChatBubble.tsx      ← customer chat panel + Bot Tầng 1/2 (callBotTier1/2)
│   ├── AdminChatPanel.tsx      ← admin side-drawer: session list + reply + @kịch bản + 📷 album + 📌 FAQ
│   ├── PromoBanner.tsx         ← banner KM trên website (dismiss to sessionStorage)
│   ├── PromoGrid.tsx           ← Two-Panel grid trang chủ: trái=Top concept (promoGridItems config), phải=KM đang chạy Supabase (adaptive 1-3 list / 4 grid)
│   ├── LuckyWheelWidget.tsx
│   ├── ImageCropperModal.tsx
│   └── PartnerBrandsIcons.tsx
├── context/                    ← 5 contexts (xem mục 3)
├── utils/
│   ├── config.ts               ← GOOGLE_SCRIPT_URL, LARK_FALLBACK_URL, R2_WORKER_URL
│   ├── image.ts                ← uploadImageToStorage(), getDisplayImageUrl()
│   ├── phone.ts                ← validateVietnamesePhone()
│   └── synonyms.ts             ← SYNONYM_GROUPS + expandQuery() cho Bot Tầng 1
├── types.ts                    ← tất cả interfaces + DbRow types
├── supabase.ts                 ← createClient
├── index.css                   ← shimmer, heartBurst keyframes
└── data/
    └── mockData.ts             ← APP_CONFIG (brandName, hotline, zaloUrl...)
api/
├── lark-notify.ts              ← Vercel serverless: gửi Lark (post format + fallback text)
├── telegram-notify.ts          ← Vercel serverless: gửi Telegram Bot (HTML format)
├── chat.ts                     ← Vercel serverless: AI chat (Gemini)
├── live-chat-bot.ts            ← Vercel serverless: Bot Tầng 2 (Gemini + kịch bản context)
└── bot.ts                      ← Vercel serverless: OG meta tags cho social preview
```

---

## 6. Routing

```typescript
// Tất cả pages dùng lazy() + Suspense
const Home = lazy(() => import('./pages/Home'));
// ...

/ → Home
/style/:styleSlug → StyleDetail
/style/:styleSlug/album/:albumSlug → AlbumDetail
/style/:styleSlug/album/:albumSlug/photo/:photoId → PhotoView (ID-based)
/favorites → Favorites (+ ?preview=id1,id2,... cho team sale)
/admin → Navigate to /admin/consultations
/admin/consultations → AdminConsultations (auth guard)
/admin/content → AdminContent (auth guard)
/admin/settings → AdminSettings (super_admin only)
/admin/login → AdminLogin
/admin/trash → AdminTrash
/admin/scripts → AdminScripts (kho kịch bản chốt sale)
/admin/promotions → AdminPromotions (lịch khuyến mãi)
/admin/knowledge-base → AdminKnowledgeBase (kho câu hỏi thực tế)
```

**`vercel.json` rewrites + crons** (bắt buộc cho SPA + cron jobs):
```json
{
  "rewrites": [
    { "source": "/((?!api).+)", "destination": "/index.html" }
  ],
  "crons": [
    { "path": "/api/cron-digest",   "schedule": "0 1 * * *"   },
    { "path": "/api/cron-stale",    "schedule": "30 1 * * *"  },
    { "path": "/api/cron-shoots",   "schedule": "0 10 * * *"  },
    { "path": "/api/cron-followup", "schedule": "0 */2 * * *" }
  ]
}
```

> Cron schedules dùng UTC: `0 1 * * *` = 8:00 VN, `30 1 * * *` = 8:30 VN, `0 10 * * *` = 17:00 VN, `0 */2 * * *` = mỗi 2h.

---

## 7. Image Upload — 3-tier Fallback

```typescript
// utils/image.ts
export const uploadImageToStorage = async (base64: string, filename: string, label: string) => {
  // Tier 1: Cloudflare R2 Worker
  try {
    const res = await fetch(R2_WORKER_URL, {
      method: 'POST',
      body: JSON.stringify({ image: base64, filename }),
      headers: { 'Content-Type': 'application/json', 'X-Secret': R2_SECRET },
    });
    if (res.ok) return (await res.json()).url;
  } catch {}

  // Tier 2: Supabase Storage
  const blob = await (await fetch(base64)).blob();
  const { data } = await supabase.storage.from('images').upload(filename, blob, { upsert: true });
  if (data) return supabase.storage.from('images').getPublicUrl(data.path).data.publicUrl;

  // Tier 3: Trả về base64 trực tiếp (emergency fallback)
  return base64;
};
```

Cloudflare R2 URL: `https://pub-b5046a0852444fc2af23edc3243b730a.r2.dev`  
R2 Worker URL: lưu trong `VITE_R2_WORKER_URL` (Vercel env var).

---

## 8. Hệ thống Thông báo — Lark + Telegram

### Luồng hoạt động

Khi khách submit form đăng ký → `ConsultationContext.submitConsultation()`:

```
1. Lưu vào Supabase (consultations table)
2. [Song song] Gọi /api/lark-notify     ← nếu larkNotificationEnabled !== false
3. [Song song] Gọi /api/telegram-notify ← nếu telegramNotificationEnabled === true
4. Gọi Google Apps Script               ← sync Google Sheets (fire-and-forget)
```

Cả 2 thông báo đều **fire-and-forget** (không block form submit, không ảnh hưởng UX).

### Code trong ConsultationContext.tsx

```typescript
// Lark
if (settings?.larkNotificationEnabled !== false) {
  fetch('/api/lark-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name, phone, source, luckyGift,
      favoriteCount: favoriteIds?.length || 0,
      albums: favoriteAlbums || [],        // [{title, url, styleName}]
      webhookUrl: settings?.larkWebhookUrl || undefined,
    }),
  }).catch(console.error);
}

// Telegram
if (settings?.telegramNotificationEnabled && settings?.telegramBotToken && settings?.telegramChatId) {
  fetch('/api/telegram-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name, phone, source, luckyGift,
      albums: favoriteAlbums || [],
      botToken: settings.telegramBotToken,
      chatId: settings.telegramChatId,
    }),
  }).catch(console.error);
}
```

### api/lark-notify.ts — key points

- Format: `msg_type: 'post'` với `tag: 'a'` cho link clickable
- Bắt buộc có **keyword filter** ở dòng đầu (xem mục 16)
- Nếu post format fail (`result.code !== 0`) → tự fallback về `msg_type: 'text'`
- Nhận `webhookUrl` từ body (ưu tiên settings Supabase hơn env var)

### api/telegram-notify.ts — key points

- Dùng Telegram Bot API: `POST https://api.telegram.org/bot{TOKEN}/sendMessage`
- Format: HTML (`parse_mode: 'HTML'`) với `<a href="...">` cho link clickable
- Nhận `botToken` và `chatId` từ body request
- `disable_web_page_preview: true` để không preview link album

### Cấu hình trong Admin Settings

Vào **Admin → Settings → tab "Cổng kết nối"** (hoặc tab "Thông báo"):

| Trường | Mô tả |
|--------|-------|
| Lark Webhook URL | URL từ Custom Bot trong nhóm Lark |
| Telegram Bot Token | Token từ @BotFather |
| Telegram Chat ID | ID nhóm (âm, VD: -1001234567890) hoặc ID cá nhân |

---

## 9. Auto-tag khi Submit Lead

```typescript
const autoTags: string[] = [];
if (data.luckyGift) autoTags.push('Có quà');
if (data.source === 'lucky_wheel') autoTags.push('Vòng quay');
if ((data.favoriteIds?.length || 0) >= 3) autoTags.push('Tiềm năng cao');
else if ((data.favoriteIds?.length || 0) > 0) autoTags.push('Đã thích album');
if (autoTags.length > 0) row.tags = autoTags;
```

---

## 10. Admin CRM — Tính năng tự động

### Helper functions (AdminConsultations.tsx)

```typescript
const isStaleNew = (c) => c.status === 'new' && getHoursOld(c.createdAt) > 48;
const isUrgentNew = (c) => {
  if (c.status !== 'new') return false;
  const h = getHoursOld(c.createdAt);
  return h >= 4 && h < 48;
};
const getShootingCountdown = (shootingDate) => {
  if (!shootingDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const shoot = new Date(shootingDate); shoot.setHours(0,0,0,0);
  return Math.round((shoot.getTime() - today.getTime()) / 86400000);
};
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

### Badges trong bảng CRM

| Badge | Màu | Điều kiện |
|-------|-----|-----------|
| `D-1!` | Đỏ nhấp nháy | Ngày chụp ngày mai |
| `D-3` | Cam | Ngày chụp sau 3 ngày |
| `Xh chưa gọi` | Vàng | Lead mới 4–48h chưa liên hệ |
| `XN chưa gọi` | Cam | Lead mới >48h chưa liên hệ |

### TodayPanel

Hiển thị khi có: lead chưa gọi >4h / hẹn gọi hôm nay / chụp D-1 / chụp D-3.

### Bảng CRM — Thứ tự cột & UX

**Thứ tự cột** (Trạng thái và Sale đặt ngay sau Liên hệ — tối ưu thao tác cho team sale):

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Khách hàng | Tên, HOT/WARM badge, urgency timer |
| 2 | Liên hệ | Phone + nút Gọi/Zalo |
| 3 | **Trạng thái** | StatusDropdown — cột hành động đặt sớm, không bị khuất |
| 4 | **Sale & Hẹn gọi** | Input tên sale + date picker hẹn gọi |
| 5 | Nguồn | Website/Facebook/Vòng quay |
| 6 | Lời nhắn | Truncate, URL tách sang cột Link |
| 7 | Ghi chú & Tags | NoteInput + TagsInput inline |
| 8 | Link tham khảo | Links extracted từ message |
| 9 | Ngày dự kiến | **Auto-ẩn** khi không có row nào có data hợp lệ |
| 10 | Thao tác | Kịch bản / Zalo / Xóa |

**Cột "Ngày dự kiến" tự ẩn khi không có data:**
```tsx
const showNgayDuKienCol = filteredConsultations.some(c => c.status === 'registered' || !!c.date);
// Render <th> và <td> chỉ khi showNgayDuKienCol === true
{showNgayDuKienCol && <th className="p-4 font-bold">Ngày dự kiến</th>}
{showNgayDuKienCol && (<td className="p-4 text-sm text-dark/80">...</td>)}
```

**FunnelBar — cảnh báo tắc nghẽn pipeline:**
```tsx
const newCount = consultations.filter(c => c.status === 'new').length;
// Trong PIPELINE_STAGES.map():
const isBottleneck = i === 1 && count === 0 && newCount > 0;
// Stage "Đã gọi" = 0 nhưng có leads Mới → highlight đỏ + "⚠ Cần gọi!" animate-pulse
<div className={`... ${isBottleneck ? 'bg-red-50 border-red-300' : `${cfg.bgColor} ${cfg.borderColor}`}`}>
```

**Nút Đăng xuất:** luôn dùng màu xám nhẹ (`text-dark/40 hover:bg-light-gray`) — không dùng đỏ để tránh nhầm với nút xóa.

### Team Sale — Xem concept khách đã chọn

Trong CRM, khi mở chi tiết lead → tab "Khách thích" hiển thị:
- Thumbnail album (40×48px)
- Nút "Mở album" và "Copy link"
- Nút "Copy tất cả link"
- Link `/favorites?preview=id1,id2,...` → trang gallery read-only cho team xem concept

---

## 11. Live Chat & Bot AI & AdminChatPanel

### Tổng quan kiến trúc

```
Khách (LiveChatWidget + LiveChatBubble)  ←→  Supabase Realtime  ←→  Admin (AdminChatPanel)
                                                                          ↕
                                                                   Bot AI (/api/live-chat-bot)
```

### Database tables cần thêm

```sql
-- Chat sessions
CREATE TABLE chat_sessions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  consultation_id text REFERENCES consultations(id),
  phone text NOT NULL,
  name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'waiting',  -- 'waiting' | 'open' | 'closed'
  stage text NOT NULL DEFAULT 'new',       -- STAGE_OPTIONS values
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  unread_admin integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Chat messages
CREATE TABLE chat_messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id text NOT NULL REFERENCES chat_sessions(id),
  sender text NOT NULL,   -- 'customer' | 'admin'
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Sale scripts (Kho kịch bản)
CREATE TABLE sale_scripts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phase text NOT NULL,    -- 'opening' | 'discovery' | 'value_prop' | 'offer' | 'fomo' | 'closing' | 'pre_shoot' | 'followup'
  title text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  order_num integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### LiveChatWidget.tsx (customer side)

- Galaxy gradient CHAT button (bottom-right) + Phone button
- **Controlled pattern**: button controls `liveChatOpen` state → passed to `<LiveChatBubble controlledOpen={...} onClose={...} />`
- Auto-open `LiveChatBubble` sau 10 giây (chỉ 1 lần mỗi session, dùng `sessionStorage`)
- Import `playNotifSound()` từ `LiveChatBubble` để phát sound khi auto-open
- **Independence**: khi `liveChatEnabled === false` nhưng bot đang BẬT → render `<LiveChatBubble>` standalone (có bubble button riêng) thay vì `return null` hoàn toàn
- Nếu cả widget lẫn bot đều TẮT → `return null`

```tsx
if (settings?.liveChatEnabled === false) {
  if (settings?.chatBotEnabled === true || settings?.chatBotTier2Enabled === true) {
    return <LiveChatBubble chatBotEnabled={...} chatBotTier2Enabled={...} integrationConfig={...} />;
  }
  return null;
}
```

### LiveChatBubble.tsx — props

```typescript
interface Props {
  controlledOpen?: boolean;    // controlled mode: không render button riêng
  onClose?: () => void;
  chatBotEnabled?: boolean;    // Tầng 1: keyword match, không tốn API
  chatBotTier2Enabled?: boolean; // Tầng 2: Gemini/ChatGPT + kịch bản context
  integrationConfig?: {
    chatApiEnabled?: boolean;
    chatApiUrl?: string;
    chatApiKey?: string;
    chatApiModelName?: string;
  };
}
```

- **Standalone mode** (không có `controlledOpen`): tự render bubble button + panel
- **Controlled mode** (`controlledOpen` có value): chỉ render panel, không render button
- Export `playNotifSound()` (Web Audio API, không cần file âm thanh)
- **Tầng 2 ưu tiên hơn Tầng 1**: nếu cả hai bật → chạy Tầng 2

### Bot AI — 2 tầng

**Tầng 1 — `callBotTier1()` (client-side, miễn phí):**
- Fetch `sale_scripts` từ Supabase, score theo từ khóa trong `title` (+3), `tags` (+2), `content` (+1)
- Trả về `content` của kịch bản khớp nhất (tối đa 450 ký tự); nếu không khớp → default message
- Delay 0.8–1.5s để tự nhiên
- **Không tốn API cost**

**Tầng 2 — `callBotTier2()` (server-side API):**
- Gọi `/api/live-chat-bot` với scripts + history
- Endpoint dùng Gemini hoặc custom ChatGPT API (theo `integrationConfig`)
- Delay 1.2–2s
- Cần `GEMINI_API_KEY` hoặc cấu hình API tại tab "Cổng kết nối"

```typescript
// Trong send(): Tầng 2 ưu tiên
if (chatBotTier2Enabled && sessionId) {
  callBotTier2(content, nextMsgs, sessionId);
} else if (chatBotEnabled && sessionId) {
  callBotTier1(content, sessionId);
}
```

### AdminChatPanel.tsx — tính năng

**Session list (left sidebar):**
- Danh sách chat sessions, realtime (Supabase `postgres_changes`)
- Badge đỏ unread count
- Auto-select session theo `initialPhone` prop

**Conversation area (right):**
- Stage selector (dropdown) → cập nhật `chat_sessions.stage` → load kịch bản phù hợp
- Messages realtime, mark-as-read khi active
- Link CRM: nếu `session.phone` khớp với consultation → hiển thị CRM status badge

**Script hints:**
- Accordion ở trên input, load kịch bản theo stage hiện tại
- Copy / Dùng ngay vào input

**`@` script search:**
- Gõ `@` trong textarea → dropdown filter kịch bản từ toàn bộ kho (`sale_scripts`)
- Format: `@từ khóa` → lọc theo title, phase, content, tags
- Click hoặc Enter → chèn nội dung kịch bản vào input (thay thế `@query`)
- Escape → đóng dropdown

**📷 Album picker:**
- Button Camera (📷) trong reply input area → toggle album picker panel
- Panel hiển thị toàn bộ albums từ `styles` context với thumbnails (3 cột)
- Search theo tên album hoặc tên style
- Click album → chèn vào input: `💕 Xem album này nhé anh/chị: {origin}/style/{slug}/album/{albumSlug}`
- URL format: `window.location.origin + /style/:styleSlug/album/:albumSlug`

```typescript
const insertAlbumLink = (style: Style, album: Album) => {
  const url = `${window.location.origin}/style/${style.slug}/album/${album.slug}`;
  const link = `💕 Xem album này nhé anh/chị: ${url}`;
  setInput(prev => prev ? prev + '\n' + link : link);
  setShowAlbumPicker(false);
};
```

### Admin notification (AdminConsultations.tsx)

- Realtime subscription `admin_chat_unread` → tổng unread count
- Realtime subscription `admin_new_msgs` → toast popup khi có tin nhắn mới
- Badge đỏ nhấp nháy trên nút "Chat khách"
- Browser Notification khi tab ẩn (`document.hidden`)
- `chatPanelOpenRef` (useRef) để tránh toast khi panel đang mở

### Bật/tắt trong AdminSettings

| Setting | Key | Mặc định |
|---------|-----|---------|
| Widget CHAT website | `liveChatEnabled` | `true` |
| Bot Tầng 1 · Kịch bản | `chatBotEnabled` | `false` |
| Bot Tầng 2 · AI API | `chatBotTier2Enabled` | `false` |

3 setting **độc lập nhau**:
- `liveChatEnabled = false`: ẩn nút CHAT + widget (nhưng bot vẫn chạy standalone nếu bật)
- `chatBotEnabled = true`: Bot Tầng 1 tự khớp kịch bản → trả lời miễn phí
- `chatBotTier2Enabled = true`: Bot Tầng 2 gọi Gemini/ChatGPT → thông minh hơn, tốn API cost  
  → Khi Tầng 2 bật, Tầng 2 ưu tiên hoàn toàn (Tầng 1 không chạy song song)

---

## 12. Kho Câu Hỏi Thực Tế (Knowledge Base) + Tự Học

### Tổng quan — Vòng tự học khép kín

```
Khách chat → Bot Tầng 1 match?
  ├─ YES → trả lời + tăng usage_count
  └─ NO  → tự lưu câu hỏi vào pending (is_approved=false, source='from_chat_auto')
               ↓
         AdminKnowledgeBase: "Chờ duyệt" section
               ↓
         Admin điền đáp án → Duyệt
               ↓
         FAQ vào kho (is_approved=true) → bot dùng từ lần sau
```

Thêm vào đó, admin có thể thủ công lưu bằng nút **📌 Lưu vào kho** trong AdminChatPanel (source=`from_chat`).

### Database table: `customer_faqs`

```sql
CREATE TABLE customer_faqs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',     -- rỗng khi pending
  category text NOT NULL DEFAULT 'khac',
  tags text[] DEFAULT '{}',
  usage_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',  -- 'manual' | 'from_chat' | 'from_chat_auto'
  is_approved boolean NOT NULL DEFAULT true,  -- false = pending review
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE customer_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved" ON customer_faqs FOR SELECT USING (is_approved = true);
CREATE POLICY "Admin all access" ON customer_faqs FOR ALL USING (auth.role() = 'authenticated');
```

**Source values:**
- `manual` — admin tự thêm tay trong AdminKnowledgeBase
- `from_chat` — admin click "📌 Lưu vào kho" trong AdminChatPanel  
- `from_chat_auto` — bot tự ghi khi score=0 (pending, is_approved=false)
- `H2O_CHAT_0001` (và các `H2O_CHAT_*` tiếp theo) — import từ hội thoại thực tế H2O Studio, ngôn ngữ chính xác của sale, is_approved=true

**Import thực tế:**
- `supabase_import_thucte_001.sql` — 12 FAQs + 14 scripts từ hội thoại thực H2O_CHAT_0001
- File `noidunggoc.md` — kho lưu các cuộc hội thoại gốc để phân tích và import
- File `kich_ban_chot_sale.md` — kịch bản chốt sale tổng hợp từ hội thoại thực
- Quy trình: thêm hội thoại mới vào `noidunggoc.md` → phân tích → tạo SQL → import

### src/utils/synonyms.ts

- `SYNONYM_GROUPS`: mảng `[từ chính, [đồng nghĩa...]]` — ~20 nhóm từ ngữ cảnh chụp ảnh cưới
- `expandQuery(query)`: expand câu hỏi thành set từ khóa đã mở rộng

```typescript
expandQuery("bao nhiêu tiền")
// → ["bao", "nhiêu", "tiền", "giá", "chi", "phí", "báo", "giá", "tiền", ...]
```

### AdminKnowledgeBase.tsx (`/admin/knowledge-base`)

- **Stats cards:** Tổng Q&A · Từ chat thực tế · Bot đã dùng N lần · Chờ duyệt (amber badge)
- **Pending Review Queue (mới):** collapsible amber section — hiện khi có pending FAQs:
  - Mỗi item: câu hỏi khách, textarea điền đáp án, chọn category
  - Nút **Duyệt & Lưu** → update `is_approved=true`, answer, category → bot dùng ngay
  - Nút **Bỏ qua** → xóa khỏi DB
- Filter category + search (chỉ hiển thị approved FAQs)
- FAQ cards: click để xem câu trả lời đầy đủ
- Badge "💬 Chat thực tế" (from_chat), "🤖 Bot tự học" (from_chat_auto), "✅ Bot dùng N×"
- Push to Script: đẩy Q&A lên Kho Kịch Bản (sale_scripts)

### AdminChatPanel.tsx — nút 📌 Lưu vào kho

- Hover vào tin nhắn của khách → hiện `BookmarkPlus` button
- Click → modal pre-fill:
  - Question = nội dung tin nhắn khách đó
  - Answer = tin nhắn admin kế tiếp sau câu hỏi đó (nếu có)
- Admin chỉnh sửa rồi chọn category + tags → Save (source=`from_chat`, is_approved=true)

### Bot Tầng 1 — search logic (LiveChatBubble.tsx)

```typescript
// Fetch song song 3 nguồn (FAQ + kịch bản + khuyến mãi đang chạy)
const todayStr = new Date().toISOString().split('T')[0];
const [{ data: faqData }, { data: scriptData }, { data: promoData }] = await Promise.all([
  supabase.from('customer_faqs').select('id, question, answer, tags, usage_count').eq('is_approved', true),
  supabase.from('sale_scripts').select('id, phase, title, content, tags').eq('enabled', true).order('order_num', { ascending: true }),
  supabase.from('promotions').select('title, short_desc, emoji, end_date')
    .eq('enabled', true).eq('show_on_website', true)
    .lte('start_date', todayStr).gte('end_date', todayStr).limit(2),
]);

// Mở rộng từ khóa
const words = expandQuery(customerMessage);

// TF-IDF: tính IDF từ toàn bộ corpus (FAQ + kịch bản)
// → từ phổ biến như "có/không/bao" → trọng số thấp
// → từ đặc trưng như "ngoại cảnh/đặt cọc" → trọng số cao
const allDocs = [
  ...(faqData||[]).map(f => [f.question, f.answer, ...(f.tags||[])].join(' ').toLowerCase()),
  ...(scriptData||[]).map(s => [s.title, s.content, ...(s.tags||[])].join(' ').toLowerCase()),
];
const N = Math.max(allDocs.length, 1);
const df: Record<string,number> = {};
allDocs.forEach(doc => {
  new Set(doc.split(/\s+/).filter(w=>w.length>=2)).forEach(w => { df[w]=(df[w]||0)+1; });
});
const idf = (w: string) => Math.log((N+1)/((df[w]||0)+1)) + 1; // smoothed IDF

// Score = Σ(base_weight × IDF(word))
// FAQ:    question ×4, tags ×2, answer ×1  + usage_count boost log1p×0.3
// Script: title ×3,   tags ×2, content ×1

if (best && best.score > 0) {
  // Trả lời + inject promoFooter nếu câu hỏi về giá hoặc kịch bản offer/fomo/closing
  // + tăng usage_count (non-blocking)
} else {
  // Fallback: Zalo/Hotline deeplink từ APP_CONFIG (KHÔNG dùng settings?.zaloUrl)
  const zaloUrl = APP_CONFIG.zaloUrl;
  const hotline = APP_CONFIG.hotline;
  // TỰ HỌC: lưu câu hỏi vào pending (is_approved=false, source='from_chat_auto')
  if (customerMessage.trim().length >= 8) {
    supabase.from('customer_faqs').insert({ ..., is_approved: false, source: 'from_chat_auto' })
  }
}
```

> ⚠️ **Deeplink Zalo/Hotline** trong fallback dùng `APP_CONFIG` từ `src/data/mockData.ts`, KHÔNG phải `settings?.zaloUrl` (AppSettings không có field này).

> 💡 **TF-IDF** tính toán hoàn toàn trong memory mỗi request — không cần API, không cần DB thêm. Corpus là toàn bộ FAQ + kịch bản đã fetch cùng request đó.

---

## 13. Tự động hóa Sale (Sale Automation)

### Tổng quan 6 tính năng

| # | Tính năng | File |
|---|-----------|------|
| A | Bot tự mention KM đang chạy khi khách hỏi giá | `LiveChatBubble.tsx` |
| B | Fallback bot có deeplink Zalo/Hotline | `LiveChatBubble.tsx` |
| C | Chat stage → CRM status sync tự động | `AdminChatPanel.tsx` |
| D | 4 Vercel Cron Jobs | `vercel.json` + `api/cron-*.ts` |
| E | Badge ⭐ Xin review sau ngày chụp | `AdminConsultations.tsx` |
| F | Track style đã xem → gửi kèm consultation | `StyleDetail.tsx` + `ConsultationModal.tsx` |

### A — Bot mention khuyến mãi

`callBotTier1` fetch thêm bảng `promotions` (max 2 KM đang chạy). Khi câu hỏi liên quan giá/ưu đãi, hoặc kịch bản khớp phase `offer/fomo/closing` → inject `promoFooter` vào cuối câu trả lời.

`callBotTier2` cũng truyền `activePromos` xuống `/api/live-chat-bot` để LLM có context.

### B — Fallback Zalo/Hotline

Khi bot không match (score=0), trả về message kèm deeplink:
```
💬 Chat Zalo ngay: {APP_CONFIG.zaloUrl}
📞 Hotline: {APP_CONFIG.hotline}
```
Nguồn: `APP_CONFIG` từ `src/data/mockData.ts` (KHÔNG phải `settings?.zaloUrl`).

### C — Stage → CRM sync

```typescript
// AdminChatPanel.tsx — updateStage()
const STAGE_TO_CRM_STATUS: Record<string, string> = {
  discovery: 'consulting', consulting: 'consulting',
  offer: 'quoted', fomo: 'quoted', closing: 'quoted',
  pre_shoot: 'registered', followup: 'contacted',
};
// Khi admin đổi stage → tự cập nhật consultations.status
```

### D — Vercel Cron Jobs (3 jobs — Hobby plan)

| File | Schedule (UTC) | Giờ VN | Mục đích |
|------|----------------|--------|---------|
| `api/cron-digest.ts` | `0 1 * * *` | 8:00 | Tổng lead mới qua đêm |
| `api/cron-stale.ts` | `30 1 * * *` | 8:30 | Lead >48h chưa xử lý |
| `api/cron-shoots.ts` | `0 10 * * *` | 17:00 | Lịch chụp D-1/D-3 |

> ⚠️ **`api/cron-followup.ts`** (golden window 2–6h) đã bị **xóa khỏi `vercel.json`** vì Vercel Hobby plan chỉ cho phép daily cron (`0 */2 * * *` bị chặn). File `api/cron-followup.ts` vẫn tồn tại trong code nhưng không được schedule.

### E — Badge ⭐ Xin review

Trong bảng CRM (`AdminConsultations.tsx`), hiện badge màu vàng khi `getShootingCountdown(consult.shootingDate) < -1` (ngày chụp đã qua > 1 ngày):

```tsx
{getShootingCountdown(consult.shootingDate) !== null && 
 getShootingCountdown(consult.shootingDate)! < -1 && 
 <span className="bg-yellow-400 text-yellow-900 ...">⭐ Xin review</span>}
```

### F — Tracking style đã xem

`StyleDetail.tsx`: mỗi lần khách vào trang style → ghi `{ id, title, count }` vào `localStorage['h2o_viewed_styles']` (max 8 styles gần nhất).

`ConsultationModal.tsx`: trước khi submit → đọc localStorage, append vào message:
```
[Đã xem: Rustic ×2, Vintage, Modern ×3]
```
Sale thấy ngay khách quan tâm style nào mà không cần hỏi.

### G — HOT TRENDING tự động (album_likes)

Badge **HOT TRENDING** trên AlbumCard được tính từ lượt thích thực tế, không hardcode.

**Supabase table cần tạo:**
```sql
CREATE TABLE album_likes (
  album_id   text,
  session_id text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (album_id, session_id)
);
ALTER TABLE album_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw" ON album_likes FOR ALL USING (true) WITH CHECK (true);
```

**Logic:**
- Khách nhấn ❤️ → ghi `(album_id, session_id)` vào `album_likes` (session_id từ localStorage, anonymous)
- `StyleDetail.tsx` fetch `album_likes` → đếm per album → top 3 nhiều like nhất = HOT TRENDING
- Nếu chưa có data thực → fallback legacy: `index < 5 && displayLikes >= 5000`
- Admin vẫn chỉnh được `displayLikes` (số hiển thị); khách thấy `displayLikes + realLikeCount`

**Files liên quan:** `AuthContext.tsx` (`toggleFavorite`), `StyleDetail.tsx` (`albumLikeCounts`, `hotAlbumIds`), `AlbumCard.tsx` (`isHot`, `realLikeCount` props), `types.ts` (`realLikeCount?: number`)

### H — Staff Access qua Settings

`isAdmin` trong `useApp()` check 2 nguồn:
```typescript
// AppContext.tsx
const staffPhones = settingsCtx.settings?.staffPhones || [];
const isAdmin = auth.isAdmin ||
  (auth.user !== null && auth.checkPhoneInWhitelist(auth.userPhone, staffPhones));
```

- **`auth.isAdmin`**: phone nằm trong `HARDCODED_STAFF_PHONES` (cứng trong code) hoặc superAdmin email
- **`staffPhones` from Settings**: admin thêm số điện thoại qua trang Admin → Settings → "Số điện thoại nhân viên"
- **Yêu cầu Supabase auth**: `auth.user !== null` để tránh bypass — nhân viên phải đăng nhập qua `staff@h2ostudio.com`

**Auto-create staff account** (`AdminLogin.tsx`): nếu `signInWithPassword` trả về "Invalid login credentials" → tự `signUp` rồi login lại — không cần tạo thủ công trên Supabase Dashboard.

---

## 14. Lịch Khuyến Mãi (Promotions)

### Tổng quan

Hệ thống quản lý chương trình khuyến mãi theo lịch, tích hợp với CRM để đo hiệu quả.

```
Admin tạo KM → PromoBanner hiện trên website → Khách đăng ký → Auto-tag lead → Stats đếm leads/KM
```

### Database table: `promotions`

```sql
CREATE TABLE promotions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  short_desc text NOT NULL DEFAULT '',   -- mô tả ngắn, hiện trên lịch + banner
  content text NOT NULL DEFAULT '',     -- nội dung đầy đủ
  emoji text NOT NULL DEFAULT '🎉',
  color text NOT NULL DEFAULT '#A4756B', -- màu dot/border/text
  bg_color text NOT NULL DEFAULT '#FFF5F3', -- màu nền
  start_date date NOT NULL,
  end_date date NOT NULL,
  cta_text text NOT NULL DEFAULT 'Đăng ký nhận ưu đãi',
  show_on_website boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  image_url text NOT NULL DEFAULT '',       -- ảnh banner AI tạo (DALL-E), lưu URL R2
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read promotions" ON promotions FOR SELECT USING (true);
CREATE POLICY "Admin manage promotions" ON promotions FOR ALL USING (true);

-- Migration (thêm cột nếu bảng đã tồn tại):
-- ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';
```

### Files

| File | Mô tả |
|------|-------|
| `src/pages/AdminPromotions.tsx` | Trang admin quản lý KM — 4 tab + AI features |
| `api/ai-image.ts` | DALL-E 3 image generation endpoint |
| `src/components/PromoBanner.tsx` | Banner KM hiển thị trên website |

Route: `/admin/promotions` — thêm trong `App.tsx`.

### AdminPromotions — 3 tab

**Tab Lịch:**
- Calendar tháng tự build (không dùng react-day-picker), bắt đầu thứ Hai
- Mỗi ngày có KM → hiện pill màu: `{emoji} {title}` với `backgroundColor: p.bgColor, color: p.color`
- Click ngày → panel bên phải hiện tất cả KM ngày đó (PromoCard)
- Button "+ Thêm KM" tự điền ngày đã chọn vào form

```typescript
// Calendar day offset (Mon-start)
const dow = getDay(startOfMonth(viewMonth)); // 0=Sun, 1=Mon
const offset = dow === 0 ? 6 : dow - 1;
const calDays = [...Array(offset).fill(null), ...daysOfMonth];

// KM nào cover ngày này?
const promosForDay = (day: Date) => promos.filter(p =>
  p.enabled && isWithinInterval(day, { start: parseISO(p.startDate), end: parseISO(p.endDate) })
);
```

**Tab Danh sách:**
- Sorted by `start_date DESC`
- Status badge: Đang chạy / Sắp diễn ra / Đã kết thúc
- Inline confirm delete (không dùng `window.confirm`)
- Toggle bật/tắt realtime

**Tab Thống kê:**
- Year selector (năm trước/sau)
- Bar chart CSS thuần — không cần thư viện chart
- Top 3 podium card (🏆🥈🥉)
- Đếm leads theo tag: `consultations.filter(c => c.tags?.includes('🎉 KM: ${p.title}'))`

### PromoBanner.tsx (customer side)

- Mounted trong `Layout.tsx` ngay sau `<header>` (trước `<main>`)
- `useLocation()` để skip admin pages: `if (pathname.startsWith('/admin')) return null`
- Query Supabase: `enabled=true AND show_on_website=true AND start_date <= today AND end_date >= today LIMIT 1`
- Dismiss → lưu `sessionStorage.setItem('promo_dismissed_${id}', '1')`
- Click banner → expand panel với full content + CTA button (link đến `/favorites`)

```tsx
// Layout.tsx
import { PromoBanner } from './PromoBanner';
// ...
<header>...</header>
<PromoBanner />
<main>...</main>
```

### Auto-tag leads với active promo

Trong `ConsultationContext.submitConsultation()`, sau khi build autoTags:

```typescript
// Auto-tag với KM đang chạy
const today = new Date().toISOString().split('T')[0];
const { data: activePromos } = await supabase
  .from('promotions').select('title')
  .eq('enabled', true).lte('start_date', today).gte('end_date', today).limit(1);
if (activePromos?.length) {
  autoTags.push(`🎉 KM: ${activePromos[0].title}`);
}
```

Tag format: `🎉 KM: [tên chương trình]` — dùng để filter trong tab Thống kê.

### Quy tắc component PromoCard (React 19)

Trong React 19, function component dùng inline props type có thể gây lỗi TypeScript khi có `key`:

```typescript
// ❌ Lỗi React 19
function PromoCard({ ... }: { confirmDelete: string | null; ... }) {}

// ✅ Đúng — dùng interface + React.FC
interface PromoCardProps { confirmDelete: string | null; ... }
const PromoCard: React.FC<PromoCardProps> = ({ ... }) => { ... };
```

### AdminPromotions — 4 tab (gồm 3 tính năng AI mới)

Cập nhật: `tab` type mở rộng thành `'calendar' | 'list' | 'stats' | 'customers'`

**Tính năng 1 — AI Bulk Create (nút "✨ AI tạo KM" trên header)**

- Button tím `bg-violet-600` cạnh nút "Tạo KM" thủ công
- Mở modal AI: textarea nhập lệnh tiếng Việt + example commands gợi ý
- Gọi `POST /api/ai-promo` với `{ command, type: 'bulk' }`
- API trả về JSON array `AiPromoProposal[]`
- Preview list với checkbox chọn/bỏ → Import hàng loạt vào Supabase
- Ví dụ lệnh: *"tạo KM cho tất cả ngày đặc biệt 2026"*, *"tạo KM Valentine, 8/3, Giáng Sinh"*

```typescript
interface AiPromoProposal {
  title: string; shortDesc: string; content: string;
  emoji: string; color: string; bgColor: string;
  startDate: string; endDate: string; ctaText: string;
}
```

**Tính năng 2 — AI Content per Promo (nút "✨" trong PromoCard + edit modal)**

- Nút `<Sparkles size={13} />` trong PromoCard → gọi `openEditWithAi(p)`: mở edit modal + AI điền nội dung ngay
- Trong edit modal: link "✨ AI gợi ý nội dung" cạnh label "Nội dung chi tiết"
- Gọi `POST /api/ai-promo` với `{ type: 'content', context: '${title} (startDate đến endDate)' }`
- API trả về `{ shortDesc, content, ctaText }` → setForm tự động điền vào form
- Loader hiển thị khi AI đang xử lý: `aiContentLoading` state

**Tính năng 3 — Tab "Khách hàng" (customer linking)**

- Tab thứ 4 với icon `<Users />`
- **Layout 2 cột:** trái = promo selector (có count badge mỗi KM), phải = customer cards
- **Tự động:** khách tự được gắn khi đăng ký trong thời gian KM → tag `🎉 KM: ${promo.title}`
- **Thủ công:** nút "Gắn thêm khách" → modal search → click để gắn tag
- `getPromoCustomers(promo)`: `consultations.filter(c => c.tags?.includes('🎉 KM: ' + promo.title))`
- `assignToPromo(consultationId, promo)`: gọi `updateConsultationTags(id, [...tags, tag])`
- Customer card: hiện tên + trạng thái + nút gọi (tel:) + nút Zalo

**API: `api/ai-promo.ts`**

```typescript
// POST body: { command?, type: 'bulk' | 'content', context?, apiKey, apiUrl, modelName }
// type 'bulk': returns { result: AiPromoProposal[] }
// type 'content': returns { result: { shortDesc, content, ctaText } }
// Parse JSON từ raw: raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/)
```

**Thứ tự ưu tiên API (Gemini fallback):**
1. **Custom API** (nếu `apiKey` có) → OpenAI-compatible (DeepSeek/Groq/OpenAI/Custom LLM)
2. **Gemini fallback** tự động khi: không có apiKey, hoặc lỗi `insufficient_balance / quota / unauthorized`
3. Cần `GEMINI_API_KEY` trong Vercel env vars — miễn phí 1500 req/ngày

```typescript
// Lỗi balance/auth → fallthrough sang Gemini
const isBalanceOrAuth = /balance|quota|insufficient|unauthorized|invalid.*key/i.test(errMsg);
```

> **Lưu ý:** Khi thấy lỗi "Insufficient Balance" trong modal AI → `GEMINI_API_KEY` chưa được set trên Vercel, hoặc cả hai key đều hết quota.

**Các icon dùng trong AdminPromotions:**

```typescript
import { Sparkles, UserCheck, Phone, MessageCircle, Loader2, Users } from 'lucide-react';
```

**useApp() cần có `updateConsultationTags` và `settings`:**

```typescript
const { isAdmin, isAuthReady, consultations, updateConsultationTags, settings } = useApp();
```

### AI Tạo Ảnh Banner (DALL-E) — `api/ai-image.ts`

- Button "🎨 AI tạo ảnh" trong edit modal của mỗi KM
- Gọi `/api/ai-image` với `{ promoTitle, shortDesc, emoji, color, apiKey, model, quality }`
- **API Key:** ưu tiên `settings.aiImageApiKey` (Image AI riêng), fallback `settings.integrationChatApiKey`
- **Kiểm tra:** `settings.aiImageEnabled === false` → báo lỗi ngay, không gọi API
- Trả về `{ b64: string }` (base64 PNG 1792×1024)
- Frontend gọi `uploadImageToStorage(dataUrl, 'promotions/xxx.png')` → upload R2 → lưu URL vào `promotion.image_url`

**Image position slider (trước khi upload ảnh từ máy):**
- Trong upload modal: 2 slider "← Trái/Phải →" và "↑ Trên/Dưới ↓" (state imagePosX, imagePosY, default 50)
- Preview `object-position: X% Y%` realtime
- Nút "✂ Cắt & chốt vùng này" → Canvas API crop → baked vào data URL (không cần DB migration)
- Reset về 50,50 khi mở modal mới hoặc chọn ảnh mới

**Model image:**
```typescript
// AdminSettings → Cổng kết nối → Image AI chọn model
// DALL-E 3 (default) / DALL-E 2
// settings.aiImageModel → truyền vào callAiImage()
```

**Flow tạo ảnh:**
1. Click "🎨 AI tạo ảnh" → `callAiImage()` kiểm tra `aiImageEnabled` + lấy `aiImageApiKey || integrationChatApiKey`
2. Gọi `/api/ai-image` → nhận base64
3. Hiện preview — banner vàng cảnh báo "Chưa lưu"
4. Hover ảnh → click "Dùng ảnh này" → `useGeneratedImage()` → upload R2 → lưu URL vào form
5. Lưu KM → URL vào `image_url` Supabase

**Thumbnail hiển thị trong PromoCard** nếu `promo.imageUrl` có giá trị.

### Model Selector — Cổng kết nối (AdminSettings)

Thay text input "Model Name" bằng UI thông minh:

```typescript
const MODEL_PRESETS = [
  { id: 'openai',    url: 'https://api.openai.com/v1/chat/completions',        models: ['gpt-4o', 'gpt-4o-mini', ...] },
  { id: 'deepseek',  url: 'https://api.deepseek.com/v1/chat/completions',      models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'groq',      url: 'https://api.groq.com/openai/v1/chat/completions',   models: ['llama-3.3-70b-versatile', ...] },
  { id: 'anthropic', url: 'https://api.anthropic.com/v1/messages',             models: ['claude-opus-4-8', ...] },
  { id: 'custom',    url: '',                                                   models: [] },
];
```

- Click provider chip → auto-fill URL + chọn model mặc định
- Dropdown model thay text input khi provider đã biết
- `selectedProvider` state được derive từ URL hiện tại khi load

### Image AI — Cổng kết nối (AdminSettings)

Block riêng biệt sau Text AI, có toggle bật/tắt, API Key riêng, model selector:

```typescript
// UI: toggle aiImageEnabled + input aiImageApiKey (password) + select aiImageModel
// Lưu qua handleSaveSection('integrations') cùng với Text AI fields
// Note: "Để trống API Key → dùng chung key Text AI"
```

---

### PromoGrid Two-Panel (src/components/PromoGrid.tsx)

Layout `grid-cols-2` trên trang chủ:

**Bảng trái — Top concept:**
- Nếu có `settings.promoGridItems` (enabled) → hiển thị list configured items (unlimited, badge tùy chỉnh)
- Fallback: `styles.filter(s => !s.deleted).slice(0, 5)` với badge TOP1/TOP2/TOP3
- Skeleton loader khi styles chưa load
- Footer CTA: "Xem tất cả →" link `/favorites`

**Bảng phải — KM đang chạy:**
- Query Supabase: `enabled=true AND show_on_website=true AND start_date<=today AND end_date>=today LIMIT 4`
- Adaptive layout: 0 KM → empty state; 1–3 → thumbnail list; 4 → 2×2 image grid
- HOT badge trên item đầu tiên
- Footer CTA: "Tư vấn ngay ✨" → `onConsult()`

### AdminSettings Banner QC (case 'banner')

Tab Banner QC trong AdminSettings quản lý `promoGridItems` (bảng trái PromoGrid):

- Vertical list (`space-y-3`), không giới hạn số thẻ
- Mỗi thẻ: header compact (số + link type dropdown + toggle + xóa) + body `grid grid-cols-2` (title, imageUrl, badge, linkValue)
- `linkType`: `'style' | 'promotion' | 'blog' | 'custom'`
- Nút "+ Thêm thẻ (N thẻ)" ở cuối, không giới hạn

---

## 14. AppSettings Interface

```typescript
// src/types.ts
export interface AppSettings {
  // Giao diện
  brandLogo?: string;
  watermarkOpacity?: number;
  watermarkPosition?: string;

  // Chat widget
  chatEnabled?: boolean;
  chatMessages?: ChatMessageConfig[];

  // Lucky Wheel
  luckyWheelEnabled?: boolean;
  luckyWheelGifts?: LuckyGift[];
  luckyWheelCTA?: string;
  luckyWheelSubCTA?: string;
  luckyWheelNotificationText?: string;
  luckyWheelNotificationEnabled?: boolean;

  // Nhân viên
  staffPhones?: string[];

  // Đối tác
  partnerBrand1?: PartnerBrand;
  partnerBrand2?: PartnerBrand;
  showPartnerBrands?: boolean;

  // Lark notification
  larkWebhookUrl?: string;
  larkNotificationEnabled?: boolean;

  // Telegram notification
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramNotificationEnabled?: boolean;

  // Live Chat & Bot AI — 3 setting độc lập
  liveChatEnabled?: boolean;        // hiển thị widget CHAT trên website (default: true)
  chatBotEnabled?: boolean;         // Bot Tầng 1: keyword match kịch bản, miễn phí (default: false)
  chatBotTier2Enabled?: boolean;    // Bot Tầng 2: Gemini/ChatGPT + kịch bản context (default: false)

  // AI tư vấn (legacy AiChatBubble)
  aiConsultantEnabled?: boolean;
  aiConsultantName?: string;
  aiConsultantPrompt?: string;

  // Cổng kết nối — Text AI (OpenAI / DeepSeek / Groq / Claude / Custom)
  integrationChatApiEnabled?: boolean;
  integrationChatApiUrl?: string;      // auto-fill khi chọn provider preset
  integrationChatApiKey?: string;      // dùng cho chat/promo text; fallback cho DALL-E nếu aiImageApiKey trống
  integrationChatApiModelName?: string; // chọn từ dropdown theo provider
  integrationChatApiHeaders?: string;

  // Image AI — DALL-E (tách riêng khỏi Text AI)
  aiImageEnabled?: boolean;            // toggle bật/tắt DALL-E image gen (default true)
  aiImageApiKey?: string;              // OpenAI key riêng cho DALL-E; để trống → dùng chung integrationChatApiKey
  aiImageModel?: string;               // 'dall-e-3' (default) | 'dall-e-2'

  integrationSheetEnabled?: boolean;
  integrationSheetId?: string;
  integrationSheetName?: string;
  integrationSheetApiKey?: string;
  integrationZaloEnabled?: boolean;
  integrationZaloOaId?: string;
  integrationZaloAccessToken?: string;
  integrationScriptNotes?: string;

  // Legacy
  welcomeMessage?: string;
  secondWelcomeMessage?: string;
}
```

---

## 15. Environment Variables (Vercel)

Thêm tất cả biến này vào **Vercel Dashboard → Project → Settings → Environment Variables**:

```
# Supabase (bắt buộc)
VITE_SUPABASE_URL         = https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY    = eyJ...

# Admin fallback
VITE_ADMIN_EMAIL          = admin@studio.com

# Google Apps Script (Google Sheets sync)
VITE_GOOGLE_SCRIPT_URL    = https://script.google.com/macros/s/.../exec

# Cloudflare R2
VITE_R2_WORKER_URL        = https://xxx.workers.dev
VITE_R2_UPLOAD_SECRET     = your-secret

# AI Chat (server-side only, không prefix VITE_)
GEMINI_API_KEY            = AIza...

# Lark (tùy chọn — có thể cấu hình qua Admin UI thay vì env var)
LARK_WEBHOOK_URL          = https://open.larksuite.com/open-apis/bot/v2/hook/...
LARK_KEYWORD              = teamsaleh2o

# Telegram (tùy chọn — nên cấu hình qua Admin UI thay vì env var)
TELEGRAM_BOT_TOKEN        = 123456789:AAF...
TELEGRAM_CHAT_ID          = -100xxxxxxxxxx
```

> **Lark và Telegram** có thể cấu hình qua Admin UI (lưu Supabase) — env var chỉ là fallback. Ưu tiên: body request → env var.

---

## 16. Quy tắc Code

### Làm:
- TypeScript strict, define interfaces cho mọi DB row (`DbStyleRow`, `DbAlbumRow`...)
- `useCallback` cho mọi function trong context
- Soft-delete (`deleted: true`) thay hard-delete
- Batch upsert cho reorder: `supabase.from('photos').upsert(items.map((p,i) => ({id:p.id,order:i})), {onConflict:'id'})`
- URL ảnh dùng ID-based (`/photo/photo-123`, không dùng index `/photo/0`)
- Pagination consultations: PAGE_SIZE = 50
- Toast thay alert/confirm
- Lazy load tất cả pages

### Không làm:
- ❌ Hardcode email admin (dùng `VITE_ADMIN_EMAIL`)
- ❌ Dùng Firebase (đã migrate sang Supabase)
- ❌ Index-based photo URLs
- ❌ Context file >400 lines
- ❌ `window.confirm()` cho xóa
- ❌ `any` type trong DB interfaces
- ❌ Khai báo packages trong `vite.config.ts → manualChunks` nếu package chưa cài (`npm list <package>` để kiểm tra)

---

## 17. Checklist Build Phases

### Phase 1 — Nền tảng
- [ ] Supabase setup (schema + RLS + Auth + Realtime)
- [ ] Cloudflare R2 Worker setup
- [ ] 5 contexts (Auth/Settings/Consultation/Content/Toast)
- [ ] Routing với lazy loading
- [ ] Layout component

### Phase 2 — Customer-facing
- [ ] Home page (gallery styles)
- [ ] Style → Album → Photo navigation
- [ ] Favorites system (localStorage)
- [ ] PhoneGate
- [ ] Consultation form
- [ ] Lucky Wheel widget
- [ ] AI Chat bubble

### Phase 3 — Admin
- [ ] Admin login (Supabase Auth)
- [ ] AdminContent (CRUD styles/albums/photos)
- [ ] AdminConsultations (CRM: list + kanban + calendar)
- [ ] AdminSettings (tabs: logo, chatbot, AI, integrations, wheel, partners, notification, staff)
- [ ] AdminTrash

### Phase 4 — CRM Automation
- [ ] TodayPanel
- [ ] Badge >4h chưa gọi
- [ ] Badge D-1/D-3 ngày chụp
- [ ] Priority sort tự động
- [ ] Stats tuần/tháng/lịch chụp
- [ ] Auto-tag khi submit
- [ ] Badge ⭐ Xin review (ngày chụp đã qua)
- [ ] Chat stage → CRM status sync (AdminChatPanel.updateStage)

### Phase 5 — Notifications & Sync
- [ ] Lark webhook setup (xem mục 16)
- [ ] Telegram Bot setup (xem mục 17)
- [ ] Google Sheets sync (Google Apps Script)
- [ ] 4 Vercel cron jobs (vercel.json crons section):
  - `cron-digest`: 8:00 VN — tổng lead mới qua đêm
  - `cron-stale`: 8:30 VN — nhắc lead >48h chưa xử lý
  - `cron-shoots`: 17:00 VN — nhắc lịch chụp D-1/D-3
  - `cron-followup`: mỗi 2h — nhắc lead mới 2–6h (Lark + Telegram)

### Phase 6 — UX nâng cao
- [ ] Shimmer skeleton loader
- [ ] Social proof badge (viewer count deterministic)
- [ ] Parallax cover + sticky CTA
- [ ] Thumbnail hover overlay
- [ ] Crossfade animation (AnimatePresence mode="sync")
- [ ] Swipe gesture (deltaX > 45px)
- [ ] Double-tap to like (heart burst animation)
- [ ] Cross-album auto-advance
- [ ] `/favorites?preview=ids` cho team sale

---

## 18. Deploy lên Vercel

### Lần đầu (setup)
```powershell
npx vercel login          # Đăng nhập — mở browser xác thực
npx vercel --prod --yes   # Deploy và link project
```

### Cập nhật code hàng ngày
```powershell
git add .
git commit -m "feat: ..."
git push                  # Push lên GitHub

# Sau đó deploy lên Vercel (build trên server Vercel, có đủ env vars):
npx vercel --prod --yes
```

> **Tại sao dùng `vercel --prod` thay vì 3 lệnh cũ?**  
> `vercel pull → vercel build → vercel deploy --prebuilt` build local nhưng Vercel không  
> download sensitive env vars về máy → `VITE_SUPABASE_URL` trống → app trắng.  
> `vercel --prod` build trực tiếp trên server Vercel — có đầy đủ env vars, không bao giờ bị lỗi này.

### Kiểm tra deployment
```powershell
npx vercel ls   # Xem danh sách deployment và trạng thái
```

### Lưu ý quan trọng
- ⚠️ Không thêm package vào `manualChunks` trong `vite.config.ts` nếu chưa cài (`npm install <package>`)
- ⚠️ Kiểm tra build local thành công trước khi deploy: `npm run build`
- ⚠️ Nếu Vercel CLI hết token: vào `https://vercel.com/oauth/device?user_code=XXXX` để re-auth

---

## 19. Setup Lark Webhook — Chi tiết từng bước

### Bước 1 — Tạo nhóm và bot trong Lark

1. Mở app **Lark (Feishu)** → tạo nhóm mới hoặc dùng nhóm team sale hiện có
2. Click tên nhóm ở trên cùng → **Bots** → **Add bot** → **Custom Bot**
3. Đặt tên bot: `Thông báo khách hàng [Tên Studio]`
4. **Cấu hình bảo mật (bắt buộc):**
   - ✅ Bật **"Đặt từ khóa"** → nhập 1 từ khóa (VD: `teamsaleh2o`) → ghi lại
   - ❌ Không cần IP whitelist hay chữ ký số
5. Copy **URL Webhook** → trông như: `https://open.larksuite.com/open-apis/bot/v2/hook/xxxx-xxxx-xxxx`

### Bước 2 — Cấu hình trong Admin Settings

1. Vào `https://[domain]/admin/settings` → tab **Cổng kết nối** hoặc **Thông báo**
2. Bật toggle **"Kích hoạt thông báo Lark"**
3. Dán **URL Webhook** vào ô "Lark Webhook URL"
4. Nhấn **Lưu**

### Bước 3 — BẮT BUỘC: Keyword trong mọi tin nhắn

Lark keyword filter yêu cầu **mọi tin nhắn phải chứa từ khóa đã đặt**. Không có → error `19024`.

```typescript
// ✅ ĐÚNG — keyword ở dòng đầu
contentLines.push([{ tag: 'text', text: 'teamsaleh2o' }]);

// ❌ SAI — bị block
contentLines.push([{ tag: 'text', text: '🔔 KHÁCH MỚI...' }]);
```

Áp dụng cho: `api/lark-notify.ts`, `api/cron-digest.ts`, `api/cron-stale.ts`, `api/cron-shoots.ts`.

### Bước 4 — Format tin nhắn Lark (post format với link)

```typescript
// api/lark-notify.ts
const contentLines: any[][] = [];
contentLines.push([{ tag: 'text', text: LARK_KEYWORD }]);            // keyword bảo mật
contentLines.push([{ tag: 'text', text: '🔔 KHÁCH MỚI ĐĂNG KÝ!' }]);
contentLines.push([{ tag: 'text', text: `👤 Tên: ${name}` }]);
contentLines.push([{ tag: 'text', text: `📞 SĐT: ${phone}` }]);
// Link album clickable:
contentLines.push([
  { tag: 'text', text: `1. ` },
  { tag: 'a', text: album.title, href: album.url },
  { tag: 'text', text: ` — ${album.styleName}` },
]);

await fetch(LARK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    msg_type: 'post',
    content: {
      post: {
        vi_vn: { title: '🔔 Studio — Khách mới', content: contentLines },
        zh_cn: { title: '🔔 Studio — Khách mới', content: contentLines },
      },
    },
  }),
});
```

### Bước 5 — Test webhook

```bash
# Git Bash / Linux terminal:
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"msg_type":"text","content":{"text":"teamsaleh2o\nTest OK!"}}'
```

```powershell
# PowerShell:
Invoke-RestMethod -Uri "YOUR_WEBHOOK_URL" -Method POST `
  -ContentType "application/json" `
  -Body '{"msg_type":"text","content":{"text":"teamsaleh2o\nTest OK!"}}'
```

**Kết quả mong đợi:**
| Response | Nghĩa |
|----------|-------|
| `{"code": 0}` | ✅ Thành công |
| `{"code": 19024}` | ❌ Thiếu keyword |
| `{"code": 19021}` | ❌ URL webhook sai hoặc bot bị xóa |

### Checklist Lark
- [ ] Tạo bot trong nhóm Lark, bật keyword filter
- [ ] Ghi lại từ khóa bí mật
- [ ] Dán webhook URL vào Admin Settings → Lưu
- [ ] Keyword có mặt trong tất cả message (lark-notify, cron-*)
- [ ] Test thủ công → nhận `code: 0`
- [ ] Submit form test → nhóm Lark nhận được thông báo

---

## 20. Setup Telegram Bot — Chi tiết từng bước

### Bước 1 — Tạo Bot qua @BotFather

1. Mở Telegram → tìm **@BotFather** (tích xanh verified ✓)
2. Gửi lệnh: `/newbot`
3. BotFather hỏi **tên hiển thị** → nhập VD: `H2O Studio Sale Thông Báo`
4. BotFather hỏi **username** → nhập VD: `h2ostudio_notify_bot` *(phải kết thúc bằng `_bot`)*
5. BotFather trả về **Bot Token** dạng: `8615173220:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. **Lưu ngay token này** — mất token phải tạo lại qua `/mybots` → token mới

> 💡 Xem lại token bất kỳ lúc nào: chat với @BotFather → `/mybots` → chọn bot → `API Token`

### Bước 2a — Nhận thông báo qua DM cá nhân

Dùng nếu chỉ 1 người (owner) nhận thông báo:

1. Tìm bot vừa tạo trên Telegram (tìm theo username, VD: `@h2ostudio_notify_bot`)
2. Nhấn **START** hoặc gửi bất kỳ tin nhắn nào
3. Lấy Chat ID cá nhân — mở trong browser:
   ```
   https://api.telegram.org/bot[TOKEN]/getUpdates
   ```
   Thay `[TOKEN]` bằng bot token thật. Tìm trong kết quả:
   ```json
   "chat": {"id": 8826731182, "type": "private"}
   ```
   → **Chat ID = `8826731182`** (số dương)

### Bước 2b — Nhận thông báo qua nhóm team sale (khuyên dùng)

Dùng nếu cả team cùng nhận:

1. Tạo nhóm Telegram mới (hoặc dùng nhóm đang có)
2. Thêm bot vào nhóm: vào nhóm → **Add members** → tìm `@h2ostudio_notify_bot` → Add
3. Gửi 1 tin nhắn bất kỳ trong nhóm
4. Lấy Chat ID nhóm — mở trong browser:
   ```
   https://api.telegram.org/bot[TOKEN]/getUpdates
   ```
   Tìm trong kết quả:
   ```json
   "chat": {"id": -1001234567890, "type": "supergroup"}
   ```
   → **Chat ID = `-1001234567890`** (số âm, có dấu `-`)

> ⚠️ Nếu `result: []` rỗng → chưa có tin nhắn nào trong nhóm sau khi thêm bot. Gửi 1 tin nhắn rồi F5 lại trang.

### Bước 3 — Cấu hình trong Admin Settings

1. Vào `https://[domain]/admin/settings` → tab **Cổng kết nối**
2. Kéo xuống phần **TELEGRAM BOT** (nền xanh sky)
3. Bật toggle **"Kích hoạt thông báo Telegram"**
4. Dán **Bot Token** vào ô "Bot Token" (VD: `8615173220:AAFxxx...`)
5. Dán **Chat ID** vào ô "Chat ID" (VD: `-1001234567890` hoặc `8826731182`)
6. Nhấn **Lưu cài đặt Cổng kết nối**

### Bước 4 — Format tin nhắn Telegram (HTML với link)

```typescript
// api/telegram-notify.ts
const lines: string[] = [
  '🔔 <b>KHÁCH MỚI ĐĂNG KÝ!</b>',
  '─────────────────',
  `👤 <b>Tên:</b> ${escHtml(name)}`,
  `📞 <b>SĐT:</b> ${escHtml(phone)}`,
];
if (source) lines.push(`📌 <b>Nguồn:</b> ${escHtml(source)}`);
if (luckyGift) lines.push(`🎁 <b>Quà:</b> ${escHtml(luckyGift)}`);
// Link album clickable:
albums.forEach((a, i) => {
  lines.push(`${i+1}. <a href="${a.url}">${escHtml(a.title)}</a> — ${escHtml(a.styleName)}`);
});

await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: CHAT_ID,
    text: lines.join('\n'),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  }),
});

// Helper escape HTML chars
function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

### Bước 5 — Test trực tiếp API

```bash
# Test gọi thẳng endpoint production:
curl -X POST "https://[domain]/api/telegram-notify" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Studio",
    "phone": "0912345678",
    "source": "test",
    "albums": [],
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  }'
```

**Kết quả mong đợi:**
```json
{"ok": true, "result": {"message_id": 5, ...}}
```

| Response | Nghĩa |
|----------|-------|
| `{"ok": true}` | ✅ Tin nhắn đã gửi |
| `{"ok": false, "error_code": 401}` | ❌ Bot token sai |
| `{"ok": false, "error_code": 400, "description": "chat not found"}` | ❌ Chat ID sai hoặc bot chưa được add vào nhóm |
| `{"ok": false, "error_code": 403}` | ❌ Bot bị block hoặc chưa Start |

### Checklist Telegram
- [ ] Tạo bot qua @BotFather, lưu Token
- [ ] Bot được Start (DM) hoặc thêm vào nhóm
- [ ] Lấy Chat ID qua `getUpdates`
- [ ] Điền Token + Chat ID vào Admin Settings → Lưu
- [ ] Test API trực tiếp → `{"ok": true}`
- [ ] Submit form test → nhận tin nhắn Telegram

---

## 21. Prompt mẫu để bắt đầu dự án mới

```
Tôi muốn xây dựng một webapp studio cho [TÊN STUDIO] — [MÔ TẢ DỊCH VỤ].

Stack: React 19 + TypeScript + Vite + Supabase + Cloudflare R2 + Vercel + Tailwind CSS.

Đọc CLAUDE.md trong repo này để hiểu toàn bộ kiến trúc, pattern code,
database schema và feature list.

Thông tin studio:
- brandName: [TÊN STUDIO]
- hotline: [SĐT]
- zaloUrl: [ZALO URL]
- facebookMessengerUrl: [FB URL]
- description: [MÔ TẢ NGẮN]

Bắt đầu từ Phase 1: setup Supabase schema và 5 context files theo đúng
pattern trong CLAUDE.md.
```

---

*Blueprint này được tạo từ dự án H2O Studio Sale Album — production-tested.*  
*Cập nhật lần cuối: 2026-06-20 — đủ 21 mục, file structure + routing đầy đủ toàn bộ tính năng production*
