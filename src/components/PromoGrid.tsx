import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import { BannerItem, PromoGridItem } from '../types';
import { getDisplayImageUrl } from '../utils/image';

interface ActivePromo {
  id: string;
  title: string;
  short_desc: string;
  emoji: string;
  color: string;
  bg_color: string;
  end_date: string;
  image_url: string;
}

// Kept for AdminSettings import compatibility
export const DEFAULT_SERVICE_CARDS: BannerItem[] = [];

interface Props {
  onConsult?: () => void;
}

const DEFAULT_BADGE = [
  { label: 'TOP1', bg: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-200' },
  { label: 'TOP2', bg: 'bg-blue-50',  text: 'text-blue-500',  border: 'border-blue-200'  },
  { label: 'TOP3', bg: 'bg-rose-50',  text: 'text-rose-400',  border: 'border-rose-200'  },
];

function badgeStyle(label?: string, idx?: number) {
  if (!label) return DEFAULT_BADGE[idx ?? 0] ?? DEFAULT_BADGE[2];
  const lower = label.toLowerCase();
  if (lower.includes('top1') || lower === '1') return DEFAULT_BADGE[0];
  if (lower.includes('top2') || lower === '2') return DEFAULT_BADGE[1];
  if (lower.includes('top3') || lower === '3') return DEFAULT_BADGE[2];
  // Custom badge — amber as default colour
  return { label, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
}

export const PromoGrid: React.FC<Props> = ({ onConsult }) => {
  const { styles, settings } = useApp();
  const [promos, setPromos]           = useState<ActivePromo[]>([]);
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
      .select('id,title,short_desc,emoji,color,bg_color,end_date,image_url')
      .eq('enabled', true)
      .eq('show_on_website', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setPromos((data ?? []).map((p: any) => ({
        ...p,
        short_desc: p.short_desc || '',
        image_url: p.image_url || '',
        color: p.color || '#ff4d8c',
        bg_color: p.bg_color || '#d926a9',
      }))));
  }, []);

  // Configured items from AdminSettings (enabled only, unlimited)
  const configuredItems: PromoGridItem[] = (settings?.promoGridItems ?? []).filter(i => i.enabled);
  const useConfigured = configuredItems.length > 0;

  // Fallback: auto top styles
  const topStyles = styles.filter(s => !s.deleted).slice(0, 5);

  // Build link + thumbnail for a configured item
  function resolveItem(item: PromoGridItem) {
    let href = '/';
    let isExternal = false;
    let thumbnail = item.imageUrl;

    if (item.linkType === 'style') {
      href = `/style/${item.linkValue}`;
      const matched = styles.find(s => s.slug === item.linkValue);
      if (matched?.coverImage) thumbnail = getDisplayImageUrl(matched.coverImage);
    } else if (item.linkType === 'promotion') {
      href = '/promotions';
    } else {
      href = item.linkValue;
      isExternal = item.linkValue.startsWith('http');
    }

    const title = item.title || styles.find(s => s.slug === item.linkValue)?.title || '';
    return { href, isExternal, thumbnail, title };
  }

  return (
    <div className="mt-10 grid grid-cols-2 gap-3 md:gap-4">

      {/* ══════════════════════════════════════════
          LEFT — Top concept / Configured items
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
        <div className="flex-1 px-2 md:px-4 py-2 md:py-3 space-y-1 md:space-y-2 overflow-y-auto">

          {/* Skeleton while loading */}
          {!stylesReady && !useConfigured ? (
            [0,1,2].map(i => (
              <div key={i} className="flex items-center gap-2 px-1 py-1.5 animate-pulse">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))

          /* Configured items from AdminSettings */
          ) : useConfigured ? (
            configuredItems.map((item, i) => {
              const { href, isExternal, thumbnail, title } = resolveItem(item);
              const badge = badgeStyle(item.badge, i);
              return (
                <a key={item.id} href={href}
                  {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="flex items-center gap-2 md:gap-3 px-1 md:px-2 py-1.5 md:py-2 rounded-xl hover:bg-light-gray/60 transition-colors group">
                  <div
                    className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-cover bg-center shrink-0 bg-gray-100"
                    style={{ backgroundImage: thumbnail ? `url(${thumbnail})` : undefined }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] md:text-[13px] text-dark truncate leading-tight group-hover:text-primary transition-colors">
                      {title}
                    </p>
                    {badge.label && (
                      <span className={`inline-block text-[9px] md:text-[10px] font-black px-1.5 py-0.5 rounded-full border mt-0.5 ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                </a>
              );
            })

          /* Auto fallback: top styles */
          ) : topStyles.length > 0 ? (
            topStyles.map((style, i) => {
              const badge = DEFAULT_BADGE[i] ?? DEFAULT_BADGE[2];
              return (
                <a key={style.id} href={`/style/${style.slug}`}
                  className="flex items-center gap-2 md:gap-3 px-1 md:px-2 py-1.5 md:py-2 rounded-xl hover:bg-light-gray/60 transition-colors group">
                  <div
                    className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-cover bg-center shrink-0 bg-gray-100"
                    style={{ backgroundImage: style.coverImage ? `url(${getDisplayImageUrl(style.coverImage)})` : undefined }}
                  />
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

        {/* Promo content — adaptive layout */}
        <div className="flex-1 px-2 md:px-3 py-2 md:py-3 flex flex-col min-h-0">
          {promos.length === 0 ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-3">
              <p className="text-2xl mb-1">✨</p>
              <p className="text-[10px] md:text-[12px] text-dark/40 font-medium">Sắp có ưu đãi mới</p>
            </div>

          ) : promos.length <= 3 ? (
            /* 1–3 promos: horizontal thumbnail list */
            <div className="flex-1 space-y-1.5 md:space-y-2">
              {promos.map((promo, i) => (
                <a key={promo.id} href="/promotions"
                  className="flex items-center gap-2 md:gap-2.5 rounded-xl hover:bg-rose-100/50 transition-colors px-1 py-1 group">
                  {/* Thumbnail */}
                  {promo.image_url ? (
                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-cover bg-center shrink-0"
                      style={{ backgroundImage: `url(${promo.image_url})` }} />
                  ) : (
                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: `linear-gradient(135deg, ${promo.color}, ${promo.bg_color})` }}>
                      <span>{promo.emoji || '🎁'}</span>
                    </div>
                  )}
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] md:text-[12px] text-dark leading-snug line-clamp-2 group-hover:text-rose-600 transition-colors">
                      {promo.title}
                    </p>
                    {i === 0 && (
                      <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full inline-block mt-0.5">HOT</span>
                    )}
                  </div>
                </a>
              ))}
            </div>

          ) : (
            /* 4 promos: 2×2 image grid */
            <div className="flex-1 grid grid-cols-2 gap-1.5 md:gap-2">
              {promos.map((promo, i) => (
                <a key={promo.id} href="/promotions"
                  className="relative rounded-xl md:rounded-2xl overflow-hidden aspect-square group">
                  {/* Background */}
                  {promo.image_url ? (
                    <div className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-105"
                      style={{ backgroundImage: `url(${promo.image_url})` }} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl"
                      style={{ background: `linear-gradient(135deg, ${promo.color}, ${promo.bg_color})` }}>
                      <span className="text-white text-2xl drop-shadow">{promo.emoji || '🎁'}</span>
                    </div>
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 md:p-2">
                    <p className="text-white text-[8px] md:text-[9px] font-bold leading-tight line-clamp-2">
                      {promo.title}
                    </p>
                  </div>
                  {/* HOT badge */}
                  {i === 0 && (
                    <div className="absolute top-1 left-1">
                      <span className="text-[7px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full">HOT</span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        {onConsult && (
          <button onClick={onConsult}
            className="mx-2 md:mx-4 mb-2 md:mb-4 mt-1 flex items-center justify-center gap-1 text-[10px] md:text-[12px] font-bold text-white bg-gradient-to-r from-secondary to-primary py-2 md:py-2.5 rounded-xl hover:opacity-90 transition shadow-sm shadow-primary/20">
            Tư vấn ngay ✨
          </button>
        )}
      </div>

    </div>
  );
};
