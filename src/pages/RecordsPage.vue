<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import RecordRow from '@/components/record/RecordRow.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import { useAppStore } from '@/stores/app.store'
import { useUiStore } from '@/stores/ui.store'
import { recordService, tagService } from '@/services'
import type { CategoryGroup } from '@/services/record.service'
import type { Tag } from '@/models'
import type { TransactionDisplay } from '@/models/display'
import type { TransactionType } from '@/models'
import { formatMonthDay } from '@/utils/format'
import { centsToYuanString, sumCents } from '@/utils/money'

interface DayGroup {
  date: string
  label: string
  expense: number
  income: number
  records: TransactionDisplay[]
}

const route = useRoute()
const appStore = useAppStore()
const uiStore = useUiStore()

const loading = ref(true)
const search = ref('')
const typeFilter = ref<'all' | TransactionType>('all')
const dateFrom = ref('')
const dateTo = ref('')
const categoryId = ref('')
const subcategoryId = ref('')
const tagId = ref('')
const filtersOpen = ref(false)
const records = ref<TransactionDisplay[]>([])
const categoryGroups = ref<CategoryGroup[]>([])
const tags = ref<Tag[]>([])

const activeFilterCount = computed(() => {
  let n = 0
  if (dateFrom.value) n++
  if (dateTo.value) n++
  if (categoryId.value) n++
  if (tagId.value) n++
  return n
})

const filterSummary = computed(() => {
  const parts: string[] = []
  if (dateFrom.value || dateTo.value) {
    parts.push(`${dateFrom.value || '…'} ~ ${dateTo.value || '…'}`)
  }
  if (categoryId.value) {
    const group = categoryGroups.value.find((g) => g.parent.id === categoryId.value)
    const sub = group?.children.find((c) => c.id === subcategoryId.value)
    parts.push(sub ? `${group?.parent.name} · ${sub.name}` : group?.parent.name ?? '分类')
  }
  if (tagId.value) {
    const tag = tags.value.find((t) => t.id === tagId.value)
    if (tag) parts.push(`#${tag.name}`)
  }
  return parts.join(' · ')
})

const groups = computed<DayGroup[]>(() => {
  const map = new Map<string, DayGroup>()
  for (const row of records.value) {
    let group = map.get(row.date)
    if (!group) {
      group = {
        date: row.date,
        label: formatMonthDay(row.date),
        expense: 0,
        income: 0,
        records: [],
      }
      map.set(row.date, group)
    }
    group.records.push(row)
    if (row.type === 'expense') group.expense += row.amount
    else group.income += row.amount
  }
  return [...map.values()]
})

function readQueryFilters() {
  const q = route.query
  if (typeof q.type === 'string' && (q.type === 'expense' || q.type === 'income')) {
    typeFilter.value = q.type
  }
  if (typeof q.dateFrom === 'string') dateFrom.value = q.dateFrom
  if (typeof q.dateTo === 'string') dateTo.value = q.dateTo
  if (typeof q.categoryId === 'string') categoryId.value = q.categoryId
  if (typeof q.subcategoryId === 'string') subcategoryId.value = q.subcategoryId
  if (typeof q.tagId === 'string') tagId.value = q.tagId
  if (dateFrom.value || dateTo.value || categoryId.value || tagId.value) {
    filtersOpen.value = true
  }
}

async function loadMeta() {
  if (!appStore.currentBook) return
  const bookId = appStore.currentBook.id
  ;[categoryGroups.value, tags.value] = await Promise.all([
    recordService.listCategoryGroups(bookId, 'expense'),
    tagService.list(),
  ])
}

async function loadRecords() {
  if (!appStore.currentBook) return
  loading.value = true
  try {
    records.value = await recordService.listDisplay({
      bookId: appStore.currentBook.id,
      type: typeFilter.value === 'all' ? undefined : typeFilter.value,
      search: search.value.trim() || undefined,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      categoryId: categoryId.value || undefined,
      subcategoryId: subcategoryId.value || undefined,
      tagIds: tagId.value ? [tagId.value] : undefined,
    })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await appStore.initialize()
  readQueryFilters()
  await loadMeta()
  await loadRecords()
})

watch(
  () => uiStore.dataVersion,
  () => loadRecords(),
)

watch([typeFilter, categoryId, subcategoryId, tagId], () => loadRecords())

function onSearch() {
  loadRecords()
}

function applyDateFilter() {
  filtersOpen.value = false
  loadRecords()
}

function clearFilters() {
  dateFrom.value = ''
  dateTo.value = ''
  categoryId.value = ''
  subcategoryId.value = ''
  tagId.value = ''
  loadRecords()
}

function onCategoryChange() {
  subcategoryId.value = ''
}

function openRecord(id: string) {
  uiStore.openEditRecord(id)
}
</script>

<template>
  <div class="records-page">
    <PageHeader title="流水">
      <template #right>
        <button
          type="button"
          class="ghost-btn"
          :class="{ active: activeFilterCount > 0 }"
          aria-label="筛选"
          @click="filtersOpen = !filtersOpen"
        >
          ⛃
          <span v-if="activeFilterCount" class="badge">{{ activeFilterCount }}</span>
        </button>
      </template>
    </PageHeader>

    <div class="filters">
      <input
        v-model="search"
        class="search"
        type="search"
        placeholder="搜索备注"
        enterkeyhint="search"
        @keydown.enter="onSearch"
      />
      <div class="type-tabs">
        <button
          type="button"
          :class="{ active: typeFilter === 'all' }"
          @click="typeFilter = 'all'"
        >
          全部
        </button>
        <button
          type="button"
          :class="{ active: typeFilter === 'expense' }"
          @click="typeFilter = 'expense'"
        >
          支出
        </button>
        <button
          type="button"
          :class="{ active: typeFilter === 'income' }"
          @click="typeFilter = 'income'"
        >
          收入
        </button>
      </div>
      <p v-if="filterSummary" class="filter-summary">
        {{ filterSummary }}
        <button type="button" class="clear-link" @click="clearFilters">清除</button>
      </p>
    </div>

    <section v-if="filtersOpen" class="adv-panel">
      <label>
        开始日期
        <input v-model="dateFrom" type="date" />
      </label>
      <label>
        结束日期
        <input v-model="dateTo" type="date" />
      </label>
      <label>
        分类
        <select v-model="categoryId" @change="onCategoryChange">
          <option value="">全部</option>
          <option v-for="g in categoryGroups" :key="g.parent.id" :value="g.parent.id">
            {{ g.parent.icon }} {{ g.parent.name }}
          </option>
        </select>
      </label>
      <label v-if="categoryId">
        二级分类
        <select v-model="subcategoryId">
          <option value="">全部</option>
          <option
            v-for="sub in categoryGroups.find((g) => g.parent.id === categoryId)?.children ?? []"
            :key="sub.id"
            :value="sub.id"
          >
            {{ sub.icon }} {{ sub.name }}
          </option>
        </select>
      </label>
      <label>
        标签
        <select v-model="tagId">
          <option value="">全部</option>
          <option v-for="tag in tags" :key="tag.id" :value="tag.id">#{{ tag.name }}</option>
        </select>
      </label>
      <div class="adv-actions">
        <button type="button" class="primary-btn" @click="applyDateFilter">应用筛选</button>
        <button type="button" class="ghost-btn" @click="clearFilters">清除</button>
      </div>
    </section>

    <div v-if="loading" class="loading">
      <SkeletonBlock v-for="i in 4" :key="i" height="4.5rem" radius="12px" />
    </div>

    <EmptyState
      v-else-if="groups.length === 0"
      title="还没有流水"
      description="点击首页 + 记一笔，或调整筛选条件"
    />

    <div v-else class="timeline">
      <section v-for="group in groups" :key="group.date" class="day-group">
        <div class="day-head">
          <div class="day-left">
            <strong>{{ group.label }}</strong>
          </div>
          <div class="day-sum">
            <span v-if="group.expense">支 ¥{{ centsToYuanString(group.expense) }}</span>
            <span v-if="group.income">收 ¥{{ centsToYuanString(group.income) }}</span>
          </div>
        </div>
        <div class="record-list">
          <button
            v-for="item in group.records"
            :key="item.id"
            type="button"
            class="record-btn"
            @click="openRecord(item.id)"
          >
            <RecordRow
              :icon="item.categoryIcon"
              :category-label="item.categoryLabel"
              :note="item.note"
              :type="item.type"
              :amount="item.amount"
              :time="item.time"
            />
          </button>
        </div>
      </section>
    </div>

    <p v-if="groups.length" class="footer-note">
      共 {{ records.length }} 笔 · 支出
      ¥{{ centsToYuanString(sumCents(records.filter((r) => r.type === 'expense').map((r) => r.amount))) }}
    </p>
  </div>
</template>

<style scoped>
.filters {
  display: grid;
  gap: 0.55rem;
  margin-bottom: 0.85rem;
}

.search {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  color: var(--ink);
  font-size: 0.9rem;
}

.type-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  padding: 0.2rem;
  border-radius: 12px;
  background: var(--cream);
}

.type-tabs button {
  border: none;
  border-radius: 10px;
  padding: 0.45rem;
  background: transparent;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
}

.type-tabs button.active {
  background: var(--panel);
  color: var(--ink);
  font-weight: 600;
}

.filter-summary {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.clear-link {
  border: none;
  background: transparent;
  color: var(--brand-deep);
  font-size: 0.75rem;
  cursor: pointer;
}

.adv-panel {
  display: grid;
  gap: 0.55rem;
  margin-bottom: 0.85rem;
  padding: 0.85rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.adv-panel label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--muted);
}

.adv-panel input,
.adv-panel select {
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--cream);
  color: var(--ink);
  font-size: 0.88rem;
}

.adv-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.primary-btn {
  flex: 1;
  padding: 0.6rem;
  border: none;
  border-radius: 10px;
  background: var(--brand);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.ghost-btn {
  position: relative;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.5rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
}

.ghost-btn.active {
  color: var(--brand-deep);
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 0.95rem;
  height: 0.95rem;
  padding: 0 0.2rem;
  border-radius: 99px;
  background: var(--brand);
  color: #fff;
  font-size: 0.62rem;
  line-height: 0.95rem;
  text-align: center;
}

.loading {
  display: grid;
  gap: 0.75rem;
}

.timeline {
  display: grid;
  gap: 1rem;
}

.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.15rem;
  font-size: 0.82rem;
  color: var(--muted);
}

.day-sum {
  display: flex;
  gap: 0.55rem;
}

.record-list {
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 0 0.75rem;
}

.record-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.record-list :deep(.record-row:last-child) {
  border-bottom: none;
}

.footer-note {
  margin: 1rem 0 0;
  text-align: center;
  font-size: 0.78rem;
  color: var(--muted-2);
}
</style>
