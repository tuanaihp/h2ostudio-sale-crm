// Từ điển đồng nghĩa tiếng Việt cho ngữ cảnh chụp ảnh cưới
// Mỗi nhóm: [từ chính, ...từ đồng nghĩa]
const SYNONYM_GROUPS: [string, string[]][] = [
  ['giá', ['tiền', 'chi phí', 'bao nhiêu', 'phí', 'báo giá', 'giá tiền', 'bảng giá', 'giá cả', 'tốn', 'mấy tiền', 'giá chụp', 'phí chụp']],
  ['cưới', ['đám cưới', 'ngày cưới', 'hôn lễ', 'kết hôn', 'lễ cưới', 'hôn nhân', 'ngày trọng đại', 'hôn lễ', 'ăn hỏi']],
  ['album', ['ảnh', 'hình', 'bộ ảnh', 'hình ảnh', 'ảnh cưới', 'bộ hình', 'ảnh đẹp', 'hình cưới', 'bộ album']],
  ['lịch', ['ngày', 'đặt lịch', 'book', 'đặt', 'ngày chụp', 'hẹn lịch', 'đặt hẹn', 'đặt ngày', 'booking', 'hẹn']],
  ['chụp', ['chụp ảnh', 'chụp hình', 'shoot', 'chụp cưới', 'phóng sự']],
  ['thời gian', ['bao lâu', 'lâu không', 'mấy ngày', 'khi nào', 'mấy tuần', 'mấy tháng', 'nhanh không', 'nhanh ko', 'bao nhiêu ngày']],
  ['giao ảnh', ['nhận ảnh', 'giao hàng', 'trả ảnh', 'nhận hình', 'nhận bộ', 'khi nào có ảnh', 'khi nào nhận', 'ra ảnh']],
  ['ngoại cảnh', ['outdoor', 'ngoài trời', 'phong cảnh', 'công viên', 'chụp ngoài', 'thiên nhiên', 'sân vườn']],
  ['studio', ['phòng chụp', 'trong nhà', 'indoor', 'chụp trong', 'background']],
  ['makeup', ['trang điểm', 'làm đẹp', 'phấn son', 'make up', 'đội makeup', 'artist', 'mua']],
  ['váy', ['áo cưới', 'đầm cưới', 'trang phục', 'quần áo', 'thuê váy', 'thuê áo', 'vest', 'suit']],
  ['khuyến mãi', ['giảm giá', 'ưu đãi', 'sale', 'discount', 'khuyến mại', 'km', 'giảm', 'deal', 'ưu đãi đặc biệt']],
  ['đặt cọc', ['cọc', 'thanh toán', 'trả tiền', 'cọc trước', 'đặt trước', 'tiền cọc', 'trả trước', 'payment']],
  ['concept', ['phong cách', 'style', 'chủ đề', 'ý tưởng', 'kiểu chụp', 'loại ảnh', 'theme', 'concept chụp']],
  ['gói', ['package', 'combo', 'dịch vụ', 'bao gồm', 'gồm những gì', 'bao gồm gì', 'gói chụp', 'gói dịch vụ']],
  ['địa điểm', ['ở đâu', 'địa chỉ', 'chỗ nào', 'nơi', 'quận', 'đường', 'studio ở', 'vị trí']],
  ['đẹp', ['chất lượng', 'tốt', 'chuyên nghiệp', 'uy tín', 'đỉnh', 'xịn', 'đẳng cấp']],
  ['kinh nghiệm', ['bao nhiêu năm', 'lâu chưa', 'đã chụp', 'portfolio', 'mẫu ảnh', 'ảnh mẫu']],
  ['phóng sự', ['phóng sự cưới', 'ảnh phóng sự', 'ảnh thực tế', 'ngày cưới thực']],
];

export function expandQuery(query: string): string[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length >= 2);
  const expanded = new Set<string>(words);

  for (const [key, synonyms] of SYNONYM_GROUPS) {
    const allTerms = [key, ...synonyms];
    // Nếu query chứa bất kỳ từ nào trong nhóm → thêm tất cả từ nhóm vào expanded
    if (allTerms.some(t => q.includes(t))) {
      allTerms.forEach(phrase => {
        phrase.split(/\s+/).filter(w => w.length >= 2).forEach(w => expanded.add(w));
      });
    }
  }

  return Array.from(expanded);
}
