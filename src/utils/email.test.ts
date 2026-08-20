import { describe, expect, it } from 'vitest'
import { generateVerificationCode, isValidEmail, normalizeEmail } from '@/utils/email'

describe('email helpers', () => {
  it('accepts normal emails', () => {
    expect(isValidEmail('you@example.com')).toBe(true)
    expect(normalizeEmail('  You@Example.COM ')).toBe('you@example.com')
  })

  it('rejects invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
  })

  it('generates a 6-digit code', () => {
    expect(generateVerificationCode()).toMatch(/^\d{6}$/)
  })
})
