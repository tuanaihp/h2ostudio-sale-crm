import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
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

const TOP_BADGE = [
  { label: 'TOP1', bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-200' },
  { label: 'TOP2', bg: 'bg-blue-50',  text: 'text-blue-500',  border: 'border-blue-200'  },
  { label: 'TOP3', bg: 'bg-rose-50',  text: 'text-rose-400',  border: 'border-rose-200'  },
];

export const PromoGrid: React.FC<Props> = ({ onConsult }) => {
  const { styles } = useApp();
  const [promos, setPromos]       = useState<ActivePromo[]>([]);
  const [stylesReady, setStylesReady] = useState(false);

  useEffect(() => { if (styles.length > 0) setStylesReady(true); }, [styles]);
  useEffect(() => {
    const t = setTimeout(() => setStylesReady(true), 2500);
    return () => clearTimeout(t);
  }, []);

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
      .limit(3)
      .then(({ data }) => setPromos(data ?? []));
  }, []);

  const topStyles = styles.filter(s => !s.deleted).slice(0, 3);

  return (
    <div className="mt-10 grid grid-cols-2 gap-3 md:gap-4">

      {/* ══════════════════════════════════════════
          LEFT — Top concept tuần này
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl md:rounded-3xl overflow-hidden flex flex-col shadow-sm border border-gray-100">

        {/* Header */}
        <a href="/favorites"
          className="flex items-center justify-between px-3 md:px-5 pt-3 md:pt-4 pb-2 md:pb-3 border-b border-gray-50 group">
          <span className="font-bold text-dark text-[12px] md:text-[15px] flex items-center gap-1.5">
            <span className="text-[16px] md:text-[20px]">🏆</span>
            <span className="leading-tight">Top concept<br className="md:hidden" /><span className="hidden md:inline"> </span>tuần này</span>
          </span>
          <ChevronRight size={14} className="text-dark/25 group-hover:text-primary transition-colors shrink-0" />
        </a>

        {/* List */}
        <div className="flex-1 px-2 md:px-4 py-2 md:py-3 space-y-1 md:space-y-2">
          {!stylesReady ? (
            [0,1,2].map(i => (
              <div key={i} className="flex items-center gap-2 px-1 py-1.5 animate-pulse">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))
          ) : topStyles.length > 0 ? (
            topStyles.map((style, i) => {
              const badge = TOP_BADGE[i] ?? TOP_BADGE[2];
              return (
                <a key={style.id} href={`/style/${style.slug}`}
                  className="flex items-center gap-2 md:gap-3 px-1 md:px-2 py-1.5 md:py-2 rounded-xl hover:bg-light-gray/60 transition-colors group">
                  {/* Thumbnail */}
                  <div
                    className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-cover bg-center shrink-0 bg-gray-100"
                    style={{ backgroundImage: style.coverImage ? `url(${getDisplayImageUrl(style.coverImage)})` : undefined }}
                  />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] md:text-[13px] text-dark truncate leading-tight group-hover:text-primary transition-colors">
                      {style.title}
                    </p>
                    <span className={`inline-block text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded-full border mt-0.5 ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </div>
                </a>
              );
            })
          ) : (
            <p className="text-[11px] text-dark/30 text-center py-4">Chưa có dữ liệu</p>
          )}
        </div>

        {/* Footer CTA */}
        <a href="/favorites"
          className="mx-2 md:mx-4 mb-2 md:mb-4 flex items-center justify-center gap-1 text-[10px] md:text-[12px] font-bold text-primary/70 hover:text-primary py-2 border border-primary/15 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition">
          Xem tất cả <ChevronRight size={11} className="md:hidden" /><ChevronRight size={13} className="hidden md:block" />
        </a>
      </div>

      {/* ══════════════════════════════════════════
          RIGHT — Khuyến mãi đang chạy
      ══════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-rose-50 to-pink-50/60 rounded-2xl md:rounded-3xl overflow-hidden flex flex-col border border-rose-100/70 shadow-sm">

        {/* Header */}
        <a href="/promotions"
          className="flex items-center justify-between px-3 md:px-5 pt-3 md:pt-4 pb-2 md:pb-3 border-b border-rose-100/50 group">
          <span className="font-bold text-dark text-[12px] md:text-[15px] flex items-center gap-1.5">
            <span className="text-[16px] md:text-[20px]">🎉</span>
            <span className="leading-tight">Khuyến mãi<br className="md:hidden" /><span className="hidden md:inline"> </span>đang chạy</span>
          </span>
          <ChevronRight size={14} className="text-dark/25 group-hover:text-primary transition-colors shrink-0" />
        </a>

        {/* Promo list */}
        <div className="flex-1 px-2 md:px-4 py-2 md:py-3 space-y-2 md:space-y-3">
          {promos.length > 0 ? (
            promos.map((promo, i) => (
              <div key={promo.id} className="flex items-start gap-2 px-1 md:px-2">
                <span className="text-[16px] md:text-[20px] leading-none shrink-0 mt-0.5">{promo.emoji || '🎁'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[11px] md:text-[13px] text-dark leading-snug line-clamp-2">{promo.title}</p>
                  {i === 0 && (
                    <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full mt-0.5 inline-block">HOT</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-3 text-center">
              <p className="text-2xl mb-1">✨</p>
              <p className="text-[10px] md:text-[12px] text-dark/40 font-medium">Sắp có ưu đãi mới</p>
            </div>
          )}
        </div>

        {/* CTA */}
        {onConsult && (
          <button onClick={onConsult}
            className="mx-2 md:mx-4 mb-2 md:mb-4 flex items-center justify-center gap-1 text-[10px] md:text-[12px] font-bold text-white bg-gradient-to-r from-secondary to-primary py-2 md:py-2.5 rounded-xl hover:opacity-90 transition shadow-sm shadow-primary/20">
            Tư vấn ngay ✨
          </button>
        )}
      </div>

    </div>
  );
};
