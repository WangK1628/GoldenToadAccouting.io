import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import '@/styles'
import { useThemeStore } from '@/stores/theme.store'
import { useAuthStore } from '@/stores/auth.store'

declare global {
  interface Window {
    hideAppBoot?: () => void
  }
}

async function bootstrap() {
  const bootTimeout = window.setTimeout(() => {
    window.hideAppBoot?.()
  }, 12000)

  try {
    const app = createApp(App)
    const pinia = createPinia()

    app.use(pinia)
    app.use(router)

    const themeStore = useThemeStore()
    const authStore = useAuthStore()
    await Promise.all([themeStore.load(), authStore.load()])

    app.mount('#app')
  } finally {
    window.clearTimeout(bootTimeout)
    window.hideAppBoot?.()
  }
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap app', error)
  window.hideAppBoot?.()
})
