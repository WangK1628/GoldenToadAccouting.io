import type { AiConversation, AiMessage, AiSettings, ThemeMode } from '@/models'
import { AI_TRIAL_MAX_MESSAGES, AI_TRIAL_MESSAGE_COST, GUIDE_REWARD_POINTS, SETTING_KEYS } from '@/models'
import { BaseRepository } from '@/repositories/base.repository'
import { createId } from '@/utils/id'
import { nowIso } from '@/utils/time'

const DEFAULT_AI_SETTINGS: Omit<AiSettings, 'apiKey'> = {
  provider: 'deepseek',
  baseUrl: import.meta.env.VITE_DEFAULT_AI_BASE_URL ?? 'https://api.deepseek.com',
  model: import.meta.env.VITE_DEFAULT_AI_MODEL ?? 'deepseek-chat',
  temperature: 0.2,
}

export class SettingsRepository extends BaseRepository {
  async get(key: string): Promise<string | undefined> {
    const db = await this.db()
    const row = await db.settings.get(key)
    return row?.value
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.db()
    await db.settings.put({ key, value, updatedAt: nowIso() })
  }

  async getTheme(): Promise<ThemeMode> {
    const value = await this.get(SETTING_KEYS.theme)
    if (value === 'light' || value === 'dark' || value === 'system') return value
    return 'system'
  }

  async setTheme(mode: ThemeMode): Promise<void> {
    await this.set(SETTING_KEYS.theme, mode)
  }

  async getCurrentBookId(): Promise<string | undefined> {
    return this.get(SETTING_KEYS.currentBookId)
  }

  async setCurrentBookId(bookId: string): Promise<void> {
    await this.set(SETTING_KEYS.currentBookId, bookId)
  }

  async getAiSettings(): Promise<AiSettings> {
    const provider = (await this.get(SETTING_KEYS.aiProvider)) as AiSettings['provider'] | undefined
    const baseUrl = await this.get(SETTING_KEYS.aiBaseUrl)
    const model = await this.get(SETTING_KEYS.aiModel)
    const temperatureRaw = await this.get(SETTING_KEYS.aiTemperature)
    const apiKeyEnc = await this.get(SETTING_KEYS.aiApiKeyEnc)

    return {
      provider: provider ?? DEFAULT_AI_SETTINGS.provider,
      baseUrl: baseUrl ?? DEFAULT_AI_SETTINGS.baseUrl,
      model: model ?? DEFAULT_AI_SETTINGS.model,
      temperature: temperatureRaw ? Number.parseFloat(temperatureRaw) : DEFAULT_AI_SETTINGS.temperature,
      apiKey: apiKeyEnc ? await decryptApiKey(apiKeyEnc) : '',
    }
  }

  async saveAiSettings(settings: AiSettings): Promise<void> {
    await this.set(SETTING_KEYS.aiProvider, settings.provider)
    await this.set(SETTING_KEYS.aiBaseUrl, settings.baseUrl)
    await this.set(SETTING_KEYS.aiModel, settings.model)
    await this.set(SETTING_KEYS.aiTemperature, String(settings.temperature))
    if (settings.apiKey) {
      await this.set(SETTING_KEYS.aiApiKeyEnc, await encryptApiKey(settings.apiKey))
      await this.setAiTrialAvailable(false)
    }
  }

  async getAiPoints(): Promise<number> {
    const raw = await this.get(SETTING_KEYS.aiPoints)
    if (!raw) return 0
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  async setAiPoints(points: number): Promise<void> {
    const safe = Math.max(0, Math.floor(points))
    await this.set(SETTING_KEYS.aiPoints, String(safe))
    const canTrial = safe >= AI_TRIAL_MESSAGE_COST && (await this.getTrialUseCount()) < AI_TRIAL_MAX_MESSAGES
    await this.setAiTrialAvailable(canTrial)
  }

  async grantGuideRewardPoints(): Promise<void> {
    await this.setAiPoints(GUIDE_REWARD_POINTS)
  }

  async getTrialUseCount(): Promise<number> {
    const raw = await this.get(SETTING_KEYS.aiTrialUses)
    const value = Number.parseInt(raw ?? '0', 10)
    if (!Number.isFinite(value) || value < 0) return 0
    return Math.min(AI_TRIAL_MAX_MESSAGES, value)
  }

  async getTrialRemaining(): Promise<number> {
    return Math.max(0, AI_TRIAL_MAX_MESSAGES - await this.getTrialUseCount())
  }

  async canUseTrialApi(): Promise<boolean> {
    const settings = await this.getAiSettings()
    if (settings.apiKey.trim()) return false
    return (await this.getTrialUseCount()) < AI_TRIAL_MAX_MESSAGES
  }

  async reserveTrialMessage(): Promise<{ usedTrial: boolean; remaining: number; uses: number }> {
    const settings = await this.getAiSettings()
    if (settings.apiKey.trim()) {
      return { usedTrial: false, remaining: AI_TRIAL_MAX_MESSAGES, uses: 0 }
    }
    const uses = await this.getTrialUseCount()
    if (uses >= AI_TRIAL_MAX_MESSAGES) {
      return { usedTrial: false, remaining: 0, uses }
    }
    const next = await this.incrementTrialUseCount()
    return {
      usedTrial: true,
      remaining: Math.max(0, AI_TRIAL_MAX_MESSAGES - next),
      uses: next,
    }
  }

  private async incrementTrialUseCount(): Promise<number> {
    const next = Math.min(AI_TRIAL_MAX_MESSAGES, (await this.getTrialUseCount()) + 1)
    await this.set(SETTING_KEYS.aiTrialUses, String(next))
    const remaining = Math.max(0, AI_TRIAL_MAX_MESSAGES - next)
    await this.setAiPoints(remaining * AI_TRIAL_MESSAGE_COST)
    if (next >= AI_TRIAL_MAX_MESSAGES) {
      await this.setAiTrialAvailable(false)
    }
    return next
  }

  async isAiConfigured(): Promise<boolean> {
    const settings = await this.getAiSettings()
    if (settings.apiKey.trim()) return true
    return await this.canUseTrialApi()
  }

  async deductAiPoints(cost: number): Promise<number> {
    const current = await this.getAiPoints()
    const next = Math.max(0, current - Math.max(1, Math.floor(cost)))
    await this.setAiPoints(next)
    return next
  }

  /** @deprecated use deductAiPoints */
  async consumeAiPoints(): Promise<void> {
    await this.setAiPoints(0)
  }

  async isAiTrialAvailable(): Promise<boolean> {
    return await this.canUseTrialApi()
  }

  async setAiTrialAvailable(enabled: boolean): Promise<void> {
    await this.set(SETTING_KEYS.aiTrial, enabled ? '1' : '0')
  }
}

export class AiLogRepository extends BaseRepository {
  async listConversations(): Promise<AiConversation[]> {
    const db = await this.db()
    return db.aiConversations.orderBy('updatedAt').reverse().toArray()
  }

  async createConversation(title: string): Promise<AiConversation> {
    const db = await this.db()
    const timestamp = nowIso()
    const conversation: AiConversation = {
      id: createId('conv'),
      title,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.aiConversations.add(conversation)
    return conversation
  }

  async appendMessage(
    input: Omit<AiMessage, 'id' | 'createdAt'>,
  ): Promise<AiMessage> {
    const db = await this.db()
    const message: AiMessage = {
      ...input,
      id: createId('msg'),
      createdAt: nowIso(),
    }
    await db.transaction('rw', db.aiMessages, db.aiConversations, async () => {
      await db.aiMessages.add(message)
      const conv = await db.aiConversations.get(input.conversationId)
      if (conv) {
        await db.aiConversations.put({ ...conv, updatedAt: message.createdAt })
      }
    })
    return message
  }

  async listMessages(conversationId: string): Promise<AiMessage[]> {
    const db = await this.db()
    return db.aiMessages.where('conversationId').equals(conversationId).sortBy('createdAt')
  }

  async getConversation(id: string): Promise<AiConversation | undefined> {
    const db = await this.db()
    return db.aiConversations.get(id)
  }

  async deleteConversation(id: string): Promise<void> {
    const db = await this.db()
    await db.transaction('rw', db.aiConversations, db.aiMessages, async () => {
      await db.aiMessages.where('conversationId').equals(id).delete()
      await db.aiConversations.delete(id)
    })
  }

  async renameConversation(id: string, title: string): Promise<void> {
    const db = await this.db()
    const existing = await db.aiConversations.get(id)
    if (!existing) return
    await db.aiConversations.put({
      ...existing,
      title,
      updatedAt: nowIso(),
    })
  }
}

/** 本地简易加密占位：Phase 6 可换 Web Crypto AES-GCM */
async function encryptApiKey(key: string): Promise<string> {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(key)))
  }
  return key
}

async function decryptApiKey(enc: string): Promise<string> {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(enc)))
  }
  return enc
}

export const settingsRepository = new SettingsRepository()
export const aiLogRepository = new AiLogRepository()
