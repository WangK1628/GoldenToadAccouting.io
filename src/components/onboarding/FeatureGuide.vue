<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGuideStore } from '@/stores/guide.store'
import { useUiStore } from '@/stores/ui.store'

const guide = useGuideStore()
const uiStore = useUiStore()
const route = useRoute()
const router = useRouter()

const targetRect = ref<DOMRect | null>(null)
const tooltipStyle = ref<Record<string, string>>({})

const pad = 8
const radius = 14

const hole = computed(() => {
  const rect = targetRect.value
  if (!rect) return null
  return {
    x: rect.left - pad,
    y: rect.top - pad,
    w: rect.width + pad * 2,
    h: rect.height + pad * 2,
  }
})

const maskId = `guide-mask-${Math.random().toString(36).slice(2, 8)}`

function findTarget(): HTMLElement | null {
  const selector = guide.currentStep?.target
  if (!selector) return null
  return document.querySelector<HTMLElement>(selector)
}

function positionTooltip(rect: DOMRect) {
  const placement = guide.currentStep?.placement ?? 'bottom'
  const margin = 14
  const cardWidth = Math.min(window.innerWidth - 32, 320)
  const centerX = rect.left + rect.width / 2
  let left = centerX - cardWidth / 2
  left = Math.max(16, Math.min(left, window.innerWidth - cardWidth - 16))

  if (placement === 'top') {
    tooltipStyle.value = {
      left: `${left}px`,
      bottom: `${window.innerHeight - rect.top + margin}px`,
      width: `${cardWidth}px`,
    }
    return
  }

  tooltipStyle.value = {
    left: `${left}px`,
    top: `${rect.bottom + margin}px`,
    width: `${cardWidth}px`,
  }
}

function markTarget(el: HTMLElement | null, on: boolean) {
  document.querySelectorAll('[data-guide-active]').forEach((node) => {
    node.removeAttribute('data-guide-active')
  })
  if (el && on) el.setAttribute('data-guide-active', 'true')
}

async function syncTarget() {
  await nextTick()
  const step = guide.currentStep
  if (!guide.active || !step) {
    targetRect.value = null
    markTarget(null, false)
    return
  }

  if (step.route && route.path !== step.route) {
    await router.replace(step.route)
    await nextTick()
  }

  if (step.id === 'record' && uiStore.recordSheetOpen) {
    uiStore.closeRecordSheet()
  }

  window.setTimeout(() => {
    const el = findTarget()
    markTarget(el, Boolean(el))
    if (!el) {
      targetRect.value = null
      window.setTimeout(() => void syncTarget(), 400)
      return
    }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    window.setTimeout(() => {
      const rect = el.getBoundingClientRect()
      targetRect.value = rect
      positionTooltip(rect)
    }, 220)
  }, 80)
}

function updateRect() {
  const el = findTarget()
  if (!el || !guide.active) return
  const rect = el.getBoundingClientRect()
  targetRect.value = rect
  positionTooltip(rect)
}

function isGuideUi(node: Node | null): boolean {
  return node instanceof Element && Boolean(node.closest('.guide-card'))
}

function onCaptureClick(event: MouseEvent) {
  if (!guide.active || !guide.currentStep) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (isGuideUi(target)) return
  const el = findTarget()
  if (el?.contains(target)) return
  event.preventDefault()
  event.stopPropagation()
  guide.bumpNudge()
}

function onCapturePointer(event: PointerEvent) {
  if (!guide.active || guide.currentStep?.action !== 'hold') return
  const target = event.target
  if (!(target instanceof Node)) return
  if (isGuideUi(target)) return
  const el = findTarget()
  if (el?.contains(target)) return
  event.preventDefault()
  event.stopPropagation()
  guide.bumpNudge()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') guide.skip()
}

watch(
  () => [guide.active, guide.stepIndex, route.path] as const,
  () => {
    void syncTarget()
  },
)

watch(
  () => uiStore.recordSheetOpen,
  (open) => {
    if (open && guide.active && guide.currentStep?.id === 'record') {
      window.setTimeout(() => {
        uiStore.closeRecordSheet()
        guide.notify('record')
      }, 700)
    }
  },
)

onMounted(async () => {
  await guide.load()
  void syncTarget()
  window.addEventListener('resize', updateRect)
  window.addEventListener('scroll', updateRect, true)
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onCaptureClick, true)
  document.addEventListener('pointerdown', onCapturePointer, true)
})

onUnmounted(() => {
  markTarget(null, false)
  window.removeEventListener('resize', updateRect)
  window.removeEventListener('scroll', updateRect, true)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onCaptureClick, true)
  document.removeEventListener('pointerdown', onCapturePointer, true)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="guide">
      <div
        v-if="guide.active && guide.currentStep && hole"
        class="guide-layer"
        role="dialog"
        aria-modal="true"
        :aria-label="guide.currentStep.title"
      >
        <svg class="guide-svg" aria-hidden="true">
          <defs>
            <mask :id="maskId">
              <rect width="100%" height="100%" fill="white" />
              <rect
                :x="hole.x"
                :y="hole.y"
                :width="hole.w"
                :height="hole.h"
                :rx="radius"
                :ry="radius"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(24, 18, 10, 0.52)"
            :mask="`url(#${maskId})`"
          />
        </svg>

        <div
          class="spotlight-ring"
          :class="{ nudge: guide.nudge }"
          :style="{
            left: `${hole.x}px`,
            top: `${hole.y}px`,
            width: `${hole.w}px`,
            height: `${hole.h}px`,
            borderRadius: `${radius}px`,
          }"
        />

        <div class="guide-card" :style="tooltipStyle">
          <p class="step">{{ guide.stepIndex + 1 }} / {{ guide.steps.length }}</p>
          <h3>{{ guide.currentStep.title }}</h3>
          <p class="body">{{ guide.currentStep.body }}</p>
          <p class="hint">{{ guide.currentStep.hint }}</p>
          <div class="actions">
            <button type="button" class="ghost" @click.stop="guide.skip">跳过</button>
            <span class="tap-icon" aria-hidden="true">👆</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guide-layer {
  position: fixed;
  inset: 0;
  z-index: 90;
  pointer-events: none;
}

.guide-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.spotlight-ring {
  position: fixed;
  pointer-events: none;
  border: 2px solid rgba(255, 236, 190, 0.95);
  box-shadow:
    0 0 0 2px rgba(201, 162, 39, 0.35),
    0 0 24px rgba(201, 162, 39, 0.45);
  animation: pulse 1.6s ease-in-out infinite;
}

.spotlight-ring.nudge {
  animation: shake 0.45s ease;
}

.guide-card {
  position: fixed;
  z-index: 2;
  padding: 1rem 1.05rem 0.95rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 250, 240, 0.88);
  box-shadow: 0 18px 40px rgba(90, 60, 10, 0.18);
  backdrop-filter: blur(18px);
  pointer-events: auto;
}

.step {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.guide-card h3 {
  margin: 0.35rem 0 0;
  font-size: 1.05rem;
  color: var(--brand-deep);
}

.body {
  margin: 0.45rem 0 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--muted);
}

.hint {
  margin: 0.55rem 0 0;
  padding: 0.42rem 0.62rem;
  border-radius: 12px;
  background: rgba(201, 162, 39, 0.14);
  color: var(--brand-deep);
  font-size: 0.82rem;
  font-weight: 650;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.85rem;
}

.ghost {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0.35rem 0.15rem;
}

.tap-icon {
  font-size: 1.2rem;
  animation: bounce 1.1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 2px rgba(201, 162, 39, 0.35),
      0 0 18px rgba(201, 162, 39, 0.35);
  }
  50% {
    box-shadow:
      0 0 0 4px rgba(201, 162, 39, 0.45),
      0 0 28px rgba(201, 162, 39, 0.55);
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

:global([data-guide-active='true']) {
  position: relative;
  z-index: 95 !important;
}

.guide-enter-active,
.guide-leave-active {
  transition: opacity 0.22s ease;
}

.guide-enter-from,
.guide-leave-to {
  opacity: 0;
}
</style>
