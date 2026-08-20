<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import { APP, AUTHOR } from '@/constants/author'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import Mascot from '@/components/common/Mascot.vue'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const sessionLabel = computed(() => {
  if (!authStore.session) return '未登录'
  if (authStore.session.mode === 'guest') return '游客模式'
  if (authStore.session.mode === 'admin') return '管理员'
  return authStore.session.email ?? authStore.session.displayName
})

async function logout() {
  await authStore.logout()
  toast.success('已退出登录')
  await router.replace('/login')
}
</script>

<template>
  <div class="about-page">
    <PageHeader title="关于" />

    <section class="hero">
      <Mascot :size="84" />
      <h2>{{ APP.name }}</h2>
      <p class="en">{{ APP.nameEn }}</p>
      <p class="slogan">{{ APP.slogan }}</p>
      <p class="version">v{{ APP.version }}</p>
    </section>

    <section class="card">
      <h3>产品简介</h3>
      <p>
        本地优先的个人记账应用，视觉与交互参考
        <a href="https://miaowa.sugarat.top/docs/" target="_blank" rel="noopener">妙蛙记账</a>。
        数据保存在 IndexedDB，AI 使用自配 DeepSeek / OpenAI Compatible API。
      </p>
    </section>

    <section class="card">
      <h3>作者</h3>
      <p>
        <a :href="AUTHOR.github" target="_blank" rel="noopener">@{{ AUTHOR.name }}</a>
      </p>
      <p class="muted">GitHub 开源 · 独立实现，不依赖妙蛙服务端</p>
    </section>

    <section class="card">
      <h3>当前账号</h3>
      <p>{{ sessionLabel }}</p>
      <button v-if="authStore.session" type="button" class="btn" @click="logout">退出登录</button>
    </section>

    <section class="links">
      <button type="button" @click="router.push('/release')">下载与发布</button>
      <a :href="AUTHOR.docs" target="_blank" rel="noopener">使用文档</a>
      <a :href="AUTHOR.repo" target="_blank" rel="noopener">GitHub 仓库</a>
    </section>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
  margin-bottom: 1rem;
}

.hero :deep(.mascot) {
  margin: 0 auto;
}

.hero h2 {
  margin: 0.65rem 0 0;
  color: var(--brand-deep);
}

.en {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: var(--muted-2);
}

.slogan {
  margin: 0.35rem 0 0;
  font-size: 0.88rem;
  color: var(--muted);
}

.version {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: var(--muted-2);
}

.card {
  margin-bottom: 0.75rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: var(--panel);
  border: none;
  box-shadow: var(--shadow);
}

.card h3 {
  margin: 0 0 0.4rem;
  font-size: 0.92rem;
}

.card p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.55;
}

.card a {
  color: var(--brand);
}

.muted {
  margin-top: 0.35rem !important;
  font-size: 0.72rem !important;
  color: var(--muted-2) !important;
}

.btn {
  margin-top: 0.55rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.45rem 0.75rem;
  background: var(--cream);
  color: var(--ink);
  font-size: 0.82rem;
  cursor: pointer;
}

.links {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.links button,
.links a {
  display: block;
  padding: 0.75rem;
  border-radius: 12px;
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--brand);
  text-align: center;
  text-decoration: none;
  font-size: 0.88rem;
  cursor: pointer;
}
</style>
