<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ActionBar from '@/components/layout/ActionBar.vue'
import RecordSheet from '@/components/record/RecordSheet.vue'
import ToastHost from '@/components/common/ToastHost.vue'
import { useSafeArea, useAppHeight } from '@/composables/useSafeArea'
import { useOnlineStatus } from '@/composables/useOnlineStatus'
import { usePwaUpdate } from '@/composables/usePwaUpdate'
import { useToast } from '@/composables/useToast'
import { useUiStore } from '@/stores/ui.store'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const toast = useToast()
const { online } = useOnlineStatus()

const pwaUpdateVisible = ref(false)
const { applyUpdate } = usePwaUpdate(() => {
  pwaUpdateVisible.value = true
})

useSafeArea()
useAppHeight()

const showActionBar = computed(() => Boolean(route.meta.actionBar))
const actionBarVariant = computed(() =>
  route.meta.actionBarVariant === 'chat' ? 'chat' : 'home',
)

function onSend(text: string) {
  if (route.name === 'home') {
    router.push({ path: '/chat', query: { q: text } })
  }
}

function onRecord() {
  uiStore.openCreateRecord()
}

async function applyPwaUpdate() {
  pwaUpdateVisible.value = false
  toast.success('正在刷新应用…')
  await applyUpdate()
}
</script>

<template>
  <div class="app-shell">
    <Transition name="fade-slide">
      <div v-if="!online" class="offline-banner" role="status">离线模式 · 数据保存在本地</div>
    </Transition>

    <Transition name="fade-slide">
      <div v-if="pwaUpdateVisible" class="pwa-banner">
        <span>发现新版本</span>
        <button type="button" @click="applyPwaUpdate">刷新</button>
      </div>
    </Transition>

    <main
      class="page-view"
      :class="{ 'with-action-bar': showActionBar && actionBarVariant === 'home' }"
    >
      <RouterView v-slot="{ Component, route: r }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="r.path" />
        </Transition>
      </RouterView>
    </main>

    <ActionBar
      v-if="showActionBar && actionBarVariant === 'home'"
      @send="onSend"
      @record="onRecord"
    />

    <RecordSheet />
    <ToastHost />
  </div>
</template>

<style scoped>
.app-shell {
  top: var(--vv-offset-top, 0px);
}

.offline-banner,
.pwa-banner {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  padding: 0.45rem 0.75rem;
  font-size: 0.78rem;
}

.offline-banner {
  background: #f6ecc8;
  color: var(--brand-deep);
  border-bottom: none;
}

.pwa-banner {
  background: var(--accent-soft);
  color: var(--brand-deep);
  border-bottom: 1px solid var(--line);
}

.pwa-banner button {
  border: none;
  border-radius: 8px;
  padding: 0.25rem 0.55rem;
  background: var(--brand);
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
}
</style>
