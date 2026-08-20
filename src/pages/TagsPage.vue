<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { tagService } from '@/services'
import type { Tag } from '@/models'
import { useUiStore } from '@/stores/ui.store'
import { useToast } from '@/composables/useToast'

const uiStore = useUiStore()
const toast = useToast()

const tags = ref<Tag[]>([])
const newName = ref('')
const editingId = ref<string | null>(null)
const editingName = ref('')

async function load() {
  tags.value = await tagService.list()
}

onMounted(() => load())
watch(
  () => uiStore.dataVersion,
  () => load(),
)

async function addTag() {
  if (!newName.value.trim()) return
  try {
    await tagService.create(newName.value)
    newName.value = ''
    uiStore.bumpData()
    toast.success('标签已添加')
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '添加失败')
  }
}

function startEdit(tag: Tag) {
  editingId.value = tag.id
  editingName.value = tag.name
}

async function saveEdit() {
  if (!editingId.value || !editingName.value.trim()) return
  try {
    await tagService.update(editingId.value, { name: editingName.value.trim() })
    editingId.value = null
    uiStore.bumpData()
    toast.success('已保存')
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function removeTag(tag: Tag) {
  if (!window.confirm(`删除标签「${tag.name}」？`)) return
  try {
    await tagService.delete(tag.id)
    uiStore.bumpData()
    toast.success('已删除')
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <div class="tags-page">
    <PageHeader title="标签管理" />

    <ul class="tag-list">
      <li v-for="tag in tags" :key="tag.id">
        <template v-if="editingId === tag.id">
          <input v-model="editingName" type="text" @keydown.enter="saveEdit" />
          <button type="button" @click="saveEdit">保存</button>
        </template>
        <template v-else>
          <span>{{ tag.name }}</span>
          <div class="actions">
            <button type="button" @click="startEdit(tag)">改名</button>
            <button type="button" class="danger" @click="removeTag(tag)">删除</button>
          </div>
        </template>
      </li>
    </ul>

    <div class="add-row">
      <input v-model="newName" type="text" placeholder="新标签名" @keydown.enter="addTag" />
      <button type="button" @click="addTag">添加</button>
    </div>
  </div>
</template>

<style scoped>
.tag-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}

.tag-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
}

.actions {
  display: flex;
  gap: 0.35rem;
}

.actions button {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 0.78rem;
  cursor: pointer;
}

.actions .danger {
  color: #8b2e2e;
}

.add-row {
  display: flex;
  gap: 0.45rem;
  margin-top: 1rem;
}

.add-row input {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
}

.add-row button {
  padding: 0.6rem 0.9rem;
  border: none;
  border-radius: 10px;
  background: var(--brand);
  color: #fff;
  cursor: pointer;
}

.tag-list input {
  flex: 1;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--line);
  border-radius: 8px;
}
</style>
