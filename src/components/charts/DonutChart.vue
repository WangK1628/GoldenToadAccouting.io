<script setup lang="ts">
import { computed } from 'vue'
import { CHART_COLORS } from '@/services/stats.service'
import { centsToYuanString } from '@/utils/money'

export interface DonutSegment {
  id: string
  name: string
  amount: number
  pct: number
}

const props = defineProps<{
  segments: DonutSegment[]
  size?: number
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const size = computed(() => props.size ?? 160)
const radius = computed(() => size.value * 0.3625)
const stroke = computed(() => size.value * 0.1125)
const circumference = computed(() => 2 * Math.PI * radius.value)

const arcs = computed(() => {
  let offset = 0
  return props.segments.map((seg, i) => {
    const length = (seg.pct / 100) * circumference.value
    const arc = {
      ...seg,
      color: CHART_COLORS[i % CHART_COLORS.length],
      dashArray: `${length} ${circumference.value - length}`,
      dashOffset: -offset,
    }
    offset += length
    return arc
  })
})

const total = computed(() => props.segments.reduce((s, seg) => s + seg.amount, 0))
</script>

<template>
  <div class="donut-wrap">
    <svg
      :viewBox="`0 0 ${size} ${size}`"
      :width="size"
      :height="size"
      class="donut"
      role="img"
      :aria-label="`分类占比，共 ${segments.length} 项`"
    >
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="var(--line)"
        :stroke-width="stroke"
      />
      <circle
        v-for="arc in arcs"
        :key="arc.id"
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="arc.color"
        :stroke-width="stroke"
        :stroke-dasharray="arc.dashArray"
        :stroke-dashoffset="arc.dashOffset"
        stroke-linecap="butt"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
        class="arc"
        @click="emit('select', arc.id)"
      />
    </svg>
    <div v-if="segments.length === 0" class="empty">暂无数据</div>
    <div v-else class="center-label">
      <div class="total">¥{{ centsToYuanString(total) }}</div>
      <div class="hint">合计</div>
    </div>
  </div>
</template>

<style scoped>
.donut-wrap {
  position: relative;
  display: flex;
  justify-content: center;
}

.donut {
  display: block;
}

.arc {
  cursor: pointer;
  transition: opacity 0.15s;
}

.arc:hover {
  opacity: 0.85;
}

.center-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.total {
  font-family: Fraunces, Georgia, serif;
  font-size: 0.95rem;
}

.hint {
  font-size: 0.68rem;
  color: var(--muted);
}

.empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 0.82rem;
  color: var(--muted);
}
</style>
