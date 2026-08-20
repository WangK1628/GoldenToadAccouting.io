<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    zIndex?: number
  }>(),
  {
    title: '',
    zIndex: 90,
  },
)

const emit = defineEmits<{
  close: []
}>()

let pushed = false

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open && !pushed) {
      history.pushState({ __sheet: true }, '')
      pushed = true
    }
    if (!open && pushed) {
      pushed = false
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('popstate', () => {
    if (props.open) emit('close')
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-mask">
      <div
        v-if="open"
        class="sheet-root"
        :style="{ zIndex }"
        role="dialog"
        aria-modal="true"
        :aria-label="title || '面板'"
      >
        <button type="button" class="mask" aria-label="关闭" @click="emit('close')" />
        <Transition name="sheet-panel" appear>
          <div v-if="open" class="sheet panel">
            <header v-if="title" class="sheet-head">
              <h2>{{ title }}</h2>
              <button type="button" class="close" aria-label="关闭" @click="emit('close')">×</button>
            </header>
            <div class="sheet-body">
              <slot />
            </div>
            <footer v-if="$slots.footer" class="sheet-foot">
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.mask {
  position: absolute;
  inset: 0;
  border: none;
  background: #0c121024;
  backdrop-filter: blur(2px);
  cursor: pointer;
}

.sheet {
  position: relative;
  width: min(100%, var(--app-max));
  margin: 0 auto;
  max-height: min(92vh, calc(var(--app-height) * 0.92));
  border-radius: var(--sheet-radius) var(--sheet-radius) 0 0;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 -8px 32px #2c241614;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem 0.5rem;
}

.sheet-head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.close {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
}

.sheet-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 1rem 1rem;
  -webkit-overflow-scrolling: touch;
}

.sheet-foot {
  padding: 0.65rem 1rem calc(0.65rem + var(--safe-bottom));
  border-top: 1px solid var(--line);
  background: var(--panel);
}
</style>
