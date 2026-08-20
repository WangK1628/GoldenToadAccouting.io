<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'

const route = useRoute()
const useShell = computed(() => route.meta.layout !== 'blank')
</script>

<template>
  <AppShell v-if="useShell" />
  <RouterView v-else />
</template>
