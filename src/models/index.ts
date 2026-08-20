export type TransactionType = 'expense' | 'income'

export type ThemeMode = 'light' | 'dark' | 'system'

export type AuthMode = 'guest' | 'registered' | 'admin'

export interface AuthSession {
  mode: AuthMode
  userId: string | null
  email: string | null
  displayName: string
}

export type AiProviderType = 'deepseek' | 'openai-compatible' | 'custom'

export interface User {
  id: string
  email: string
  displayName: string
  passwordHash: string
  salt: string
  createdAt: string
  updatedAt: string
}

export interface Book {
  id: string
  name: string
  note?: string
  isDefault: boolean
  sort: number
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  bookId: string
  name: string
  type: TransactionType
  parentId: string | null
  sort: number
  icon: string
  color?: string
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: string
  name: string
  color?: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  bookId: string
  type: TransactionType
  /** 金额，单位：分 */
  amount: number
  categoryId: string
  subcategoryId: string | null
  date: string
  time: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface TransactionTag {
  id: string
  transactionId: string
  tagId: string
}

export interface Budget {
  id: string
  bookId: string
  /** YYYY-MM */
  yearMonth: string
  /** 金额，单位：分；yearMonth 为空字符串表示默认预算模板 */
  amount: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface AiConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type AiMessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface AiMessage {
  id: string
  conversationId: string
  role: AiMessageRole
  content: string
  toolName?: string
  toolArguments?: string
  toolResult?: string
  createdAt: string
}

export interface SettingRecord {
  key: string
  value: string
  updatedAt: string
}

export interface AiSettings {
  provider: AiProviderType
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  trialEmail?: string
  trialUserId?: string
}

/** 完成新手引导赠送的展示积分（与试用次数配套） */
export const GUIDE_REWARD_POINTS = 100
/** 每次 AI 提问消耗的展示积分 */
export const AI_TRIAL_MESSAGE_COST = 33
/** 默认免费试用次数（无自配 API Key 时） */
export const AI_TRIAL_MAX_MESSAGES = 3

export const SETTING_KEYS = {
  theme: 'theme',
  authSession: 'auth.session',
  currentBookId: 'currentBookId',
  aiProvider: 'ai.provider',
  aiBaseUrl: 'ai.baseUrl',
  aiApiKeyEnc: 'ai.apiKey.enc',
  aiModel: 'ai.model',
  aiTemperature: 'ai.temperature',
  aiTrial: 'ai.trial',
  aiPoints: 'ai.points',
  aiTrialUses: 'ai.trialUses',
  firstLaunchReward: 'ai.firstLaunchReward',
  personalStarted: 'account.personalStarted',
  featureGuideDone: 'ui.featureGuideDone',
  featureGuideOpsDone: 'ui.featureGuideOpsDone',
  emailPending: 'auth.emailPending',
} as const
