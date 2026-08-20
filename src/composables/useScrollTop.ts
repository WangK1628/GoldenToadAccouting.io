import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export function useScrollTop(containerRef: Ref<HTMLElement | null>, threshold = 240) {
  const visible = ref(false)

  const onScroll = () => {
    const el = containerRef.value
    visible.value = Boolean(el && el.scrollTop > threshold)
  }

  const scrollToTop = () => {
    containerRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  onMounted(() => {
    containerRef.value?.addEventListener('scroll', onScroll, { passive: true })
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', onScroll)
  })

  return { visible, scrollToTop, onScroll }
}
