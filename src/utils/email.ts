const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim().toLowerCase())
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function generateVerificationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(3))
  const num = (bytes[0]! << 16) | (bytes[1]! << 8) | bytes[2]!
  return String(100_000 + (num % 900_000))
}
