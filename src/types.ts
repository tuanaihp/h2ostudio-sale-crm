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
  status: 'new' | 'contacted' | 'registered';
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
  // Integrations settings ("Cổng kết nối")
  integrationChatApiEnabled?: boolean;
  integrationChatApiUrl?: string;
  integrationChatApiKey?: string;
  integrationChatApiModelName?: string;
  integrationChatApiHeaders?: string;
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
  created_at: string; status: 'new' | 'contacted' | 'registered'; notes?: string;
  tags?: string[]; concept_id?: string; shooting_date?: string;
  engagement_date?: string; wedding_date?: string; delivery_date?: string;
  favorite_ids?: string[]; source?: string; lucky_gift?: string;
  assigned_to?: string; follow_up_date?: string; contract_value?: number;
}
export interface DbUserRoleRow {
  id: string; email: string; phone_number?: string; role: string; display_name?: string;
}
