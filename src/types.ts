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
}

export interface AppConfig {
  brandName: string;
  zaloUrl: string;
  facebookMessengerUrl: string;
  hotline: string;
  description: string;
}
