import type { Category, TransactionType } from '@/models'
import { categoryRepository } from '@/repositories'

class CategoryService {
  async listByBook(bookId: string, type?: TransactionType): Promise<Category[]> {
    return categoryRepository.listByBook(bookId, type)
  }

  async createParent(
    bookId: string,
    input: Pick<Category, 'name' | 'type' | 'icon'> & { color?: string },
  ): Promise<Category> {
    return categoryRepository.create({
      bookId,
      name: input.name.trim(),
      type: input.type,
      parentId: null,
      icon: input.icon,
      color: input.color,
    })
  }

  async createChild(
    bookId: string,
    parentId: string,
    input: Pick<Category, 'name' | 'icon'> & { color?: string },
  ): Promise<Category> {
    const parent = await categoryRepository.getById(parentId)
    if (!parent) throw new Error('父分类不存在')
    return categoryRepository.create({
      bookId,
      name: input.name.trim(),
      type: parent.type,
      parentId,
      icon: input.icon,
      color: input.color,
    })
  }

  async update(
    id: string,
    patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sort'>>,
  ): Promise<Category> {
    return categoryRepository.update(id, patch)
  }

  async delete(id: string): Promise<void> {
    await categoryRepository.delete(id)
  }
}

export const categoryService = new CategoryService()
