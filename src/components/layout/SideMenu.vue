<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

const items = [
  { label: '设置', to: '/settings' },
  { label: '预算', to: '/budget' },
  { label: '切换账本', to: '/ledgers' },
  { label: '分类管理', to: '/categories' },
  { label: '标签管理', to: '/tags' },
  { label: '对话', to: '/chat' },
]

function navigate(path: string) {
  emit('close')
  router.push(path)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="menu-mask" @click="emit('close')" />
    <nav v-if="open" class="side-menu" aria-label="快捷菜单">
      <button
        v-for="item in items"
        :key="item.to"
        type="button"
        @click="navigate(item.to)"
      >
        {{ item.label }}
      </button>
    </nav>
  </Teleport>
</template>

<style scoped>
.menu-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: #0c121008;
  backdrop-filter: blur(2px);
}

.side-menu {
  position: fixed;
  top: calc(0.75rem + var(--safe-top));
  left: max(0.75rem, calc((100vw - var(--app-max)) / 2 + 0.75rem));
  z-index: 81;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 8.5rem;
  padding: 0.52rem;
  border-radius: 18px;
  background: var(--panel);
  border: none;
  box-shadow: var(--shadow);
}

.side-menu button {
  padding: 0.62rem 0.85rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
  text-align: left;
  font-size: 0.92rem;
  cursor: pointer;
}

.side-menu button:active {
  background: var(--cream-deep);
}
</style>
