<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useThemeStore } from '@/stores/theme.store'
import { useAuthStore } from '@/stores/auth.store'
import type { ThemeMode } from '@/models'

interface SettingsItem {
  label: string
  desc?: string
  to?: string
  disabled?: boolean
}

interface SettingsSection {
  title: string
  items: SettingsItem[]
}

const router = useRouter()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const accountDesc = computed(() => {
  if (!authStore.session) return '未登录'
  if (authStore.session.mode === 'guest') return '游客 · 本地数据'
  return authStore.session.email ?? '已登录'
})

const sections = computed<SettingsSection[]>(() => [
  {
    title: '账号',
    items: [
      { label: '登录 / 注册', desc: accountDesc.value, to: '/login' },
      { label: '下载与发布', to: '/release' },
    ],
  },
  {
    title: 'AI',
    items: [{ label: 'AI 设置', desc: 'DeepSeek / API Key', to: '/settings/ai' }],
  },
  {
    title: '账本',
    items: [
      { label: '账本管理', to: '/ledgers' },
      { label: '分类管理', to: '/categories' },
      { label: '标签管理', to: '/tags' },
      { label: '预算', to: '/budget' },
    ],
  },
  {
    title: '数据',
    items: [
      { label: '导入 / 导出', desc: 'JSON · CSV · Excel', to: '/settings/data' },
      { label: '清空数据', desc: '二次确认', to: '/settings/data' },
    ],
  },
  {
    title: '外观',
    items: [],
  },
  {
    title: '其他',
    items: [{ label: '关于', to: '/about' }],
  },
])

const themeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]

function navigate(path?: string) {
  if (path) router.push(path)
}
</script>

<template>
  <div class="settings-page">
    <PageHeader title="设置" />

    <section v-for="section in sections" :key="section.title" class="group">
      <h2>{{ section.title }}</h2>

      <div v-if="section.title === '外观'" class="theme-row">
        <button
          v-for="opt in themeOptions"
          :key="opt.value"
          type="button"
          class="theme-chip"
          :class="{ active: themeStore.mode === opt.value }"
          @click="themeStore.setMode(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <button
        v-for="item in section.items"
        :key="item.label"
        type="button"
        class="row"
        :disabled="item.disabled"
        @click="navigate(item.to)"
      >
        <span class="label">{{ item.label }}</span>
        <span class="desc">{{ item.desc ?? '›' }}</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.group {
  margin-bottom: 1rem;
}

.group h2 {
  margin: 0 0 0.45rem;
  font-size: 0.78rem;
  color: var(--muted);
  font-weight: 600;
}

.row,
.theme-chip {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.82rem 0.85rem;
  border: none;
  border-radius: 18px;
  background: var(--panel);
  box-shadow: var(--shadow);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.row + .row {
  margin-top: 0.35rem;
}

.row:disabled {
  opacity: 0.55;
  cursor: default;
}

.row .label {
  font-size: 0.92rem;
}

.row .desc {
  font-size: 0.78rem;
  color: var(--muted);
}

.theme-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}

.theme-chip {
  justify-content: center;
  font-size: 0.85rem;
}

.theme-chip.active {
  background: var(--accent-soft);
  border-color: var(--brand);
  color: var(--brand-deep);
  font-weight: 600;
}
</style>
