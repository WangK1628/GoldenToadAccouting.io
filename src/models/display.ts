import type { Transaction, TransactionType } from '@/models'

export interface TransactionDisplay {
  id: string
  type: TransactionType
  amount: number
  categoryLabel: string
  categoryIcon: string
  note?: string
  date: string
  time: string
}

export interface WeekChartPoint {
  label: string
  amount: number
}

export interface BudgetProgress {
  budgetCents: number
  spentCents: number
  pct: number
  over: boolean
}

export function buildCategoryLabel(
  categories: Map<string, { name: string; parentId: string | null }>,
  categoryId: string,
  subcategoryId: string | null,
): { label: string; icon: string } {
  const sub = subcategoryId ? categories.get(subcategoryId) : undefined
  const cat = categories.get(categoryId)
  if (sub && cat) {
    return { label: `${cat.name} · ${sub.name}`, icon: '·' }
  }
  if (cat) {
    return { label: cat.name, icon: '·' }
  }
  return { label: '未分类', icon: '·' }
}

export function mapTransactionDisplay(
  txn: Transaction,
  categories: Map<string, { name: string; parentId: string | null; icon: string }>,
): TransactionDisplay {
  const sub = txn.subcategoryId ? categories.get(txn.subcategoryId) : undefined
  const cat = categories.get(txn.categoryId)
  const icon = sub?.icon ?? cat?.icon ?? '·'
  let categoryLabel = '未分类'
  if (sub && cat) categoryLabel = `${cat.name} · ${sub.name}`
  else if (cat) categoryLabel = cat.name

  return {
    id: txn.id,
    type: txn.type,
    amount: txn.amount,
    categoryLabel,
    categoryIcon: icon,
    note: txn.note,
    date: txn.date,
    time: txn.time,
  }
}
