<script setup lang="ts">
import type { TransactionType } from '@/models'
import { centsToYuanString } from '@/utils/money'

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
      <div class="meta">
        <span v-if="note" class="note">{{ note }}</span>
        <span v-if="time" class="time">{{ time }}</span>
      </div>
    </div>
    <div class="amount" :class="type">{{ centsToYuanString(amount) }}</div>
  </article>
</template>

<style scoped>
.record-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
  padding: 0.78rem 0;
  border-bottom: 1px solid var(--line);
}

.icon {
  width: 2.15rem;
  height: 2.15rem;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #f6f1e4;
  font-size: 1.05rem;
}

.main {
  min-width: 0;
}

.title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--ink);
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.12rem;
  min-width: 0;
}

.note,
.time {
  font-size: 0.74rem;
  color: var(--muted);
}

.note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount {
  font-size: 0.98rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--brand-deep);
}

.amount.income {
  color: var(--income);
}
</style>
