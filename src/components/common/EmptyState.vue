<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="empty">
    <div class="illus" aria-hidden="true">
      <img src="/brand/cicada.png" alt="" width="56" height="56" />
    </div>
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
  width: 4.2rem;
  height: 4.2rem;
  display: grid;
  place-items: center;
  border-radius: 22px;
  background: #fff9eb;
  margin-bottom: 0.65rem;
  overflow: hidden;
}

.illus img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
