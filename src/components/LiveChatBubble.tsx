import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { expandQuery } from '../utils/synonyms';
import { useApp } from '../context/AppContext';
import { sendLeadNotifications } from '../utils/sendLeadNotifications';
import { APP_CONFIG } from '../data/mockData';
import Fuse from 'fuse.js';
import { normalizeVietnamese, matchBotFaq, getQuickReplies, splitIntents } from '../lib/botEngine';
import { processMessageV2, FAQ_PRIMARY_INTENTS, PHASE_QUICK_REPLIES } from '../lib/botEngineV2';
import { createInitialStateV2, type ConversationStateV2 } from '../types/botV2';

const SESSION_KEY   = 'h2o_live_session_id';
const AUTO_OPEN_KEY = 'h2o_chat_auto_opened';

interface Msg {
  id: string;
  sender: 'customer' | 'admin';
  content: string;
  created_at: string;
  image_url?: string;
}

export function playNotifSound() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

interface Props {
  /** Khi dùng standalone (không có props) → tự quản lý state + tự có nút bubble */
  controlledOpen?: boolean;
  onClose?: () => void;
  chatBotEnabled?: boolean;
  chatBotTier2Enabled?: boolean;
  integrationConfig?: {
    chatApiEnabled?: boolean; chatApiUrl?: string;
    chatApiKey?: string; chatApiModelName?: string;
  };
}

export function LiveChatBubble({ controlledOpen, onClose, chatBotEnabled, chatBotTier2Enabled, integrationConfig }: Props = {}) {
  const { settings } = useApp();
  const isControlled = controlledOpen !== undefined;

  // Tên nhân viên từ settings
  const staffName = settings?.chatStaffName?.trim() || '';
  const staffInitials = staffName
    ? staffName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : 'H';

  const [_open, _setOpen] = useState(false);
  const open    = isControlled ? (controlledOpen ?? false) : _open;
  const setOpen = (v: boolean) => {
    if (isControlled) { if (!v && onClose) onClose(); }
    else _setOpen(v);
  };

  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [isAnon, setIsAnon]         = useState(true);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [hasNew, setHasNew]         = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [formName, setFormName]     = useState('');
  const [formPhone, setFormPhone]   = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formDone, setFormDone]     = useState(false);
  // Bot V2 conversation state — nhớ phase, slots, lead score, sent scripts/FAQs
  const [botStateV2, setBotStateV2] = useState<ConversationStateV2>(() => createInitialStateV2(''));
  const [quickReplies, setQuickReplies] = useState<string[]>([]);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const followUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef    = useRef(false);
  // Cache FAQ + kịch bản sale — fetch 1 lần, dùng lại mọi tin nhắn, tự hết hạn sau 10 phút
  const faqCacheRef       = useRef<any[] | null>(null);
  const scriptCacheRef    = useRef<any[] | null>(null);
  const cacheExpiresRef   = useRef<number>(0);
  const pkgCacheRef       = useRef<any[] | null>(null);
  const CACHE_TTL_MS      = 10 * 60 * 1000; // 10 phút
  useEffect(() => { openRef.current = open; }, [open]);

  // Auto-open — chỉ khi standalone + chatAutoOpenEnabled bật
  useEffect(() => {
    if (isControlled) return;
    if (!settings?.chatAutoOpenEnabled) return;
    if (sessionStorage.getItem(AUTO_OPEN_KEY)) return;
    const delay = (settings?.chatAutoOpenDelay ?? 20) * 1000;
    const timer = setTimeout(() => {
      if (openRef.current) return;
      sessionStorage.setItem(AUTO_OPEN_KEY, '1');
      playNotifSound();
      _setOpen(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [isControlled, settings?.chatAutoOpenEnabled, settings?.chatAutoOpenDelay]);

  useEffect(() => {
    if (!open) return;
    initSession();
    return () => { channelRef.current?.unsubscribe(); };
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showForm]);

  const subscribe = (sid: string) => {
    channelRef.current?.unsubscribe();
    channelRef.current = supabase
      .channel(`live_${sid}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'chat_messages', filter: `session_id=eq.${sid}`,
      }, (payload) => {
        const msg = payload.new as Msg;
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender === 'admin' && !openRef.current) {
          setHasNew(true);
          playNotifSound();
        }
      })
      .subscribe();
  };

  const initSession = async () => {
    setBotStateV2(createInitialStateV2(sessionId || ''));
    setQuickReplies([]);
    const savedId = localStorage.getItem(SESSION_KEY);
    if (savedId) {
      const { data } = await supabase
        .from('chat_sessions').select('id, phone, name')
        .eq('id', savedId).maybeSingle();
      if (data) {
        setSessionId(data.id);
        const anon = (data.phone as string).startsWith('anon_');
        setIsAnon(anon);
        setFormDone(!anon);
        const { data: msgs } = await supabase
          .from('chat_messages').select('id, sender, content, image_url, created_at')
          .eq('session_id', data.id).order('created_at', { ascending: true });
        setMessages((msgs || []) as Msg[]);
        subscribe(data.id);
        if (anon && (msgs || []).length > 0) setShowForm(true);
        return;
      }
    }
    const sid  = crypto.randomUUID();
    const anon = `anon_${sid.slice(0, 8)}`;
    localStorage.setItem(SESSION_KEY, sid);
    await supabase.from('chat_sessions').insert({
      id: sid, phone: anon, name: '',
      status: 'waiting', stage: 'new',
      last_message: '', last_message_at: new Date().toISOString(),
      unread_admin: 0, created_at: new Date().toISOString(),
    });
    // Gửi lời chào đầu tiên tự động cho khách mới
    const greetId  = crypto.randomUUID();
    const greetNow = new Date().toISOString();
    const DEFAULT_GREETING = 'Chào em nha! Em đang muốn tham khảo “ 𝑻𝒓𝒐̣𝒏 𝒈𝒐́𝒊 𝒄𝒉𝒖̣𝒑 𝒂̉𝒏𝒉 𝒄𝒖̛𝒐̛́𝒊 “ hay “ 𝑽𝒂́𝒚 𝒄𝒖̛𝒐̛́𝒊 “ ? Để chị tư vấn chi tiết cho em nhé!\n(Nếu trường hợp cần hỗ trợ gấp hãy gọi ngay Mrs.Thủy H2O 0783327323 or 0399558699)';
    const greetText = settings?.chatBotGreeting || DEFAULT_GREETING;
    const greetMsg: Msg = { id: greetId, sender: 'admin', content: greetText, created_at: greetNow };
    setMessages([greetMsg]);
    supabase.from('chat_messages').insert({ id: greetId, session_id: sid, sender: 'admin', content: greetText, created_at: greetNow }).then(() => {});
    setSessionId(sid);
    setIsAnon(true);
    subscribe(sid);
    setTimeout(() => setShowForm(true), 1500);
  };

  // Bot Tầng 1: Smart Intent + Keyword Matching engine
  const callBotTier1 = async (customerMessage: string, sid: string) => {
    try {
      setIsThinking(true);
      const todayStr = new Date().toISOString().split('T')[0];

      // Promotions: time-sensitive → luôn fetch mới
      // FAQ + Scripts: ổn định → cache sau lần đầu, không fetch lại
      const promoPromise = supabase.from('promotions')
        .select('title, short_desc, emoji, end_date')
        .eq('enabled', true).eq('show_on_website', true)
        .lte('start_date', todayStr).gte('end_date', todayStr).limit(2);

      let faqData:    any[];
      let scriptData: any[];
      let promoData:  any[];
      let pkgData:    any[];

      const cacheValid = faqCacheRef.current && scriptCacheRef.current && pkgCacheRef.current && Date.now() < cacheExpiresRef.current;

      if (cacheValid) {
        // Cache hit — chỉ chờ promotions (~80ms thay vì ~400ms)
        const { data: promos } = await promoPromise;
        faqData    = faqCacheRef.current!;
        scriptData = scriptCacheRef.current!;
        promoData  = promos || [];
        pkgData    = pkgCacheRef.current!;
      } else {
        // Cache miss hoặc hết hạn — fetch song song
        const [faqRes, scriptRes, promoRes, pkgRes] = await Promise.all([
          supabase.from('customer_faqs')
            .select('id, question, answer, tags, usage_count, keywords, next_question, lead_score, service_type, handoff_trigger, category')
            .eq('is_approved', true),
          supabase.from('sale_scripts')
            .select('id, phase, title, content, tags')
            .eq('enabled', true).order('order_num', { ascending: true }),
          promoPromise,
          supabase.from('price_packages').select('*').eq('enabled', true).order('order_num'),
        ]);
        faqData    = faqRes.data    || [];
        scriptData = scriptRes.data || [];
        promoData  = promoRes.data  || [];
        pkgData    = pkgRes.data    || [];
        faqCacheRef.current    = faqData;
        scriptCacheRef.current = scriptData;
        pkgCacheRef.current    = pkgData;
        cacheExpiresRef.current = Date.now() + CACHE_TTL_MS;
      }

      const thinkingDelay1 = settings?.chatBotThinkingDelay ?? 1200;
      await new Promise(r => setTimeout(r, thinkingDelay1 + Math.random() * 500));

      // Virtual FAQs từ settings (địa chỉ, giá, liên hệ...)
      const sv = settings;
      const virtualFaqs: Array<{id: string; question: string; answer: string; tags: string[]; usage_count: number; category: string; keywords: string[]; service_type?: string | null}> = [];
      if (sv?.botBusinessAddress || sv?.botBusinessHours) {
        let ans = sv?.botBusinessName ? `📍 ${sv.botBusinessName}\n` : '';
        if (sv?.botBusinessAddress) ans += `Địa chỉ: ${sv.botBusinessAddress}\n`;
        if (sv?.botBusinessHours) ans += `Giờ mở cửa: ${sv.botBusinessHours}`;
        virtualFaqs.push({ id: '__virt_addr__', question: 'studio ở đâu địa chỉ vị trí cơ sở tìm đến', answer: ans.trim(), tags: ['địa chỉ', 'ở đâu', 'vị trí', 'cơ sở', 'địa điểm', 'tìm đến', 'đường', 'quận'], keywords: ['địa chỉ', 'ở đâu', 'vị trí', 'tìm đến', 'cơ sở'], usage_count: 0, category: 'khac' });
      }
      if (sv?.botBusinessPhone || sv?.botBusinessEmail) {
        let ans = '';
        if (sv?.botBusinessPhone) ans += `📞 SĐT: ${sv.botBusinessPhone}\n`;
        if (sv?.botBusinessEmail) ans += `✉️ Email: ${sv.botBusinessEmail}`;
        virtualFaqs.push({ id: '__virt_contact__', question: 'số điện thoại liên hệ hotline email liên lạc', answer: ans.trim(), tags: ['số điện thoại', 'sdt', 'hotline', 'liên hệ', 'contact', 'email', 'gọi'], keywords: ['số điện thoại', 'hotline', 'liên hệ', 'email', 'gọi điện'], usage_count: 0, category: 'khac' });
      }
      if (sv?.botPriceList) {
        virtualFaqs.push({ id: '__virt_price__', question: 'giá bảng giá chi phí gói chụp tiền phí bao nhiêu', answer: sv.botPriceList, tags: ['giá', 'bảng giá', 'chi phí', 'gói', 'tiền', 'bao nhiêu', 'phí', 'giá tiền', 'giá cả'], keywords: ['giá', 'bảng giá', 'bao nhiêu', 'chi phí', 'phí chụp', 'gói chụp'], usage_count: 0, category: 'closing' });
      }
      if (sv?.botPurchaseInfo || sv?.botPaymentMethods) {
        let ans = '';
        if (sv?.botPurchaseInfo) ans += sv.botPurchaseInfo + '\n\n';
        if (sv?.botPaymentMethods) ans += `Phương thức thanh toán: ${sv.botPaymentMethods}`;
        virtualFaqs.push({ id: '__virt_payment__', question: 'đặt cọc thanh toán cách đặt lịch phương thức chuyển khoản', answer: ans.trim(), tags: ['đặt cọc', 'thanh toán', 'đặt lịch', 'cọc', 'chuyển khoản', 'payment', 'tiền cọc', 'đặt'], keywords: ['đặt cọc', 'thanh toán', 'chuyển khoản', 'tiền cọc', 'đặt lịch'], usage_count: 0, category: 'closing' });
      }
      if (sv?.botReturnPolicy) {
        virtualFaqs.push({ id: '__virt_cancel__', question: 'hủy lịch đổi lịch hoàn tiền chính sách hủy', answer: sv.botReturnPolicy, tags: ['hủy', 'đổi lịch', 'hoàn tiền', 'cancel', 'chính sách', 'hủy cọc'], keywords: ['hủy lịch', 'hoàn tiền', 'đổi lịch', 'chính sách hủy'], usage_count: 0, category: 'faq' });
      }
      try {
        const customItems = JSON.parse(sv?.botCustomInfoItems || '[]') as Array<{id: string; title: string; content: string}>;
        customItems.forEach(item => virtualFaqs.push({ id: `__virt_c_${item.id}__`, question: item.title, answer: item.content, tags: item.title.toLowerCase().split(/\W+/).filter(w => w.length >= 2), keywords: item.title.toLowerCase().split(/\W+/).filter(w => w.length >= 2), usage_count: 0, category: 'khac' }));
      } catch {}

      // Package FAQs — chuyển gói báo giá thành FAQ kèm ảnh
      const pkgImageMap = new Map<string, string>();
      (pkgData || []).forEach((pkg: any) => {
        const pkgFaqId = `__pkg_${pkg.id}__`;
        pkgImageMap.set(pkgFaqId, pkg.image_url || '');
        const customKws: string[] = pkg.keywords || [];
        const titleKws = pkg.title.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 2);
        const allKws = [...new Set(['báo giá', 'gói chụp', 'chi tiết gói', ...customKws, ...titleKws])];
        let answer = `📦 ${pkg.title}`;
        if (pkg.price) answer += `\n💰 Giá: ${pkg.price}`;
        if (pkg.description) answer += `\n\n${pkg.description}`;
        virtualFaqs.push({
          id: pkgFaqId,
          question: `${pkg.title} giá bao nhiêu báo giá chi tiết`,
          answer,
          tags: ['giá', 'báo giá', 'gói', pkg.service_type].filter(Boolean),
          keywords: allKws,
          usage_count: 5,
          category: 'closing',
          service_type: pkg.service_type || null,
        });
      });

      const allFaqs = [...(faqData || []), ...virtualFaqs];

      // Tầng 1: Chuẩn hóa + mở rộng từ khóa
      const normalizedMsg = normalizeVietnamese(customerMessage);
      const expandedWords = expandQuery(normalizedMsg);

      // Upgrade 3: Multi-Intent — tách tin nhiều câu hỏi, chạy engine riêng từng đoạn
      const intentSegments = splitIntents(customerMessage);
      const isMultiIntent = intentSegments.length > 1;
      const multiAnswers: string[] = [];

      // ── Bot V2: Intent Detection + Phase-Aware Script Selection ──
      const botContextCompat = {
        serviceType: botStateV2.slots.serviceType,
        phase: botStateV2.currentPhase,
        leadScore: botStateV2.leadScore,
      };

      const v2Result = processMessageV2({
        rawMessage: customerMessage,
        scriptData: scriptData || [],
        faqData: allFaqs,
        state: botStateV2,
      });
      setBotStateV2(v2Result.newState);

      let engineResult = matchBotFaq(normalizedMsg, expandedWords, allFaqs, botContextCompat);

      if (isMultiIntent) {
        for (const seg of intentSegments) {
          const normSeg = normalizeVietnamese(seg);
          const expSeg  = expandQuery(normSeg);
          const segResult = matchBotFaq(normSeg, expSeg, allFaqs, botContextCompat);
          if (segResult.type === 'answer') multiAnswers.push(segResult.answer);
        }
        const firstValid = intentSegments.map(seg => {
          const n = normalizeVietnamese(seg);
          return matchBotFaq(n, expandQuery(n), allFaqs, botContextCompat);
        }).find(r => r.type === 'answer');
        if (firstValid) engineResult = firstValid;
      }

      // Format promotions footer
      const activePromos = promoData || [];
      const promoFooter = activePromos.length > 0
        ? '\n\n🎉 Ưu đãi đang chạy:\n' + activePromos.map((p: any) => {
            const endDate = new Date(p.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            return `${p.emoji} ${p.title} — ${p.short_desc} (hết ${endDate})`;
          }).join('\n')
        : '';
      const PRICE_KWS = ['giá', 'phí', 'tiền', 'bao nhiêu', 'ưu đãi', 'khuyến', 'giảm'];
      const isPriceQuery = PRICE_KWS.some(k => normalizedMsg.includes(k));

      let text: string;

      if (isMultiIntent && multiAnswers.length > 1) {
        text = multiAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n\n');
        setQuickReplies(v2Result.quickReplies.length > 0 ? v2Result.quickReplies : engineResult.quickReplies);
      } else {
        const isFaqPrimary = FAQ_PRIMARY_INTENTS.includes(v2Result.debug.intent);
        const hasFaqMatch = engineResult.type === 'answer' || engineResult.type === 'clarify';

        if (isFaqPrimary && engineResult.type === 'answer') {
          // ── FAQ Primary: câu hỏi thực tế (benefit/deposit/after_sale) → FAQ ──
          text = engineResult.answer;
          if (engineResult.nextQuestion) text += `\n\n${engineResult.nextQuestion}`;
          if (engineResult.faqId && !String(engineResult.faqId).startsWith('__virt')) {
            const faqItem = allFaqs.find(f => f.id === engineResult.faqId);
            supabase.from('customer_faqs')
              .update({ usage_count: ((faqItem as any)?.usage_count || 0) + 1 })
              .eq('id', engineResult.faqId).then(() => {});
          }
          const promoCategories = ['offer', 'fomo', 'closing'];
          const faqCat = allFaqs.find(f => f.id === engineResult.faqId) as any;
          if ((isPriceQuery || promoCategories.includes(faqCat?.category)) && promoFooter) text += promoFooter;
          setQuickReplies(engineResult.quickReplies);

        } else if (v2Result.text) {
          // ── V2 Script Response: kịch bản sale phase-aware ──
          text = v2Result.text;
          if ((isPriceQuery || ['offer', 'fomo', 'closing'].includes(v2Result.newState.currentPhase)) && promoFooter) {
            text += promoFooter;
          }
          setQuickReplies(v2Result.quickReplies.length > 0 ? v2Result.quickReplies : engineResult.quickReplies);

        } else if (hasFaqMatch) {
          // ── FAQ Fallback: khi V2 không có script khớp ──
          text = engineResult.answer;
          if (engineResult.type === 'answer' && engineResult.nextQuestion) {
            text += `\n\n${engineResult.nextQuestion}`;
          }
          if (engineResult.faqId && !String(engineResult.faqId).startsWith('__virt')) {
            const faqItem = allFaqs.find(f => f.id === engineResult.faqId);
            supabase.from('customer_faqs')
              .update({ usage_count: ((faqItem as any)?.usage_count || 0) + 1 })
              .eq('id', engineResult.faqId).then(() => {});
          }
          const promoCategories = ['offer', 'fomo', 'closing'];
          const faqCat = allFaqs.find(f => f.id === engineResult.faqId) as any;
          if ((isPriceQuery || promoCategories.includes(faqCat?.category)) && promoFooter) text += promoFooter;
          setQuickReplies(engineResult.quickReplies);

        } else {
          // ── Fuse.js trên FAQ (sửa chính tả) ──
          const fuseItems = allFaqs
            .filter(f => {
              if (!f.answer || String(f.answer).length <= 5) return false;
              const fSvc = (f as any).service_type ?? null;
              return !engineResult.serviceType || !fSvc || fSvc === engineResult.serviceType;
            })
            .map(f => ({
              id: f.id,
              answer: f.answer,
              service_type: (f as any).service_type ?? null,
              searchText: [
                f.question,
                ...((f as any).keywords || []),
                (f as any).service_type || '',
                f.category || '',
              ].filter(Boolean).join(' '),
            }));
          const fuse = new Fuse(fuseItems, {
            keys: [{ name: 'searchText', weight: 0.7 }, { name: 'answer', weight: 0.3 }],
            threshold: 0.4,
            includeScore: true,
            ignoreLocation: true,
            minMatchCharLength: 3,
          });
          const fuseTop = fuse.search(normalizedMsg)[0];

          if (fuseTop && (fuseTop.score ?? 1) < 0.25 && fuseTop.item.answer) {
            text = fuseTop.item.answer;
            setQuickReplies(getQuickReplies(fuseTop.item.service_type));
          } else {
            // ── Fallback hoàn toàn — chuyển nhân viên ──
            const zaloUrl = APP_CONFIG.zaloUrl;
            const hotline = APP_CONFIG.hotline;
            let cta = '';
            if (zaloUrl) cta += `\n💬 Chat Zalo ngay: ${zaloUrl}`;
            if (hotline) cta += `\n📞 Hotline: ${hotline}`;
            text = `Dạ em cảm ơn anh/chị đã liên hệ H2O Studio! Để được tư vấn chi tiết và nhanh nhất, anh/chị vui lòng để lại số điện thoại ạ 💕${cta}`;
            if (promoFooter) text += promoFooter;

            const q = customerMessage.trim();
            if (q.length >= 6) {
              supabase.from('bot_unmatched_logs').insert({
                session_id: sid, message: q,
                normalized_message: normalizedMsg,
                detected_service: v2Result.debug.detectedService,
                detected_phase: v2Result.debug.selectedPhase,
                created_at: new Date().toISOString(),
              }).then(() => {});
              supabase.from('customer_faqs').insert({
                id: crypto.randomUUID(), question: q, answer: '', category: 'khac', tags: [],
                source: 'from_chat_auto', is_approved: false, usage_count: 0,
                created_at: new Date().toISOString(),
              }).then(() => {});
            }
            setQuickReplies(v2Result.quickReplies.length > 0 ? v2Result.quickReplies : engineResult.quickReplies);
          }
        }
      }

      // Kiểm tra handoff trigger
      if (v2Result.handoffTrigger || engineResult.handoffTrigger) {
        supabase.from('chat_sessions').update({ status: 'waiting', unread_admin: 99 }).eq('id', sid).then(() => {});
      }

      // Gắn ảnh báo giá nếu bot match đúng 1 gói cụ thể
      let botImageUrl: string | null = null;
      const imageCheckId = v2Result.faqId ?? (isMultiIntent ? null : engineResult.faqId);
      if (imageCheckId && pkgImageMap.has(String(imageCheckId))) {
        const imgUrl = pkgImageMap.get(String(imageCheckId)) || '';
        if (imgUrl) botImageUrl = imgUrl;
      }

      const botId  = crypto.randomUUID();
      const botNow = new Date().toISOString();
      const msgInsert: any = { id: botId, session_id: sid, sender: 'admin', content: text, created_at: botNow };
      if (botImageUrl) msgInsert.image_url = botImageUrl;
      await supabase.from('chat_messages').insert(msgInsert);
      await supabase.from('chat_sessions').update({ last_message: text, last_message_at: botNow }).eq('id', sid);
      scheduleFollowUp(sid);
    } catch (e) {
      console.error('Bot Tầng 1 error:', e);
    } finally {
      setIsThinking(false);
    }
  };

  // Tầng 2: Gemini/ChatGPT + kịch bản làm context
  const callBotTier2 = async (customerMessage: string, currentMessages: Msg[], sid: string) => {
    try {
      setIsThinking(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const [{ data: sess }, { data: scriptData }, { data: promoData }, { data: faqData }] = await Promise.all([
        supabase.from('chat_sessions').select('stage').eq('id', sid).maybeSingle(),
        supabase.from('sale_scripts').select('id, phase, title, content').eq('enabled', true).order('order_num', { ascending: true }),
        supabase.from('promotions').select('title, short_desc, emoji, end_date, content').eq('enabled', true).eq('show_on_website', true).lte('start_date', todayStr).gte('end_date', todayStr).limit(3),
        supabase.from('customer_faqs').select('question, answer, category').eq('is_approved', true).order('usage_count', { ascending: false }).limit(30),
      ]);

      const thinkingDelay = settings?.chatBotThinkingDelay ?? 1200;
      await new Promise(r => setTimeout(r, thinkingDelay + Math.random() * 400));

      const res = await fetch('/api/live-chat-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: customerMessage,
          stage: (sess as any)?.stage || 'new',
          scripts: scriptData || [],
          faqs: faqData || [],
          history: currentMessages.slice(-10),
          integrationConfig,
          activePromos: promoData || [],
          customInstructions: settings?.chatBotCustomInstructions || '',
          blockedTopics: settings?.chatBotBlockedTopics || '',
          studioInfo: settings?.botStudioInfo || '',
          paymentInfo: settings?.botPaymentInfo || '',
          knowledgeContext: (() => {
            const s = settings;
            const parts: string[] = [];
            if (s?.botBusinessName || s?.botBusinessPhone || s?.botBusinessAddress) {
              let bi = 'THÔNG TIN CƠ BẢN:';
              if (s?.botBusinessName) bi += `\n• Tên: ${s.botBusinessName}`;
              if (s?.botBusinessDescription) bi += `\n• Mô tả: ${s.botBusinessDescription}`;
              if (s?.botBusinessPhone) bi += `\n• SĐT: ${s.botBusinessPhone}`;
              if (s?.botBusinessEmail) bi += `\n• Email: ${s.botBusinessEmail}`;
              if (s?.botBusinessAddress) bi += `\n• Địa chỉ: ${s.botBusinessAddress}`;
              if (s?.botBusinessHours) bi += `\n• Giờ mở cửa: ${s.botBusinessHours}`;
              parts.push(bi);
            }
            if (s?.botPriceList) parts.push(`BẢNG GIÁ:\n${s.botPriceList}`);
            if (s?.botPurchaseInfo) parts.push(`THÔNG TIN ĐẶT LỊCH/CỌC:\n${s.botPurchaseInfo}`);
            if (s?.botPaymentMethods) parts.push(`PHƯƠNG THỨC THANH TOÁN:\n${s.botPaymentMethods}`);
            if (s?.botReturnPolicy) parts.push(`CHÍNH SÁCH HỦY/THAY ĐỔI:\n${s.botReturnPolicy}`);
            if (s?.botDiscountPolicy) parts.push(`KHUYẾN MÃI:\n${s.botDiscountPolicy}`);
            try {
              const items = JSON.parse(s?.botCustomInfoItems || '[]') as Array<{title: string; content: string}>;
              items.forEach(item => parts.push(`${item.title.toUpperCase()}:\n${item.content}`));
            } catch {}
            return parts.join('\n\n---\n\n');
          })(),
        }),
      });
      if (!res.ok) return;
      const { text } = await res.json();
      if (!text) return;

      const botId  = crypto.randomUUID();
      const botNow = new Date().toISOString();
      await supabase.from('chat_messages').insert({ id: botId, session_id: sid, sender: 'admin', content: text, created_at: botNow });
      await supabase.from('chat_sessions').update({ last_message: text, last_message_at: botNow }).eq('id', sid);
      scheduleFollowUp(sid);
    } catch (e) {
      console.error('Bot Tầng 2 error:', e);
    } finally {
      setIsThinking(false);
    }
  };

  // Kiểm tra giờ hoạt động của bot
  const isWithinBotSchedule = (): boolean => {
    if (!settings?.botScheduleEnabled) return true;
    try {
      const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
      const parts = fmt.formatToParts(new Date());
      const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      const cur = h * 60 + m;
      const [sh, sm] = (settings?.botScheduleStart || '08:00').split(':').map(Number);
      const [eh, em] = (settings?.botScheduleEnd || '22:00').split(':').map(Number);
      return cur >= sh * 60 + sm && cur < eh * 60 + em;
    } catch { return true; }
  };

  // Kiểm tra đối tượng bot nên phản hồi
  const shouldBotRespond = (): boolean => {
    const audience = settings?.botAudience || 'all';
    if (audience === 'team_only') return false;
    if (audience === 'first_time' && !isAnon) return false;
    return isWithinBotSchedule();
  };

  // Lên lịch trao đổi thêm sau khoảng thời gian im lặng
  const scheduleFollowUp = (sid: string) => {
    const delayMins = settings?.botFollowUpDelay ?? 0;
    if (!delayMins) return;
    if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
    followUpTimerRef.current = setTimeout(async () => {
      followUpTimerRef.current = null;
      const followUpText = 'Anh/chị ơi, không biết em có thể hỗ trợ thêm gì cho anh/chị không ạ? 😊';
      const botId = crypto.randomUUID();
      const botNow = new Date().toISOString();
      await supabase.from('chat_messages').insert({ id: botId, session_id: sid, sender: 'admin', content: followUpText, created_at: botNow });
      await supabase.from('chat_sessions').update({ last_message: followUpText, last_message_at: botNow }).eq('id', sid);
    }, delayMins * 60 * 1000);
  };

  // ── Helper: post bot message trực tiếp (không qua bot engine) ──
  const postBotMsg = async (text: string) => {
    if (!sessionId) return;
    const botId  = crypto.randomUUID();
    const botNow = new Date().toISOString();
    const newMsg = { id: botId, sender: 'admin' as const, content: text, created_at: botNow };
    setMessages(prev => [...prev, newMsg]);
    supabase.from('chat_messages').insert({ id: botId, session_id: sessionId, sender: 'admin', content: text, created_at: botNow }).then(() => {});
    supabase.from('chat_sessions').update({ last_message: text, last_message_at: botNow }).eq('id', sessionId).then(() => {});
  };

  // ── Nút 🎁 Xem ưu đãi — nội dung cài sẵn trong settings ──
  const handleQuickOffer = async () => {
    const offerText = settings?.chatBotOfferContent;
    if (offerText?.trim()) {
      await postBotMsg(offerText.trim());
    } else {
      // Fallback: fetch promos từ DB
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: promos } = await supabase.from('promotions')
        .select('title, short_desc, emoji, end_date')
        .eq('enabled', true).eq('show_on_website', true)
        .lte('start_date', todayStr).gte('end_date', todayStr)
        .order('end_date', { ascending: true }).limit(5);
      if (!promos || promos.length === 0) {
        await postBotMsg('Dạ hiện tại chưa có ưu đãi đặc biệt đang chạy. Anh/chị để lại số điện thoại để nhận thông báo ưu đãi sớm nhất nhé! 💕');
      } else {
        const lines = promos.map((p: any) => {
          const end = new Date(p.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          return `${p.emoji} ${p.title}\n${p.short_desc} (hết ${end})`;
        });
        await postBotMsg('🎁 Ưu đãi hiện tại của H2O Studio:\n\n' + lines.join('\n\n') + '\n\nNhắn chị để được tư vấn chi tiết ngay! 💕');
      }
    }
  };

  // ── Nút ❤️ Khuyến mãi — lịch khuyến mãi tháng hiện tại ──
  const handleQuickPromo = async () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthLabel = `tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
    const { data: promos } = await supabase.from('promotions')
      .select('title, short_desc, emoji, end_date, content')
      .eq('enabled', true).eq('show_on_website', true)
      .lte('start_date', todayStr).gte('end_date', todayStr)
      .order('end_date', { ascending: true });
    if (!promos || promos.length === 0) {
      await postBotMsg(`Dạ ${monthLabel} chưa có chương trình khuyến mãi mới. Anh/chị để lại số điện thoại — chị báo ngay khi có ưu đãi nha! 🌸`);
    } else {
      const lines = promos.map((p: any) => {
        const end = new Date(p.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        return `${p.emoji} **${p.title}**\n${p.content || p.short_desc}\n⏰ Hết hạn: ${end}`;
      });
      await postBotMsg(`🎉 Khuyến mãi ${monthLabel}:\n\n` + lines.join('\n\n') + '\n\n👉 Nhắn chị để nhận ngay — chỉ áp dụng khi đặt cọc trong tháng! 💕');
    }
  };

  // ── Nút 🎡 Vòng quay may mắn ──
  const handleQuickWheel = () => {
    window.dispatchEvent(new CustomEvent('open-lucky-wheel'));
  };

  const send = async (overrideMsg?: string) => {
    const content = (overrideMsg ?? input).trim();
    if (!content || !sessionId || sending) return;
    setSending(true);
    setQuickReplies([]); // Xóa quick replies khi gửi tin mới
    if (followUpTimerRef.current) { clearTimeout(followUpTimerRef.current); followUpTimerRef.current = null; }
    const id  = crypto.randomUUID();
    const now = new Date().toISOString();
    const nextMsgs = [...messages, { id, sender: 'customer' as const, content, created_at: now }];
    setMessages(nextMsgs);
    setInput('');
    await supabase.from('chat_messages').insert({ id, session_id: sessionId, sender: 'customer', content, created_at: now });
    await supabase.from('chat_sessions').update({
      last_message: content, last_message_at: now, status: 'waiting',
      unread_admin: messages.filter(m => m.sender === 'customer').length + 1,
    }).eq('id', sessionId);
    // Thu thập lead tự động: phát hiện SĐT trong tin nhắn khách
    if (settings?.botCollectLeads && isAnon && !formDone) {
      const phoneMatch = content.match(/\b(0[3-9]\d{8})\b/);
      if (phoneMatch) {
        const detectedPhone = phoneMatch[1];
        supabase.from('chat_sessions').update({ phone: detectedPhone, status: 'waiting' }).eq('id', sessionId).then(() => {});
        const { data: existing } = await supabase
          .from('consultations').select('id').eq('phone', detectedPhone).limit(1).maybeSingle();
        if (!existing) {
          const consultId = crypto.randomUUID();
          await supabase.from('consultations').insert({
            id: consultId, name: detectedPhone, phone: detectedPhone,
            status: 'new', source: 'website_chat',
            message: 'Khách tự để lại SĐT trong chat (bot tự nhận diện)',
            created_at: new Date().toISOString(),
          });
          await supabase.from('chat_sessions').update({ consultation_id: consultId }).eq('id', sessionId);
        } else {
          await supabase.from('chat_sessions').update({ consultation_id: (existing as any).id }).eq('id', sessionId);
        }
        localStorage.setItem('h2o_user_phone', detectedPhone);
        sendLeadNotifications({ name: detectedPhone, phone: detectedPhone, source: 'website_chat', settings });
        setIsAnon(false);
        setFormDone(true);
      }
    }
    if (isAnon && !formDone) setTimeout(() => setShowForm(true), 800);
    setSending(false);

    // Kiểm tra đối tượng + lịch trước khi gọi bot
    if (shouldBotRespond()) {
      if (chatBotTier2Enabled && sessionId) {
        callBotTier2(content, nextMsgs, sessionId);
      } else if (chatBotEnabled && sessionId) {
        callBotTier1(content, sessionId);
      }
    }
  };

  const submitInfo = async () => {
    const phone = formPhone.trim();
    const name  = formName.trim();
    if (phone.length < 9 || !sessionId) return;
    setFormSaving(true);
    await supabase.from('chat_sessions').update({ phone, name, status: 'waiting' }).eq('id', sessionId);
    const { data: existing } = await supabase
      .from('consultations').select('id').eq('phone', phone).limit(1).maybeSingle();
    if (!existing) {
      const consultId = crypto.randomUUID();
      await supabase.from('consultations').insert({
        id: consultId, name: name || phone, phone,
        status: 'new', source: 'website_chat',
        message: 'Khách liên hệ qua Live Chat trên website',
        created_at: new Date().toISOString(),
      });
      await supabase.from('chat_sessions').update({ consultation_id: consultId }).eq('id', sessionId);
    } else {
      await supabase.from('chat_sessions').update({ consultation_id: (existing as any).id }).eq('id', sessionId);
    }
    localStorage.setItem('h2o_user_phone', phone);
    const confirmId = crypto.randomUUID();
    await supabase.from('chat_messages').insert({
      id: confirmId, session_id: sessionId, sender: 'customer',
      content: `📋 Thông tin của tôi: ${name ? name + ' — ' : ''}${phone}`,
      created_at: new Date().toISOString(),
    });
    // Gửi thông báo Telegram + Lark
    sendLeadNotifications({ name: name || phone, phone, source: 'website_chat', settings });
    setIsAnon(false);
    setFormDone(true);
    setShowForm(false);
    setFormSaving(false);
  };

  // Panel chat — Compact Bubble (không che màn hình)
  const chatPanel = (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 16 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="fixed z-50 bg-white flex flex-col shadow-2xl rounded-2xl overflow-hidden border border-gray-100
                 right-3 w-[calc(100vw-24px)] max-w-[320px] max-h-[min(420px,62vh)]
                 sm:bottom-8 sm:right-8 sm:w-[340px] sm:max-h-none sm:h-[500px]"
      style={{ transformOrigin: 'bottom right', bottom: 'max(96px, calc(env(safe-area-inset-bottom) + 92px))' }}
    >

      {/* Header */}
      <div className="bg-gradient-to-br from-secondary via-primary to-primary text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
              {staffName ? staffInitials : <User size={18} />}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-primary rounded-full" />
          </div>
          <div>
            <p className="font-bold text-sm">{staffName || 'Tư vấn viên H2O Studio'}</p>
            <p className="text-xs text-white/80">H2O Studio · đang trực tuyến 🟢</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-3 space-y-2">

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'admin' && (
              <div className="w-7 h-7 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center text-white text-[11px] font-bold mr-1.5 shrink-0 self-end">{staffInitials}</div>
            )}
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
              msg.sender === 'customer'
                ? 'bg-gradient-to-br from-secondary via-primary to-primary text-white rounded-br-sm'
                : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.image_url && (
                <img
                  src={msg.image_url} alt="Ảnh báo giá"
                  className="mt-2 rounded-lg w-full object-cover max-h-52 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(msg.image_url, '_blank')}
                />
              )}
              <p className={`text-[10px] mt-0.5 ${msg.sender === 'customer' ? 'text-white/70' : 'text-gray-400'}`}>
                {format(new Date(msg.created_at), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}

        {showForm && !formDone && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 mx-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-primary" />
                <p className="text-xs font-semibold text-primary">Để lại thông tin nhận tư vấn</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
            </div>
            <p className="text-[11px] text-gray-500 mb-2">Tư vấn viên sẽ gọi lại xác nhận lịch cho anh/chị 😊</p>
            <div className="space-y-1.5">
              <input
                className="w-full border border-primary/20 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Tên anh/chị (không bắt buộc)"
                value={formName} onChange={e => setFormName(e.target.value)}
              />
              <input
                className="w-full border border-primary/20 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Số điện thoại *" type="tel"
                value={formPhone} onChange={e => setFormPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitInfo()}
              />
              <button
                onClick={submitInfo}
                disabled={formPhone.trim().length < 9 || formSaving}
                className="w-full bg-gradient-to-r from-secondary to-primary text-white rounded-lg py-1.5 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {formSaving ? 'Đang lưu...' : 'Gửi thông tin'}
              </button>
            </div>
          </div>
        )}

        {/* Typing indicator — nhân viên đang gõ */}
        {isThinking && (
          <div className="flex justify-start items-end gap-1.5">
            <div className="w-7 h-7 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {staffInitials}
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm border border-gray-100 px-4 py-3 shadow-sm flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.18}s`, animationDuration: '0.8s' }}
                />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 pb-1">{staffName || 'H2O Studio'} đang gõ...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Replies — 3 nút cố định */}
      <div className="shrink-0 bg-gray-50 px-2 pb-1.5 pt-1 flex gap-1.5 border-t border-gray-100">
        <button onClick={handleQuickOffer}
          className="flex-1 flex items-center justify-center gap-1 text-[11px] bg-white border border-primary/25 text-primary font-medium px-2 py-1.5 rounded-full hover:bg-primary/5 active:scale-95 transition-all shadow-sm whitespace-nowrap">
          🎁 Xem ưu đãi
        </button>
        <button onClick={handleQuickPromo}
          className="flex-1 flex items-center justify-center gap-1 text-[11px] bg-white border border-pink-300 text-pink-600 font-medium px-2 py-1.5 rounded-full hover:bg-pink-50 active:scale-95 transition-all shadow-sm whitespace-nowrap">
          ❤️ Khuyến mãi
        </button>
        <button onClick={handleQuickWheel}
          className="flex-1 flex items-center justify-center gap-1 text-[11px] bg-white border border-amber-300 text-amber-600 font-medium px-2 py-1.5 rounded-full hover:bg-amber-50 active:scale-95 transition-all shadow-sm whitespace-nowrap">
          🎡 Vòng quay
        </button>
      </div>

      {/* Input */}
      <div className="border-t bg-white p-3 flex gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
        <input
          className="flex-1 border border-gray-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Nhắn tin với tư vấn viên..."
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={sending} autoFocus={open}
        />
        <button
          onClick={() => send()} disabled={!input.trim() || sending}
          className="bg-gradient-to-br from-secondary to-primary text-white rounded-full p-2.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send size={15} />
        </button>
      </div>
    </motion.div>
  );

  // Standalone mode: có nút bubble riêng
  if (!isControlled) {
    return (
      <div className="fixed right-4 z-50 flex flex-col items-end sm:right-6"
           style={{ bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 16px))' }}>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { _setOpen(true); setHasNew(false); }}
            className="w-14 h-14 bg-gradient-to-br from-secondary via-primary to-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center relative hover:opacity-90 transition-opacity"
          >
            <User size={24} />
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white" />
            </span>
            {hasNew && (
              <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse">!</span>
            )}
          </motion.button>
        )}
        <AnimatePresence>{open && chatPanel}</AnimatePresence>
      </div>
    );
  }

  // Controlled mode: không có nút riêng, panel nổi fixed
  return <AnimatePresence>{open && chatPanel}</AnimatePresence>;
}
