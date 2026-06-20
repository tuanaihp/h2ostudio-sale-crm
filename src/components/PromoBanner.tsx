import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { X, Gift } from 'lucide-react';
import { supabase } from '../supabase';
import { isWithinInterval, parseISO } from 'date-fns';
import type { Promotion, DbPromotionRow } from '../types';

const dbToPromo = (row: DbPromotionRow): Promotion => ({
  id: row.id,
  title: row.title,
  shortDesc: row.short_desc || '',
  content: row.content || '',
  emoji: row.emoji || '🎉',
  color: row.color || '#A4756B',
  bgColor: row.bg_color || '#FFF5F3',
  startDate: row.start_date,
  endDate: row.end_date,
  ctaText: row.cta_text || 'Đăng ký nhận ưu đãi',
  showOnWebsite: row.show_on_website !== false,
  enabled: row.enabled !== false,
  createdAt: row.created_at,
});

export const PromoBanner: React.FC = () => {
  const location = useLocation();
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Don't show on admin pages
  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdminPage) { setPromo(null); return; }

    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('promotions')
      .select('*')
      .eq('enabled', true)
      .eq('show_on_website', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const p = dbToPromo(data[0] as DbPromotionRow);
        const key = `promo_dismissed_${p.id}`;
        if (!sessionStorage.getItem(key)) {
          setPromo(p);
          setDismissed(false);
        }
      });
  }, [location.pathname, isAdminPage]);

  const dismiss = () => {
    if (promo) sessionStorage.setItem(`promo_dismissed_${promo.id}`, '1');
    setDismissed(true);
    setShowDetail(false);
  };

  if (!promo || dismissed || isAdminPage) return null;

  return (
    <>
      {/* Main banner */}
      <div
        className="w-full border-b-2 px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm relative"
        style={{ backgroundColor: promo.bgColor, borderBottomColor: promo.color }}
      >
        <button
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          onClick={() => setShowDetail(v => !v)}
        >
          <span className="text-xl shrink-0">{promo.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm" style={{ color: promo.color }}>{promo.title}</span>
              {promo.shortDesc && (
                <span className="text-xs text-gray-600 hidden sm:inline truncate">{promo.shortDesc}</span>
              )}
            </div>
          </div>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0 hidden sm:block"
            style={{ backgroundColor: promo.color, color: '#fff' }}
          >
            {promo.ctaText}
          </span>
        </button>

        <button
          onClick={dismiss}
          className="p-1.5 rounded-full hover:bg-black/10 transition-colors shrink-0"
          style={{ color: promo.color }}
          aria-label="Đóng"
        >
          <X size={15} />
        </button>
      </div>

      {/* Detail popup (when clicked) */}
      {showDetail && (
        <div
          className="border-b px-4 py-4 shadow-md"
          style={{ backgroundColor: promo.bgColor }}
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-bold text-base" style={{ color: promo.color }}>
                  {promo.emoji} {promo.title}
                </h3>
                {promo.shortDesc && (
                  <p className="text-sm text-gray-600 mt-0.5">{promo.shortDesc}</p>
                )}
              </div>
              <button onClick={() => setShowDetail(false)}
                className="p-1 rounded-full hover:bg-black/10 transition-colors shrink-0"
                style={{ color: promo.color }}>
                <X size={16} />
              </button>
            </div>

            {promo.content && (
              <p className="text-sm text-gray-700 whitespace-pre-line mb-4">{promo.content}</p>
            )}

            <Link
              to="/favorites"
              onClick={dismiss}
              className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: promo.color, color: '#fff' }}
            >
              <Gift size={15} />
              {promo.ctaText}
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
