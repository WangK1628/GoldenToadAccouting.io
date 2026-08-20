import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Book } from '@/models'
import { appService } from '@/services'
import { useUiStore } from '@/stores/ui.store'

export const useAppStore = defineStore('app', () => {
  const ready = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentBook = ref<Book | null>(null)
  const books = ref<Book[]>([])

  const currentBookName = computed(() => currentBook.value?.name ?? '账本')

  async function initialize(): Promise<void> {
    if (ready.value) return
    loading.value = true
    error.value = null
    try {
      await appService.initialize()
      books.value = await appService.listBooks()
      currentBook.value = await appService.getCurrentBook()
      ready.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '初始化失败'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function switchBook(bookId: string): Promise<void> {
    await appService.setCurrentBook(bookId)
    currentBook.value = await appService.getCurrentBook()
    useUiStore().bumpData()
  }

  async function refreshBooks(): Promise<void> {
    books.value = await appService.listBooks()
    currentBook.value = await appService.getCurrentBook()
  }

  return {
    ready,
    loading,
    error,
    currentBook,
    books,
    currentBookName,
    initialize,
    switchBook,
    refreshBooks,
  }
})
