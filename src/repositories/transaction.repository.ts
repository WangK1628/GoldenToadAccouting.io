import type { Transaction, TransactionType } from '@/models'
import { BaseRepository } from '@/repositories/base.repository'
import { createId } from '@/utils/id'
import { nowIso, yearMonthFromDate } from '@/utils/time'

export interface TransactionFilter {
  bookId: string
  type?: TransactionType
  categoryId?: string
  subcategoryId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  tagIds?: string[]
  limit?: number
  offset?: number
}

export interface CreateTransactionInput {
  bookId: string
  type: TransactionType
  amount: number
  categoryId: string
  subcategoryId?: string | null
  date: string
  time: string
  note?: string
  tagIds?: string[]
}

export class TransactionRepository extends BaseRepository {
  async list(filter: TransactionFilter): Promise<Transaction[]> {
    const db = await this.db()
    const collection = db.transactions.where('bookId').equals(filter.bookId)

    let rows = await collection.reverse().sortBy('createdAt')
    rows = rows.filter((row) => this.matchesFilter(row, filter))

    if (filter.tagIds?.length) {
      const tagSet = new Set(filter.tagIds)
      const tagged: Transaction[] = []
      for (const row of rows) {
        const ids = await this.getTagIds(row.id)
        if (ids.some((id) => tagSet.has(id))) tagged.push(row)
      }
      rows = tagged
    }

    if (filter.limit !== undefined) {
      const offset = filter.offset ?? 0
      rows = rows.slice(offset, offset + filter.limit)
    }

    return rows
  }

  async getById(id: string): Promise<Transaction | undefined> {
    const db = await this.db()
    return db.transactions.get(id)
  }

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const db = await this.db()
    const timestamp = nowIso()
    const transaction: Transaction = {
      id: createId('txn'),
      bookId: input.bookId,
      type: input.type,
      amount: input.amount,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId ?? null,
      date: input.date,
      time: input.time,
      note: input.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await db.transaction('rw', db.transactions, db.transactionTags, async () => {
      await db.transactions.add(transaction)
      if (input.tagIds?.length) {
        await db.transactionTags.bulkAdd(
          input.tagIds.map((tagId) => ({
            id: createId('tt'),
            transactionId: transaction.id,
            tagId,
          })),
        )
      }
    })

    return transaction
  }

  async update(
    id: string,
    patch: Partial<
      Pick<
        Transaction,
        'type' | 'amount' | 'categoryId' | 'subcategoryId' | 'date' | 'time' | 'note'
      >
    >,
  ): Promise<Transaction> {
    const db = await this.db()
    const existing = await db.transactions.get(id)
    if (!existing) {
      throw new Error(`Transaction not found: ${id}`)
    }
    const updated: Transaction = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    }
    await db.transactions.put(updated)
    return updated
  }

  async setTags(transactionId: string, tagIds: string[]): Promise<void> {
    const db = await this.db()
    await db.transaction('rw', db.transactionTags, async () => {
      await db.transactionTags.where('transactionId').equals(transactionId).delete()
      if (tagIds.length > 0) {
        await db.transactionTags.bulkAdd(
          tagIds.map((tagId) => ({
            id: createId('tt'),
            transactionId,
            tagId,
          })),
        )
      }
    })
  }

  async getTagIds(transactionId: string): Promise<string[]> {
    const db = await this.db()
    const links = await db.transactionTags.where('transactionId').equals(transactionId).toArray()
    return links.map((l) => l.tagId)
  }

  async delete(id: string): Promise<void> {
    const db = await this.db()
    await db.transaction('rw', db.transactions, db.transactionTags, async () => {
      await db.transactionTags.where('transactionId').equals(id).delete()
      await db.transactions.delete(id)
    })
  }

  async sumByMonth(
    bookId: string,
    yearMonth: string,
    type?: TransactionType,
  ): Promise<number> {
    const rows = await this.list({ bookId, dateFrom: `${yearMonth}-01`, dateTo: `${yearMonth}-31` })
    return rows
      .filter((r) => (type ? r.type === type : true) && yearMonthFromDate(r.date) === yearMonth)
      .reduce((sum, r) => sum + r.amount, 0)
  }

  private matchesFilter(row: Transaction, filter: TransactionFilter): boolean {
    if (filter.type && row.type !== filter.type) return false
    if (filter.categoryId && row.categoryId !== filter.categoryId) return false
    if (filter.subcategoryId && row.subcategoryId !== filter.subcategoryId) return false
    if (filter.dateFrom && row.date < filter.dateFrom) return false
    if (filter.dateTo && row.date > filter.dateTo) return false
    if (filter.search) {
      const q = filter.search.trim().toLowerCase()
      if (!row.note?.toLowerCase().includes(q)) return false
    }
    return true
  }
}

export const transactionRepository = new TransactionRepository()
