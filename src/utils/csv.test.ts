import { describe, expect, it } from 'vitest'
import { escapeCsvCell, parseCsv, toCsvContent } from '@/utils/csv'

describe('csv', () => {
  it('escapes commas and quotes', () => {
    expect(escapeCsvCell('hello')).toBe('hello')
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('"quote"')).toBe('"""quote"""')
  })

  it('round-trips simple rows', () => {
    const content = toCsvContent([
      ['日期', '金额'],
      ['2026-08-20', '32.50'],
    ])
    const parsed = parseCsv(content)
    expect(parsed).toEqual([
      ['日期', '金额'],
      ['2026-08-20', '32.50'],
    ])
  })

  it('parses quoted cells with commas', () => {
    const parsed = parseCsv('note,amount\n"午餐,公司",32.50')
    expect(parsed[1]).toEqual(['午餐,公司', '32.50'])
  })

  it('strips UTF-8 BOM', () => {
    const parsed = parseCsv('\uFEFFa,b\n1,2')
    expect(parsed[0]).toEqual(['a', 'b'])
  })
})
