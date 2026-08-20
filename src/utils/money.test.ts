import { describe, expect, it } from 'vitest'
import {
  addCents,
  centsToYuanString,
  formatSignedAmount,
  sumCents,
  yuanToCents,
} from '@/utils/money'

describe('money', () => {
  it('converts yuan to cents as integers', () => {
    expect(yuanToCents('32.5')).toBe(3250)
    expect(yuanToCents(0.1)).toBe(10)
  })

  it('rejects invalid amounts', () => {
    expect(() => yuanToCents('abc')).toThrow('Invalid amount')
  })

  it('formats cents to yuan string', () => {
    expect(centsToYuanString(3250)).toBe('32.50')
    expect(centsToYuanString(0)).toBe('0.00')
  })

  it('formats signed amounts', () => {
    expect(formatSignedAmount('expense', 100)).toBe('-¥1.00')
    expect(formatSignedAmount('income', 100)).toBe('+¥1.00')
  })

  it('sums cents without float drift', () => {
    expect(sumCents([100, 250, 50])).toBe(400)
    expect(addCents(100, 200)).toBe(300)
  })
})
