<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BottomSheet from '@/components/sheet/BottomSheet.vue'
import NumPad from '@/components/record/NumPad.vue'
import { useToast } from '@/composables/useToast'
import { useAppStore } from '@/stores/app.store'
import { useUiStore } from '@/stores/ui.store'
import type { CategoryGroup } from '@/services/record.service'
import { recordService } from '@/services'
import type { RecordFormInput } from '@/services/record.service'
import type { TransactionType } from '@/models'
import { appendAmountKey, formatAmountDisplay } from '@/utils/amount-input'
import { centsToYuanString } from '@/utils/money'

const appStore = useAppStore()
const uiStore = useUiStore()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const form = ref<RecordFormInput | null>(null)
const groups = ref<CategoryGroup[]>([])
const recentKeys = ref<Array<{ categoryId: string; subcategoryId: string | null }>>([])
const tagInput = ref('')

const isEdit = computed(() => Boolean(uiStore.editingTransactionId))
const title = computed(() => (isEdit.value ? '编辑流水' : '记一笔'))
const amountDisplay = computed(() => formatAmountDisplay(form.value?.amountYuan ?? ''))

const subcategories = computed(() => {
  if (!form.value) return []
  const group = groups.value.find((g) => g.parent.id === form.value!.categoryId)
  return group?.children ?? []
})

const recentChips = computed(() => {
  const map = new Map<string, { label: string; categoryId: string; subcategoryId: string | null }>()
  for (const pair of recentKeys.value) {
    const group = groups.value.find((g) => g.parent.id === pair.categoryId)
    if (!group) continue
    const sub = pair.subcategoryId
      ? group.children.find((c) => c.id === pair.subcategoryId)
      : null
    const label = sub ? `${group.parent.name} · ${sub.name}` : group.parent.name
    const key = `${pair.categoryId}:${pair.subcategoryId ?? ''}`
    map.set(key, { label, categoryId: pair.categoryId, subcategoryId: pair.subcategoryId })
  }
  return [...map.values()]
})

async function loadForm() {
  if (!appStore.currentBook) return
  loading.value = true
  const bookId = appStore.currentBook.id
  try {
    if (uiStore.editingTransactionId) {
      const detail = await recordService.getDetail(uiStore.editingTransactionId, bookId)
      if (!detail) throw new Error('流水不存在')
      groups.value = await recordService.listCategoryGroups(bookId, detail.type)
      const categoryId = resolveParentId(detail.categoryId, detail.subcategoryId)
      form.value = {
        bookId,
        type: detail.type,
        amountYuan: centsToYuanString(detail.amount),
        categoryId,
        subcategoryId: detail.subcategoryId,
        date: detail.date,
        time: detail.time,
        note: detail.note ?? '',
        tagIds: detail.tagIds,
        tagNames: [],
      }
      tagInput.value = detail.tagNames.join('、')
      recentKeys.value = await recordService.getRecentCategoryPairs(bookId, detail.type)
    } else {
      form.value = recordService.emptyForm(bookId)
      tagInput.value = ''
      await loadCategories()
      recentKeys.value = await recordService.getRecentCategoryPairs(bookId, form.value.type)
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '加载失败')
    uiStore.closeRecordSheet()
  } finally {
    loading.value = false
  }
}

function resolveParentId(categoryId: string, subcategoryId: string | null): string {
  if (subcategoryId) {
    for (const g of groups.value) {
      if (g.children.some((c) => c.id === subcategoryId)) return g.parent.id
    }
  }
  return categoryId
}

async function loadCategories() {
  if (!form.value) return
  groups.value = await recordService.listCategoryGroups(form.value.bookId, form.value.type)
  if (!form.value.categoryId && groups.value.length > 0) {
    form.value.categoryId = groups.value[0].parent.id
    form.value.subcategoryId = groups.value[0].children[0]?.id ?? null
  }
}

watch(
  () => uiStore.recordSheetOpen,
  (open) => {
    if (open) loadForm()
  },
)

async function setType(type: TransactionType) {
  if (!form.value || form.value.type === type) return
  form.value.type = type
  form.value.categoryId = ''
  form.value.subcategoryId = null
  await loadCategories()
  if (appStore.currentBook) {
    recentKeys.value = await recordService.getRecentCategoryPairs(
      appStore.currentBook.id,
      type,
    )
  }
}

function selectCategory(parentId: string, subcategoryId: string | null) {
  if (!form.value) return
  form.value.categoryId = parentId
  form.value.subcategoryId = subcategoryId
}

function onNumpadInput(key: string) {
  if (!form.value) return
  form.value.amountYuan = appendAmountKey(form.value.amountYuan, key)
}

function parseTagNames(): string[] {
  return tagInput.value
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function submit() {
  if (!form.value || saving.value) return
  if (!form.value.categoryId) {
    toast.error('请选择分类')
    return
  }
  saving.value = true
  try {
    const payload: RecordFormInput = {
      ...form.value,
      tagNames: parseTagNames(),
    }
    if (isEdit.value && uiStore.editingTransactionId) {
      await recordService.update(uiStore.editingTransactionId, payload)
      toast.success('已保存')
    } else {
      await recordService.create(payload)
      toast.success('记账成功')
    }
    uiStore.bumpData()
    uiStore.closeRecordSheet()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!uiStore.editingTransactionId || saving.value) return
  if (!window.confirm('确定删除这笔流水？')) return
  saving.value = true
  try {
    await recordService.delete(uiStore.editingTransactionId)
    toast.success('已删除')
    uiStore.bumpData()
    uiStore.closeRecordSheet()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BottomSheet
    :open="uiStore.recordSheetOpen"
    :title="title"
    :z-index="100"
    @close="uiStore.closeRecordSheet()"
  >
    <div v-if="loading" class="loading">加载中…</div>

    <div v-else-if="form" class="record-form">
      <div class="amount-hero">
        <span class="currency">¥</span>
        <span class="value">{{ amountDisplay }}</span>
      </div>

      <div class="type-toggle">
        <button
          type="button"
          :class="{ active: form.type === 'expense' }"
          @click="setType('expense')"
        >
          支出
        </button>
        <button
          type="button"
          :class="{ active: form.type === 'income' }"
          @click="setType('income')"
        >
          收入
        </button>
      </div>

      <section v-if="recentChips.length" class="section">
        <h3>最近使用</h3>
        <div class="chips">
          <button
            v-for="chip in recentChips"
            :key="`${chip.categoryId}-${chip.subcategoryId}`"
            type="button"
            class="chip"
            :class="{
              active:
                form.categoryId === chip.categoryId &&
                form.subcategoryId === chip.subcategoryId,
            }"
            @click="selectCategory(chip.categoryId, chip.subcategoryId)"
          >
            {{ chip.label }}
          </button>
        </div>
      </section>

      <section class="section" data-guide="record-category">
        <h3>分类</h3>
        <div class="chips">
          <button
            v-for="g in groups"
            :key="g.parent.id"
            type="button"
            class="chip cat"
            :class="{ active: form.categoryId === g.parent.id }"
            @click="selectCategory(g.parent.id, g.children[0]?.id ?? null)"
          >
            <span class="emoji">{{ g.parent.icon }}</span>
            {{ g.parent.name }}
          </button>
        </div>
        <div v-if="subcategories.length" class="chips sub">
          <button
            v-for="sub in subcategories"
            :key="sub.id"
            type="button"
            class="chip"
            :class="{ active: form.subcategoryId === sub.id }"
            @click="selectCategory(form.categoryId, sub.id)"
          >
            <span class="emoji">{{ sub.icon }}</span>
            {{ sub.name }}
          </button>
        </div>
      </section>

      <section class="section meta-grid" data-guide="record-datetime">
        <label>
          <span>日期</span>
          <input v-model="form.date" type="date" />
        </label>
        <label>
          <span>时间</span>
          <input v-model="form.time" type="time" />
        </label>
      </section>

      <section class="section">
        <label class="field" data-guide="record-note">
          <span>备注</span>
          <input
            v-model="form.note"
            type="text"
            placeholder="可选"
            maxlength="120"
          />
        </label>
        <label class="field">
          <span>标签</span>
          <input
            v-model="tagInput"
            type="text"
            placeholder="多个标签用顿号分隔，如 京东、牛奶"
          />
        </label>
      </section>

      <div data-guide="record-amount">
        <NumPad @input="onNumpadInput" @delete="onNumpadInput('del')" />
      </div>
    </div>

    <template #footer>
      <div class="footer-actions">
        <button
          v-if="isEdit"
          type="button"
          class="btn danger"
          :disabled="saving"
          @click="remove"
        >
          删除
        </button>
        <button
          type="button"
          class="btn primary"
          data-guide="record-submit"
          :disabled="saving || loading"
          @click="submit"
        >
          {{ saving ? '保存中…' : isEdit ? '保存' : '记一笔' }}
        </button>
      </div>
    </template>
  </BottomSheet>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 2rem;
  color: var(--muted);
}

.amount-hero {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.5rem 0 0.75rem;
  font-family: Fraunces, Georgia, serif;
}

.currency {
  font-size: 1.25rem;
  color: var(--muted);
}

.value {
  font-size: 2.25rem;
  letter-spacing: -0.03em;
}

.type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  padding: 0.25rem;
  border-radius: 12px;
  background: var(--cream);
}

.type-toggle button {
  border: none;
  border-radius: 10px;
  padding: 0.5rem;
  background: transparent;
  color: var(--muted);
  font-size: 0.9rem;
  cursor: pointer;
}

.type-toggle button.active {
  background: var(--panel);
  color: var(--ink);
  font-weight: 600;
  box-shadow: 0 1px 4px #2c241610;
}

.section {
  margin-bottom: 0.85rem;
}

.section h3 {
  margin: 0 0 0.45rem;
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 600;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chips.sub {
  margin-top: 0.45rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  color: var(--ink);
  font-size: 0.82rem;
  cursor: pointer;
}

.chip.active {
  border-color: var(--brand);
  background: var(--accent-soft);
  color: var(--brand-deep);
}

.emoji {
  font-size: 1rem;
  line-height: 1;
}

.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.meta-grid label,
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--muted);
}

.meta-grid input,
.field input {
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg0);
  color: var(--ink);
  font-size: 0.9rem;
}

.footer-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  flex: 1;
  min-height: 2.65rem;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.btn.primary {
  background: var(--brand);
  color: #fff;
}

.btn.danger {
  background: transparent;
  border: 1px solid #e8b4b4;
  color: #8b2e2e;
}

.btn:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
