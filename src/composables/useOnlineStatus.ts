import { onMounted, onUnmounted, ref } from 'vue'

export function useOnlineStatus() {
  const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

  function update() {
    online.value = navigator.onLine
  }

  onMounted(() => {
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
  })

  onUnmounted(() => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  })

  return { online }
}
