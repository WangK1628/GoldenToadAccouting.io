<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SideMenu from '@/components/layout/SideMenu.vue'
import RecordRow from '@/components/record/RecordRow.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import Mascot from '@/components/common/Mascot.vue'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { appService } from '@/services'
import type { TransactionDisplay } from '@/models/display'
import { centsToYuanString } from '@/utils/money'
import {
  currentYearMonth,
  formatDayGroupTitle,
  formatYearMonthLabel,
  WEEKDAY_SHORT,
  weekdayIndex,
} from '@/utils/format'
import { datesOfWeek, elapsedWeekDates } from '@/utils/date-range'
import { todayDateString } from '@/utils/time'

interface DayGroup {
  date: string
  title: string
  expense: number
  income: number
  items: TransactionDisplay[]
}

const WEEKDAYS = WEEKDAY_SHORT
const today = todayDateString()
const weekDates = datesOfWeek(today)

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

const menuOpen = ref(false)
const loading = ref(true)
const yearMonth = ref(currentYearMonth())
const summary = ref({ expense: 0, income: 0, balance: 0, count: 0 })
const dailyAvg = ref(0)
const records = ref<TransactionDisplay[]>([])
const selectedWeekday = ref(weekdayIndex(today))
const selectedDate = computed(() => weekDates[selectedWeekday.value] ?? today)
const isFutureDay = computed(() => selectedDate.value > today)

const monthLabel = computed(() => formatYearMonthLabel(yearMonth.value))
const isGuest = computed(() => authStore.session?.mode !== 'registered')

function buildGroup(date: string, byDate: Map<string, TransactionDisplay[]>): DayGroup {
  const items = (byDate.get(date) ?? []).slice().sort((a, b) => (a.time < b.time ? 1 : -1))
  return {
    date,
    title: formatDayGroupTitle(date),
    expense: items.filter((row) => row.type === 'expense').reduce((sum, row) => sum + row.amount, 0),
    income: items.filter((row) => row.type === 'income').reduce((sum, row) => sum + row.amount, 0),
    items,
  }
}

const groups = computed<DayGroup[]>(() => {
  const byDate = new Map<string, TransactionDisplay[]>()
  for (const item of records.value) {
    const list = byDate.get(item.date) ?? []
    list.push(item)
    byDate.set(item.date, list)
  }

  if (isFutureDay.value) {
    return [buildGroup(selectedDate.value, byDate)]
  }

  const visibleDates = elapsedWeekDates(weekDates, today)
  return visibleDates.map((date) => buildGroup(date, byDate))
})

async function loadData() {
  if (!appStore.currentBook) return
  loading.value = true
  const bookId = appStore.currentBook.id
  const ym = yearMonth.value
  const from = weekDates[0] ?? today
  const to = today
  try {
    ;[summary.value, dailyAvg.value, records.value] = await Promise.all([
      appService.getMonthSummary(bookId, ym),
      appService.getDailyAverageExpense(bookId, ym),
      appService.listRangeTransactionsDisplay(bookId, from, to),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await appStore.initialize()
  await loadData()
})

watch(
  () => uiStore.dataVersion,
  () => loadData(),
)

watch(yearMonth, () => {
  void loadData()
})

function selectWeekday(index: number) {
  selectedWeekday.value = index
  const date = weekDates[index]
  if (!date || date > today) return
  void nextTick(() => {
    document.getElementById(`week-day-${date}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}

function openRecord(item: TransactionDisplay) {
  uiStore.openEditRecord(item.id)
}

function openReports() {
  router.push({ path: '/reports', query: { month: yearMonth.value } })
}

function openRecords() {
  router.push('/records')
}

function openLedgers() {
  router.push('/ledgers')
}

function goLogin() {
  router.push('/login')
}

function shiftMonth(delta: number) {
  const [y, m] = yearMonth.value.split('-').map((v) => Number.parseInt(v, 10))
  const date = new Date(y, (m ?? 1) - 1 + delta, 1)
  yearMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
</script>

<template>
  <div class="home-page">
    <div v-if="isGuest" class="demo-banner">演示数据，登录后可正常使用</div>

    <header class="topbar">
      <button type="button" class="icon-btn" aria-label="菜单" @click="menuOpen = true">
        <span class="burger" aria-hidden="true" />
      </button>
      <h1 class="title">
        <Mascot :size="28" rounded />
        金蝉记账
      </h1>
      <button v-if="isGuest" type="button" class="login-chip" @click="goLogin">去登录</button>
      <button v-else type="button" class="login-chip" @click="router.push('/settings')">设置</button>
    </header>

    <SideMenu :open="menuOpen" @close="menuOpen = false" />

    <section v-if="loading" class="loading-block">
      <SkeletonBlock height="11rem" radius="20px" />
      <SkeletonBlock height="8rem" radius="16px" />
    </section>

    <template v-else>
      <section class="hero">
        <div class="hero-top">
          <button type="button" class="month-btn" aria-label="上个月" @click="shiftMonth(-1)">‹</button>
          <span class="month-label">{{ monthLabel }}</span>
          <button type="button" class="month-btn" aria-label="下个月" @click="shiftMonth(1)">›</button>
          <button type="button" class="report-chip" @click="openReports">统计报表 ›</button>
        </div>

        <div class="hero-body">
          <div class="hero-main">
            <div class="label">本月支出</div>
            <div class="amount">¥{{ centsToYuanString(summary.expense) }}</div>
            <div class="income">收入 ¥{{ centsToYuanString(summary.income) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat">
              <strong>{{ summary.count }}</strong>
              <span>本月笔数</span>
            </div>
            <div class="stat">
              <strong>{{ centsToYuanString(dailyAvg) }}</strong>
              <span>日均支出</span>
            </div>
          </div>
        </div>
      </section>

      <div class="weekdays" role="tablist" aria-label="本周日期">
        <button
          v-for="(day, index) in WEEKDAYS"
          :key="day"
          type="button"
          role="tab"
          :aria-selected="selectedWeekday === index"
          :class="{ active: selectedWeekday === index }"
          @click="selectWeekday(index)"
        >
          {{ day }}
        </button>
      </div>

      <section class="sheet">
        <div class="section-head">
          <h2>日流水</h2>
          <button type="button" class="link-btn" @click="openRecords">全部流水 ›</button>
        </div>

        <EmptyState v-if="isFutureDay" title="暂无记录" description="这一天还没有流水" />

        <template v-else>
          <div v-for="group in groups" :id="`week-day-${group.date}`" :key="group.date" class="day-group">
            <div class="day-head">
              <div>
                <div class="day-title">{{ group.title }}</div>
                <div class="day-sum">
                  支 ¥{{ centsToYuanString(group.expense) }} 收 ¥{{ centsToYuanString(group.income) }}
                </div>
              </div>
              <button type="button" class="book-link" @click="openLedgers">
                {{ appStore.currentBookName }} ›
              </button>
            </div>
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="record-btn"
              @click="openRecord(item)"
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
            <p v-if="group.items.length === 0" class="day-empty">暂无流水</p>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<style scoped>
.home-page {
  margin: -0.35rem -0.9rem 0;
  min-height: 100%;
  background: var(--bg0);
}

.demo-banner {
  padding: 0.38rem 0.75rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--brand-deep);
  background: #efe6cf;
}

.topbar {
  display: grid;
  grid-template-columns: 2.2rem 1fr auto;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.9rem 0.45rem;
  background: var(--bg0);
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--brand-deep);
}

.icon-btn,
.month-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}

.burger {
  display: block;
  width: 1.05rem;
  height: 2px;
  background: var(--ink);
  box-shadow:
    0 -6px 0 var(--ink),
    0 6px 0 var(--ink);
  border-radius: 99px;
}

.login-chip {
  border: none;
  border-radius: 999px;
  padding: 0.32rem 0.72rem;
  background: var(--hero);
  color: var(--brand-deep);
  font-size: 0.78rem;
  cursor: pointer;
}

.hero {
  margin: 0 0.55rem;
  padding: 0.85rem 0.95rem 0.9rem;
  border-radius: 22px 22px 0 0;
  background: var(--hero);
  color: var(--hero-ink);
}

.hero-top {
  display: flex;
  align-items: center;
  gap: 0.05rem;
}

.month-label {
  font-size: 0.92rem;
  font-weight: 650;
  padding: 0 0.15rem;
}

.month-btn {
  width: 1.55rem;
  height: 1.55rem;
  color: inherit;
  opacity: 0.7;
}

.report-chip {
  margin-left: auto;
  border: none;
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
  background: rgba(255, 255, 255, 0.62);
  color: var(--brand-deep);
  font-size: 0.72rem;
  cursor: pointer;
}

.hero-body {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.hero-main .label {
  font-size: 0.78rem;
  color: var(--muted);
}

.hero-main .amount {
  margin-top: 0.15rem;
  font-size: 1.9rem;
  font-weight: 750;
  letter-spacing: -0.03em;
  line-height: 1.08;
  color: var(--ink);
}

.hero-main .income {
  margin-top: 0.38rem;
  font-size: 0.8rem;
  color: var(--ink);
}

.stat-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-self: center;
  min-width: 9.6rem;
  padding: 0.7rem 0.2rem;
  border-radius: 16px;
  background: #fff;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.18rem;
  padding: 0 0.3rem;
}

.stat + .stat {
  border-left: 1px solid var(--line);
}

.stat strong {
  font-size: 1rem;
  color: var(--ink);
}

.stat span {
  font-size: 0.68rem;
  color: var(--muted);
}

.weekdays {
  position: sticky;
  top: 0;
  z-index: 6;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin: 0 0.55rem;
  padding: 0.15rem 0.95rem 0;
  background: var(--hero);
}

.weekdays button {
  position: relative;
  border: none;
  background: transparent;
  color: var(--ink);
  opacity: 0.55;
  font-size: 0.78rem;
  padding: 0.45rem 0 0.7rem;
  cursor: pointer;
}

.weekdays button.active {
  opacity: 1;
  font-weight: 700;
}

.weekdays button.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0.28rem;
  width: 1.15rem;
  height: 2px;
  border-radius: 99px;
  background: var(--brand-deep);
  transform: translateX(-50%);
}

.sheet {
  margin: 0 0.55rem;
  padding: 1rem 0.95rem 1.4rem;
  border-radius: 22px 22px 0 0;
  background: #fff;
  min-height: 18rem;
}

.section-head,
.day-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.section-head {
  margin-bottom: 0.55rem;
}

.section-head h2 {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
}

.link-btn,
.book-link {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 0.78rem;
  padding: 0;
  cursor: pointer;
}

.day-group {
  scroll-margin-top: 2.8rem;
}

.day-group + .day-group {
  margin-top: 0.85rem;
}

.day-empty {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: var(--muted-2);
}

.day-title {
  font-size: 0.9rem;
  font-weight: 650;
}

.day-sum {
  margin-top: 0.12rem;
  font-size: 0.72rem;
  color: var(--muted);
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

.day-group :deep(.record-row:last-child) {
  border-bottom: none;
}

.loading-block {
  display: grid;
  gap: 0.75rem;
  padding: 0 0.9rem;
}
</style>
