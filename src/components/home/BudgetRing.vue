<script setup lang="ts">
defineProps<{
  pct: number
  over?: boolean
  label?: string
}>()
</script>

<template>
  <div class="budget">
    <div class="ring ring-animate" :style="{ '--pct': String(Math.min(100, Math.max(0, pct))) }">
      <div class="ring-inner">
        <div class="pct">{{ Math.round(pct) }}%</div>
        <div class="status">{{ over ? '超支' : '已用' }}</div>
      </div>
    </div>
    <p v-if="label" class="label">{{ label }}</p>
  </div>
</template>

<style scoped>
.budget {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.ring {
  --pct: 0;
  width: 4.4rem;
  height: 4.4rem;
  border-radius: 999px;
  background: conic-gradient(var(--brand) calc(var(--pct) * 1%), var(--line) 0);
  display: grid;
  place-items: center;
}

.ring-inner {
  width: 3.35rem;
  height: 3.35rem;
  border-radius: 999px;
  background: var(--panel);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pct {
  font-family: Fraunces, Georgia, serif;
  font-size: 0.95rem;
  line-height: 1.1;
}

.status {
  font-size: 0.68rem;
  color: var(--muted);
}

.label {
  margin: 0;
  font-size: 0.72rem;
  color: var(--muted);
  text-align: center;
}
</style>
