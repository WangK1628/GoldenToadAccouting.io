<script setup lang="ts">
defineProps<{
  active: boolean
  listening: boolean
  canceling: boolean
  text: string
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="active" class="voice-overlay" role="status" aria-live="polite">
      <div class="panel" :class="{ canceling }">
        <div class="waves" aria-hidden="true">
          <span v-for="i in 5" :key="i" :style="{ animationDelay: `${i * 0.08}s` }" />
        </div>
        <p class="hint">{{ canceling ? '松开取消' : listening ? '正在聆听…' : '准备中…' }}</p>
        <p v-if="text" class="transcript">{{ text }}</p>
        <p v-else class="transcript placeholder">松开结束，上滑取消</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.voice-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: end center;
  padding-bottom: calc(6.5rem + var(--safe-bottom));
  pointer-events: none;
  background: linear-gradient(180deg, transparent 40%, #0c121018 100%);
}

.panel {
  width: min(calc(100% - 2rem), calc(var(--app-max) - 2rem));
  padding: 1rem 1.1rem;
  border-radius: 18px;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 12px 40px #2c241620;
  text-align: center;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease;
}

.panel.canceling {
  border-color: var(--expense);
  transform: translateY(-12px) scale(0.98);
}

.waves {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.28rem;
  height: 2rem;
  margin-bottom: 0.55rem;
}

.waves span {
  width: 4px;
  height: 1.4rem;
  border-radius: 99px;
  background: var(--brand);
  transform-origin: bottom;
  animation: voice-pulse 0.9s ease-in-out infinite;
}

.hint {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
}

.transcript {
  margin: 0.45rem 0 0;
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--muted);
  min-height: 1.4rem;
}

.transcript.placeholder {
  font-size: 0.78rem;
  color: var(--muted-2);
}
</style>
