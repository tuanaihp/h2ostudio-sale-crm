-- ============================================================
-- IMPORT THỰC TẾ 002 — Từ hội thoại H2O_CHAT_0002/003/004/005
-- Chỉ INSERT thêm, KHÔNG xóa dữ liệu cũ
-- Chạy toàn bộ 1 lần trong Supabase SQL Editor
-- ============================================================

-- ============================================================
-- BƯỚC 1: INSERT FAQ MỚI — Nội dung từ chat 002-005
-- ============================================================
INSERT INTO customer_faqs (id, question, answer, category, tags, source, is_approved, usage_count) VALUES

-- FAQ: Combo 9999 gồm những gì
(gen_random_uuid()::text,
  'Combo 9999 gồm những gì?',
  E'Combo **9.999.000đ** đầy đủ cho vợ chồng em nè:\n\n📷 Chụp ảnh cưới tại studio — **2 concept**\n👗 Váy cưới ngày tiệc (dòng cao cấp trị giá 3.500.000đ)\n🥻 Áo dài đôi ngày ăn hỏi\n👔 Vest chú rể\n💄 Makeup cô dâu: **2 lần** — ngày ăn hỏi + ngày cưới\n🖼 Ảnh phóng + ảnh để bàn\n\nHầu hết dâu rể bên chị đều lựa chọn combo 9999 vì gần như đã đầy đủ cho cả 2 ngày cưới hỏi rồi em nè! 😊',
  'pricing',
  ARRAY['combo', '9999', '9tr9', 'gói 10 triệu', 'trọn gói', 'áo dài', 'váy', 'vest', '2 concept'],
  'H2O_CHAT_0002', true, 0
),

-- FAQ: Combo 12999 gồm những gì
(gen_random_uuid()::text,
  'Combo 12999 khác gì combo 9999?',
  E'Combo **12.999.000đ** — nhiều hơn so với combo 9999 nè em:\n\n📷 **3 concept** studio (thay vì 2 concept)\n👗 Váy cưới ngày tiệc dòng cao cấp hơn (trị giá 6.000.000đ)\n🖼 Ảnh phóng + ảnh để bàn + **ảnh treo tường**\n🥻 Áo dài đôi + vest + makeup 2 lần (giống combo 9999)\n\nTính ra combo 12999 chênh không nhiều so với 9999 mà vợ chồng em được:\n✅ Thêm 1 concept chụp\n✅ Váy cao cấp hơn\n✅ Có thêm ảnh treo tường\n\nNếu em muốn chụp 3 concept thì combo 12999 xứng đáng hơn em nè! 📸',
  'pricing',
  ARRAY['combo', '12999', '13 triệu', 'gói 13tr', '3 concept', 'ảnh treo tường', 'váy cao cấp', 'so sánh gói'],
  'H2O_CHAT_0002', true, 0
),

-- FAQ: Đăng ký sớm bảo lưu được không
(gen_random_uuid()::text,
  'Đăng ký sớm nhưng chưa dùng ngay có được không?',
  E'Được nha em! Em đăng ký trong thời gian này bên chị vẫn áp dụng dịch vụ cho vợ chồng em đến khi sử dụng nha bé.\n\nKể cả em đăng ký bây giờ mà sang năm mới cưới bên chị vẫn hỗ trợ theo combo.\n\n✅ Đăng ký sớm = giữ được ưu đãi 48h\n✅ Tự chọn lịch chụp sau\n✅ Bảo lưu đến ngày ăn hỏi và cưới\n\nNên em yên tâm đăng ký trước để giữ ưu đãi nhé! 🌸',
  'booking',
  ARRAY['đăng ký sớm', 'bảo lưu', 'giữ ưu đãi', 'chưa dùng ngay', 'sang năm', 'linh hoạt', 'dời lịch'],
  'H2O_CHAT_0002', true, 0
),

-- FAQ: Makeup về nhà có được không
(gen_random_uuid()::text,
  'Makeup về nhà được không? Chi phí thêm bao nhiêu?',
  E'Được nha em! Bên chị có chuyên viên về nhà cho vợ chồng em.\n\n📌 Trong combo: makeup tại cửa hàng\n📌 Muốn makeup về nhà: **thêm phụ phí 500.000đ/lần**\n\nPhụ phí thanh toán qua bên chị, chị sẽ sắp xếp chuyên viên cho em nha.\n\n💡 Ví dụ: Ngày ăn hỏi makeup về nhà + ngày cưới makeup về nhà = thêm 500k × 2 lần = 1.000.000đ\n\nChuyên viên về nhà hay tại cửa hàng đều là những bạn cứng tay đã phục vụ rất nhiều cô dâu ưng ý rồi nè em! 💄',
  'service',
  ARRAY['makeup về nhà', 'chuyên viên về nhà', 'phụ phí', '500k', 'tại nhà', 'di chuyển'],
  'H2O_CHAT_0003', true, 0
),

-- FAQ: Video slide trình chiếu đám cưới
(gen_random_uuid()::text,
  'H2O có làm video slide trình chiếu ngày đám cưới không?',
  E'Có nha em! Bên chị cũng có làm video slide trình chiếu ngày đám cưới cho dâu rể đó bé.\n\nVợ chồng em muốn làm bên chị hỗ trợ làm cho vợ chồng em nha. Và khi vợ chồng em đã đăng ký combo bên chị thì không phát sinh thêm chi phí nào nha bé!\n\n🎬 Video slide chạy ảnh phát trong ngày tiệc cưới\n\nCó nhu cầu em nhắn chị tư vấn thêm nha! 😊',
  'service',
  ARRAY['video', 'slide', 'trình chiếu', 'video đám cưới', 'video chạy ảnh', 'phát hôm cưới'],
  'H2O_CHAT_0003', true, 0
),

-- FAQ: Thuê váy đi bàn thêm ngoài combo
(gen_random_uuid()::text,
  'Thuê thêm váy đi bàn ngoài combo giá bao nhiêu?',
  E'Nếu vợ chồng em đã sử dụng dịch vụ bên chị thì được ưu tiên giảm **50%** tất cả các dòng váy nha em!\n\n💗 Ví dụ:\n• Váy dòng 1.500.000đ → còn **750.000đ**\n• Váy dòng 3.000.000đ → còn **1.500.000đ**\n\nBên chị có các dòng váy từ thiết kế đến cao cấp, từ 1tr5 trở lên, tới 6-7tr, thậm chí 30tr bên chị đều có em nha. Ở cửa hàng còn hơn **300 mẫu** — váy cá tính, váy ngắn, váy nhẹ nhàng đều có nè!\n\nEm thích phong cách váy như nào chị tư vấn thêm cho em nha 👗',
  'service',
  ARRAY['váy đi bàn', 'thuê thêm váy', 'giảm 50%', 'ngoài combo', 'phụ thu váy', '300 mẫu'],
  'H2O_CHAT_0003', true, 0
),

-- FAQ: Áo bê lễ thuê được không
(gen_random_uuid()::text,
  'H2O có cho thuê áo bê lễ không?',
  E'Có nha em! Bên chị cho thuê áo bê lễ đó bé.\n\n👘 Giá thuê: **100.000đ/áo**\n🎁 Nếu đã sử dụng dịch vụ bên chị: giảm **50%** → chỉ còn **50.000đ/áo** thôi nè!\n\nThường thì bên mình thấy thuê các bạn bê lễ là các bạn đã có đồ rồi. Nhưng nếu cần thuê thêm bên chị vẫn có sẵn nha em.',
  'service',
  ARRAY['áo bê lễ', 'bê tráp', 'thuê áo', 'áo bê', '100k', 'bê lễ'],
  'H2O_CHAT_0003', true, 0
),

-- FAQ: Test makeup trước ngày cưới
(gen_random_uuid()::text,
  'Có thể test makeup trước ngày cưới không? Giá bao nhiêu?',
  E'Được nha em! Bên chị có nhận test makeup cho cô dâu.\n\n💄 **Test makeup = makeup đủ bước như cô dâu thật** — không phải test sơ sài, makeup kỹ chi tiết cẩn thận nha em.\n\n💰 Chi phí: **1.000.000đ/lần** (gói chuyên viên)\n📅 Book lịch: cọc trước **300.000đ** để bên chị note lịch và xếp chuyên viên cho em\n\n🌟 Lưu ý từ chị: Cô dâu đến với H2O thường không cần makeup test vì chuyên viên luôn làm ra layout trẻ trung, baby, không bị già — cô dâu nào cũng ưng ý! Nhưng nếu em vẫn muốn test bên chị nhận như báo giá trên nha bé 💕',
  'service',
  ARRAY['test makeup', 'thử makeup', 'makeup test', '1 triệu', 'test trước', 'cọc 300k', 'giữ lịch'],
  'H2O_CHAT_0004', true, 0
),

-- FAQ: Bảng giá makeup cô dâu ngày cưới
(gen_random_uuid()::text,
  'Bảng giá makeup cô dâu tại Thuỷ H2O như thế nào?',
  E'💄 BẢNG GIÁ MAKEUP CÔ DÂU TẠI THUỶ H2O MAKEUP:\n\n**Gói 1 — Chuyên viên: 2.000.000đ**\n*(Ưu đãi còn 1.000.000đ)*\n• Makeup cô dâu + làm tóc hoàn chỉnh\n• Hỗ trợ makeup body, thay đồ\n• Mượn phụ kiện miễn phí\n• Tặng voucher giảm 50% thuê váy & vest\n\n**Gói 2 — Lan Nguyễn H2O: 3.000.000đ**\n*(Ưu đãi còn 1.750.000đ)*\n• Makeup bởi Lan Nguyễn H2O + chuyên gia tóc\n• Tặng 1 lần makeup mẹ (500k)\n❌ Chỉ nhận tại cửa hàng\n\n**Gói 3 — Thuỷ H2O: 10.000.000đ**\n*(Ưu đãi còn 6.000.000đ)*\n• Makeup bởi Thuỷ H2O\n• Tặng 1 lần makeup mẹ (500k)\n❌ Chỉ nhận tại cửa hàng\n\n📍 Địa chỉ: ThuyH2O Makeup - Đại Bản - Hồng Bàng - HP\n📞 SĐT: 0783 327 323',
  'pricing',
  ARRAY['bảng giá makeup', 'giá makeup', 'makeup cô dâu', 'thuỷ h2o makeup', 'lan nguyễn', 'gói makeup', '2 triệu', '3 triệu', '10 triệu'],
  'H2O_CHAT_0004', true, 0
),

-- FAQ: H2O có quay chụp đám cưới không
(gen_random_uuid()::text,
  'H2O có dịch vụ quay chụp ngày ăn hỏi và tiệc cưới không?',
  E'Có nha em! Bên chị cũng có dịch vụ quay chụp ngày ăn hỏi và tiệc cưới cho dâu rể đó bé.\n\n📸 Quay chụp ngày ăn hỏi\n🎬 Quay chụp ngày tiệc cưới\n\nEm muốn tư vấn thêm về dịch vụ này nhắn chị nha, chị tư vấn chi tiết báo giá cụ thể cho vợ chồng em! 😊',
  'service',
  ARRAY['quay phim', 'chụp hình đám cưới', 'quay chụp', 'ăn hỏi', 'tiệc cưới', 'phóng viên ảnh', 'videographer'],
  'H2O_CHAT_0003', true, 0
),

-- FAQ: Chụp sớm bao lâu trước ngày cưới
(gen_random_uuid()::text,
  'Nên chụp ảnh cưới trước ngày cưới bao lâu?',
  E'Chụp sớm khoảng **2 tháng** trước ngày cưới là đẹp nhất em nè!\n\nLý do:\n✅ Vừa có thời gian chọn ảnh từ từ\n✅ Vừa có thời gian duyệt ảnh chỉnh sửa kỹ\n✅ Không bị gấp, thoải mái lựa chọn\n\nChụp studio thì lúc nào cũng thoải mái, không phụ thuộc thời tiết nên em hoàn toàn chủ động lịch nha bé!\n\nDâu rể bên chị tháng 9, 10, 11 cưới là giờ cũng đang lên lịch chụp nhiều rồi — em nên sắp xếp sớm để giữ được ngày đẹp nha! 📅',
  'service',
  ARRAY['chụp sớm', 'bao lâu trước', 'lịch chụp', '2 tháng', 'nên chụp lúc nào', 'thời điểm chụp'],
  'H2O_CHAT_0002', true, 0
),

-- FAQ: Địa chỉ H2O Studio ở đâu
(gen_random_uuid()::text,
  'H2O Studio ở đâu? Địa chỉ và số điện thoại?',
  E'📍 **H2O Studio**\nGần UBND Đại Bản – An Dương – Hải Phòng\n\n🗺 Google Maps: https://goo.gl/maps/Q47yh5ttRTKDnArv8\n\n📞 Mrs. Thuỷ H2O:\n• 0783 327 323\n• 0399 558 699\n\nEm ở đâu chị tư vấn đường đi cho em nha! Studio rộng 900m² có chỗ đỗ xe thoải mái em nè 😊',
  'general',
  ARRAY['địa chỉ', 'ở đâu', 'vị trí', 'google maps', 'số điện thoại', 'hotline', 'an dương', 'hải phòng', 'đường đi'],
  'H2O_CHAT_0004', true, 0
);

-- ============================================================
-- BƯỚC 2: INSERT SCRIPTS MỚI — order_num tiếp từ 114
-- ============================================================
INSERT INTO sale_scripts (id, phase, title, content, tags, enabled, order_num) VALUES

-- DISCOVERY: Hỏi vck ở đâu + bao giờ chụp
(gen_random_uuid()::text,
  'discovery', 'Khai thác địa điểm + thời gian chụp',
  E'Vợ chồng em ở đâu em nhỉ?\n\nVợ chồng em dự định bao giờ chụp chưa nè?',
  ARRAY['khai thác', 'ở đâu', 'bao giờ chụp', 'địa điểm', 'lịch chụp'], true, 114
),

-- DISCOVERY: Tư vấn chụp sớm 2 tháng trước cưới
(gen_random_uuid()::text,
  'discovery', 'Tư vấn thời điểm chụp — 2 tháng trước là đẹp nhất',
  E'Chụp sớm khoảng 2 tháng là đẹp nhất em nè.\n\nVừa có thời gian chọn ảnh.\nVừa có thời gian duyệt ảnh.\n\nChụp studio thì lúc nào cũng thoải mái em ạ.',
  ARRAY['chụp sớm', '2 tháng', 'thời gian', 'urgency', 'lịch cưới'], true, 115
),

-- VALUE_PROP: Giới thiệu combo 9999 — đầy đủ cho 2 ngày
(gen_random_uuid()::text,
  'value_prop', 'Giới thiệu combo 9999 đầy đủ cho 2 ngày cưới hỏi',
  E'Chị thấy bao giờ theo combo cũng tiết kiệm hơn em ạ.\n\nNếu vợ chồng em muốn có cả dịch vụ ngày đám hỏi và đám cưới thì em có thể tham khảo combo 9999 nhé.\n\nChị thấy dâu rể bên chị lựa chọn combo 9999 rất nhiều.\n\nVì đã đầy đủ:\n• Ảnh cưới (2 concept)\n• Áo dài đôi\n• Váy cưới\n• Vest\n• Trang điểm 2 lần (đám hỏi + đám cưới)\n• Ảnh phóng + ảnh bàn',
  ARRAY['combo 9999', 'trọn gói', 'đám hỏi', 'đám cưới', '2 ngày', 'áo dài', 'tiết kiệm'], true, 116
),

-- VALUE_PROP: Đăng ký sớm bảo lưu đến khi dùng
(gen_random_uuid()::text,
  'value_prop', 'Xử lý lo ngại — đăng ký sớm có bảo lưu không',
  E'Em đăng ký trong thời gian này bên chị vẫn áp dụng dịch vụ cho vợ chồng em đến khi sử dụng nha bé.\n\nKể cả em đăng ký bây giờ mà sang năm mới cưới bên chị vẫn hỗ trợ theo combo.\n\nNên em yên tâm nhé.',
  ARRAY['bảo lưu', 'đăng ký sớm', 'lo ngại', 'sang năm', 'yên tâm'], true, 117
),

-- OFFER: Upsell từ combo 9999 lên 12999
(gen_random_uuid()::text,
  'offer', 'Upsell combo 9999 lên 12999 khi khách muốn thêm concept',
  E'Nếu em muốn đa dạng concept và phong cách chụp hơn em có thể tham khảo combo 12999 em nè.\n\nCombo này sẽ chụp 3 concept tại studio, sản phẩm ảnh vợ chồng em cũng sẽ được nhận nhiều hơn và váy ngày cưới cũng là dòng cao cấp hơn em nè.\n\nNhư combo 9999 vợ chồng em chụp 2 đồ có ảnh phóng và ảnh bàn, váy ngày cưới giá 3tr5.\nCòn combo 12999 vợ chồng em chụp 3 đồ vừa có ảnh phóng ảnh để bàn và có cả ảnh treo tường nữa em nè. Và váy ngày cưới cao cấp giá 6tr em nha.\n\nTính ra gói 12999 chênh không nhiều so với gói 9999 mà vợ chồng em được nhiều thứ hơn em nè.',
  ARRAY['upsell', '12999', '9999', '3 concept', 'ảnh treo tường', 'váy cao cấp', 'so sánh gói'], true, 118
),

-- OFFER: Thuê thêm váy ngoài combo
(gen_random_uuid()::text,
  'offer', 'Tư vấn thuê thêm váy ngoài combo — giảm 50%',
  E'Nếu dâu rể đã sử dụng dịch vụ bên chị, chị ưu tiên tất cả các dòng đều được giảm 50% em nhé.\n\nVí dụ em chọn dòng 1tr5 giảm còn 750k thui em nha.\n\nBên chị có các dòng váy từ thiết kế đến cao cấp, các dòng sẽ từ 1tr5 bé nè. Tới bao nhiêu cũng có bé nè — 6, 7, 8, đến 30tr bên chị đều có em nha.\n\nỞ cửa hàng còn hơn 300 mẫu và cả kiểu váy cá tính, váy ngắn nữa em nè.',
  ARRAY['thuê thêm váy', 'váy ngoài combo', 'giảm 50%', '300 mẫu', 'váy đi bàn', 'phụ thu'], true, 119
),

-- VALUE_PROP: Tư vấn makeup về nhà
(gen_random_uuid()::text,
  'value_prop', 'Giải đáp makeup về nhà — phụ phí 500k/lần',
  E'Như trong combo sẽ là makeup tại cửa hàng. Nếu em muốn book makeup về nhà bên chị có chuyên viên về nhà cho em nha.\n\nVề nhà thì sẽ thêm phí 500k/lần em nha.\n\nEm thanh toán luôn qua bên chị, bên chị sẽ sắp xếp chuyên viên cho em nha.',
  ARRAY['makeup về nhà', 'chuyên viên về nhà', '500k', 'phụ phí di lại', 'ngày ăn hỏi'], true, 120
),

-- VALUE_PROP: Reassure chất lượng chuyên viên
(gen_random_uuid()::text,
  'value_prop', 'Reassure chất lượng chuyên viên makeup H2O',
  E'Chuyên viên bên chị đều là các bạn đã làm cho rất nhiều cô dâu ưng ý, hiện tại đang là giảng viên tại học viện và có chứng chỉ của nhà nước cấp nên em yên tâm về phần chuyên viên nha.\n\nNếu em thích tone makeup nào có thể nói với chuyên viên, chuyên viên sẽ tư vấn kỹ về khuôn mặt của em và làm phù hợp với em nhất nhé.\n\nTone nào chuyên viên cũng có thể làm được nên em cứ trao đổi với chị trước nha bé.\n\nChị hiểu tâm lý các cô dâu — ai cũng muốn thật xinh đẹp vì ngày trọng đại chỉ có 1 lần trong đời thui nè.',
  ARRAY['chuyên viên', 'chất lượng makeup', 'giảng viên', 'chứng chỉ', 'tone makeup', 'yên tâm'], true, 121
),

-- OFFER: Giới thiệu dịch vụ video slide đám cưới
(gen_random_uuid()::text,
  'offer', 'Giới thiệu dịch vụ video slide trình chiếu đám cưới',
  E'Bên chị cũng có làm cho dâu rể video slide trình chiếu ngày đám cưới đó bé.\n\nVợ chồng em muốn làm bên chị hỗ trợ làm cho vợ chồng em nha.\n\nVợ chồng em đăng ký thì không phát sinh thêm chi phí nào nha bé!',
  ARRAY['video slide', 'trình chiếu', 'video đám cưới', 'video chạy ảnh', 'dịch vụ thêm'], true, 122
),

-- CLOSING: Xử lý khi khách đang cân nhắc, mời qua xem trực tiếp
(gen_random_uuid()::text,
  'closing', 'Mời khách qua xem trực tiếp — gửi định vị',
  E'Hôm nào vợ chồng em qua chị được nè!\n\nĐể bên chị sắp xếp chờ em nha.\n\n📍 H2O Studio - Gần UBND Đại Bản - An Dương - Hải Phòng\n📞 Ms. Thuỷ H2O: 0783 327 323 / 0399 558 699\n\n[GỬI ĐỊNH VỊ STUDIO]',
  ARRAY['mời qua xem', 'đến cửa hàng', 'xem trực tiếp', 'thử váy', 'định vị', 'địa chỉ'], true, 123
),

-- FOLLOWUP: Xử lý khách im lặng sau tư vấn
(gen_random_uuid()::text,
  'followup', 'Follow up khách im lặng — hỏi thêm cần tư vấn gì',
  E'Vck em xem cần tư vấn phần nào chị tư vấn thêm cho 2 vck nè.\n\nCô dâu băn khoăn chỗ nào cứ nhắn chị, thậm chí đêm chị vẫn tư vấn cho em được nè.\n\nĐiều quan trọng nhất là vợ chồng em tìm được nơi đồng hành có tâm, nhiệt tình trong ngày quan trọng nhất nè.',
  ARRAY['follow up', 'khách im lặng', 'tư vấn thêm', 'cần hỗ trợ', 'hỏi thêm', 'câu hỏi'], true, 124
);

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================
SELECT
  'customer_faqs' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN source LIKE 'H2O_CHAT_%' THEN 1 END) as from_real_chat
FROM customer_faqs
UNION ALL
SELECT
  'sale_scripts' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN order_num >= 100 THEN 1 END) as from_real_chat
FROM sale_scripts;
