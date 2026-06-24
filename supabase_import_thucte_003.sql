-- supabase_import_thucte_003.sql
-- Import từ hội thoại thực tế H2O_CHAT_0006 đến H2O_CHAT_0012
-- CHỈ INSERT (không DELETE) — thêm mới vào existing data từ 001 + 002
-- Chạy sau khi đã import supabase_import_thucte_001.sql và 002.sql

-- ========================================
-- BƯỚC 1: CHECK trước khi import
-- ========================================
-- SELECT COUNT(*) as total_faqs FROM customer_faqs;
-- SELECT COUNT(*) as total_scripts FROM sale_scripts;
-- SELECT COUNT(*) as from_chat_006_012 FROM customer_faqs WHERE source >= 'H2O_CHAT_0006';

-- ========================================
-- BƯỚC 2: INSERT 16 FAQs mới (từ chat 006-012)
-- ========================================
INSERT INTO customer_faqs (id, question, answer, category, tags, source, is_approved, usage_count) VALUES

(gen_random_uuid()::text,
'Gói 3.999 bao gồm những gì?',
E'Combo chụp 3.999 là gói tinh giản em nè:\n\n📷 Chụp 1 concept tại studio\n🖼️ 1 ảnh phóng rạp\n💾 File ảnh gốc\n\nVợ chồng em được chọn trang phục và concept theo sở thích, không phát sinh thêm chi phí phụ kiện nha. Nếu em muốn thuê thêm váy hoặc vest ngày cưới thì bên chị ưu tiên giảm 50% giá thuê cho dâu rể đã chụp bên c em iu nhé!',
'pricing', ARRAY['gói 3999', 'combo tinh giản', 'ảnh phóng', 'file gốc', 'giá rẻ'], 'H2O_CHAT_0006', true, 0),

(gen_random_uuid()::text,
'File ảnh gốc nhận được khi nào?',
E'File ảnh gốc em nhận được ngay hôm sau ngày chụp em nha! 📱\n\nCòn ảnh đã qua chỉnh sửa (retouch) thì thường 2 tuần có em, nếu vck em cần gấp bên chị sẽ ưu tiên hỗ trợ thêm nha.',
'delivery', ARRAY['file ảnh gốc', 'nhận ảnh', 'hôm sau', 'thời gian lấy ảnh', 'ảnh gốc'], 'H2O_CHAT_0006', true, 0),

(gen_random_uuid()::text,
'H2O có váy bigsize không? Cỡ lớn nhất là bao nhiêu?',
E'Bên chị có váy bigsize đến 120kg em nha! 👗\n\nĐể chị tư vấn chính xác nhất, em cho chị biết:\n• Cô dâu cao bao nhiêu?\n• Cô dâu cân nặng bao nhiêu?\n\nChị sẽ tư vấn dòng váy phù hợp và đẹp nhất cho cô dâu em nha.',
'dress', ARRAY['váy bigsize', 'cỡ lớn', 'size to', 'cân nặng', '120kg', 'váy người mập'], 'H2O_CHAT_0007', true, 0),

(gen_random_uuid()::text,
'Cô dâu tóc ngắn chụp ảnh cưới có ổn không?',
E'Tóc ngắn chụp hình vẫn đẹp lắm em ơi! ✨\n\nBên chị có kẹp phím tóc màu nâu đen miễn phí hỗ trợ cô dâu tóc ngắn, kẹp phím phủ từ trên xuống trông rất tự nhiên em nha.\n\nHoặc nếu em có tóc kẹp riêng em cũng mang qua bên c kẹp cho nè.\n\nEkip chị xử lý nhiều cô dâu tóc ngắn rồi, đều ra ảnh đẹp lắm em!',
'hair', ARRAY['tóc ngắn', 'kẹp phím', 'tóc giả', 'cô dâu tóc ngắn', 'làm tóc ngắn'], 'H2O_CHAT_0011', true, 0),

(gen_random_uuid()::text,
'Áo dài thuê bên H2O giá bao nhiêu?',
E'Áo dài cho thuê bên chị 2.000.000đ/cặp (cô dâu + chú rể) em nha.\n\nNếu vợ chồng em đã chụp ảnh bên chị thì được giảm 50% còn 1.000.000đ/cặp thôii em iu 😍\n\nBên chị có nhiều mẫu áo dài đẹp, em muốn xem thêm nhắn chị gửi ảnh cho nha!',
'dress_rental', ARRAY['áo dài thuê', 'giá áo dài', 'áo dài đôi', '2 triệu', 'thuê áo dài'], 'H2O_CHAT_0008', true, 0),

(gen_random_uuid()::text,
'Có thể đặt cọc bằng tiền mặt không?',
E'Vợ chồng em cọc tiền mặt được nha! 💵\n\nBên chị nhận cả tiền mặt lẫn chuyển khoản, không bắt buộc phải CK em iu.\n\nVck em qua studio trực tiếp đặt cọc tiền mặt là được nha, chị note thông tin và ưu đãi cho vck em luôn nè!',
'payment', ARRAY['cọc tiền mặt', 'thanh toán tiền mặt', 'đặt cọc', 'cọc trực tiếp', 'không cần chuyển khoản'], 'H2O_CHAT_0009', true, 0),

(gen_random_uuid()::text,
'Cần chuẩn bị gì trước khi đến chụp ảnh cưới?',
E'Để buổi chụp diễn ra suôn sẻ, vck em chuẩn bị nha:\n\n👰 Cô dâu:\n• Quần lót màu nude\n• Miếng dán ngực\n• Nails (nếu có)\n• Guốc/giày (bên chị cũng có sẵn nếu chưa kịp chuẩn bị)\n\n🤵 Chú rể:\n• Áo sơ mi trắng\n• Thắt lưng\n• Giày da đen\n• 1 đôi tất đen + 1 đôi tất trắng\n\n🍰 Cả hai: Mang theo đồ ăn nhẹ (bánh, sữa) để có năng lượng chụp nha em!\n\nCác phụ kiện khác như vương miện, khuyên tai, hoa cầm tay bên chị miễn phí hết rồi em không cần lo nha.',
'preparation', ARRAY['chuẩn bị chụp ảnh', 'checklist', 'cần mang gì', 'tất đen tất trắng', 'quần lót nude', 'đồ ăn nhẹ'], 'H2O_CHAT_0009', true, 0),

(gen_random_uuid()::text,
'Chụp ở Hà Nội thì bao lâu có ảnh?',
E'Vck em chụp ở Hà Nội nhé:\n• Chủ nhật chụp → Thứ 5 tuần sau có ảnh (khoảng 4-5 ngày) 📸\n\nBên chị chuyển file về trong thời gian sớm nhất có thể nha. Nếu vck em cần gấp hơn thì nhắn chị, chị sẽ cố gắng ưu tiên thêm nè.',
'delivery', ARRAY['ảnh Hà Nội', 'bao lâu có ảnh', 'thời gian nhận ảnh HN', 'chuyển ảnh về'], 'H2O_CHAT_0010', true, 0),

(gen_random_uuid()::text,
'In ảnh (album/ảnh phóng) mất bao lâu?',
E'In ảnh bên chị tầm 5 ngày em nha 🖼️\n\nSau khi vck em duyệt ảnh xong bên c gửi đơn in, khoảng 5 ngày là có. Nếu cần gấp hơn nhắn chị để chị cố gắng sắp xếp thêm nha.',
'delivery', ARRAY['in ảnh', 'album', 'ảnh phóng', 'thời gian in', 'mấy ngày in xong', '5 ngày'], 'H2O_CHAT_0010', true, 0),

(gen_random_uuid()::text,
'Makeup ngày cưới cần đến sớm mấy tiếng?',
E'Cô dâu cần đến trước giờ tiệc khoảng 3-3.5 tiếng em nha nhé!\n\nVí dụ: Tiệc lúc 16h30 → Cô dâu đến makeup từ 13h.\n\nMakeup cô dâu tỉ mỉ cần thời gian để đẹp hoàn hảo nhất em iu 💄 Mình đến sớm là đến đúng giờ nhé, đừng để trễ nha bé!',
'makeup', ARRAY['makeup ngày cưới', 'đến sớm mấy tiếng', 'giờ makeup', 'chuẩn bị ngày cưới', '3 tiếng'], 'H2O_CHAT_0010', true, 0),

(gen_random_uuid()::text,
'Chụp ngoại cảnh ở đâu đẹp? Tháng mấy thì đẹp nhất?',
E'Các điểm ngoại cảnh đẹp bên chị hay chụp em nè:\n\n🌸 Vin Vũ Yên – cực kỳ đẹp, nhiều concept đa dạng\n🌿 Legacy – sang trọng cổ điển\n🌊 Hạ Long – thiên nhiên hoành tráng\n\n✨ Đẹp nhất là tháng 4-5 em nha – thời tiết đẹp, ánh sáng vàng, ảnh ra màu cực đẹp!\n\nVck em đang dự định chụp ngoại cảnh không? Để chị tư vấn thêm nha.',
'outdoor', ARRAY['ngoại cảnh', 'Vin Vũ Yên', 'Legacy', 'Hạ Long', 'tháng đẹp nhất', 'chụp ngoài trời'], 'H2O_CHAT_0007', true, 0),

(gen_random_uuid()::text,
'Chụp ở Vin Vũ Yên có phát sinh phí vào cổng không?',
E'Chụp hình với H2O tại Vin Vũ Yên không phát sinh phí vào cổng em nha! ✅\n\nBên chị đã có thỏa thuận với địa điểm nên vck em không cần lo về phí phụ trội nè. Chị đã tính trọn trong combo rồi em iu nhé!',
'outdoor', ARRAY['Vin Vũ Yên', 'phí vào cổng', 'không phát sinh', 'ngoại cảnh', 'phí địa điểm'], 'H2O_CHAT_0007', true, 0),

(gen_random_uuid()::text,
'Combo ngoại cảnh giá bao nhiêu?',
E'Bên chị có combo kết hợp studio + ngoại cảnh giá 15.000.000đ em nha 🌿\n\nTrong combo có thể kết hợp:\n• 1 studio + 2 ngoại cảnh\n• 2 ngoại cảnh + 1 studio\n\nĐặc biệt nếu vck em đăng ký trước sẽ nhận quà ưu đãi lên đến 5.000.000đ nè!\n\nVck em dự định chụp combo ngoại cảnh không? Nhắn chị tư vấn chi tiết hơn nha.',
'pricing', ARRAY['combo ngoại cảnh', 'giá ngoại cảnh', '15 triệu', 'kết hợp studio ngoại cảnh', 'ưu đãi ngoại cảnh'], 'H2O_CHAT_0007', true, 0),

(gen_random_uuid()::text,
'H2O có phục vụ khách ở tỉnh xa như Thanh Hóa, Nghệ An không?',
E'Bên chị phục vụ rất nhiều dâu rể ở tỉnh xa em nha:\n\n📍 Thanh Hoá, Nghệ An, Yên Bái, Tuyên Quang, Hà Tĩnh...\n\nVck em ở xa hoàn toàn có thể chụp bên chị nè! Bên chị sẽ:\n• Ưu tiên cho mượn đồ và trả đồ trong 1 tuần\n• Gửi đồ cưới (váy, áo dài) về tỉnh cho vck em được\n\nRất nhiều dâu rể tỉnh xa đã tin tưởng H2O, vck em yên tâm nha! 💕',
'logistics', ARRAY['khách tỉnh xa', 'Thanh Hóa', 'Nghệ An', 'gửi đồ về', 'dâu ở xa', 'chuyển đồ'], 'H2O_CHAT_0012', true, 0),

(gen_random_uuid()::text,
'Tóc chú rể tại H2O làm được gì? Có chỉnh kiểu tóc không?',
E'Tóc chú rể bên chị em lưu ý nha:\n\n✅ Có thể: Chỉnh màu tóc + tạo kiểu cao/thấp phù hợp concept\n❌ Không thể: Chỉnh kiểu tóc/form tóc (ví dụ tóc thẳng không làm xoăn được nha)\n\nNên chú rể cắt/làm tóc ưng ý trước ngày chụp 1-2 ngày là đẹp nhất em nè! Ekip chị sẽ tạo kiểu phù hợp trong khả năng có thể nha.',
'groom_prep', ARRAY['tóc chú rể', 'làm tóc nam', 'kiểu tóc', 'không chỉnh được tóc', 'tóc nam'], 'H2O_CHAT_0009', true, 0),

(gen_random_uuid()::text,
'Combo 9999 có tự chọn concept không? Có bị ép concept cố định không?',
E'Combo 9999 hoàn toàn tự chọn concept em nha! 🎨\n\nVck em được tự do lựa chọn:\n• Concept: Hàn Quốc, cổ điển, sang trọng, nhẹ nhàng, set bàn tiệc... không giới hạn!\n• Trang phục: Tất cả các dòng từ thiết kế đến cao cấp, không phát sinh thêm chi phí\n• Kiểu tóc: Mỗi concept đều được tạo kiểu tóc phù hợp riêng\n\nBên chị chỉ tư vấn thêm để phù hợp với vck em thôi, còn quyết định hoàn toàn của vợ chồng em nè 😍',
'product_detail', ARRAY['tự chọn concept', 'combo 9999', 'không phát sinh phí', 'concept cố định', 'chọn trang phục thoải mái'], 'H2O_CHAT_0012', true, 0);

-- ========================================
-- BƯỚC 3: INSERT 8 Scripts mới (từ chat 006-012)
-- order_num tiếp theo từ 125 (002 dùng 114-124)
-- ========================================
INSERT INTO sale_scripts (id, phase, title, content, tags, enabled, order_num) VALUES

(gen_random_uuid()::text, 'value_prop', 'Giới thiệu gói 3.999 tinh giản',
E'Bên chị có combo chụp 3.999 tinh giản cho vck em xem xét nè:\n\n📷 Chụp 1 concept tại studio\n🖼️ 1 ảnh phóng rạp\n💾 File ảnh gốc (có ngay hôm sau!)\n\nVck em được tự chọn trang phục + concept theo sở thích, không phát sinh thêm chi phí phụ kiện nha em.\n\nNếu vck em muốn thuê thêm váy hoặc vest ngày cưới thì bên chị ưu tiên giảm 50% cho dâu rể đã chụp bên c nè!\n\nVck em đang cần gói tiết kiệm hoặc chỉ muốn chụp đơn giản thì combo này phù hợp lắm đó em.',
ARRAY['gói 3999', 'tinh giản', 'giá rẻ', 'combo đơn giản', 'file gốc hôm sau'], true, 125),

(gen_random_uuid()::text, 'value_prop', 'Combo 9999 chi tiết – tự chọn concept, không phát sinh phí',
E'Combo studio 9999 vợ chồng em nhận được:\n\n📸 Chụp 2 concept tại studio\n👰 1 lần trang điểm + 2 kiểu tóc\n\nTrang phục vck tự chọn:\n• 2 váy cô dâu + 2 vest chú rể\n• Hoặc: 1 váy + 1 áo dài + cổ phục đều được nha\n\n🖼️ Sản phẩm:\n• 2 ảnh phóng 60x90\n• 1 bộ 5 ảnh bàn 15x21 và 20x30\n\n✨ ĐẶC BIỆT: Vck em tự chọn concept thoải mái – Hàn Quốc, cổ điển, sang trọng, set bàn tiệc... Tất cả các dòng váy kể cả cao cấp đều KHÔNG phát sinh thêm chi phí nha em!\n\nBên chị chỉ tư vấn thêm để phù hợp vck thôi, quyết định là của vợ chồng em nè 💕',
ARRAY['combo 9999', 'chi tiết', 'tự chọn concept', 'không phát sinh phí', 'studio 2 concept'], true, 126),

(gen_random_uuid()::text, 'discovery', 'Tư vấn cô dâu tóc ngắn lo lắng',
E'Tóc ngắn chụp hình vẫn đẹp lắm em ơi đừng lo!\n\nBên chị có kẹp phím tóc màu nâu đen miễn phí hỗ trợ cô dâu tóc ngắn nhé – kẹp phủ từ trên xuống rất tự nhiên, không phải đội cả đầu như tóc giả đâu em.\n\nHoặc nếu em có tóc kẹp riêng em cũng mang qua bên c kẹp cho nè.\n\nEkip chị xử lý nhiều cô dâu tóc ngắn rồi, đều ra ảnh xinh lắm em! Để chị gửi em xem một số cô dâu tóc ngắn bên chị đã chụp nhé 😍',
ARRAY['tóc ngắn', 'kẹp phím tóc', 'cô dâu tóc ngắn', 'xử lý tóc ngắn'], true, 127),

(gen_random_uuid()::text, 'offer', 'Tư vấn khách ở tỉnh xa (Thanh Hóa, Nghệ An...)',
E'Bên chị phục vụ rất nhiều dâu rể ở tỉnh xa em nha, không chỉ riêng Hải Phòng đâu!\n\nBên chị có khách từ Thanh Hoá, Nghệ An, Yên Bái, Tuyên Quang, Hà Tĩnh... chụp bên c hết nè.\n\nVck em ở xa chị sẽ ưu tiên:\n✅ Cho mượn đồ + trả đồ trong 1 tuần (không cần về gấp)\n✅ Gửi đồ cưới (váy, áo dài) về tỉnh được nha\n✅ Thậm chí chuyên viên bên chị cũng có người từ Thanh Hóa nên hiểu dâu ở xa lắm\n\nVck em cứ yên tâm lên lịch chụp nha em iu!',
ARRAY['khách tỉnh xa', 'Thanh Hóa', 'Nghệ An', 'gửi đồ về', 'dâu ở xa'], true, 128),

(gen_random_uuid()::text, 'offer', 'Upsell combo ngoại cảnh 15 triệu',
E'Nếu vck em muốn có thêm ảnh ngoại cảnh đẹp, bên chị có combo kết hợp giá 15.000.000đ nè!\n\n🌿 Vck em có thể chọn:\n• 1 concept studio + 2 ngoại cảnh\n• 2 ngoại cảnh + 1 concept studio\n\n📍 Địa điểm bên c hay chụp:\n• Vin Vũ Yên – KHÔNG phát sinh phí vào cổng khi chụp với H2O\n• Legacy – sang trọng cổ điển\n• Hạ Long – thiên nhiên hùng vĩ\n\n🌸 Chụp đẹp nhất tháng 4-5 em nha!\n\n🎁 Đăng ký trước nhận quà ưu đãi lên đến 5.000.000đ nè!\n\nVck em đang cân nhắc thêm ngoại cảnh không? Để chị tư vấn chi tiết cho nha.',
ARRAY['combo ngoại cảnh', '15 triệu', 'Vin Vũ Yên', 'upsell ngoại cảnh', 'ưu đãi 5 triệu'], true, 129),

(gen_random_uuid()::text, 'pre_shoot', 'Checklist chuẩn bị ngày chụp đầy đủ',
E'Vck em chuẩn bị trước ngày chụp nha:\n\n👰 Cô dâu mang theo:\n• Quần lót màu nude\n• Miếng dán ngực\n• Nails (nếu có)\n• Guốc/giày (chị cũng có sẵn nếu chưa kịp)\n\n🤵 Chú rể mang theo:\n• Áo sơ mi trắng\n• Thắt lưng\n• Giày da đen\n• 1 đôi tất đen + 1 đôi tất trắng (nhớ cả 2 đôi nha!)\n\n🍰 Cả hai: Đồ ăn nhẹ (bánh, sữa) để có năng lượng chụp em nhé!\n\nCác phụ kiện khác: vương miện, khuyên tai, hoa cầm tay... bên chị có sẵn miễn phí hết rồi nha.\n\nNhớ: Tiệm mở cửa từ 8h sáng em iu!',
ARRAY['checklist chụp ảnh', 'chuẩn bị', 'tất đen trắng', 'quần lót nude', 'đồ ăn nhẹ', '8h sáng'], true, 130),

(gen_random_uuid()::text, 'fomo', 'Đăng ký giữ lịch trước để giữ ưu đãi',
E'Em ơi, ưu đãi hiện tại còn đến [thời gian] nha bé!\n\nNhưng vck em không nhất thiết phải chụp ngay trong thời gian KM đâu nha – chỉ cần:\n✅ Đăng ký giữ lịch trước\n✅ Cọc 1.000.000đ (CK hoặc tiền mặt đều được)\n\nLà bên chị note ưu đãi + làm hợp đồng giữ quyền lợi cho vck em luôn!\n\nBao giờ vck em sắp xếp được lịch chụp nhắn c là áp dụng tất cả ưu đãi như hiện tại nha em iu 💕\n\nGửi c thông tin tên + sdt vck em để chị note lịch nha!',
ARRAY['đăng ký giữ lịch', 'fomo', 'ưu đãi deadline', 'giữ ưu đãi trước', 'cọc 1 triệu'], true, 131),

(gen_random_uuid()::text, 'closing', 'Hướng dẫn đặt cọc – tiền mặt hoặc chuyển khoản',
E'Vck em đặt cọc 1.000.000đ để giữ lịch + ưu đãi nha:\n\n💳 Chuyển khoản:\n➡️ MB Bank – STK: 9098688688888 – NGUYEN THU THUY\n➡️ Vietcombank – STK: 0031000367971 – NGUYEN THU THUY\nGhi nội dung: [Tên cô dâu] cọc chụp ảnh\nGửi c ảnh chụp màn hình sau khi CK nhé!\n\n💵 Tiền mặt:\nVck em qua studio nộp trực tiếp cũng được nha, chị nhận và làm hợp đồng luôn cho vck em!\n\n📍 Tiệm mở cửa từ 8h sáng em iu.',
ARRAY['đặt cọc', 'thanh toán', 'tiền mặt', 'chuyển khoản', 'cọc 1 triệu', 'MB Bank', 'Vietcombank'], true, 132);

-- ========================================
-- BƯỚC 4: CHECK sau khi import
-- ========================================
-- SELECT COUNT(*) as total_faqs FROM customer_faqs;
-- SELECT COUNT(*) as total_scripts FROM sale_scripts;
-- SELECT COUNT(*) as from_006_012 FROM customer_faqs WHERE source >= 'H2O_CHAT_0006';
-- SELECT question, source FROM customer_faqs WHERE source >= 'H2O_CHAT_0006' ORDER BY source, question;
-- SELECT title, phase, order_num FROM sale_scripts WHERE order_num >= 125 ORDER BY order_num;
