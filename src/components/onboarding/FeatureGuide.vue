<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GUIDE_REWARD_POINTS } from '@/models'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth.store'
import { useGuideStore } from '@/stores/guide.store'
import { useUiStore } from '@/stores/ui.store'

const guide = useGuideStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const targetRect = ref<DOMRect | null>(null)
const tooltipStyle = ref<Record<string, string>>({})
const arrowStyle = ref<Record<string, string>>({})
const guideCardRef = ref<HTMLElement | null>(null)
const completing = ref(false)
let syncAttempts = 0
const maxSyncAttempts = 20

const pad = 8
const radius = 14
const cardGap = 14
const cardWidthMax = 320

const isGuest = computed(() => authStore.session?.mode === 'guest')

function isGuideRouteAllowed(step = guide.currentStep): boolean {
  if (!step) return false
  const home = step.route ?? '/'
  if (route.path === home) return true
  if (step.id === 'settings' && route.path === '/settings') return false
  if (step.id === 'login' && route.path === '/login') return false
  return step.center === true && route.path === home
}

const guideVisible = computed(
  () =>
    guide.active &&
    Boolean(guide.currentStep) &&
    !uiStore.recordSheetOpen &&
    isGuideRouteAllowed(),
)
const isCentered = computed(
  () => guide.currentStep?.center === true || !guide.currentStep?.target,
)

const hole = computed(() => {
  if (isCentered.value) return null
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function positionCenterCard() {
  const cardWidth = Math.min(window.innerWidth - 32, cardWidthMax)
  tooltipStyle.value = {
    left: `${(window.innerWidth - cardWidth) / 2}px`,
    top: `${Math.max(80, window.innerHeight * 0.22)}px`,
    width: `${cardWidth}px`,
  }
  arrowStyle.value = {}
}

function positionTooltip(rect: DOMRect) {
  const placement = guide.currentStep?.placement ?? 'bottom'
  const align = guide.currentStep?.align ?? 'center'
  const cardWidth = Math.min(window.innerWidth - 32, cardWidthMax)
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  let left: number
  if (align === 'end') {
    left = rect.right - cardWidth
  } else if (align === 'start') {
    left = rect.left
  } else {
    left = rect.left + rect.width / 2 - cardWidth / 2
  }
  left = clamp(left, 16, viewportW - cardWidth - 16)

  if (placement === 'top') {
    tooltipStyle.value = {
      left: `${left}px`,
      bottom: `${viewportH - rect.top + cardGap}px`,
      width: `${cardWidth}px`,
    }
    return
  }

  tooltipStyle.value = {
    left: `${left}px`,
    top: `${rect.bottom + cardGap}px`,
    width: `${cardWidth}px`,
  }
}

function positionArrow(cardRect: DOMRect, rect: DOMRect) {
  const placement = guide.currentStep?.placement ?? 'bottom'
  const targetCenterX = rect.left + rect.width / 2
  const arrowX = clamp(targetCenterX, cardRect.left + 22, cardRect.right - 22)

  if (placement === 'top') {
    arrowStyle.value = {
      left: `${arrowX}px`,
      top: `${cardRect.bottom - 1}px`,
      transform: 'translateX(-50%)',
      borderTopColor: 'rgba(255, 250, 240, 0.92)',
      borderBottomColor: 'transparent',
    }
    return
  }

  arrowStyle.value = {
    left: `${arrowX}px`,
    top: `${cardRect.top - 9}px`,
    transform: 'translateX(-50%)',
    borderBottomColor: 'rgba(255, 250, 240, 0.92)',
    borderTopColor: 'transparent',
  }
}

async function refreshLayout() {
  await nextTick()
  if (isCentered.value) {
    positionCenterCard()
    return
  }
  const el = findTarget()
  if (!el || !guide.active) {
    arrowStyle.value = {}
    return
  }
  const rect = el.getBoundingClientRect()
  targetRect.value = rect
  positionTooltip(rect)
  await nextTick()
  const cardEl = guideCardRef.value
  if (!cardEl) {
    arrowStyle.value = {}
    return
  }
  positionArrow(cardEl.getBoundingClientRect(), rect)
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
    arrowStyle.value = {}
    markTarget(null, false)
    syncAttempts = 0
    return
  }

  if (step.route && route.path !== step.route) {
    const visitingSettings = step.id === 'settings' && route.path === '/settings'
    const visitingLogin = step.id === 'login' && route.path === '/login'
    if (!visitingSettings && !visitingLogin) {
      await router.replace(step.route)
      await nextTick()
    }
  }

  if (step.id === 'settings' || step.id === 'login') {
    window.scrollTo({ top: 0, behavior: 'auto' })
    await nextTick()
  }

  if (isCentered.value) {
    syncAttempts = 0
    markTarget(null, false)
    positionCenterCard()
    return
  }

  window.setTimeout(() => {
    const el = findTarget()
    markTarget(el, Boolean(el))
    if (!el) {
      targetRect.value = null
      arrowStyle.value = {}
      syncAttempts += 1
      if (syncAttempts < maxSyncAttempts) {
        window.setTimeout(() => void syncTarget(), 320)
      } else {
        positionCenterCard()
      }
      return
    }
    syncAttempts = 0
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    window.setTimeout(() => {
      void refreshLayout()
    }, 220)
  }, 120)
}

function updateRect() {
  void refreshLayout()
}

async function onNext() {
  if (guide.isLast) {
    await onComplete()
    return
  }
  guide.advance()
}

async function onComplete() {
  if (completing.value) return
  completing.value = true
  try {
    const wasIntro = guide.tour === 'intro'
    const { rewarded, startedOps } = await guide.complete(isGuest.value)
    if (rewarded) {
      toast.success(`第一轮完成！已获得 ${GUIDE_REWARD_POINTS} 积分`)
    }
    if (startedOps) {
      toast.success('开始第二轮上手操作引导')
      guide.requestResync()
    } else if (!wasIntro) {
      toast.success('上手引导已完成')
    }
  } finally {
    completing.value = false
  }
}

async function onSkip() {
  const { rewarded } = await guide.skip(isGuest.value)
  if (rewarded) {
    toast.success(`已跳过引导，仍赠送 ${GUIDE_REWARD_POINTS} 积分`)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') void onSkip()
}

watch(
  () => [guide.active, guide.stepIndex, route.path, isGuest.value] as const,
  () => {
    syncAttempts = 0
    void syncTarget()
  },
)

watch(isGuest, (guest, wasGuest) => {
  if (!guide.active || guest || !wasGuest) return
  guide.onGuestLoggedIn()
  guide.requestResync()
})

const prevRoutePath = ref(route.path)
watch(
  () => route.path,
  (path) => {
    if (!guide.active) {
      prevRoutePath.value = path
      return
    }
    const stepId = guide.currentStep?.id
    const from = prevRoutePath.value
    prevRoutePath.value = path

    if (stepId === 'settings' && from === '/settings' && path === '/') {
      guide.advance()
      return
    }
    if (stepId === 'login' && from === '/login' && path === '/' && !isGuest.value) {
      guide.onGuestLoggedIn()
      guide.requestResync()
    }
  },
)

watch(
  () => uiStore.recordSheetOpen,
  (open) => {
    if (!guide.active) return
    if (open) {
      markTarget(null, false)
      return
    }
    // 关闭记一笔后重新对齐当前引导步骤
    syncAttempts = 0
    void syncTarget()
  },
)

watch(
  () => guide.resyncTick,
  () => {
    if (!guide.active) return
    syncAttempts = 0
    void syncTarget()
  },
)

onMounted(async () => {
  await authStore.load()
  await guide.load(isGuest.value)
  void syncTarget()
  window.addEventListener('resize', updateRect)
  window.addEventListener('scroll', updateRect, true)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  markTarget(null, false)
  window.removeEventListener('resize', updateRect)
  window.removeEventListener('scroll', updateRect, true)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="guide">
      <div
        v-if="guideVisible"
        class="guide-layer"
        :class="{ centered: isCentered }"
        role="dialog"
        aria-modal="true"
        :aria-label="guide.currentStep!.title"
      >
        <div v-if="isCentered" class="guide-backdrop centered-backdrop" aria-hidden="true" />

        <template v-else-if="hole">
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
              fill="rgba(24, 18, 10, 0.42)"
              :mask="`url(#${maskId})`"
            />
          </svg>

          <div
            class="spotlight-ring"
            :style="{
              left: `${hole.x}px`,
              top: `${hole.y}px`,
              width: `${hole.w}px`,
              height: `${hole.h}px`,
              borderRadius: `${radius}px`,
            }"
          />
        </template>

        <div ref="guideCardRef" class="guide-card" :style="tooltipStyle">
          <p class="step">{{ guide.tourLabel }} · {{ guide.stepIndex + 1 }} / {{ guide.totalSteps }}</p>
          <h3>{{ guide.currentStep!.title }}</h3>
          <p class="body">{{ guide.currentStep!.body }}</p>
          <div class="actions">
            <button type="button" class="ghost" @click.stop="onSkip">跳过</button>
            <button
              v-if="!guide.isLast"
              type="button"
              class="primary"
              @click.stop="onNext"
            >
              下一步
            </button>
            <button
              v-else
              type="button"
              class="primary complete"
              :disabled="completing"
              @click.stop="onComplete"
            >
              完成
            </button>
          </div>
        </div>

        <div v-if="Object.keys(arrowStyle).length" class="guide-arrow" :style="arrowStyle" aria-hidden="true" />
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

.guide-layer.centered {
  z-index: 95;
}

.guide-backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.centered-backdrop {
  background: rgba(24, 18, 10, 0.48);
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

.guide-card {
  position: fixed;
  z-index: 2;
  padding: 1rem 1.05rem 0.95rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 250, 240, 0.92);
  box-shadow: 0 18px 40px rgba(90, 60, 10, 0.18);
  backdrop-filter: blur(18px);
  pointer-events: auto;
}

.guide-arrow {
  position: fixed;
  z-index: 3;
  width: 0;
  height: 0;
  pointer-events: none;
  border-left: 9px solid transparent;
  border-right: 9px solid transparent;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.35));
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

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.85rem;
  gap: 0.5rem;
}

.ghost {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0.35rem 0.15rem;
}

.primary {
  margin-left: auto;
  border: none;
  border-radius: 999px;
  padding: 0.45rem 1.1rem;
  background: var(--brand);
  color: #fff;
  font-size: 0.86rem;
  font-weight: 650;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.complete {
  min-width: 4.5rem;
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

:global([data-guide-active='true']) {
  position: relative;
  z-index: 91 !important;
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
