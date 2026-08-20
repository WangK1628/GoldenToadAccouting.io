import { runMigrations } from '@/database/migrations'
import { resetDatabase } from '@/database'
import {
  bookRepository,
  categoryRepository,
  settingsRepository,
} from '@/repositories'
import type { ExportBundle, ImportResult, ParsedImportRow } from '@/models/export'
import { EXPORT_VERSION } from '@/models/export'
import type { TransactionType } from '@/models'
import { categoryService } from '@/services/category.service'
import { recordService } from '@/services/record.service'
import { normalizeHeader, parseCsv } from '@/utils/csv'
import { currentTimeString } from '@/utils/time'

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['日期', 'date'],
  time: ['时间', 'time'],
  type: ['类型', 'type'],
  amount: ['金额', 'amount', 'amountyuan'],
  category: ['一级分类', '分类', 'category'],
  subcategory: ['二级分类', '子分类', 'subcategory'],
  note: ['备注', 'note', 'memo'],
  tags: ['标签', 'tags'],
  book: ['账本', 'book', 'bookname'],
}

class ImportService {
  async importFile(file: File, bookId: string): Promise<ImportResult> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const text = ext === 'xlsx' || ext === 'xls' ? '' : await file.text()

    let rows: ParsedImportRow[] = []
    if (ext === 'json') {
      return this.importJson(text, bookId)
    }
    if (ext === 'csv') {
      rows = this.parseCsvRows(text)
    } else if (ext === 'txt') {
      rows = this.parseTxtRows(text)
    } else if (ext === 'xlsx' || ext === 'xls') {
      rows = await this.parseExcelRows(file)
    } else {
      throw new Error('不支持的文件格式，请使用 JSON / CSV / TXT / Excel')
    }

    return this.importRows(rows, bookId)
  }

  async importJson(text: string, bookId: string): Promise<ImportResult> {
    let bundle: ExportBundle
    try {
      bundle = JSON.parse(text) as ExportBundle
    } catch {
      throw new Error('JSON 格式无效')
    }

    if (bundle.app !== 'golden-toad-accounting' || !Array.isArray(bundle.transactions)) {
      throw new Error('不是有效的金蝉记账备份文件')
    }

    if (bundle.version !== EXPORT_VERSION) {
      // allow import from same major structure
    }

    const currentBook = await bookRepository.getById(bookId)
    if (!currentBook) throw new Error('账本不存在')

    const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
    const targetBookName = currentBook.name

    for (const row of bundle.transactions) {
      if (row.bookName && row.bookName !== targetBookName && bundle.books.length > 1) {
        result.skipped++
        continue
      }
      try {
        await this.createFromParsedRow(
          {
            type: row.type,
            amountYuan: row.amountYuan,
            category: row.category,
            subcategory: row.subcategory,
            date: row.date,
            time: row.time,
            note: row.note,
            tags: row.tags,
          },
          bookId,
        )
        result.imported++
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : '导入失败')
        result.skipped++
      }
    }

    return result
  }

  async importRows(rows: ParsedImportRow[], bookId: string): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] }

    for (const row of rows) {
      try {
        await this.createFromParsedRow(row, bookId)
        result.imported++
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : '导入失败')
        result.skipped++
      }
    }

    return result
  }

  private async createFromParsedRow(row: ParsedImportRow, bookId: string): Promise<void> {
    const { categoryId, subcategoryId } = await this.resolveCategory(
      bookId,
      row.type,
      row.category,
      row.subcategory,
    )

    await recordService.create({
      bookId,
      type: row.type,
      amountYuan: row.amountYuan,
      categoryId,
      subcategoryId,
      date: row.date,
      time: row.time || currentTimeString(),
      note: row.note,
      tagNames: row.tags,
    })
  }

  private async resolveCategory(
    bookId: string,
    type: TransactionType,
    categoryName: string,
    subcategoryName?: string,
  ): Promise<{ categoryId: string; subcategoryId: string | null }> {
    const name = categoryName.trim() || '未分类'
    const categories = await categoryRepository.listByBook(bookId, type)
    let parent = categories.find((c) => c.parentId === null && c.name === name)

    if (!parent) {
      parent = await categoryService.createParent(bookId, {
        name,
        type,
        icon: '📥',
      })
    }

    if (subcategoryName?.trim()) {
      let sub = categories.find((c) => c.parentId === parent!.id && c.name === subcategoryName.trim())
      if (!sub) {
        sub = await categoryService.createChild(bookId, parent.id, {
          name: subcategoryName.trim(),
          icon: '·',
        })
      }
      return { categoryId: parent.id, subcategoryId: sub.id }
    }

    return { categoryId: parent.id, subcategoryId: null }
  }

  parseCsvRows(text: string): ParsedImportRow[] {
    const table = parseCsv(text)
    if (table.length < 2) return []

    const header = table[0].map(normalizeHeader)
    const colIndex = (key: keyof typeof HEADER_ALIASES): number => {
      const aliases = HEADER_ALIASES[key].map(normalizeHeader)
      return header.findIndex((h) => aliases.includes(h))
    }

    const idx = {
      date: colIndex('date'),
      time: colIndex('time'),
      type: colIndex('type'),
      amount: colIndex('amount'),
      category: colIndex('category'),
      subcategory: colIndex('subcategory'),
      note: colIndex('note'),
      tags: colIndex('tags'),
    }

    if (idx.date < 0 || idx.amount < 0 || idx.category < 0) {
      throw new Error('CSV 缺少必要列：日期、金额、分类')
    }

    return table.slice(1).map((cells) => this.cellsToRow(cells, idx)).filter(Boolean) as ParsedImportRow[]
  }

  parseTxtRows(text: string): ParsedImportRow[] {
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim())
    const rows: ParsedImportRow[] = []

    for (const line of lines) {
      const parsed = this.parseTxtLine(line.trim())
      if (parsed) rows.push(parsed)
    }
    return rows
  }

  private parseTxtLine(line: string): ParsedImportRow | null {
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s+(支出|收入|expense|income)\s+¥?([\d,.]+)\s+(.+?)(?:\s+#([\w\u4e00-\u9fa5、]+))?(?:\s+\[(.+?)])?\s*$/,
    )
    if (!match) return null

    const [, date, time, typeRaw, amount, categoryPart, tagsRaw] = match
    const type: TransactionType =
      typeRaw === '收入' || typeRaw === 'income' ? 'income' : 'expense'
    const [category, subcategory] = categoryPart.includes('·')
      ? categoryPart.split('·', 2)
      : [categoryPart.trim(), undefined]

    return {
      date,
      time: time.length === 4 ? `0${time}` : time,
      type,
      amountYuan: amount.replace(/,/g, ''),
      category: category.trim(),
      subcategory: subcategory?.trim(),
      tags: tagsRaw?.split('、').filter(Boolean),
    }
  }

  private async parseExcelRows(file: File): Promise<ParsedImportRow[]> {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return []
    const sheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

    const rows: ParsedImportRow[] = []
    for (const row of json) {
      const get = (...keys: string[]) => {
        for (const key of keys) {
          if (row[key] !== undefined && row[key] !== '') return String(row[key]).trim()
        }
        return ''
      }
      const typeRaw = get('类型', 'type')
      const type: TransactionType =
        typeRaw === '收入' || typeRaw === 'income' ? 'income' : 'expense'
      const category = get('一级分类', '分类', 'category')
      const amount = get('金额', 'amount')
      const date = get('日期', 'date')
      if (!date || !amount || !category) continue
      rows.push({
        date,
        time: get('时间', 'time') || '12:00',
        type,
        amountYuan: amount,
        category,
        subcategory: get('二级分类', '子分类', 'subcategory') || undefined,
        note: get('备注', 'note') || undefined,
        tags: get('标签', 'tags')
          .split(/[、,]/)
          .map((t) => t.trim())
          .filter(Boolean),
      })
    }
    return rows
  }

  private cellsToRow(
    cells: string[],
    idx: Record<string, number>,
  ): ParsedImportRow | null {
    const get = (key: string) => {
      const i = idx[key]
      return i >= 0 ? cells[i]?.trim() ?? '' : ''
    }

    const date = get('date')
    const amount = get('amount')
    const category = get('category')
    if (!date || !amount || !category) return null

    const typeRaw = get('type')
    const type: TransactionType =
      typeRaw === '收入' || typeRaw === 'income' ? 'income' : 'expense'

    const tagsRaw = get('tags')
    return {
      date,
      time: get('time') || '12:00',
      type,
      amountYuan: amount,
      category,
      subcategory: get('subcategory') || undefined,
      note: get('note') || undefined,
      tags: tagsRaw
        ? tagsRaw.split(/[、,]/).map((t) => t.trim()).filter(Boolean)
        : undefined,
    }
  }

  async clearAllData(): Promise<void> {
    const [aiSettings, theme] = await Promise.all([
      settingsRepository.getAiSettings(),
      settingsRepository.getTheme(),
    ])

    await resetDatabase()
    await runMigrations()

    await settingsRepository.setTheme(theme)
    if (aiSettings.apiKey) {
      await settingsRepository.saveAiSettings(aiSettings)
    }
  }
}

export const importService = new ImportService()
