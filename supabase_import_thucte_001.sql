-- ============================================================
-- IMPORT THỰC TẾ 001 — Từ hội thoại H2O_CHAT_0001
-- Xóa nội dung placeholder cũ, thay bằng ngôn ngữ H2O thực tế
-- Chạy toàn bộ 1 lần trong Supabase SQL Editor
-- ============================================================

-- ============================================================
-- BƯỚC 1: XÓA FAQ CŨ (placeholder từ supabase_import_quytrinhsale.sql)
-- ============================================================
DELETE FROM customer_faqs WHERE question IN (
  'Chụp ảnh cưới tại studio có những gói nào?',
  'Studio H2O rộng bao nhiêu? Có những concept gì?',
  'Makeup và tóc có được tự chọn không?',
  'Cô dâu được phép tự chuẩn bị váy riêng không?',
  'Từ khi chụp đến khi nhận ảnh mất bao lâu?',
  'Đặt cọc bao nhiêu để giữ lịch?',
  'Có thể thay đổi lịch chụp sau khi đặt cọc không?',
  'H2O có nhận chụp ngoại cảnh không?',
  'Gói combo trọn bộ gồm những gì?',
  'Makeup chú rể có mất thêm phí không?',
  'Nhận ảnh qua hình thức nào?',
  'Có được xem và chọn ảnh trước khi chỉnh sửa không?'
);

-- ============================================================
-- BƯỚC 2: XÓA SCRIPTS CŨ (placeholder order_num 100-113)
-- ============================================================
DELETE FROM sale_scripts WHERE order_num BETWEEN 100 AND 113;

-- ============================================================
-- BƯỚC 3: INSERT FAQ THỰC TẾ — Ngôn ngữ H2O Studio thật
-- ============================================================
INSERT INTO customer_faqs (question, answer, category, tags, source, is_approved, usage_count) VALUES

-- FAQ 1: Hỏi gói chụp studio
(
  'Chụp studio có những gói nào, giá bao nhiêu?',
  E'Bên chị có các gói chụp studio nha em:\n\n📷 Gói 1 concept: **4.999.000đ** — Makeup + làm tóc + 1 concept + ảnh retouched\n📷 Gói 2 concept: **6.999.000đ** — Makeup + làm tóc + 2 concept + ảnh retouched\n📷 Combo trọn bộ: **9.999.000đ** — Studio + ngày ăn hỏi + ngày cưới + váy + vest + makeup\n\n🔥 Book Online trong 48h tặng thêm quà 3.500.000đ:\n• Nâng cấp chất liệu ảnh (1.500.000đ)\n• Voucher nâng cấp váy (1.500.000đ)\n• Makeup chú rể (500.000đ)\n• Ưu tiên chọn lịch chụp\n\nEm muốn tham khảo gói nào chị tư vấn thêm cho nha! 😊',
  'pricing',
  ARRAY['giá', 'gói', 'studio', 'bảng giá', '4999', '6999', '9999', 'bao nhiêu tiền', 'phí'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 2: Makeup và tóc có tự chọn không
(
  'Được tự chọn kiểu tóc và tone makeup không?',
  E'Được nha bé iu! Tất cả từ tone make up, kiểu tóc, concept hay trang phục đều là vợ chồng em chọn hết nè.\n\nBên chị sẽ chỉ tư vấn để đúng với mong muốn và sở thích của vợ chồng em thôi nha. Các tone make up và kiểu tóc bên chị rất đa dạng, em có thể ngắm trước sau đó ưng kiểu nào thì đưa bên chị tư vấn trực tiếp vào ngày chụp cho em nè.\n\nMakeup cô dâu là do giảng viên Học viện Thuỷ H2O Makeup thực hiện — layout trẻ trung, tôn nét đẹp tự nhiên, rất chuẩn bé nha! 💄',
  'service',
  ARRAY['makeup', 'làm tóc', 'tóc', 'chọn', 'tone', 'layout', 'tự chọn', 'kiểu tóc'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 3: Chụp studio mất bao lâu
(
  'Chụp studio mất khoảng bao lâu?',
  E'Make up và làm tóc sẽ khoảng **2 tiếng** sau đó vợ chồng em lên chụp tại studio, không phải di chuyển đi đâu nên sẽ không mất nhiều thời gian em nè.\n\nCòn về các concept thời gian bao lâu thì sẽ phụ thuộc vào vợ chồng em chụp mấy concept nữa đó bé.\n\nChụp studio tiện lắm — không bị nóng, không phụ thuộc thời tiết, cô dâu bầu nghén cũng không mệt. Studio rộng 900m² có đủ concept đa dạng nè! ☀️',
  'service',
  ARRAY['thời gian', 'mất bao lâu', 'chụp lâu không', 'makeup lâu', '2 tiếng', 'studio', 'bao lâu'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 4: Bao lâu có ảnh
(
  'Sau khi chụp bao lâu thì nhận được ảnh?',
  E'Bình thường ảnh dâu rể bên chị sẽ nhận sau **1–2 tuần** em nè.\n\nNhưng nếu vợ chồng em gần ngày cưới, bên chị ưu tiên làm ảnh sớm — **3–5 hôm là có ảnh** bé nha! 🌸\n\nẢnh được gửi qua **Google Drive** — link riêng cho vợ chồng em, chọn ảnh theo danh sách rồi ekip chỉnh sửa hết cho em nha.',
  'service',
  ARRAY['nhận ảnh', 'bao lâu có ảnh', 'thời gian ảnh', '3-5 hôm', '1-2 tuần', 'google drive', 'giao ảnh'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 5: Đặt cọc bao nhiêu
(
  'Đặt cọc bao nhiêu để giữ lịch?',
  E'Cọc **1.000.000đ** để giữ lịch nha em, còn lại thanh toán vào ngày chụp.\n\nChuyển khoản qua:\n➡️ **MB Bank** – STK: 9098688688888 – NGUYEN THU THUY\n➡️ **Vietcombank** – STK: 0031000367971 – NGUYEN THU THUY\n\nEm chuyển khoản ghi họ tên và gửi chị ảnh chụp màn hình là xong nha! 🎉',
  'booking',
  ARRAY['cọc', 'đặt cọc', 'giữ lịch', 'chuyển khoản', 'thanh toán', 'mb bank', 'vietcombank', 'bao nhiêu cọc'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 6: Thông tin chuyển khoản
(
  'Số tài khoản chuyển khoản của H2O Studio là gì?',
  E'Chuyển khoản qua 1 trong 2 tài khoản sau nha em:\n\n🏦 **MB Bank** – STK: **9098688688888** – NGUYEN THU THUY\n🏦 **Vietcombank** – STK: **0031000367971** – NGUYEN THU THUY\n\nEm chuyển xong nhớ ghi họ tên và gửi chị ảnh chụp màn hình để chị xác nhận cho em nha! 💳',
  'booking',
  ARRAY['tài khoản', 'chuyển khoản', 'bank', 'mb bank', 'vietcombank', 'stk', 'số tài khoản', 'thanh toán'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 7: Ưu đãi 48h
(
  'Ưu đãi 48h gồm những gì?',
  E'🔥 Book lịch Online trong **48h** được tặng quà trị giá **3.500.000đ**:\n\n🎁 Nâng cấp chất liệu ảnh tráng gương cao cấp nhất (1.500.000đ)\n🎁 Voucher nâng cấp váy cưới (1.500.000đ)\n🎁 Makeup chú rể chụp hình (500.000đ)\n🎁 Ưu tiên tự chọn lịch chụp bất kỳ\n\nEm chỉ cần cọc 1 triệu là giữ được ưu đãi luôn nha! Hôm nay đã có nhiều cặp book rồi, lịch đẹp cuối tuần chỉ còn vài slot thôi em ơi 🌸',
  'promotion',
  ARRAY['ưu đãi', '48h', 'khuyến mãi', 'quà tặng', 'tặng', 'voucher', 'nâng cấp', 'giảm giá', 'book online'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 8: Về makeup chất lượng
(
  'Makeup cô dâu có đẹp không, chuyên viên có giỏi không?',
  E'Chị tự tin nha bé! Makeup cô dâu bên H2O là do **giảng viên Học viện Thuỷ H2O Makeup** thực hiện.\n\nCác chuyên viên đều có chứng chỉ nhà nước cấp, layout trẻ trung tôn nét đẹp tự nhiên, tỉ mỉ từng chi tiết.\n\nEm có thể nói tone makeup mình thích — chuyên viên sẽ tư vấn phù hợp nhất với khuôn mặt em nha.\n\n💬 Khách H2O hay feedback: *"Từ make đến làm tóc rất tỉ mỉ cẩn thận và chỉnh chu"* — em yên tâm nha! 💄',
  'service',
  ARRAY['makeup', 'chuyên viên', 'chất lượng', 'đẹp không', 'trang điểm', 'học viện', 'thuỷ h2o', 'tóc cô dâu'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 9: Váy cưới studio
(
  'Studio có váy để mặc khi chụp không, được tự chọn không?',
  E'Được nha em! Bên chị có kho váy cưới đa dạng — váy xoè, váy đuôi cá, áo dài đôi, hanbok, hỷ phục... đủ loại nè.\n\n✅ Váy trong gói: em chọn thoải mái\n✅ Muốn váy cao cấp hơn: phụ thu nhỏ (ví dụ váy 4tr chỉ phụ thu 500k)\n✅ Tự mang váy riêng: hoàn toàn được nha\n\nVoucher ưu đãi 48h còn tặng thêm **voucher nâng cấp váy 1.500.000đ** nữa đó bé! 👗',
  'service',
  ARRAY['váy', 'váy cưới', 'trang phục', 'chọn váy', 'mang váy riêng', 'kho váy', 'áo dài'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 10: Studio concept đa dạng không
(
  'Studio có concept đa dạng không?',
  E'Studio H2O rộng **900m²** — đa dạng concept từ Hàn Quốc, cổ điển, sang trọng đến nhẹ nhàng tự nhiên nha em.\n\nVợ chồng em hoàn toàn được:\n• Chọn concept theo sở thích\n• Gửi ảnh mẫu tham khảo trước\n• Tư vấn concept phù hợp nhất với phong cách\n\n➡️ Không phải di chuyển đi đâu — toàn bộ buổi chụp diễn ra tại studio!\n\nChị gửi thêm ảnh concept cho em xem nha để chọn trước cho dễ 📸',
  'service',
  ARRAY['concept', 'studio', 'theme', 'phong cách', 'kiểu chụp', '900m2', 'đa dạng', 'hàn quốc'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 11: Có thể đổi lịch không
(
  'Sau khi đặt cọc có thể đổi lịch hoặc huỷ không?',
  E'Em cứ yên tâm nha! Nếu có việc đột xuất cần đổi lịch, liên hệ chị sớm trước ngày chụp ít nhất **2–3 ngày** là chị sắp xếp được cho vợ chồng em.\n\n📅 Lịch đẹp hay cuối tuần thì nên báo sớm hơn vì hay kín nha em.\n\nHuỷ lịch: cọc đã đặt sẽ không hoàn lại nha bé — nhưng mình có thể đổi sang ngày khác phù hợp nè.',
  'booking',
  ARRAY['đổi lịch', 'huỷ lịch', 'thay đổi lịch', 'hoàn cọc', 'dời ngày', 'đổi ngày'],
  'H2O_CHAT_0001',
  true,
  0
),

-- FAQ 12: Feedback thực tế từ khách
(
  'Khách hàng nói gì về H2O Studio?',
  E'Chị chia sẻ feedback thực tế từ khách để em tham khảo nha:\n\n💬 *"Ekip dễ thương, thân thiện. Support vợ chồng em rất nhiệt tình. Em ưng layout make up cũng như trang phục váy cưới bên mình. Từ make đến làm tóc rất tỉ mỉ cẩn thận và chỉnh chu ạ. Hnay vợ chồng em cảm ơn ekip bên mình rất nhiều!"*\n— Khách hàng thực tế H2O Studio\n\nHàng nghìn cặp đôi đã tin chọn H2O — chị tự tin vợ chồng em sẽ hài lòng nha! ❤️',
  'general',
  ARRAY['feedback', 'đánh giá', 'review', 'khách hàng nói gì', 'chất lượng', 'có tốt không'],
  'H2O_CHAT_0001',
  true,
  0
);

-- ============================================================
-- BƯỚC 4: INSERT SCRIPTS THỰC TẾ — Ngôn ngữ H2O thật
-- ============================================================
INSERT INTO sale_scripts (phase, title, content, tags, enabled, order_num) VALUES

-- OPENING 1: Bot chào tự động
(
  'opening',
  'Bot tự động chào khách đầu tiên',
  E'Chào em nha! Em đang muốn tham khảo "Trọn gói chụp ảnh cưới" hay "Váy cưới"? Để chị tư vấn chi tiết cho em nhé!',
  ARRAY['bot', 'chào', 'tự động', 'đầu tiên'],
  true,
  100
),

-- OPENING 2: Sale tiếp nhận
(
  'opening',
  'Sale tiếp nhận sau bot',
  E'Chào em nha. Em muốn tư vấn về chụp ảnh cưới hay váy cưới để chị tư vấn cho em nè',
  ARRAY['chào', 'tiếp nhận', 'mở đầu'],
  true,
  101
),

-- DISCOVERY 1: Hỏi nhu cầu cơ bản
(
  'discovery',
  'Khai thác nhu cầu — studio hay ngoại cảnh',
  E'Vợ chồng em có ngày cưới chưa bé, vợ chồng em dự định chụp studio hay ngoại cảnh nè em',
  ARRAY['khai thác', 'nhu cầu', 'ngày cưới', 'studio', 'ngoại cảnh'],
  true,
  102
),

-- DISCOVERY 2: Tạo urgency nhẹ khi gần ngày
(
  'discovery',
  'Tạo urgency khi khách gần ngày cưới',
  E'Vậy thời gian này vợ chồng em sắp xếp chụp là vừa thời gian chọn ảnh và duyệt ảnh nữa em nè',
  ARRAY['urgency', 'gần ngày', 'thời gian', 'chọn ảnh'],
  true,
  103
),

-- VALUE_PROP 1: Giải thích thời gian chụp studio
(
  'value_prop',
  'Giải thích thời gian — makeup 2 tiếng không di chuyển',
  E'Make up và làm tóc sẽ khoảng 2 tiếng sau đó vck e lên chụp tại studio không phải di chuyển đi đâu nên sẽ không mất nhiều thời gian em nè.\n\nCòn về các concept thời gian bao lâu thì sẽ phụ thuộc vào vợ chồng em chụp mấy concept nữa đó bé.\n\nVợ chồng em dự định sẽ chụp mấy concept chưa nè',
  ARRAY['thời gian', 'makeup', '2 tiếng', 'không di chuyển', 'concept'],
  true,
  104
),

-- VALUE_PROP 2: Giải thích tự chọn makeup tóc concept
(
  'value_prop',
  'Tự chọn makeup tóc concept trang phục hoàn toàn',
  E'Được nha bé iu. Tất cả từ tone make up, kiểu tóc, concept hay trang phục đều là vợ chồng em chọn hết nè.\n\nBên chị sẽ chỉ tư vấn để đúng với mong muốn và sở thích của vợ chồng em thôi nha.\n\nCác tone make up và kiểu tóc bên chị rất đa dạng nên em có thể ngắm trước sau đó ưng kiểu nào thì đưa bên chị tư vấn trực tiếp vào ngày chụp cho em nè.',
  ARRAY['makeup', 'tóc', 'concept', 'tự chọn', 'trang phục', 'sở thích'],
  true,
  105
),

-- OFFER 1: Gửi bảng giá + USP
(
  'offer',
  'Gửi bảng giá kèm USP H2O Studio',
  E'Chị gửi chi tiết cho em các gói chụp tại studio nha\n\n[GỬI BẢNG GIÁ]\n\n💎 GIÁ TRỊ KHÁC BIỆT – CHỈ CÓ TẠI H2O\nChất lượng đẹp nhất – Dịch vụ tận tâm nhất\n\n✅ Ảnh đẹp không gò ép — dâu rể chọn concept theo sở thích\n✅ Makeup cô dâu bởi giảng viên Học viện Thuỷ H2O Makeup\n✅ Studio rộng 900m² — concept đa dạng, không cần di chuyển\n✅ Ekip hướng dẫn tạo dáng tận tình\n✅ Được check file ngay sau chụp\n✅ Miễn phí phụ kiện: vương miện, khuyên tai, hoa cầm tay, giày...\n✅ Concept đa dạng: Hàn Quốc – cổ điển – sang trọng – nhẹ nhàng',
  ARRAY['bảng giá', 'USP', 'giá trị', 'khác biệt', 'offer', 'gói chụp'],
  true,
  106
),

-- FOMO: Ưu đãi 48h
(
  'fomo',
  'Ưu đãi 48h — quà tặng 3.500.000đ',
  E'🔥 ƯU ĐÃI ĐẶC BIỆT DÀNH RIÊNG CHO EM TRONG 48H\n\nBook lịch Online trong 48h được tặng quà trị giá 3.500.000đ:\n\n🎁 Nâng cấp chất liệu ảnh tráng gương cao cấp nhất (1.500.000đ)\n🎁 Tặng voucher nâng cấp váy cưới (1.500.000đ)\n🎁 Makeup chú rể chụp hình (500.000đ)\n🎁 Ưu tiên tự chọn lịch chụp bất kỳ\n\nHầu hết dâu rể bên chị đều lựa chọn combo studio 9999 vì gần như đầy đủ cho 2 vợ chồng về ảnh và 2 ngày cưới hỏi nha em',
  ARRAY['ưu đãi', '48h', 'fomo', 'quà tặng', 'book online', '3.5 triệu', 'voucher'],
  true,
  107
),

-- FOMO: Gửi concept khơi gợi quyết định
(
  'fomo',
  'Gửi thêm concept để khách dễ quyết định',
  E'Vck e xem cần tư vấn phần nào chị tư vấn thêm cho 2 vck nè.\n\nĐể chị gửi em xem thêm các concept chụp tại studio nữa cho vck e dễ quyết định nhé.\n\n[GỬI CONCEPT]\n\nHai vợ chồng em có concept nào ưng ý muốn chụp chưa nè gửi chị tư vấn thêm cho em nha',
  ARRAY['concept', 'gửi hình', 'quyết định', 'tham khảo', 'do dự'],
  true,
  108
),

-- CLOSING 1: Hỏi thông tin khi khách chốt
(
  'closing',
  'Lấy thông tin sau khi khách chốt gói',
  E'Vck em đăng ký giữ lịch chụp gửi chị xin thông tin tên và số điện thoại của vợ chồng em nhé',
  ARRAY['chốt', 'thông tin', 'tên', 'sđt', 'giữ lịch'],
  true,
  109
),

-- CLOSING 2: Hướng dẫn chuyển khoản
(
  'closing',
  'Gửi thông tin chuyển khoản đặt cọc',
  E'Em chuyển khoản ghi họ tên của em và gửi chị ảnh chụp màn hình là được nhớ\n\n➡️ MB Bank – STK: 9098688688888 – NGUYEN THU THUY\n➡️ Vietcombank – STK: 0031000367971 – NGUYEN THU THUY',
  ARRAY['chuyển khoản', 'cọc', 'mb bank', 'vietcombank', 'đặt cọc', '1 triệu'],
  true,
  110
),

-- CLOSING 3: Xác nhận sau khi nhận cọc
(
  'closing',
  'Xác nhận sau nhận cọc + hẹn lịch chụp',
  E'Chị nhận nha bé\n\nChị hẹn vck em 8h30 [ngày chụp] bé nha\n\nChị gửi phần dặn dò ngày chụp vợ chồng em nhé\n\n[GỬI CHECKLIST CHUẨN BỊ]',
  ARRAY['xác nhận', 'nhận cọc', 'hẹn lịch', 'checklist', '8h30'],
  true,
  111
),

-- PRE_SHOOT: Checklist chuẩn bị ngày chụp
(
  'pre_shoot',
  'Dặn dò chuẩn bị ngày chụp',
  E'📝 Chuẩn bị cho ngày chụp nha em:\n\n👰 Cô dâu:\n• Quần lót màu nude hoặc trắng\n• Miếng dán ngực\n• Nails xinh xắn (làm trước nha bé)\n• Giày guốc nếu có\n• Ngủ đủ giấc, ăn sáng no để rạng rỡ nhất\n\n🤵 Chú rể:\n• Áo sơ mi trắng sạch\n• Thắt lưng\n• Giày da đen\n\n🎁 Thiếu gì studio có sẵn — yên tâm nha!\n\n📅 Hẹn gặp vợ chồng em lúc **8h30** nhé! Studio sẽ có sẵn nước uống và đồ ăn nhẹ nha bé 💕',
  ARRAY['chuẩn bị', 'checklist', 'ngày chụp', 'dặn dò', 'pre_shoot', '8h30'],
  true,
  112
),

-- FOLLOWUP: Hỏi feedback sau chụp
(
  'followup',
  'Hỏi thăm feedback sau buổi chụp',
  E'Hôm nay đi chụp về em thấy thế nào em nè? 🌸\n\nEm có thấy hài lòng với buổi chụp hôm nay không em?\n\nCó gì cho chị xin feedback của vợ chồng em với nha ❤️\n\nCó bạn bè chuẩn bị cưới nhớ giới thiệu qua H2O em nhé!\n\nChiều mai ekip photo sẽ gửi ảnh cho vợ chồng em trước 14h chiều nhé',
  ARRAY['feedback', 'sau chụp', 'hỏi thăm', 'giới thiệu', 'followup', 'giao ảnh'],
  true,
  113
);

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================
SELECT
  'customer_faqs' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN source = 'H2O_CHAT_0001' THEN 1 END) as from_real_chat
FROM customer_faqs
UNION ALL
SELECT
  'sale_scripts' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN order_num BETWEEN 100 AND 113 THEN 1 END) as from_real_chat
FROM sale_scripts;
