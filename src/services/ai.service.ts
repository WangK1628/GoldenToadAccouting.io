import { createProvider, AiProviderError } from '@/ai/providers'
import type { ChatMessage } from '@/ai/providers'
import { SYSTEM_PROMPT } from '@/ai/prompts/system'
import { AI_TOOLS } from '@/ai/tools/definitions'
import { toolStatusLabel } from '@/ai/tools/labels'
import { buildBookContext, executeToolCall } from '@/ai/tools/executor'
import type { AiConversation, AiSettings, AuthSession } from '@/models'
import { GUIDE_REWARD_POINTS } from '@/models'
import { aiLogRepository, settingsRepository } from '@/repositories'
import { appService } from '@/services/app.service'
import { authService } from '@/services/auth.service'

const MAX_TOOL_ROUNDS = 8

export interface ChatReply {
  conversationId: string
  reply: string
  mutated: boolean
  pointsConsumed: boolean
}

export interface ChatMessageView {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
}

export interface SendMessageCallbacks {
  onStatus?: (status: string) => void
  onToken?: (token: string) => void
}

function trialIdentity(session: AuthSession | null): Pick<AiSettings, 'trialEmail' | 'trialUserId'> {
  if (!session) return {}
  if (session.email && session.mode !== 'guest') {
    return { trialEmail: session.email }
  }
  if (session.userId) {
    return { trialUserId: session.userId }
  }
  return {}
}

class AiService {
  async getAiPoints(): Promise<number> {
    return settingsRepository.getAiPoints()
  }

  async getSettingsConfigured(): Promise<boolean> {
    const settings = await settingsRepository.getAiSettings()
    if (settings.apiKey.trim()) return true
    const points = await settingsRepository.getAiPoints()
    return points >= GUIDE_REWARD_POINTS
  }

  async loadSettings() {
    return settingsRepository.getAiSettings()
  }

  async saveSettings(settings: Parameters<typeof settingsRepository.saveAiSettings>[0]) {
    await settingsRepository.saveAiSettings(settings)
  }

  private async resolveSettings(): Promise<AiSettings> {
    const settings = await settingsRepository.getAiSettings()
    if (settings.apiKey.trim()) return settings
    const points = await settingsRepository.getAiPoints()
    if (points < GUIDE_REWARD_POINTS) return settings
    const session = await authService.getSession()
    return { ...settings, ...trialIdentity(session) }
  }

  private async consumePointsIfRecorded(
    trialId: string | undefined,
    usedPoints: boolean,
    mutated: boolean,
  ): Promise<boolean> {
    if (!usedPoints || !mutated || !trialId) return false
    await settingsRepository.consumeAiPoints()
    try {
      await fetch('/api/consume-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          trialId.includes('@') ? { email: trialId } : { userId: trialId },
        ),
      })
    } catch {
      // 本地积分已清零，远端标记失败不影响继续使用自己的 Key
    }
    return true
  }

  async listConversations(): Promise<AiConversation[]> {
    return aiLogRepository.listConversations()
  }

  async loadMessages(conversationId: string): Promise<ChatMessageView[]> {
    const rows = await aiLogRepository.listMessages(conversationId)
    return rows
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        text: m.content,
        createdAt: m.createdAt,
      }))
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await aiLogRepository.deleteConversation(conversationId)
  }

  async renameConversation(conversationId: string, title: string): Promise<void> {
    await aiLogRepository.renameConversation(conversationId, title.trim())
  }

  async sendMessage(
    conversationId: string | null,
    userText: string,
    callbacks?: SendMessageCallbacks,
  ): Promise<ChatReply> {
    const trimmed = userText.trim()
    if (!trimmed) throw new Error('消息不能为空')

    await appService.initialize()
    const book = await appService.getCurrentBook()
    const settings = await this.resolveSettings()
    const usedPoints = !settings.apiKey.trim()

    if (!settings.apiKey.trim() && !settings.trialEmail && !settings.trialUserId) {
      const points = await settingsRepository.getAiPoints()
      if (points >= GUIDE_REWARD_POINTS) {
        throw new AiProviderError('请重新进入应用后再试，或先在设置中配置 AI API Key')
      }
      throw new AiProviderError('请完成新手引导获取积分，或在设置中配置 AI API Key')
    }

    let convId = conversationId
    if (!convId) {
      const title = trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed
      const conv = await aiLogRepository.createConversation(title)
      convId = conv.id
    }

    await aiLogRepository.appendMessage({
      conversationId: convId,
      role: 'user',
      content: trimmed,
    })

    const history = await this.loadMessages(convId)
    const context = await buildBookContext(book.id)
    const provider = createProvider(settings)

    const apiMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: context },
      ...history.map((m) => ({
        role: m.role,
        content: m.text,
      })),
    ]

    let mutated = false
    let rounds = 0
    const trialId = settings.trialEmail ?? settings.trialUserId

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds += 1
      callbacks?.onStatus?.(rounds === 1 ? '思考中…' : '处理中…')

      const completion = await provider.complete(
        { messages: apiMessages, tools: AI_TOOLS, stream: true },
        { onToken: callbacks?.onToken },
      )

      const assistantMsg = completion.message

      if (assistantMsg.tool_calls?.length) {
        apiMessages.push({
          role: 'assistant',
          content: assistantMsg.content,
          tool_calls: assistantMsg.tool_calls,
        })

        for (const call of assistantMsg.tool_calls) {
          const label = toolStatusLabel(call.function.name)
          callbacks?.onStatus?.(`${label}…`)
          let toolResult: string
          try {
            const executed = await executeToolCall(
              call.function.name,
              call.function.arguments,
              book.id,
            )
            if (executed.mutated) mutated = true
            toolResult = executed.result
          } catch (e) {
            toolResult = JSON.stringify({
              error: e instanceof Error ? e.message : '工具执行失败',
            })
          }

          apiMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: call.function.name,
            content: toolResult,
          })
        }
        continue
      }

      const reply = assistantMsg.content?.trim() || '已完成。'
      await aiLogRepository.appendMessage({
        conversationId: convId,
        role: 'assistant',
        content: reply,
      })

      const pointsConsumed = await this.consumePointsIfRecorded(trialId, usedPoints, mutated)
      return { conversationId: convId, reply, mutated, pointsConsumed }
    }

    const fallback = '操作步骤较多，请简化问题后重试。'
    await aiLogRepository.appendMessage({
      conversationId: convId,
      role: 'assistant',
      content: fallback,
    })
    const pointsConsumed = await this.consumePointsIfRecorded(trialId, usedPoints, mutated)
    return { conversationId: convId, reply: fallback, mutated, pointsConsumed }
  }
}

export const aiService = new AiService()
export { AiProviderError }
