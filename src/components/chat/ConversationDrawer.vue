<script setup lang="ts">
import type { AiConversation } from '@/models'

defineProps<{
  open: boolean
  conversations: AiConversation[]
  activeId: string | null
}>()

const emit = defineEmits<{
  close: []
  select: [id: string]
  create: []
  delete: [id: string]
}>()

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86_400_000) return '今天'
  if (diff < 172_800_000) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="drawer-mask" @click="emit('close')" />
    <aside v-if="open" class="drawer" aria-label="对话历史">
      <header class="drawer-head">
        <h2>对话历史</h2>
        <button type="button" class="new-btn" @click="emit('create')">新对话</button>
      </header>

      <div v-if="conversations.length === 0" class="empty">暂无历史对话</div>

      <ul v-else class="list">
        <li v-for="item in conversations" :key="item.id">
          <button
            type="button"
            class="item"
            :class="{ active: item.id === activeId }"
            @click="emit('select', item.id)"
          >
            <span class="title">{{ item.title }}</span>
            <span class="meta">{{ formatWhen(item.updatedAt) }}</span>
          </button>
          <button
            type="button"
            class="delete-btn"
            aria-label="删除对话"
            @click.stop="emit('delete', item.id)"
          >
            ×
          </button>
        </li>
      </ul>
    </aside>
  </Teleport>
</template>

<style scoped>
.drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 85;
  background: #0c121018;
  backdrop-filter: blur(2px);
}

.drawer {
  position: fixed;
  top: calc(0.75rem + var(--safe-top));
  left: max(0.75rem, calc((100vw - var(--app-max)) / 2 + 0.75rem));
  z-index: 86;
  width: min(16rem, calc(100vw - 1.5rem));
  max-height: min(70vh, calc(var(--app-height) * 0.7));
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 10px 30px #2c241614;
  overflow: hidden;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.85rem 0.55rem;
  border-bottom: 1px solid var(--line);
}

.drawer-head h2 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
}

.new-btn {
  border: none;
  border-radius: 8px;
  padding: 0.3rem 0.55rem;
  background: var(--accent-soft);
  color: var(--brand-deep);
  font-size: 0.78rem;
  cursor: pointer;
}

.empty {
  padding: 1.5rem 0.85rem;
  text-align: center;
  color: var(--muted);
  font-size: 0.82rem;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0.35rem;
  overflow-y: auto;
}

.list li {
  display: flex;
  align-items: stretch;
  gap: 0.15rem;
}

.item {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 0.15rem;
  padding: 0.62rem 0.65rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.item.active {
  background: var(--accent-soft);
}

.title {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  font-size: 0.68rem;
  color: var(--muted);
}

.delete-btn {
  align-self: center;
  width: 1.8rem;
  height: 1.8rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--muted-2);
  font-size: 1.1rem;
  cursor: pointer;
}

.delete-btn:hover {
  background: var(--cream);
  color: var(--expense);
}
</style>
