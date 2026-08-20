import { createHash, randomInt } from 'node:crypto'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function userFolderId(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 32)
}

export function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${normalizeEmail(email)}:${code.trim()}`).digest('hex')
}

export function generateVerificationCode(): string {
  return String(randomInt(100_000, 1_000_000))
}
