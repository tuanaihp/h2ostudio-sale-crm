# H2O Bot AI — Blueprint Toàn Diện
> Tài liệu này mô tả đầy đủ kiến trúc, logic, cơ sở dữ liệu và cách vận hành  
> Bot AI tư vấn bán hàng tự động cho studio chụp ảnh cưới.  
> **Có thể nhân bản sang bất kỳ studio nào, trên bất kỳ nền tảng nào.**

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Triết lý thiết kế](#2-triết-lý-thiết-kế)
3. [Kiến trúc 5 tầng](#3-kiến-trúc-5-tầng)
4. [Database Schema](#4-database-schema)
5. [Từ điển chuẩn hóa tiếng Việt](#5-từ-điển-chuẩn-hóa-tiếng-việt)
6. [Nhận diện loại dịch vụ (Service Type)](#6-nhận-diện-loại-dịch-vụ-service-type)
7. [Nhận diện giai đoạn bán hàng (Phase)](#7-nhận-diện-giai-đoạn-bán-hàng-phase)
8. [Hệ thống từ khóa FAQ (Keywords)](#8-hệ-thống-từ-khóa-faq-keywords)
9. [Lead Score System](#9-lead-score-system)
10. [Quick Replies](#10-quick-replies)
11. [Context Memory](#11-context-memory)
12. [Tầng 2 — AI (Gemini / GPT)](#12-tầng-2--ai-gemini--gpt)
13. [Cơ chế tự học](#13-cơ-chế-tự-học)
14. [Cài đặt Admin (Settings)](#14-cài-đặt-admin-settings)
15. [Cách viết FAQ hiệu quả](#15-cách-viết-faq-hiệu-quả)
16. [Cách viết Kịch bản Sale](#16-cách-viết-kịch-bản-sale)
17. [Quy trình vận hành hàng ngày](#17-quy-trình-vận-hành-hàng-ngày)
18. [Hướng dẫn nhân bản sang studio khác](#18-hướng-dẫn-nhân-bản-sang-studio-khác)
19. [Hướng dẫn build trên nền tảng khác](#19-hướng-dẫn-build-trên-nền-tảng-khác)
20. [Checklist go-live](#20-checklist-go-live)

---

## 1. Tổng quan hệ thống

### Bot làm gì?

Bot AI tư vấn tự động 24/7 trên website studio, với 2 chế độ:

| Chế độ | Tên | Mô tả | Chi phí |
|---|---|---|---|
| **Tầng 1** | Smart Matching | So khớp từ khóa thông minh, không cần API | Miễn phí |
| **Tầng 2** | AI (Gemini/GPT) | LLM sinh câu trả lời tự nhiên | Tốn API |

### Bot trả lời được gì?

- Giá các gói chụp ảnh, thuê váy, makeup
- Quy trình đặt lịch, đặt cọc
- Chính sách hủy/đổi lịch
- Địa chỉ, giờ mở cửa, liên hệ
- Câu hỏi thường gặp từ khách (FAQ tùy chỉnh)
- Kịch bản tư vấn theo từng giai đoạn sale

### Luồng hoạt động tổng thể

```
Khách nhắn tin
      ↓
[Tầng 1] Chuẩn hóa văn bản tiếng Việt
      ↓
[Tầng 2] Nhận diện loại dịch vụ + giai đoạn
      ↓
[Tầng 3] So khớp % từ khóa với kho FAQ
      ↓
   ≥50%?  ──Yes──→ Trả lời + câu dẫn tiếp + Quick Replies
      │
      No
      ↓
   20–49%? ─Yes──→ Hỏi lại: "Em muốn hỏi về A hay B?"
      │
      No
      ↓
[Fallback] TF-IDF trên kịch bản sale
      ↓
   Match? ──Yes──→ Trả lời theo kịch bản
      │
      No
      ↓
  "Bạn chờ chút..." + Log vào Chưa trả lời
      ↓
[Bật Tầng 2] Gemini/GPT sinh câu trả lời thông minh
```

---

## 2. Triết lý thiết kế

### Không cần AI để thông minh

> **Bot không cần AI API để trả lời đúng. Bot cần dữ liệu tốt.**

- 80% câu khách hỏi là lặp lại (giá, lịch, địa chỉ, đặt cọc)
- Nếu FAQ được viết đúng + có từ khóa đầy đủ → Tầng 1 đủ dùng
- Tầng 2 (AI) chỉ cần bật khi khách hỏi câu phức tạp, sáng tạo

### Bot tự cải thiện theo thời gian

Không cần huấn luyện lại model. Quy trình:
1. Bot không hiểu → ghi vào log "Chưa trả lời"
2. Admin xem log → viết FAQ mới cho câu đó
3. Bot tự dùng FAQ mới ngay lập tức

### Hành vi như nhân viên sale thực thụ

- Luôn có câu dẫn tiếp (next_question) → không để hội thoại chết
- Nhận diện khi khách "nóng" (lead_score cao) → thông báo nhân viên
- Ghi nhớ ngữ cảnh (context memory) → trả lời đúng ý dù khách hỏi ngắn

---

## 3. Kiến trúc 5 tầng

### Tầng 1: Chuẩn hóa văn bản

**Vấn đề:** Khách chat thường gõ tắt, sai chính tả, không dấu.

```
Input:  "bn chup anh cuoi studio mk lam ko"
Output: "bao nhiêu chụp ảnh cưới studio makeup làm không"
```

**Xử lý:**
1. Viết thường toàn bộ
2. Thay viết tắt từng từ (xem bảng từ điển mục 5)
3. Chuẩn bị cho bước tiếp theo

---

### Tầng 2: Nhận diện Service Type

**Mục đích:** Biết khách đang hỏi về dịch vụ nào.

```
"cho mình hỏi váy cưới bigsize"  →  service_type: vay_cuoi
"giá chụp ảnh cưới studio"       →  service_type: anh_cuoi
"trang điểm cô dâu bao nhiêu"    →  service_type: makeup
```

**Tại sao quan trọng:** FAQ của loại dịch vụ phù hợp sẽ được ưu tiên (score × 1.25) → ít nhầm hơn khi studio có nhiều dịch vụ.

---

### Tầng 3: Nhận diện Phase (Giai đoạn bán hàng)

**Mục đích:** Biết khách đang ở đâu trong hành trình mua.

```
"giá chụp bao nhiêu"    →  phase: pricing
"còn lịch tháng 12 không" →  phase: booking
"cọc bao nhiêu"          →  phase: deposit
"khi nào có ảnh"         →  phase: after_sale
```

**Tại sao quan trọng:**
- FAQ cùng phase được boost (score × 1.15)
- Lead score tích lũy theo phase (pricing +20, deposit +80...)
- Quick replies thay đổi theo phase

---

### Tầng 4: So khớp FAQ (Keyword Matching)

**2 chế độ:**

**Chế độ mới (FAQ có `keywords`):**
```
FAQ keywords: ["giá chụp", "bao nhiêu", "chi phí", "gói chụp"]
Câu khách:    "chụp ảnh cưới studio giá bao nhiêu"

Matched: "bao nhiêu" ✓, "giá chụp" ✓  →  2/4 = 50% → MATCH
```

**Chế độ cũ (FAQ không có keywords — backward compatible):**
```
FAQ question: "Giá chụp ảnh cưới bao nhiêu vậy?"
Câu khách:    "chụp ảnh cưới bao nhiêu"

Word overlap: chụp ✓, ảnh ✓, cưới ✓, bao ✓, nhiêu ✓  →  5/7 = 71% → MATCH
```

**Ngưỡng:**
| Score | Hành động |
|---|---|
| ≥ 50% | Trả lời ngay |
| 20–49% | Hỏi lại 2 lựa chọn |
| < 20% | Fallback |

---

### Tầng 5: Trả lời + Bước tiếp theo

**Cấu trúc câu trả lời hoàn chỉnh:**

```
[answer]
Dạ bên chị có gói chụp từ 3 triệu đến 12 triệu ạ, tùy concept và số lượng ảnh.

[next_question]  ← hiển thị ngay sau answer
Anh/chị quan tâm chụp studio hay ngoại cảnh để chị tư vấn gói phù hợp nhé? 😊
```

**Kèm theo:**
- Quick Reply chips (3 lựa chọn nhanh)
- Cộng lead_score vào tổng điểm session
- Kiểm tra handoff_trigger → thông báo nhân viên nếu cần

---

## 4. Database Schema

### Bảng `customer_faqs` — Kho câu hỏi thường gặp

```sql
CREATE TABLE customer_faqs (
  id              text        PRIMARY KEY,
  question        text        NOT NULL,         -- Câu hỏi mẫu
  answer          text        NOT NULL,         -- Câu trả lời chốt sale
  category        text        DEFAULT 'faq',   -- Nhóm/phase
  tags            text[]      DEFAULT '{}',    -- Tags cũ (TF-IDF)
  usage_count     integer     DEFAULT 0,       -- Số lần bot đã dùng
  source          text,                        -- 'manual'|'from_chat'|'from_chat_auto'
  is_approved     boolean     DEFAULT true,    -- false = pending admin review
  created_at      timestamptz DEFAULT now(),

  -- Smart Matching fields (H2O Bot v2)
  keywords        text[]      DEFAULT NULL,    -- Từ khóa nhận diện
  next_question   text        DEFAULT NULL,    -- Câu dẫn tiếp theo
  lead_score      integer     DEFAULT 0,       -- Điểm lead cộng thêm khi match
  service_type    text        DEFAULT NULL,    -- anh_cuoi|vay_cuoi|makeup|...
  handoff_trigger boolean     DEFAULT false    -- Thông báo nhân viên khi match
);
```

**Ý nghĩa từng trường:**

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `question` | ✅ | Câu hỏi mẫu — dùng để word overlap với FAQ cũ |
| `answer` | ✅ | Câu trả lời — bot dùng **nguyên văn** |
| `keywords` | Khuyến nghị | Từ khóa nhận diện — càng đầy đủ bot càng chính xác |
| `next_question` | Tùy chọn | Câu hỏi dẫn — giúp hội thoại tiếp tục tự nhiên |
| `lead_score` | Tùy chọn | 0–100. VD: hỏi đặt cọc = 80, hỏi giá = 20 |
| `service_type` | Tùy chọn | Giúp ưu tiên FAQ đúng dịch vụ |
| `handoff_trigger` | Tùy chọn | `true` → thông báo nhân viên ngay |
| `category` | Tùy chọn | Phase trong sale funnel (xem mục 7) |

---

### Bảng `sale_scripts` — Kịch bản tư vấn

```sql
CREATE TABLE sale_scripts (
  id          text        PRIMARY KEY,
  title       text        NOT NULL,    -- Tên kịch bản
  phase       text        NOT NULL,    -- opening|discovery|pricing|closing|...
  content     text        NOT NULL,    -- Nội dung kịch bản (dùng [tên] cho biến)
  tags        text[]      DEFAULT '{}',
  order_num   integer     DEFAULT 0,   -- Thứ tự ưu tiên trong phase
  enabled     boolean     DEFAULT true
);
```

---

### Bảng `bot_unmatched_logs` — Log câu không trả lời được

```sql
CREATE TABLE bot_unmatched_logs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         text,
  message            text        NOT NULL,    -- Câu gốc của khách
  normalized_message text,                   -- Sau khi chuẩn hóa
  detected_service   text,                   -- Service type đã detect
  detected_phase     text,                   -- Phase đã detect
  created_at         timestamptz DEFAULT now(),
  tagged_faq_id      text        REFERENCES customer_faqs(id) ON DELETE SET NULL,
  reviewed           boolean     DEFAULT false
);
```

---

### Bảng `chat_sessions` — Phiên chat

```sql
CREATE TABLE chat_sessions (
  id              text        PRIMARY KEY,
  phone           text,                    -- 'anon_xxx' nếu chưa để SĐT
  name            text,
  status          text        DEFAULT 'waiting',  -- waiting|active|closed
  stage           text        DEFAULT 'new',
  last_message    text,
  last_message_at timestamptz,
  unread_admin    integer     DEFAULT 0,
  consultation_id text,
  created_at      timestamptz DEFAULT now()
);
```

---

### Bảng `app_settings` — Cài đặt bot

```sql
CREATE TABLE app_settings (
  id   text PRIMARY KEY DEFAULT 'global',  -- Luôn có 1 row duy nhất id='global'
  data jsonb DEFAULT '{}'                  -- Toàn bộ settings là 1 JSON object
);
```

Cấu trúc JSON `data` — các field liên quan đến bot:

```json
{
  "chatBotEnabled": true,
  "chatBotTier2Enabled": false,
  "chatBotGreeting": "Chào em nha! Em đang muốn tham khảo...",
  "chatBotThinkingDelay": 1200,
  "chatAutoOpenEnabled": true,
  "chatAutoOpenDelay": 20,
  "chatStaffName": "Mrs. Thủy H2O",
  "botAudience": "all",
  "botScheduleEnabled": false,
  "botScheduleStart": "08:00",
  "botScheduleEnd": "22:00",
  "botFollowUpDelay": 0,
  "botCollectLeads": true,

  "botBusinessName": "H2O Studio",
  "botBusinessPhone": "0783327323",
  "botBusinessEmail": "h2ostudio@gmail.com",
  "botBusinessAddress": "123 Đường ABC, Quận X, TP.HCM",
  "botBusinessHours": "8:00 – 21:00 mỗi ngày",
  "botBusinessDescription": "Studio chụp ảnh cưới chuyên nghiệp...",

  "botPriceList": "- Gói Cơ Bản: 3.500.000đ\n- Gói Nâng Cao: 6.500.000đ\n...",
  "botPurchaseInfo": "Đặt cọc 30% để giữ lịch...",
  "botPaymentMethods": "Chuyển khoản Vietcombank: 1234567890",
  "botReturnPolicy": "Hủy trước 7 ngày: hoàn 100% cọc...",
  "botDiscountPolicy": "Combo váy + chụp giảm 15%...",
  "botCustomInfoItems": "[{\"id\":\"1\",\"title\":\"Concept có gì?\",\"content\":\"...\"}]",

  "chatBotCustomInstructions": "Luôn hỏi ngày cưới của khách...",
  "chatBotBlockedTopics": "Đừng tư vấn đối thủ...",

  "chatApiEnabled": false,
  "chatApiUrl": "",
  "chatApiKey": "",
  "chatApiModelName": "gpt-4o-mini"
}
```

---

## 5. Từ điển chuẩn hóa tiếng Việt

Đây là bảng từ viết tắt phổ biến trong chat. **Cần mở rộng theo thực tế studio.**

| Viết tắt | Nghĩa | Ghi chú |
|---|---|---|
| `bn`, `bnh` | bao nhiêu | |
| `mk`, `mukep`, `mke` | makeup | |
| `k`, `ko`, `kk` | không | |
| `dc`, `đc` | được | |
| `ck` | chú rể | |
| `cd` | cô dâu | |
| `sdt`, `đt` | số điện thoại | |
| `saiz`, `saizz` | size | |
| `bigsize` | size lớn | |
| `ntn` | như thế nào | |
| `sv` | studio | |
| `a`, `e`, `c`, `b` | anh, em, chị, bạn | Cẩn thận — chỉ thay khi standalone |

**Từ điển đồng nghĩa (Synonyms):**

| Từ gốc | Đồng nghĩa |
|---|---|
| giá | tiền, chi phí, bao nhiêu, phí, báo giá |
| chụp ảnh | chụp hình, shoot |
| album | bộ ảnh, hình, ảnh cưới |
| đặt lịch | book, đặt ngày, hẹn lịch |
| thời gian | bao lâu, mấy ngày |
| ngoại cảnh | outdoor, ngoài trời |
| studio | phòng chụp, trong nhà |
| makeup | trang điểm, làm đẹp |
| váy | áo cưới, đầm cưới |
| khuyến mãi | giảm giá, ưu đãi, sale |
| đặt cọc | cọc, thanh toán, trả trước |

---

## 6. Nhận diện loại dịch vụ (Service Type)

### Danh sách service types

| Service Type | Tên hiển thị | Từ khóa nhận diện |
|---|---|---|
| `anh_cuoi` | Ảnh cưới | ảnh cưới, chụp cưới, hình cưới, album cưới, phóng sự cưới |
| `vay_cuoi` | Váy cưới | váy cưới, thuê váy, áo cưới, đầm cưới, mướn váy |
| `makeup` | Makeup & tóc | makeup cô dâu, trang điểm cưới, tóc cô dâu |
| `ao_dai` | Áo dài | áo dài cưới, áo dài cô dâu |
| `quay_phim` | Quay phim | quay phim cưới, video đám cưới |
| `hoc_nghe` | Học nghề | học makeup, khóa học makeup, chứng chỉ |

### Cách thêm service type mới

```typescript
// Trong botEngine.ts — SERVICE_KEYWORDS
const SERVICE_KEYWORDS = {
  // ... existing types ...
  ten_dich_vu_moi: [
    'từ khóa 1', 'từ khóa 2', 'từ khóa 3',
  ],
};

// Thêm quick replies tương ứng
const QUICK_REPLIES_MAP = {
  // ...
  ten_dich_vu_moi: ['Câu gợi ý 1', 'Câu gợi ý 2', 'Câu gợi ý 3'],
};
```

---

## 7. Nhận diện giai đoạn bán hàng (Phase)

### Sale Funnel đầy đủ

```
CONSULT → PRICING → BENEFIT → BOOKING → DEPOSIT → AFTER_SALE
   ↓          ↓         ↓        ↓          ↓           ↓
Hỏi TT    Hỏi giá  Quyền lợi Đặt lịch  Đặt cọc  Nhận ảnh
 +10        +20       +15       +40        +80         +5
```

### Chi tiết từng phase

| Phase | Từ khóa nhận diện | Lead Score | Ý nghĩa |
|---|---|---|---|
| `consult` | tư vấn, muốn biết, thông tin, tham khảo | +10 | Khách mới, đang tìm hiểu |
| `pricing` | giá, chi phí, tiền, bao nhiêu, bảng giá | +20 | Quan tâm giá |
| `benefit` | bao gồm, có gì, trong gói, quyền lợi | +15 | Tìm hiểu sâu |
| `objection` | lo lắng, băn khoăn, cân nhắc, suy nghĩ | +5 | Chần chừ |
| `booking` | đặt lịch, giữ lịch, còn lịch, book | +40 | Sắp chốt |
| `deposit` | đặt cọc, cọc, chuyển khoản, thanh toán | +80 | Sắp chốt ngay |
| `after_sale` | nhận ảnh, chọn ảnh, khi nào có ảnh | +5 | Đã mua |
| `followup` | hôm qua hỏi, theo dõi, nhớ không | +10 | Đang nuôi |
| `complaint` | không hài lòng, phàn nàn, góp ý | -10 | Cần xử lý ngay |

### Khi nào thông báo nhân viên

Lead Score tích lũy ≥ 80 điểm = khách "nóng" → nhân viên cần chốt ngay.

Công thức:
```
Total Lead Score = Σ(PHASE_LEAD_SCORES cho mỗi message) + Σ(faq.lead_score cho mỗi FAQ matched)
```

---

## 8. Hệ thống từ khóa FAQ (Keywords)

### Tại sao cần Keywords?

**Không có Keywords (cũ):**
- Bot so khớp từng từ trong câu hỏi mẫu với tin nhắn khách
- Phụ thuộc vào cách viết câu hỏi mẫu
- Kém chính xác với cách diễn đạt khác nhau

**Có Keywords (mới):**
- Admin tự định nghĩa danh sách từ/cụm từ kích hoạt FAQ này
- Bot so khớp % : bao nhiêu keywords xuất hiện trong tin nhắn khách
- Bền vững hơn, dễ tùy chỉnh hơn

### Công thức tính điểm

```
Score = (số keywords xuất hiện trong tin nhắn) / (tổng số keywords)

Ví dụ:
Keywords: ["giá chụp", "bao nhiêu", "chi phí", "gói", "phí chụp"]  (5 keywords)
Tin nhắn: "cho mình hỏi giá chụp bao nhiêu ạ"

Matched: "giá chụp" ✓, "bao nhiêu" ✓  →  2/5 = 40%  →  CLARIFY
```

### Cách viết Keywords tốt

**Nguyên tắc:**
1. Dùng **cụm từ** thay vì từ đơn (tránh match nhầm)
2. Bao gồm **nhiều cách diễn đạt** cùng một ý
3. Bao gồm **viết tắt phổ biến** (sau khi normalize)
4. Từ 4–8 keywords là lý tưởng cho 1 FAQ

**Ví dụ FAQ "Hỏi giá chụp ảnh cưới":**
```
Keywords: ["giá chụp", "bao nhiêu", "chi phí", "phí chụp", "bảng giá", "gói chụp", "giá gói"]
```

**Ví dụ FAQ "Hỏi về váy bigsize":**
```
Keywords: ["váy bigsize", "cô dâu mập", "size to", "size lớn", "váy người béo", "cân nặng"]
```

**Ví dụ FAQ "Đặt cọc như thế nào":**
```
Keywords: ["đặt cọc", "tiền cọc", "cọc trước", "chuyển khoản", "thanh toán đặt", "số tài khoản"]
```

---

## 9. Lead Score System

### Mục đích

Phát hiện khách "nóng" để nhân viên chủ động chốt đúng lúc.

### Cách hoạt động

```
Session bắt đầu: leadScore = 0

Khách hỏi: "bên mình chụp ảnh cưới thế nào?"
→ phase: consult → +10 points → Total: 10

Khách hỏi: "giá các gói như thế nào?"  
→ phase: pricing → +20 points
→ FAQ matched có lead_score: 10 → +10 points
→ Total: 40

Khách hỏi: "còn lịch tháng 12 không?"
→ phase: booking → +40 points → Total: 80

⚡ ALERT: Lead score ≥ 80 → Thông báo nhân viên!
```

### Thiết lập lead_score cho từng FAQ

| Loại FAQ | lead_score gợi ý |
|---|---|
| Hỏi giá gói cụ thể | 10–20 |
| Hỏi về combo/ưu đãi | 25 |
| Hỏi còn lịch/slot | 40 |
| Hỏi đặt cọc bao nhiêu | 50 |
| Hỏi số tài khoản | 70 |
| Hỏi quy trình đặt cọc | 60 |

### Handoff Trigger

Một số FAQ nên bật `handoff_trigger = true` để thông báo nhân viên **ngay lập tức** không cần chờ lead score:
- Khách phàn nàn
- Khách đòi hoàn tiền
- Khách hỏi về chính sách nhạy cảm
- Khách muốn gặp trực tiếp
- Khách hỏi cách hủy hợp đồng

---

## 10. Quick Replies

### Là gì?

3 nút gợi ý xuất hiện sau mỗi phản hồi của bot. Khách nhấn = gửi luôn tin nhắn đó.

### Mục đích

- Hướng khách đến bước tiếp theo trong sale funnel
- Tránh hội thoại "chết" sau khi bot trả lời
- Giúp khách không biết hỏi tiếp gì

### Quick Replies theo Service Type

| Service Type | Quick Replies mặc định |
|---|---|
| `anh_cuoi` | 📸 Xem bảng giá / 📅 Muốn đặt lịch / 🎨 Xem concept |
| `vay_cuoi` | 💰 Giá thuê váy? / 📏 Hỏi về size / 📅 Thử váy khi nào? |
| `makeup` | 💄 Giá makeup? / 📸 Xem ảnh mẫu / 📅 Đặt lịch makeup |
| `ao_dai` | 👘 Xem mẫu áo dài / 💰 Bảng giá / 📅 Đặt lịch |
| default | 📸 Ảnh cưới / 👗 Váy cưới / 💄 Makeup & tóc |

### Trường hợp Clarify (hỏi lại)

Khi bot không chắc khách hỏi về FAQ nào, Quick Replies sẽ hiển thị 2 câu hỏi gốc để khách chọn:

```
Bot: "Ý em đang muốn hỏi về:
• Giá chụp ảnh cưới studio
• Giá thuê váy cưới
Em muốn biết điều nào ạ? 😊"

[Quick Reply: Giá chụp ảnh cưới...] [Quick Reply: Giá thuê váy cưới...]
```

---

## 11. Context Memory

### Tại sao cần Context Memory?

**Không có context:**
```
Khách: "cho hỏi ảnh cưới studio giá bao nhiêu"
Bot: "Gói studio từ 3.5 triệu..."

Khách: "bao lâu có ảnh"
Bot: ??? (không biết khách đang hỏi về ảnh cưới hay gì)
```

**Có context:**
```
Khách: "cho hỏi ảnh cưới studio giá bao nhiêu"
Bot: "Gói studio từ 3.5 triệu..."
Context: { serviceType: "anh_cuoi", phase: "pricing" }

Khách: "bao lâu có ảnh"
Bot nhớ: serviceType = anh_cuoi → ưu tiên FAQ after_sale của ảnh cưới
Bot: "Sau buổi chụp 15–20 ngày bên chị sẽ gửi ảnh đã edit cho anh/chị ạ"
```

### Cấu trúc Context

```typescript
interface BotContext {
  serviceType: string | null;  // Dịch vụ đang hỏi
  phase: string | null;        // Giai đoạn hiện tại
  leadScore: number;           // Tổng điểm tích lũy
}
```

### Vòng đời Context

- **Khởi tạo:** Khi khách mở chat (session mới)
- **Cập nhật:** Sau mỗi tin nhắn của khách
- **Reset:** Khi khách bắt đầu phiên chat mới

---

## 12. Tầng 2 — AI (Gemini / GPT)

### Khi nào dùng Tầng 2?

| Tình huống | Dùng Tầng nào? |
|---|---|
| FAQ đã có sẵn, câu hỏi phổ biến | Tầng 1 (miễn phí) |
| Câu hỏi phức tạp, cần giải thích | Tầng 2 |
| Khách hỏi kết hợp nhiều thứ | Tầng 2 |
| Muốn bot nói chuyện tự nhiên như người | Tầng 2 |
| Studio nhỏ, ít khách, muốn tiết kiệm | Tầng 1 |
| Studio lớn, nhiều khách, cần chất lượng cao | Tầng 2 |

### Context gửi lên AI

Khi Tầng 2 được bật, bot gửi lên AI toàn bộ:

```
KỊCH BẢN TƯ VẤN: [12 kịch bản từ DB]
ƯU ĐÃI ĐANG CHẠY: [promotions active]
CÂU HỎI THỰC TẾ KHÁCH HAY HỎI: [top 30 FAQ]
KIẾN THỨC VỀ DOANH NGHIỆP: [thông tin từ Settings]
THÔNG TIN STUDIO: [địa chỉ, giờ, mô tả]
THÔNG TIN THANH TOÁN: [cách đặt cọc, tài khoản]
HƯỚNG DẪN THÊM: [custom instructions]
CHỦ ĐỀ KHÔNG TƯ VẤN: [blocked topics]
```

### Cài đặt AI

```
Gemini (miễn phí đến hạn mức): GEMINI_API_KEY=xxx
GPT/Custom: chatApiEnabled=true, chatApiUrl=..., chatApiKey=..., chatApiModelName=gpt-4o-mini
```

---

## 13. Cơ chế tự học

### Vòng lặp tự cải thiện

```
[Ngày 1]
Khách: "có chụp đơn không hay chỉ chụp đôi"
Bot: không hiểu → Log vào bot_unmatched_logs

[Ngày 2 — Admin review]
Admin thấy log: "có chụp đơn không hay chỉ chụp đôi"
Admin tạo FAQ mới:
  Question: "Studio có chụp ảnh đơn không?"
  Answer: "Dạ có em nha, bên chị nhận chụp đơn hoặc đôi đều được..."
  Keywords: ["chụp đơn", "chụp một mình", "solo", "một người", "không có đôi"]

[Ngày 3]
Khách: "e muốn chụp đơn thôi chứ ko có bạn trai"
Bot: match "chụp đơn" → 1/5 = 20%... + "một mình" → MATCH → Trả lời đúng!
```

### Luồng xử lý trong Admin

```
Tab "Chưa trả lời"
      ↓
List các câu bot không hiểu + detected_service + detected_phase
      ↓
Admin nhấn "Tạo FAQ"
      ↓
Form FAQ mở ra với câu hỏi đã điền sẵn + service_type đã detect
      ↓
Admin điền câu trả lời + keywords → Lưu
      ↓
Bot tự dùng FAQ mới ngay từ request tiếp theo
```

### Sau bao lâu bot thông minh hơn?

| Thời gian | Cải thiện |
|---|---|
| Tuần 1 | Bot trả lời được ~70% câu hỏi phổ biến |
| Tháng 1 | ~85% sau khi review log hàng ngày |
| Tháng 3 | ~95% nếu duy trì review đều đặn |

---

## 14. Cài đặt Admin (Settings)

### Tab Thông tin của bạn (Info Tab)

Điền đầy đủ để Tầng 1 có thể trả lời câu hỏi về studio:

| Field | Nội dung | Bot dùng cho |
|---|---|---|
| Tên studio | H2O Studio | Trả lời khi khách hỏi tên |
| Mô tả | "Studio chụp ảnh cưới..." | Context cho Tầng 2 |
| SĐT | 0783327323 | Virtual FAQ "liên hệ" |
| Email | h2o@gmail.com | Virtual FAQ "liên hệ" |
| Địa chỉ | "123 Đường ABC..." | Virtual FAQ "ở đâu" |
| Giờ mở cửa | "8:00 – 21:00" | Virtual FAQ "mở cửa" |
| Bảng giá | "Gói A: 3.5tr\nGói B: 6.5tr" | Virtual FAQ "giá" |
| Thông tin đặt lịch | "Đặt cọc 30%..." | Virtual FAQ "đặt cọc" |
| Phương thức TT | "CK Vietcombank..." | Virtual FAQ "thanh toán" |
| Chính sách hủy | "Hủy trước 7 ngày..." | Virtual FAQ "hủy" |

### Tab Hướng dẫn (Instructions Tab)

| Setting | Mô tả |
|---|---|
| Lời chào đầu tiên | Tin nhắn bot gửi khi khách vào chat lần đầu |
| Hướng dẫn thêm | Quy tắc riêng: "Luôn hỏi ngày cưới trước" |
| Chủ đề không tư vấn | Liệt kê chủ đề muốn bot từ chối |

### Tab Cài đặt (Settings Tab)

| Setting | Gợi ý |
|---|---|
| Bot Tầng 1 | Luôn bật |
| Bot Tầng 2 | Bật nếu có ngân sách API |
| Đối tượng bot | `all` = tất cả, `first_time` = khách mới |
| Giờ hoạt động | 8:00 – 22:00 |
| Auto-open sau | 20 giây |
| Delay thinking | 1200ms (tự nhiên hơn) |
| Follow-up sau | 30 phút im lặng |

---

## 15. Cách viết FAQ hiệu quả

### Template FAQ chuẩn

```
Câu hỏi:    [Câu mẫu khách hay hỏi]
Trả lời:    [Câu trả lời chốt sale — NGUYÊN VĂN bot sẽ gửi]
Keywords:   [từ khóa 1, từ khóa 2, từ khóa 3, ...]
Câu dẫn:   [Câu hỏi dẫn tiếp theo để hội thoại không chết]
Lead score: [0–100]
Loại DV:   [anh_cuoi / vay_cuoi / makeup / ...]
Nhóm:      [pricing / booking / deposit / ...]
```

### 10 FAQ cần có cho mọi studio ảnh cưới

**1. Hỏi giá**
```
Câu hỏi:  "Giá chụp ảnh cưới bên mình bao nhiêu?"
Keywords: giá chụp, bao nhiêu, chi phí, phí chụp, bảng giá, gói chụp
Dẫn:      "Anh/chị đang có dự kiến chụp studio hay ngoại cảnh để chị tư vấn gói phù hợp nhé?"
Score:    20
Nhóm:    pricing
```

**2. Hỏi studio hay ngoại cảnh**
```
Câu hỏi:  "Bên mình chụp studio hay ngoại cảnh?"
Keywords: studio, ngoại cảnh, trong nhà, ngoài trời, có cả 2, indoor, outdoor
Dẫn:      "Anh/chị muốn kết hợp cả 2 không? Bên chị có gói combo studio + ngoại cảnh rất được ưa chuộng ạ 😊"
Score:    15
Nhóm:    consult
```

**3. Hỏi thời gian chụp**
```
Câu hỏi:  "Chụp mất bao lâu?"
Keywords: bao lâu, mấy tiếng, mấy giờ, thời gian chụp, lâu không
Dẫn:      "Anh/chị muốn chụp mấy concept để chị dự trù thời gian cho mình nhé?"
Score:    10
Nhóm:    consult
```

**4. Hỏi makeup**
```
Câu hỏi:  "Có makeup không hay tự lo?"
Keywords: makeup, trang điểm, tóc, kiểu tóc, cô dâu tự lo, tự makeup
Dẫn:      "Anh/chị muốn chụp ngày nào để chị book slot cho team makeup trước cho chắc nhé?"
Score:    15
Nhóm:    consult
```

**5. Hỏi đặt cọc**
```
Câu hỏi:  "Đặt cọc bao nhiêu để giữ lịch?"
Keywords: đặt cọc, tiền cọc, cọc bao nhiêu, giữ lịch, đặt trước, số tài khoản
Dẫn:      "Anh/chị muốn giữ lịch ngày nào? Chị kiểm tra slot còn trống cho mình nhé!"
Score:    60
Nhóm:    deposit
handoff:  true
```

**6. Hỏi khi nào có ảnh**
```
Câu hỏi:  "Chụp xong bao lâu có ảnh?"
Keywords: khi nào có ảnh, bao lâu có ảnh, nhận ảnh, giao ảnh, ra ảnh
Dẫn:      "Anh/chị muốn ảnh soft copy hay bao gồm album nữa để chị tính thời gian chính xác nhé?"
Score:    5
Nhóm:    after_sale
```

**7. Hỏi có concept không**
```
Câu hỏi:  "Bên mình có những concept nào?"
Keywords: concept, phong cách, style, theme, kiểu chụp, ảnh mẫu
Dẫn:      "Anh/chị muốn chị gửi portfolio ảnh mẫu để tham khảo không ạ?"
Score:    15
Nhóm:    consult
```

**8. Hỏi đổi/hủy lịch**
```
Câu hỏi:  "Nếu đổi lịch thì sao?"
Keywords: đổi lịch, hủy lịch, hoàn tiền, dời lịch, chính sách hủy
Score:    5
Nhóm:    faq
handoff:  false (trả lời tự động được)
```

**9. Hỏi địa chỉ** — Virtual FAQ (tự động từ Settings, không cần tạo thủ công)

**10. Hỏi ưu đãi**
```
Câu hỏi:  "Bên mình có ưu đãi gì không?"
Keywords: ưu đãi, khuyến mãi, giảm giá, sale, combo, giá đặc biệt, quà tặng
Score:    20
Nhóm:    offer
```

---

## 16. Cách viết Kịch bản Sale

### Kịch bản khác FAQ như thế nào?

| | FAQ | Kịch bản Sale |
|---|---|---|
| Dùng khi | Khách hỏi thẳng vào topic | Bot chủ động dẫn dắt |
| Nội dung | Q&A ngắn gọn | Script dài, có chiến lược |
| Biến | Không | Có `[ngày cưới]`, `[tên khách]`... |
| Nhóm | Theo loại câu hỏi | Theo giai đoạn sale |

### 9 giai đoạn kịch bản

| Phase | Mô tả | Ví dụ |
|---|---|---|
| `opening` | Lời chào, kết nối | "Chào em, chị là Thủy của H2O Studio..." |
| `discovery` | Khai thác nhu cầu | "Anh/chị dự kiến cưới tháng mấy?" |
| `value_prop` | Trình bày điểm mạnh | "Bên chị có 500+ bộ ảnh concept khác nhau..." |
| `offer` | Giới thiệu ưu đãi | "Tháng này có combo cưới giảm 15%..." |
| `fomo` | Tạo cảm giác khan hiếm | "Slot tháng 12 chỉ còn 3 ngày trống..." |
| `closing` | Hướng dẫn chốt cọc | "Anh/chị chuyển 30% qua số TK sau..." |
| `pre_shoot` | Chuẩn bị ngày chụp | "Trước ngày chụp 1 tuần cần chuẩn bị..." |
| `followup` | Chăm sóc lại | "Hôm trước em có hỏi bên chị, không biết..." |
| `faq` | Xử lý phản đối | "Dạ hiểu ý anh/chị, thực ra..." |

### Template kịch bản tốt

```
Tiêu đề: Xử lý "để anh/chị bàn với nhau"
Phase:   faq (xử lý từ chối)
Tags:    từ chối, cân nhắc, suy nghĩ thêm

Nội dung:
Dạ hiểu ạ! Anh/chị bàn với nhau thêm là hoàn toàn đúng 😊

Chị xin phép gợi ý: slot ngày [ngày cưới - 3 tháng] bên chị hiện chỉ còn [số slot] ngày trống.

Nếu hôm nay anh/chị đặt cọc giữ lịch, bên chị giữ nguyên mức giá hiện tại + tặng thêm [quà tặng].

Còn nếu để tuần sau mới quyết định thì mình cần kiểm tra lại slot và có thể giá đã thay đổi ạ.

Anh/chị nghĩ sao? 😊
```

---

## 17. Quy trình vận hành hàng ngày

### Checklist sáng (5 phút)

1. Vào **Admin Bot → Tab "Chưa trả lời"**
2. Xem danh sách câu khách hỏi mà bot không trả lời được
3. Với mỗi câu:
   - Nhấn **"Tạo FAQ"** → điền câu trả lời + keywords → Lưu
   - Hoặc nhấn **"Bỏ qua"** nếu là câu spam/không liên quan
4. Vào **Tab Kiến thức AI → Câu hỏi đang chờ duyệt**
5. Duyệt và bổ sung câu trả lời cho FAQ pending

### Checklist hàng tuần (15 phút)

1. Xem **Top FAQ được dùng nhiều nhất** → cải thiện câu trả lời
2. Kiểm tra **Lead Score cao** → theo dõi khách đó có chốt không
3. Cập nhật **Bảng giá** nếu có thay đổi
4. Thêm **FAQ mới** cho các câu hỏi xuất hiện nhiều

### Khi nào thêm FAQ vs Kịch bản?

| Thêm FAQ khi | Thêm Kịch bản khi |
|---|---|
| Câu hỏi cụ thể có 1 câu trả lời rõ ràng | Cần dẫn dắt nhiều bước |
| Thông tin fact (giá, địa chỉ, thời gian) | Chiến thuật sale (xử lý từ chối, upsell) |
| Khách hỏi thẳng | Bot chủ động tư vấn |

---

## 18. Hướng dẫn nhân bản sang studio khác

### Bước 1: Chuẩn bị thông tin studio mới

Điền vào bảng này trước:

```
Tên studio:          _______________
Địa chỉ:             _______________
SĐT:                 _______________
Email:               _______________
Giờ mở cửa:         _______________
Website:             _______________
Gemini API Key:      _______________

Bảng giá:
[Gói 1]: [Giá]
[Gói 2]: [Giá]
...

Tài khoản ngân hàng:
Ngân hàng: _______________
Số TK: _______________
Tên chủ TK: _______________

Chính sách hủy:
_______________

Dịch vụ có:
☐ Ảnh cưới studio
☐ Ảnh cưới ngoại cảnh
☐ Cho thuê váy cưới
☐ Makeup cô dâu
☐ Áo dài cưới
☐ Quay phim ngày cưới
☐ Khác: _______________
```

### Bước 2: Chạy SQL Migration

Chạy file `supabase_bot_smart_matching.sql` trong Supabase SQL Editor của dự án mới.

### Bước 3: Cài đặt trong Admin Bot → Tab Thông tin

Điền tất cả thông tin đã chuẩn bị ở Bước 1.

### Bước 4: Thêm FAQ cơ bản (tối thiểu 10 FAQ)

Dùng template từ mục 15 làm điểm xuất phát.  
Điều chỉnh câu trả lời theo thực tế của studio.

### Bước 5: Thêm Kịch bản sale (tối thiểu 5 kịch bản)

- 1 kịch bản opening
- 1 kịch bản báo giá
- 1 kịch bản xử lý "để suy nghĩ"
- 1 kịch bản đặt cọc
- 1 kịch bản follow-up

### Bước 6: Test bot

1. Vào **Tab Chat thử**
2. Hỏi các câu thông thường:
   - "giá chụp bao nhiêu"
   - "bên mình ở đâu"
   - "đặt cọc như thế nào"
   - "khi nào có ảnh"
3. Kiểm tra bot trả lời đúng không
4. Kiểm tra quick replies xuất hiện

### Bước 7: Go-live

1. Bật **Bot Tầng 1** trong Admin Bot → Cài đặt
2. (Tùy chọn) Bật **Bot Tầng 2** nếu có API key
3. Bật **Auto-open** nếu muốn chat tự động mở
4. Xem **Tab Chưa trả lời** sau ngày đầu tiên

---

## 19. Hướng dẫn build trên nền tảng khác

### Yêu cầu tối thiểu

Bất kỳ nền tảng nào có thể implement bot này cần:

1. **Database:** Lưu trữ FAQ, kịch bản, sessions (PostgreSQL, MySQL, MongoDB đều được)
2. **Backend:** Xử lý logic matching (Node.js, Python, PHP đều được)
3. **Frontend:** Giao diện chat cho khách

### Implement trên Zalo OA (Zalo Official Account)

```python
# Python implementation của botEngine

ABBREVIATIONS = {
    'bn': 'bao nhiêu', 'mk': 'makeup', 'k': 'không',
    # ... thêm đầy đủ
}

def normalize_vietnamese(text):
    lower = text.lower().strip()
    words = lower.split()
    return ' '.join(ABBREVIATIONS.get(w, w) for w in words)

def detect_phase(msg):
    PHASE_KEYWORDS = {
        'pricing': ['giá', 'bao nhiêu', 'chi phí'],
        'booking': ['đặt lịch', 'còn lịch', 'book'],
        'deposit': ['đặt cọc', 'cọc', 'thanh toán'],
    }
    for phase, keywords in PHASE_KEYWORDS.items():
        if any(kw in msg for kw in keywords):
            return phase
    return None

def score_faq(msg, keywords):
    if not keywords:
        return 0
    matched = sum(1 for kw in keywords if kw in msg)
    return matched / len(keywords)

def match_faq(message, faqs):
    normalized = normalize_vietnamese(message)
    best_score = 0
    best_faq = None
    for faq in faqs:
        score = score_faq(normalized, faq.get('keywords', []))
        if score > best_score:
            best_score = score
            best_faq = faq
    if best_score >= 0.5:
        return {'type': 'answer', 'faq': best_faq, 'score': best_score}
    return {'type': 'fallback'}
```

### Implement trên Facebook Messenger

Tương tự Python trên, tích hợp với:
- Facebook Page Webhook
- Graph API để gửi tin nhắn
- Quick Replies theo format của Messenger API

```json
{
  "recipient": {"id": "USER_ID"},
  "message": {
    "text": "Dạ bên chị có gói từ 3.5 triệu ạ 😊\n\nAnh/chị quan tâm gói nào?",
    "quick_replies": [
      {"content_type": "text", "title": "📸 Xem bảng giá", "payload": "VIEW_PRICE"},
      {"content_type": "text", "title": "📅 Đặt lịch", "payload": "BOOK_SCHEDULE"},
      {"content_type": "text", "title": "🎨 Xem concept", "payload": "VIEW_CONCEPT"}
    ]
  }
}
```

### Implement trên n8n / Make.com (No-code)

1. Webhook nhận tin nhắn từ Zalo/Facebook
2. HTTP Request lấy FAQ từ database
3. Code node (JavaScript) chạy logic matching
4. HTTP Request gửi tin nhắn trả lời

### Implement trên Botpress / Rasa

Export toàn bộ FAQ ra JSON → Import vào Botpress/Rasa  
Dùng intent classification thay vì keyword matching  
Lợi thế: xử lý ngữ nghĩa tốt hơn

---

## 20. Checklist Go-live

### Trước khi bật bot

- [ ] Điền đầy đủ thông tin studio trong Tab Thông tin
- [ ] Có tối thiểu 10 FAQ với keywords
- [ ] Có tối thiểu 3 kịch bản sale (opening, pricing, closing)
- [ ] Test Chat thử với 10 câu hỏi phổ biến
- [ ] Đặt lời chào phù hợp
- [ ] Cài đặt giờ hoạt động
- [ ] Kiểm tra Fallback message (Zalo/Hotline)
- [ ] Chạy SQL Migration thành công

### Tuần đầu sau go-live

- [ ] Check Tab "Chưa trả lời" mỗi ngày
- [ ] Thêm ít nhất 3 FAQ mới mỗi ngày từ log
- [ ] Kiểm tra lead score của các khách đã chat
- [ ] Điều chỉnh keywords của FAQ hay bị miss

### Sau 1 tháng

- [ ] Bot trả lời được ≥ 80% câu hỏi
- [ ] Đánh giá có cần bật Tầng 2 không
- [ ] Cập nhật bảng giá, ưu đãi mới nhất
- [ ] Review lại kịch bản sale cho hiệu quả hơn

---

## Phụ lục A: Bảng từ viết tắt đầy đủ

| Viết tắt | Nghĩa | | Viết tắt | Nghĩa |
|---|---|---|---|---|
| bn, bnh | bao nhiêu | | dc, đc | được |
| mk, mukep | makeup | | vs | với |
| k, ko, kk | không | | cx | cũng |
| ck | chú rể | | cd | cô dâu |
| sdt, đt | số điện thoại | | sv | studio |
| saiz, saizz | size | | bigsize | size lớn |
| ntn | như thế nào | | r | rồi |
| a | anh | | e | em |
| c | chị | | b | bạn |
| ad | admin | | ht | hỗ trợ |
| ct | chi tiết | | tt | thông tin |

## Phụ lục B: Các câu hỏi khách thường hỏi

Dùng danh sách này để tạo FAQ nhanh:

**Nhóm Ảnh cưới:**
- Giá chụp ảnh cưới bao nhiêu?
- Chụp studio hay ngoại cảnh?
- Có makeup không hay tự lo?
- Chụp mất bao lâu?
- Có bao nhiêu concept?
- Đặt cọc bao nhiêu?
- Khi nào có ảnh?
- Có được xem ảnh và chọn không?
- Cọc rồi đổi lịch thì sao?
- Gói bao gồm những gì?

**Nhóm Váy cưới:**
- Giá thuê váy bao nhiêu?
- Có váy bigsize không?
- Có bao nhiêu mẫu váy?
- Được thử mấy cái?
- Thuê bao lâu?
- Có vest chú rể không?

**Nhóm Chung:**
- Studio ở đâu?
- Giờ mở cửa?
- Số điện thoại?
- Có gửi xe không?
- Thanh toán kiểu gì?

---

*Tài liệu này được tạo và cập nhật bởi H2O Studio.*  
*Phiên bản: 2.0 — Smart Matching Engine*  
*Cập nhật: 2026-06-25*
