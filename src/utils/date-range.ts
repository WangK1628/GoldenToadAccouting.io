export type StatsGranularity = 'day' | 'week' | 'month' | 'year' | 'custom'

export interface DateRange {
  from: string
  to: string
  label: string
}

function parseDate(date: string): Date {
  return new Date(`${date}T12:00:00`)
}

export function formatDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + days)
  return formatDateString(d)
}

function mondayOfWeek(date: string): string {
  const d = parseDate(date)
  const weekday = d.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  d.setDate(d.getDate() + diff)
  return formatDateString(d)
}

export function resolveDateRange(
  granularity: StatsGranularity,
  anchor: string,
  custom?: { from: string; to: string },
): DateRange {
  const d = parseDate(anchor)
  const y = d.getFullYear()
  const m = d.getMonth()

  switch (granularity) {
    case 'day':
      return {
        from: anchor,
        to: anchor,
        label: `${y}年${m + 1}月${d.getDate()}日`,
      }
    case 'week': {
      const from = mondayOfWeek(anchor)
      const to = addDays(from, 6)
      const [, fm, fd] = from.split('-').map((v) => Number.parseInt(v, 10))
      const [, tm, td] = to.split('-').map((v) => Number.parseInt(v, 10))
      return {
        from,
        to,
        label: `${y}年${fm}月${fd}日 - ${tm}月${td}日`,
      }
    }
    case 'month': {
      const ym = anchor.slice(0, 7)
      const lastDay = new Date(y, m + 1, 0).getDate()
      return {
        from: `${ym}-01`,
        to: `${ym}-${String(lastDay).padStart(2, '0')}`,
        label: `${y}年${m + 1}月`,
      }
    }
    case 'year':
      return {
        from: `${y}-01-01`,
        to: `${y}-12-31`,
        label: `${y}年`,
      }
    case 'custom': {
      const from = custom?.from ?? anchor
      const to = custom?.to ?? anchor
      return { from, to, label: `${from} 至 ${to}` }
    }
  }
}

export function shiftAnchor(
  granularity: StatsGranularity,
  anchor: string,
  delta: number,
): string {
  if (granularity === 'custom') return anchor

  const d = parseDate(anchor)
  switch (granularity) {
    case 'day':
      d.setDate(d.getDate() + delta)
      break
    case 'week':
      d.setDate(d.getDate() + delta * 7)
      break
    case 'month':
      d.setMonth(d.getMonth() + delta)
      break
    case 'year':
      d.setFullYear(d.getFullYear() + delta)
      break
  }
  return formatDateString(d)
}

export function yearMonthFromAnchor(anchor: string): string {
  return anchor.slice(0, 7)
}
