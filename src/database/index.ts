import Dexie, { type EntityTable } from 'dexie'
import type {
  AiConversation,
  AiMessage,
  Book,
  Budget,
  Category,
  SettingRecord,
  Tag,
  Transaction,
  TransactionTag,
  User,
} from '@/models'

export const DB_NAME = 'golden-toad-accounting'
export const DB_VERSION = 2

export class GoldenToadDatabase extends Dexie {
  users!: EntityTable<User, 'id'>
  books!: EntityTable<Book, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  categories!: EntityTable<Category, 'id'>
  tags!: EntityTable<Tag, 'id'>
  transactionTags!: EntityTable<TransactionTag, 'id'>
  budgets!: EntityTable<Budget, 'id'>
  aiConversations!: EntityTable<AiConversation, 'id'>
  aiMessages!: EntityTable<AiMessage, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>

  constructor() {
    super(DB_NAME)

    this.version(1).stores({
      users: 'id, createdAt',
      books: 'id, isDefault, sort, createdAt',
      transactions: 'id, bookId, type, categoryId, subcategoryId, date, createdAt',
      categories: 'id, bookId, type, parentId, sort',
      tags: 'id, name, createdAt',
      transactionTags: 'id, transactionId, tagId, [transactionId+tagId]',
      budgets: 'id, bookId, yearMonth, isDefault',
      aiConversations: 'id, updatedAt, createdAt',
      aiMessages: 'id, conversationId, createdAt',
      settings: 'key, updatedAt',
    })

    this.version(DB_VERSION).stores({
      users: 'id, email, createdAt',
    })
  }
}

export const db = new GoldenToadDatabase()

export async function openDatabase(): Promise<GoldenToadDatabase> {
  if (!db.isOpen()) {
    await db.open()
  }
  return db
}

export async function resetDatabase(): Promise<void> {
  await db.delete()
  await db.open()
}
