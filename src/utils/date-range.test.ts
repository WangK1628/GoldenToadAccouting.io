import { describe, expect, it } from 'vitest'
import { addDays, datesOfWeek, elapsedWeekDates, resolveDateRange, shiftAnchor } from '@/utils/date-range'

describe('date-range', () => {
  it('resolves day range', () => {
    const range = resolveDateRange('day', '2026-08-20')
    expect(range.from).toBe('2026-08-20')
    expect(range.to).toBe('2026-08-20')
    expect(range.label).toContain('8月20日')
  })

  it('resolves week range from monday', () => {
    const range = resolveDateRange('week', '2026-08-20')
    expect(range.from).toBe('2026-08-17')
    expect(range.to).toBe('2026-08-23')
  })

  it('resolves month range', () => {
    const range = resolveDateRange('month', '2026-08-15')
    expect(range.from).toBe('2026-08-01')
    expect(range.to).toBe('2026-08-31')
  })

  it('shifts anchor by month', () => {
    expect(shiftAnchor('month', '2026-08-15', -1)).toBe('2026-07-15')
    expect(shiftAnchor('month', '2026-08-15', 1)).toBe('2026-09-15')
  })

  it('lists only this week up to today, newest first', () => {
    const dates = datesOfWeek('2026-08-20')
    expect(dates).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ])
    expect(elapsedWeekDates(dates, '2026-08-20')).toEqual([
      '2026-08-20',
      '2026-08-19',
      '2026-08-18',
      '2026-08-17',
    ])
  })

  it('adds days across month boundary', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
  })
})
