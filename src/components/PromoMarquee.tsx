import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../supabase';
import { BannerItem } from '../types';

interface DbPromo {
  id: string;
  title: string;
  short_desc: string;
  emoji: string;
  color: string;
  bg_color: string;
  start_date: string;
  end_date: string;
  enabled: boolean;
  show_on_website: boolean;
}

const DEFAULT_ITEMS: BannerItem[] = [
  {
    id: 'def-1', emoji: '📸', tag: 'Hậu trường',
    title: 'Quy trình chụp ảnh cưới tại H2O Studio',
    description: 'Khám phá hành trình từ chọn concept đến bộ ảnh hoàn hảo',
    link: '', color: 'from-blue-400 to-cyan-500', enabled: true,
  },
  {
    id: 'def-2', emoji: '💄', tag: 'Makeup & Style',
    title: 'Top trend bridal makeup 2026',
    description: 'Những phong cách trang điểm cô dâu được yêu thích nhất mùa cưới',
    link: '', color: 'from-pink-400 to-rose-500', enabled: true,
  },
  {
    id: 'def-3', emoji: '💌', tag: 'Thiệp cưới online',
    title: 'Thiệp cưới điện tử — miễn phí & đẹp',
    description: 'Tạo thiệp cưới online, gửi link mời đến toàn bộ khách mời dễ dàng',
    link: '', color: 'from-violet-400 to-purple-500', enabled: true,
  },
  {
    id: 'def-4', emoji: '🎀', tag: 'Phụ kiện cưới',
    title: 'Bộ sưu tập váy cưới & phụ kiện 2026',
    description: 'Hàng trăm lựa chọn váy cưới, vest và phụ kiện cho ngày trọng đại',
    link: '', color: 'from-amber-400 to-orange-500', enabled: true,
  },
];

export const PromoMarquee: React.FC = () => {
  const { settings } = useApp();
  const [isPaused, setIsPaused] = useState(false);
  const [livePromos, setLivePromos] = useState<BannerItem[]>([]);

  const speed = settings?.bannerSpeed ?? 40;

  // Fetch active promotions from Supabase
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('promotions')
      .select('id,title,short_desc,emoji,color,bg_color,start_date,end_date,enabled,show_on_website')
      .eq('enabled', true)
      .eq('show_on_website', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(4)
      .then(({ data }) => {
        if (!data) return;
        setLivePromos(
          (data as DbPromo[]).map(p => ({
            id: `promo-${p.id}`,
            emoji: p.emoji || '🎉',
            tag: 'Khuyến mãi',
            title: p.title,
            description: p.short_desc || '',
            link: '/promotions',
            color: 'from-rose-400 to-pink-600',
            enabled: true,
          }))
        );
      });
  }, []);

  const staticItems = useMemo(
    () => (settings?.bannerItems ?? DEFAULT_ITEMS).filter(i => i.enabled),
    [settings?.bannerItems]
  );

  // Promotions first, then static items
  const allItems = useMemo(() => {
    const combined = [...livePromos, ...staticItems];
    return combined.length > 0 ? combined : DEFAULT_ITEMS;
  }, [livePromos, staticItems]);

  // Duplicate for seamless infinite loop
  const loop = [...allItems, ...allItems, ...allItems];

  return (
    <div
      className="mt-12 relative overflow-hidden rounded-3xl bg-gradient-to-br from-light-gray/80 to-light-gray py-7"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fade-out edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-[#f5f0eb] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-l from-[#f5f0eb] to-transparent pointer-events-none" />

      <style>{`
        @keyframes h2o-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-100% / 3)); }
        }
      `}</style>

      <div
        className="flex gap-4 pl-4"
        style={{
          width: 'max-content',
          animation: `h2o-marquee ${speed}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {loop.map((item, i) => {
          const isExternal = item.link?.startsWith('http');
          const Tag = item.link ? 'a' : 'div';
          const linkProps = item.link
            ? { href: item.link, ...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }
            : {};

          return (
            <Tag
              key={`${item.id}-${i}`}
              {...(linkProps as any)}
              className="flex-shrink-0 w-[268px] bg-white rounded-2xl border border-gray-100 overflow-hidden
                         hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default group"
              style={{ cursor: item.link ? 'pointer' : 'default' }}
            >
              {/* Color strip top */}
              <div className={`h-1.5 bg-gradient-to-r ${item.color || 'from-secondary to-primary'}`} />

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-[28px] leading-none mt-0.5 flex-shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[9px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full mb-1.5">
                      {item.tag}
                    </span>
                    <h4 className="font-bold text-dark text-[13px] leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-dark/45 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.link && (
                  <div className="mt-3 flex items-center gap-0.5 text-[11px] font-bold text-primary/70 group-hover:text-primary group-hover:gap-1.5 transition-all">
                    Xem ngay
                    {isExternal ? <ExternalLink size={10} /> : <ChevronRight size={12} />}
                  </div>
                )}
              </div>
            </Tag>
          );
        })}
      </div>

      {/* Paused indicator */}
      {isPaused && (
        <div className="absolute bottom-2 right-4 text-[9px] text-dark/25 font-medium tracking-widest uppercase">
          ⏸ dừng
        </div>
      )}
    </div>
  );
};

export { DEFAULT_ITEMS as BANNER_DEFAULT_ITEMS };
