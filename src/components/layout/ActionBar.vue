<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import VoiceOverlay from '@/components/voice/VoiceOverlay.vue'
import { useToast } from '@/composables/useToast'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'

const HOLD_MS = 180

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

const draft = ref('')
const holding = ref(false)
const canceling = ref(false)
const voiceActive = ref(false)
const startY = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)
const pillEl = ref<HTMLElement | null>(null)

let holdTimer: ReturnType<typeof setTimeout> | null = null

const overlayText = computed(() => speech.displayTranscript())
const speechListening = computed(() => speech.listening.value)

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

function clearHoldTimer() {
  if (!holdTimer) return
  clearTimeout(holdTimer)
  holdTimer = null
}

function isSendTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('.send-btn'))
}

function onPillDown(event: PointerEvent) {
  if (props.disabled || isSendTarget(event.target)) return
  startY.value = event.clientY
  canceling.value = false
  pillEl.value?.setPointerCapture(event.pointerId)
  clearHoldTimer()
  holdTimer = setTimeout(() => {
    holdTimer = null
    inputEl.value?.blur()
    void beginVoice()
  }, HOLD_MS)
}

function onPillMove(event: PointerEvent) {
  if (!holding.value) return
  canceling.value = startY.value - event.clientY > 72
}

async function onPillUp() {
  const pendingHold = Boolean(holdTimer)
  clearHoldTimer()
  if (holding.value || voiceActive.value) {
    await finishVoice()
    return
  }
  if (pendingHold) inputEl.value?.focus()
}

async function beginVoice() {
  if (props.disabled || holding.value) return
  if (!speech.supported) {
    toast.error('当前环境不支持语音识别，请用 Chrome / Edge，或在系统里允许麦克风')
    return
  }
  holding.value = true
  voiceActive.value = true
  const started = await speech.start()
  if (!started) {
    holding.value = false
    voiceActive.value = false
    if (speech.error.value === 'not-allowed') toast.error('请允许麦克风权限后重试')
    else toast.error('无法开始语音识别')
    return
  }
  emit('voiceStart')
}

async function finishVoice() {
  if (!holding.value && !voiceActive.value) return
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
    toast.error('没听清，请按住再试一次')
  }
  emit('voiceEnd')
}

function onVoiceCancel() {
  clearHoldTimer()
  if (!holding.value && !voiceActive.value) return
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
      data-guide="record-btn"
      aria-label="手动记录"
      @click="onRecord"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 5.25v13.5M5.25 12h13.5"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <div class="pill-wrap">
      <div
        ref="pillEl"
        class="pill"
        data-guide="voice-pill"
        :class="{ holding, canceling }"
        @pointerdown="onPillDown"
        @pointermove="onPillMove"
        @pointerup="onPillUp"
        @pointercancel="onVoiceCancel"
      >
        <span class="mic-slot" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
        </span>

        <input
          ref="inputEl"
          v-model="draft"
          class="text-input"
          type="text"
          enterkeyhint="send"
          placeholder="文字记录或按住语音记录"
          :disabled="disabled"
          @keydown.enter.prevent="submitText"
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
      </div>
    </div>

    <button
      v-if="variant === 'home'"
      type="button"
      class="robot"
      data-guide="chat-btn"
      aria-label="智能对话"
      @click="openChat"
    >
      <img class="robot-mark" src="/brand/cicada.png" alt="" width="44" height="44" />
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
  gap: 0.5rem;
  z-index: 40;
  pointer-events: none;
}

.action-bar:has([data-guide-active='true']) {
  z-index: 96;
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

.manual,
.robot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 3.15rem;
  height: 3.15rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.manual {
  background: var(--brand);
  color: #fff;
  box-shadow: 0 6px 16px rgba(168, 132, 26, 0.28);
}

.manual:active,
.robot:active {
  opacity: 0.9;
  transform: scale(0.96);
}

.pill-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.pill {
  min-height: 3.15rem;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.28rem 0.4rem 0.28rem 0.28rem;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--line);
  box-shadow: 0 8px 22px rgba(90, 70, 30, 0.08);
  touch-action: none;
  user-select: none;
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

.mic-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.7rem;
  height: 2.7rem;
  flex-shrink: 0;
  color: var(--muted);
  pointer-events: none;
}

.send-btn {
  border: none;
  background: transparent;
  color: var(--brand-deep);
  cursor: pointer;
  width: 2.7rem;
  height: 2.7rem;
  border-radius: 999px;
  font-size: 1.35rem;
  line-height: 1;
  flex-shrink: 0;
}

.send-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.text-input {
  flex: 1;
  min-width: 0;
  min-height: 2.7rem;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 0.95rem;
  outline: none;
}

.text-input::placeholder {
  color: var(--muted-2);
}

.robot {
  background: #fff;
  box-shadow: 0 6px 16px rgba(90, 70, 30, 0.1);
}

.robot-mark {
  width: 2.45rem;
  height: 2.45rem;
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
