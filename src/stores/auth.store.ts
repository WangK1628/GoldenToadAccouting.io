import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authService } from '@/services/auth.service'
import { appService } from '@/services/app.service'
import { useUiStore } from '@/stores/ui.store'
import type { AuthSession } from '@/models'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(null)
  const ready = ref(false)

  async function afterPersonalLogin() {
    await appService.startPersonalWorkspace()
    useUiStore().bumpData()
  }

  async function load() {
    session.value = await authService.getSession()
    ready.value = true
  }

  async function enterGuest() {
    session.value = await authService.enterGuestMode()
  }

  async function register(email: string, password: string, code: string) {
    session.value = await authService.register(email, password, code)
    await afterPersonalLogin()
  }

  async function loginPassword(email: string, password: string) {
    session.value = await authService.loginWithPassword(email, password)
    await afterPersonalLogin()
  }

  async function loginCode(email: string, code: string) {
    session.value = await authService.loginWithCode(email, code)
    await afterPersonalLogin()
  }

  async function logout() {
    await authService.logout()
    session.value = null
  }

  function isAuthenticated() {
    return Boolean(session.value)
  }

  function canImportExport() {
    return session.value?.mode === 'registered' || session.value?.mode === 'admin'
  }

  return {
    session,
    ready,
    load,
    enterGuest,
    register,
    loginPassword,
    loginCode,
    logout,
    isAuthenticated,
    canImportExport,
  }
})
