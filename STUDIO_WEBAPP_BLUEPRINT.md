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
12. [AppSettings Interface](#12-appsettings-interface)
13. [Environment Variables (Vercel)](#13-environment-variables-vercel)
14. [Quy tắc Code](#14-quy-tắc-code)
15. [Checklist Build Phases](#15-checklist-build-phases)
16. [Deploy lên Vercel](#16-deploy-lên-vercel)
17. [Setup Lark Webhook — Chi tiết từng bước](#17-setup-lark-webhook--chi-tiết-từng-bước)
18. [Setup Telegram Bot — Chi tiết từng bước](#18-setup-telegram-bot--chi-tiết-từng-bước)
19. [Prompt mẫu để bắt đầu dự án mới](#19-prompt-mẫu-để-bắt-đầu-dự-án-mới)

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
│   ├── AdminConsultations.tsx  ← CRM chính (list + kanban + calendar)
│   ├── AdminContent.tsx        ← quản lý styles/albums/photos
│   ├── AdminSettings.tsx       ← cấu hình hệ thống (5 tabs)
│   ├── AdminLogin.tsx
│   └── AdminTrash.tsx
├── components/
│   ├── Layout.tsx              ← header + footer + bottom bar mobile
│   ├── AlbumCard.tsx           ← card album (social proof badge, zoom-out hover)
│   ├── OptimizedImage.tsx      ← skeleton shimmer loader
│   ├── ConsultationModal.tsx   ← form đăng ký nhận báo giá
│   ├── ChatModal.tsx
│   ├── PhoneGate.tsx           ← popup yêu cầu SĐT
│   ├── LiveChatWidget.tsx      ← galaxy CHAT button + auto-open 10s + controls LiveChatBubble
│   ├── LiveChatBubble.tsx      ← customer-facing chat panel (standalone & controlled mode) + Bot AI
│   ├── AdminChatPanel.tsx      ← admin side-drawer: session list + reply + @kịch bản + 📷 album picker
│   ├── LuckyWheelWidget.tsx
│   ├── ImageCropperModal.tsx
│   └── PartnerBrandsIcons.tsx
├── context/                    ← 5 contexts (xem mục 3)
├── utils/
│   ├── config.ts               ← GOOGLE_SCRIPT_URL, LARK_FALLBACK_URL, R2_WORKER_URL
│   ├── image.ts                ← uploadImageToStorage(), getDisplayImageUrl()
│   └── phone.ts                ← validateVietnamesePhone()
├── types.ts                    ← tất cả interfaces + DbRow types
├── supabase.ts                 ← createClient
├── index.css                   ← shimmer, heartBurst keyframes
└── data/
    └── mockData.ts             ← APP_CONFIG (brandName, hotline, zaloUrl...)
api/
├── lark-notify.ts              ← Vercel serverless: gửi Lark (post format + fallback text)
├── telegram-notify.ts          ← Vercel serverless: gửi Telegram Bot (HTML format)
├── chat.ts                     ← Vercel serverless: AI chat (Gemini)
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
```

**`vercel.json` rewrites** (bắt buộc cho SPA):
```json
{
  "rewrites": [
    {
      "source": "/((?!api).+)",
      "destination": "/index.html"
    }
  ]
}
```

> ⚠️ **Không thêm `"crons"` vào `vercel.json` nếu dùng Hobby plan** — sẽ gây lỗi build.

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
- `if (settings?.liveChatEnabled === false) return null;` phải đặt **sau tất cả hooks**

### LiveChatBubble.tsx — props

```typescript
interface Props {
  controlledOpen?: boolean;  // true = controlled mode (no own button rendered)
  onClose?: () => void;
  chatBotEnabled?: boolean;
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
- Khi `chatBotEnabled`: sau khi customer gửi tin → gọi `/api/live-chat-bot` (delay 1.2–2s để tự nhiên)
- Tạo session Supabase nếu chưa có (`sessionStorage` lưu `lc_session_id`)
- Màu sắc: `bg-gradient-to-br from-secondary via-primary to-primary`

### Bot AI — /api/live-chat-bot (server.ts)

```typescript
app.post("/api/live-chat-bot", async (req, res) => {
  const { message, stage, scripts, history, integrationConfig } = req.body;
  // Build system prompt từ kịch bản kho (scripts, tối đa 12 kịch bản)
  // Delay 1.2–2s random để tự nhiên
  // Gọi custom API nếu integrationConfig.chatApiEnabled, else Gemini 2.0 flash
  // Lưu bot reply vào chat_messages với sender='admin'
});
```

Biến môi trường cần thiết: `GEMINI_API_KEY`

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
| Bot AI tư vấn 24/7 | `chatBotEnabled` | `false` |

Khi `liveChatEnabled = false`: không hiển thị nút CHAT trên website.  
Khi `chatBotEnabled = true`: Bot tự trả lời sau mỗi tin nhắn của khách.

---

## 12. AppSettings Interface

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

  // Live Chat & Bot AI
  liveChatEnabled?: boolean;     // hiển thị widget CHAT trên website (default: true)
  chatBotEnabled?: boolean;      // bot AI tự động trả lời 24/7 (default: false)

  // AI tư vấn (legacy AiChatBubble)
  aiConsultantEnabled?: boolean;
  aiConsultantName?: string;
  aiConsultantPrompt?: string;

  // Cổng kết nối
  integrationChatApiEnabled?: boolean;
  integrationChatApiUrl?: string;
  integrationChatApiKey?: string;
  integrationChatApiModelName?: string;
  integrationChatApiHeaders?: string;
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

## 13. Environment Variables (Vercel)

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

## 14. Quy tắc Code

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

## 15. Checklist Build Phases

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

### Phase 5 — Notifications & Sync
- [ ] Lark webhook setup (xem mục 16)
- [ ] Telegram Bot setup (xem mục 17)
- [ ] Google Sheets sync (Google Apps Script)
- [ ] Cron digest sáng (cron-job.org nếu Hobby plan)

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

## 16. Deploy lên Vercel

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

## 17. Setup Lark Webhook — Chi tiết từng bước

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

## 18. Setup Telegram Bot — Chi tiết từng bước

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

## 19. Prompt mẫu để bắt đầu dự án mới

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
*Cập nhật lần cuối: 2026-06-20*
