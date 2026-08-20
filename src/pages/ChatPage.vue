<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import ActionBar from '@/components/layout/ActionBar.vue'
import ConversationDrawer from '@/components/chat/ConversationDrawer.vue'
import { useToast } from '@/composables/useToast'
import { useAppStore } from '@/stores/app.store'
import { useUiStore } from '@/stores/ui.store'
import { aiService, AiProviderError } from '@/services/ai.service'
import type { AiConversation } from '@/models'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const route = useRoute()
const router = useRouter()
const toast = useToast()
const appStore = useAppStore()
const uiStore = useUiStore()

const messages = ref<ChatMessage[]>([])
const conversations = ref<AiConversation[]>([])
const conversationId = ref<string | null>(null)
const drawerOpen = ref(false)
const sending = ref(false)
const statusText = ref('')
const configured = ref(false)
const messagesEl = ref<HTMLElement | null>(null)
const streamingId = ref<string | null>(null)

const welcome: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: '你好，我是金蝉 AI 记账助手。可以直接说「午饭花了 32」或问「这个月餐饮花了多少」。',
}

async function scrollToBottom() {
  await nextTick()
  messagesEl.value?.scrollTo({ top: messagesEl.value.scrollHeight, behavior: 'smooth' })
}

async function loadConversations() {
  conversations.value = await aiService.listConversations()
}

async function loadConversation(id: string) {
  conversationId.value = id
  const loaded = await aiService.loadMessages(id)
  messages.value = loaded.length > 0 ? loaded : [welcome]
  drawerOpen.value = false
  await scrollToBottom()
}

async function bootstrap() {
  await appStore.initialize()
  configured.value = await aiService.getSettingsConfigured()
  await loadConversations()

  if (conversations.value.length > 0) {
    await loadConversation(conversations.value[0].id)
  } else {
    messages.value = [welcome]
  }
}

function startNewConversation() {
  conversationId.value = null
  messages.value = [welcome]
  drawerOpen.value = false
}

async function deleteConversation(id: string) {
  await aiService.deleteConversation(id)
  await loadConversations()
  if (conversationId.value === id) {
    if (conversations.value.length > 0) {
      await loadConversation(conversations.value[0].id)
    } else {
      startNewConversation()
    }
  }
  toast.success('对话已删除')
}

onMounted(async () => {
  await bootstrap()
  const q = route.query.q
  if (typeof q === 'string' && q.trim()) {
    await send(q.trim())
  }
})

async function send(text: string) {
  const trimmed = text.trim()
  if (!trimmed || sending.value) return

  if (!configured.value) {
    toast.error('请先配置自己的 API Key，或使用注册赠送的一次体验')
    router.push('/settings/ai')
    return
  }

  sending.value = true
  statusText.value = '思考中…'
  streamingId.value = `a-stream-${Date.now()}`

  messages.value.push({ id: `u-${Date.now()}`, role: 'user', text: trimmed })
  messages.value.push({ id: streamingId.value, role: 'assistant', text: '' })
  await scrollToBottom()

  try {
    const result = await aiService.sendMessage(conversationId.value, trimmed, {
      onStatus: (s) => {
        statusText.value = s
        if (s !== '思考中…' && s !== '处理中…' && streamingId.value) {
          const msg = messages.value.find((m) => m.id === streamingId.value)
          if (msg) msg.text = ''
        }
      },
      onToken: (token) => {
        if (!streamingId.value) return
        const msg = messages.value.find((m) => m.id === streamingId.value)
        if (msg) msg.text += token
        scrollToBottom()
      },
    })

    conversationId.value = result.conversationId
    const streamMsg = messages.value.find((m) => m.id === streamingId.value)
    if (streamMsg) {
      streamMsg.text = result.reply
      streamMsg.id = `a-${Date.now()}`
    } else {
      messages.value.push({
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: result.reply,
      })
    }

    if (result.mutated) uiStore.bumpData()
    await loadConversations()
  } catch (e) {
    if (streamingId.value) {
      messages.value = messages.value.filter((m) => m.id !== streamingId.value)
    }
    const msg =
      e instanceof AiProviderError
        ? e.message
        : e instanceof Error
          ? e.message
          : '发送失败'
    toast.error(msg)
    messages.value.push({
      id: `err-${Date.now()}`,
      role: 'assistant',
      text: `出错了：${msg}`,
    })
  } finally {
    sending.value = false
    statusText.value = ''
    streamingId.value = null
    await scrollToBottom()
  }
}
</script>

<template>
  <div class="chat-page">
    <PageHeader title="AI 记账">
      <template #left>
        <button type="button" class="icon-btn" aria-label="对话历史" @click="drawerOpen = true">
          ☰
        </button>
      </template>
      <template #right>
        <button type="button" class="icon-btn" aria-label="新对话" @click="startNewConversation">
          ＋
        </button>
        <button type="button" class="icon-btn" aria-label="AI 设置" @click="router.push('/settings/ai')">
          ⚙
        </button>
      </template>
    </PageHeader>

    <ConversationDrawer
      :open="drawerOpen"
      :conversations="conversations"
      :active-id="conversationId"
      @close="drawerOpen = false"
      @select="loadConversation"
      @create="startNewConversation"
      @delete="deleteConversation"
    />

    <div v-if="!configured" class="banner">
      尚未配置 API Key，
      <button type="button" @click="router.push('/settings/ai')">去设置</button>
    </div>

    <div ref="messagesEl" class="messages">
      <TransitionGroup name="bubble">
        <article
          v-for="msg in messages"
          :key="msg.id"
          class="bubble-wrap"
          :class="msg.role"
        >
          <div class="bubble">
            {{ msg.text }}
            <span v-if="sending && msg.id === streamingId && !msg.text" class="cursor">▍</span>
          </div>
        </article>
      </TransitionGroup>
      <div v-if="sending && statusText" class="status">{{ statusText }}</div>
    </div>

    <div class="composer">
      <ActionBar variant="chat" :disabled="sending" @send="send" />
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  min-height: calc(var(--app-height) - 2rem - var(--safe-top) - var(--safe-bottom));
  margin: -0.15rem 0 0;
}

.icon-btn {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
}

.banner {
  margin-bottom: 0.65rem;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--brand-deep);
  font-size: 0.82rem;
}

.banner button {
  border: none;
  background: transparent;
  color: var(--brand-deep);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}

.bubble-wrap {
  display: flex;
}

.bubble-wrap.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 86%;
  padding: 0.72rem 0.85rem;
  border-radius: 16px;
  font-size: 0.92rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.bubble-wrap.assistant .bubble {
  background: var(--panel);
  border: 1px solid var(--line);
  border-bottom-left-radius: 6px;
}

.bubble-wrap.user .bubble {
  background: var(--brand);
  color: #fff;
  border-bottom-right-radius: 6px;
}

.cursor {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.status {
  align-self: flex-start;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: var(--cream);
  color: var(--muted);
  font-size: 0.78rem;
}

.composer {
  position: sticky;
  bottom: 0;
  padding-top: 0.35rem;
  background: linear-gradient(180deg, transparent, var(--bg0) 28%);
}
</style>
