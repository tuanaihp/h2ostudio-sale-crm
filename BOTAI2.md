# BOTAI2 — Offline RAG Engine cho H2O Bot AI (Webapp)

> Tài liệu này mô tả kiến trúc và luồng vận hành của H2O Bot AI tầng 1 (Offline RAG Engine)
> tích hợp trong **Live Chat Bubble trên webapp H2O Sale Album**.
> Không dùng AI API ở tầng 1 → nhanh, rẻ, kiểm soát được nội dung.

---

## 1. Tổng quan kiến trúc

### RAG chuẩn (đang dùng ở nhiều nơi)

```
Khách hỏi → Embedding → Vector Search → Top 5 tài liệu → GPT/Gemini → Sinh câu trả lời
```

**Nhược điểm**: Bắt buộc phải có Embedding + LLM → phải call API mỗi tin nhắn.

---

### Offline RAG Engine (đề xuất cho H2O)

```
Khách hỏi → Normalize → Intent → Keyword Expansion → BM25 → TF-IDF → Rule Engine → Top Document → Template Builder → Trả lời
```

**Ưu điểm**:
- Không có AI. Không có API. Không có Embedding.
- Tốc độ < 200ms
- Chi phí gần 0đ
- Kiểm soát hoàn toàn nội dung trả lời

---

## 2. Kiến trúc đầy đủ 13 bước

```
             KHÁCH NHẮN VÀO LIVE CHAT (webapp H2O Sale Album)

                              │
        ────────────────────────────────────
        1. Normalize
        ────────────────────────────────────
                              │
        2. Intent Detection
        ────────────────────────────────────
                              │
        3. Service Detection
        ────────────────────────────────────
                              │
        4. Phase Detection
        ────────────────────────────────────
                              │
        5. Query Expansion
           (synonym + knowledge graph)
        ────────────────────────────────────
                              │
        6. BM25 Search
        ────────────────────────────────────
                              │
        7. TF-IDF Re-ranking
        ────────────────────────────────────
                              │
        8. Rule Engine
           (priority / service / phase)
        ────────────────────────────────────
                              │
        9. Context Builder
           (ghép tài liệu liên quan)
        ────────────────────────────────────
                              │
        10. Template Builder
        ────────────────────────────────────
                              │
        11. Final Response
        ────────────────────────────────────
                              │
        12. Conversation State Update
        ────────────────────────────────────
                              │
        13. Log nếu không tìm thấy
```

---

## 3. Knowledge Block — Thay thế FAQ đơn giản

### Hiện tại (FAQ đơn giản)

```
Q: Studio bao nhiêu tiền?
A: 9.999.000đ
```

### Đề xuất — Knowledge Block

```json
{
  "id": "doc_201",
  "name": "Combo Studio",
  "service": "COMBO_WEDDING",
  "phase": "PRICING",
  "priority": 90,
  "keywords": ["studio", "chụp studio", "indoor", "combo", "ảnh cưới", "package"],
  "content": "...",
  "related_ids": ["doc_202", "doc_203"],
  "template_key": "pricing_with_cta",
  "popularity": 0
}
```

Bot sẽ **search Document** — không search FAQ. Đây chính là RAG.

---

## 4. Knowledge Graph — Liên kết tài liệu

```
Combo Cưới  ──[0.95]──→  Bảng Giá Chi Tiết
            ──[0.90]──→  USP H2O Studio
            ──[0.85]──→  Khuyến mãi đang chạy
            ──[0.80]──→  Quy trình đặt lịch
            ──[0.70]──→  Mẫu album & váy
            ──[0.65]──→  Makeup & trang phục
            ──[0.60]──→  Quy trình thanh toán
```

Bot không cần GPT. Chỉ cần: `Document A → Related → Document B → Related → Document C` → đã trả lời như AI.

---

## 5. Ví dụ thực tế vận hành

### Khách nhắn vào Live Chat trên webapp H2O Sale Album

```
Khách: "Tôi muốn tư vấn gói chụp combo cưới"
Thời gian: 10:23:14
Kênh: Live Chat Bubble — webapp h2ostudio-sale-album
```

---

### Bước 1 — NORMALIZE

```
Input gốc  : "Tôi muốn tư vấn gói chụp combo cưới"

Sau normalize:
  → lowercase    : "tôi muốn tư vấn gói chụp combo cưới"
  → bỏ stopword  : ["tư vấn", "gói", "chụp", "combo", "cưới"]
  → tokens       : ["tu van", "goi", "chup", "combo", "cuoi"]
```

---

### Bước 2 — INTENT DETECTION

```
Bot kiểm tra rule:
  "tư vấn" → intent: service_inquiry  ✅
  "gói"    → intent: pricing          ✅
  "chụp"   → intent: service_info     ✅

→ Intent chính : SERVICE_INFO + PRICING
→ Phase        : AWARENESS → CONSIDERATION
→ Cần trả về  : thông tin dịch vụ + giá + CTA
```

---

### Bước 3 — SERVICE DETECTION

```
Từ khoá phát hiện:
  "combo"  → service: COMBO_WEDDING  ✅  score: 10
  "cưới"   → service: WEDDING        ✅  score:  8
  "chụp"   → service: PHOTO          ✅  score:  5

→ Service xác định: COMBO_WEDDING (score cao nhất)
```

---

### Bước 4 — QUERY EXPANSION (Synonym Map)

```
Từ gốc khách nhắn       Mở rộng thêm
─────────────────────   ──────────────────────────────────────
"combo"              →  combo, trọn gói, gói cưới, all-in
"cưới"               →  cưới, hôn lễ, đám cưới, wedding
"chụp"               →  chụp, chụp ảnh, photo, shoot
"tư vấn"             →  tư vấn, hỏi, báo giá, xem giá, giá bao nhiêu

→ Query mở rộng: [
    "combo", "trọn gói", "gói cưới", "all-in",
    "cưới", "hôn lễ", "đám cưới", "wedding",
    "chụp ảnh", "photo", "shoot",
    "báo giá", "xem giá", "giá bao nhiêu"
  ]
```

---

### Bước 5 — BM25 SEARCH trên Knowledge Blocks

Bot tìm trong toàn bộ Knowledge Base của H2O:

```
Knowledge Block A — "Combo Cưới Trọn Gói"
  keywords: [combo, cưới, trọn gói, studio, outdoor, album, váy]
  service : COMBO_WEDDING
  phase   : PRICING
  priority: 95

  Tính điểm:
  BM25 keyword match  :  67  (combo✓ cưới✓ trọn gói✓ chụp✓)
  Service match       : +20  (COMBO_WEDDING = đúng)
  Phase match         : +10  (PRICING = đúng)
  Priority            : +15  (95/100 × 15 = 14.25)
  Freshness           :  +5  (cập nhật 3 ngày trước)
  ──────────────────────────
  TỔNG ĐIỂM          : 117   ⭐ TOP 1


Knowledge Block B — "Studio Indoor Combo"
  keywords: [studio, indoor, combo, concept, phòng chụp]
  BM25 keyword match  :  45
  Service match       : +10
  ──────────────────────────
  TỔNG ĐIỂM          :  55


Knowledge Block C — "Chụp Ngoại Cảnh Outdoor"
  keywords: [outdoor, ngoại cảnh, thiên nhiên, hoa]
  BM25 keyword match  :  12
  Service match       :   0
  ──────────────────────────
  TỔNG ĐIỂM          :  12
```

---

### Bước 6 — RULE ENGINE

```
Rule 1: intent = PRICING
  → Bắt buộc top result phải có phase = PRICING  ✅  (Block A có)

Rule 2: service = COMBO_WEDDING
  → Lọc bỏ kết quả không phải combo             ✅

Rule 3: Conversation state = NEW_CUSTOMER
  → Ưu tiên doc có field "intro = true"          ✅  (Block A có)

Rule 4: Thời gian = 10:23 (giờ hành chính)
  → Thêm CTA "gọi ngay" vào response            ✅

→ Kết quả sau Rule Engine:
   TOP 1: Knowledge Block A — Combo Cưới Trọn Gói  (117đ)
   TOP 2: Knowledge Block B — Studio Indoor         ( 55đ)
```

---

### Bước 7 — CONTEXT BUILDER

```
Top 1 = "Combo Cưới Trọn Gói"

Bot nhìn vào Knowledge Graph:
  Combo Cưới  ──[0.95]──→  Bảng Giá Chi Tiết
              ──[0.90]──→  USP H2O Studio (điểm khác biệt)
              ──[0.85]──→  Khuyến mãi đang chạy
              ──[0.80]──→  Quy trình đặt lịch
              ──[0.70]──→  Mẫu album & váy

→ Context Bot lấy thêm:
   Doc A: Combo Cưới (nội dung chính)     ✅  lấy
   Doc B: Bảng Giá                        ✅  lấy
   Doc C: KM đang chạy (nếu có)           ✅  lấy
   Doc D: Quy trình đặt lịch              ✅  lấy
   Doc E: Mẫu váy/album                   ⏸  bỏ qua (phase chưa cần)
```

---

### Bước 8 — TEMPLATE BUILDER

Bot ghép nội dung theo template `pricing_with_cta`:

```
Template: PRICING_WITH_CTA
─────────────────────────────────────────────
[INTRO]      → Dạ em chào anh/chị! ✨
[SERVICE]    → Nội dung từ Doc A (Combo Cưới)
[PRICE]      → Nội dung từ Doc B (Bảng Giá)
[PROMOTION]  → Nội dung từ Doc C (KM tháng này)
[CTA]        → Mời anh/chị đặt lịch tư vấn
─────────────────────────────────────────────
```

---

### Bước 9 — FINAL RESPONSE

Bot hiển thị trong Live Chat Bubble trên webapp sau **180ms**:

```
Dạ em chào anh/chị! H2O Studio rất vui được
tư vấn gói Combo Cưới Trọn Gói ạ 💍

📦 GÓI COMBO CƯỚI H2O bao gồm:
• Chụp Studio + Outdoor (2 concept)
• 200 ảnh đã chỉnh màu
• 1 album cưới cao cấp
• Váy cưới + trang điểm
• Video highlight

💰 Giá từ: 15.900.000đ

🎁 Tháng 7 này H2O đang ưu đãi:
Giảm 10% + tặng thêm 1 concept khi đặt cọc trước 30/7

📅 Anh/chị muốn xem lịch trống hoặc
ghé studio xem album mẫu không ạ?
Em có thể đặt lịch tư vấn miễn phí ngay hôm nay!
```

---

### Bước 10 — CONVERSATION STATE UPDATE

```
Conversation State sau tin nhắn này:
  customer_id    : xxxx
  channel        : webapp_livechat          ← kênh Live Chat trên webapp
  intent_history : [SERVICE_INFO, PRICING]
  service_focus  : COMBO_WEDDING
  phase          : CONSIDERATION            ← tăng từ AWARENESS
  top_doc_shown  : [doc_A, doc_B, doc_C]
  next_expected  : [BOOKING, ASK_PRICE_MORE, VIEW_ALBUM]

→ Nếu khách nhắn tiếp "còn lịch tháng 10 không"
  Bot đã biết context = COMBO_WEDDING
  → Không hỏi lại, trả lời lịch luôn
```

---

### Bước 11 — LOG

```
Log ghi lại:
  query          : "tư vấn gói chụp combo cưới"
  channel        : webapp_livechat
  matched_doc    : combo_cuoi_tron_goi
  score          : 117
  response_time  : 180ms
  used_ai        : false    ← KHÔNG tốn 1 đồng API
  template_used  : pricing_with_cta
```

---

## 6. Tóm tắt toàn bộ luồng

```
Khách nhắn vào Live Chat webapp H2O Sale Album:
"Tôi muốn tư vấn gói chụp combo cưới"
              │
              ▼
    Normalize + Token             5ms
              │
    Intent: PRICING               3ms
              │
    Service: COMBO_WEDDING        2ms
              │
    Expand: +12 từ liên quan     10ms
              │
    BM25: Top1 = Combo (117đ)    50ms
              │
    Rule: boost PRICING phase    15ms
              │
    Context: lấy thêm 3 docs     20ms
              │
    Template ghép                10ms
              │
    Hiển thị trong Live Chat    180ms
              │
    AI gọi  : 0 lần  ✅
    Chi phí : 0đ     ✅
```

---

## 7. So sánh trước / sau

| Chỉ số | Bot cũ (chỉ AI) | Bot mới (Offline RAG + AI fallback) |
|---|---|---|
| Tốc độ phản hồi | 1–3 giây | < 200ms |
| % câu không gọi AI | ~30% | ~75% |
| Chi phí API/tháng | 100% | ~25% |
| Câu match đúng | ~50% | ~80%+ |
| Kiểm soát nội dung | Thấp | Cao |

---

## 8. Phân chia tầng Bot

| Loại câu hỏi | Xử lý bằng |
|---|---|
| Hỏi giá, combo, gói | ✅ Offline RAG Tier 1 |
| Đặt lịch, xem còn slot | ✅ Offline RAG Tier 1 |
| Hỏi dịch vụ, chính sách | ✅ Offline RAG Tier 1 |
| Chào hỏi, cảm ơn | ✅ Template cố định |
| Câu phức tạp / cảm xúc | 🤖 AI Tier 2 (fallback) |
| Khiếu nại, yêu cầu đặc biệt | 🤖 AI Tier 2 + chuyển người |

---

## 9. Lộ trình triển khai

**Tuần 1 — Data Foundation**
- Chuyển Knowledge Base sang dạng Knowledge Block (thêm: service, phase, priority, keywords[])
- Xây Synonym Map tiếng Việt ngành ảnh cưới H2O (~50 cụm từ)
- Xây Knowledge Graph thủ công (link các doc liên quan)

**Tuần 2 — Offline RAG Engine**
- Build API `/api/offline-rag` trong `server.ts`
- Normalize + Intent Detection
- Query Expansion từ Synonym Map
- BM25 scoring cơ bản

**Tuần 3 — Re-ranking + Context Builder**
- Rule Engine (boost theo service/phase/priority)
- Context Builder (lấy related docs từ Knowledge Graph)
- Template Builder (ghép giá + KM + CTA)
- Threshold → fallback AI Tier 2

**Tuần 4 — Logging + Tối ưu**
- Log câu không match → bổ sung FAQ
- A/B test: Offline RAG vs AI Tier 2
- Tối ưu weights theo dữ liệu thực

---

*Tài liệu nội bộ H2O Studio — Bot AI Architecture v2*
