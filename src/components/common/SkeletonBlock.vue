<script setup lang="ts">
defineProps<{
  width?: string
  height?: string
  radius?: string
}>()
</script>

<template>
  <div
    class="skeleton"
    :style="{
      width: width ?? '100%',
      height: height ?? '1rem',
      borderRadius: radius ?? '8px',
    }"
    aria-hidden="true"
  />
</template>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, var(--cream) 25%, var(--cream-deep) 37%, var(--cream) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.2s ease infinite;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: 0 0;
  }
}
</style>
