<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  title: string
}>()

const router = useRouter()

function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.replace('/')
}
</script>

<template>
  <header class="page-nav">
    <div class="left">
      <button type="button" class="back" aria-label="返回" @click="goBack">‹</button>
      <slot name="left" />
    </div>
    <h1>{{ title }}</h1>
    <div class="right">
      <slot name="right" />
    </div>
  </header>
</template>

<style scoped>
.page-nav {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
  margin: -0.15rem 0 0.85rem;
  min-height: 2.4rem;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.right {
  justify-content: flex-end;
}

h1 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

.back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--ink);
  font-size: 1.55rem;
  line-height: 1;
  cursor: pointer;
}

.back:active {
  background: var(--cream-deep);
}
</style>
