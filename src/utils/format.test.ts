import { describe, expect, it } from 'vitest'
import { datesForWeekdayInMonth, weekdayIndex } from '@/utils/format'

describe('weekday helpers', () => {
  it('maps Thursday 2026-08-20 to index 3', () => {
    expect(weekdayIndex('2026-08-20')).toBe(3)
  })

  it('lists Thursdays in August 2026', () => {
    expect(datesForWeekdayInMonth('2026-08', 3)).toEqual([
      '2026-08-06',
      '2026-08-13',
      '2026-08-20',
      '2026-08-27',
    ])
  })
})
