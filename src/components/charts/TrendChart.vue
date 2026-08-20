<script setup lang="ts">
import { computed } from 'vue'
import type { TrendPoint } from '@/models/stats'

const props = defineProps<{
  points: TrendPoint[]
  mode?: 'expense' | 'income'
}>()

const emit = defineEmits<{
  select: [key: string]
}>()

const mode = computed(() => props.mode ?? 'expense')

const values = computed(() =>
  props.points.map((p) => (mode.value === 'expense' ? p.expense : p.income)),
)

const max = computed(() => Math.max(...values.value, 1))

const bars = computed(() =>
  props.points.map((p, i) => ({
    key: p.key,
    label: p.label,
    value: values.value[i],
    height: `${Math.max(4, (values.value[i] / max.value) * 100)}%`,
  })),
)
</script>

<template>
  <div class="trend">
    <div v-if="points.length === 0" class="empty">暂无趋势数据</div>
    <div v-else class="bars" :class="{ dense: points.length > 20 }">
      <button
        v-for="bar in bars"
        :key="bar.key"
        type="button"
        class="bar-col"
        :title="bar.label"
        @click="emit('select', bar.key)"
      >
        <div class="bar" :style="{ height: bar.height }" />
        <span class="label">{{ bar.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.trend {
  min-height: 9rem;
}

.empty {
  height: 9rem;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 0.82rem;
}

.bars {
  height: 9.25rem;
  display: flex;
  align-items: flex-end;
  gap: 0.35rem;
}

.bars.dense {
  gap: 0.15rem;
}

.bar-col {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.bar {
  width: 100%;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, var(--brand) 0%, var(--brand-deep) 100%);
  min-height: 4px;
}

.dense .bar {
  border-radius: 3px 3px 1px 1px;
}

.label {
  font-size: 0.62rem;
  color: var(--muted-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.dense .label {
  font-size: 0.55rem;
}
</style>
