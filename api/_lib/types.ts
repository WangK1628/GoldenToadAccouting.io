export type ApiPurpose = 'login' | 'register' | 'reset'

export interface ApiResult {
  status: number
  json: Record<string, unknown>
}

export interface UserProfile {
  id: string
  email: string
  createdAt: string
  updatedAt: string
  trialUsed: boolean
}

export interface PendingRecord {
  email: string
  codeHash: string
  purpose: ApiPurpose
  expiresAt: number
}
