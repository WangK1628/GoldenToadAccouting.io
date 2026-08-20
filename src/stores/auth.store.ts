import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authService } from '@/services/auth.service'
import type { AuthSession } from '@/models'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(null)
  const ready = ref(false)

  async function load() {
    session.value = await authService.getSession()
    ready.value = true
  }

  async function enterGuest() {
    session.value = await authService.enterGuestMode()
  }

  async function register(email: string, password: string, code: string) {
    session.value = await authService.register(email, password, code)
  }

  async function loginPassword(email: string, password: string) {
    session.value = await authService.loginWithPassword(email, password)
  }

  async function loginCode(email: string, code: string) {
    session.value = await authService.loginWithCode(email, code)
  }

  async function logout() {
    await authService.logout()
    session.value = null
  }

  function isAuthenticated() {
    return Boolean(session.value)
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
  }
})
