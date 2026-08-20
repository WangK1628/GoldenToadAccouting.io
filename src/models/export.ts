import type { Book, Budget, Category, Tag, TransactionType } from '@/models'

export const EXPORT_VERSION = 1

export interface TransactionExportRow {
  id?: string
  bookName: string
  type: TransactionType
  amountYuan: string
  category: string
  subcategory?: string
  date: string
  time: string
  note?: string
  tags?: string[]
}

export interface ExportBundle {
  version: number
  exportedAt: string
  app: 'golden-toad-accounting'
  books: Book[]
  categories: Category[]
  tags: Tag[]
  budgets: Budget[]
  transactions: TransactionExportRow[]
}

export interface ParsedImportRow {
  type: TransactionType
  amountYuan: string
  category: string
  subcategory?: string
  date: string
  time: string
  note?: string
  tags?: string[]
  bookName?: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export type ExportFormat = 'json' | 'csv' | 'txt' | 'xlsx'
