<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import VoiceOverlay from '@/components/voice/VoiceOverlay.vue'
import { useToast } from '@/composables/useToast'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'

const props = withDefaults(
  defineProps<{
    variant?: 'home' | 'chat'
    disabled?: boolean
    hint?: string
  }>(),
  {
    variant: 'home',
    disabled: false,
    hint: '',
  },
)

const emit = defineEmits<{
  record: []
  chat: []
  send: [text: string]
  voiceStart: []
  voiceEnd: []
}>()

const router = useRouter()
const toast = useToast()
const speech = useSpeechRecognition()

const mode = ref<'text' | 'voice'>('text')
const draft = ref('')
const holding = ref(false)
const canceling = ref(false)
const voiceActive = ref(false)
const startY = ref(0)

const modeLabel = computed(() =>
  mode.value === 'text' ? '切换语音记录' : '切换文字记录',
)

const voiceLabel = computed(() => {
  if (!holding.value) return '按住说话'
  if (canceling.value) return '松开取消'
  if (speech.interimText.value) return speech.interimText.value
  if (speech.listening.value) return '正在听…'
  return '按住说话'
})

const overlayText = computed(() => speech.displayTranscript())
const speechListening = computed(() => speech.listening.value)

function toggleMode() {
  if (mode.value === 'text' && !speech.supported) {
    toast.error('当前浏览器不支持语音识别，请使用 Chrome / Edge')
    return
  }
  mode.value = mode.value === 'text' ? 'voice' : 'text'
}

function openChat() {
  emit('chat')
  if (props.variant === 'home') {
    router.push('/chat')
  }
}

function submitText() {
  const text = draft.value.trim()
  if (!text) return
  emit('send', text)
  draft.value = ''
}

function onRecord() {
  emit('record')
}

function onVoiceDown(event: PointerEvent) {
  if (props.disabled) return
  if (!speech.supported) {
    toast.error('当前浏览器不支持语音识别')
    return
  }
  holding.value = true
  canceling.value = false
  voiceActive.value = true
  startY.value = event.clientY
  speech.start()
  emit('voiceStart')
}

function onVoiceMove(event: PointerEvent) {
  if (!holding.value) return
  canceling.value = startY.value - event.clientY > 72
}

async function onVoiceUp() {
  if (!holding.value) return
  const wasCanceling = canceling.value
  holding.value = false
  voiceActive.value = false
  canceling.value = false

  if (wasCanceling) {
    speech.cancel()
    emit('voiceEnd')
    return
  }

  await speech.stopAndWait()
  const text = speech.consumeTranscript()
  if (text) {
    emit('send', text)
  } else if (speech.error.value === 'not-allowed') {
    toast.error('请允许麦克风权限')
  } else if (speech.error.value && speech.error.value !== 'no-speech') {
    toast.error('语音识别失败')
  }
  emit('voiceEnd')
}

function onVoiceCancel() {
  if (!holding.value) return
  holding.value = false
  voiceActive.value = false
  canceling.value = false
  speech.cancel()
  emit('voiceEnd')
}
</script>

<template>
  <div
    class="action-bar"
    :class="{ 'chat-variant': variant === 'chat', disabled }"
    role="toolbar"
    aria-label="快捷操作"
  >
    <VoiceOverlay
      :active="voiceActive"
      :listening="speechListening"
      :canceling="canceling"
      :text="overlayText"
    />

    <button
      v-if="variant === 'home'"
      type="button"
      class="manual"
      aria-label="手动记录"
      @click="onRecord"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 5.25v13.5M5.25 12h13.5"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <div class="pill-wrap">
      <div class="pill" :class="{ holding, canceling }">
        <button
          type="button"
          class="mode-btn"
          :aria-label="modeLabel"
          :disabled="disabled"
          @click="toggleMode"
        >
          <svg
            v-if="mode === 'text'"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 3a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path
              d="M8 14v1a4 4 0 0 0 8 0v-1M12 19v2"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="5"
              y="7"
              width="14"
              height="10"
              rx="2"
              stroke="currentColor"
              stroke-width="1.8"
            />
            <path d="M8 11h8M8 14h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>

        <template v-if="mode === 'text'">
          <input
            v-model="draft"
            class="text-input"
            type="text"
            enterkeyhint="send"
            placeholder="文字记录或按住语音记录"
            :disabled="disabled"
            @keydown.enter="submitText"
          />
          <button
            type="button"
            class="send-btn"
            aria-label="发送"
            :disabled="disabled || !draft.trim()"
            @click="submitText"
          >
            +
          </button>
        </template>

        <button
          v-else
          type="button"
          class="voice-btn"
          :disabled="disabled"
          @pointerdown.prevent="onVoiceDown"
          @pointermove="onVoiceMove"
          @pointerup="onVoiceUp"
          @pointerleave="onVoiceCancel"
          @pointercancel="onVoiceCancel"
        >
          {{ voiceLabel }}
        </button>
      </div>
    </div>

    <button
      v-if="variant === 'home'"
      type="button"
      class="robot"
      aria-label="智能对话"
      @click="openChat"
    >
      <img class="robot-mark" src="/brand/cicada.png" alt="" width="40" height="40" />
    </button>

    <p v-if="props.hint" class="hint">{{ props.hint }}</p>
  </div>
</template>

<style scoped>
.action-bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(0.85rem + max(var(--safe-bottom), var(--keyboard-inset, 0px)));
  width: min(calc(100% - 1.1rem), calc(var(--app-max) - 1.1rem));
  display: flex;
  align-items: center;
  gap: 0.45rem;
  z-index: 40;
  pointer-events: none;
}

.action-bar.chat-variant {
  position: relative;
  left: auto;
  bottom: auto;
  transform: none;
  width: 100%;
  pointer-events: auto;
}

.action-bar.disabled {
  opacity: 0.72;
}

.manual,
.pill-wrap,
.pill,
.robot {
  pointer-events: auto;
}

.manual {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.55rem;
  height: 2.55rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  box-shadow: 0 6px 16px rgba(168, 132, 26, 0.28);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.manual:active {
  opacity: 0.9;
  transform: scale(0.96);
}

.pill-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.pill {
  min-height: 2.85rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.4rem 0.32rem 0.35rem;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--line);
  box-shadow: 0 8px 22px rgba(90, 70, 30, 0.08);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.pill.holding {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px #c9a22733;
}

.pill.canceling {
  border-color: #c0392b;
  box-shadow: 0 0 0 3px #c0392b33;
}

.mode-btn,
.send-btn,
.voice-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.mode-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
}

.mode-btn:active {
  background: var(--cream-deep);
}

.text-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 0.92rem;
  outline: none;
}

.text-input::placeholder {
  color: var(--muted-2);
}

.send-btn {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 999px;
  background: transparent;
  color: var(--brand-deep);
  font-size: 1.15rem;
  line-height: 1;
  transition: opacity 0.15s ease;
}

.send-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.voice-btn {
  flex: 1;
  min-height: 2rem;
  font-size: 0.92rem;
  color: var(--ink);
  touch-action: none;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.robot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.55rem;
  height: 2.55rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(90, 70, 30, 0.1);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.robot:active {
  transform: scale(0.96);
}

.robot-mark {
  width: 2.15rem;
  height: 2.15rem;
  object-fit: cover;
  border-radius: 999px;
  background: #fff9eb;
}

.hint {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.35rem);
  transform: translateX(-50%);
  margin: 0;
  padding: 0.25rem 0.55rem;
  border-radius: 8px;
  background: #2c2416e6;
  color: #fff;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
}
</style>
