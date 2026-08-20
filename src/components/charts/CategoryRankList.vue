<script setup lang="ts">
import { CHART_COLORS } from '@/services/stats.service'
import type { CategoryStat } from '@/models/stats'
import { centsToYuanString } from '@/utils/money'

defineProps<{
  items: CategoryStat[]
  drillParent?: string | null
}>()

const emit = defineEmits<{
  select: [id: string, hasChildren: boolean]
  back: []
}>()
</script>

<template>
  <div class="rank">
    <button v-if="drillParent" type="button" class="back" @click="emit('back')">
      ‹ 返回上级分类
    </button>
    <div v-if="items.length === 0" class="empty">暂无分类数据</div>
    <button
      v-for="(item, i) in items"
      :key="item.id"
      type="button"
      class="row"
      @click="emit('select', item.id, item.hasChildren)"
    >
      <span class="icon" :style="{ background: CHART_COLORS[i % CHART_COLORS.length] + '33' }">
        {{ item.icon }}
      </span>
      <span class="info">
        <span class="name">{{ item.name }}</span>
        <span class="bar-track">
          <span class="bar-fill" :style="{ width: `${item.pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }" />
        </span>
      </span>
      <span class="amount">
        ¥{{ centsToYuanString(item.amount) }}
        <small>{{ item.pct }}%</small>
      </span>
    </button>
  </div>
</template>

<style scoped>
.rank {
  display: grid;
  gap: 0.35rem;
}

.back {
  border: none;
  background: transparent;
  color: var(--brand-deep);
  font-size: 0.82rem;
  text-align: left;
  padding: 0.2rem 0;
  cursor: pointer;
}

.empty {
  padding: 1rem 0;
  text-align: center;
  color: var(--muted);
  font-size: 0.82rem;
}

.row {
  display: grid;
  grid-template-columns: 2rem 1fr auto;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.45rem 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: none;
}

.icon {
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
}

.info {
  min-width: 0;
  display: grid;
  gap: 0.25rem;
}

.name {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-track {
  height: 4px;
  border-radius: 99px;
  background: var(--cream);
  overflow: hidden;
}

.bar-fill {
  display: block;
  height: 100%;
  border-radius: 99px;
}

.amount {
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.amount small {
  display: block;
  font-size: 0.68rem;
  color: var(--muted);
}
</style>
