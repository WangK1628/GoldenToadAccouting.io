import type { Category, Tag, Transaction, TransactionType } from '@/models'
import type { TransactionDisplay } from '@/models/display'
import { mapTransactionDisplay } from '@/models/display'
import {
  categoryRepository,
  tagRepository,
  transactionRepository,
} from '@/repositories'
import type { CreateTransactionInput, TransactionFilter } from '@/repositories/transaction.repository'
import { yuanToCents } from '@/utils/money'
import { currentTimeString, todayDateString } from '@/utils/time'

export interface RecordFormInput {
  bookId: string
  type: TransactionType
  amountYuan: string
  categoryId: string
  subcategoryId?: string | null
  date: string
  time: string
  note?: string
  tagNames?: string[]
  tagIds?: string[]
}

export interface RecordDetail extends TransactionDisplay {
  categoryId: string
  subcategoryId: string | null
  tagIds: string[]
  tagNames: string[]
}

export interface CategoryGroup {
  parent: Category
  children: Category[]
}

class RecordService {
  async listDisplay(filter: TransactionFilter): Promise<TransactionDisplay[]> {
    const categories = await categoryRepository.listByBook(filter.bookId)
    const map = new Map(
      categories.map((c) => [c.id, { name: c.name, parentId: c.parentId, icon: c.icon }]),
    )
    const rows = await transactionRepository.list(filter)
    return rows.map((row) => mapTransactionDisplay(row, map))
  }

  async getDetail(transactionId: string, bookId: string): Promise<RecordDetail | null> {
    const txn = await transactionRepository.getById(transactionId)
    if (!txn || txn.bookId !== bookId) return null

    const categories = await categoryRepository.listByBook(bookId)
    const map = new Map(
      categories.map((c) => [c.id, { name: c.name, parentId: c.parentId, icon: c.icon }]),
    )
    const base = mapTransactionDisplay(txn, map)
    const tagIds = await transactionRepository.getTagIds(transactionId)
    const tags = await Promise.all(tagIds.map((id) => tagRepository.getById(id)))
    const tagNames = tags.filter((t): t is Tag => Boolean(t)).map((t) => t.name)

    return {
      ...base,
      categoryId: txn.categoryId,
      subcategoryId: txn.subcategoryId,
      tagIds,
      tagNames,
    }
  }

  async create(input: RecordFormInput): Promise<Transaction> {
    const amount = yuanToCents(input.amountYuan)
    if (amount <= 0) throw new Error('金额必须大于 0')

    const tagIds = await this.resolveTagIds(input.tagIds, input.tagNames)
    const payload: CreateTransactionInput = {
      bookId: input.bookId,
      type: input.type,
      amount,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId ?? null,
      date: input.date,
      time: input.time,
      note: input.note?.trim() || undefined,
      tagIds,
    }
    return transactionRepository.create(payload)
  }

  async update(transactionId: string, input: RecordFormInput): Promise<Transaction> {
    const amount = yuanToCents(input.amountYuan)
    if (amount <= 0) throw new Error('金额必须大于 0')

    const tagIds = await this.resolveTagIds(input.tagIds, input.tagNames)
    const updated = await transactionRepository.update(transactionId, {
      type: input.type,
      amount,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId ?? null,
      date: input.date,
      time: input.time,
      note: input.note?.trim() || undefined,
    })
    await transactionRepository.setTags(transactionId, tagIds)
    return updated
  }

  async delete(transactionId: string): Promise<void> {
    await transactionRepository.delete(transactionId)
  }

  async listCategoryGroups(bookId: string, type: TransactionType): Promise<CategoryGroup[]> {
    const all = await categoryRepository.listByBook(bookId, type)
    const parents = all.filter((c) => c.parentId === null).sort((a, b) => a.sort - b.sort)
    return parents.map((parent) => ({
      parent,
      children: all
        .filter((c) => c.parentId === parent.id)
        .sort((a, b) => a.sort - b.sort),
    }))
  }

  async getRecentCategoryPairs(
    bookId: string,
    type: TransactionType,
    limit = 6,
  ): Promise<Array<{ categoryId: string; subcategoryId: string | null }>> {
    const rows = await transactionRepository.list({ bookId, type })
    const seen = new Set<string>()
    const pairs: Array<{ categoryId: string; subcategoryId: string | null }> = []

    for (const row of rows) {
      const key = `${row.categoryId}:${row.subcategoryId ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ categoryId: row.categoryId, subcategoryId: row.subcategoryId })
      if (pairs.length >= limit) break
    }
    return pairs
  }

  emptyForm(bookId: string): RecordFormInput {
    return {
      bookId,
      type: 'expense',
      amountYuan: '',
      categoryId: '',
      subcategoryId: null,
      date: todayDateString(),
      time: currentTimeString(),
      note: '',
      tagNames: [],
      tagIds: [],
    }
  }

  private async resolveTagIds(tagIds?: string[], tagNames?: string[]): Promise<string[]> {
    const ids = new Set(tagIds ?? [])
    for (const name of tagNames ?? []) {
      const trimmed = name.trim()
      if (!trimmed) continue
      const tag = await tagRepository.create(trimmed)
      ids.add(tag.id)
    }
    return [...ids]
  }
}

export const recordService = new RecordService()
