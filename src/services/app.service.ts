import { runMigrations } from '@/database/migrations'
import {
  bookRepository,
  budgetRepository,
  categoryRepository,
  settingsRepository,
  transactionRepository,
} from '@/repositories'
import type { Book, Category, Transaction } from '@/models'
import type { BudgetProgress, TransactionDisplay, WeekChartPoint } from '@/models/display'
import { mapTransactionDisplay } from '@/models/display'
import { sumCents } from '@/utils/money'
import { todayDateString, yearMonthFromDate } from '@/utils/time'
import { daysInMonth, weekdayLabel } from '@/utils/format'

export interface MonthSummary {
  expense: number
  income: number
  balance: number
  count: number
}

class AppService {
  private ready = false

  async initialize(): Promise<void> {
    if (this.ready) return
    await runMigrations()
    this.ready = true
  }

  private categoryMap(categories: Category[]) {
    return new Map(
      categories.map((c) => [c.id, { name: c.name, parentId: c.parentId, icon: c.icon }]),
    )
  }

  async getCurrentBook(): Promise<Book> {
    await this.initialize()
    const bookId = await settingsRepository.getCurrentBookId()
    if (bookId) {
      const book = await bookRepository.getById(bookId)
      if (book) return book
    }
    const fallback = await bookRepository.getDefault()
    if (!fallback) {
      throw new Error('No book available')
    }
    await settingsRepository.setCurrentBookId(fallback.id)
    return fallback
  }

  async listBooks(): Promise<Book[]> {
    await this.initialize()
    return bookRepository.list()
  }

  async setCurrentBook(bookId: string): Promise<void> {
    await this.initialize()
    const book = await bookRepository.getById(bookId)
    if (!book) throw new Error(`Book not found: ${bookId}`)
    await settingsRepository.setCurrentBookId(bookId)
  }

  async listCategories(bookId: string): Promise<Category[]> {
    await this.initialize()
    return categoryRepository.listByBook(bookId)
  }

  async listMonthTransactionsDisplay(
    bookId: string,
    yearMonth: string,
  ): Promise<TransactionDisplay[]> {
    await this.initialize()
    const categories = await categoryRepository.listByBook(bookId)
    const map = this.categoryMap(categories)
    const rows = await transactionRepository.list({
      bookId,
      dateFrom: `${yearMonth}-01`,
      dateTo: `${yearMonth}-31`,
    })
    return rows
      .filter((row) => yearMonthFromDate(row.date) === yearMonth)
      .map((row) => mapTransactionDisplay(row, map))
  }

  async listRangeTransactionsDisplay(
    bookId: string,
    from: string,
    to: string,
  ): Promise<TransactionDisplay[]> {
    await this.initialize()
    const categories = await categoryRepository.listByBook(bookId)
    const map = this.categoryMap(categories)
    const rows = await transactionRepository.list({
      bookId,
      dateFrom: from,
      dateTo: to,
    })
    return rows
      .filter((row) => row.date >= from && row.date <= to)
      .map((row) => mapTransactionDisplay(row, map))
  }

  async listRecentTransactions(bookId: string, limit = 20): Promise<Transaction[]> {
    await this.initialize()
    const rows = await transactionRepository.list({ bookId })
    return rows.slice(0, limit)
  }

  async getMonthSummary(bookId: string, yearMonth: string): Promise<MonthSummary> {
    await this.initialize()
    const rows = await transactionRepository.list({
      bookId,
      dateFrom: `${yearMonth}-01`,
      dateTo: `${yearMonth}-31`,
    })
    const monthRows = rows.filter((r) => yearMonthFromDate(r.date) === yearMonth)
    const expense = sumCents(monthRows.filter((r) => r.type === 'expense').map((r) => r.amount))
    const income = sumCents(monthRows.filter((r) => r.type === 'income').map((r) => r.amount))
    return {
      expense,
      income,
      balance: income - expense,
      count: monthRows.length,
    }
  }

  async getDailyAverageExpense(bookId: string, yearMonth: string): Promise<number> {
    const summary = await this.getMonthSummary(bookId, yearMonth)
    const today = todayDateString()
    const isCurrentMonth = yearMonth === today.slice(0, 7)
    const divisor = isCurrentMonth ? Number.parseInt(today.slice(8, 10), 10) : daysInMonth(yearMonth)
    if (divisor <= 0 || summary.expense <= 0) return 0
    return Math.round(summary.expense / divisor)
  }

  async getWeekChart(bookId: string, yearMonth: string): Promise<WeekChartPoint[]> {
    await this.initialize()
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const rows = await transactionRepository.list({
      bookId,
      dateFrom: `${yearMonth}-01`,
      dateTo: `${yearMonth}-31`,
    })
    const buckets = labels.map((label) => ({ label, amount: 0 }))
    for (const row of rows) {
      if (row.type !== 'expense' || yearMonthFromDate(row.date) !== yearMonth) continue
      const label = weekdayLabel(row.date)
      const index = labels.indexOf(label)
      if (index >= 0) buckets[index].amount += row.amount
    }
    return buckets
  }

  async getBudgetProgress(bookId: string, yearMonth: string): Promise<BudgetProgress | null> {
    await this.initialize()
    const budget = await budgetRepository.getForMonth(bookId, yearMonth)
    if (!budget || budget.amount <= 0) return null
    const summary = await this.getMonthSummary(bookId, yearMonth)
    const pct = Math.round((summary.expense / budget.amount) * 100)
    return {
      budgetCents: budget.amount,
      spentCents: summary.expense,
      pct,
      over: summary.expense > budget.amount,
    }
  }
}

export const appService = new AppService()
