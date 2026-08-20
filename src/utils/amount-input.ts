/** 金额键盘输入：仅数字与一个小数点，最多两位小数 */
export function appendAmountKey(current: string, key: string): string {
  if (key === 'del') {
    return current.slice(0, -1)
  }
  if (key === '.') {
    if (current.includes('.')) return current
    return current ? `${current}.` : '0.'
  }
  if (!/^\d$/.test(key)) return current

  const [whole, frac = ''] = current.split('.')
  if (current.includes('.') && frac.length >= 2) return current
  if (!current.includes('.') && whole.length >= 8) return current
  return current + key
}

export function formatAmountDisplay(amountYuan: string): string {
  if (!amountYuan) return '0'
  return amountYuan
}
