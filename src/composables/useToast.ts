import { ref } from 'vue'

interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'error'
}

const queue = ref<ToastItem[]>([])
let nextId = 0

export function useToast() {
  function show(message: string, type: ToastItem['type'] = 'info', duration = 2200) {
    const id = nextId++
    queue.value.push({ id, message, type })
    window.setTimeout(() => {
      queue.value = queue.value.filter((t) => t.id !== id)
    }, duration)
  }

  function success(message: string) {
    show(message, 'success')
  }

  function error(message: string) {
    show(message, 'error', 2800)
  }

  return { queue, show, success, error }
}
