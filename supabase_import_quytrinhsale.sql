-- ============================================================
-- IMPORT QUY TRÌNH SALE 14 GIAI ĐOẠN — H2O STUDIO
-- Chạy trong Supabase SQL Editor
-- Nguồn: quytrinhsale.md (phân tích chuyên gia)
-- ============================================================

-- ─── PHẦN 1: KHO CÂU HỎI THỰC TẾ (customer_faqs) ────────────
-- 12 câu hỏi phổ biến nhất từ hành trình khách hàng thực tế

INSERT INTO customer_faqs (id, question, answer, category, tags, source, is_approved, usage_count, created_at)
VALUES

-- GĐ 2: Khai thác loại hình
(gen_random_uuid(),
 'Bên mình chụp studio hay ngoại cảnh ạ?',
 'Bên em có cả hai anh/chị ơi! 😊 Chụp studio thì không phải di chuyển, background đẹp, makeup được bảo quản tốt. Chụp ngoại cảnh thì ảnh thiên nhiên lãng mạn hơn. Nhiều anh/chị còn kết hợp cả hai trong cùng một buổi chụp luôn ạ! Anh/chị thích style nào hơn để em tư vấn gói phù hợp nhé?',
 'discovery',
 ARRAY['studio','ngoại cảnh','outdoor','loại hình chụp','chụp ở đâu'],
 'manual', true, 0, now()),

-- GĐ 3: Xử lý nỗi lo thời gian
(gen_random_uuid(),
 'Chụp studio mất khoảng bao lâu ạ?',
 'Dạ thông thường một buổi chụp studio mất khoảng 4-6 tiếng anh/chị ơi! Trong đó makeup và làm tóc khoảng 1.5-2 tiếng, còn lại là thời gian chụp. Vì chụp tại studio nên không phải di chuyển, anh/chị thoải mái hơn nhiều ạ. Số concept càng nhiều thì thời gian có thể dài hơn một chút nhé 😊',
 'discovery',
 ARRAY['thời gian chụp','bao lâu','mất bao lâu','lâu không','mấy tiếng'],
 'manual', true, 0, now()),

-- GĐ 4: Khai thác sở thích makeup/tóc
(gen_random_uuid(),
 'Bên mình có được chọn kiểu tóc và makeup không ạ?',
 'Dạ được hết anh/chị ơi! 💕 Bên em hỗ trợ anh/chị chọn: tone makeup (tự nhiên, đậm, smoky...), kiểu tóc (xoăn, thẳng, búi, thác đổ...), concept chụp, trang phục (váy cưới, áo dài, vest). Đội makeup bên em rất có kinh nghiệm, sẽ tư vấn kiểu phù hợp với khuôn mặt của chị ạ!',
 'consulting',
 ARRAY['makeup','tóc','kiểu tóc','trang điểm','được chọn','trang phục','áo cưới'],
 'manual', true, 0, now()),

-- GĐ 4: Makeup chú rể
(gen_random_uuid(),
 'Anh chú rể có được makeup không ạ?',
 'Dạ có ạ! 😊 Chú rể được makeup nhẹ để ảnh lên đẹp hơn — chủ yếu là tạo nền da và sửa nhược điểm nhỏ thôi, trông rất tự nhiên không bị đậm ạ. Một số gói bên em còn tặng kèm makeup chú rể miễn phí nữa, em kiểm tra gói phù hợp cho anh/chị nhé!',
 'consulting',
 ARRAY['makeup chú rể','chú rể','makeup nam','trang điểm chú rể'],
 'manual', true, 0, now()),

-- GĐ 5: Hỏi giá
(gen_random_uuid(),
 'Giá chụp ảnh cưới bên mình như thế nào ạ?',
 'Dạ bên em có nhiều gói từ cơ bản đến cao cấp để anh/chị lựa chọn ạ! Giá phụ thuộc vào số concept, số lượng ảnh, và dịch vụ đi kèm. Em sẽ gửi bảng giá chi tiết để anh/chị tham khảo nhé 💕 Anh/chị dự định chụp studio hay kết hợp ngoại cảnh để em tư vấn gói phù hợp nhất ạ?',
 'offer',
 ARRAY['giá','bao nhiêu tiền','chi phí','bảng giá','báo giá','phí chụp','giá cả'],
 'manual', true, 0, now()),

-- GĐ 5: Hỏi concept
(gen_random_uuid(),
 'Bên mình có những concept nào ạ?',
 'Bên em có rất nhiều concept đẹp anh/chị ơi! 😍 Phổ biến nhất là: Concept Trắng (tinh khôi, lãng mạn), Concept Đỏ (sang trọng, quyền quý), Concept Rustic (vintage, mộc mạc), Concept Hiện đại (tối giản, thời thượng), Concept Tông Nude (tự nhiên, nhẹ nhàng). Anh/chị muốn em gửi link album mẫu để xem cụ thể không ạ?',
 'discovery',
 ARRAY['concept','phong cách','style','kiểu chụp','mẫu ảnh','ảnh mẫu','chủ đề'],
 'manual', true, 0, now()),

-- GĐ 5: So sánh 1 vs 2 concept
(gen_random_uuid(),
 'Chụp 1 concept và 2 concept thì giá khác nhau bao nhiêu ạ?',
 'Dạ khác nhau một chút ạ! Chụp 2 concept thì anh/chị có nhiều ảnh đẹp hơn, đa dạng phong cách hơn — nhiều cặp đôi sau khi xem ảnh mẫu thường muốn nâng lên 2 concept vì thích quá 😄 Em sẽ gửi bảng giá so sánh chi tiết để anh/chị dễ cân nhắc nhé! Ngân sách của anh/chị dự kiến khoảng bao nhiêu để em tư vấn gói phù hợp ạ?',
 'offer',
 ARRAY['1 concept','2 concept','số concept','thêm concept','giá concept'],
 'manual', true, 0, now()),

-- GĐ 7: Buy signal — xem concept
(gen_random_uuid(),
 'Em muốn chụp theo concept này được không ạ?',
 'Dạ được ạ! Concept đó rất hợp với anh/chị 💕 Bên em hoàn toàn có thể làm được. Anh/chị muốn giữ nguyên 100% hay muốn điều chỉnh gì thêm không? Và anh/chị đang dự định chụp vào tháng mấy để em check lịch trống cho mình nhé!',
 'offer',
 ARRAY['muốn chụp','chọn concept','concept này','theo kiểu này','mẫu này'],
 'manual', true, 0, now()),

-- GĐ 8: Thời gian nhận ảnh (buy signal)
(gen_random_uuid(),
 'Chụp xong bao lâu thì có ảnh ạ?',
 'Dạ thông thường 3-5 ngày làm việc là có ảnh preview để anh/chị xem và chọn ảnh rồi ạ! 📸 Sau khi anh/chị chọn xong, ảnh retouch hoàn chỉnh sẽ có trong 7-10 ngày. Bên em retouch kỹ từng tấm, đảm bảo ảnh đẹp nhất trước khi giao ạ 💕',
 'consulting',
 ARRAY['bao lâu có ảnh','nhận ảnh','giao ảnh','ra ảnh','thời gian nhận','mấy ngày có ảnh'],
 'manual', true, 0, now()),

-- GĐ 9-10: Chốt + Đặt cọc
(gen_random_uuid(),
 'Đặt cọc bao nhiêu để giữ ngày ạ?',
 'Dạ bên em đặt cọc 1 triệu để giữ ngày anh/chị ơi! Phần còn lại thanh toán vào ngày chụp ạ. Anh/chị có thể chuyển khoản hoặc ghé studio đều được. Sau khi cọc em sẽ block lịch ngay cho mình, không lo bị trùng ngày nữa nhé 🙏',
 'closing',
 ARRAY['đặt cọc','cọc','tiền cọc','giữ ngày','đặt trước','thanh toán','bao nhiêu cọc'],
 'manual', true, 0, now()),

-- GĐ 11: Upsell sau concept
(gen_random_uuid(),
 'Em muốn chuyển sang gói cao hơn có được không ạ?',
 'Dạ được ạ, anh/chị cứ thoải mái! 😊 Rất nhiều anh/chị sau khi xem concept mẫu thì muốn nâng gói lên vì thấy concept đẹp quá, thêm concept để có nhiều ảnh đa dạng hơn. Bên em hỗ trợ nâng gói bất cứ lúc nào trước ngày chụp ạ. Em sẽ tính lại giá chênh lệch cho anh/chị nhé!',
 'offer',
 ARRAY['nâng gói','chuyển gói','gói cao hơn','thêm concept','upgrade'],
 'manual', true, 0, now()),

-- GĐ 13: Feedback sau chụp
(gen_random_uuid(),
 'Ảnh đã xong, bên mình giao ảnh như thế nào ạ?',
 'Dạ bên em sẽ gửi link Google Drive riêng cho anh/chị để xem toàn bộ ảnh preview ạ! 📁 Anh/chị xem và đánh dấu ảnh muốn retouch, bên em sẽ chỉnh sửa kỹ và giao ảnh hoàn chỉnh sau 7-10 ngày. Ảnh được lưu trên Drive, anh/chị tải về dùng thoải mái nhé 💕',
 'followup',
 ARRAY['nhận ảnh','giao ảnh','drive','link ảnh','bàn giao','tải ảnh'],
 'manual', true, 0, now());


-- ─── PHẦN 2: KHO KỊCH BẢN (sale_scripts) ────────────────────
-- 14 kịch bản mới theo quy trình chuyên gia
-- order_num 100+ để không đụng kịch bản cũ

INSERT INTO sale_scripts (id, phase, title, content, tags, enabled, order_num, created_at)
VALUES

-- ── DISCOVERY: Khai thác ngày cưới → tạo urgency ──
(gen_random_uuid(),
 'discovery',
 'Khai thác ngày cưới — tạo tính cấp bách',
 E'Vợ chồng em có ngày cưới chưa ạ?\n\nNếu đã có ngày rồi → em kiểm tra lịch chụp cho mình nhé! (Tháng gần → nhấn mạnh lịch sắp kín)\n\nNếu chưa có ngày → Dạ anh/chị dự kiến cưới vào khoảng tháng mấy ạ? Để em tư vấn và giữ slot phù hợp cho mình nhé 😊\n\n💡 Tip: Khách cưới tháng sau → tạo urgency ngay: "Tháng đó lịch bên em khá kín rồi ạ, anh/chị muốn em check slot trống không?"',
 ARRAY['ngày cưới','tháng cưới','thời gian cưới','lịch chụp','urgency','cấp bách'],
 true, 100, now()),

(gen_random_uuid(),
 'discovery',
 'Khai thác loại hình — thu hẹp nhu cầu',
 E'Anh/chị muốn chụp studio, ngoại cảnh, hay kết hợp cả hai ạ?\n\n• Studio → Không di chuyển, makeup được bảo quản, ánh sáng đẹp đều\n• Ngoại cảnh → Ảnh thiên nhiên lãng mạn, cần di chuyển\n• Kết hợp → Đa dạng phong cách, nhiều ảnh đẹp hơn (phổ biến nhất)\n\n💡 Tip: Sau khi khách chọn → chuyển ngay sang tư vấn concept phù hợp với loại hình đó',
 ARRAY['studio','ngoại cảnh','outdoor','loại hình','thu hẹp nhu cầu'],
 true, 101, now()),

-- ── CONSULTING: Xử lý nỗi lo ──
(gen_random_uuid(),
 'value_prop',
 'Xử lý nỗi lo thời gian chụp',
 E'Dạ chụp studio bên em không mất quá nhiều thời gian anh/chị ơi! 😊\n\n⏱ Thời gian thực tế:\n• Makeup + làm tóc: ~1.5-2 tiếng\n• Chụp ảnh: 2-3 tiếng (tùy số concept)\n• Tổng: ~4-5 tiếng\n\n✅ Ưu điểm:\n• Chụp ngay tại studio, không phải di chuyển\n• Makeup được giữ nguyên suốt buổi\n• Có thể nghỉ giải lao, ăn nhẹ giữa buổi\n\nAnh/chị yên tâm, ekip bên em làm việc nhanh và chuyên nghiệp lắm ạ!',
 ARRAY['thời gian','bao lâu','mất thời gian','nỗi lo','time','lịch'],
 true, 102, now()),

(gen_random_uuid(),
 'value_prop',
 'Tư vấn makeup tóc — giải tỏa lo lắng trải nghiệm',
 E'Anh/chị hoàn toàn được chọn theo sở thích nhé! 💕\n\n✅ Chị dâu được chọn:\n• Tone makeup: tự nhiên / đậm / smoky / đẹp tươi\n• Kiểu tóc: xoăn / thẳng / búi / thác đổ / tết\n• Concept: em sẽ gửi album mẫu để chị tham khảo\n• Trang phục: váy cưới / áo dài / váy dạ hội\n\n✅ Anh chú rể:\n• Makeup nhẹ, tự nhiên (không bị đậm)\n• Vest hoặc suit theo concept\n\n💡 Tip: Gửi ảnh mẫu kiểu makeup/tóc khách thích → show ngay album concept tương đương',
 ARRAY['makeup','tóc','kiểu tóc','trang điểm','trải nghiệm','lo lắng','được chọn'],
 true, 103, now()),

-- ── OFFER: Báo giá + Gửi concept ──
(gen_random_uuid(),
 'offer',
 'Báo giá — gửi bảng giá + giá trị đi kèm',
 E'Em gửi anh/chị bảng giá tham khảo nhé! 💕\n\n📋 Cách trình bày hiệu quả:\n1. Gửi bảng giá từ gói cơ bản → cao cấp\n2. Nhấn mạnh NHỮNG GÌ ĐƯỢC NHẬN (không chỉ số tiền)\n3. So sánh giá trị: "Gói 4999 bao gồm X, gói 6999 thêm Y và Z"\n\n💡 Sau khi gửi giá → HỎI NGAY:\n"Anh/chị muốn em tư vấn gói nào phù hợp nhất với nhu cầu của mình không ạ?"\n\n⚠️ KHÔNG để khách tự quyết định một mình — luôn dẫn dắt tiếp',
 ARRAY['báo giá','bảng giá','gói chụp','giá tiền','chi phí','tư vấn gói'],
 true, 104, now()),

(gen_random_uuid(),
 'offer',
 'Gửi concept — điểm quyết định chốt sale',
 E'🎯 Đây là bước quan trọng nhất — khách xem concept xong thường tự chốt!\n\nCách gửi hiệu quả:\n1. Gửi 2-3 concept khác nhau (không gửi quá nhiều)\n2. Brief ngắn cho mỗi concept: "Concept Trắng — tinh khôi, lãng mạn, phù hợp với chị có làn da sáng"\n3. Hỏi ngay sau khi gửi: "Anh/chị thích concept nào nhất ạ?"\n\n💡 Khi khách nói "Em thích concept này" → Buy signal! Chuyển sang chốt ngay:\n"Dạ concept đó rất hợp với anh/chị! Anh/chị muốn em giữ lịch chụp cho mình không ạ?"',
 ARRAY['concept','gửi concept','album mẫu','buy signal','điểm chốt','ảnh mẫu'],
 true, 105, now()),

(gen_random_uuid(),
 'offer',
 'Upsell sau concept — khách tự nâng gói',
 E'🔑 Logic quan trọng: Khách xem concept → thích → tự nâng gói (không cần ép)\n\nDấu hiệu nhận ra:\n• "Em muốn chụp thêm concept này nữa"\n• "Concept kia cũng đẹp, có thể kết hợp không?"\n• Khách gửi thêm ảnh mẫu concept khác\n\nCách xử lý:\n"Dạ được ạ! Thêm concept [X] thì anh/chị sẽ có thêm [số] ảnh đẹp nữa. Chênh lệch giữa 2 gói là [Y] triệu thôi ạ — anh/chị muốn em cập nhật lại không?"\n\n✅ KHÔNG cần chào hàng — chỉ cần confirm và làm dễ dàng nhất cho khách nâng',
 ARRAY['nâng gói','upsell','thêm concept','upgrade','chênh lệch','tự nâng'],
 true, 106, now()),

-- ── FOMO: Tạo urgency ──
(gen_random_uuid(),
 'fomo',
 'Gửi ưu đãi 48h — tạo khan hiếm',
 E'⏰ Ưu đãi đặc biệt khi anh/chị book trong 48h:\n\n🎁 TẶNG KÈM:\n• Nâng cấp chất liệu album (từ standard → premium)\n• Voucher thuê váy cưới (trị giá [X])\n• Makeup chú rể MIỄN PHÍ\n\n⚠️ Ưu đãi chỉ áp dụng khi đặt cọc trong 48h từ lúc nhận báo giá\n\n💡 Cách dùng hiệu quả:\n→ Gửi sau khi khách đã xem bảng giá và concept\n→ Kết hợp với thông tin lịch sắp kín\n→ KHÔNG dùng quá sớm khi khách chưa thấy value',
 ARRAY['ưu đãi','48h','tặng','khuyến mãi','khan hiếm','book','deadline'],
 true, 107, now()),

-- ── CLOSING: Chốt cọc ──
(gen_random_uuid(),
 'closing',
 'Hướng dẫn đặt cọc — chốt nhanh không để nguội',
 E'💳 Khi khách đồng ý chốt — làm ngay không để nguội!\n\n1. XÁC NHẬN: "Dạ vậy em giữ ngày [ngày cưới] cho anh/chị nhé!"\n\n2. HƯỚNG DẪN CỌC:\n"Anh/chị đặt cọc [1 triệu] để chính thức giữ lịch ạ:\n🏦 [Tên ngân hàng]\nSTK: [Số tài khoản]\nTên: [Tên chủ tài khoản]\nNội dung: HO TEN + ngay chup"\n\n3. XÁC NHẬN SAU CỌC:\n"Em đã nhận được cọc! Lịch chụp của anh/chị là [ngày] đã được giữ. Em sẽ liên lạc lại trước ngày chụp 3 ngày để nhắc nhở nhé 🎉"',
 ARRAY['đặt cọc','chuyển khoản','tài khoản','giữ lịch','thanh toán','chốt'],
 true, 108, now()),

(gen_random_uuid(),
 'closing',
 'Xử lý do dự cuối — "để anh/chị bàn với nhau"',
 E'🎯 Khi khách nói "để bàn với nhau rồi báo lại"\n\nĐÁP NGAY — không để chờ:\n"Dạ anh/chị cứ bàn nhé! Nhưng tháng đó lịch bên em còn [X] slot thôi ạ, em tạm giữ slot trong 24h cho anh/chị cân nhắc không?\n\nNếu anh/chị quyết định rồi thì cọc [1 triệu] là em giữ ngay ạ, không mất thêm gì cả 🙏"\n\n💡 Kỹ thuật: Đặt deadline mềm (24h) + giảm rào cản (cọc ít, dễ quyết)',
 ARRAY['do dự','bàn với nhau','để hỏi','chần chừ','xử lý objection','closing'],
 true, 109, now()),

-- ── PRE_SHOOT: Chăm sóc trước chụp ──
(gen_random_uuid(),
 'pre_shoot',
 'Checklist chuẩn bị trước ngày chụp',
 E'💌 Nhắc nhở anh/chị chuẩn bị trước ngày chụp nhé!\n\n✅ TRƯỚC 1 TUẦN:\n• Dưỡng ẩm da mặt mỗi ngày\n• Uống đủ nước (2L/ngày)\n• Tránh ăn đồ gây nổi mụn\n• Chuẩn bị trang phục cá nhân nếu có\n\n✅ NGÀY HÔM TRƯỚC:\n• Ngủ sớm, ngủ đủ giấc (da sáng hơn nhiều)\n• Dưỡng ẩm body\n• KHÔNG dùng tẩy da chết\n\n✅ NGÀY CHỤP:\n• Đến đúng giờ (thường 8:00-9:00 sáng)\n• Ăn sáng nhẹ trước khi đến\n• Mang theo snack và nước\n• Địa chỉ: [Địa chỉ studio]',
 ARRAY['chuẩn bị','checklist','trước ngày chụp','dặn dò','lưu ý','ngày chụp'],
 true, 110, now()),

-- ── FOLLOWUP: Bàn giao ảnh + Review ──
(gen_random_uuid(),
 'followup',
 'Bàn giao ảnh — hướng dẫn chọn và nhận ảnh',
 E'📸 Bàn giao ảnh cho anh/chị nhé!\n\n1. GỬILINK PREVIEW:\n"Dạ ảnh preview của anh/chị đã có rồi ạ! Em gửi link Drive:\n[Link Google Drive]\n\nAnh/chị xem và đánh dấu ảnh thích để bên em retouch nhé 💕\n(Được chọn [X] ảnh theo gói đã đặt)"\n\n2. HƯỚNG DẪN CHỌN ẢNH:\n"Anh/chị ưu tiên chọn ảnh có biểu cảm tự nhiên, ảnh nét, và ảnh đẹp cả 2 người nhé! Nếu thấy ảnh nào muốn giữ thêm, bên em tính thêm [X]/ảnh ạ"\n\n3. THỜI GIAN:\n"Sau khi anh/chị chọn xong, ảnh retouch hoàn chỉnh sẽ có trong 7-10 ngày ạ!"',
 ARRAY['bàn giao ảnh','giao ảnh','drive','chọn ảnh','retouch','nhận ảnh'],
 true, 111, now()),

(gen_random_uuid(),
 'followup',
 'Xin review 5 sao — sau khi giao ảnh hoàn chỉnh',
 E'⭐ Xin review — làm sau khi giao ảnh hoàn chỉnh\n\n"Dạ anh/chị ơi! Bên em rất vui khi được đồng hành cùng anh/chị trong ngày đặc biệt vừa rồi 💕\n\nNếu anh/chị hài lòng với ảnh và dịch vụ của H2O Studio, anh/chị có thể để lại đánh giá 5⭐ cho bên em không ạ? Mỗi review của anh/chị giúp ích rất nhiều cho studio ạ 🙏\n\n👉 Link đánh giá: [Link Google Maps hoặc Facebook]\n\nCảm ơn anh/chị rất nhiều! Chúc anh/chị hạnh phúc mãi nhé 🌸"\n\n💡 Thời điểm tốt nhất: 1-2 ngày sau khi giao ảnh hoàn chỉnh',
 ARRAY['review','đánh giá','5 sao','google review','feedback','chăm sóc sau bán'],
 true, 112, now()),

(gen_random_uuid(),
 'followup',
 'Hỏi thăm khách chưa chốt — follow-up nhẹ nhàng',
 E'📞 Follow-up khách chưa quyết định (sau 2-3 ngày)\n\nMESSAGE 1 (ngày 2):\n"Dạ anh/chị ơi, bên em liên hệ hỏi thăm anh/chị đã cân nhắc được chưa ạ? Nếu cần tư vấn thêm gì cứ nhắn em nhé 💕"\n\nMESSAGE 2 (ngày 4 — nếu chưa reply):\n"Dạ anh/chị ơi! Bên em vừa có thêm ưu đãi mới cho tháng này. Anh/chị quan tâm em gửi thông tin nhé 🎉"\n\nMESSAGE 3 (ngày 7 — cuối cùng):\n"Dạ anh/chị ơi, em liên hệ lần cuối vì slot tháng [X] của bên em sắp kín. Anh/chị quyết định được chưa để em giữ ngày cho mình ạ?"\n\n⚠️ Sau 3 lần không reply → dừng, tag là "cold lead"',
 ARRAY['follow-up','chưa chốt','hỏi thăm','cold lead','nhắc','theo dõi'],
 true, 113, now());

-- ─── THÔNG BÁO HOÀN THÀNH ───────────────────────────────────
DO $$
DECLARE
  faq_count integer;
  script_count integer;
BEGIN
  SELECT COUNT(*) INTO faq_count FROM customer_faqs WHERE source = 'manual' AND created_at > now() - interval '1 minute';
  SELECT COUNT(*) INTO script_count FROM sale_scripts WHERE created_at > now() - interval '1 minute';
  RAISE NOTICE '✅ Import hoàn thành! Đã thêm % câu hỏi FAQ và % kịch bản mới.', faq_count, script_count;
END $$;
