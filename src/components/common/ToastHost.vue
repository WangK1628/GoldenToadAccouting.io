<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { queue } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-root" aria-live="polite">
      <div
        v-for="item in queue"
        :key="item.id"
        class="toast"
        :class="item.type"
      >
        {{ item.message }}
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-root {
  position: fixed;
  top: calc(0.75rem + var(--safe-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  width: min(calc(100% - 1.5rem), calc(var(--app-max) - 1.5rem));
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  pointer-events: none;
}

.toast {
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  font-size: 0.88rem;
  text-align: center;
  box-shadow: 0 8px 24px #2c241620;
}

.toast.info {
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--ink);
}

.toast.success {
  background: var(--accent-soft);
  border: 1px solid var(--brand);
  color: var(--brand-deep);
}

.toast.error {
  background: #fde8e8;
  border: 1px solid #e8b4b4;
  color: #8b2e2e;
}
</style>
