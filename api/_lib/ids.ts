import { createHash, randomInt } from 'node:crypto'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GUEST_ID_RE = /^guest_[a-zA-Z0-9_-]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function userFolderId(email: string): string {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex').slice(0, 32)
}

/** 邮箱用户或游客本地 ID，用于试用额度追踪 */
export function resolveTrialUserKey(
  body: Record<string, unknown>,
  emailHeader = '',
  userIdHeader = '',
): string | null {
  const rawUserId = String(body.userId ?? userIdHeader ?? '').trim()
  if (GUEST_ID_RE.test(rawUserId)) return rawUserId
  const email = normalizeEmail(String(body.email ?? emailHeader ?? ''))
  if (EMAIL_RE.test(email)) return userFolderId(email)
  return null
}

export function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${normalizeEmail(email)}:${code.trim()}`).digest('hex')
}

export function generateVerificationCode(): string {
  return String(randomInt(100_000, 1_000_000))
}
