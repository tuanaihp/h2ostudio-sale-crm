import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../supabase';
import { Sparkles, CalendarDays, ArrowRight } from 'lucide-react';
import { ConsultationModal } from '../components/ConsultationModal';
import { getDisplayImageUrl } from '../utils/image';
import { motion } from 'motion/react';

interface Promo {
  id: string;
  title: string;
  short_desc: string;
  content: string;
  emoji: string;
  color: string;
  bg_color: string;
  start_date: string;
  end_date: string;
  cta_text: string;
  image_url: string;
}

const Promotions: React.FC = () => {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [consultMsg, setConsultMsg] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('promotions')
      .select('id,title,short_desc,content,emoji,color,bg_color,start_date,end_date,cta_text,image_url')
      .eq('enabled', true)
      .eq('show_on_website', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPromos((data ?? []) as Promo[]);
        setLoading(false);
      });
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Layout title="Khuyến mãi">
      <Helmet>
        <title>Khuyến mãi - H2O STUDIO</title>
        <meta name="description" content="Tổng hợp các chương trình khuyến mãi và ưu đãi đang diễn ra tại H2O STUDIO." />
      </Helmet>

      <div className="container mx-auto px-4 py-10 pb-32 max-w-4xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-dark mb-2">Khuyến mãi đang chạy</h1>
          <p className="text-dark/60">Ưu đãi giới hạn — đừng bỏ lỡ concept mơ ước của bạn</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : promos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">✨</p>
            <p className="text-dark/50 font-medium">Hiện chưa có chương trình khuyến mãi nào.</p>
            <p className="text-dark/40 text-sm mt-1">Quay lại sau hoặc liên hệ trực tiếp để nhận báo giá tốt nhất.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {promos.map((promo, i) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-3xl overflow-hidden border shadow-sm"
                style={{ borderColor: `${promo.color}40`, background: promo.bg_color }}
              >
                {promo.image_url && (
                  <div
                    className="h-44 sm:h-56 bg-cover bg-center"
                    style={{ backgroundImage: `url(${getDisplayImageUrl(promo.image_url)})` }}
                  />
                )}
                <div className="p-5 sm:p-7">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl leading-none">{promo.emoji || '🎁'}</span>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-dark leading-snug">{promo.title}</h2>
                      {promo.short_desc && (
                        <p className="text-dark/70 text-sm mt-1">{promo.short_desc}</p>
                      )}
                      {promo.content && (
                        <p className="text-dark/60 text-sm mt-2 whitespace-pre-line">{promo.content}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-dark/50 mt-3">
                        <CalendarDays size={13} />
                        <span>{formatDate(promo.start_date)} → {formatDate(promo.end_date)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setConsultMsg(`Chào H2O STUDIO, mình muốn nhận ưu đãi: "${promo.title}"`);
                      setIsConsultOpen(true);
                    }}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl hover:opacity-90 transition"
                    style={{ background: promo.color }}
                  >
                    {promo.cta_text || 'Đăng ký nhận ưu đãi'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConsultationModal
        isOpen={isConsultOpen}
        onClose={() => setIsConsultOpen(false)}
        initialMessage={consultMsg}
      />
    </Layout>
  );
};

export default Promotions;
