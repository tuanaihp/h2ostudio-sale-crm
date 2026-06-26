// H2O Bot Engine V2 — Types & Interfaces

export type CustomerIntent =
  | 'greeting'
  | 'consult'
  | 'pricing'
  | 'benefit'
  | 'booking'
  | 'deposit'
  | 'schedule'
  | 'objection'
  | 'confirm'
  | 'after_sale'
  | 'complaint'
  | 'chitchat';

export type SalesPhase =
  | 'opening'
  | 'discovery'
  | 'value_prop'
  | 'offer'
  | 'fomo'
  | 'closing'
  | 'pre_shoot'
  | 'followup'
  | 'qa';

export interface CustomerSlots {
  serviceType: string | null;
  location: 'studio' | 'outdoor' | 'both' | null;
  weddingMonth: string | null;
  weddingYear: string | null;
  budget: string | null;
  customerName: string | null;
  phoneNumber: string | null;
  conceptCount: number | null;
}

export interface ConversationStateV2 {
  sessionId: string;
  turnCount: number;
  currentPhase: SalesPhase;
  lastIntent: CustomerIntent | null;
  slots: CustomerSlots;
  sentScriptIds: string[];
  sentFaqIds: string[];
  flags: {
    hasSentPricing: boolean;
    hasSentFOMO: boolean;
    hasSentCombo: boolean;
    hasSentUSP: boolean;
  };
  leadScore: number;
  // Scenario (forced flow) state
  activeScenarioId: string | null;
  activeScenarioStep: number;
}

export interface BotV2Debug {
  intent: CustomerIntent;
  intentConfidence: number;
  detectedService: string | null;
  selectedPhase: SalesPhase;
  scriptId: string | null;
  scriptTitle: string | null;
  scriptScore: number;
  candidateScriptCount: number;
  injectedFaqId: string | null;
  injectedFaqTitle: string | null;
  businessRulesFired: string[];
  slotsFilledThisTurn: string[];
}

export interface BotV2Result {
  text: string;
  newState: ConversationStateV2;
  quickReplies: string[];
  nextQuestion: string | null;
  leadScoreAdd: number;
  faqId: string | number | null;
  handoffTrigger: boolean;
  debug: BotV2Debug;
  // Scenario auto-send steps (LiveChatBubble schedules these with setTimeout)
  scenarioAutoSteps: Array<{ content: string; delaySeconds: number }>;
}

export function createInitialStateV2(sessionId: string): ConversationStateV2 {
  return {
    sessionId,
    turnCount: 0,
    currentPhase: 'opening',
    lastIntent: null,
    slots: {
      serviceType: null,
      location: null,
      weddingMonth: null,
      weddingYear: null,
      budget: null,
      customerName: null,
      phoneNumber: null,
      conceptCount: null,
    },
    sentScriptIds: [],
    sentFaqIds: [],
    flags: {
      hasSentPricing: false,
      hasSentFOMO: false,
      hasSentCombo: false,
      hasSentUSP: false,
    },
    leadScore: 0,
    activeScenarioId: null,
    activeScenarioStep: 0,
  };
}
