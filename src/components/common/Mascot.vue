<script setup lang="ts">
defineProps<{
  src?: string
  alt?: string
  size?: number
  rounded?: boolean
}>()
</script>

<template>
  <img
    class="mascot"
    :class="{ round: rounded }"
    :src="src ?? '/brand/cicada.png'"
    :alt="alt ?? ''"
    :width="size ?? 72"
    :height="size ?? 72"
  />
</template>

<style scoped>
.mascot {
  display: block;
  object-fit: cover;
  background: #fff9eb;
  border-radius: 22%;
}

.round {
  border-radius: 50%;
}
</style>
