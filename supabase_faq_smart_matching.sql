-- H2O Bot AI — Cập nhật Smart Matching cho 41 FAQ thực tế
-- Chạy trong Supabase SQL Editor
-- keywords     : từ khóa bot dùng để nhận diện câu hỏi (càng cụ thể càng tốt)
-- next_question: câu dẫn bot tự hỏi lại sau khi trả lời (giữ khách hàng tiếp tục chat)
-- lead_score   : 0-100 mức độ sẵn sàng mua (cao = gần chốt)
-- service_type : anh_cuoi | vay_cuoi | makeup | ao_dai | quay_phim | null

-- ─── NHÓM: KHỞI ĐẦU / CONCEPT ─────────────────────────────────────────────────

UPDATE customer_faqs SET
  keywords     = ARRAY['concept','ảnh mẫu','xem ảnh','kiểu chụp','theme','phong cách','mẫu ảnh'],
  next_question = 'Vợ chồng em thích phong cách chụp nhẹ nhàng hay sang trọng hơn ạ? 😊',
  lead_score   = 10,
  service_type  = 'anh_cuoi'
WHERE id = '81f73bbe-586e-4e4a-9c7c-c7ae1d3057f4';
-- "bên mình có những concept nào ạ"

UPDATE customer_faqs SET
  keywords     = ARRAY['concept đa dạng','concept phong phú','có nhiều concept','bao nhiêu concept','xem concept','900m2'],
  next_question = 'Vợ chồng em thích concept nào: Hàn Quốc, cổ điển hay nhẹ nhàng ạ? Chị gửi ảnh mẫu để em tham khảo nha 📸',
  lead_score   = 20,
  service_type  = 'anh_cuoi'
WHERE id = 'dcab6511-c171-476b-9b3c-19198d03bfec';
-- "Studio có concept đa dạng không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['tự chọn concept','concept cố định','bị ép concept','thoải mái chọn','combo 9999 concept'],
  next_question = 'Vợ chồng em thích concept nào nhất ạ? Chị gửi ảnh mẫu để em tham khảo trước nha! 🎨',
  lead_score   = 55,
  service_type  = 'anh_cuoi'
WHERE id = '9cb66d30-8955-4a93-8192-9775b6426b9e';
-- "Combo 9999 có tự chọn concept không?"

-- ─── NHÓM: CHẤT LƯỢNG / TIN TƯỞNG ────────────────────────────────────────────

UPDATE customer_faqs SET
  keywords     = ARRAY['review','feedback','đánh giá','khách hàng nói gì','chất lượng thế nào','có tốt không','nhận xét'],
  next_question = 'Vợ chồng em muốn xem thêm ảnh thực tế từ khách H2O không ạ? Chị gửi album cho em tham khảo nha! ❤️',
  lead_score   = 20,
  service_type  = 'anh_cuoi'
WHERE id = 'b511210a-6e61-4cd7-a0fb-efba1883859d';
-- "Khách hàng nói gì về H2O Studio?"

UPDATE customer_faqs SET
  keywords     = ARRAY['makeup có đẹp không','chuyên viên giỏi không','makeup chất lượng','trang điểm đẹp không','tin tưởng makeup','chuyên viên makeup'],
  next_question = 'Vợ chồng em có muốn xem ảnh makeup thực tế của bên chị không? Ekip rất tỉ mỉ em nha! Vợ chồng em đã có combo chưa ạ? 💄',
  lead_score   = 25,
  service_type  = 'anh_cuoi'
WHERE id = 'b1bf558f-5af7-4766-bc98-a719666beb20';
-- "Makeup cô dâu có đẹp không, chuyên viên có giỏi không?"

-- ─── NHÓM: DỊCH VỤ / TÍNH NĂNG ────────────────────────────────────────────────

UPDATE customer_faqs SET
  keywords     = ARRAY['tự chọn tóc','tự chọn makeup','tone makeup','kiểu tóc','chọn tone','chọn kiểu tóc'],
  next_question = 'Em có ảnh mẫu tóc/makeup nào muốn tham khảo không? Gửi chị xem để tư vấn nha! 💄',
  lead_score   = 25,
  service_type  = 'anh_cuoi'
WHERE id = '5058c8c5-d18a-4ff7-ab5c-70a40502253d';
-- "Được tự chọn kiểu tóc và tone makeup không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['mất bao lâu','chụp lâu không','thời gian chụp','bao lâu chụp xong','chụp mấy tiếng','chụp studio lâu không'],
  next_question = 'Vợ chồng em có ngày cưới chưa ạ? Để chị tư vấn lịch chụp phù hợp nha 📅',
  lead_score   = 30,
  service_type  = 'anh_cuoi'
WHERE id = '5231582c-261b-4312-84ac-2061d9ed5c04';
-- "Chụp studio mất khoảng bao lâu?"

UPDATE customer_faqs SET
  keywords     = ARRAY['có váy không','tự chọn váy','kho váy','váy studio','thuê váy chụp','mặc váy chụp','váy cô dâu'],
  next_question = 'Cô dâu em mặc size mấy ạ? Chị tư vấn dòng váy phù hợp nhất cho em nha 👗',
  lead_score   = 35,
  service_type  = 'vay_cuoi'
WHERE id = '0e97dcad-3d06-4fa6-8cfe-a343883b7d87';
-- "Studio có váy để mặc khi chụp không, được tự chọn không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['makeup về nhà','chuyên viên về nhà','đến tận nhà','phụ phí về nhà','tại nhà','makeup di chuyển'],
  next_question = 'Nhà em ở khu nào ạ? Chị tư vấn phụ phí và sắp xếp chuyên viên phù hợp nha 💄',
  lead_score   = 45,
  service_type  = 'makeup'
WHERE id = 'c1a9a3a1-436a-4008-bcf4-3845003d2a4f';
-- "Makeup về nhà được không? Chi phí thêm bao nhiêu?"

UPDATE customer_faqs SET
  keywords     = ARRAY['video slide','trình chiếu','video đám cưới','video chạy ảnh','clip cưới','video ngày cưới','slide ảnh cưới'],
  next_question = 'Em đã có combo bên chị chưa ạ? Nếu có combo thì dịch vụ video slide không phát sinh thêm phí nha! 🎬',
  lead_score   = 40,
  service_type  = 'quay_phim'
WHERE id = '5b0ab19e-6424-43bf-9c01-a04630c083a2';
-- "H2O có làm video slide trình chiếu ngày đám cưới không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['quay chụp ngày cưới','quay phim đám cưới','chụp hình đám cưới','quay ăn hỏi','quay tiệc cưới','phóng viên ảnh'],
  next_question = 'Vợ chồng em cần quay chụp cả 2 ngày hay chỉ 1 ngày ạ? Chị tư vấn báo giá cụ thể nha 🎬',
  lead_score   = 45,
  service_type  = 'quay_phim'
WHERE id = '05916af9-8b29-43aa-9649-1c816c492bbb';
-- "H2O có dịch vụ quay chụp ngày ăn hỏi và tiệc cưới không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['chụp sớm bao lâu','chụp trước bao lâu','nên chụp lúc nào','thời điểm chụp','lên lịch chụp','chụp trước ngày cưới'],
  next_question = 'Vợ chồng em cưới tháng mấy ạ? Để chị tư vấn ngày chụp đẹp và phù hợp nhất nha 📅',
  lead_score   = 30,
  service_type  = 'anh_cuoi'
WHERE id = '5c8ce75f-523a-4654-b38a-91c7bd57c78c';
-- "Nên chụp ảnh cưới trước ngày cưới bao lâu?"

UPDATE customer_faqs SET
  keywords     = ARRAY['thuê thêm váy','váy đi bàn','váy ngoài combo','giá thuê thêm váy','phụ thu váy thêm','300 mẫu váy'],
  next_question = 'Cô dâu em thích phong cách váy đi bàn như thế nào: nhẹ nhàng hay cá tính ạ? Chị tư vấn thêm nha 👗',
  lead_score   = 55,
  service_type  = 'vay_cuoi'
WHERE id = '2dacbaba-a237-46ae-982f-8b1b1b8b4df1';
-- "Thuê thêm váy đi bàn ngoài combo giá bao nhiêu?"

UPDATE customer_faqs SET
  keywords     = ARRAY['áo bê lễ','bê tráp','thuê áo bê','trang phục bê lễ','100k','cho thuê áo bê'],
  next_question = 'Vợ chồng em có bao nhiêu bạn bê lễ ạ? Chị tư vấn thuê số lượng phù hợp nha 👘',
  lead_score   = 35,
  service_type  = 'anh_cuoi'
WHERE id = '5ff53a73-5dce-4151-96c3-fb05180de1e2';
-- "H2O có cho thuê áo bê lễ không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['test makeup','thử makeup','makeup thử','makeup test','1 triệu','thử trước','cọc 300k'],
  next_question = 'Em muốn book lịch test makeup không ạ? Cọc trước 300k để giữ slot cho em nha 💄',
  lead_score   = 50,
  service_type  = 'makeup'
WHERE id = '5645124c-b2b5-4285-ae39-7492bd8b601b';
-- "Có thể test makeup trước ngày cưới không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['tóc ngắn','cô dâu tóc ngắn','tóc ngắn đẹp không','mái ngắn','tóc bob cô dâu','kẹp phím'],
  next_question = 'Cô dâu em tóc ngắn đến đâu ạ? Chị tư vấn cách xử lý tóc ra ảnh đẹp nhất nha ✨',
  lead_score   = 25,
  service_type  = 'anh_cuoi'
WHERE id = 'da7c0ebc-10da-489d-94fa-5568dcd94f09';
-- "Cô dâu tóc ngắn chụp ảnh cưới có ổn không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['tóc chú rể','làm tóc nam','tóc đàn ông','chú rể tóc','chỉnh tóc nam','làm tóc chú rể','kiểu tóc chú rể'],
  next_question = 'Chú rể em muốn kiểu tóc như thế nào ạ? Chị tư vấn chuẩn bị trước ngày chụp nha 😊',
  lead_score   = 25,
  service_type  = 'anh_cuoi'
WHERE id = '6854a642-db6d-43c4-baf8-67d5d8d75169';
-- "Tóc chú rể tại H2O làm được gì?"

UPDATE customer_faqs SET
  keywords     = ARRAY['váy bigsize','váy cỡ lớn','váy người mập','big size','cân nặng mặc váy','váy size to','120kg'],
  next_question = 'Cô dâu em nặng khoảng bao nhiêu ạ? Chị tư vấn dòng váy đẹp và tôn dáng nhất cho em nha 👗',
  lead_score   = 40,
  service_type  = 'vay_cuoi'
WHERE id = '1f041eec-e662-4fa9-aef8-d324ead3aecd';
-- "H2O có váy bigsize không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['chuẩn bị gì','mang theo gì','checklist chụp','cần gì khi chụp','chuẩn bị chụp ảnh cưới'],
  next_question = 'Vợ chồng em chụp ngày nào ạ? Nếu có gì cần hỏi thêm trước ngày chụp cứ nhắn chị nha! 🌸',
  lead_score   = 75,
  service_type  = 'anh_cuoi'
WHERE id = '1f6b14c2-ce99-4fb0-b6f9-24a29b55ae23';
-- "Cần chuẩn bị gì trước khi đến chụp ảnh cưới?"

UPDATE customer_faqs SET
  keywords     = ARRAY['đến sớm mấy tiếng','mấy tiếng makeup','makeup mấy giờ','cần mấy tiếng makeup','cần đến lúc nào makeup'],
  next_question = 'Tiệc cưới của em mấy giờ ạ? Để chị tính giờ đến makeup chuẩn cho em nha 💄',
  lead_score   = 65,
  service_type  = 'makeup'
WHERE id = '0e8223c3-fabc-4acb-8037-8e1fb088c427';
-- "Makeup ngày cưới cần đến sớm mấy tiếng?"

-- ─── NHÓM: GIÁ / COMBO ─────────────────────────────────────────────────────────

UPDATE customer_faqs SET
  keywords     = ARRAY['tư vấn ảnh cưới','chụp trong studio','ảnh cưới studio','gói studio','bảng giá studio'],
  next_question = 'Vợ chồng em muốn chụp mấy concept và có nhu cầu thuê váy ngày cưới không ạ? Chị tư vấn gói phù hợp nhất nha 😊',
  lead_score   = 60,
  service_type  = 'anh_cuoi'
WHERE id = '01285051-6ac0-426f-bcf0-969f64bad061';
-- "Chụp studio có những gói nào, giá bao nhiêu?" — keywords ngắn gọn để tỷ lệ match cao hơn

UPDATE customer_faqs SET
  keywords     = ARRAY['combo 9999','gói 9999','gói 10 triệu','combo trọn gói','9999 gồm gì','9 triệu 9','9tr9'],
  next_question = 'Vợ chồng em đang so sánh gói nào không ạ? Chị tư vấn thêm để em chọn gói phù hợp nhất nha 😊',
  lead_score   = 65,
  service_type  = 'anh_cuoi'
WHERE id = 'ce9fffe6-e0e8-4a2e-b986-72b946ca400a';
-- "Combo 9999 gồm những gì?"

UPDATE customer_faqs SET
  keywords     = ARRAY['combo 12999','gói 13 triệu','so sánh combo','12999 khác gì','gói nào tốt hơn','chọn gói nào','3 concept'],
  next_question = 'Vợ chồng em muốn chụp mấy concept ạ? Nếu muốn 3 concept thì combo 12999 xứng đáng hơn — chị tư vấn thêm nha! 📸',
  lead_score   = 65,
  service_type  = 'anh_cuoi'
WHERE id = 'feb71351-6be1-41ea-961d-64d28b4cd89d';
-- "Combo 12999 khác gì combo 9999?"

UPDATE customer_faqs SET
  keywords     = ARRAY['gói 3999','combo 4 triệu','gói rẻ','gói tinh giản','gói nhỏ','4 triệu chụp gì','3999 gồm gì'],
  next_question = 'Vợ chồng em muốn 1 concept hay 2 concept ạ? Combo 4999 và 6999 cũng đáng tham khảo em nha 😊',
  lead_score   = 55,
  service_type  = 'anh_cuoi'
WHERE id = 'dedddf9f-f699-4f87-a449-45df38e99baf';
-- "Gói 3.999 bao gồm những gì?"

UPDATE customer_faqs SET
  keywords     = ARRAY['ưu đãi 48h','khuyến mãi 48h','quà tặng khi book','voucher','giảm giá book online','ưu đãi khi đăng ký','48h tặng gì'],
  next_question = 'Vợ chồng em muốn giữ ưu đãi không ạ? Hôm nay còn slot đẹp cuối tuần đó em! Nhắn chị note lịch ngay nha 🌸',
  lead_score   = 65,
  service_type  = 'anh_cuoi'
WHERE id = '06edd32d-6fa0-44bd-addf-bfb4bf76da11';
-- "Ưu đãi 48h gồm những gì?"

UPDATE customer_faqs SET
  keywords     = ARRAY['bảng giá makeup','giá makeup cô dâu','makeup bao nhiêu tiền','giá trang điểm','thuỷ h2o makeup giá','gói makeup'],
  next_question = 'Vợ chồng em cưới ngày nào ạ? Chị tư vấn gói makeup phù hợp nhất và check slot cho em nha 💄',
  lead_score   = 60,
  service_type  = 'makeup'
WHERE id = 'bffd876f-285e-48ac-ae53-99a27936803f';
-- "Bảng giá makeup cô dâu tại Thuỷ H2O như thế nào?"

UPDATE customer_faqs SET
  keywords     = ARRAY['combo ngoại cảnh','giá chụp ngoại cảnh','ngoại cảnh bao nhiêu','15 triệu','combo studio ngoại cảnh','chụp ngoại cảnh giá'],
  next_question = 'Vợ chồng em muốn kết hợp bao nhiêu concept studio và ngoại cảnh ạ? Chị tư vấn combo cụ thể nha 🌿',
  lead_score   = 60,
  service_type  = 'anh_cuoi'
WHERE id = 'a9030b78-5ccd-4e1c-821c-0c742d2072ee';
-- "Combo ngoại cảnh giá bao nhiêu?"

UPDATE customer_faqs SET
  keywords     = ARRAY['thuê áo dài','giá áo dài','áo dài bao nhiêu','thuê áo dài cặp','áo dài ăn hỏi','giá áo dài đôi'],
  next_question = 'Vợ chồng em đã có combo bên chị chưa ạ? Có combo giảm 50% còn 1 triệu/cặp em nha 😍',
  lead_score   = 45,
  service_type  = 'ao_dai'
WHERE id = 'e417c3e2-b828-4ee4-8a23-ede5ce7060f7';
-- "Áo dài thuê bên H2O giá bao nhiêu?"

-- ─── NHÓM: ĐẶT LỊCH / THANH TOÁN ─────────────────────────────────────────────

UPDATE customer_faqs SET
  keywords     = ARRAY['đặt cọc bao nhiêu','cọc bao nhiêu tiền','giữ lịch bao nhiêu','cọc mấy tiền','phí cọc','cọc 1 triệu'],
  next_question = 'Vợ chồng em muốn đặt lịch ngày nào ạ? Chị check slot và confirm cho em ngay nha! 🎉',
  lead_score   = 80,
  service_type  = 'anh_cuoi'
WHERE id = 'fcfcdf00-57a6-463e-b421-9b03675b8b24';
-- "Đặt cọc bao nhiêu để giữ lịch?"

UPDATE customer_faqs SET
  keywords     = ARRAY['số tài khoản','chuyển khoản đến đâu','stk ngân hàng','mb bank h2o','vietcombank h2o','tài khoản h2o'],
  next_question = 'Em chuyển khoản xong nhắn chị ảnh màn hình nhé, chị confirm ngay và giữ lịch cho em! 💳',
  lead_score   = 95,
  service_type  = 'anh_cuoi'
WHERE id = 'ec2fbda2-d1b8-4b1f-ae11-bcfe85afd580';
-- "Số tài khoản chuyển khoản của H2O Studio là gì?"

UPDATE customer_faqs SET
  keywords     = ARRAY['cọc tiền mặt','đặt cọc tiền mặt','thanh toán tiền mặt','trả tiền mặt','không chuyển khoản','tiền mặt được không'],
  next_question = 'Vợ chồng em có thể ghé studio để cọc trực tiếp không ạ? Chị note lịch và ưu đãi cho em ngay nha! 💵',
  lead_score   = 85,
  service_type  = 'anh_cuoi'
WHERE id = '7162453d-b7f3-499d-8d1b-c4d58ccad248';
-- "Có thể đặt cọc bằng tiền mặt không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['đổi lịch','hủy lịch','dời ngày','thay đổi lịch','hoàn cọc','không chụp được','hủy cọc'],
  next_question = 'Vợ chồng em lo lắng về lịch không ạ? Cứ báo sớm 2-3 ngày là chị sắp xếp được cho em nha 📅',
  lead_score   = 50,
  service_type  = 'anh_cuoi'
WHERE id = '3354df9a-390c-4de9-9eb9-a7a9c584244e';
-- "Sau khi đặt cọc có thể đổi lịch hoặc huỷ không?"

UPDATE customer_faqs SET
  keywords     = ARRAY['đăng ký sớm','chưa dùng ngay','bảo lưu','sang năm mới cưới','giữ ưu đãi trước','đặt trước chưa cưới'],
  next_question = 'Vợ chồng em dự kiến cưới năm nào ạ? Cứ đăng ký trước để giữ ưu đãi — bên chị bảo lưu đến ngày sử dụng nha! 🌸',
  lead_score   = 70,
  service_type  = 'anh_cuoi'
WHERE id = '46ee0a45-ce04-4d9b-969a-9b2ff2529e29';
-- "Đăng ký sớm nhưng chưa dùng ngay có được không?"

-- ─── NHÓM: NHẬN ẢNH / THỜI GIAN GIAO HÀNG ─────────────────────────────────────

UPDATE customer_faqs SET
  keywords     = ARRAY['bao lâu có ảnh','nhận ảnh bao lâu','thời gian trả ảnh','khi nào có ảnh','mấy tuần có ảnh'],
  next_question = 'Vợ chồng em đã đặt lịch chụp chưa ạ? Nếu cần gấp chị ưu tiên cho em nha 🌸',
  lead_score   = 30,
  service_type  = 'anh_cuoi'
WHERE id = 'ce36595d-8332-4a10-8016-116c1b1b4ddf';
-- "Sau khi chụp bao lâu thì nhận được ảnh?"

UPDATE customer_faqs SET
  keywords     = ARRAY['file ảnh gốc','nhận ảnh gốc','khi nào có ảnh gốc','hôm sau nhận ảnh','ảnh gốc bao lâu'],
  next_question = 'Vợ chồng em cưới ngày nào để chị ưu tiên xử lý ảnh cho em nhé? 💕',
  lead_score   = 30,
  service_type  = 'anh_cuoi'
WHERE id = '936eda11-45cf-49da-93d7-e0ed395064b6';
-- "File ảnh gốc nhận được khi nào?"

UPDATE customer_faqs SET
  keywords     = ARRAY['chụp hà nội','ảnh hà nội bao lâu','thời gian nhận ảnh hà nội','lên hà nội chụp','h2o hà nội'],
  next_question = 'Vợ chồng em ở Hà Nội hay lên Hải Phòng chụp ạ? Chị tư vấn chi tiết hơn nha 📸',
  lead_score   = 35,
  service_type  = 'anh_cuoi'
WHERE id = '4f5c84a0-b0a3-4cb5-a8fc-93f9ae986f9a';
-- "Chụp ở Hà Nội thì bao lâu có ảnh?"

UPDATE customer_faqs SET
  keywords     = ARRAY['in ảnh bao lâu','album mấy ngày','ảnh phóng mấy ngày','thời gian in ảnh','nhận album','in ảnh cưới'],
  next_question = 'Vợ chồng em cần nhận ảnh trước ngày mấy ạ? Chị lên kế hoạch ưu tiên cho em nha 🖼️',
  lead_score   = 70,
  service_type  = 'anh_cuoi'
WHERE id = '8fea1478-7139-42ab-ba85-7782f06ecde5';
-- "In ảnh (album/ảnh phóng) mất bao lâu?"

-- ─── NHÓM: ĐỊA CHỈ / LOGISTICS ─────────────────────────────────────────────────

UPDATE customer_faqs SET
  keywords     = ARRAY['địa chỉ studio','ở đâu','vị trí h2o','đường đến','google maps','hotline h2o','số điện thoại h2o','hải phòng'],
  next_question = 'Em ở khu nào ạ? Chị hướng dẫn đường đến studio cho em nha, studio rộng dễ tìm lắm 😊',
  lead_score   = 15,
  service_type  = NULL
WHERE id = 'ad51c04e-7854-4c24-9fd9-454cd07410a1';
-- "H2O Studio ở đâu? Địa chỉ và số điện thoại?"

UPDATE customer_faqs SET
  keywords     = ARRAY['khách tỉnh xa','ở xa có chụp được không','tỉnh xa','thanh hóa','nghệ an','gửi đồ về tỉnh','dâu ở xa'],
  next_question = 'Em ở tỉnh nào ạ? Chị tư vấn cụ thể dịch vụ hỗ trợ khách tỉnh xa cho vợ chồng em nha 💕',
  lead_score   = 30,
  service_type  = 'anh_cuoi'
WHERE id = 'ec8036e3-6470-4594-8ae2-215a7b3f9346';
-- "H2O có phục vụ khách ở tỉnh xa không?"

-- ─── NHÓM: NGOẠI CẢNH ──────────────────────────────────────────────────────────

UPDATE customer_faqs SET
  keywords     = ARRAY['ngoại cảnh ở đâu đẹp','chụp ngoài trời','địa điểm ngoại cảnh','tháng đẹp nhất ngoại cảnh','vin vũ yên','hạ long','legacy'],
  next_question = 'Vợ chồng em thích chụp ngoại cảnh ở đâu nhất ạ? Chị tư vấn địa điểm và combo phù hợp nha 🌸',
  lead_score   = 35,
  service_type  = 'anh_cuoi'
WHERE id = '12649034-46a2-4cf2-b5d1-17ca6d38dbda';
-- "Chụp ngoại cảnh ở đâu đẹp? Tháng mấy thì đẹp nhất?"

UPDATE customer_faqs SET
  keywords     = ARRAY['vin vũ yên phí','phí vào cổng vin','phát sinh phí ngoại cảnh','phí địa điểm vin','phí cổng chụp hình'],
  next_question = 'Vợ chồng em đang quan tâm combo ngoại cảnh tại Vin Vũ Yên không ạ? Chị tư vấn chi tiết nha 🌸',
  lead_score   = 45,
  service_type  = 'anh_cuoi'
WHERE id = '1823c774-ef28-4f71-9966-10f8c5b28e9f';
-- "Chụp ở Vin Vũ Yên có phát sinh phí vào cổng không?"
