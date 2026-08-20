import type { Book } from '@/models'
import { bookRepository, settingsRepository } from '@/repositories'

class BookService {
  async list(): Promise<Book[]> {
    return bookRepository.list()
  }

  async create(name: string, note?: string): Promise<Book> {
    return bookRepository.create({ name: name.trim(), note: note?.trim() })
  }

  async update(id: string, patch: Partial<Pick<Book, 'name' | 'note'>>): Promise<Book> {
    return bookRepository.update(id, patch)
  }

  async delete(id: string): Promise<void> {
    const currentId = await settingsRepository.getCurrentBookId()
    await bookRepository.delete(id)
    if (currentId === id) {
      const fallback = await bookRepository.getDefault()
      if (fallback) await settingsRepository.setCurrentBookId(fallback.id)
    }
  }

  async setCurrent(bookId: string): Promise<void> {
    const book = await bookRepository.getById(bookId)
    if (!book) throw new Error('账本不存在')
    await settingsRepository.setCurrentBookId(bookId)
  }
}

export const bookService = new BookService()
