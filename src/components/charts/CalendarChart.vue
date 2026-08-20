<script setup lang="ts">
import type { CalendarDay } from '@/models/stats'
import { centsToYuanString } from '@/utils/money'

defineProps<{
  days: CalendarDay[]
  selected?: string
}>()

const emit = defineEmits<{
  select: [date: string]
}>()

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
</script>

<template>
  <div class="calendar">
    <div class="weekdays">
      <span v-for="d in weekdays" :key="d">{{ d }}</span>
    </div>
    <div class="grid">
      <button
        v-for="(cell, idx) in days"
        :key="`${cell.date || 'blank'}-${idx}`"
        type="button"
        class="cell"
        :class="{
          blank: !cell.inMonth,
          marked: cell.inMonth && (cell.expense > 0 || cell.income > 0),
          expense: cell.inMonth && cell.net < 0,
          income: cell.inMonth && cell.net > 0,
          selected: cell.date && cell.date === selected,
        }"
        :disabled="!cell.inMonth"
        :title="
          cell.inMonth
            ? `支 ¥${centsToYuanString(cell.expense)} / 收 ¥${centsToYuanString(cell.income)}`
            : undefined
        "
        @click="cell.inMonth && cell.date && emit('select', cell.date)"
      >
        <span class="day">{{ cell.inMonth ? cell.day : '' }}</span>
        <span v-if="cell.inMonth && cell.expense" class="dot expense-dot" />
        <span v-if="cell.inMonth && cell.income" class="dot income-dot" />
      </button>
    </div>
    <div class="legend">
      <span><i class="dot expense-dot" />支出</span>
      <span><i class="dot income-dot" />收入</span>
    </div>
  </div>
</template>

<style scoped>
.weekdays,
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
  text-align: center;
}

.weekdays {
  color: var(--muted);
  font-size: 0.72rem;
  margin-bottom: 0.35rem;
}

.cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  border: none;
  border-radius: 8px;
  background: var(--cream);
  color: var(--muted);
  font-size: 0.72rem;
  cursor: pointer;
  padding: 0.15rem;
  position: relative;
}

.cell.blank {
  background: transparent;
  cursor: default;
}

.cell.marked {
  background: var(--accent-soft);
  color: var(--brand-deep);
  font-weight: 600;
}

.cell.expense:not(.selected) {
  background: #c0392b12;
}

.cell.income:not(.selected) {
  background: #27ae6012;
}

.cell.selected {
  outline: 2px solid var(--brand);
  outline-offset: -2px;
}

.day {
  line-height: 1;
}

.dot {
  width: 4px;
  height: 4px;
  border-radius: 99px;
  display: inline-block;
}

.expense-dot {
  background: var(--expense);
}

.income-dot {
  background: var(--income);
}

.legend {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 0.55rem;
  font-size: 0.72rem;
  color: var(--muted);
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
</style>
