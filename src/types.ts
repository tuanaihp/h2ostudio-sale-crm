export interface Photo {
  id: string;
  image: string;
  alt: string;
  order: number;
  design?: EditorState;
  deleted?: boolean;
  deletedAt?: any;
}

export interface EditorState {
  mainImage: string | null;
  mainImagePos: { x: number; y: number; scale: number };
  text: string;
  textFont: string;
  textColor: string;
  textPos: { x: number; y: number };
  logo1: string | null;
  logo1Pos: { x: number; y: number; scale: number };
  logo2: string | null;
  logo2Pos: { x: number; y: number; scale: number };
}

export interface Album {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  coverImagePos?: { x: number; y: number };
  suggestedLayout?: string;
  suitableFor?: string;
  displayLikes?: string;
  photos: Photo[];
  order: number;
  design?: EditorState;
  deleted?: boolean;
  deletedAt?: any;
}

export interface Style {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  albums: Album[];
  order: number;
  design?: EditorState;
  category?: string;
  deleted?: boolean;
  deletedAt?: any;
}

export interface LuckyGift {
  id: string;
  name: string;
  isTargetable: boolean;
}

export interface Consultation {
  id: string;
  name: string;
  phone: string;
  message?: string;
  date?: string;
  createdAt: any;
  status: 'new' | 'called' | 'consulting' | 'quoted' | 'registered' | 'contacted';
  notes?: string;
  tags?: string[];
  conceptId?: string;
  shootingDate?: string;
  engagementDate?: string;
  weddingDate?: string;
  deliveryDate?: string;
  favoriteIds?: string[];
  source?: string;
  luckyGift?: string;
  assignedTo?: string;
  followUpDate?: string;
  contractValue?: number;
}

export interface ChatMessageConfig {
  id: string;
  content: string;
  delaySeconds: number;
  textColor: string;
  enabled?: boolean;
}

export interface PartnerBrand {
  name: string;
  url: string;
  image: string;
  ctaText?: string;
}

export interface PromoGridItem {
  id: string;
  title: string;
  imageUrl: string;           // URL ảnh thumbnail (bỏ trống nếu linkType='style')
  linkType: 'style' | 'promotion' | 'blog' | 'custom';
  linkValue: string;          // slug (style) hoặc URL đầy đủ (blog/custom)
  badge?: string;             // "TOP1" / "Mới" / "Hot" / để trống
  enabled: boolean;
}

export interface BannerItem {
  id: string;
  emoji: string;
  tag: string;
  title: string;
  description: string;
  link?: string;
  color: string; // gradient Tailwind string e.g. "from-rose-400 to-pink-600"
  enabled: boolean;
}

export interface AppSettings {
  brandLogo?: string;
  watermarkOpacity?: number;
  watermarkPosition?: string;
  chatEnabled?: boolean;
  chatMessages?: ChatMessageConfig[];
  luckyWheelEnabled?: boolean;
  luckyWheelGifts?: LuckyGift[];
  staffPhones?: string[];
  luckyWheelCTA?: string;
  luckyWheelSubCTA?: string;
  luckyWheelNotificationText?: string;
  luckyWheelNotificationEnabled?: boolean;
  partnerBrand1?: PartnerBrand;
  partnerBrand2?: PartnerBrand;
  showPartnerBrands?: boolean;
  larkWebhookUrl?: string;
  larkNotificationEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramNotificationEnabled?: boolean;
  aiConsultantEnabled?: boolean;
  aiConsultantName?: string;
  aiConsultantPrompt?: string;
  liveChatEnabled?: boolean;
  chatBotEnabled?: boolean;
  chatBotTier2Enabled?: boolean;
  // Integrations settings ("Cổng kết nối")
  integrationChatApiEnabled?: boolean;
  integrationChatApiUrl?: string;
  integrationChatApiKey?: string;
  integrationChatApiModelName?: string;
  integrationChatApiHeaders?: string;
  // Image AI — DALL-E (tách riêng khỏi Text AI)
  aiImageEnabled?: boolean;
  aiImageApiKey?: string;
  aiImageModel?: string;
  integrationSheetEnabled?: boolean;
  integrationSheetId?: string;
  integrationSheetName?: string;
  integrationSheetApiKey?: string;
  integrationZaloEnabled?: boolean;
  integrationZaloOaId?: string;
  integrationZaloAccessToken?: string;
  integrationScriptNotes?: string;
  welcomeMessage?: string;
  secondWelcomeMessage?: string;
  chatTypingSpeed?: number;
  chatBotThinkingDelay?: number;
  chatStaffName?: string;
  chatStaffNames?: string[];
  chatAutoOpenEnabled?: boolean;
  chatAutoOpenDelay?: number;
  bannerItems?: BannerItem[];
  bannerSpeed?: number;
  promoGridItems?: PromoGridItem[]; // 3 thẻ bảng trái Two Panel
}

export interface CustomerFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  usageCount: number;
  source: 'manual' | 'from_chat' | 'from_chat_auto';
  isApproved: boolean;
  createdAt: string;
}

export interface DbCustomerFaqRow {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[] | null;
  usage_count: number;
  source: string;
  is_approved: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SaleScript {
  id: string;
  phase: string;
  title: string;
  content: string;
  tags: string[];
  orderNum: number;
  enabled: boolean;
}

export interface DbSaleScriptRow {
  id: string;
  phase: string;
  title: string;
  content: string;
  tags: string[] | null;
  order_num: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChatSession {
  id: string;
  consultationId?: string;
  phone: string;
  name: string;
  status: 'waiting' | 'open' | 'closed';
  stage: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadAdmin: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'customer' | 'admin';
  content: string;
  createdAt: string;
}

export interface DbChatSessionRow {
  id: string;
  consultation_id?: string;
  phone: string;
  name: string;
  status: 'waiting' | 'open' | 'closed';
  stage: string;
  last_message: string;
  last_message_at: string;
  unread_admin: number;
  created_at: string;
}

export interface DbChatMessageRow {
  id: string;
  session_id: string;
  sender: 'customer' | 'admin';
  content: string;
  created_at: string;
}

export interface Promotion {
  id: string;
  title: string;
  shortDesc: string;
  content: string;
  emoji: string;
  color: string;
  bgColor: string;
  startDate: string;
  endDate: string;
  ctaText: string;
  showOnWebsite: boolean;
  enabled: boolean;
  createdAt: string;
  imageUrl?: string;
}

export interface DbPromotionRow {
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
  show_on_website: boolean;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
  image_url?: string;
}

export interface AppConfig {
  brandName: string;
  zaloUrl: string;
  facebookMessengerUrl: string;
  hotline: string;
  description: string;
}

// ─── Supabase DB row shapes ───────────────────────────────────────────────────

export interface DbStyleRow {
  id: string; slug: string; title: string; description: string;
  cover_image: string; design: EditorState | null; order: number;
  category?: string; deleted: boolean; deleted_at?: string; updated_at?: string;
}
export interface DbAlbumRow {
  id: string; style_id: string; slug: string; title: string; description: string;
  cover_image: string; cover_image_pos?: { x: number; y: number };
  design: EditorState | null; order: number;
  suggested_layout?: string; suitable_for?: string; display_likes?: string;
  deleted: boolean; deleted_at?: string;
}
export interface DbPhotoRow {
  id: string; album_id: string; style_id: string; image: string; alt: string;
  design: EditorState | null; order: number; deleted: boolean; deleted_at?: string;
}
export interface DbConsultationRow {
  id: string; name: string; phone: string; message?: string; date?: string;
  created_at: string; status: 'new' | 'called' | 'consulting' | 'quoted' | 'registered' | 'contacted'; notes?: string;
  tags?: string[]; concept_id?: string; shooting_date?: string;
  engagement_date?: string; wedding_date?: string; delivery_date?: string;
  favorite_ids?: string[]; source?: string; lucky_gift?: string;
  assigned_to?: string; follow_up_date?: string; contract_value?: number;
}
export interface DbUserRoleRow {
  id: string; email: string; phone_number?: string; role: string; display_name?: string;
}
