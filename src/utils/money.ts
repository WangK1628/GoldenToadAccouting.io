const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 分 → 元字符串，如 3250 → "32.50" */
export function centsToYuanString(cents: number): string {
  return CURRENCY_FORMATTER.format(cents / 100)
}

/** 分 → 带符号展示，如 expense 3250 → "-¥32.50" */
export function formatSignedAmount(type: 'expense' | 'income', cents: number): string {
  const sign = type === 'expense' ? '-' : '+'
  return `${sign}¥${centsToYuanString(Math.abs(cents))}`
}

/** 元字符串/数字 → 分（整数） */
export function yuanToCents(yuan: number | string): number {
  const value = typeof yuan === 'string' ? Number.parseFloat(yuan) : yuan
  if (!Number.isFinite(value)) {
    throw new Error('Invalid amount')
  }
  return Math.round(value * 100)
}

/** 分 + 分，避免浮点误差 */
export function addCents(a: number, b: number): number {
  return a + b
}

export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}
