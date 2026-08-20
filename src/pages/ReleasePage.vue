<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { APP, AUTHOR } from '@/constants/author'

const releaseUrl = computed(
  () => `${AUTHOR.repo}/releases/latest/download/golden-toad-accounting.apk`,
)
</script>

<template>
  <div class="release-page">
    <PageHeader title="下载与发布" />

    <section class="hero">
      <img src="/favicon.svg" alt="" width="64" height="64" class="logo" />
      <h2>{{ APP.name }}</h2>
      <p class="version">v{{ APP.version }}</p>
      <p class="desc">{{ APP.slogan }}</p>
    </section>

    <section class="card">
      <h3>Android 安装包</h3>
      <p>基于 Capacitor 打包，体积轻量，离线可用。</p>
      <a class="download" :href="releaseUrl" target="_blank" rel="noopener">下载 APK</a>
      <p class="note">首次安装需在系统设置中允许「未知来源」。</p>
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

.logo {
  border-radius: 16px;
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
  padding: 0.9rem;
  border-radius: 14px;
  background: var(--panel);
  border: 1px solid var(--line);
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
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
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
