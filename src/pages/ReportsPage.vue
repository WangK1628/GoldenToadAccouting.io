<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import CalendarChart from '@/components/charts/CalendarChart.vue'
import CategoryRankList from '@/components/charts/CategoryRankList.vue'
import BottomSheet from '@/components/sheet/BottomSheet.vue'
import { useAppStore } from '@/stores/app.store'
import { useUiStore } from '@/stores/ui.store'
import { statsService } from '@/services'
import type {
  CalendarDay,
  CategoryStat,
  StatsSummary,
  TrendPoint,
  WeekdayStat,
} from '@/models/stats'
import type { StatsGranularity, DateRange } from '@/utils/date-range'
import { resolveDateRange, shiftAnchor } from '@/utils/date-range'
import { centsToYuanString } from '@/utils/money'
import { todayDateString } from '@/utils/time'

const tabs: Array<{ key: StatsGranularity; label: string }> = [
  { key: 'day', label: '日' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
]

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const uiStore = useUiStore()

const loading = ref(true)
const granularity = ref<StatsGranularity>('month')
const anchor = ref(todayDateString())
const customFrom = ref(todayDateString().slice(0, 7) + '-01')
const customTo = ref(todayDateString())
const customOpen = ref(false)

const summary = ref<StatsSummary>({ expense: 0, income: 0, balance: 0, count: 0 })
const categoryStats = ref<CategoryStat[]>([])
const trendPoints = ref<TrendPoint[]>([])
const weekdayStats = ref<WeekdayStat[]>([])
const calendarDays = ref<CalendarDay[]>([])
const categoryParentId = ref<string | null>(null)
const trendMode = ref<'expense' | 'income'>('expense')
const statType = ref<'expense' | 'income'>('expense')
const selectedCalendarDate = ref('')

const range = computed<DateRange>(() =>
  resolveDateRange(granularity.value, anchor.value, {
    from: customFrom.value,
    to: customTo.value,
  }),
)

const title = computed(() => range.value.label)

const donutSegments = computed(() =>
  categoryStats.value.map((c) => ({
    id: c.id,
    name: c.name,
    amount: c.amount,
    pct: c.pct,
  })),
)

const weekdayMax = computed(() =>
  Math.max(...weekdayStats.value.map((w) => w.amount), 1),
)

async function loadStats() {
  if (!appStore.currentBook) return
  loading.value = true
  const bookId = appStore.currentBook.id
  const r = range.value
  const g = granularity.value === 'custom' ? 'month' : granularity.value

  try {
    ;[summary.value, categoryStats.value, trendPoints.value, weekdayStats.value, calendarDays.value] =
      await Promise.all([
        statsService.getSummary(bookId, r),
        statsService.getCategoryStats(bookId, r, statType.value, categoryParentId.value),
        statsService.getTrend(bookId, r, g, anchor.value),
        statsService.getWeekdayStats(bookId, r, statType.value),
        statsService.getCalendar(bookId, statsService.calendarYearMonth(anchor.value)),
      ])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await appStore.initialize()
  if (typeof route.query.month === 'string') {
    anchor.value = `${route.query.month}-01`
    granularity.value = 'month'
  }
  await loadStats()
})

watch(
  () => uiStore.dataVersion,
  () => loadStats(),
)

watch([granularity, anchor, statType, categoryParentId], () => loadStats())

function prevPeriod() {
  if (granularity.value === 'custom') return
  anchor.value = shiftAnchor(granularity.value, anchor.value, -1)
}

function nextPeriod() {
  if (granularity.value === 'custom') return
  anchor.value = shiftAnchor(granularity.value, anchor.value, 1)
}

function openCustom() {
  customOpen.value = true
}

function applyCustom() {
  if (customFrom.value > customTo.value) {
    ;[customFrom.value, customTo.value] = [customTo.value, customFrom.value]
  }
  granularity.value = 'custom'
  anchor.value = customFrom.value
  customOpen.value = false
  loadStats()
}

function onCategorySelect(id: string, hasChildren: boolean) {
  if (hasChildren) {
    categoryParentId.value = id
    return
  }
  drillToRecords({ categoryId: categoryParentId.value ?? id, subcategoryId: categoryParentId.value ? id : undefined })
}

function drillToRecords(query: Record<string, string | undefined>) {
  router.push({
    path: '/records',
    query: {
      dateFrom: range.value.from,
      dateTo: range.value.to,
      type: statType.value,
      ...query,
    },
  })
}

function onTrendSelect(key: string) {
  if (granularity.value === 'year') {
    drillToRecords({ dateFrom: `${key}-01`, dateTo: `${key}-31` })
    return
  }
  drillToRecords({ dateFrom: key, dateTo: key })
}

function onCalendarSelect(date: string) {
  selectedCalendarDate.value = date
  drillToRecords({ dateFrom: date, dateTo: date })
}

function onDonutSelect(id: string) {
  const item = categoryStats.value.find((c) => c.id === id)
  if (item?.hasChildren) {
    categoryParentId.value = id
  } else {
    onCategorySelect(id, false)
  }
}
</script>

<template>
  <div class="reports-page">
    <PageHeader :title="title">
      <template #left>
        <button v-if="granularity !== 'custom'" type="button" class="nav-btn" aria-label="上一期" @click="prevPeriod">
          ‹
        </button>
      </template>
      <template #right>
        <button v-if="granularity !== 'custom'" type="button" class="nav-btn" aria-label="下一期" @click="nextPeriod">
          ›
        </button>
        <button type="button" class="ghost-btn" @click="openCustom">自定义</button>
      </template>
    </PageHeader>

    <div class="tabs" role="tablist" aria-label="统计粒度">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="tab"
        :class="{ active: granularity === tab.key }"
        @click="granularity = tab.key; categoryParentId = null"
      >
        {{ tab.label }}
      </button>
    </div>

    <section v-if="loading" class="loading">
      <SkeletonBlock height="6rem" radius="12px" />
      <SkeletonBlock height="9rem" radius="12px" />
      <SkeletonBlock height="12rem" radius="12px" />
    </section>

    <template v-else>
      <section class="hero stats-hero">
        <div>
          <div class="k">总支出</div>
          <div class="num expense">¥{{ centsToYuanString(summary.expense) }}</div>
        </div>
        <div>
          <div class="k">总收入</div>
          <div class="num income">¥{{ centsToYuanString(summary.income) }}</div>
        </div>
        <div>
          <div class="k">结余</div>
          <div class="num">¥{{ centsToYuanString(summary.balance) }}</div>
        </div>
      </section>

      <p class="meta">共 {{ summary.count }} 笔流水</p>

      <section class="panel">
        <div class="panel-head">
          <h3>分类占比</h3>
          <div class="type-toggle">
            <button
              type="button"
              :class="{ active: statType === 'expense' }"
              @click="statType = 'expense'; categoryParentId = null"
            >
              支出
            </button>
            <button
              type="button"
              :class="{ active: statType === 'income' }"
              @click="statType = 'income'; categoryParentId = null"
            >
              收入
            </button>
          </div>
        </div>
        <DonutChart :segments="donutSegments" @select="onDonutSelect" />
        <CategoryRankList
          :items="categoryStats"
          :drill-parent="categoryParentId"
          @select="onCategorySelect"
          @back="categoryParentId = null"
        />
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3>趋势</h3>
          <div class="type-toggle">
            <button type="button" :class="{ active: trendMode === 'expense' }" @click="trendMode = 'expense'">
              支出
            </button>
            <button type="button" :class="{ active: trendMode === 'income' }" @click="trendMode = 'income'">
              收入
            </button>
          </div>
        </div>
        <TrendChart :points="trendPoints" :mode="trendMode" @select="onTrendSelect" />
      </section>

      <section class="panel">
        <h3>星期分布</h3>
        <div class="weekday-bars">
          <div v-for="w in weekdayStats" :key="w.label" class="weekday-col">
            <div
              class="weekday-bar"
              :style="{ height: `${Math.max(4, (w.amount / weekdayMax) * 100)}%` }"
            />
            <span>{{ w.label.replace('周', '') }}</span>
          </div>
        </div>
      </section>

      <section class="panel">
        <h3>收支日历</h3>
        <CalendarChart
          :days="calendarDays"
          :selected="selectedCalendarDate"
          @select="onCalendarSelect"
        />
      </section>
    </template>

    <BottomSheet :open="customOpen" title="自定义日期" @close="customOpen = false">
      <div class="custom-form">
        <label>
          开始日期
          <input v-model="customFrom" type="date" />
        </label>
        <label>
          结束日期
          <input v-model="customTo" type="date" />
        </label>
        <button type="button" class="primary-btn" @click="applyCustom">应用</button>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.nav-btn,
.ghost-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 1.1rem;
  padding: 0 0.35rem;
  cursor: pointer;
}

.ghost-btn {
  font-size: 0.82rem;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  padding: 0.25rem;
  border-radius: 12px;
  background: var(--cream);
}

.tab {
  border: none;
  border-radius: 10px;
  padding: 0.45rem 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
}

.tab.active {
  background: var(--panel);
  color: var(--ink);
  box-shadow: 0 1px 4px #2c241610;
}

.loading {
  display: grid;
  gap: 0.75rem;
}

.stats-hero {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.hero .k {
  font-size: 0.75rem;
  color: var(--muted);
}

.hero .num {
  margin-top: 0.2rem;
  font-family: Fraunces, Georgia, serif;
  font-size: 1.05rem;
}

.hero .num.expense {
  color: var(--expense);
}

.hero .num.income {
  color: var(--income);
}

.meta {
  margin: 0 0 0.85rem;
  font-size: 0.78rem;
  color: var(--muted-2);
  text-align: center;
}

.panel {
  margin-bottom: 0.85rem;
  padding: 0.85rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.panel h3 {
  margin: 0 0 0.65rem;
  font-size: 0.88rem;
  font-weight: 600;
}

.panel-head h3 {
  margin: 0;
}

.type-toggle {
  display: flex;
  gap: 0.25rem;
  padding: 0.15rem;
  border-radius: 8px;
  background: var(--cream);
}

.type-toggle button {
  border: none;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  background: transparent;
  color: var(--muted);
  font-size: 0.72rem;
  cursor: pointer;
}

.type-toggle button.active {
  background: var(--panel);
  color: var(--ink);
  font-weight: 600;
}

.weekday-bars {
  height: 6rem;
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
}

.weekday-col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  font-size: 0.68rem;
  color: var(--muted);
}

.weekday-bar {
  width: 100%;
  border-radius: 6px 6px 2px 2px;
  background: var(--brand);
  min-height: 4px;
}

.custom-form {
  display: grid;
  gap: 0.75rem;
  padding: 0.5rem 0 1rem;
}

.custom-form label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: var(--muted);
}

.custom-form input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--cream);
  color: var(--ink);
  font-size: 0.9rem;
}

.primary-btn {
  margin-top: 0.25rem;
  padding: 0.7rem;
  border: none;
  border-radius: 12px;
  background: var(--brand);
  color: #fff;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
