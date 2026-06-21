import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
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
  end_date: string;
  cta_text: string;
}

export const DEFAULT_SERVICE_CARDS: BannerItem[] = [
  { id: 's1', emoji: '📸', tag: 'Chụp ảnh', title: 'Ảnh cưới concept', description: '', link: '/', color: 'from-blue-400 to-cyan-500', enabled: true },
  { id: 's2', emoji: '✈️', tag: 'Du lịch', title: 'Chụp ảnh du lịch', description: '', link: '/', color: 'from-sky-400 to-blue-600', enabled: true },
  { id: 's3', emoji: '💒', tag: 'Trọn gói', title: 'Cưới trọn gói', description: '', link: '/', color: 'from-rose-400 to-pink-600', enabled: true },
  { id: 's4', emoji: '💄', tag: 'Makeup', title: 'Makeup cô dâu', description: '', link: '/', color: 'from-fuchsia-400 to-pink-500', enabled: true },
  { id: 's5', emoji: '👗', tag: 'Thời trang', title: 'Thuê váy cưới', description: '', link: '/', color: 'from-violet-400 to-purple-600', enabled: true },
  { id: 's6', emoji: '💌', tag: 'Thiệp cưới', title: 'Thiệp cưới online', description: '', link: '/', color: 'from-amber-400 to-orange-500', enabled: true },
];

interface Props {
  onConsult?: () => void;
}

export const PromoGrid: React.FC<Props> = ({ onConsult }) => {
  const { settings } = useApp();
  const [promo, setPromo] = useState<DbPromo | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('promotions')
      .select('id,title,short_desc,emoji,color,bg_color,end_date,cta_text')
      .eq('enabled', true)
      .eq('show_on_website', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPromo(data));
  }, []);

  const serviceCards = (settings?.bannerItems ?? DEFAULT_SERVICE_CARDS)
    .filter(i => i.enabled)
    .slice(0, 6);

  const endDateLabel = promo
    ? new Date(promo.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  return (
    <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-3 bg-light-gray/60 rounded-3xl p-3">

      {/* ── Left: Featured promo card ── */}
      <div className="md:col-span-2">
        {promo ? (
          <div
            className="h-full rounded-2xl p-5 flex flex-col justify-between text-white relative overflow-hidden min-h-[190px]"
            style={{ background: `linear-gradient(140deg, ${promo.color}f0 0%, ${promo.bg_color}d0 100%)` }}
          >
            {/* Watermark emoji */}
            <span className="absolute -right-4 -bottom-4 text-[110px] opacity-[0.08] select-none pointer-events-none leading-none">
              {promo.emoji}
            </span>

            {/* Top content */}
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-white/25 backdrop-blur-sm px-2.5 py-1 rounded-full mb-3">
                🎉 Khuyến mãi đặc biệt
              </span>
              <h3 className="text-[18px] font-bold leading-snug mb-1.5 drop-shadow-sm">{promo.title}</h3>
              <p className="text-[12px] text-white/80 leading-relaxed line-clamp-3">{promo.short_desc}</p>
            </div>

            {/* Bottom CTAs */}
            <div className="mt-4 space-y-2">
              <p className="text-[10px] text-white/55">⏰ Hết hạn: {endDateLabel}</p>
              <a
                href="/promotions"
                className="flex items-center justify-center gap-1.5 bg-white text-dark font-bold text-[13px] py-2.5 rounded-xl hover:bg-white/90 transition shadow-lg shadow-black/10"
              >
                {promo.cta_text || 'Xem chi tiết'} <ChevronRight size={14} />
              </a>
              {onConsult && (
                <button
                  onClick={onConsult}
                  className="w-full flex items-center justify-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/25 text-white font-bold text-[13px] py-2.5 rounded-xl transition backdrop-blur-sm"
                >
                  Nhận tư vấn ngay
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Default brand card (no active promo) */
          <div className="h-full rounded-2xl p-5 flex flex-col justify-between text-white relative overflow-hidden min-h-[190px] bg-gradient-to-br from-secondary to-primary">
            <span className="absolute -right-4 -bottom-4 text-[110px] opacity-[0.08] select-none pointer-events-none leading-none">💍</span>
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-white/25 px-2.5 py-1 rounded-full mb-3">
                ✨ H2O Studio
              </span>
              <h3 className="text-[18px] font-bold leading-snug mb-1.5">Ảnh cưới concept chuyên nghiệp</h3>
              <p className="text-[12px] text-white/80 leading-relaxed">
                Tư vấn miễn phí · Báo giá nhanh · 100+ concept độc quyền
              </p>
            </div>
            {onConsult && (
              <button
                onClick={onConsult}
                className="mt-4 flex items-center justify-center gap-1.5 bg-white text-primary font-bold text-[13px] py-2.5 rounded-xl hover:bg-white/90 transition shadow-lg shadow-black/10"
              >
                Nhận tư vấn miễn phí <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Right: 3×2 service grid ── */}
      <div className="md:col-span-3 grid grid-cols-3 gap-3">
        {serviceCards.map((card) => {
          const isExternal = card.link?.startsWith('http');
          const Tag = card.link ? 'a' : ('div' as any);
          const linkProps = card.link
            ? { href: card.link, ...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }
            : {};

          return (
            <Tag
              key={card.id}
              {...linkProps}
              className="bg-white rounded-2xl overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer group"
            >
              {/* Gradient icon area */}
              <div className={`bg-gradient-to-br ${card.color} flex items-center justify-center py-4`}>
                <span className="text-[32px] leading-none drop-shadow-sm">{card.emoji}</span>
              </div>

              {/* Label area */}
              <div className="px-2.5 py-2 flex-1 flex flex-col justify-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-dark/35 mb-0.5 truncate">
                  {card.tag}
                </p>
                <p className="text-[12px] font-bold text-dark leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {card.title}
                </p>
              </div>
            </Tag>
          );
        })}
      </div>
    </div>
  );
};
