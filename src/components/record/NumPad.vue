<script setup lang="ts">
const emit = defineEmits<{
  input: [key: string]
  delete: []
}>()

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const

function onKey(key: string) {
  if (key === 'del') {
    emit('delete')
    return
  }
  emit('input', key)
}
</script>

<template>
  <div class="numpad" role="group" aria-label="数字键盘">
    <button
      v-for="key in keys"
      :key="key"
      type="button"
      class="key"
      :class="{ wide: key === 'del' }"
      @click="onKey(key)"
    >
      <template v-if="key === 'del'">⌫</template>
      <template v-else>{{ key }}</template>
    </button>
  </div>
</template>

<style scoped>
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.45rem;
  padding-top: 0.35rem;
}

.key {
  min-height: 2.65rem;
  border: none;
  border-radius: 12px;
  background: var(--cream);
  color: var(--ink);
  font-size: 1.15rem;
  font-weight: 500;
  cursor: pointer;
}

.key:active {
  background: var(--cream-deep);
  transform: scale(0.97);
}
</style>
