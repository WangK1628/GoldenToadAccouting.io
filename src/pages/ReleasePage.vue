<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { APP, AUTHOR } from '@/constants/author'
import Mascot from '@/components/common/Mascot.vue'
import { useToast } from '@/composables/useToast'
import {
  downloadAndInstallApk,
  fetchLatestRelease,
  type LatestRelease,
} from '@/services/update.service'

const toast = useToast()
const loading = ref(false)
const latest = ref<LatestRelease | null>(null)

onMounted(async () => {
  try {
    latest.value = await fetchLatestRelease()
  } catch {
    latest.value = null
  }
})

async function updateNow() {
  if (loading.value) return
  loading.value = true
  try {
    const info = latest.value ?? (await fetchLatestRelease())
    latest.value = info
    toast.success(info.newer ? `正在下载 ${info.tag}` : '正在获取最新安装包')
    await downloadAndInstallApk(info.apkUrl)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '更新失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="release-page">
    <PageHeader title="下载与发布" />

    <section class="hero">
      <Mascot :size="76" />
      <h2>{{ APP.name }}</h2>
      <p class="version">v{{ APP.version }}</p>
      <p class="desc">{{ APP.slogan }}</p>
    </section>

    <section class="card">
      <h3>Android 安装包</h3>
      <p>基于 Capacitor 打包，体积轻量，离线可用。</p>
      <p v-if="latest" class="status">
        当前 v{{ APP.version }} · 最新 {{ latest.tag }}
        {{ latest.newer ? ' · 有新版本' : ' · 已是最新' }}
      </p>
      <button type="button" class="download" :disabled="loading" @click="updateNow">
        {{ loading ? '下载中…' : '检查更新并安装' }}
      </button>
      <p class="note">手机上会下载 APK 并打开系统安装界面。网页版会开始下载文件。</p>
    </section>

    <section class="card">
      <h3>网页版</h3>
      <p>支持 PWA，可安装到主屏幕，数据保存在浏览器本地。</p>
      <a class="link" :href="AUTHOR.website" target="_blank" rel="noopener">打开网页版</a>
    </section>

    <section class="card">
      <h3>更新说明</h3>
      <ul>
        <li>本地登录 / 游客模式</li>
        <li>AI 语音记账 · Tool Calling</li>
        <li>统计、预算、导入导出</li>
        <li>深色模式 · PWA 离线</li>
      </ul>
    </section>

    <section class="card muted">
      <h3>开源仓库</h3>
      <a :href="AUTHOR.repo" target="_blank" rel="noopener">{{ AUTHOR.repo }}</a>
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
  margin: 0.55rem 0 0;
  color: var(--brand-deep);
}

.version {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: var(--muted);
}

.desc {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: var(--muted);
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
  margin: 0 0 0.35rem;
  font-size: 0.92rem;
}

.card p,
.card li {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.5;
}

.card ul {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
}

.download {
  display: inline-block;
  margin-top: 0.65rem;
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.download:disabled {
  opacity: 0.65;
}

.status {
  margin-top: 0.45rem !important;
}

.link {
  display: inline-block;
  margin-top: 0.55rem;
  color: var(--brand);
  font-size: 0.85rem;
}

.note {
  margin-top: 0.45rem !important;
  font-size: 0.72rem !important;
  color: var(--muted-2) !important;
}

.muted a {
  color: var(--brand);
  font-size: 0.82rem;
  word-break: break-all;
}
</style>
