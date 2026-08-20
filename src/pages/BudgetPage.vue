<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import BudgetRing from '@/components/home/BudgetRing.vue'
import { useToast } from '@/composables/useToast'
import { useAppStore } from '@/stores/app.store'
import { useUiStore } from '@/stores/ui.store'
import { budgetService } from '@/services'
import { budgetRepository } from '@/repositories'
import type { BudgetView } from '@/models/stats'
import { centsToYuanString } from '@/utils/money'
import { currentYearMonth, formatYearMonthLabel } from '@/utils/format'

const appStore = useAppStore()
const uiStore = useUiStore()
const toast = useToast()

const loading = ref(true)
const yearMonth = ref(currentYearMonth())
const view = ref<BudgetView | null>(null)
const defaultAmount = ref('')
const monthAmount = ref('')
const editingDefault = ref(false)
const editingMonth = ref(false)

const monthLabel = computed(() => formatYearMonthLabel(yearMonth.value))
const hasBudget = computed(() => view.value && view.value.budgetCents > 0)

async function loadBudget() {
  if (!appStore.currentBook) return
  loading.value = true
  try {
    view.value = await budgetService.getView(appStore.currentBook.id, yearMonth.value)
    if (view.value.source !== 'none') {
      monthAmount.value = centsToYuanString(view.value.budgetCents)
    } else {
      monthAmount.value = ''
    }
    const all = await budgetRepository.listByBook(appStore.currentBook.id)
    const def = all.find((b) => b.isDefault)
    defaultAmount.value = def ? centsToYuanString(def.amount) : ''
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await appStore.initialize()
  await loadBudget()
})

watch(
  () => uiStore.dataVersion,
  () => loadBudget(),
)

function prevMonth() {
  const [y, m] = yearMonth.value.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  yearMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  loadBudget()
}

function nextMonth() {
  const [y, m] = yearMonth.value.split('-').map(Number)
  const d = new Date(y, m, 1)
  yearMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  loadBudget()
}

async function saveDefault() {
  if (!appStore.currentBook) return
  try {
    await budgetService.setDefault(appStore.currentBook.id, defaultAmount.value)
    uiStore.bumpData()
    toast.success('默认预算已保存')
    editingDefault.value = false
    await loadBudget()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function saveMonth() {
  if (!appStore.currentBook) return
  try {
    await budgetService.setMonthOverride(appStore.currentBook.id, yearMonth.value, monthAmount.value)
    uiStore.bumpData()
    toast.success(`${monthLabel.value}预算已保存`)
    editingMonth.value = false
    await loadBudget()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function clearMonth() {
  if (!appStore.currentBook) return
  await budgetService.clearMonthOverride(appStore.currentBook.id, yearMonth.value)
  uiStore.bumpData()
  toast.success('已恢复使用默认预算')
  editingMonth.value = false
  await loadBudget()
}

async function removeDefault() {
  if (!appStore.currentBook) return
  await budgetService.removeDefault(appStore.currentBook.id)
  uiStore.bumpData()
  toast.success('默认预算已清除')
  defaultAmount.value = ''
  editingDefault.value = false
  await loadBudget()
}
</script>

<template>
  <div class="budget-page">
    <PageHeader :title="monthLabel">
      <template #left>
        <button type="button" class="nav-btn" aria-label="上个月" @click="prevMonth">‹</button>
      </template>
      <template #right>
        <button type="button" class="nav-btn" aria-label="下个月" @click="nextMonth">›</button>
      </template>
    </PageHeader>

    <section v-if="loading" class="loading">
      <SkeletonBlock height="8rem" radius="12px" />
      <SkeletonBlock height="6rem" radius="12px" />
    </section>

    <template v-else-if="view">
      <section class="hero-card">
        <BudgetRing
          v-if="hasBudget"
          :pct="view.pct"
          :over="view.over"
          :label="view.over ? '已超支' : `剩余 ¥${centsToYuanString(Math.max(0, view.remainingCents))}`"
        />
        <div v-else class="no-budget">
          <p>尚未设置预算</p>
          <p class="hint">设置后首页圆环将显示进度</p>
        </div>
        <div class="stats">
          <div>
            <div class="k">本月预算</div>
            <div class="num">
              {{ hasBudget ? `¥${centsToYuanString(view.budgetCents)}` : '—' }}
            </div>
            <div v-if="view.source === 'month'" class="tag">本月专属</div>
            <div v-else-if="view.source === 'default'" class="tag">默认预算</div>
          </div>
          <div>
            <div class="k">已支出</div>
            <div class="num expense">¥{{ centsToYuanString(view.spentCents) }}</div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3>本月预算</h3>
          <button type="button" class="link-btn" @click="editingMonth = !editingMonth">
            {{ editingMonth ? '取消' : '编辑' }}
          </button>
        </div>
        <div v-if="editingMonth" class="form">
          <input v-model="monthAmount" type="text" inputmode="decimal" placeholder="输入金额（元）" />
          <div class="actions">
            <button type="button" class="primary-btn" @click="saveMonth">保存</button>
            <button v-if="view.source === 'month'" type="button" class="ghost-btn" @click="clearMonth">
              恢复默认
            </button>
          </div>
        </div>
        <p v-else class="desc">
          {{ view.source === 'month' ? '本月使用专属预算' : '未设置时沿用默认预算' }}
        </p>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3>默认预算</h3>
          <button type="button" class="link-btn" @click="editingDefault = !editingDefault">
            {{ editingDefault ? '取消' : '编辑' }}
          </button>
        </div>
        <div v-if="editingDefault" class="form">
          <input v-model="defaultAmount" type="text" inputmode="decimal" placeholder="输入金额（元）" />
          <div class="actions">
            <button type="button" class="primary-btn" @click="saveDefault">保存</button>
            <button v-if="defaultAmount" type="button" class="ghost-btn" @click="removeDefault">
              清除
            </button>
          </div>
        </div>
        <p v-else class="desc">
          {{ defaultAmount ? `¥${defaultAmount} / 月` : '尚未设置默认预算' }}
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.nav-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 1.1rem;
  padding: 0 0.35rem;
  cursor: pointer;
}

.loading {
  display: grid;
  gap: 0.75rem;
}

.hero-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 0.85rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.no-budget {
  flex-shrink: 0;
  width: 4.4rem;
  text-align: center;
  font-size: 0.72rem;
  color: var(--muted);
}

.no-budget .hint {
  margin: 0.25rem 0 0;
  font-size: 0.65rem;
  color: var(--muted-2);
}

.stats {
  flex: 1;
  display: grid;
  gap: 0.65rem;
}

.stats .k {
  font-size: 0.75rem;
  color: var(--muted);
}

.stats .num {
  margin-top: 0.15rem;
  font-family: Fraunces, Georgia, serif;
  font-size: 1.2rem;
}

.stats .num.expense {
  color: var(--expense);
}

.tag {
  display: inline-block;
  margin-top: 0.25rem;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--brand-deep);
  font-size: 0.65rem;
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
  margin-bottom: 0.5rem;
}

.panel h3 {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--brand-deep);
  font-size: 0.82rem;
  cursor: pointer;
}

.desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}

.form {
  display: grid;
  gap: 0.55rem;
}

.form input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--cream);
  color: var(--ink);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.primary-btn {
  flex: 1;
  padding: 0.6rem;
  border: none;
  border-radius: 10px;
  background: var(--brand);
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.ghost-btn {
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
}
</style>
