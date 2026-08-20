import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ThemeMode } from '@/models'
import { settingsRepository } from '@/repositories'

const LIGHT_THEME_COLOR = '#C9A227'
const DARK_THEME_COLOR = '#1A1712'
const LIGHT_BOOT_BG = '#fbf8f0'
const DARK_BOOT_BG = '#1a1712'

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function updateMetaTheme(isDark: boolean): void {
  const themeColor = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', themeColor)

  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  document.body.style.background = isDark ? DARK_BOOT_BG : LIGHT_BOOT_BG

  const boot = document.getElementById('app-boot')
  if (boot) {
    boot.style.background = isDark
      ? 'linear-gradient(180deg, #252018 0%, #1a1712 48%, #14110d 100%)'
      : ''
  }
}

function applyTheme(mode: ThemeMode): void {
  const isDark = resolveIsDark(mode)
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
  updateMetaTheme(isDark)
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system')
  const ready = ref(false)

  async function load(): Promise<void> {
    mode.value = await settingsRepository.getTheme()
    applyTheme(mode.value)
    ready.value = true
  }

  async function setMode(next: ThemeMode): Promise<void> {
    mode.value = next
    applyTheme(next)
    await settingsRepository.setTheme(next)
  }

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (mode.value === 'system') applyTheme('system')
    })
    watch(mode, (v) => applyTheme(v))
  }

  return { mode, ready, load, setMode }
})
