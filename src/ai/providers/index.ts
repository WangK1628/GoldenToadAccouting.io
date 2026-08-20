import type { AiSettings } from '@/models'
import { createChatProvider } from '@/ai/providers/openai-chat.provider'
import type { ChatProvider } from '@/ai/providers/types'

export function createProvider(settings: AiSettings): ChatProvider {
  return createChatProvider(settings)
}

export type { ChatProvider, ChatMessage, ToolDefinition, ToolCall } from '@/ai/providers/types'
export { AiProviderError } from '@/ai/providers/types'
