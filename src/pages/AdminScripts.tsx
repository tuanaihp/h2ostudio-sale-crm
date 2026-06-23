import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import type { SaleScript } from '../types';
import {
  Copy, Check, Edit3, Trash2, Plus, Save, X,
  BookOpen, Search, ChevronDown, ChevronRight, Tag, Download,
} from 'lucide-react';

// ─── Seed data — Kịch bản mẫu H2O Studio ─────────────────────────────────────

const H2O_SEED_SCRIPTS: Omit<SaleScript, 'id'>[] = [
  {
    phase: 'opening',
    title: 'Lời chào mở đầu — kết nối cảm xúc',
    content: `Chào em nha 💕
Chị là Lan - quản lý bên H2O Studio đây

Cảm ơn em đã quan tâm đến các gói chụp ảnh cưới của bên chị nha!

✨ Chị tin rằng, mỗi cặp đôi đều xứng đáng có bộ ảnh cưới ghi dấu hạnh phúc – thật đẹp và thật ý nghĩa.`,
    tags: ['zalo', 'mở đầu', 'kết nối'],
    orderNum: 0,
    enabled: true,
  },
  {
    phase: 'discovery',
    title: 'Khơi gợi nhu cầu — câu hỏi mở',
    content: `• Hai em dự định cưới vào tháng mấy rồi em?
• Vợ chồng em muốn chụp ngoại cảnh hay studio em nhỉ?

Nhà chị nhiều dâu rể cưới tháng 5 là giờ cũng đang lên lịch chụp nhiều lắm nè. Vợ chồng em sắp xếp chụp sớm sẽ thoải mái thời gian chọn ảnh và duyệt ảnh cho vợ chồng e nhớ 😊

Chụp studio thì không bị nóng, cũng không phải phụ thuộc thời tiết nhiều em nè. Cô dâu nếu có bầu nghén sẽ không bị mệt nha mà các concept đa dạng lúc nào cũng đẹp em ạ

C gửi e là có combo chỉ chụp, có cả combo bao gồm đầy đủ ngày ăn hỏi và ngày ăn cưới đó e

Quy trình bên chị cũng rút ngắn gọn cho vợ chồng em là ngày chụp hình vợ chồng em có thể chọn đồ và hẹn lịch make up tất cả mọi thứ trong ngày hôm đó luôn. Còn sau đó về phần ảnh mình sẽ làm việc qua online được nè. Vậy sẽ tiện cho vck e và không mất nhiều công đi lại + chuẩn bị đó e`,
    tags: ['khám phá', 'nhu cầu', 'studio', 'ngoại cảnh'],
    orderNum: 0,
    enabled: true,
  },
  {
    phase: 'value_prop',
    title: 'Giá trị khác biệt — 7 lý do chọn H2O',
    content: `🌟 Tại sao hàng nghìn cặp đôi đã tin chọn H2O Studio?

✅ 1. Ảnh đẹp không góc chết. Trước buổi chụp hình dâu rể được lựa chọn concept chụp theo sở thích mong muốn của dâu rể
✅ 2. Makeup cô dâu bởi giảng viên Học viện Thuỷ H2O Makeup, nổi tiếng layout trẻ trung, sang, tôn nét đẹp tự nhiên sẵn có của cô dâu.
✅ 3. Studio rộng 900m², có phòng váy cưới, áo dài, vest, phòng chụp đa dạng – không cần di chuyển xa.
✅ 4. Ekip hướng dẫn tạo dáng tận tình, dâu rể không biết diễn cũng ra dáng mẫu ngay!
✅ 5. Được check file ngay sau chụp, chỉnh sửa theo ý cô dâu chú rể.
✅ 6. Miễn phí toàn bộ phụ kiện: vương miện, khuyên tai, cài đầu, hoa cầm tay, giày, guốc, sơ mi, thắt lưng… nếu vk ck chưa chuẩn bị kịp.
✅ 7. Concept đa dạng, từ Hàn Quốc – cổ điển – sang trọng – đến nhẹ nhàng tự nhiên.`,
    tags: ['USP', 'điểm khác biệt', 'studio', 'makeup'],
    orderNum: 0,
    enabled: true,
  },
  {
    phase: 'offer',
    title: 'Ưu đãi đặc biệt — book Online trong 48h',
    content: `💝 Book lịch Online trong 48h, em được tặng gói quà trị giá lên tới 3.500.000đ bao gồm:

🎁 Nâng cấp chất liệu ảnh tráng gương cao cấp nhất (trị giá 1.500.000đ)
🎁 Tặng voucher nâng cấp váy (trị giá 1.500.000đ)
🎁 Makeup chú rể chụp hình (trị giá 500.000đ)
🎁 Ưu tiên tự chọn lịch chụp bất kỳ

Hầu hết dâu rể bên c đều lựa chọn combo studio 9999 vì gần như đã đầy đủ cho vck e về ảnh và 2 ngày cưới hỏi như váy, vest, makeup, áo dài cho 2vck nhớ

🎁 Đặc biệt: KHI BOOK LỊCH TRONG VÒNG 24h KỂ TỪ KHI TƯ VẤN bên c tặng e thêm 1 voucher giảm 500k khi e đăng ký combo bất kỳ e nhớ`,
    tags: ['ưu đãi', '48h', 'quà tặng', 'combo'],
    orderNum: 0,
    enabled: true,
  },
  {
    phase: 'fomo',
    title: 'Tạo FOMO — khan hiếm slot lịch chụp',
    content: `⏳ Chỉ còn vài slot ưu đãi trong hôm nay và ngày mai thôi nha em!

📢 Hôm nay đã có 4 cặp book rồi, lịch đẹp cuối tuần chỉ còn 1-2 slot thôi em ơi!

💬 Chị giữ suất cho mình luôn nhé? Chỉ cần cọc trước 500K – lịch chụp có thể chọn sau nha!

Vck e muốn tư vấn thêm phần nào hay muốn đăng đăng ký để nhận gói quà trị giá 3tr500k thì bảo c nhớ 🥰`,
    tags: ['FOMO', 'khan hiếm', 'slot', 'urgency'],
    orderNum: 0,
    enabled: true,
  },
  {
    phase: 'closing',
    title: 'Chốt cọc — hướng dẫn thanh toán',
    content: `Vck e đăng ký combo để nhận khuyến mãi gửi c xin tên + sđt 2 vck e và bank cọc trước 1 triệu giúp c nha

E chuyển khoản KHÔNG GHI NỘI DUNG và cho c xin chụp màn hình nha. Ghi nội dung sẽ bị tính 20% thuế nè

💳 THÔNG TIN CHUYỂN KHOẢN
➡️ MB Bank – STK: [STK MB Bank] – [Tên chủ TK]
➡️ Vietcombank – STK: [STK Vietcombank] – [Tên chủ TK]

💌 Sau khi cọc, em chụp màn hình gửi chị để note quà tặng & ưu tiên chọn lịch chụp cho vk ck em nha!

👉 Em chốt lịch sớm hôm nay để nhận gói quà 2.000.000đ + đặc quyền chọn lịch nha!`,
    tags: ['cọc', 'thanh toán', 'chốt', 'chuyển khoản'],
    orderNum: 0,
    enabled: true,
  },
  {
    phase: 'pre_shoot',
    title: 'Dặn dò dâu rể trước ngày chụp',
    content: `📝 Chuẩn bị cho ngày chụp:

• Cô dâu: chuẩn bị quần lót màu nude/trắng, miếng dán ngực, guốc, làm nails xinh xắn.
• Chú rể: chuẩn bị áo sơ mi trắng, thắt lưng, giày da đen.
• Nếu thiếu, studio có sẵn – yên tâm nha!
• Nhớ ăn sáng no, ngủ đủ giấc để hôm chụp rạng rỡ nhất.
• Ngày chụp hình vợ chồng em cọc thêm 90% hoặc thanh toán hết giúp c nhớ

📅 Hẹn gặp vk ck mình 8h30 ngày [ngày chụp] để cùng ghi dấu khoảnh khắc đẹp nhất nhé!`,
    tags: ['chuẩn bị', 'trước ngày chụp', 'dặn dò'],
    orderNum: 0,
    enabled: true,
  },
  {
    phase: 'followup',
    title: 'Follow-up hôm sau — nhắc nhở chốt cọc',
    content: `Chào em nha! 🌸 Hôm qua chị có tư vấn cho em về các gói chụp cưới, không biết vk ck em đã suy nghĩ xong chưa nè?

📌 Hôm nay là ngày cuối cùng bên chị tặng gói quà 2 triệu + ưu tiên chọn lịch chụp cho khách book Online đó em ơi!

✅ Chỉ cần cọc trước 500K, giữ ưu đãi - có thể chọn lịch chụp sau!
✅ Nếu để qua hôm nay, giá sẽ tăng lên theo giá niêm yết đó nha!
✅ Hôm nay đã có 4 cặp book rồi, lịch chụp đẹp cuối tuần chỉ còn 1-2 slot thôi!

🔻 Vk ck mình chốt lịch hôm nay luôn để giữ giá ưu đãi không em? Chị giữ suất cho mình luôn nè!

🔻 Nếu cần chị hỗ trợ thêm gì cứ ib chị ngay nha! ❤️`,
    tags: ['follow-up', 'nhắc nhở', 'hôm sau'],
    orderNum: 0,
    enabled: true,
  },
  {
    phase: 'faq',
    title: 'Q&A — Khách muốn đến thử váy trước',
    content: `💃 Thử Váy Trước:
• Váy ngày chụp, em có thể thoải mái chọn mẫu ưng ý!
• Thường thì, sau khi makeup và làm tóc xong, thử váy sẽ đẹp và chuẩn hơn.
• Bên chị có nhiều mẫu váy mới, đảm bảo em luôn lung linh!`,
    tags: ['váy', 'thử váy', 'FAQ'],
    orderNum: 0,
    enabled: true,
  },
  {
    phase: 'faq',
    title: 'Q&A — Hỏi về thời gian có ảnh',
    content: `⏰ Thời Gian Có Ảnh:
• Thông thường, bên chị sẽ có ảnh sau 2 tuần.
• Nếu cần gấp, chỉ cần báo trước – có thể hoàn thành trong 3-5 ngày.`,
    tags: ['thời gian', 'ảnh', 'FAQ'],
    orderNum: 1,
    enabled: true,
  },
  {
    phase: 'faq',
    title: 'Q&A — Chưa có lịch chụp / chưa biết chọn combo',
    content: `🛍 Chưa Quyết Định Combo:
• Hầu hết các cặp đôi đều đăng ký Online để nhận gói quà 3tr500k
• Sau khi đăng ký, đến cửa hàng sẽ được tư vấn lại combo cụ thể.`,
    tags: ['combo', 'chưa quyết định', 'FAQ'],
    orderNum: 2,
    enabled: true,
  },
  {
    phase: 'faq',
    title: 'Q&A — Lo lắng về trang điểm cô dâu',
    content: `💄 Trang Điểm Cô Dâu:
• Bên chị là học viện đào tạo makeup số 1 Hải Phòng.
• Ekip chuyên viên makeup tư vấn layout trước khi makeup, đảm bảo phù hợp & trẻ trung.
• Makeup xong ai cũng xinh lung linh, không ai muốn tẩy trang luôn nè!

Chuyên viên bên chị đều là các bạn đã làm cho rất nhiều cô dâu ưng ý, hiện tại đang là giảng viên tại học viện và có chứng chỉ của nhà nước cấp nên em yên tâm về phần chuyên viên nha. Nếu em thích tone make up nào có thể nói với chuyên viên, chuyên viên sẽ tư vấn kỹ về khuôn mặt của em và làm phù hợp với em nhất nhé. Tone nào chuyên viên cũng có thể làm được nên em cứ trao đổi với chị trước nha bé`,
    tags: ['makeup', 'trang điểm', 'lo lắng', 'FAQ'],
    orderNum: 3,
    enabled: true,
  },
  {
    phase: 'faq',
    title: 'Q&A — Đồ tự chọn hay có sẵn tại Studio',
    content: `👗 Đồ Tự Chọn:
• Bên chị chuẩn bị sẵn áo dài đôi, vest đôi, hanbok, hỷ phục…
• Nếu vk ck muốn tự chuẩn bị đồ thì cứ thoải mái mang theo!`,
    tags: ['đồ chụp', 'váy', 'có sẵn', 'FAQ'],
    orderNum: 4,
    enabled: true,
  },
  {
    phase: 'faq',
    title: 'Q&A — Chọn váy ngày cưới',
    content: `👰 Váy Ngày Cưới Em Chọn:
• Em hoàn toàn được chọn váy theo sở thích.
• Nếu chọn váy cao cấp hơn, có thể thêm phụ thu. (ví dụ combo váy 3tr5: em chọn váy 4.000.000đ → phụ thu 500.000đ).
• Quan trọng nhất là em chọn mẫu mình thích nhất để lung linh trong ngày trọng đại nha!`,
    tags: ['váy cưới', 'phụ thu', 'chọn váy', 'FAQ'],
    orderNum: 5,
    enabled: true,
  },
];

// ─── Phase definitions ────────────────────────────────────────────────────────

const PHASES = [
  { key: 'opening',    emoji: '💌', label: 'Mở đầu',             desc: 'Lời chào và kết nối cảm xúc ban đầu' },
  { key: 'discovery',  emoji: '📌', label: 'Khơi gợi nhu cầu',   desc: 'Câu hỏi mở, tìm hiểu mong muốn' },
  { key: 'value_prop', emoji: '💎', label: 'Giá trị – USP',       desc: 'Điểm khác biệt của studio' },
  { key: 'offer',      emoji: '🔥', label: 'Ưu đãi đặc biệt',    desc: 'Gói khuyến mãi, quà tặng' },
  { key: 'fomo',       emoji: '⏳', label: 'Tạo FOMO',            desc: 'Urgency, khan hiếm slot lịch chụp' },
  { key: 'closing',    emoji: '💳', label: 'Chốt cọc',            desc: 'Hướng dẫn đặt cọc và thanh toán' },
  { key: 'pre_shoot',  emoji: '🌈', label: 'Trước ngày chụp',     desc: 'Dặn dò chuẩn bị cho dâu rể' },
  { key: 'followup',   emoji: '🔔', label: 'Follow-up',            desc: 'Tin nhắn theo đuổi khách hôm trước' },
  { key: 'faq',        emoji: '❓', label: 'Q&A – Từ chối',        desc: 'Xử lý câu hỏi và phản đối phổ biến' },
] as const;

type PhaseKey = typeof PHASES[number]['key'];

const ACCENT: Record<PhaseKey, { border: string; header: string; badge: string }> = {
  opening:    { border: 'border-l-pink-400',    header: 'bg-pink-50 text-pink-800',    badge: 'bg-pink-100 text-pink-700' },
  discovery:  { border: 'border-l-blue-400',    header: 'bg-blue-50 text-blue-800',    badge: 'bg-blue-100 text-blue-700' },
  value_prop: { border: 'border-l-amber-400',   header: 'bg-amber-50 text-amber-800',  badge: 'bg-amber-100 text-amber-700' },
  offer:      { border: 'border-l-red-400',     header: 'bg-red-50 text-red-800',      badge: 'bg-red-100 text-red-700' },
  fomo:       { border: 'border-l-orange-400',  header: 'bg-orange-50 text-orange-800',badge: 'bg-orange-100 text-orange-700' },
  closing:    { border: 'border-l-green-400',   header: 'bg-green-50 text-green-800',  badge: 'bg-green-100 text-green-700' },
  pre_shoot:  { border: 'border-l-purple-400',  header: 'bg-purple-50 text-purple-800',badge: 'bg-purple-100 text-purple-700' },
  followup:   { border: 'border-l-teal-400',    header: 'bg-teal-50 text-teal-800',    badge: 'bg-teal-100 text-teal-700' },
  faq:        { border: 'border-l-gray-400',    header: 'bg-gray-50 text-gray-700',    badge: 'bg-gray-100 text-gray-600' },
};

const getAccent = (phase: string) => ACCENT[phase as PhaseKey] ?? ACCENT.faq;

// ─── DB mapper ────────────────────────────────────────────────────────────────

const dbToScript = (row: Record<string, unknown>): SaleScript => ({
  id: row.id as string,
  phase: row.phase as string,
  title: row.title as string,
  content: row.content as string,
  tags: (row.tags as string[] | null) || [],
  orderNum: (row.order_num as number) || 0,
  enabled: row.enabled !== false,
});

// ─── Highlight [placeholders] in content ──────────────────────────────────────

const highlightVars = (text: string): React.ReactNode => {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('[') && part.endsWith(']') ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic font-semibold">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

// ─── Edit / Add modal ─────────────────────────────────────────────────────────

const ScriptModal: React.FC<{
  script: Partial<SaleScript> | null;
  defaultPhase: string;
  saving: boolean;
  onSave: (data: Partial<SaleScript>) => void;
  onClose: () => void;
}> = ({ script, defaultPhase, saving, onSave, onClose }) => {
  const isNew = !script?.id;
  const [form, setForm] = useState({
    title: script?.title || '',
    phase: script?.phase || defaultPhase,
    content: script?.content || '',
    tags: (script?.tags || []).join(', '),
    enabled: script?.enabled !== false,
  });

  const canSave = form.title.trim().length > 0 && form.content.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      ...(script?.id ? { id: script.id } : {}),
      title: form.title.trim(),
      phase: form.phase,
      content: form.content.trim(),
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      enabled: form.enabled,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-dark/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] rounded-t-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-light-gray flex items-center justify-between shrink-0 bg-light-gray/30">
          <h3 className="font-bold text-dark">{isNew ? '✨ Thêm kịch bản mới' : '✏️ Sửa kịch bản'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-light-gray rounded-full transition-colors text-dark/50">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-dark mb-1.5">Tiêu đề kịch bản <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="VD: Lời chào mở đầu — Zalo"
                className="w-full p-3 border border-light-gray rounded-xl focus:outline-none focus:border-primary text-sm"
                autoFocus
              />
            </div>

            {/* Phase selector */}
            <div>
              <label className="block text-xs font-bold text-dark mb-1.5">Giai đoạn bán hàng</label>
              <select
                value={form.phase}
                onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}
                className="w-full p-3 border border-light-gray rounded-xl focus:outline-none focus:border-primary text-sm bg-white"
              >
                {PHASES.map(p => (
                  <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-bold text-dark mb-1.5">
                Nội dung kịch bản <span className="text-red-500">*</span>
                <span className="ml-2 text-[10px] font-normal text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                  Dùng [text] cho phần cần điền: [tên khách], [số tiền]…
                </span>
              </label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Nhập nội dung kịch bản đầy đủ..."
                rows={14}
                className="w-full p-3 border border-light-gray rounded-xl focus:outline-none focus:border-primary text-sm resize-y font-mono leading-relaxed"
              />
              <p className="text-[10px] text-dark/30 mt-1 text-right">{form.content.length} ký tự</p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-dark mb-1.5 flex items-center gap-1">
                <Tag size={11} /> Tags (phân cách bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="VD: zalo, điện thoại, ưu đãi"
                className="w-full p-3 border border-light-gray rounded-xl focus:outline-none focus:border-primary text-sm"
              />
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center justify-between py-2 border-t border-light-gray">
              <div>
                <p className="text-sm font-medium text-dark">Hiển thị kịch bản này</p>
                <p className="text-[10px] text-dark/40">Tắt để ẩn khỏi danh sách sử dụng</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.enabled ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-light-gray flex gap-3 shrink-0 bg-light-gray/20">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white text-dark font-bold rounded-xl hover:bg-light-gray border border-light-gray transition-colors text-sm">
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving || !canSave}
              className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Save size={15} />
              }
              {isNew ? 'Thêm kịch bản' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Script card ──────────────────────────────────────────────────────────────

const ScriptCard: React.FC<{
  script: SaleScript;
  isSuperAdmin: boolean;
  onEdit: (s: SaleScript) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}> = ({ script, isSuperAdmin, onEdit, onDelete, onToggle }) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const accent = getAccent(script.phase);
  const PREVIEW = 220;
  const isLong = script.content.length > PREVIEW;

  const copy = () => {
    navigator.clipboard.writeText(script.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white rounded-xl border border-light-gray border-l-4 ${accent.border} shadow-sm hover:shadow-md transition-shadow ${!script.enabled ? 'opacity-50' : ''}`}>
      {/* Card header row */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-dark text-sm leading-snug">{script.title}</h4>
          {script.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {script.tags.map(tag => (
                <span key={tag} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${accent.badge}`}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {!script.enabled && (
            <span className="text-[9px] text-gray-400 font-bold border border-gray-200 px-1.5 py-0.5 rounded-full">Ẩn</span>
          )}
          {/* Toggle enabled */}
          <button
            onClick={() => onToggle(script.id, !script.enabled)}
            className={`p-1.5 rounded-lg transition-all text-xs font-bold ${script.enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
            title={script.enabled ? 'Đang hiển thị — click để ẩn' : 'Đang ẩn — click để hiện'}
          >
            {script.enabled ? '●' : '○'}
          </button>
          {/* Copy */}
          <button
            onClick={copy}
            className={`p-1.5 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'text-dark/40 hover:text-primary hover:bg-primary/10'}`}
            title="Copy toàn bộ nội dung"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          {/* Edit */}
          <button
            onClick={() => onEdit(script)}
            className="p-1.5 text-dark/40 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="Chỉnh sửa"
          >
            <Edit3 size={14} />
          </button>
          {/* Delete */}
          {isSuperAdmin && (
            <button
              onClick={() => { if (window.confirm(`Xóa kịch bản "${script.title}"?`)) onDelete(script.id); }}
              className="p-1.5 text-dark/40 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Xóa"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content preview */}
      <div className="px-4 pb-3">
        <div className={`text-xs text-dark/70 leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
          {highlightVars(script.content)}
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-[10px] font-bold text-primary hover:text-primary/70 flex items-center gap-0.5 transition-colors"
          >
            {expanded
              ? <><ChevronDown size={11} />Thu gọn</>
              : <><ChevronRight size={11} />Xem đầy đủ ({script.content.length} ký tự)</>
            }
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const AdminScripts: React.FC = () => {
  const { isAdmin, isSuperAdmin, isAuthReady } = useApp();
  const [scripts, setScripts] = useState<SaleScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<string>('opening');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; script: Partial<SaleScript> | null }>({ open: false, script: null });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadScripts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sale_scripts')
      .select('*')
      .order('order_num')
      .order('created_at');
    if (data) setScripts(data.map(dbToScript));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadScripts();
  }, [isAdmin, loadScripts]);

  const handleSave = async (data: Partial<SaleScript>) => {
    setSaving(true);
    try {
      if (data.id) {
        await supabase.from('sale_scripts').update({
          title: data.title,
          phase: data.phase,
          content: data.content,
          tags: data.tags || [],
          enabled: data.enabled,
          updated_at: new Date().toISOString(),
        }).eq('id', data.id);
      } else {
        const maxOrder = scripts.filter(s => s.phase === data.phase).length;
        await supabase.from('sale_scripts').insert({
          id: crypto.randomUUID(),
          title: data.title,
          phase: data.phase,
          content: data.content,
          tags: data.tags || [],
          order_num: maxOrder,
          enabled: data.enabled !== false,
        });
      }
      await loadScripts();
      setEditModal({ open: false, script: null });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('sale_scripts').delete().eq('id', id);
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await supabase.from('sale_scripts').update({ enabled, updated_at: new Date().toISOString() }).eq('id', id);
    setScripts(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
  };

  const handleSeedH2O = async () => {
    if (!window.confirm(`Nạp ${H2O_SEED_SCRIPTS.length} kịch bản mẫu H2O vào hệ thống?\n\nKịch bản cũ sẽ vẫn giữ nguyên, chỉ thêm mới.`)) return;
    setSeeding(true);
    try {
      const rows = H2O_SEED_SCRIPTS.map((s, i) => ({
        id: crypto.randomUUID(),
        phase: s.phase,
        title: s.title,
        content: s.content,
        tags: s.tags,
        order_num: s.orderNum + i,
        enabled: s.enabled,
      }));
      await supabase.from('sale_scripts').insert(rows);
      await loadScripts();
    } finally {
      setSeeding(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/admin/login" />;

  // Filtered scripts based on phase or search
  const displayScripts = scripts.filter(s => {
    const matchPhase = isSearching || s.phase === selectedPhase;
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q));
    return matchPhase && matchSearch;
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setIsSearching(term.length > 0);
  };

  const currentPhase = PHASES.find(p => p.key === selectedPhase);
  const totalEnabled = scripts.filter(s => s.enabled).length;

  return (
    <Layout title="Kho kịch bản" showBack={true}>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-dark/40 mb-1">
              <Link to="/admin/consultations" className="hover:text-primary transition-colors font-medium">CRM</Link>
              <ChevronRight size={12} />
              <span className="text-dark font-semibold">Kho kịch bản chốt sale</span>
            </div>
            <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
              <BookOpen size={22} className="text-primary" />
              Kho kịch bản chốt sale
            </h1>
            <p className="text-xs text-dark/40 mt-1">
              {totalEnabled} / {scripts.length} kịch bản đang hoạt động &nbsp;·&nbsp; {PHASES.length} giai đoạn
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm kịch bản..."
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                className="pl-9 pr-8 py-2 border border-light-gray rounded-xl text-sm focus:outline-none focus:border-primary w-48 bg-white"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/40 pointer-events-none" />
              {searchTerm && (
                <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark/30 hover:text-dark transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Seed H2O button — chỉ hiện khi chưa có kịch bản nào */}
            {scripts.length === 0 && !loading && (
              <button
                onClick={handleSeedH2O}
                disabled={seeding}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 disabled:opacity-60"
                title="Nạp toàn bộ kịch bản mẫu H2O Studio vào hệ thống"
              >
                {seeding
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Download size={16} />
                }
                Nạp kịch bản mẫu H2O
              </button>
            )}

            {/* Add button */}
            <button
              onClick={() => setEditModal({ open: true, script: { phase: selectedPhase, enabled: true } })}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Plus size={16} /> Thêm kịch bản
            </button>
          </div>
        </div>

        {/* ── Body: sidebar + content ── */}
        <div className="flex gap-5">

          {/* Left sidebar — phases */}
          <aside className="hidden md:block w-56 shrink-0">
            <nav className="bg-white rounded-2xl border border-light-gray overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 border-b border-light-gray bg-light-gray/30">
                <p className="text-[10px] font-black text-dark/50 uppercase tracking-wider">Giai đoạn bán hàng</p>
              </div>
              {PHASES.map(phase => {
                const count = scripts.filter(s => s.phase === phase.key).length;
                const enabledCount = scripts.filter(s => s.phase === phase.key && s.enabled).length;
                const isActive = !isSearching && selectedPhase === phase.key;
                return (
                  <button
                    key={phase.key}
                    onClick={() => { setSelectedPhase(phase.key); handleSearch(''); }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 border-b border-light-gray last:border-0 transition-colors relative ${isActive ? 'bg-primary/5' : 'hover:bg-light-gray/50'}`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />}
                    <span className="text-base leading-none">{phase.emoji}</span>
                    <span className={`text-xs font-bold flex-1 truncate ${isActive ? 'text-primary' : 'text-dark/70'}`}>
                      {phase.label}
                    </span>
                    {count > 0 && (
                      <span className={`text-[9px] font-black rounded-full px-1.5 py-0.5 shrink-0 ${isActive ? 'bg-primary text-white' : 'bg-light-gray text-dark/40'}`}>
                        {enabledCount}/{count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick stats */}
            <div className="mt-4 bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <p className="text-xs font-black text-primary/70 uppercase tracking-wider mb-3">Tổng kho</p>
              {PHASES.map(phase => {
                const count = scripts.filter(s => s.phase === phase.key).length;
                if (count === 0) return null;
                return (
                  <div key={phase.key} className="flex items-center justify-between py-0.5">
                    <span className="text-[10px] text-dark/50">{phase.emoji} {phase.label}</span>
                    <span className="text-[10px] font-bold text-dark/70">{count}</span>
                  </div>
                );
              })}
              <div className="border-t border-primary/20 mt-2 pt-2 flex justify-between">
                <span className="text-[10px] font-bold text-dark/60">Tổng cộng</span>
                <span className="text-[10px] font-black text-primary">{scripts.length} kịch bản</span>
              </div>
            </div>
          </aside>

          {/* Right content area */}
          <div className="flex-1 min-w-0">
            {/* Mobile: phase tabs */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: 'none' }}>
              {PHASES.map(phase => (
                <button
                  key={phase.key}
                  onClick={() => { setSelectedPhase(phase.key); handleSearch(''); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${!isSearching && selectedPhase === phase.key ? 'bg-primary text-white border-primary' : 'bg-white border-light-gray text-dark/60 hover:border-primary hover:text-primary'}`}
                >
                  {phase.emoji} {phase.label}
                </button>
              ))}
            </div>

            {/* Phase header */}
            {!isSearching && currentPhase && (
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl mb-4 ${getAccent(selectedPhase).header}`}>
                <div>
                  <p className="font-black text-base">{currentPhase.emoji} {currentPhase.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{currentPhase.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black">{scripts.filter(s => s.phase === selectedPhase && s.enabled).length}</p>
                  <p className="text-[10px] opacity-60">kịch bản hoạt động</p>
                </div>
              </div>
            )}

            {/* Search result header */}
            {isSearching && (
              <div className="flex items-center justify-between mb-4 px-1">
                <p className="text-sm font-bold text-dark">
                  Kết quả tìm kiếm: "{searchTerm}" — {displayScripts.length} kịch bản
                </p>
                <button onClick={() => handleSearch('')} className="text-xs text-primary hover:underline font-medium">Bỏ tìm kiếm</button>
              </div>
            )}

            {/* Scripts list */}
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-dark/40 text-sm">Đang tải kịch bản...</p>
              </div>
            ) : displayScripts.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-light-gray">
                <BookOpen size={40} className="mx-auto mb-3 text-dark/15" />
                <p className="text-dark/40 font-medium mb-1">
                  {searchTerm ? `Không tìm thấy kịch bản nào cho "${searchTerm}"` : 'Chưa có kịch bản nào'}
                </p>
                <p className="text-xs text-dark/30 mb-4">
                  {searchTerm ? 'Thử từ khóa khác hoặc tìm ở giai đoạn khác' : 'Hãy thêm kịch bản đầu tiên cho giai đoạn này'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setEditModal({ open: true, script: { phase: selectedPhase, enabled: true } })}
                    className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                  >
                    <Plus size={15} /> Thêm kịch bản đầu tiên
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {displayScripts.map(script => (
                  <ScriptCard
                    key={script.id}
                    script={script}
                    isSuperAdmin={isSuperAdmin}
                    onEdit={s => setEditModal({ open: true, script: s })}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                  />
                ))}

                {/* Add more button at bottom */}
                {!isSearching && (
                  <button
                    onClick={() => setEditModal({ open: true, script: { phase: selectedPhase, enabled: true } })}
                    className="w-full py-3 border-2 border-dashed border-light-gray rounded-xl text-sm text-dark/40 font-medium hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={15} /> Thêm kịch bản vào giai đoạn này
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit / Add modal */}
      {editModal.open && (
        <ScriptModal
          script={editModal.script}
          defaultPhase={selectedPhase}
          saving={saving}
          onSave={handleSave}
          onClose={() => setEditModal({ open: false, script: null })}
        />
      )}
    </Layout>
  );
};

export default AdminScripts;
