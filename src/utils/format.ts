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

export function formatDayGroupTitle(date: string): string {
  return `${formatMonthDay(date)}(${weekdayLabel(date)})`
}

export function weekdayIndex(date: string): number {
  const d = new Date(`${date}T12:00:00`)
  return (d.getDay() + 6) % 7
}

export function datesForWeekdayInMonth(yearMonth: string, weekday: number): string[] {
  const [y, m] = yearMonth.split('-').map((v) => Number.parseInt(v, 10))
  const year = y ?? new Date().getFullYear()
  const month = (m ?? 1) - 1
  const last = new Date(year, month + 1, 0).getDate()
  const dates: string[] = []
  for (let day = 1; day <= last; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (weekdayIndex(date) === weekday) dates.push(date)
  }
  return dates
}

export const WEEKDAY_SHORT = WEEKDAY_LABELS

export function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map((v) => Number.parseInt(v, 10))
  return new Date(y, m, 0).getDate()
}
