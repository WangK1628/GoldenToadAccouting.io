import type { TransactionType } from '@/models'

export interface StatsSummary {
  expense: number
  income: number
  balance: number
  count: number
}

export interface CategoryStat {
  id: string
  name: string
  icon: string
  amount: number
  pct: number
  hasChildren: boolean
}

export interface TrendPoint {
  key: string
  label: string
  expense: number
  income: number
}

export interface CalendarDay {
  date: string
  day: number
  inMonth: boolean
  expense: number
  income: number
  net: number
}

export interface WeekdayStat {
  label: string
  amount: number
}

export interface BudgetView {
  budgetCents: number
  spentCents: number
  remainingCents: number
  pct: number
  over: boolean
  source: 'default' | 'month' | 'none'
  yearMonth: string
}

export type StatsTypeFilter = TransactionType
