import type { Tag } from '@/models'
import { BaseRepository } from '@/repositories/base.repository'
import { createId } from '@/utils/id'
import { nowIso } from '@/utils/time'

export class TagRepository extends BaseRepository {
  async list(): Promise<Tag[]> {
    const db = await this.db()
    return db.tags.orderBy('name').toArray()
  }

  async getById(id: string): Promise<Tag | undefined> {
    const db = await this.db()
    return db.tags.get(id)
  }

  async findByName(name: string): Promise<Tag | undefined> {
    const db = await this.db()
    const normalized = name.trim().toLowerCase()
    return db.tags.filter((t) => t.name.trim().toLowerCase() === normalized).first()
  }

  async create(name: string, color?: string): Promise<Tag> {
    const db = await this.db()
    const existing = await this.findByName(name)
    if (existing) return existing

    const timestamp = nowIso()
    const tag: Tag = {
      id: createId('tag'),
      name: name.trim(),
      color,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.tags.add(tag)
    return tag
  }

  async update(id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag> {
    const db = await this.db()
    const existing = await db.tags.get(id)
    if (!existing) {
      throw new Error(`Tag not found: ${id}`)
    }
    const updated: Tag = { ...existing, ...patch, updatedAt: nowIso() }
    await db.tags.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const db = await this.db()
    await db.transaction('rw', db.tags, db.transactionTags, async () => {
      await db.transactionTags.where('tagId').equals(id).delete()
      await db.tags.delete(id)
    })
  }

  async listByTransaction(transactionId: string): Promise<Tag[]> {
    const db = await this.db()
    const links = await db.transactionTags.where('transactionId').equals(transactionId).toArray()
    const tags: Tag[] = []
    for (const link of links) {
      const tag = await db.tags.get(link.tagId)
      if (tag) tags.push(tag)
    }
    return tags
  }
}

export const tagRepository = new TagRepository()
