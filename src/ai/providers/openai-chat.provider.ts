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
  error?: { message?: string }
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
      if (!settings.apiKey) {
        throw new AiProviderError('未配置 API Key，请先在设置中填写')
      }

      const useStream = Boolean(request.stream && options?.onToken)
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(buildRequestBody(settings, { ...request, stream: useStream })),
      })

      if (!useStream) {
        const payload = (await response.json()) as StreamChoicePayload
        if (!response.ok) {
          throw new AiProviderError(
            payload.error?.message ?? `请求失败 (${response.status})`,
            response.status,
          )
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
          message = payload.error?.message ?? message
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
