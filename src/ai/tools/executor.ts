import type { TransactionType } from '@/models'
import { categoryRepository, settingsRepository } from '@/repositories'
import { appService } from '@/services/app.service'
import { budgetService } from '@/services/budget.service'
import { recordService } from '@/services/record.service'
import { statsService } from '@/services/stats.service'
import { centsToYuanString } from '@/utils/money'
import { currentTimeString, todayDateString } from '@/utils/time'
import { resolveDateRange } from '@/utils/date-range'
import { currentYearMonth } from '@/utils/format'

export interface ToolExecutionResult {
  result: string
  mutated: boolean
}

export async function executeToolCall(
  name: string,
  argsJson: string,
  bookId: string,
): Promise<ToolExecutionResult> {
  let args: Record<string, unknown>
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>
  } catch {
    return { result: JSON.stringify({ error: '参数 JSON 无效' }), mutated: false }
  }

  switch (name) {
    case 'create_transaction':
      return createTransaction(bookId, args)
    case 'search_transactions':
      return searchTransactions(bookId, args)
    case 'get_period_summary':
      return getPeriodSummary(bookId, args)
    case 'get_category_breakdown':
      return getCategoryBreakdown(bookId, args)
    case 'get_budget_status':
      return getBudgetStatus(bookId, args)
    case 'list_categories':
      return listCategories(bookId, args)
    case 'delete_transaction':
      return deleteTransaction(bookId, args)
    default:
      return { result: JSON.stringify({ error: `未知工具: ${name}` }), mutated: false }
  }
}

async function createTransaction(
  bookId: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const type = args.type as TransactionType
  const amountYuan = String(args.amount_yuan ?? '')
  const categoryName = String(args.category_name ?? '')
  const subcategoryName = args.subcategory_name ? String(args.subcategory_name) : undefined
  const date = args.date ? String(args.date) : todayDateString()
  const note = args.note ? String(args.note) : undefined
  const tags = Array.isArray(args.tags) ? args.tags.map(String) : undefined

  const { categoryId, subcategoryId } = await resolveCategory(
    bookId,
    type,
    categoryName,
    subcategoryName,
  )

  const txn = await recordService.create({
    bookId,
    type,
    amountYuan,
    categoryId,
    subcategoryId,
    date,
    time: currentTimeString(),
    note,
    tagNames: tags,
  })

  return {
    result: JSON.stringify({
      ok: true,
      transaction_id: txn.id,
      type: txn.type,
      amount_yuan: centsToYuanString(txn.amount),
      date: txn.date,
      note: txn.note ?? '',
    }),
    mutated: true,
  }
}

async function searchTransactions(
  bookId: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const type = args.type as TransactionType | undefined
  const categoryName = args.category_name ? String(args.category_name) : undefined
  let categoryId: string | undefined
  if (categoryName && type) {
    const resolved = await resolveCategory(bookId, type, categoryName)
    categoryId = resolved.categoryId
  }

  const limit = typeof args.limit === 'number' ? args.limit : 10
  const rows = await recordService.listDisplay({
    bookId,
    type,
    dateFrom: args.date_from ? String(args.date_from) : undefined,
    dateTo: args.date_to ? String(args.date_to) : undefined,
    categoryId,
    search: args.search ? String(args.search) : undefined,
    limit,
  })

  return {
    result: JSON.stringify({
      count: rows.length,
      records: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount_yuan: centsToYuanString(r.amount),
        category: r.categoryLabel,
        date: r.date,
        time: r.time,
        note: r.note ?? '',
      })),
    }),
    mutated: false,
  }
}

async function getPeriodSummary(
  bookId: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const dateFrom = String(args.date_from ?? '')
  const dateTo = String(args.date_to ?? '')
  const range = resolveDateRange('custom', dateFrom, { from: dateFrom, to: dateTo })
  const summary = await statsService.getSummary(bookId, range)

  return {
    result: JSON.stringify({
      expense_yuan: centsToYuanString(summary.expense),
      income_yuan: centsToYuanString(summary.income),
      balance_yuan: centsToYuanString(summary.balance),
      count: summary.count,
      date_from: dateFrom,
      date_to: dateTo,
    }),
    mutated: false,
  }
}

async function getCategoryBreakdown(
  bookId: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const type = (args.type as TransactionType) ?? 'expense'
  const dateFrom = String(args.date_from ?? '')
  const dateTo = String(args.date_to ?? '')
  const range = resolveDateRange('custom', dateFrom, { from: dateFrom, to: dateTo })
  const stats = await statsService.getCategoryStats(bookId, range, type)

  return {
    result: JSON.stringify({
      categories: stats.map((c) => ({
        name: c.name,
        amount_yuan: centsToYuanString(c.amount),
        pct: c.pct,
      })),
    }),
    mutated: false,
  }
}

async function getBudgetStatus(
  bookId: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const yearMonth = args.year_month ? String(args.year_month) : currentYearMonth()
  const view = await budgetService.getView(bookId, yearMonth)

  return {
    result: JSON.stringify({
      year_month: yearMonth,
      budget_yuan: centsToYuanString(view.budgetCents),
      spent_yuan: centsToYuanString(view.spentCents),
      remaining_yuan: centsToYuanString(Math.max(0, view.remainingCents)),
      pct: view.pct,
      over: view.over,
      source: view.source,
    }),
    mutated: false,
  }
}

async function listCategories(
  bookId: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const type = args.type as TransactionType | undefined
  const groups = await recordService.listCategoryGroups(bookId, type ?? 'expense')
  const incomeGroups =
    type === undefined
      ? await recordService.listCategoryGroups(bookId, 'income')
      : []

  const formatGroups = (items: typeof groups) =>
    items.map((g) => ({
      name: g.parent.name,
      icon: g.parent.icon,
      children: g.children.map((c) => c.name),
    }))

  return {
    result: JSON.stringify({
      expense: type === 'income' ? [] : formatGroups(groups),
      income: type === 'expense' ? [] : formatGroups(type === 'income' ? groups : incomeGroups),
    }),
    mutated: false,
  }
}

async function deleteTransaction(
  bookId: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const id = String(args.transaction_id ?? '')
  const detail = await recordService.getDetail(id, bookId)
  if (!detail) {
    return { result: JSON.stringify({ error: '流水不存在' }), mutated: false }
  }
  await recordService.delete(id)
  return {
    result: JSON.stringify({ ok: true, deleted_id: id }),
    mutated: true,
  }
}

async function resolveCategory(
  bookId: string,
  type: TransactionType,
  categoryName: string,
  subcategoryName?: string,
): Promise<{ categoryId: string; subcategoryId: string | null }> {
  const categories = await categoryRepository.listByBook(bookId, type)
  const parent = categories.find((c) => c.parentId === null && c.name === categoryName)
  if (!parent) {
    throw new Error(`分类「${categoryName}」不存在，请先调用 list_categories 查看可用分类`)
  }
  if (subcategoryName) {
    const sub = categories.find((c) => c.parentId === parent.id && c.name === subcategoryName)
    if (!sub) {
      throw new Error(`子分类「${subcategoryName}」不存在于「${categoryName}」下`)
    }
    return { categoryId: parent.id, subcategoryId: sub.id }
  }
  return { categoryId: parent.id, subcategoryId: null }
}

export async function buildBookContext(bookId: string): Promise<string> {
  const book = await appService.listBooks().then((books) => books.find((b) => b.id === bookId))
  const settings = await settingsRepository.getAiSettings()
  const groups = await recordService.listCategoryGroups(bookId, 'expense')
  const incomeGroups = await recordService.listCategoryGroups(bookId, 'income')

  const fmt = (items: typeof groups) =>
    items
      .map((g) => {
        const subs = g.children.map((c) => c.name).join('/')
        return subs ? `${g.parent.name}(${subs})` : g.parent.name
      })
      .join('、')

  return [
    `当前账本：${book?.name ?? '未知'}`,
    `今天日期：${todayDateString()}`,
    `本月：${currentYearMonth()}`,
    `支出分类：${fmt(groups)}`,
    `收入分类：${fmt(incomeGroups)}`,
    `AI 模型：${settings.model}`,
  ].join('\n')
}
