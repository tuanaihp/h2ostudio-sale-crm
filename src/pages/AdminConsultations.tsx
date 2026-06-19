import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { Phone, MessageCircle, Clock, CheckCircle, Circle, Edit3, ChevronDown, Calendar, X, Save, Camera, Heart, Package, User, Copy, Check, Download, Tag, TrendingUp, Users, Gift, Trash2, LogOut, ExternalLink, DollarSign, LayoutGrid, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { ScheduleCalendar } from '../components/ScheduleCalendar';
import { Consultation } from '../types';

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
  if (c.status === 'contacted') return 5;
  return 6;
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
                <div className="mb-4 p-3 bg-pink-50/50 rounded-xl border border-pink-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {favoriteAlbums.map(({ style, album }) => (
                    <button
                      key={`${style.id}:${album.id}`}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, conceptId: `${style.id}:${album.id}` });
                        setShowFavorites(false);
                      }}
                      className="text-left p-2 hover:bg-white rounded-lg border border-transparent hover:border-pink-200 transition-all group"
                    >
                      <div className="text-[10px] text-pink-500 font-bold uppercase tracking-wider">{style.title}</div>
                      <div className="text-sm font-medium text-dark group-hover:text-pink-600">{album.title}</div>
                    </button>
                  ))}
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
  onStatusChange: (id: string, status: 'new' | 'contacted' | 'registered') => void;
  onDelete: (id: string) => void;
  onOpenReg: (c: Consultation) => void;
}> = ({ consult, isSuperAdmin, onStatusChange, onDelete, onOpenReg }) => {
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
  onStatusChange: (id: string, status: 'new' | 'contacted' | 'registered') => void;
  onDelete: (id: string) => void;
  onOpenReg: (c: Consultation) => void;
}> = ({ consultations, isSuperAdmin, onStatusChange, onDelete, onOpenReg }) => {
  const columns: { key: 'new' | 'contacted' | 'registered'; label: string; headerCls: string; colCls: string }[] = [
    { key: 'new', label: 'Chưa liên hệ', headerCls: 'bg-red-100 text-red-700', colCls: 'bg-red-50/30 border-red-200' },
    { key: 'contacted', label: 'Đã liên hệ', headerCls: 'bg-green-100 text-green-700', colCls: 'bg-green-50/30 border-green-200' },
    { key: 'registered', label: 'Đã đăng ký', headerCls: 'bg-primary/10 text-primary', colCls: 'bg-primary/5 border-primary/20' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(col => {
        const items = consultations.filter(c => c.status === col.key);
        return (
          <div key={col.key} className={`rounded-2xl border ${col.colCls} overflow-hidden flex flex-col`}>
            <div className={`px-4 py-3 font-bold text-sm flex justify-between items-center shrink-0 ${col.headerCls}`}>
              <span>{col.label}</span>
              <span className="bg-white/80 rounded-full px-2 py-0.5 text-xs font-bold">{items.length}</span>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto custom-scrollbar flex-1" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              {items.length === 0 && <p className="text-center text-xs text-dark/40 py-8">Trống</p>}
              {items.map(c => (
                <KanbanCard
                  key={c.id}
                  consult={c}
                  isSuperAdmin={isSuperAdmin}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  onOpenReg={onOpenReg}
                />
              ))}
            </div>
          </div>
        );
      })}
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

const StatusDropdown: React.FC<{ 
  status: 'new' | 'contacted' | 'registered'; 
  onChange: (status: 'new' | 'contacted' | 'registered') => void 
}> = ({ status, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusConfig = () => {
    switch (status) {
      case 'new': return { label: 'Chưa liên hệ', color: 'bg-red-50 text-red-600 hover:bg-red-100', icon: <Circle size={12} fill="currentColor" /> };
      case 'contacted': return { label: 'Đã liên hệ', color: 'bg-green-50 text-green-600 hover:bg-green-100', icon: <CheckCircle size={12} /> };
      case 'registered': return { label: 'Đã đăng ký', color: 'bg-primary/10 text-primary hover:bg-primary/20', icon: <Calendar size={12} /> };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${config.color}`}
      >
        {config.icon}
        {config.label}
        <ChevronDown size={12} className="ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 z-20 mt-1 w-36 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
            <div className="py-1">
              <button
                onClick={() => { onChange('new'); setIsOpen(false); }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-xs hover:bg-light-gray ${status === 'new' ? 'bg-red-50/50 text-red-600 font-medium' : 'text-dark/80'}`}
              >
                <Circle size={12} fill={status === 'new' ? 'currentColor' : 'none'} />
                Chưa liên hệ
              </button>
              <button
                onClick={() => { onChange('contacted'); setIsOpen(false); }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-xs hover:bg-light-gray ${status === 'contacted' ? 'bg-green-50/50 text-green-600 font-medium' : 'text-dark/80'}`}
              >
                <CheckCircle size={12} />
                Đã liên hệ
              </button>
              <button
                onClick={() => { onChange('registered'); setIsOpen(false); }}
                className={`flex w-full items-center gap-2 px-4 py-2 text-xs hover:bg-light-gray ${status === 'registered' ? 'bg-primary/10 text-primary font-medium' : 'text-dark/80'}`}
              >
                <Calendar size={12} />
                Đã đăng ký
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AdminConsultations: React.FC = () => {
  const { isAuthReady, consultations, hasMoreConsultations, isLoadingMore, loadMoreConsultations, updateConsultationStatus, updateConsultationRegistration, updateConsultationNotes, updateConsultationTags, updateConsultationField, deleteConsultation, isAdmin, isSuperAdmin, styles, handleLogout, markAllRead } = useApp();
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'registered'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'calendar' | 'kanban'>('list');
  const [regModalData, setRegModalData] = useState<Consultation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => {
    if (isAdmin) markAllRead();
  }, [isAdmin]);

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

  const exportToCSV = () => {
    if (consultations.length === 0) return;

    // CSV Header
    const headers = ['Tên khách hàng', 'Số điện thoại', 'Trạng thái', 'Ngày yêu cầu', 'Lời nhắn', 'Ghi chú Sale', 'Concept đăng ký', 'Ngày chụp', 'Ngày cưới'];
    
    // CSV Data
    const rows = filteredConsultations.map(c => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.status === 'new' ? 'Mới' : c.status === 'contacted' ? 'Đã liên hệ' : 'Đã đăng ký'}"`,
      `"${formatDate(c.createdAt)}"`,
      `"${(c.message || '').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      `"${c.conceptId || ''}"`,
      `"${c.shootingDate || ''}"`,
      `"${c.weddingDate || ''}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `H2O_Studio_KhachHang_${format(new Date(), 'ddMMyyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredConsultations = consultations
    .filter(c => filter === 'all' ? true : c.status === filter)
    .filter(c => {
      const search = searchTerm.toLowerCase();
      const tagsString = (c.tags || []).join(' ').toLowerCase();
      return c.name.toLowerCase().includes(search) || c.phone.includes(search) || tagsString.includes(search);
    })
    .sort((a, b) => getLeadPriority(a) - getLeadPriority(b));

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

  const handleStatusChange = (id: string, newStatus: 'new' | 'contacted' | 'registered') => {
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
  const contactedLeads = consultations.filter(c => c.status === 'contacted').length;
  const registeredLeads = consultations.filter(c => c.status === 'registered').length;
  const conversionRate = totalLeads > 0 ? Math.round((registeredLeads / totalLeads) * 100) : 0;
  const totalContractValue = consultations.reduce((sum, c) => sum + (c.contractValue || 0), 0);

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
              className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100 flex items-center gap-2"
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
              <div className="flex bg-white rounded-xl p-1 shadow-sm border border-light-gray">
                {(['all', 'new', 'contacted', 'registered'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === f ? 'bg-dark text-white' : 'text-dark/60 hover:bg-light-gray'
                    }`}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'new' ? 'Mới' : f === 'contacted' ? 'Đã liên hệ' : 'Đã đăng ký'}
                  </button>
                ))}
              </div>
            )}

            {isSuperAdmin && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
              >
                <Download size={18} />
                Xuất Excel (CSV)
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
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-dark/60 font-bold uppercase tracking-wider">Đã liên hệ</p>
              <p className="text-2xl font-bold text-dark">{contactedLeads}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

        <TodayPanel consultations={consultations} />

        {view === 'calendar' ? (
          <ScheduleCalendar consultations={consultations} styles={styles} />
        ) : view === 'kanban' ? (
          <KanbanView
            consultations={filteredConsultations}
            isSuperAdmin={isSuperAdmin}
            onStatusChange={handleStatusChange}
            onDelete={(id) => { if (window.confirm('Xóa khách hàng này?')) deleteConsultation(id); }}
            onOpenReg={(c) => setRegModalData(c)}
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
                      <th className="p-4 font-bold">Nguồn</th>
                      <th className="p-4 font-bold">Ngày dự kiến</th>
                      <th className="p-4 font-bold">Lời nhắn</th>
                      <th className="p-4 font-bold">Link tham khảo</th>
                      <th className="p-4 font-bold text-center">Trạng thái</th>
                      <th className="p-4 font-bold w-48">Sale phụ trách & Hẹn gọi</th>
                      <th className="p-4 font-bold w-48">Ghi chú & Tags</th>
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
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
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
    </Layout>
  );
};

export default AdminConsultations;
