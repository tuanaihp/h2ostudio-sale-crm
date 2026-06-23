import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { Phone, MessageCircle, Clock, CheckCircle, Circle, Edit3, ChevronDown, Calendar, X, Save, Camera, Heart, Package, User, Copy, Check, Download, Tag, TrendingUp, Users, Gift, Trash2, LogOut, ExternalLink, DollarSign, LayoutGrid, Bell, Zap, ArrowRight, FileText, BookOpen, Database } from 'lucide-react';
import { AdminChatPanel } from '../components/AdminChatPanel';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { ScheduleCalendar } from '../components/ScheduleCalendar';
import { Consultation, Style } from '../types';
import { supabase } from '../supabase';

type ConsultationStatus = Consultation['status'];

const STATUS_CONFIG: Record<ConsultationStatus, { label: string; shortLabel: string; color: string; bgColor: string; borderColor: string; dot: string }> = {
  new:        { label: 'Chưa liên hệ', shortLabel: 'Mới',        color: 'text-red-600',    bgColor: 'bg-red-50',     borderColor: 'border-red-200',    dot: 'bg-red-500' },
  called:     { label: 'Đã gọi',        shortLabel: 'Đã gọi',     color: 'text-yellow-700', bgColor: 'bg-yellow-50',  borderColor: 'border-yellow-200', dot: 'bg-yellow-500' },
  contacted:  { label: 'Đã gọi',        shortLabel: 'Đã gọi',     color: 'text-yellow-700', bgColor: 'bg-yellow-50',  borderColor: 'border-yellow-200', dot: 'bg-yellow-500' },
  consulting: { label: 'Đang tư vấn',   shortLabel: 'Tư vấn',     color: 'text-blue-700',   bgColor: 'bg-blue-50',    borderColor: 'border-blue-200',   dot: 'bg-blue-500' },
  quoted:     { label: 'Đã báo giá',    shortLabel: 'Báo giá',    color: 'text-purple-700', bgColor: 'bg-purple-50',  borderColor: 'border-purple-200', dot: 'bg-purple-500' },
  registered: { label: 'Đã chốt',       shortLabel: 'Đã chốt',    color: 'text-green-700',  bgColor: 'bg-green-50',   borderColor: 'border-green-200',  dot: 'bg-green-500' },
};

const PIPELINE_STAGES: { keys: ConsultationStatus[]; label: string; headerCls: string; colCls: string }[] = [
  { keys: ['new'],                  label: 'Mới',         headerCls: 'bg-red-100 text-red-700',     colCls: 'bg-red-50/30 border-red-200' },
  { keys: ['called', 'contacted'],  label: 'Đã gọi',      headerCls: 'bg-yellow-100 text-yellow-700', colCls: 'bg-yellow-50/30 border-yellow-200' },
  { keys: ['consulting'],           label: 'Đang tư vấn', headerCls: 'bg-blue-100 text-blue-700',   colCls: 'bg-blue-50/30 border-blue-200' },
  { keys: ['quoted'],               label: 'Đã báo giá',  headerCls: 'bg-purple-100 text-purple-700', colCls: 'bg-purple-50/30 border-purple-200' },
  { keys: ['registered'],           label: 'Đã chốt',     headerCls: 'bg-green-100 text-green-700', colCls: 'bg-green-50/30 border-green-200' },
];

const getStageIndex = (status: ConsultationStatus): number => {
  const map: Record<ConsultationStatus, number> = { new: 0, called: 1, contacted: 1, consulting: 2, quoted: 3, registered: 4 };
  return map[status] ?? 0;
};

const getStatusLabel = (status: ConsultationStatus): string => STATUS_CONFIG[status]?.label ?? status;

const generateSaleScript = (c: Consultation, styles: Style[]): { step: number; title: string; script: string; tips: string }[] => {
  const favCount = c.favoriteIds?.length || 0;
  const isHot = favCount >= 3 || !!c.luckyGift || c.source === 'lucky_wheel';
  const favAlbumNames = c.favoriteIds
    ? styles.flatMap(s => s.albums.filter(a => c.favoriteIds!.includes(a.id)).map(a => `${a.title} (${s.title})`))
    : [];
  const favAlbumLinks = c.favoriteIds
    ? styles.flatMap(s => s.albums.filter(a => c.favoriteIds!.includes(a.id)).map(a => ({
        name: `${a.title} (${s.title})`,
        url: `${window.location.origin}/style/${s.slug}/album/${a.slug}`,
      })))
    : [];

  return [
    {
      step: 1,
      title: 'Gọi điện lần đầu',
      script: `"Dạ em chào ${c.name || 'anh/chị'} ạ! Em là [Tên bạn] từ H2O Studio. Em thấy mình vừa để lại thông tin tìm hiểu về dịch vụ chụp ảnh cưới ạ. Anh/chị đang tiện nghe máy không ạ?"`,
      tips: isHot
        ? `🔥 Khách HOT — đã thích ${favCount} album${c.luckyGift ? `, có quà "${c.luckyGift}"` : ''}. Gọi ngay trong 1h đầu!`
        : '💡 Gọi giờ vàng 9–11h hoặc 14–17h. Nếu không nghe, nhắn Zalo trước rồi gọi lại.',
    },
    {
      step: 2,
      title: 'Tư vấn album concept',
      script: favAlbumLinks.length > 0
        ? `"Bên em thấy anh/chị đã xem qua và thích ${favAlbumNames.slice(0, 2).join(', ')}${favAlbumNames.length > 2 ? ` và ${favAlbumNames.length - 2} album khác` : ''}. Em gửi anh/chị link xem lại chi tiết nhé, mình trao đổi thêm concept phù hợp ạ!"`
        : `"Anh/chị đang nghiêng về phong cách nào không ạ — lãng mạn tự nhiên, Hàn Quốc hiện đại, hay Fine Art cổ điển? Em gửi anh/chị 2–3 bộ ảnh mẫu để tham khảo trực tiếp ạ."`,
      tips: favAlbumLinks.length > 0
        ? '💡 Copy link concept bên dưới và paste vào Zalo ngay sau cuộc gọi — tỷ lệ chốt tăng 3x khi khách xem được ảnh thật.'
        : '💡 Gửi link album cụ thể, không gửi link trang chủ — khách cần xem ảnh thật ngay, không tìm kiếm.',
    },
    {
      step: 3,
      title: 'Tạo urgency — Chốt ngày',
      script: c.luckyGift
        ? `"Anh/chị được tặng "${c.luckyGift}" khi đăng ký gói hôm nay ạ. Bên em đang giữ slot tháng [X] — nếu anh/chị ưng concept nào, mình đặt trước cho chắc nhé? Ưu đãi chỉ áp dụng trong tuần này ạ."`
        : `"Lịch chụp ${c.weddingDate ? 'quý ' + new Date(c.weddingDate).getMonth() / 3 + 1 : 'mùa cưới'} bên em đang khá kín anh/chị ơi. Nếu mình ưng concept rồi thì để em giữ slot trước cho yên tâm nhé ạ?"`,
      tips: c.luckyGift
        ? `💡 Nhấn mạnh quà "${c.luckyGift}" có hạn — tạo deadline giúp khách quyết định nhanh hơn.`
        : '💡 Đừng ép — chỉ cần tạo cảm giác khan hiếm lịch. "Anh/chị cứ tham khảo thêm, em chỉ giữ được slot đến [ngày] thôi ạ."',
    },
    {
      step: 4,
      title: 'Xử lý từ chối',
      script: `Nếu "Để nghĩ thêm đã":
"Dạ ok anh/chị ạ. Anh/chị cho em biết mình đang phân vân điều gì không ạ — về concept, về ngày chụp, hay về chi phí? Em giải đáp luôn cho anh/chị nhé!"

Nếu "Đắt quá":
"Dạ bên em có nhiều gói từ [X]đ–[Y]đ ạ. Anh/chị cho em biết budget khoảng bao nhiêu, em tư vấn gói vừa vặn nhất nhé — không cần cắt bỏ những gì quan trọng ạ."

Nếu "Đang so sánh chỗ khác":
"Dạ anh/chị cứ so sánh ạ! Bên em tự tin nhất ở chất lượng ảnh và dịch vụ hậu kỳ. Anh/chị muốn em gửi thêm portfolio concept nào không?"`,
      tips: '💡 Đừng phòng thủ khi nghe từ chối. Hỏi thêm để tìm rào cản thật sự — đa số là giá hoặc chưa thấy concept ưng.',
    },
    {
      step: 5,
      title: 'Chốt — Đặt cọc',
      script: `"Dạ vậy bên em confirm lịch chụp ngày [ngày] cho anh/chị nhé ạ! Anh/chị đặt cọc [số tiền] để lock slot — mình nhận chuyển khoản qua [số TK / ngân hàng] hoặc thanh toán trực tiếp tại studio ạ. Em gửi thông tin hợp đồng và receipt qua Zalo luôn nhé!"`,
      tips: '💡 Sau khi khách đồng ý: gửi số tài khoản + hợp đồng qua Zalo NGAY — để nguội 30 phút là mất 40% khả năng chốt.',
    },
  ];
};

const isStaleNew = (c: Consultation): boolean => {
  if (c.status !== 'new') return false;
  const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
  return (Date.now() - d.getTime()) > 48 * 60 * 60 * 1000;
};

const getHoursOld = (createdAt: any): number => {
  const d = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60));
};

// New lead chưa liên hệ từ 4h–48h (cảnh báo vàng)
const isUrgentNew = (c: Consultation): boolean => {
  if (c.status !== 'new') return false;
  const hours = getHoursOld(c.createdAt);
  return hours >= 4 && hours < 48;
};

// Trả về số ngày còn lại đến ngày chụp (âm = đã qua)
const getShootingCountdown = (shootingDate?: string): number | null => {
  if (!shootingDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shoot = new Date(shootingDate);
  shoot.setHours(0, 0, 0, 0);
  return Math.round((shoot.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

// Ưu tiên hiển thị: hot+stale → hot → stale → urgent → new → contacted → registered
const getLeadPriority = (c: Consultation): number => {
  const favCount = c.favoriteIds?.length || 0;
  const isHot = favCount >= 3 || !!c.luckyGift || c.source === 'lucky_wheel';
  if (c.status === 'new') {
    if (isHot && isStaleNew(c)) return 0;
    if (isHot) return 1;
    if (isStaleNew(c)) return 2;
    if (isUrgentNew(c)) return 3;
    return 4;
  }
  if (c.status === 'called' || c.status === 'contacted') return 5;
  if (c.status === 'consulting') return 6;
  if (c.status === 'quoted') return 7;
  return 8; // registered
};

const RegistrationModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  consultation: Consultation;
  onSave: (data: Partial<Consultation>) => void;
}> = ({ isOpen, onClose, consultation, onSave }) => {
  const { styles } = useApp();
  const [formData, setFormData] = useState({
    conceptId: consultation.conceptId || '',
    shootingDate: consultation.shootingDate || '',
    engagementDate: consultation.engagementDate || '',
    weddingDate: consultation.weddingDate || '',
    deliveryDate: consultation.deliveryDate || '',
    contractValue: consultation.contractValue ? String(consultation.contractValue) : '',
  });

  const [showFavorites, setShowFavorites] = useState(false);

  if (!isOpen) return null;

  const favoriteAlbums = consultation.favoriteIds ? styles.flatMap(style => 
    style.albums.filter(album => 
      consultation.favoriteIds?.includes(album.id) || 
      consultation.favoriteIds?.includes(style.id)
    ).map(album => ({ style, album }))
  ) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { contractValue, ...rest } = formData;
    onSave({ ...rest, contractValue: contractValue ? parseFloat(contractValue) : undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-light-gray flex justify-between items-center bg-light-gray/30 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-dark">Hoàn tất đăng ký</h2>
            <p className="text-sm text-dark/60">Khách hàng: {consultation.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-light-gray rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-dark">Chọn Concept / Album</label>
                {favoriteAlbums.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setShowFavorites(!showFavorites)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full transition-colors ${showFavorites ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-500 hover:bg-pink-100'}`}
                  >
                    <Heart size={12} fill={showFavorites ? "currentColor" : "none"} />
                    Khách thích ({favoriteAlbums.length})
                  </button>
                )}
              </div>

              {showFavorites && (
                <div className="mb-4 rounded-xl border border-pink-100 overflow-hidden">
                  {/* Header với copy-all button */}
                  <div className="flex items-center justify-between px-3 py-2 bg-pink-50 border-b border-pink-100">
                    <span className="text-xs font-bold text-pink-600">📸 {favoriteAlbums.length} album khách đã chọn</span>
                    <button
                      type="button"
                      onClick={() => {
                        const links = favoriteAlbums.map(({ style, album }) =>
                          `• ${album.title} (${style.title}): ${window.location.origin}/style/${style.slug}/album/${album.slug}`
                        ).join('\n');
                        navigator.clipboard.writeText(`📸 Concept khách yêu thích:\n${links}`);
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold text-pink-500 hover:text-pink-700 px-2 py-1 hover:bg-pink-100 rounded-full transition-colors"
                      title="Copy tất cả link album"
                    >
                      <Copy size={10} />
                      Copy tất cả link
                    </button>
                  </div>

                  {/* Album list với thumbnail */}
                  <div className="divide-y divide-pink-50 bg-white">
                    {favoriteAlbums.map(({ style, album }) => {
                      const albumUrl = `${window.location.origin}/style/${style.slug}/album/${album.slug}`;
                      return (
                        <div key={`${style.id}:${album.id}`} className="flex items-center gap-3 p-2 hover:bg-pink-50/50 transition-colors group">
                          {/* Thumbnail */}
                          <div className="w-10 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                            {album.coverImage && (
                              <img
                                src={album.coverImage}
                                alt={album.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] text-pink-500 font-bold uppercase tracking-wider truncate">{style.title}</div>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, conceptId: `${style.id}:${album.id}` });
                                setShowFavorites(false);
                              }}
                              className="text-xs font-semibold text-dark group-hover:text-pink-600 text-left truncate w-full transition-colors"
                            >
                              {album.title}
                            </button>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={albumUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-dark/40 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Mở album"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink size={13} />
                            </a>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(albumUrl)}
                              className="p-1.5 text-dark/40 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                              title="Copy link"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Shareable preview link */}
                  <div className="px-3 py-2 bg-pink-50 border-t border-pink-100">
                    <a
                      href={`/favorites?preview=${favoriteAlbums.map(({ album }) => album.id).join(',')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline"
                    >
                      <ExternalLink size={10} />
                      Xem toàn bộ concept khách chọn (gallery view)
                    </a>
                  </div>
                </div>
              )}

              <select 
                value={formData.conceptId}
                onChange={(e) => setFormData({ ...formData, conceptId: e.target.value })}
                className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary"
                required
              >
                <option value="">-- Chọn Concept --</option>
                {styles.map(style => (
                  <optgroup key={style.id} label={style.title}>
                    <option value={style.id}>{style.title} (Toàn bộ)</option>
                    {style.albums.map(album => (
                      <option key={album.id} value={`${style.id}:${album.id}`}>
                        - {album.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-dark mb-2 flex items-center gap-2">
                <Camera size={14} className="text-blue-500" /> Ngày chụp ảnh
              </label>
              <input 
                type="date" 
                value={formData.shootingDate}
                onChange={(e) => setFormData({ ...formData, shootingDate: e.target.value })}
                className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-dark mb-2 flex items-center gap-2">
                <Heart size={14} className="text-pink-500" /> Ngày ăn hỏi
              </label>
              <input 
                type="date" 
                value={formData.engagementDate}
                onChange={(e) => setFormData({ ...formData, engagementDate: e.target.value })}
                className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-dark mb-2 flex items-center gap-2">
                <Calendar size={14} className="text-red-500" /> Ngày cưới
              </label>
              <input 
                type="date" 
                value={formData.weddingDate}
                onChange={(e) => setFormData({ ...formData, weddingDate: e.target.value })}
                className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-dark mb-2 flex items-center gap-2">
                <Package size={14} className="text-green-500" /> Ngày nhận ảnh
              </label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-dark mb-2 flex items-center gap-2">
                <DollarSign size={14} className="text-green-600" /> Giá trị hợp đồng (₫)
              </label>
              <input
                type="number"
                min="0"
                step="100000"
                value={formData.contractValue}
                onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                className="w-full p-3 bg-light-gray/50 border border-light-gray rounded-xl focus:outline-none focus:border-primary"
                placeholder="VD: 15000000"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-light-gray text-dark font-bold rounded-2xl hover:bg-gray-200 transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} />
              Lưu đăng ký
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const BulkDeleteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedIds: string[];
  consultations: Consultation[];
}> = ({ isOpen, onClose, onConfirm, selectedIds, consultations }) => {
  if (!isOpen) return null;

  const selectedItems = consultations.filter(c => selectedIds.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-light-gray flex justify-between items-center bg-red-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 size={24} /> Xác nhận xóa hàng loạt
            </h2>
            <p className="text-sm text-red-600/80 mt-1">Đang chọn {selectedIds.length} khách hàng để xóa</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          <p className="text-dark font-medium">Bạn có chắc chắn muốn xóa những khách hàng sau? <br/><span className="text-red-500 font-bold">Hành động này không thể hoàn tác!</span></p>
          
          <div className="bg-light-gray/30 rounded-xl border border-light-gray h-64 overflow-y-auto p-2">
            <ul className="divide-y divide-light-gray">
              {selectedItems.map((item, index) => (
                <li key={item.id} className="py-2 px-3 text-sm flex justify-between items-center hover:bg-white rounded-lg">
                  <div className="font-medium text-dark flex items-center gap-2">
                    <span className="text-dark/40 text-xs w-4">{index + 1}.</span>
                    {item.name}
                  </div>
                  <div className="text-dark/60 font-mono text-xs">{item.phone}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-light-gray bg-light-gray/10 flex gap-4 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-white text-dark font-bold rounded-2xl hover:bg-light-gray border border-light-gray transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            Xóa {selectedIds.length} khách
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const KanbanCard: React.FC<{
  consult: Consultation;
  isSuperAdmin: boolean;
  onStatusChange: (id: string, status: ConsultationStatus) => void;
  onDelete: (id: string) => void;
  onOpenReg: (c: Consultation) => void;
  onOpenScript: (c: Consultation) => void;
}> = ({ consult, isSuperAdmin, onStatusChange, onDelete, onOpenReg, onOpenScript }) => {
  const stale = isStaleNew(consult);
  const urgent = isUrgentNew(consult);
  const favCount = consult.favoriteIds?.length || 0;
  const isHot = favCount >= 3 || !!consult.luckyGift || consult.source === 'lucky_wheel';
  const isWarm = favCount >= 1 && !isHot;
  const hours = getHoursOld(consult.createdAt);
  const shootCountdown = getShootingCountdown(consult.shootingDate);

  return (
    <div className={`bg-white rounded-xl p-3 shadow-sm border transition-all ${stale ? 'border-orange-300 shadow-orange-100' : urgent ? 'border-yellow-300 shadow-yellow-50' : 'border-light-gray'}`}>
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold text-sm text-dark truncate">{consult.name}</span>
            {isHot && <span className="shrink-0 bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Hot</span>}
            {isWarm && <span className="shrink-0 bg-orange-100 text-orange-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Warm</span>}
          </div>
          {stale && (
            <p className="text-[10px] text-orange-600 font-bold mt-0.5">
              {hours >= 24 ? `${Math.floor(hours / 24)}N` : `${hours}h`} chưa gọi
            </p>
          )}
          {!stale && urgent && (
            <p className="text-[10px] text-yellow-600 font-bold mt-0.5">{hours}h chưa gọi</p>
          )}
        </div>
        <StatusDropdown status={consult.status} onChange={(s) => onStatusChange(consult.id, s)} />
      </div>
      <div className="flex items-center gap-1 mb-2 text-xs text-dark/70 font-mono">
        <Phone size={11} className="text-primary shrink-0" />
        {consult.phone}
      </div>
      <div className="flex gap-1.5 mb-2">
        <a href={`tel:${consult.phone}`} className="flex-1 py-1.5 text-[11px] font-bold bg-primary/90 text-white rounded-lg hover:bg-primary transition-colors flex items-center justify-center gap-1">
          <Phone size={10} /> Gọi
        </a>
        <a href={`https://zalo.me/${consult.phone}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-1.5 text-[11px] font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-1">
          <MessageCircle size={10} /> Zalo
        </a>
      </div>
      <div className="flex justify-between items-center text-[10px] text-dark/40 mb-1">
        <span>{consult.source === 'lucky_wheel' ? 'Vòng quay' : consult.source || 'Inquiry'}</span>
        <span className="flex items-center gap-0.5">
          <Clock size={9} />
          {hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}N`} trước
        </span>
      </div>
      {consult.assignedTo && (
        <div className="text-[10px] text-dark/50 flex items-center gap-1 mb-1">
          <User size={9} /> {consult.assignedTo}
        </div>
      )}
      {consult.notes && (
        <p className="text-[10px] text-dark/60 bg-light-gray/40 rounded p-1.5 line-clamp-2 mb-1">{consult.notes}</p>
      )}
      {consult.status === 'registered' && (
        <div className="flex flex-col gap-0.5 mt-1">
          {consult.shootingDate && (
            <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 flex-wrap">
              <Camera size={9} /> Chụp: {format(new Date(consult.shootingDate), 'dd/MM')}
              {shootCountdown === 1 && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded animate-pulse">D-1!</span>}
              {shootCountdown === 3 && <span className="bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded">D-3</span>}
            </div>
          )}
          {consult.contractValue && (
            <div className="text-[10px] text-green-600 font-bold flex items-center gap-1">
              <DollarSign size={9} /> {consult.contractValue.toLocaleString('vi-VN')}đ
            </div>
          )}
          <button
            onClick={() => onOpenReg(consult)}
            className="mt-1 w-full py-1 text-[10px] text-primary font-bold hover:bg-primary/10 rounded transition-colors border border-primary/20"
          >
            Sửa đăng ký
          </button>
        </div>
      )}
      <button
        onClick={() => onOpenScript(consult)}
        className="mt-1 w-full py-1 text-[10px] text-amber-600 font-bold hover:bg-amber-50 rounded transition-colors flex items-center justify-center gap-1 border border-amber-100"
      >
        <Zap size={9} /> Kịch bản chốt sale
      </button>
      {isSuperAdmin && (
        <button
          onClick={() => { if (window.confirm(`Xóa ${consult.name}?`)) onDelete(consult.id); }}
          className="mt-1 w-full py-1 text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          Xóa
        </button>
      )}
    </div>
  );
};

const KanbanView: React.FC<{
  consultations: Consultation[];
  isSuperAdmin: boolean;
  onStatusChange: (id: string, status: ConsultationStatus) => void;
  onDelete: (id: string) => void;
  onOpenReg: (c: Consultation) => void;
  onOpenScript: (c: Consultation) => void;
}> = ({ consultations, isSuperAdmin, onStatusChange, onDelete, onOpenReg, onOpenScript }) => {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid gap-3 min-w-[900px]" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {PIPELINE_STAGES.map(col => {
          const items = consultations.filter(c => col.keys.includes(c.status));
          return (
            <div key={col.label} className={`rounded-2xl border ${col.colCls} overflow-hidden flex flex-col`}>
              <div className={`px-3 py-2.5 font-bold text-xs flex justify-between items-center shrink-0 ${col.headerCls}`}>
                <span>{col.label}</span>
                <span className="bg-white/80 rounded-full px-2 py-0.5 text-xs font-bold">{items.length}</span>
              </div>
              <div className="p-2 space-y-2 overflow-y-auto custom-scrollbar flex-1" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                {items.length === 0 && <p className="text-center text-xs text-dark/40 py-8">Trống</p>}
                {items.map(c => (
                  <KanbanCard
                    key={c.id}
                    consult={c}
                    isSuperAdmin={isSuperAdmin}
                    onStatusChange={onStatusChange}
                    onDelete={onDelete}
                    onOpenReg={onOpenReg}
                    onOpenScript={onOpenScript}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TodayPanel: React.FC<{ consultations: Consultation[] }> = ({ consultations }) => {
  const [collapsed, setCollapsed] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const urgentUncontacted = consultations.filter(c => isUrgentNew(c) || isStaleNew(c));
  const followUpToday = consultations.filter(c => c.followUpDate === todayStr);
  const shootTomorrow = consultations.filter(c => getShootingCountdown(c.shootingDate) === 1);
  const shootIn3Days = consultations.filter(c => getShootingCountdown(c.shootingDate) === 3);

  const totalAlerts = urgentUncontacted.length + followUpToday.length + shootTomorrow.length + shootIn3Days.length;
  if (totalAlerts === 0) return null;

  const hasUrgent = urgentUncontacted.length > 0;

  return (
    <div className={`mb-6 rounded-2xl border overflow-hidden ${hasUrgent ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <Bell size={15} className={hasUrgent ? 'text-red-600' : 'text-amber-600'} />
          <span className={`font-bold text-sm ${hasUrgent ? 'text-red-800' : 'text-amber-800'}`}>
            Cần xử lý hôm nay
          </span>
          <span className={`text-white text-xs font-bold px-2 py-0.5 rounded-full ${hasUrgent ? 'bg-red-600' : 'bg-amber-500'}`}>
            {totalAlerts}
          </span>
        </div>
        <ChevronDown size={15} className={`transition-transform ${collapsed ? '' : 'rotate-180'} ${hasUrgent ? 'text-red-500' : 'text-amber-500'}`} />
      </button>

      {!collapsed && (
        <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {urgentUncontacted.length > 0 && (
            <div className="bg-white border border-red-200 rounded-xl p-3">
              <div className="text-[10px] font-black text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock size={10} /> Chưa gọi &gt;4h ({urgentUncontacted.length})
              </div>
              {urgentUncontacted.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-red-50 last:border-0 gap-2">
                  <span className="text-xs font-semibold text-dark truncate">{c.name}</span>
                  <a href={`tel:${c.phone}`} className="text-[10px] text-red-600 font-bold hover:underline whitespace-nowrap flex items-center gap-0.5 shrink-0">
                    <Phone size={9} />{c.phone}
                  </a>
                </div>
              ))}
              {urgentUncontacted.length > 4 && <p className="text-[10px] text-red-400 mt-1">+{urgentUncontacted.length - 4} khác</p>}
            </div>
          )}

          {followUpToday.length > 0 && (
            <div className="bg-white border border-blue-200 rounded-xl p-3">
              <div className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Phone size={10} /> Hẹn gọi hôm nay ({followUpToday.length})
              </div>
              {followUpToday.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-blue-50 last:border-0 gap-2">
                  <span className="text-xs font-semibold text-dark truncate">{c.name}</span>
                  <a href={`tel:${c.phone}`} className="text-[10px] text-blue-600 font-bold hover:underline whitespace-nowrap flex items-center gap-0.5 shrink-0">
                    <Phone size={9} />{c.phone}
                  </a>
                </div>
              ))}
              {followUpToday.length > 4 && <p className="text-[10px] text-blue-400 mt-1">+{followUpToday.length - 4} khác</p>}
            </div>
          )}

          {shootTomorrow.length > 0 && (
            <div className="bg-white border border-purple-200 rounded-xl p-3">
              <div className="text-[10px] font-black text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Camera size={10} /> Chụp ngày mai ({shootTomorrow.length})
              </div>
              {shootTomorrow.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-purple-50 last:border-0 gap-2">
                  <span className="text-xs font-semibold text-dark truncate">{c.name}</span>
                  <a href={`tel:${c.phone}`} className="text-[10px] text-purple-600 font-bold hover:underline whitespace-nowrap flex items-center gap-0.5 shrink-0">
                    <Phone size={9} />{c.phone}
                  </a>
                </div>
              ))}
              {shootTomorrow.length > 4 && <p className="text-[10px] text-purple-400 mt-1">+{shootTomorrow.length - 4} khác</p>}
            </div>
          )}

          {shootIn3Days.length > 0 && (
            <div className="bg-white border border-green-200 rounded-xl p-3">
              <div className="text-[10px] font-black text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Camera size={10} /> Chụp sau 3 ngày ({shootIn3Days.length})
              </div>
              {shootIn3Days.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-green-50 last:border-0 gap-2">
                  <span className="text-xs font-semibold text-dark truncate">{c.name}</span>
                  <span className="text-[10px] text-green-600 font-bold whitespace-nowrap shrink-0">
                    {c.shootingDate ? format(new Date(c.shootingDate), 'dd/MM') : ''}
                  </span>
                </div>
              ))}
              {shootIn3Days.length > 4 && <p className="text-[10px] text-green-400 mt-1">+{shootIn3Days.length - 4} khác</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const NoteInput: React.FC<{ initialNote: string; onSave: (note: string) => void }> = ({ initialNote, onSave }) => {
  const [note, setNote] = useState(initialNote || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);
    if (note !== initialNote) {
      onSave(note);
    }
  };

  if (!isEditing && !note) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="text-xs text-dark/40 hover:text-primary flex items-center gap-1 transition-colors"
      >
        <Edit3 size={12} />
        Thêm ghi chú
      </button>
    );
  }

  if (!isEditing && note) {
    return (
      <div 
        onClick={() => setIsEditing(true)}
        className="text-xs text-dark/80 bg-light-gray/50 p-2 rounded-lg cursor-pointer hover:bg-light-gray transition-colors"
        title="Bấm để sửa"
      >
        {note}
      </div>
    );
  }

  return (
    <textarea
      autoFocus
      value={note}
      onChange={(e) => setNote(e.target.value)}
      onBlur={handleBlur}
      placeholder="Nhập ghi chú..."
      className="w-full text-xs p-2 bg-white border border-light-gray rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none min-h-[60px]"
    />
  );
};

const TagsInput: React.FC<{ initialTags: string[]; onSave: (tags: string[]) => void }> = ({ initialTags, onSave }) => {
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [input, setInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const newTags = [...tags, input.trim()];
      setTags(newTags);
      setInput('');
      onSave(newTags);
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    setTags(newTags);
    onSave(newTags);
  };

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((tag, index) => (
        <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
          {tag}
          <button onClick={() => handleRemoveTag(index)} className="hover:text-blue-800"><X size={10} /></button>
        </span>
      ))}
      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleAddTag}
          onBlur={() => {
            setIsEditing(false);
            if (input.trim()) {
              const newTags = [...tags, input.trim()];
              setTags(newTags);
              setInput('');
              onSave(newTags);
            }
          }}
          placeholder="Thêm tag (Enter)"
          className="text-[10px] w-24 p-1 border border-light-gray rounded focus:outline-none focus:border-primary"
        />
      ) : (
        <button 
          onClick={() => setIsEditing(true)}
          className="text-[10px] text-dark/40 hover:text-primary flex items-center gap-1 transition-colors px-1"
          title="Thêm thẻ phân loại"
        >
          <Tag size={10} /> Thêm
        </button>
      )}
    </div>
  );
};

const SaleScriptPanel: React.FC<{
  consultation: Consultation;
  onClose: () => void;
  styles: Style[];
}> = ({ consultation, onClose, styles }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const stageIdx = getStageIndex(consultation.status);
  const scripts = generateSaleScript(consultation, styles);

  const favAlbumLinks = consultation.favoriteIds
    ? styles.flatMap(s => s.albums
        .filter(a => consultation.favoriteIds!.includes(a.id))
        .map(a => ({ name: `${a.title} (${s.title})`, url: `${window.location.origin}/style/${s.slug}/album/${a.slug}` })))
    : [];

  const zaloMsg = [
    `Dạ em chào ${consultation.name || 'anh/chị'} ạ! Em là [Tên] từ H2O Studio.`,
    favAlbumLinks.length > 0
      ? `Em gửi anh/chị link concept đã xem trên web để tham khảo:\n${favAlbumLinks.slice(0, 3).map((al, i) => `✨ ${i + 1}. ${al.name}: ${al.url}`).join('\n')}`
      : 'Em thấy mình đang quan tâm đến dịch vụ chụp ảnh cưới. Em gửi anh/chị một số bộ ảnh mẫu để tham khảo nhé!',
    '\nAnh/chị thấy concept nào ưng không ạ? Em tư vấn thêm cho mình nhé! 😊',
  ].join('\n');

  const copyScript = (text: string, idx: number) => {
    const clean = text.replace(/^"|"$/gm, '');
    navigator.clipboard.writeText(clean);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const stageLabels = ['Mới', 'Đã gọi', 'Tư vấn', 'Báo giá', 'Chốt'];
  const isVisible = (idx: number) => idx === stageIdx || idx === expandedStep;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-dark/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] bg-white shadow-2xl flex flex-col overflow-hidden border-l border-light-gray">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-dark text-sm">Kịch bản chốt sale</h3>
              <p className="text-[10px] text-dark/50">{consultation.name} · {consultation.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-amber-100 rounded-full transition-colors text-dark/50">
            <X size={16} />
          </button>
        </div>

        {/* Pipeline progress */}
        <div className="px-4 py-3 bg-gray-50 border-b border-light-gray shrink-0">
          <div className="flex items-center gap-1">
            {stageLabels.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 ${
                    i < stageIdx ? 'bg-green-500 border-green-500 text-white' :
                    i === stageIdx ? 'bg-amber-400 border-amber-400 text-white' :
                    'bg-white border-gray-200 text-gray-300'
                  }`}>
                    {i < stageIdx ? '✓' : i + 1}
                  </div>
                  <span className={`text-[8px] mt-0.5 font-bold whitespace-nowrap ${
                    i === stageIdx ? 'text-amber-600' : i < stageIdx ? 'text-green-600' : 'text-gray-300'
                  }`}>{label}</span>
                </div>
                {i < stageLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-3.5 ${i < stageIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {/* Customer data snapshot */}
          <div className="bg-light-gray/40 rounded-xl p-3 text-xs space-y-1.5">
            {(consultation.favoriteIds?.length || 0) > 0 && (
              <div className="flex items-center gap-1.5 text-pink-600 font-bold">
                <Heart size={11} fill="currentColor" />
                Đã thích {consultation.favoriteIds!.length} album concept
              </div>
            )}
            {consultation.luckyGift && (
              <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                <Gift size={11} />
                Quà vòng quay: {consultation.luckyGift}
              </div>
            )}
            {consultation.weddingDate && (
              <div className="flex items-center gap-1.5 text-red-600 font-bold">
                <Calendar size={11} />
                Ngày cưới: {format(new Date(consultation.weddingDate), 'dd/MM/yyyy')}
              </div>
            )}
            {consultation.message && (
              <p className="text-dark/50 pt-1.5 border-t border-light-gray italic">"{consultation.message}"</p>
            )}
          </div>

          {/* Sale scripts */}
          {scripts.map((s, idx) => {
            const done = idx < stageIdx;
            const current = idx === stageIdx;
            const expanded = isVisible(idx);
            return (
              <div
                key={s.step}
                className={`rounded-xl border overflow-hidden transition-all ${
                  current ? 'border-amber-300 shadow-sm shadow-amber-100' :
                  done ? 'border-green-200 opacity-60' :
                  'border-light-gray opacity-50'
                }`}
              >
                <button
                  className={`w-full px-3 py-2.5 flex items-center justify-between text-left ${
                    current ? 'bg-amber-50' : done ? 'bg-green-50/50' : 'bg-light-gray/20'
                  }`}
                  onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                      done ? 'bg-green-500 text-white' : current ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {done ? '✓' : s.step}
                    </span>
                    <span className={`text-xs font-bold ${current ? 'text-amber-700' : done ? 'text-green-700' : 'text-dark/40'}`}>
                      {s.title}
                    </span>
                    {current && <span className="text-[8px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-black">HIỆN TẠI</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {expanded && (
                      <button
                        onClick={e => { e.stopPropagation(); copyScript(s.script, idx); }}
                        className={`p-1 rounded text-[9px] font-bold transition-all flex items-center gap-0.5 ${
                          copiedIdx === idx ? 'bg-green-500 text-white' : 'bg-white border border-light-gray text-dark/50 hover:text-primary'
                        }`}
                      >
                        {copiedIdx === idx ? <><Check size={9} />Copied</> : <><Copy size={9} />Copy</>}
                      </button>
                    )}
                    <ChevronDown size={12} className={`text-dark/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expanded && (
                  <div className="px-3 pb-3 pt-1">
                    <p className="text-[11px] text-dark/80 whitespace-pre-line leading-relaxed">{s.script}</p>
                    {s.tips && (
                      <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">{s.tips}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Concept links */}
          {favAlbumLinks.length > 0 && (
            <div className="rounded-xl border border-pink-100 overflow-hidden">
              <div className="px-3 py-2 bg-pink-50 flex items-center gap-2">
                <Heart size={11} fill="currentColor" className="text-pink-500" />
                <span className="text-[11px] font-bold text-pink-700">Link concept khách thích — paste Zalo</span>
              </div>
              <div className="p-2 space-y-1.5 bg-white">
                {favAlbumLinks.map((al, i) => (
                  <div key={i} className="flex items-center gap-2 border border-pink-50 rounded-lg px-2 py-1.5">
                    <span className="text-[10px] text-dark/60 flex-1 truncate">{al.name}</span>
                    <a href={al.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 text-blue-400 hover:bg-blue-50 rounded">
                      <ExternalLink size={10} />
                    </a>
                    <button onClick={() => navigator.clipboard.writeText(al.url)} className="shrink-0 p-1 text-dark/30 hover:text-green-600 hover:bg-green-50 rounded">
                      <Copy size={10} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => navigator.clipboard.writeText(favAlbumLinks.map((al, i) => `${i + 1}. ${al.name}: ${al.url}`).join('\n'))}
                  className="w-full py-1.5 text-[10px] font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg border border-pink-100 flex items-center justify-center gap-1 transition-colors"
                >
                  <Copy size={9} /> Copy tất cả link concept
                </button>
              </div>
            </div>
          )}

          {/* Zalo message template */}
          <div className="rounded-xl border border-blue-100 overflow-hidden">
            <div className="px-3 py-2 bg-blue-50 flex items-center gap-2">
              <MessageCircle size={11} className="text-blue-500" />
              <span className="text-[11px] font-bold text-blue-700">Tin nhắn Zalo mẫu</span>
            </div>
            <div className="p-3 bg-white">
              <p className="text-[10px] text-dark/60 leading-relaxed bg-blue-50/30 rounded-lg p-2 border border-blue-50 whitespace-pre-line">{zaloMsg}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(zaloMsg); setCopiedZalo(true); setTimeout(() => setCopiedZalo(false), 2000); }}
                className={`mt-2 w-full py-1.5 text-[10px] font-bold rounded-lg border flex items-center justify-center gap-1 transition-colors ${
                  copiedZalo ? 'bg-green-500 text-white border-green-500' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                }`}
              >
                {copiedZalo ? <><Check size={9} />Đã copy!</> : <><Copy size={9} />Copy tin nhắn Zalo</>}
              </button>
            </div>
          </div>
        </div>

        {/* Footer quick actions */}
        <div className="px-4 py-3 border-t border-light-gray bg-gray-50 flex gap-2 shrink-0">
          <a
            href={`tel:${consultation.phone}`}
            className="flex-1 py-2.5 bg-primary text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors"
          >
            <Phone size={13} /> Gọi ngay
          </a>
          <a
            href={`https://zalo.me/${consultation.phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-600 transition-colors"
          >
            <MessageCircle size={13} /> Nhắn Zalo
          </a>
        </div>
      </div>
    </>
  );
};

const FunnelBar: React.FC<{ consultations: Consultation[] }> = ({ consultations }) => {
  const total = consultations.length;
  const registered = consultations.filter(c => c.status === 'registered').length;
  const newCount = consultations.filter(c => c.status === 'new').length;
  const convRate = total > 0 ? Math.round((registered / total) * 100) : 0;

  return (
    <div className="bg-white border border-light-gray rounded-2xl px-4 py-3 mb-4 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {PIPELINE_STAGES.map((stage, i) => {
          const count = consultations.filter(c => stage.keys.includes(c.status)).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const cfg = STATUS_CONFIG[stage.keys[0]];
          const isBottleneck = i === 1 && count === 0 && newCount > 0;
          return (
            <React.Fragment key={stage.label}>
              <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl border min-w-[80px] ${isBottleneck ? 'bg-red-50 border-red-300' : `${cfg.bgColor} ${cfg.borderColor}`}`}>
                <span className={`text-xl font-black ${isBottleneck ? 'text-red-500' : cfg.color}`}>{count}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isBottleneck ? 'text-red-500' : cfg.color}`}>{stage.label}</span>
                {isBottleneck ? <span className="text-[8px] text-red-500 font-bold animate-pulse">⚠ Cần gọi!</span> : <span className="text-[9px] text-dark/40">{pct}%</span>}
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <ArrowRight size={14} className="text-dark/20 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
        <div className="ml-3 pl-3 border-l border-light-gray flex flex-col items-center min-w-[70px]">
          <span className="text-xl font-black text-primary">{convRate}%</span>
          <span className="text-[9px] font-bold text-dark/50 uppercase tracking-wider text-center">Tỷ lệ chốt</span>
        </div>
      </div>
    </div>
  );
};

const StatusDropdown: React.FC<{
  status: ConsultationStatus;
  onChange: (status: ConsultationStatus) => void;
}> = ({ status, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;

  const OPTIONS: { value: ConsultationStatus; icon: React.ReactNode }[] = [
    { value: 'new',        icon: <Circle size={11} fill="currentColor" className="text-red-500" /> },
    { value: 'called',     icon: <Phone size={11} className="text-yellow-600" /> },
    { value: 'consulting', icon: <MessageCircle size={11} className="text-blue-600" /> },
    { value: 'quoted',     icon: <Tag size={11} className="text-purple-600" /> },
    { value: 'registered', icon: <CheckCircle size={11} className="text-green-600" /> },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${cfg.bgColor} ${cfg.color} hover:opacity-80 border ${cfg.borderColor}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        {cfg.shortLabel}
        <ChevronDown size={11} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-40 origin-top-right rounded-xl bg-white shadow-xl border border-light-gray overflow-hidden">
            {OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-light-gray/60 ${status === opt.value || (opt.value === 'called' && status === 'contacted') ? `font-bold ${STATUS_CONFIG[opt.value].color}` : 'text-dark/70'}`}
              >
                {opt.icon}
                {STATUS_CONFIG[opt.value].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const AdminConsultations: React.FC = () => {
  const { isAuthReady, consultations, hasMoreConsultations, isLoadingMore, loadMoreConsultations, updateConsultationStatus, updateConsultationRegistration, updateConsultationNotes, updateConsultationTags, updateConsultationField, deleteConsultation, isAdmin, isSuperAdmin, styles, handleLogout, markAllRead } = useApp();
  const [filter, setFilter] = useState<'all' | ConsultationStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'calendar' | 'kanban'>('list');
  const [regModalData, setRegModalData] = useState<Consultation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showFollowUpAlert, setShowFollowUpAlert] = useState(false);
  const [saleScriptLead, setSaleScriptLead] = useState<Consultation | null>(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatInitialPhone, setChatInitialPhone] = useState<string | null>(null);
  const [chatUnread, setChatUnread] = useState(0);
  const [chatNotif, setChatNotif] = useState<{ text: string; from: string } | null>(null);
  const chatPanelOpenRef = React.useRef(false);
  React.useEffect(() => { chatPanelOpenRef.current = chatPanelOpen; }, [chatPanelOpen]);

  useEffect(() => {
    if (!isAdmin) return;

    supabase.from('chat_sessions').select('unread_admin').then(({ data }) => {
      setChatUnread((data || []).reduce((s, x: any) => s + (x.unread_admin || 0), 0));
    });

    const sessCh = supabase
      .channel('admin_chat_unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, async () => {
        const { data } = await supabase.from('chat_sessions').select('unread_admin');
        setChatUnread((data || []).reduce((s, x: any) => s + (x.unread_admin || 0), 0));
      })
      .subscribe();

    const msgCh = supabase
      .channel('admin_new_msgs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const msg = payload.new as any;
        if (msg.sender !== 'customer') return;
        if (chatPanelOpenRef.current) return; // don't toast if panel already open
        const { data: sess } = await supabase.from('chat_sessions').select('name, phone').eq('id', msg.session_id).maybeSingle();
        const from = (sess as any)?.name || ((sess as any)?.phone?.startsWith('anon_') ? 'Khách ẩn danh' : (sess as any)?.phone) || 'Khách';
        setChatNotif({ text: msg.content, from });
        setTimeout(() => setChatNotif(null), 5000);
        if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`${from} nhắn tin`, { body: msg.content, icon: '/favicon.ico' });
        }
      })
      .subscribe();

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();

    return () => { sessCh.unsubscribe(); msgCh.unsubscribe(); };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) markAllRead();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !consultations.length) return;
    if (sessionStorage.getItem('followup_alert_dismissed')) return;
    const today = new Date().toISOString().split('T')[0];
    const due = consultations.filter(c => c.followUpDate && c.followUpDate <= today && c.status !== 'registered');
    if (due.length > 0) setShowFollowUpAlert(true);
  }, [isAdmin, consultations]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-dark/60 font-medium animate-pulse">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" />;
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportToExcel = () => {
    if (consultations.length === 0) return;

    const sourceLabel = (s?: string) => {
      const map: Record<string, string> = { zalo: 'Zalo', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', referral: 'Giới thiệu', lucky_wheel: 'Vòng quay', website: 'Website', other: 'Khác' };
      return s ? (map[s] || s) : '';
    };

    const rows = consultations.map(c => ({
      'Tên khách hàng':   c.name,
      'Số điện thoại':    c.phone,
      'Trạng thái':       getStatusLabel(c.status),
      'Nguồn':            sourceLabel(c.source),
      'Ngày đăng ký':     formatDate(c.createdAt),
      'Ngày chụp':        c.shootingDate || '',
      'Ngày ăn hỏi':      c.engagementDate || '',
      'Ngày cưới':        c.weddingDate || '',
      'Ngày giao ảnh':    c.deliveryDate || '',
      'Giá trị HĐ (đ)':   c.contractValue || '',
      'Quà tặng':         c.luckyGift || '',
      'Người phụ trách':  c.assignedTo || '',
      'Ngày follow-up':   c.followUpDate || '',
      'Tags':             (c.tags || []).join(', '),
      'Lời nhắn':         c.message || '',
      'Ghi chú sale':     c.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 22 }, { wch: 15 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 14 },
      { wch: 20 }, { wch: 35 }, { wch: 45 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Khách hàng');
    XLSX.writeFile(wb, `H2O_Studio_KhachHang_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const filteredConsultations = consultations
    .filter(c => {
      if (filter === 'all') return true;
      if (filter === 'called') return c.status === 'called' || c.status === 'contacted';
      return c.status === filter;
    })
    .filter(c => {
      const search = searchTerm.toLowerCase();
      const tagsString = (c.tags || []).join(' ').toLowerCase();
      return c.name.toLowerCase().includes(search) || c.phone.includes(search) || tagsString.includes(search);
    })
    .sort((a, b) => getLeadPriority(a) - getLeadPriority(b));

  const showNgayDuKienCol = filteredConsultations.some(c => c.status === 'registered' || !!c.date);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredConsultations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredConsultations.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const confirmBulkDelete = () => {
    selectedIds.forEach(id => {
      deleteConsultation(id);
    });
    setSelectedIds([]);
    setShowBulkDeleteModal(false);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleStatusChange = (id: string, newStatus: ConsultationStatus) => {
    if (newStatus === 'registered') {
      const consult = consultations.find(c => c.id === id);
      if (consult) setRegModalData(consult);
    } else {
      updateConsultationStatus(id, newStatus);
    }
  };

  // Analytics Data
  const totalLeads = consultations.length;
  const newLeads = consultations.filter(c => c.status === 'new').length;
  const calledLeads = consultations.filter(c => c.status === 'called' || c.status === 'contacted').length;
  const consultingLeads = consultations.filter(c => c.status === 'consulting').length;
  const quotedLeads = consultations.filter(c => c.status === 'quoted').length;
  const registeredLeads = consultations.filter(c => c.status === 'registered').length;
  const inProgressLeads = calledLeads + consultingLeads + quotedLeads;
  const conversionRate = totalLeads > 0 ? Math.round((registeredLeads / totalLeads) * 100) : 0;
  const totalContractValue = consultations.reduce((sum, c) => sum + (c.contractValue || 0), 0);
  const avgContractValue = registeredLeads > 0 ? Math.round(totalContractValue / registeredLeads) : 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueFollowUps = consultations.filter(c => c.followUpDate && c.followUpDate <= todayStr && c.status !== 'registered');

  const sourceStats = consultations.reduce((acc, c) => {
    let src = 'Trực tiếp';
    if (c.source === 'lucky_wheel') src = 'Vòng quay';
    else if (c.source) src = c.source;
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const staleLeads = consultations.filter(isStaleNew).length;

  // Week / month stats
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const getLeadDate = (c: Consultation) =>
    c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);

  const thisWeekLeads = consultations.filter(c => getLeadDate(c) >= oneWeekAgo).length;
  const lastWeekLeads = consultations.filter(c => { const d = getLeadDate(c); return d >= twoWeeksAgo && d < oneWeekAgo; }).length;
  const weekTrend = lastWeekLeads > 0 ? Math.round(((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100) : (thisWeekLeads > 0 ? 100 : 0);

  const thisMonthRevenue = consultations
    .filter(c => c.contractValue && getLeadDate(c) >= startOfMonth)
    .reduce((sum, c) => sum + (c.contractValue || 0), 0);

  const upcomingShootsCount = consultations.filter(c => {
    const days = getShootingCountdown(c.shootingDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  const extractMessageContent = (text: string | undefined) => {
    if (!text) return { message: '', links: [] };
    
    // Extract all URLs
    const urlRegex = /(https?:\/\/[^\s\n]+)/g;
    const links = text.match(urlRegex) || [];
    
    // Clean up message
    let message = text;
    links.forEach((link) => {
      message = message.replace(link, '');
    });
    // Remove labels for links
    message = message.replace(/Link danh sách:/g, '').replace(/Link:/g, '').trim();
    
    // Remove extra empty lines and standalone dashes from list items
    message = message.split('\n').map(line => line.trim()).filter(line => line.length > 0 && line !== '-').join('\n');
    
    return { message, links };
  };

  return (
    <Layout title="Quản lý khách hàng" showBack={true}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-dark">Quản lý khách hàng</h1>
            <p className="text-dark/60 mt-2">Theo dõi yêu cầu tư vấn và lịch trình chụp ảnh</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Quick Logout for Staff */}
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogout();
              }}
              className="px-3 py-2 text-dark/40 hover:text-dark rounded-xl text-xs font-medium hover:bg-light-gray transition-all flex items-center gap-1.5 border border-transparent hover:border-light-gray"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>

            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px] lg:max-w-xs">
              <input
                type="text"
                placeholder="Tìm tên hoặc số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-light-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
              <X 
                size={14} 
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-dark/40 cursor-pointer hover:text-dark transition-colors ${searchTerm ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setSearchTerm('')}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-light-gray">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  view === 'list' ? 'bg-primary text-white shadow-md' : 'text-dark/60 hover:bg-light-gray'
                }`}
              >
                <MessageCircle size={16} />
                Danh sách
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  view === 'calendar' ? 'bg-primary text-white shadow-md' : 'text-dark/60 hover:bg-light-gray'
                }`}
              >
                <Calendar size={16} />
                Lịch
              </button>
              <button
                onClick={() => setView('kanban')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  view === 'kanban' ? 'bg-primary text-white shadow-md' : 'text-dark/60 hover:bg-light-gray'
                }`}
              >
                <LayoutGrid size={16} />
                Kanban
              </button>
            </div>

            {/* Filter Toggle (Only for list view) */}
            {view === 'list' && (
              <div className="flex flex-wrap bg-white rounded-xl p-1 shadow-sm border border-light-gray gap-0.5">
                {([
                  { key: 'all', label: 'Tất cả' },
                  { key: 'new', label: 'Mới' },
                  { key: 'called', label: 'Đã gọi' },
                  { key: 'consulting', label: 'Tư vấn' },
                  { key: 'quoted', label: 'Báo giá' },
                  { key: 'registered', label: 'Đã chốt' },
                ] as const).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filter === f.key ? 'bg-dark text-white' : 'text-dark/60 hover:bg-light-gray'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => { setChatInitialPhone(null); setChatPanelOpen(true); setChatUnread(0); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all relative"
            >
              <MessageCircle size={16} />
              Chat khách
              {chatUnread > 0 && !chatPanelOpen && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 animate-pulse">
                  {chatUnread > 99 ? '99+' : chatUnread}
                </span>
              )}
            </button>

            <Link
              to="/admin/scripts"
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-sm hover:bg-amber-100 transition-all"
            >
              <BookOpen size={16} />
              Kho kịch bản
            </Link>

            <Link
              to="/admin/promotions"
              className="flex items-center gap-2 px-4 py-2.5 bg-pink-50 text-pink-700 border border-pink-200 rounded-xl font-bold text-sm hover:bg-pink-100 transition-all"
            >
              <Gift size={16} />
              Lịch KM
            </Link>

            <Link
              to="/admin/knowledge-base"
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl font-bold text-sm hover:bg-teal-100 transition-all"
            >
              <Database size={16} />
              Kho Câu Hỏi
            </Link>

            {isSuperAdmin && (
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
              >
                <Download size={18} />
                Xuất Excel (.xlsx)
              </button>
            )}
          </div>
        </div>

        {/* Action Row - Bulk Delete */}
        {selectedIds.length > 0 && isSuperAdmin && view === 'list' && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
            >
              <Trash2 size={18} /> Xóa {selectedIds.length} khách đã chọn
            </button>
          </div>
        )}

        {/* Analytics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-light-gray flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-dark/60 font-bold uppercase tracking-wider">Tổng Data</p>
              <p className="text-2xl font-bold text-dark">{totalLeads}</p>
            </div>
          </div>
          <div className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${staleLeads > 0 ? 'border-orange-300 bg-orange-50/30' : 'border-light-gray'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${staleLeads > 0 ? 'bg-orange-100 text-orange-500' : 'bg-red-50 text-red-500'}`}>
              <Circle size={24} />
            </div>
            <div>
              <p className="text-xs text-dark/60 font-bold uppercase tracking-wider">Mới {staleLeads > 0 ? `(${staleLeads} quá 48h)` : '(Chưa gọi)'}</p>
              <p className={`text-2xl font-bold ${staleLeads > 0 ? 'text-orange-600' : 'text-dark'}`}>{newLeads}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-light-gray flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-xs text-dark/60 font-bold uppercase tracking-wider">Đang xử lý</p>
              <p className="text-2xl font-bold text-dark">{inProgressLeads}</p>
              <p className="text-[10px] text-dark/40">{calledLeads} gọi · {consultingLeads} tư vấn · {quotedLeads} báo giá</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-light-gray flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs text-dark/60 font-bold uppercase tracking-wider">Tỷ lệ chốt</p>
              <p className="text-2xl font-bold text-dark">{conversionRate}%</p>
            </div>
          </div>
        </div>

        {/* Week / Month stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-light-gray flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-xs text-dark/60 font-bold uppercase tracking-wider">Tuần này</p>
              <p className="text-2xl font-bold text-dark">{thisWeekLeads} leads</p>
              <p className={`text-xs font-bold ${weekTrend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {weekTrend >= 0 ? '↑' : '↓'} {Math.abs(weekTrend)}% so tuần trước ({lastWeekLeads})
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-light-gray flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-xs text-dark/60 font-bold uppercase tracking-wider">Doanh thu tháng này</p>
              <p className="text-2xl font-bold text-dark">
                {thisMonthRevenue > 0 ? `${(thisMonthRevenue / 1_000_000).toFixed(1)}M` : '—'}đ
              </p>
            </div>
          </div>

          <div className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 ${upcomingShootsCount > 0 ? 'border-blue-200 bg-blue-50/30' : 'border-light-gray'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${upcomingShootsCount > 0 ? 'bg-blue-100 text-blue-500' : 'bg-blue-50 text-blue-300'}`}>
              <Camera size={22} />
            </div>
            <div>
              <p className="text-xs text-dark/60 font-bold uppercase tracking-wider">Lịch chụp 7 ngày tới</p>
              <p className={`text-2xl font-bold ${upcomingShootsCount > 0 ? 'text-blue-600' : 'text-dark'}`}>{upcomingShootsCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-light-gray flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-xs text-dark/60 font-bold uppercase tracking-wider">Avg hợp đồng</p>
              <p className="text-2xl font-bold text-dark">
                {avgContractValue > 0 ? `${(avgContractValue / 1_000_000).toFixed(1)}M` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Source Breakdown & Contract Value */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-dark/50 font-bold uppercase tracking-wider">Nguồn:</span>
            {Object.entries(sourceStats).map(([src, count]) => (
              <span key={src} className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs font-bold border border-light-gray shadow-sm">
                {src} <span className="text-primary ml-1">{count}</span>
              </span>
            ))}
          </div>
          {totalContractValue > 0 && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-xl">
              <DollarSign size={16} className="text-green-600" />
              <span className="text-xs text-green-700 font-bold uppercase tracking-wider">Tổng HĐ:</span>
              <span className="text-lg font-black text-green-700">{totalContractValue.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
        </div>

        <FunnelBar consultations={consultations} />
        <TodayPanel consultations={consultations} />

        {/* D1: Follow-up overdue alert modal */}
        {showFollowUpAlert && overdueFollowUps.length > 0 && (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-purple-600 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell size={20} className="text-white" />
                  <h3 className="text-white font-bold text-base">Hẹn gọi chưa thực hiện</h3>
                </div>
                <button
                  onClick={() => { setShowFollowUpAlert(false); sessionStorage.setItem('followup_alert_dismissed', '1'); }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 max-h-72 overflow-y-auto divide-y divide-light-gray">
                {overdueFollowUps.map(c => (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-dark text-sm truncate">{c.name}</p>
                      <p className="text-xs text-dark/50">{c.followUpDate} · {c.phone}</p>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors"
                    >
                      <Phone size={13} /> Gọi
                    </a>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => { setShowFollowUpAlert(false); sessionStorage.setItem('followup_alert_dismissed', '1'); }}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors"
                >
                  Đã biết, đóng lại
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'calendar' ? (
          <ScheduleCalendar consultations={consultations} styles={styles} />
        ) : view === 'kanban' ? (
          <KanbanView
            consultations={filteredConsultations}
            isSuperAdmin={isSuperAdmin}
            onStatusChange={handleStatusChange}
            onDelete={(id) => { if (window.confirm('Xóa khách hàng này?')) deleteConsultation(id); }}
            onOpenReg={(c) => setRegModalData(c)}
            onOpenScript={(c) => setSaleScriptLead(c)}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-light-gray overflow-hidden">
            {filteredConsultations.length === 0 ? (
              <div className="p-12 text-center text-dark/40">
                <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
                <p>Chưa có yêu cầu tư vấn nào.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-light-gray/50 border-b border-light-gray text-xs uppercase tracking-wider text-dark/60">
                      {isSuperAdmin && (
                        <th className="p-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.length > 0 && selectedIds.length === filteredConsultations.length}
                            onChange={toggleSelectAll}
                            className="rounded border-light-gray text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            title="Chọn tất cả"
                          />
                        </th>
                      )}
                      <th className="p-4 font-bold">Khách hàng</th>
                      <th className="p-4 font-bold">Liên hệ</th>
                      <th className="p-4 font-bold text-center">Trạng thái</th>
                      <th className="p-4 font-bold w-44">Sale & Hẹn gọi</th>
                      <th className="p-4 font-bold">Nguồn</th>
                      <th className="p-4 font-bold max-w-xs">Lời nhắn</th>
                      <th className="p-4 font-bold w-48">Ghi chú & Tags</th>
                      <th className="p-4 font-bold">Link tham khảo</th>
                      {showNgayDuKienCol && <th className="p-4 font-bold">Ngày dự kiến</th>}
                      <th className="p-4 font-bold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-gray">
                    {filteredConsultations.map((consult) => (
                      <tr key={consult.id} className={`hover:bg-light-gray/20 transition-colors ${consult.status === 'registered' ? 'bg-primary/5' : ''} ${selectedIds.includes(consult.id) ? 'bg-red-50/30' : isStaleNew(consult) ? 'bg-orange-50/40' : ''}`}>
                        {isSuperAdmin && (
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(consult.id)}
                              onChange={() => toggleSelect(consult.id)}
                              className="rounded border-light-gray text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-dark">{consult.name}</div>
                            {consult.favoriteIds && consult.favoriteIds.length > 0 && (
                              <div className="text-pink-500" title={`Khách đã thích ${consult.favoriteIds.length} mục`}>
                                <Heart size={14} fill="currentColor" />
                              </div>
                            )}
                            {/* Lead Scoring Badge */}
                            {(() => {
                              const favCount = consult.favoriteIds?.length || 0;
                              const isHot = favCount >= 3 || consult.luckyGift || consult.source === 'lucky_wheel';
                              const isWarm = favCount >= 1 && !isHot;

                              if (isHot) return <span className="bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">Hot</span>;
                              if (isWarm) return <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Warm</span>;
                              return null;
                            })()}
                            {isUrgentNew(consult) && (
                              <span className="bg-yellow-100 text-yellow-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {getHoursOld(consult.createdAt)}h chưa gọi
                              </span>
                            )}
                            {isStaleNew(consult) && (
                              <span className="bg-orange-100 text-orange-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {getHoursOld(consult.createdAt) >= 24 ? `${Math.floor(getHoursOld(consult.createdAt)/24)}N` : `${getHoursOld(consult.createdAt)}h`} chưa gọi
                              </span>
                            )}
                          </div>
                          {consult.status === 'registered' && consult.conceptId && (
                            <div className="text-[10px] text-primary font-bold uppercase mt-1">
                              {(() => {
                                if (consult.conceptId.includes(':')) {
                                  const [sId, aId] = consult.conceptId.split(':');
                                  const style = styles.find(s => s.id === sId);
                                  const album = style?.albums.find(a => a.id === aId);
                                  return album ? `${style?.title} - ${album.title}` : 'Đã chọn Album';
                                }
                                return styles.find(s => s.id === consult.conceptId)?.title || 'Đã chọn Concept';
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-dark/80">
                            <Phone size={14} className="text-primary" />
                            <a href={`tel:${consult.phone}`} className="hover:text-primary transition-colors font-medium">
                              {consult.phone}
                            </a>
                            <button 
                              onClick={() => handleCopy(consult.phone, `${consult.id}-phone`)}
                              className="p-1 hover:bg-light-gray rounded text-dark/40 hover:text-primary transition-colors"
                              title="Sao chép số điện thoại"
                            >
                              {copiedId === `${consult.id}-phone` ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-dark/60 mt-1">
                            <Clock size={12} />
                            {formatDate(consult.createdAt)}
                          </div>
                          <div className="flex gap-1.5 mt-2">
                            <a
                              href={`tel:${consult.phone}`}
                              className="flex items-center gap-1 px-2 py-1 bg-primary text-white rounded-lg text-[10px] font-bold hover:bg-primary/90 transition-colors"
                              title="Gọi ngay"
                            >
                              <Phone size={10} /> Gọi
                            </a>
                            <a
                              href={`https://zalo.me/${consult.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-lg text-[10px] font-bold hover:bg-blue-600 transition-colors"
                              title="Nhắn Zalo"
                            >
                              <MessageCircle size={10} /> Zalo
                            </a>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <StatusDropdown
                            status={consult.status}
                            onChange={(newStatus) => handleStatusChange(consult.id, newStatus)}
                          />
                        </td>
                        <td className="p-4 align-top space-y-2">
                          <div className="flex flex-col gap-2">
                            <input
                              type="text"
                              placeholder="Tên Sale..."
                              value={consult.assignedTo || ''}
                              onChange={(e) => updateConsultationField(consult.id, 'assignedTo', e.target.value)}
                              className="w-full text-xs p-2 bg-light-gray/50 border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                            />
                            <input
                              type="date"
                              value={consult.followUpDate || ''}
                              onChange={(e) => updateConsultationField(consult.id, 'followUpDate', e.target.value)}
                              className="w-full text-xs p-2 bg-light-gray/50 border border-light-gray rounded-lg focus:outline-none focus:border-primary"
                              title="Ngày hẹn gọi lại"
                            />
                          </div>
                        </td>
                        <td className="p-4">
                          {consult.source === 'lucky_wheel' ? (
                            <div className="text-[10px] text-[#A4756B] font-bold uppercase mt-1 flex items-center gap-1">
                              <Gift size={10} /> Vòng quay
                            </div>
                          ) : consult.message?.includes("Khách hàng vừa mở App") ? (
                            <div className="text-[10px] text-blue-500 font-bold uppercase mt-1 flex items-center gap-1">
                              <Circle size={6} fill="currentColor" /> Visitor
                            </div>
                          ) : consult.source ? (
                            <div className="text-[10px] text-purple-500 font-bold uppercase mt-1 flex items-center gap-1">
                              <Tag size={10} /> {consult.source}
                            </div>
                          ) : (
                            <div className="text-[10px] text-green-500 font-bold uppercase mt-1 flex items-center gap-1">
                              <Circle size={6} fill="currentColor" /> Inquiry
                            </div>
                          )}
                        </td>
                        <td className="p-4 max-w-xs">
                          {consult.luckyGift && (
                            <div className="mb-2 inline-flex items-center gap-1 bg-[#ECB697]/20 text-[#A4756B] px-2 py-1 rounded-lg text-xs font-bold border border-[#ECB697]/30">
                              <Gift size={12} /> Quà: {consult.luckyGift}
                            </div>
                          )}
                          <p className="text-sm text-dark/70 truncate" title={extractMessageContent(consult.message).message}>
                            {extractMessageContent(consult.message).message || <span className="italic text-dark/30">Không có lời nhắn</span>}
                          </p>
                        </td>
                        <td className="p-4 align-top space-y-2">
                          <NoteInput
                            initialNote={consult.notes || ''}
                            onSave={(note) => updateConsultationNotes(consult.id, note)}
                          />
                          <TagsInput
                            initialTags={consult.tags || []}
                            onSave={(tags) => updateConsultationTags(consult.id, tags)}
                          />
                        </td>
                        <td className="p-4">
                          {extractMessageContent(consult.message).links.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {extractMessageContent(consult.message).links.map((url, i) => (
                                <div key={i} className="flex items-center gap-1 whitespace-nowrap text-xs">
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline" title={url}>
                                    <ExternalLink size={12} />
                                    Xem ngay
                                  </a>
                                  <button
                                    onClick={() => handleCopy(url, `${consult.id}-link-${i}`)}
                                    className="p-1 hover:bg-light-gray rounded text-dark/40 hover:text-primary transition-colors"
                                    title="Copy link"
                                  >
                                    {copiedId === `${consult.id}-link-${i}` ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="italic text-dark/30 text-xs">Không có</span>
                          )}
                        </td>
                        {showNgayDuKienCol && (
                          <td className="p-4 text-sm text-dark/80">
                            {consult.status === 'registered' ? (
                              <div
                                className="space-y-1 cursor-pointer hover:bg-primary/10 p-1 rounded transition-colors"
                                onClick={() => setRegModalData(consult)}
                                title="Bấm để sửa thông tin đăng ký"
                              >
                                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[10px] uppercase flex-wrap">
                                  <Camera size={10} /> Chụp: {consult.shootingDate ? format(new Date(consult.shootingDate), 'dd/MM') : '??'}
                                  {getShootingCountdown(consult.shootingDate) === 1 && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded animate-pulse">D-1!</span>}
                                  {getShootingCountdown(consult.shootingDate) === 3 && <span className="bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded">D-3</span>}
                                  {(() => { const cd = getShootingCountdown(consult.shootingDate); return cd !== null && cd < -1; })() && <span className="bg-yellow-400 text-yellow-900 text-[9px] px-1.5 py-0.5 rounded font-bold" title="Ngày chụp đã qua — nhắc xin review Google">⭐ Xin review</span>}
                                </div>
                                <div className="flex items-center gap-1.5 text-red-600 font-bold text-[10px] uppercase">
                                  <Calendar size={10} /> Cưới: {consult.weddingDate ? format(new Date(consult.weddingDate), 'dd/MM') : '??'}
                                </div>
                                {consult.contractValue && (
                                  <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase">
                                    <DollarSign size={10} /> {consult.contractValue.toLocaleString('vi-VN')}đ
                                  </div>
                                )}
                              </div>
                            ) : consult.date ? (
                              <div className="flex items-center gap-1.5 text-primary font-medium">
                                <Calendar size={14} />
                                {format(new Date(consult.date), 'dd/MM/yyyy')}
                              </div>
                            ) : (
                              <span className="italic text-dark/30">Chưa chọn</span>
                            )}
                          </td>
                        )}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSaleScriptLead(consult)}
                              className="p-2 rounded-xl transition-all flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white"
                              title="Kịch bản chốt sale"
                            >
                              <Zap size={16} />
                            </button>
                            <button
                              onClick={() => {
                                let conceptName = '';
                                if (consult.conceptId) {
                                  if (consult.conceptId.includes(':')) {
                                    const [sId, aId] = consult.conceptId.split(':');
                                    const style = styles.find(s => s.id === sId);
                                    const album = style?.albums.find(a => a.id === aId);
                                    conceptName = album ? `${style?.title} - ${album.title}` : 'Đã chọn Album';
                                  } else {
                                    conceptName = styles.find(s => s.id === consult.conceptId)?.title || 'Đã chọn Concept';
                                  }
                                }
                                const summary = `Dạ em chào anh/chị ${consult.name}, em là chuyên viên tư vấn từ H2O Studio. Em thấy mình đang quan tâm đến dịch vụ chụp ảnh cưới${conceptName ? ' (Concept: ' + conceptName + ')' : ''}, anh chị cho em xin phép tư vấn chi tiết nhé...`;
                                handleCopy(summary, `${consult.id}-all`);
                              }}
                              className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                                copiedId === `${consult.id}-all` ? 'bg-green-500 text-white' : 'bg-light-gray text-dark/60 hover:bg-dark hover:text-white'
                              }`}
                              title="Sao chép kịch bản tin nhắn Zalo"
                            >
                              {copiedId === `${consult.id}-all` ? <Check size={16} /> : <MessageCircle size={16} />}
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này? Hành động này không thể hoàn tác.')) {
                                    deleteConsultation(consult.id);
                                  }
                                }}
                                className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                                title="Xóa khách hàng"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Load More */}
        {view === 'list' && hasMoreConsultations && (
          <div className="flex justify-center py-6">
            <button
              onClick={loadMoreConsultations}
              disabled={isLoadingMore}
              className="px-6 py-2.5 rounded-full border border-light-gray text-sm font-medium text-dark/60 hover:bg-light-gray/50 disabled:opacity-50 transition-colors"
            >
              {isLoadingMore ? 'Đang tải...' : 'Xem thêm khách hàng'}
            </button>
          </div>
        )}
      </div>

      {regModalData && (
        <RegistrationModal 
          isOpen={!!regModalData}
          onClose={() => setRegModalData(null)}
          consultation={regModalData}
          onSave={(data) => updateConsultationRegistration(regModalData.id, data)}
        />
      )}

      {showBulkDeleteModal && (
        <BulkDeleteModal
          isOpen={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={confirmBulkDelete}
          selectedIds={selectedIds}
          consultations={filteredConsultations}
        />
      )}

      {saleScriptLead && (
        <SaleScriptPanel
          consultation={saleScriptLead}
          onClose={() => setSaleScriptLead(null)}
          styles={styles}
        />
      )}

      <AdminChatPanel
        isOpen={chatPanelOpen}
        onClose={() => setChatPanelOpen(false)}
        initialPhone={chatInitialPhone}
        consultations={consultations}
      />

      {chatNotif && (
        <div
          className="fixed bottom-6 right-6 z-[70] bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-start gap-3 max-w-[300px] cursor-pointer animate-fade-in"
          onClick={() => { setChatNotif(null); setChatPanelOpen(true); setChatUnread(0); }}
        >
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <MessageCircle size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-blue-300 mb-0.5">{chatNotif.from} nhắn tin</p>
            <p className="text-sm text-white truncate">{chatNotif.text}</p>
            <p className="text-[10px] text-gray-400 mt-1">Nhấn để trả lời</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setChatNotif(null); }}
            className="text-gray-500 hover:text-white shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </Layout>
  );
};

export default AdminConsultations;
