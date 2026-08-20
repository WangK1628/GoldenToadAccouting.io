import type { Book } from '@/models'
import { BaseRepository } from '@/repositories/base.repository'
import { createId } from '@/utils/id'
import { nowIso } from '@/utils/time'

export class BookRepository extends BaseRepository {
  async list(): Promise<Book[]> {
    const db = await this.db()
    return db.books.orderBy('sort').toArray()
  }

  async getById(id: string): Promise<Book | undefined> {
    const db = await this.db()
    return db.books.get(id)
  }

  async getDefault(): Promise<Book | undefined> {
    const db = await this.db()
    return db.books.filter((b) => b.isDefault).first()
  }

  async create(input: Pick<Book, 'name' | 'note'> & { isDefault?: boolean }): Promise<Book> {
    const db = await this.db()
    const timestamp = nowIso()
    const sort = await db.books.count()
    const book: Book = {
      id: createId('book'),
      name: input.name,
      note: input.note,
      isDefault: input.isDefault ?? false,
      sort,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.books.add(book)
    return book
  }

  async update(id: string, patch: Partial<Pick<Book, 'name' | 'note' | 'sort'>>): Promise<Book> {
    const db = await this.db()
    const existing = await db.books.get(id)
    if (!existing) {
      throw new Error(`Book not found: ${id}`)
    }
    const updated: Book = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    }
    await db.books.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const db = await this.db()
    await db.books.delete(id)
  }
}

export const bookRepository = new BookRepository()
