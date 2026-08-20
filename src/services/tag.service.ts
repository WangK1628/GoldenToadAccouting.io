import type { Tag } from '@/models'
import { tagRepository } from '@/repositories'

class TagService {
  async list(): Promise<Tag[]> {
    return tagRepository.list()
  }

  async create(name: string, color?: string): Promise<Tag> {
    return tagRepository.create(name.trim(), color)
  }

  async update(id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>): Promise<Tag> {
    return tagRepository.update(id, patch)
  }

  async delete(id: string): Promise<void> {
    await tagRepository.delete(id)
  }
}

export const tagService = new TagService()
