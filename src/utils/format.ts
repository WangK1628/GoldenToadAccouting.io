const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year}年${Number.parseInt(month ?? '1', 10)}月`
}

export function formatMonthDay(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number.parseInt(month ?? '1', 10)}月${Number.parseInt(day ?? '1', 10)}日`
}

export function weekdayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  const idx = (d.getDay() + 6) % 7
  return WEEKDAY_LABELS[idx] ?? ''
}

export function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map((v) => Number.parseInt(v, 10))
  return new Date(y, m, 0).getDate()
}
