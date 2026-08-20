<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import ActionBar from '@/components/layout/ActionBar.vue'
import ConversationDrawer from '@/components/chat/ConversationDrawer.vue'
import { useToast } from '@/composables/useToast'
import { useAppStore } from '@/stores/app.store'
import { useUiStore } from '@/stores/ui.store'
import { aiService, AiProviderError } from '@/services/ai.service'
import { AI_TRIAL_MAX_MESSAGES } from '@/models'
import { formatAssistantText } from '@/utils/chat-text'
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
const aiPoints = ref(0)
const trialRemaining = ref(AI_TRIAL_MAX_MESSAGES)
const messagesEl = ref<HTMLElement | null>(null)
const streamingId = ref<string | null>(null)

const hasOwnKey = ref(false)
const trialExhausted = computed(
  () => !hasOwnKey.value && trialRemaining.value <= 0,
)
const showTrialBanner = computed(() => !hasOwnKey.value && trialRemaining.value > 0)

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
  messages.value =
    loaded.length > 0
      ? loaded.map((m) => ({
          ...m,
          text: m.role === 'assistant' ? formatAssistantText(m.text) : m.text,
        }))
      : [welcome]
  drawerOpen.value = false
  await scrollToBottom()
}

async function refreshAiStatus() {
  const settings = await aiService.loadSettings()
  hasOwnKey.value = Boolean(settings.apiKey.trim())
  aiPoints.value = await aiService.getAiPoints()
  trialRemaining.value = await aiService.getTrialRemaining()
  configured.value = await aiService.getSettingsConfigured()
}

function goAiSettings() {
  router.push('/settings/ai')
}

async function bootstrap() {
  await appStore.initialize()
  await refreshAiStatus()
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
  if (typeof q === 'string' && q.trim() && !trialExhausted.value) {
    await send(q.trim())
  }
})

onActivated(async () => {
  await refreshAiStatus()
})

async function send(text: string) {
  const trimmed = text.trim()
  if (!trimmed || sending.value) return

  if (trialExhausted.value) {
    toast.error(`免费体验已用完（${AI_TRIAL_MAX_MESSAGES} 次），请填写 DeepSeek API Key 后才能继续提问`)
    return
  }

  if (!configured.value) {
    toast.error('请先在设置中填写 DeepSeek API Key')
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
      streamMsg.text = formatAssistantText(result.reply)
      streamMsg.id = `a-${Date.now()}`
    } else {
      messages.value.push({
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: formatAssistantText(result.reply),
      })
    }

    if (result.mutated) uiStore.bumpData()
    if (result.pointsConsumed) {
      trialRemaining.value = result.trialRemaining
      if (result.trialRemaining > 0) {
        toast.success(`本次已使用体验次数，还可提问 ${result.trialRemaining} 次`)
      }
      await refreshAiStatus()
      if (result.trialExhausted) {
        toast.show('免费体验已用完，请填写 DeepSeek API Key 后继续使用')
        goAiSettings()
      }
    }
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
      text: formatAssistantText(`出错了：${msg}`),
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
        <button type="button" class="icon-btn" aria-label="AI 设置" @click="goAiSettings">
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

    <div v-if="showTrialBanner" class="banner points">
      免费体验还可提问 {{ trialRemaining }} / {{ AI_TRIAL_MAX_MESSAGES }} 次，用完后需填写自己的 DeepSeek API Key
    </div>

    <div v-else-if="trialExhausted" class="banner required">
      免费体验已用完（{{ AI_TRIAL_MAX_MESSAGES }} 次），请填写 DeepSeek API Key 后才能继续使用
      <button type="button" class="banner-btn" @click="goAiSettings">去填写 API Key</button>
    </div>

    <div v-else-if="!configured" class="banner">
      尚未配置 API Key，
      <button type="button" @click="goAiSettings">去设置</button>
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
            {{ msg.role === 'assistant' ? formatAssistantText(msg.text) : msg.text }}
            <span v-if="sending && msg.id === streamingId && !msg.text" class="cursor">▍</span>
          </div>
        </article>
      </TransitionGroup>
      <div v-if="sending && statusText" class="status">{{ statusText }}</div>
    </div>

    <div class="composer">
      <ActionBar
        variant="chat"
        :disabled="sending"
        :hint="trialExhausted ? '试用已用完，发送将提示填写 API Key' : ''"
        @send="send"
      />
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
  color: var(--ink);
  font-size: 1rem;
  cursor: pointer;
}

.banner {
  flex-shrink: 0;
  margin: 0 0 0.5rem;
  padding: 0.55rem 0.75rem;
  border-radius: 12px;
  background: var(--cream-deep);
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.banner.points {
  background: rgba(201, 162, 39, 0.12);
  color: var(--brand-deep);
}

.banner.required {
  background: #fdecea;
  color: #a33232;
  border: 1px solid #f0c4c4;
}

.banner button,
.banner-btn {
  margin-left: 0.35rem;
  padding: 0.15rem 0.45rem;
  border: none;
  border-radius: 8px;
  background: var(--brand);
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
}

.banner.required .banner-btn {
  margin-left: 0;
  margin-top: 0.35rem;
  display: inline-block;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.25rem 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.bubble-wrap {
  display: flex;
}

.bubble-wrap.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 88%;
  padding: 0.65rem 0.85rem;
  border-radius: 16px;
  font-size: 0.92rem;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}

.bubble-wrap.user .bubble {
  background: var(--brand);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bubble-wrap.assistant .bubble {
  background: var(--panel);
  color: var(--ink);
  border: 1px solid var(--line);
  border-bottom-left-radius: 4px;
}

.status {
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted);
}

.cursor {
  animation: blink 0.8s step-end infinite;
}

.composer {
  flex-shrink: 0;
  padding-top: 0.25rem;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
