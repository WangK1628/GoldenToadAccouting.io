import type { Book, Budget, Category, Transaction, TransactionType } from '@/models'
import { db, openDatabase } from '@/database'
import { createId } from '@/utils/id'
import { nowIso, todayDateString } from '@/utils/time'

const DEFAULT_BOOK: Omit<Book, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '日常账本',
  note: '日常开销',
  isDefault: true,
  sort: 0,
}

const DEFAULT_CATEGORIES: Array<{
  name: string
  type: TransactionType
  icon: string
  sort: number
  children?: Array<{ name: string; icon: string; sort: number }>
}> = [
  {
    name: '餐饮',
    type: 'expense',
    icon: '🍜',
    sort: 0,
    children: [
      { name: '早餐', icon: '🥐', sort: 0 },
      { name: '午餐', icon: '🍱', sort: 1 },
      { name: '晚餐', icon: '🍲', sort: 2 },
    ],
  },
  {
    name: '交通',
    type: 'expense',
    icon: '🚌',
    sort: 1,
    children: [
      { name: '地铁', icon: '🚇', sort: 0 },
      { name: '打车', icon: '🚕', sort: 1 },
    ],
  },
  {
    name: '购物',
    type: 'expense',
    icon: '🛍️',
    sort: 2,
    children: [{ name: '网购', icon: '📦', sort: 0 }],
  },
  { name: '娱乐', type: 'expense', icon: '🎤', sort: 3 },
  { name: '住房', type: 'expense', icon: '🏠', sort: 4 },
  { name: '医疗', type: 'expense', icon: '💊', sort: 5 },
  { name: '工资', type: 'income', icon: '💰', sort: 0 },
  { name: '其他收入', type: 'income', icon: '📥', sort: 1 },
]

export async function runMigrations(): Promise<void> {
  await openDatabase()

  const bookCount = await db.books.count()
  if (bookCount === 0) {
    await seedInitialData()
  }
}

export async function ensureDemoRecords(): Promise<boolean> {
  await openDatabase()
  const txCount = await db.transactions.count()
  if (txCount > 0) return false

  const book =
    (await db.books.filter((row) => row.isDefault).first()) ??
    (await db.books.toCollection().first())
  if (!book) return false

  const categories = await db.categories.where('bookId').equals(book.id).toArray()
  if (categories.length === 0) return false

  const catIds: Record<string, string> = {}
  for (const cat of categories) {
    catIds[cat.name] = cat.id
    if (cat.parentId) {
      const parent = categories.find((row) => row.id === cat.parentId)
      if (parent) catIds[`${parent.name}.${cat.name}`] = cat.id
    }
  }

  const timestamp = nowIso()
  const today = todayDateString()
  const yearMonth = today.slice(0, 7)
  const demoRecords = buildDemoRecords(book.id, catIds, today, timestamp)
  const budget: Budget = {
    id: createId('budget'),
    bookId: book.id,
    yearMonth,
    amount: 500000,
    isDefault: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.transaction('rw', db.transactions, db.budgets, async () => {
    await db.transactions.bulkAdd(demoRecords)
    const budgetCount = await db.budgets.where('bookId').equals(book.id).count()
    if (budgetCount === 0) await db.budgets.add(budget)
  })
  return true
}

function buildDemoRecords(
  bookId: string,
  catIds: Record<string, string>,
  today: string,
  timestamp: string,
): Transaction[] {
  return [
    {
      id: createId('txn'),
      bookId,
      type: 'expense',
      amount: 2850,
      categoryId: catIds['餐饮']!,
      subcategoryId: catIds['餐饮.午餐'] ?? null,
      note: '公司附近简餐',
      date: today,
      time: '12:10',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: createId('txn'),
      bookId,
      type: 'expense',
      amount: 600,
      categoryId: catIds['交通']!,
      subcategoryId: catIds['交通.地铁'] ?? null,
      note: '地铁通勤',
      date: today,
      time: '08:42',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: createId('txn'),
      bookId,
      type: 'expense',
      amount: 12900,
      categoryId: catIds['购物']!,
      subcategoryId: null,
      note: '日用品',
      date: offsetDate(today, -1),
      time: '19:20',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: createId('txn'),
      bookId,
      type: 'income',
      amount: 1800000,
      categoryId: catIds['工资']!,
      subcategoryId: null,
      note: '本月工资',
      date: offsetDate(today, -2),
      time: '10:00',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: createId('txn'),
      bookId,
      type: 'expense',
      amount: 4500,
      categoryId: catIds['餐饮']!,
      subcategoryId: catIds['餐饮.晚餐'] ?? null,
      date: offsetDate(today, -3),
      time: '18:35',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]
}

async function seedInitialData(): Promise<void> {
  const timestamp = nowIso()
  const bookId = createId('book')
  const today = todayDateString()
  const yearMonth = today.slice(0, 7)

  const book: Book = {
    id: bookId,
    ...DEFAULT_BOOK,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const categories: Category[] = []
  const catIds: Record<string, string> = {}

  for (const item of DEFAULT_CATEGORIES) {
    const parentId = createId('cat')
    catIds[item.name] = parentId
    categories.push({
      id: parentId,
      bookId,
      name: item.name,
      type: item.type,
      parentId: null,
      sort: item.sort,
      icon: item.icon,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    for (const child of item.children ?? []) {
      const childId = createId('cat')
      catIds[`${item.name}.${child.name}`] = childId
      categories.push({
        id: childId,
        bookId,
        name: child.name,
        type: item.type,
        parentId,
        sort: child.sort,
        icon: child.icon,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }
  }

  const demoRecords = buildDemoRecords(bookId, catIds, today, timestamp)

  const budget: Budget = {
    id: createId('budget'),
    bookId,
    yearMonth,
    amount: 500000,
    isDefault: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.transaction(
    'rw',
    db.books,
    db.categories,
    db.transactions,
    db.budgets,
    db.settings,
    async () => {
      await db.books.add(book)
      await db.categories.bulkAdd(categories)
      await db.transactions.bulkAdd(demoRecords)
      await db.budgets.add(budget)
      await db.settings.put({
        key: 'currentBookId',
        value: bookId,
        updatedAt: timestamp,
      })
      await db.settings.put({
        key: 'theme',
        value: 'system',
        updatedAt: timestamp,
      })
    },
  )
}

function offsetDate(base: string, days: number): string {
  const d = new Date(`${base}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function clearDemoTransactions(): Promise<void> {
  await openDatabase()
  await db.transaction(
    'rw',
    db.transactions,
    db.transactionTags,
    db.budgets,
    db.aiConversations,
    db.aiMessages,
    async () => {
      await db.transactions.clear()
      await db.transactionTags.clear()
      await db.budgets.clear()
      await db.aiMessages.clear()
      await db.aiConversations.clear()
    },
  )
}
