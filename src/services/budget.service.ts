import type { BudgetView } from '@/models/stats'
import { budgetRepository } from '@/repositories'
import { appService } from '@/services/app.service'
import { yuanToCents, centsToYuanString } from '@/utils/money'

class BudgetService {
  async getView(bookId: string, yearMonth: string): Promise<BudgetView> {
    const all = await budgetRepository.listByBook(bookId)
    const monthBudget = all.find((b) => b.yearMonth === yearMonth && !b.isDefault)
    const defaultBudget = all.find((b) => b.isDefault)
    const effective = monthBudget ?? defaultBudget

    const summary = await appService.getMonthSummary(bookId, yearMonth)
    const budgetCents = effective?.amount ?? 0

    if (budgetCents <= 0) {
      return {
        budgetCents: 0,
        spentCents: summary.expense,
        remainingCents: 0,
        pct: 0,
        over: false,
        source: 'none',
        yearMonth,
      }
    }

    const pct = Math.round((summary.expense / budgetCents) * 100)
    const remaining = budgetCents - summary.expense

    return {
      budgetCents,
      spentCents: summary.expense,
      remainingCents: remaining,
      pct,
      over: summary.expense > budgetCents,
      source: monthBudget ? 'month' : 'default',
      yearMonth,
    }
  }

  async setDefault(bookId: string, amountYuan: string): Promise<void> {
    const amount = yuanToCents(amountYuan)
    if (amount <= 0) throw new Error('预算金额必须大于 0')
    await budgetRepository.upsert({ bookId, yearMonth: '', amount, isDefault: true })
  }

  async setMonthOverride(bookId: string, yearMonth: string, amountYuan: string): Promise<void> {
    const amount = yuanToCents(amountYuan)
    if (amount <= 0) throw new Error('预算金额必须大于 0')
    await budgetRepository.upsert({ bookId, yearMonth, amount, isDefault: false })
  }

  async clearMonthOverride(bookId: string, yearMonth: string): Promise<void> {
    const all = await budgetRepository.listByBook(bookId)
    const monthBudget = all.find((b) => b.yearMonth === yearMonth && !b.isDefault)
    if (monthBudget) await budgetRepository.delete(monthBudget.id)
  }

  async removeDefault(bookId: string): Promise<void> {
    const all = await budgetRepository.listByBook(bookId)
    const defaultBudget = all.find((b) => b.isDefault)
    if (defaultBudget) await budgetRepository.delete(defaultBudget.id)
  }

  formatYuan(cents: number): string {
    return centsToYuanString(cents)
  }
}

export const budgetService = new BudgetService()
