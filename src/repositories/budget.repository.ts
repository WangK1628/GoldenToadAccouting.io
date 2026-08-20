import type { Budget } from '@/models'
import { BaseRepository } from '@/repositories/base.repository'
import { createId } from '@/utils/id'
import { nowIso } from '@/utils/time'

export class BudgetRepository extends BaseRepository {
  async listByBook(bookId: string): Promise<Budget[]> {
    const db = await this.db()
    return db.budgets.where('bookId').equals(bookId).toArray()
  }

  async getForMonth(bookId: string, yearMonth: string): Promise<Budget | undefined> {
    const db = await this.db()
    const all = await db.budgets.where('bookId').equals(bookId).toArray()
    const monthBudget = all.find((b) => b.yearMonth === yearMonth)
    if (monthBudget) return monthBudget
    return all.find((b) => b.isDefault)
  }

  async upsert(input: {
    bookId: string
    yearMonth: string
    amount: number
    isDefault?: boolean
  }): Promise<Budget> {
    const db = await this.db()
    const all = await db.budgets.where('bookId').equals(input.bookId).toArray()
    const existing = input.isDefault
      ? all.find((b) => b.isDefault)
      : all.find((b) => b.yearMonth === input.yearMonth)

    const timestamp = nowIso()
    if (existing) {
      const updated: Budget = {
        ...existing,
        amount: input.amount,
        yearMonth: input.isDefault ? existing.yearMonth : input.yearMonth,
        isDefault: input.isDefault ?? existing.isDefault,
        updatedAt: timestamp,
      }
      await db.budgets.put(updated)
      return updated
    }

    const budget: Budget = {
      id: createId('budget'),
      bookId: input.bookId,
      yearMonth: input.isDefault ? '' : input.yearMonth,
      amount: input.amount,
      isDefault: input.isDefault ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await db.budgets.add(budget)
    return budget
  }

  async delete(id: string): Promise<void> {
    const db = await this.db()
    await db.budgets.delete(id)
  }
}

export const budgetRepository = new BudgetRepository()
