<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  values: number[]
  labels?: string[]
}>()

const max = computed(() => Math.max(...props.values, 1))

const bars = computed(() =>
  props.values.map((value, index) => ({
    value,
    label: props.labels?.[index] ?? '',
    height: `${Math.max(8, Math.round((value / max.value) * 100))}%`,
  })),
)
</script>

<template>
  <div class="week-chart" aria-label="本周支出分布">
    <div class="bars">
      <div v-for="(bar, index) in bars" :key="index" class="bar-col">
        <div class="bar-track">
          <div class="bar-fill" :style="{ height: bar.height }" />
        </div>
        <span class="bar-label">{{ bar.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week-chart {
  margin-top: 0.2rem;
  padding: 0.9rem 0.7rem 0.7rem;
  border-radius: 20px;
  background: var(--panel);
  box-shadow: var(--shadow);
}

.bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
  align-items: end;
  height: 4.5rem;
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.bar-track {
  width: 100%;
  height: 3.2rem;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-fill {
  width: 72%;
  min-height: 4px;
  border-radius: 999px 999px 4px 4px;
  background: linear-gradient(180deg, var(--brand) 0%, var(--brand-deep) 100%);
}

.bar-label {
  font-size: 0.68rem;
  color: var(--muted);
}
</style>
