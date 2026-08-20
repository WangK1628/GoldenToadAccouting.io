import { onMounted, ref } from 'vue'

export function usePwaUpdate(onUpdate: () => void) {
  const needRefresh = ref(false)
  let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined

  onMounted(async () => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

    const { registerSW } = await import('virtual:pwa-register')
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        needRefresh.value = true
        onUpdate()
      },
    })
  })

  async function applyUpdate() {
    if (updateSW) {
      await updateSW(true)
    }
    needRefresh.value = false
  }

  return { needRefresh, applyUpdate }
}
