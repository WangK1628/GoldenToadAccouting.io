import { Capacitor } from '@capacitor/core'
import { onUnmounted, ref } from 'vue'

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionResultEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

async function ensureNativeMicPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true
  if (!navigator.mediaDevices?.getUserMedia) return true
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch {
    return false
  }
}

export function useSpeechRecognition() {
  const supported = Boolean(getRecognitionCtor())
  const listening = ref(false)
  const interimText = ref('')
  const finalText = ref('')
  const error = ref<string | null>(null)

  let recognition: SpeechRecognitionInstance | null = null
  let endResolve: (() => void) | null = null

  function ensureRecognition() {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return null
    if (!recognition) {
      recognition = new Ctor()
      recognition.lang = 'zh-CN'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0]?.transcript?.trim() ?? ''
          if (!text) continue
          if (result.isFinal) final += text
          else interim += text
        }
        if (final) {
          finalText.value = `${finalText.value}${final}`.trim()
          interimText.value = ''
        } else {
          interimText.value = interim
        }
      }

      recognition.onerror = (event) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
          error.value = event.error
        }
      }

      recognition.onend = () => {
        listening.value = false
        endResolve?.()
        endResolve = null
      }
    }
    return recognition
  }

  function finalizeInterim() {
    if (interimText.value) {
      finalText.value = `${finalText.value}${interimText.value}`.trim()
      interimText.value = ''
    }
  }

  async function start(): Promise<boolean> {
    error.value = null
    interimText.value = ''
    finalText.value = ''

    if (Capacitor.isNativePlatform()) {
      const allowed = await ensureNativeMicPermission()
      if (!allowed) {
        error.value = 'not-allowed'
        return false
      }
    }

    const rec = ensureRecognition()
    if (!rec) {
      error.value = 'unsupported'
      return false
    }
    try {
      rec.start()
      listening.value = true
      return true
    } catch {
      error.value = 'start-failed'
      listening.value = false
      return false
    }
  }

  function stop() {
    recognition?.stop()
  }

  function cancel() {
    recognition?.abort()
    listening.value = false
    interimText.value = ''
    finalText.value = ''
  }

  async function stopAndWait(timeoutMs = 3500): Promise<void> {
    if (!recognition || !listening.value) {
      finalizeInterim()
      return
    }
    await new Promise<void>((resolve) => {
      endResolve = () => {
        finalizeInterim()
        resolve()
      }
      recognition?.stop()
      window.setTimeout(() => {
        finalizeInterim()
        resolve()
      }, timeoutMs)
    })
  }

  function displayTranscript(): string {
    return `${finalText.value}${interimText.value}`.trim()
  }

  function consumeTranscript(): string {
    finalizeInterim()
    const text = displayTranscript()
    interimText.value = ''
    finalText.value = ''
    return text
  }

  onUnmounted(() => {
    cancel()
    recognition = null
  })

  return {
    supported,
    listening,
    interimText,
    finalText,
    error,
    start,
    stop,
    cancel,
    stopAndWait,
    displayTranscript,
    consumeTranscript,
  }
}
