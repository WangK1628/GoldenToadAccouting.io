<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth.store'
import { aiService } from '@/services/ai.service'
import { AI_TRIAL_MAX_MESSAGES } from '@/models'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const aiPoints = ref(0)
const trialRemaining = ref(0)

const sessionLabel = computed(() => {
  if (!authStore.session) return '未登录'
  if (authStore.session.mode === 'guest') return '游客模式'
  if (authStore.session.mode === 'admin') return '管理员'
  return authStore.session.displayName || authStore.session.email || '已登录'
})

const avatarInitial = computed(() => {
  const s = authStore.session
  if (!s) return '?'
  const name = s.displayName || s.email || '?'
  return name.charAt(0).toUpperCase()
})

const emailLabel = computed(() => authStore.session?.email ?? '—')

onMounted(async () => {
  aiPoints.value = await aiService.getAiPoints()
  trialRemaining.value = await aiService.getTrialRemaining()
})

async function logout() {
  await authStore.logout()
  toast.success('已退出登录')
  await router.replace('/login')
}
</script>

<template>
  <div class="profile-page">
    <PageHeader title="个人中心" />

    <section class="hero">
      <div class="avatar">{{ avatarInitial }}</div>
      <h2>{{ sessionLabel }}</h2>
      <p v-if="authStore.session?.email" class="email">{{ emailLabel }}</p>
      <p v-if="trialRemaining > 0" class="points">
        AI 免费体验还可提问 {{ trialRemaining }} / {{ AI_TRIAL_MAX_MESSAGES }} 次
      </p>
    </section>

    <section class="card">
      <button type="button" class="row" @click="router.push('/settings')">
        <span>设置</span>
        <span class="chev">›</span>
      </button>
      <button type="button" class="row" @click="router.push('/chat')">
        <span>AI 小助手</span>
        <span class="chev">›</span>
      </button>
      <button type="button" class="row" @click="router.push('/about')">
        <span>关于</span>
        <span class="chev">›</span>
      </button>
    </section>

    <button v-if="authStore.session" type="button" class="logout" @click="logout">退出登录</button>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1.1rem;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.2rem;
  height: 4.2rem;
  border-radius: 999px;
  background: var(--hero);
  color: var(--brand-deep);
  font-size: 1.65rem;
  font-weight: 700;
}

.hero h2 {
  margin: 0.65rem 0 0;
  font-size: 1.15rem;
  color: var(--brand-deep);
}

.email {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: var(--muted);
}

.points {
  margin: 0.55rem 0 0;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: rgba(201, 162, 39, 0.14);
  color: var(--brand-deep);
  font-size: 0.76rem;
}

.card {
  border-radius: 16px;
  background: #fff;
  border: 1px solid var(--line);
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.85rem 1rem;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 0.92rem;
  cursor: pointer;
  text-align: left;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.chev {
  color: var(--muted);
}

.logout {
  display: block;
  width: 100%;
  margin-top: 1.25rem;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  color: #c0392b;
  font-size: 0.9rem;
  cursor: pointer;
}
</style>
