<script setup lang="ts">
import type { TransactionType } from '@/models'
import { formatSignedAmount } from '@/utils/money'

defineProps<{
  icon?: string
  categoryLabel: string
  note?: string
  type: TransactionType
  amount: number
  time?: string
}>()
</script>

<template>
  <article class="record-row">
    <div class="icon" aria-hidden="true">{{ icon ?? '·' }}</div>
    <div class="main">
      <div class="title">{{ categoryLabel }}</div>
      <div v-if="note" class="note">{{ note }}</div>
    </div>
    <div class="side">
      <div class="amount" :class="type">{{ formatSignedAmount(type, amount) }}</div>
      <div v-if="time" class="time">{{ time }}</div>
    </div>
  </article>
</template>

<style scoped>
.record-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.65rem;
  align-items: start;
  padding: 0.72rem 0;
  border-bottom: 1px solid var(--line);
}

.icon {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--cream);
  font-size: 1.05rem;
}

.main {
  min-width: 0;
}

.title {
  font-size: 0.92rem;
  font-weight: 500;
}

.note {
  margin-top: 0.15rem;
  font-size: 0.78rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side {
  text-align: right;
}

.amount {
  font-size: 1.05rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.amount.expense {
  color: var(--expense);
}

.amount.income {
  color: var(--income);
}

.time {
  margin-top: 0.15rem;
  font-size: 0.72rem;
  color: var(--muted-2);
}
</style>
