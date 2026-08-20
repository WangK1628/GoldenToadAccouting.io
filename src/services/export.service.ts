import {
  bookRepository,
  budgetRepository,
  categoryRepository,
  tagRepository,
  transactionRepository,
} from '@/repositories'
import type { ExportBundle, ExportFormat, TransactionExportRow } from '@/models/export'
import { EXPORT_VERSION } from '@/models/export'
import type { Category, Transaction } from '@/models'
import { downloadBlob, downloadText } from '@/utils/download'
import { toCsvContent } from '@/utils/csv'
import { centsToYuanString } from '@/utils/money'
import { todayDateString } from '@/utils/time'

const CSV_HEADERS = ['日期', '时间', '类型', '金额', '一级分类', '二级分类', '备注', '标签', '账本']

class ExportService {
  async buildBundle(bookId?: string): Promise<ExportBundle> {
    const books = await bookRepository.list()
    const targetBooks = bookId ? books.filter((b) => b.id === bookId) : books

    const categories = (
      await Promise.all(targetBooks.map((b) => categoryRepository.listByBook(b.id)))
    ).flat()
    const tags = await tagRepository.list()
    const budgets = (
      await Promise.all(targetBooks.map((b) => budgetRepository.listByBook(b.id)))
    ).flat()

    const bookMap = new Map(books.map((b) => [b.id, b.name]))
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const tagMap = new Map(tags.map((t) => [t.id, t.name]))

    const transactions: TransactionExportRow[] = []
    for (const book of targetBooks) {
      const rows = await transactionRepository.list({ bookId: book.id })
      for (const row of rows) {
        const tagIds = await transactionRepository.getTagIds(row.id)
        transactions.push({
          ...this.toExportRow(row, bookMap, catMap),
          tags: tagIds.map((id) => tagMap.get(id)).filter((name): name is string => Boolean(name)),
        })
      }
    }

    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'golden-toad-accounting',
      books: targetBooks,
      categories,
      tags,
      budgets,
      transactions,
    }
  }

  async export(format: ExportFormat, bookId?: string): Promise<void> {
    const bundle = await this.buildBundle(bookId)
    const stamp = todayDateString()

    switch (format) {
      case 'json':
        downloadText(
          `golden-toad-${stamp}.json`,
          JSON.stringify(bundle, null, 2),
          'application/json;charset=utf-8',
        )
        break
      case 'csv':
        downloadText(`golden-toad-${stamp}.csv`, this.toCsv(bundle.transactions), 'text/csv;charset=utf-8')
        break
      case 'txt':
        downloadText(`golden-toad-${stamp}.txt`, this.toTxt(bundle.transactions))
        break
      case 'xlsx':
        await this.downloadExcel(bundle.transactions, stamp)
        break
    }
  }

  private toExportRow(
    row: Transaction,
    bookMap: Map<string, string>,
    catMap: Map<string, Category>,
  ): TransactionExportRow {
    const cat = catMap.get(row.categoryId)
    const sub = row.subcategoryId ? catMap.get(row.subcategoryId) : undefined
    return {
      id: row.id,
      bookName: bookMap.get(row.bookId) ?? '未知账本',
      type: row.type,
      amountYuan: centsToYuanString(row.amount),
      category: cat?.name ?? '未分类',
      subcategory: sub?.name,
      date: row.date,
      time: row.time,
      note: row.note,
    }
  }

  private toCsv(rows: TransactionExportRow[]): string {
    const data = rows.map((row) => [
      row.date,
      row.time,
      row.type === 'expense' ? '支出' : '收入',
      row.amountYuan,
      row.category,
      row.subcategory ?? '',
      row.note ?? '',
      (row.tags ?? []).join('、'),
      row.bookName,
    ])
    return toCsvContent([CSV_HEADERS, ...data])
  }

  private toTxt(rows: TransactionExportRow[]): string {
    return rows
      .map((row) => {
        const typeLabel = row.type === 'expense' ? '支出' : '收入'
        const category = row.subcategory ? `${row.category}·${row.subcategory}` : row.category
        const note = row.note ? ` ${row.note}` : ''
        const tags = row.tags?.length ? ` #${row.tags.join('#')}` : ''
        return `${row.date} ${row.time} ${typeLabel} ¥${row.amountYuan} ${category}${note}${tags} [${row.bookName}]`
      })
      .join('\n')
  }

  private async downloadExcel(rows: TransactionExportRow[], stamp: string): Promise<void> {
    const XLSX = await import('xlsx')
    const sheetRows = rows.map((row) => ({
      日期: row.date,
      时间: row.time,
      类型: row.type === 'expense' ? '支出' : '收入',
      金额: row.amountYuan,
      一级分类: row.category,
      二级分类: row.subcategory ?? '',
      备注: row.note ?? '',
      标签: (row.tags ?? []).join('、'),
      账本: row.bookName,
    }))
    const sheet = XLSX.utils.json_to_sheet(sheetRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, '流水')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    downloadBlob(
      `golden-toad-${stamp}.xlsx`,
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    )
  }
}

export const exportService = new ExportService()
