import { onMounted, onUnmounted } from 'vue'

function readSafeArea(): { top: number; bottom: number } {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
  document.body.appendChild(probe)
  const styles = getComputedStyle(probe)
  const top = Number.parseFloat(styles.paddingTop) || 0
  const bottom = Number.parseFloat(styles.paddingBottom) || 0
  document.body.removeChild(probe)
  return { top, bottom }
}

export function useSafeArea(): void {
  const apply = () => {
    const { top, bottom } = readSafeArea()
    document.documentElement.style.setProperty('--safe-top', `${top}px`)
    document.documentElement.style.setProperty(
      '--safe-bottom',
      `${Math.max(bottom, 16)}px`,
    )
  }

  onMounted(() => {
    apply()
    window.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('resize', apply)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', apply)
    window.visualViewport?.removeEventListener('resize', apply)
  })
}

export function useAppHeight(): void {
  const apply = () => {
    const h = window.visualViewport?.height ?? window.innerHeight
    document.documentElement.style.setProperty('--app-height', `${h}px`)
    const offset = window.visualViewport?.offsetTop ?? 0
    document.documentElement.style.setProperty('--vv-offset-top', `${offset}px`)
  }

  onMounted(() => {
    apply()
    window.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('scroll', apply)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', apply)
    window.visualViewport?.removeEventListener('resize', apply)
    window.visualViewport?.removeEventListener('scroll', apply)
  })
}
