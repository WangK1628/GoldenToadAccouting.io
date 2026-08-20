import type { Category, Transaction } from '@/models'
import type {
  CalendarDay,
  CategoryStat,
  StatsSummary,
  StatsTypeFilter,
  TrendPoint,
  WeekdayStat,
} from '@/models/stats'
import { categoryRepository, transactionRepository } from '@/repositories'
import type { DateRange } from '@/utils/date-range'
import { addDays, yearMonthFromAnchor } from '@/utils/date-range'
import { weekdayLabel } from '@/utils/format'
import { sumCents } from '@/utils/money'
import { todayDateString } from '@/utils/time'

const CHART_COLORS = [
  '#C9A227',
  '#D4A574',
  '#8B6914',
  '#E8C547',
  '#A67C00',
  '#F0D78C',
  '#B8860B',
  '#DEB887',
]

export { CHART_COLORS }

class StatsService {
  private async loadRows(bookId: string, range: DateRange): Promise<Transaction[]> {
    return transactionRepository.list({
      bookId,
      dateFrom: range.from,
      dateTo: range.to,
    })
  }

  async getSummary(bookId: string, range: DateRange): Promise<StatsSummary> {
    const rows = await this.loadRows(bookId, range)
    const expense = sumCents(rows.filter((r) => r.type === 'expense').map((r) => r.amount))
    const income = sumCents(rows.filter((r) => r.type === 'income').map((r) => r.amount))
    return {
      expense,
      income,
      balance: income - expense,
      count: rows.length,
    }
  }

  async getCategoryStats(
    bookId: string,
    range: DateRange,
    type: StatsTypeFilter,
    parentId?: string | null,
  ): Promise<CategoryStat[]> {
    const [rows, categories] = await Promise.all([
      this.loadRows(bookId, range),
      categoryRepository.listByBook(bookId, type),
    ])
    const filtered = rows.filter((r) => r.type === type)
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const buckets = new Map<string, number>()

    if (parentId) {
      for (const row of filtered) {
        if (row.categoryId !== parentId) continue
        const key = row.subcategoryId ?? `__parent__:${parentId}`
        buckets.set(key, (buckets.get(key) ?? 0) + row.amount)
      }
    } else {
      for (const row of filtered) {
        buckets.set(row.categoryId, (buckets.get(row.categoryId) ?? 0) + row.amount)
      }
    }

    const total = sumCents([...buckets.values()])
    if (total <= 0) return []

    const stats: CategoryStat[] = []
    for (const [id, amount] of buckets) {
      const isParentFallback = id.startsWith('__parent__:')
      const cat = isParentFallback ? catMap.get(parentId!) : catMap.get(id)
      if (!cat && !isParentFallback) continue

      const children = parentId
        ? []
        : categories.filter((c) => c.parentId === id)

      stats.push({
        id: isParentFallback ? parentId! : id,
        name: isParentFallback ? (catMap.get(parentId!)?.name ?? '未细分') : (cat?.name ?? '未知'),
        icon: cat?.icon ?? '·',
        amount,
        pct: Math.round((amount / total) * 100),
        hasChildren: !parentId && children.length > 0,
      })
    }

    return stats.sort((a, b) => b.amount - a.amount)
  }

  async getTrend(
    bookId: string,
    range: DateRange,
    granularity: 'day' | 'week' | 'month' | 'year',
    anchor: string,
  ): Promise<TrendPoint[]> {
    const rows = await this.loadRows(bookId, range)

    if (granularity === 'day') {
      const points: TrendPoint[] = []
      for (let i = 6; i >= 0; i--) {
        const date = addDays(anchor, -i)
        const dayRows = rows.filter((r) => r.date === date)
        const [, m, d] = date.split('-').map((v) => Number.parseInt(v, 10))
        points.push({
          key: date,
          label: `${m}/${d}`,
          expense: sumCents(dayRows.filter((r) => r.type === 'expense').map((r) => r.amount)),
          income: sumCents(dayRows.filter((r) => r.type === 'income').map((r) => r.amount)),
        })
      }
      return points
    }

    if (granularity === 'week') {
      const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      const buckets = labels.map((label) => ({
        key: label,
        label,
        expense: 0,
        income: 0,
      }))
      for (const row of rows) {
        const label = weekdayLabel(row.date)
        const index = labels.indexOf(label)
        if (index < 0) continue
        if (row.type === 'expense') buckets[index].expense += row.amount
        else buckets[index].income += row.amount
      }
      return buckets
    }

    if (granularity === 'month') {
      const ym = range.from.slice(0, 7)
      const [y, m] = ym.split('-').map((v) => Number.parseInt(v, 10))
      const lastDay = new Date(y, m, 0).getDate()
      const points: TrendPoint[] = []
      for (let day = 1; day <= lastDay; day++) {
        const date = `${ym}-${String(day).padStart(2, '0')}`
        const dayRows = rows.filter((r) => r.date === date)
        points.push({
          key: date,
          label: String(day),
          expense: sumCents(dayRows.filter((r) => r.type === 'expense').map((r) => r.amount)),
          income: sumCents(dayRows.filter((r) => r.type === 'income').map((r) => r.amount)),
        })
      }
      return points
    }

    const y = Number.parseInt(range.from.slice(0, 4), 10)
    const points: TrendPoint[] = []
    for (let month = 1; month <= 12; month++) {
      const prefix = `${y}-${String(month).padStart(2, '0')}`
      const monthRows = rows.filter((r) => r.date.startsWith(prefix))
      points.push({
        key: prefix,
        label: `${month}月`,
        expense: sumCents(monthRows.filter((r) => r.type === 'expense').map((r) => r.amount)),
        income: sumCents(monthRows.filter((r) => r.type === 'income').map((r) => r.amount)),
      })
    }
    return points
  }

  async getWeekdayStats(
    bookId: string,
    range: DateRange,
    type: StatsTypeFilter = 'expense',
  ): Promise<WeekdayStat[]> {
    const rows = await this.loadRows(bookId, range)
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const buckets = labels.map((label) => ({ label, amount: 0 }))
    for (const row of rows) {
      if (row.type !== type) continue
      const label = weekdayLabel(row.date)
      const index = labels.indexOf(label)
      if (index >= 0) buckets[index].amount += row.amount
    }
    return buckets
  }

  async getCalendar(bookId: string, yearMonth: string): Promise<CalendarDay[]> {
    const [y, m] = yearMonth.split('-').map((v) => Number.parseInt(v, 10))
    const first = new Date(y, m - 1, 1)
    const lastDay = new Date(y, m, 0).getDate()
    const startOffset = (first.getDay() + 6) % 7

    const rows = await transactionRepository.list({
      bookId,
      dateFrom: `${yearMonth}-01`,
      dateTo: `${yearMonth}-31`,
    })

    const byDate = new Map<string, { expense: number; income: number }>()
    for (const row of rows) {
      if (!row.date.startsWith(yearMonth)) continue
      const bucket = byDate.get(row.date) ?? { expense: 0, income: 0 }
      if (row.type === 'expense') bucket.expense += row.amount
      else bucket.income += row.amount
      byDate.set(row.date, bucket)
    }

    const days: CalendarDay[] = []
    const totalCells = Math.ceil((startOffset + lastDay) / 7) * 7

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1
      if (dayNum < 1 || dayNum > lastDay) {
        days.push({
          date: '',
          day: dayNum,
          inMonth: false,
          expense: 0,
          income: 0,
          net: 0,
        })
        continue
      }
      const date = `${yearMonth}-${String(dayNum).padStart(2, '0')}`
      const bucket = byDate.get(date) ?? { expense: 0, income: 0 }
      days.push({
        date,
        day: dayNum,
        inMonth: true,
        expense: bucket.expense,
        income: bucket.income,
        net: bucket.income - bucket.expense,
      })
    }
    return days
  }

  categoryHasChildren(categories: Category[], categoryId: string): boolean {
    return categories.some((c) => c.parentId === categoryId)
  }

  calendarYearMonth(anchor: string): string {
    return yearMonthFromAnchor(anchor)
  }

  defaultAnchor(): string {
    return todayDateString()
  }
}

export const statsService = new StatsService()
