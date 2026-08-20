<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useUiStore } from '@/stores/ui.store'

const CLEAN_VIDEO_URL = `${import.meta.env.BASE_URL}videos/clean.mp4`
const DEFAULT_PLAYBACK_RATE = 1.5
const DEFAULT_START_SECONDS = 60

const uiStore = useUiStore()

const videoEl = ref<HTMLVideoElement | null>(null)
const playing = ref(false)
const muted = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progressValue = ref(0)
const seeking = ref(false)

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function syncFromVideo() {
  const video = videoEl.value
  if (!video || seeking.value) return
  currentTime.value = video.currentTime
  duration.value = Number.isFinite(video.duration) ? video.duration : 0
  progressValue.value = duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  playing.value = !video.paused && !video.ended
}

function seekToDefaultStart() {
  const video = videoEl.value
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
  const start = Math.min(DEFAULT_START_SECONDS, Math.max(0, video.duration - 0.5))
  video.currentTime = start
  currentTime.value = start
  progressValue.value = (start / video.duration) * 100
}

function onLoadedMetadata() {
  const video = videoEl.value
  if (!video) return
  duration.value = Number.isFinite(video.duration) ? video.duration : 0
  video.playbackRate = DEFAULT_PLAYBACK_RATE
  seekToDefaultStart()
}

async function startPlayback() {
  const video = videoEl.value
  if (!video) return
  video.playbackRate = DEFAULT_PLAYBACK_RATE
  if (video.readyState >= 1) {
    seekToDefaultStart()
  }
  try {
    await video.play()
    playing.value = true
  } catch {
    playing.value = false
  }
}

function togglePlay() {
  const video = videoEl.value
  if (!video) return
  if (video.paused || video.ended) {
    if (video.ended) video.currentTime = 0
    void startPlayback()
    return
  }
  video.pause()
  playing.value = false
}

function toggleMute() {
  const video = videoEl.value
  if (!video) return
  muted.value = !muted.value
  video.muted = muted.value
}

function seekToPercent(percent: number) {
  const video = videoEl.value
  if (!video || !duration.value) return
  const clamped = Math.min(100, Math.max(0, percent))
  progressValue.value = clamped
  video.currentTime = (clamped / 100) * duration.value
  currentTime.value = video.currentTime
}

function onSeekStart() {
  seeking.value = true
}

function onSeekInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  seekToPercent(value)
}

function onSeekEnd(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  seekToPercent(value)
  seeking.value = false
}

function close() {
  const video = videoEl.value
  if (video) {
    video.pause()
    if (Number.isFinite(video.duration) && video.duration > 0) {
      const start = Math.min(DEFAULT_START_SECONDS, Math.max(0, video.duration - 0.5))
      video.currentTime = start
    }
  }
  playing.value = false
  currentTime.value = DEFAULT_START_SECONDS
  progressValue.value = 0
  uiStore.closeCleanVideo()
}

watch(
  () => uiStore.cleanVideoOpen,
  (open) => {
    if (!open) return
    window.setTimeout(() => {
      void startPlayback()
    }, 120)
  },
)

onUnmounted(() => {
  videoEl.value?.pause()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="clean-video">
      <aside
        v-if="uiStore.cleanVideoOpen"
        class="clean-video"
        role="dialog"
        aria-label="清空完成动画"
      >
        <header class="head">
          <div class="title-wrap">
            <span class="badge">✓</span>
            <div>
              <p class="title">数据已清空</p>
              <p class="subtitle">账本已恢复初始状态</p>
            </div>
          </div>
          <button type="button" class="icon-btn" aria-label="关闭" @click="close">×</button>
        </header>

        <div class="screen">
          <video
            ref="videoEl"
            class="video"
            :src="CLEAN_VIDEO_URL"
            playsinline
            webkit-playsinline
            preload="auto"
            :muted="muted"
            @timeupdate="syncFromVideo"
            @loadedmetadata="onLoadedMetadata"
            @play="playing = true"
            @pause="playing = false"
            @ended="playing = false"
            @click="togglePlay"
          />
          <button
            v-if="!playing"
            type="button"
            class="play-overlay"
            aria-label="播放"
            @click="togglePlay"
          >
            ▶
          </button>
        </div>

        <div class="controls">
          <button type="button" class="icon-btn small" :aria-label="playing ? '暂停' : '播放'" @click="togglePlay">
            {{ playing ? '❚❚' : '▶' }}
          </button>
          <span class="time">{{ formatTime(currentTime) }}</span>
          <input
            class="progress"
            type="range"
            min="0"
            max="100"
            step="0.1"
            :value="progressValue"
            aria-label="播放进度"
            @mousedown="onSeekStart"
            @touchstart.passive="onSeekStart"
            @input="onSeekInput"
            @change="onSeekEnd"
            @mouseup="onSeekEnd"
            @touchend="onSeekEnd"
          />
          <span class="time">{{ formatTime(duration) }}</span>
          <button type="button" class="icon-btn small" :aria-label="muted ? '取消静音' : '静音'" @click="toggleMute">
            {{ muted ? '🔇' : '🔊' }}
          </button>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.clean-video {
  position: fixed;
  right: max(0.75rem, calc((100vw - var(--app-max)) / 2 + 0.75rem));
  bottom: calc(5.5rem + max(var(--safe-bottom), var(--keyboard-inset, 0px)));
  z-index: 110;
  width: min(22rem, calc(100vw - 1.5rem));
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.38);
  background: rgba(255, 250, 240, 0.94);
  box-shadow:
    0 22px 48px rgba(90, 60, 10, 0.22),
    0 0 0 1px rgba(201, 162, 39, 0.12);
  backdrop-filter: blur(16px);
  overflow: hidden;
  pointer-events: auto;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 0.8rem 0.55rem;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  background: rgba(201, 162, 39, 0.2);
  color: var(--brand-deep);
  font-size: 0.82rem;
  font-weight: 700;
}

.title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--brand-deep);
}

.subtitle {
  margin: 0.12rem 0 0;
  font-size: 0.72rem;
  color: var(--muted);
}

.screen {
  position: relative;
  margin: 0 0.65rem;
  border-radius: 14px;
  overflow: hidden;
  background: #1a1408;
  aspect-ratio: 16 / 9;
}

.video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(24, 18, 10, 0.28);
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.65rem 0.75rem 0.8rem;
}

.time {
  flex-shrink: 0;
  font-size: 0.68rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  min-width: 2rem;
}

.progress {
  flex: 1;
  height: 1.25rem;
  margin: 0;
  accent-color: var(--brand);
  cursor: pointer;
  touch-action: none;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
}

.icon-btn.small {
  width: 1.65rem;
  height: 1.65rem;
  font-size: 0.78rem;
}

.icon-btn:active {
  background: rgba(201, 162, 39, 0.14);
}

.clean-video-enter-active,
.clean-video-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.clean-video-enter-from,
.clean-video-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
