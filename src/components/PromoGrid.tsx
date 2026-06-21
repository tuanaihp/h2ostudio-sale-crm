import React, { useEffect, useState } from 'react';
import { ChevronRight, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import { BannerItem } from '../types';
import { getDisplayImageUrl } from '../utils/image';

interface ActivePromo {
  id: string;
  title: string;
  emoji: string;
  end_date: string;
}

// Kept for AdminSettings import compatibility
export const DEFAULT_SERVICE_CARDS: BannerItem[] = [];

interface Props {
  onConsult?: () => void;
}

export const PromoGrid: React.FC<Props> = ({ onConsult }) => {
  const { styles } = useApp();
  const [promos, setPromos] = useState<ActivePromo[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('promotions')
      .select('id,title,emoji,end_date')
      .eq('enabled', true)
      .eq('show_on_website', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setPromos(data ?? []));
  }, []);

  const topStyles = styles.filter(s => !s.deleted).slice(0, 3);

  return (
    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* ── Left: Top concepts ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-50">
          <span className="text-[20px] leading-none">🏆</span>
          <h3 className="font-bold text-dark text-[15px]">Top concept tuần này</h3>
        </div>

        {/* List */}
        <div className="flex-1 px-3 py-3 space-y-1">
          {topStyles.map((style, i) => (
            <a
              key={style.id}
              href={`/style/${style.slug}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-light-gray/70 transition-colors group"
            >
              {/* Rank */}
              <span className={`text-[12px] font-black w-5 shrink-0 text-center ${
                i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : 'text-orange-400'
              }`}>
                #{i + 1}
              </span>

              {/* Thumbnail */}
              <div
                className="w-11 h-11 rounded-xl bg-cover bg-center shrink-0 bg-light-gray"
                style={{ backgroundImage: style.coverImage ? `url(${getDisplayImageUrl(style.coverImage)})` : undefined }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-dark text-[13px] truncate group-hover:text-primary transition-colors">
                  {style.title}
                </p>
                {style.description && (
                  <p className="text-[11px] text-dark/40 truncate mt-0.5">{style.description}</p>
                )}
              </div>

              {/* Heart icon */}
              <Heart size={13} className="text-rose-300 shrink-0 group-hover:text-rose-400 transition-colors fill-current" />
            </a>
          ))}

          {topStyles.length === 0 && (
            <p className="text-sm text-dark/30 text-center py-6">Chưa có dữ liệu</p>
          )}
        </div>

        {/* CTA */}
        <div className="px-5 pb-5 pt-2">
          <a
            href="/favorites"
            className="flex items-center justify-center gap-1.5 border-2 border-primary/15 text-primary font-bold text-[13px] py-2.5 rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition"
          >
            Xem album yêu thích <ChevronRight size={14} />
          </a>
        </div>
      </div>

      {/* ── Right: Active promotions ── */}
      <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 rounded-3xl border border-rose-100/60 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-rose-100/40">
          <span className="text-[20px] leading-none">🎉</span>
          <h3 className="font-bold text-dark text-[15px]">Khuyến mãi đang chạy</h3>
        </div>

        {/* Promo list */}
        <div className="flex-1 px-5 py-4 space-y-3.5">
          {promos.map((promo, i) => (
            <div key={promo.id} className="flex items-start gap-3">
              <span className="text-[18px] leading-none shrink-0 mt-0.5">{promo.emoji || '🎁'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-dark text-[13px] leading-snug">{promo.title}</p>
                <p className="text-[10px] text-dark/40 mt-1 flex items-center gap-1">
                  <span>⏰</span>
                  Hết hạn {new Date(promo.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
              {i === 0 && (
                <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide">
                  Hot
                </span>
              )}
            </div>
          ))}

          {promos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <p className="text-3xl mb-2">✨</p>
              <p className="text-sm font-bold text-dark/50">Sắp có ưu đãi mới</p>
              <p className="text-[11px] text-dark/30 mt-1">Liên hệ H2O để nhận báo giá tốt nhất</p>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="px-5 pb-5 pt-2 space-y-2">
          {onConsult && (
            <button
              onClick={onConsult}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-secondary to-primary text-white font-bold text-[13px] py-2.5 rounded-2xl hover:opacity-90 transition shadow-md shadow-primary/25"
            >
              Nhận tư vấn ngay ✨
            </button>
          )}
          <a
            href="/promotions"
            className="flex items-center justify-center gap-1.5 border-2 border-rose-200 text-rose-500 font-bold text-[13px] py-2.5 rounded-2xl hover:bg-rose-50 transition"
          >
            Xem tất cả ưu đãi <ChevronRight size={14} />
          </a>
        </div>
      </div>

    </div>
  );
};
