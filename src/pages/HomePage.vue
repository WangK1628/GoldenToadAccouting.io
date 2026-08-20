<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SideMenu from '@/components/layout/SideMenu.vue'
import BudgetRing from '@/components/home/BudgetRing.vue'
import WeekChart from '@/components/home/WeekChart.vue'
import RecordRow from '@/components/record/RecordRow.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import { useAppStore } from '@/stores/app.store'
import { useUiStore } from '@/stores/ui.store'
import { appService } from '@/services'
import type { BudgetProgress, TransactionDisplay, WeekChartPoint } from '@/models/display'
import { centsToYuanString } from '@/utils/money'
import { currentYearMonth, formatYearMonthLabel } from '@/utils/format'

const router = useRouter()
const appStore = useAppStore()
const uiStore = useUiStore()

const menuOpen = ref(false)
const loading = ref(true)
const yearMonth = ref(currentYearMonth())
const summary = ref({ expense: 0, income: 0, balance: 0, count: 0 })
const dailyAvg = ref(0)
const records = ref<TransactionDisplay[]>([])
const weekChart = ref<WeekChartPoint[]>([])
const budget = ref<BudgetProgress | null>(null)

const monthLabel = computed(() => formatYearMonthLabel(yearMonth.value))
const showBalance = computed(() => summary.value.income > 0)

async function loadData() {
  if (!appStore.currentBook) return
  loading.value = true
  const bookId = appStore.currentBook.id
  const ym = yearMonth.value
  try {
    ;[summary.value, dailyAvg.value, records.value, weekChart.value, budget.value] =
      await Promise.all([
        appService.getMonthSummary(bookId, ym),
        appService.getDailyAverageExpense(bookId, ym),
        appService.listRecentTransactionsDisplay(bookId, 6),
        appService.getWeekChart(bookId, ym),
        appService.getBudgetProgress(bookId, ym),
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

function openRecord(item: TransactionDisplay) {
  uiStore.openEditRecord(item.id)
}

function openReports() {
  router.push({ path: '/reports', query: { month: yearMonth.value } })
}

function openBudget() {
  router.push('/budget')
}

function openRecords() {
  router.push('/records')
}

function openProfile() {
  router.push('/settings')
}
</script>

<template>
  <div class="home-page">
    <header class="topbar">
      <button type="button" class="icon-btn" aria-label="菜单" @click="menuOpen = true">
        <span class="burger" aria-hidden="true" />
      </button>
      <h1 class="title">
        <img src="/favicon.svg" alt="" width="28" height="28" class="brand-mark" />
        金蝉记账
      </h1>
      <button type="button" class="avatar-btn" aria-label="设置" @click="openProfile">
        <img src="/favicon.svg" alt="" width="32" height="32" />
      </button>
    </header>

    <SideMenu :open="menuOpen" @close="menuOpen = false" />

    <section class="month-row">
      <button type="button" class="month-btn">{{ monthLabel }} ▾</button>
      <button type="button" class="report-btn" @click="openReports">统计报表 ›</button>
    </section>

    <section v-if="loading" class="loading-block">
      <SkeletonBlock height="5.5rem" radius="12px" />
      <SkeletonBlock height="4rem" radius="12px" />
      <SkeletonBlock height="8rem" radius="12px" />
    </section>

    <template v-else>
      <section class="hero-card">
        <div class="hero-main">
          <div class="label">本月支出</div>
          <div class="amount">¥{{ centsToYuanString(summary.expense) }}</div>
          <div class="meta">
            <span>收入 ¥{{ centsToYuanString(summary.income) }}</span>
            <span v-if="showBalance">结余 ¥{{ centsToYuanString(summary.balance) }}</span>
          </div>
        </div>
        <button v-if="budget" type="button" class="budget-btn" aria-label="预算详情" @click="openBudget">
          <BudgetRing
            :pct="budget.pct"
            :over="budget.over"
            :label="`预算 ¥${centsToYuanString(budget.budgetCents)}`"
          />
        </button>
        <button v-else type="button" class="budget-btn budget-empty" @click="openBudget">
          设置预算
        </button>
      </section>

      <section class="stats">
        <div class="stat">
          <div class="k">本月笔数</div>
          <div class="num">{{ summary.count }}</div>
        </div>
        <div class="stat">
          <div class="k">日均支出</div>
          <div class="num">{{ centsToYuanString(dailyAvg) }}</div>
        </div>
      </section>

      <WeekChart :values="weekChart.map((p) => p.amount)" :labels="weekChart.map((p) => p.label)" />

      <section class="records-section">
        <div class="section-head">
          <h2>本月流水</h2>
          <button type="button" class="link-btn" @click="openRecords">全部流水 ›</button>
        </div>

        <EmptyState
          v-if="records.length === 0"
          title="暂无流水"
          description="试试底部输入或手动记账"
        />
        <div v-else class="record-list">
          <button
            v-for="item in records"
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
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.home-page {
  margin: -0.15rem -0.05rem 0;
}

.topbar {
  display: grid;
  grid-template-columns: 2.4rem 1fr 2.4rem;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.55rem;
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin: 0;
  font-size: 1.02rem;
  font-weight: 600;
}

.brand-mark {
  border-radius: 8px;
}

.icon-btn,
.avatar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.icon-btn:active,
.avatar-btn:active {
  background: var(--cream-deep);
}

.burger {
  display: block;
  width: 1.1rem;
  height: 2px;
  background: var(--ink);
  box-shadow:
    0 -6px 0 var(--ink),
    0 6px 0 var(--ink);
  border-radius: 99px;
}

.avatar-btn img {
  border-radius: 999px;
}

.month-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.month-btn,
.report-btn,
.link-btn {
  border: none;
  background: transparent;
  color: var(--ink);
  padding: 0;
  font-size: 0.9rem;
  cursor: pointer;
}

.report-btn,
.link-btn {
  font-size: 0.82rem;
  color: var(--muted);
}

.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.hero-main .label {
  font-size: 0.82rem;
  color: var(--muted);
}

.hero-main .amount {
  margin-top: 0.25rem;
  font-family: Fraunces, Georgia, serif;
  font-size: 1.75rem;
  letter-spacing: -0.03em;
}

.hero-main .meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--muted);
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  margin: 0.75rem 0;
  padding: 0.55rem 0.35rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.stat {
  text-align: center;
}

.stat .k {
  font-size: 0.75rem;
  color: var(--muted);
}

.stat .num {
  margin-top: 0.25rem;
  font-family: Fraunces, Georgia, serif;
  font-size: 1.15rem;
}

.records-section {
  margin-top: 1rem;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}

.section-head h2 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
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

.loading-block {
  display: grid;
  gap: 0.75rem;
}

.budget-btn {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.budget-empty {
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--brand-deep);
  font-size: 0.78rem;
  white-space: nowrap;
}
</style>
