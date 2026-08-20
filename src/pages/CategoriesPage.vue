<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useAppStore } from '@/stores/app.store'
import { useUiStore } from '@/stores/ui.store'
import { categoryService } from '@/services'
import type { CategoryGroup } from '@/services/record.service'
import { recordService } from '@/services'
import type { TransactionType } from '@/models'
import { useToast } from '@/composables/useToast'

const appStore = useAppStore()
const uiStore = useUiStore()
const toast = useToast()

const loading = ref(true)
const typeTab = ref<TransactionType>('expense')
const groups = ref<CategoryGroup[]>([])
const newParentName = ref('')
const newChildName = ref('')
const newChildParentId = ref('')

async function load() {
  if (!appStore.currentBook) return
  loading.value = true
  groups.value = await recordService.listCategoryGroups(appStore.currentBook.id, typeTab.value)
  loading.value = false
}

onMounted(async () => {
  await appStore.initialize()
  await load()
})

watch(typeTab, () => load())
watch(
  () => uiStore.dataVersion,
  () => load(),
)

async function addParent() {
  if (!appStore.currentBook || !newParentName.value.trim()) return
  try {
    await categoryService.createParent(appStore.currentBook.id, {
      name: newParentName.value,
      type: typeTab.value,
      icon: '📌',
    })
    newParentName.value = ''
    uiStore.bumpData()
    toast.success('已添加一级分类')
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '添加失败')
  }
}

async function addChild() {
  if (!appStore.currentBook || !newChildParentId.value || !newChildName.value.trim()) return
  try {
    await categoryService.createChild(appStore.currentBook.id, newChildParentId.value, {
      name: newChildName.value,
      icon: '📎',
    })
    newChildName.value = ''
    uiStore.bumpData()
    toast.success('已添加二级分类')
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '添加失败')
  }
}

async function removeCategory(id: string, name: string) {
  if (!window.confirm(`确定删除分类「${name}」？`)) return
  try {
    await categoryService.delete(id)
    uiStore.bumpData()
    toast.success('已删除')
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <div class="categories-page">
    <PageHeader title="分类管理" />

    <div class="type-tabs">
      <button type="button" :class="{ active: typeTab === 'expense' }" @click="typeTab = 'expense'">
        支出
      </button>
      <button type="button" :class="{ active: typeTab === 'income' }" @click="typeTab = 'income'">
        收入
      </button>
    </div>

    <div v-if="loading" class="muted">加载中…</div>

    <div v-else class="list">
      <article v-for="g in groups" :key="g.parent.id" class="group-card">
        <div class="group-head">
          <span class="emoji">{{ g.parent.icon }}</span>
          <strong>{{ g.parent.name }}</strong>
          <button
            type="button"
            class="del"
            aria-label="删除"
            @click="removeCategory(g.parent.id, g.parent.name)"
          >
            删除
          </button>
        </div>
        <div v-if="g.children.length" class="children">
          <span v-for="child in g.children" :key="child.id" class="child">
            {{ child.icon }} {{ child.name }}
            <button type="button" class="del-sm" @click="removeCategory(child.id, child.name)">
              ×
            </button>
          </span>
        </div>
      </article>
    </div>

    <section class="add-box">
      <h3>新建一级分类</h3>
      <div class="row">
        <input v-model="newParentName" type="text" placeholder="分类名" />
        <button type="button" @click="addParent">添加</button>
      </div>
    </section>

    <section class="add-box">
      <h3>新建二级分类</h3>
      <select v-model="newChildParentId">
        <option disabled value="">选择一级分类</option>
        <option v-for="g in groups" :key="g.parent.id" :value="g.parent.id">
          {{ g.parent.name }}
        </option>
      </select>
      <div class="row">
        <input v-model="newChildName" type="text" placeholder="二级名称" />
        <button type="button" @click="addChild">添加</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.type-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  padding: 0.25rem;
  border-radius: 12px;
  background: var(--cream);
}

.type-tabs button {
  border: none;
  border-radius: 10px;
  padding: 0.5rem;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.type-tabs button.active {
  background: var(--panel);
  font-weight: 600;
  color: var(--ink);
}

.list {
  display: grid;
  gap: 0.55rem;
}

.group-card {
  padding: 0.75rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.group-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.group-head strong {
  flex: 1;
}

.del,
.del-sm {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 0.78rem;
  cursor: pointer;
}

.children {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.55rem;
}

.child {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  background: var(--cream);
  font-size: 0.8rem;
}

.add-box {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: var(--cream);
}

.add-box h3 {
  margin: 0 0 0.5rem;
  font-size: 0.82rem;
  color: var(--muted);
}

.row {
  display: flex;
  gap: 0.45rem;
  margin-top: 0.45rem;
}

.row input,
.add-box select {
  flex: 1;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
}

.row button {
  padding: 0.55rem 0.85rem;
  border: none;
  border-radius: 10px;
  background: var(--brand);
  color: #fff;
  cursor: pointer;
}

.muted {
  color: var(--muted);
  text-align: center;
  padding: 1rem;
}
</style>
