<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="empty">
    <div class="illus" aria-hidden="true">◎</div>
    <h3 v-if="title">{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--muted);
}

.illus {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--cream);
  color: var(--brand);
  font-size: 1.4rem;
  margin-bottom: 0.65rem;
}

h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ink);
}

p {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
}
</style>
