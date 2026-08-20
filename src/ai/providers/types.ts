export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ChatCompletionOptions {
  onToken?: (chunk: string) => void
}

export interface ChatCompletionRequest {
  messages: ChatMessage[]
  tools?: ToolDefinition[]
  stream?: boolean
}

export interface ChatCompletionResult {
  message: ChatMessage
  finishReason: string | null
}

export interface ChatProvider {
  complete(
    request: ChatCompletionRequest,
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResult>
}

export class AiProviderError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AiProviderError'
    this.status = status
  }
}
