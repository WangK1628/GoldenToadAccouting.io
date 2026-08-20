import { Capacitor } from '@capacitor/core'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGuideStore } from '@/stores/guide.store'
import { useUiStore } from '@/stores/ui.store'

export function useAndroidBack() {
  const router = useRouter()
  const uiStore = useUiStore()
  const guideStore = useGuideStore()

  let listener: { remove: () => Promise<void> } | null = null

  onMounted(() => {
    if (!Capacitor.isNativePlatform()) return

    void (async () => {
      try {
        const { App } = await import('@capacitor/app')
        listener = await App.addListener('backButton', () => {
          if (uiStore.cleanVideoOpen) {
            uiStore.closeCleanVideo()
            return
          }
          if (uiStore.recordSheetOpen) {
            uiStore.closeRecordSheet()
            return
          }
          if (guideStore.active) {
            guideStore.retreat()
            return
          }

          const route = router.currentRoute.value
          if (route.path !== '/' && route.path !== '/login') {
            router.back()
            return
          }
          if (route.path === '/login') {
            router.replace('/')
            return
          }

          void App.minimizeApp()
        })
      } catch (error) {
        console.warn('[android-back] listener unavailable', error)
      }
    })()
  })

  onUnmounted(() => {
    void listener?.remove()
  })
}
