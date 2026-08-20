import type { Category, TransactionType } from '@/models'
import { BaseRepository } from '@/repositories/base.repository'
import { createId } from '@/utils/id'
import { nowIso } from '@/utils/time'

export class CategoryRepository extends BaseRepository {
  async listByBook(bookId: string, type?: TransactionType): Promise<Category[]> {
    const db = await this.db()
    const rows = await db.categories.where('bookId').equals(bookId).sortBy('sort')
    return type ? rows.filter((c) => c.type === type) : rows
  }

  async getById(id: string): Promise<Category | undefined> {
    const db = await this.db()
    return db.categories.get(id)
  }

  async listChildren(parentId: string): Promise<Category[]> {
    const db = await this.db()
    return db.categories.where('parentId').equals(parentId).sortBy('sort')
  }

  async create(
    input: Pick<Category, 'bookId' | 'name' | 'type' | 'parentId' | 'icon'> & {
      sort?: number
      color?: string
    },
  ): Promise<Category> {
    const db = await this.db()
    const timestamp = nowIso()
    const all = await db.categories.where('bookId').equals(input.bookId).toArray()
    const siblings = all.filter((c) => c.parentId === input.parentId).length

    const category: Category = {
      id: createId('cat'),
      bookId: input.bookId,
      name: input.name,
      type: input.type,
      parentId: input.parentId,
      sort: input.sort ?? siblings,
      icon: input.icon,
      color: input.color,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.categories.add(category)
    return category
  }

  async update(
    id: string,
    patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sort' | 'parentId'>>,
  ): Promise<Category> {
    const db = await this.db()
    const existing = await db.categories.get(id)
    if (!existing) {
      throw new Error(`Category not found: ${id}`)
    }
    const updated: Category = { ...existing, ...patch, updatedAt: nowIso() }
    await db.categories.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const db = await this.db()
    await db.transaction('rw', db.categories, async () => {
      await db.categories.where('parentId').equals(id).delete()
      await db.categories.delete(id)
    })
  }
}

export const categoryRepository = new CategoryRepository()
