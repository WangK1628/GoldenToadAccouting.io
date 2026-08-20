import type { AiSettings } from '@/models'
import type {
  ChatCompletionOptions,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatProvider,
  ToolCall,
} from '@/ai/providers/types'
import { AiProviderError } from '@/ai/providers/types'
import { readSseJson } from '@/ai/providers/sse'

interface StreamChoicePayload {
  error?: { message?: string } | string
  ok?: boolean
  choices?: Array<{
    finish_reason?: string | null
    delta?: {
      content?: string | null
      tool_calls?: Array<{
        index?: number
        id?: string
        type?: 'function'
        function?: { name?: string; arguments?: string }
      }>
    }
    message?: {
      role: string
      content: string | null
      tool_calls?: ToolCall[]
    }
  }>
}

function readProviderError(payload: StreamChoicePayload, status: number): string {
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error
  if (payload.error && typeof payload.error === 'object' && payload.error.message) {
    return payload.error.message
  }
  return `请求失败 (${status})`
}

function buildRequestBody(settings: AiSettings, request: ChatCompletionRequest) {
  return {
    model: settings.model,
    messages: request.messages,
    tools: request.tools,
    tool_choice: request.tools?.length ? 'auto' : undefined,
    temperature: settings.temperature,
    stream: Boolean(request.stream),
  }
}

function parseToolCalls(
  accum: Map<number, { id: string; name: string; arguments: string }>,
): ToolCall[] | undefined {
  if (accum.size === 0) return undefined
  return [...accum.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, tc]) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.name, arguments: tc.arguments },
    }))
}

export function createChatProvider(settings: AiSettings): ChatProvider {
  const baseUrl = settings.baseUrl.replace(/\/$/, '')

  return {
    async complete(
      request: ChatCompletionRequest,
      options?: ChatCompletionOptions,
    ): Promise<ChatCompletionResult> {
      if (!settings.apiKey && !settings.trialEmail && !settings.trialUserId) {
        throw new AiProviderError('未配置 API Key，请先在设置中填写')
      }

      const useTrial = Boolean(!settings.apiKey && (settings.trialEmail || settings.trialUserId))
      const useStream = !useTrial && Boolean(request.stream && options?.onToken)
      const url = useTrial ? '/api/ai-trial' : `${baseUrl}/v1/chat/completions`
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (useTrial) {
        if (settings.trialEmail) headers['X-User-Email'] = settings.trialEmail
        if (settings.trialUserId) headers['X-User-Id'] = settings.trialUserId
      } else if (settings.apiKey) {
        headers.Authorization = `Bearer ${settings.apiKey}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...buildRequestBody(settings, { ...request, stream: useStream }),
          email: settings.trialEmail,
          userId: settings.trialUserId,
        }),
      })

      if (!useStream) {
        const payload = (await response.json()) as StreamChoicePayload
        if (!response.ok) {
          throw new AiProviderError(readProviderError(payload, response.status), response.status)
        }
        const choice = payload.choices?.[0]
        if (!choice?.message) throw new AiProviderError('模型返回为空')
        return {
          message: {
            role: 'assistant',
            content: choice.message.content,
            tool_calls: choice.message.tool_calls,
          },
          finishReason: choice.finish_reason ?? null,
        }
      }

      if (!response.ok) {
        let message = `请求失败 (${response.status})`
        try {
          const payload = (await response.json()) as StreamChoicePayload
          message = readProviderError(payload, response.status)
        } catch {
          // ignore
        }
        throw new AiProviderError(message, response.status)
      }

      let content = ''
      let finishReason: string | null = null
      const toolAccum = new Map<number, { id: string; name: string; arguments: string }>()

      for await (const chunk of readSseJson(response)) {
        const payload = chunk as StreamChoicePayload
        const choice = payload.choices?.[0]
        if (!choice) continue

        if (choice.finish_reason) finishReason = choice.finish_reason

        const delta = choice.delta
        if (!delta) continue

        if (delta.content) {
          content += delta.content
          options?.onToken?.(delta.content)
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index ?? 0
            const current = toolAccum.get(index) ?? { id: '', name: '', arguments: '' }
            if (tc.id) current.id = tc.id
            if (tc.function?.name) current.name = tc.function.name
            if (tc.function?.arguments) current.arguments += tc.function.arguments
            toolAccum.set(index, current)
          }
        }
      }

      const tool_calls = parseToolCalls(toolAccum)
      return {
        message: {
          role: 'assistant',
          content: content || null,
          tool_calls,
        },
        finishReason,
      }
    },
  }
}

export { AiProviderError } from '@/ai/providers/types'
