import { settingsRepository, userRepository } from '@/repositories'
import { createPasswordHash, generateVerificationCode, hashPassword } from '@/utils/crypto'
import { SETTING_KEYS, type AuthMode, type AuthSession } from '@/models'

const CODE_TTL_MS = 5 * 60 * 1000

interface PendingCode {
  code: string
  expiresAt: number
}

class AuthService {
  private pendingCodes = new Map<string, PendingCode>()

  async getSession(): Promise<AuthSession | null> {
    const raw = await settingsRepository.get(SETTING_KEYS.authSession)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthSession
    } catch {
      return null
    }
  }

  async saveSession(session: AuthSession): Promise<void> {
    await settingsRepository.set(SETTING_KEYS.authSession, JSON.stringify(session))
  }

  async clearSession(): Promise<void> {
    await settingsRepository.set(SETTING_KEYS.authSession, '')
  }

  async enterGuestMode(): Promise<AuthSession> {
    const session: AuthSession = {
      mode: 'guest',
      userId: null,
      email: null,
      displayName: '游客',
    }
    await this.saveSession(session)
    return session
  }

  async register(email: string, password: string): Promise<AuthSession> {
    const normalized = email.trim().toLowerCase()
    if (!normalized.includes('@')) throw new Error('请输入有效邮箱')
    if (password.length < 6) throw new Error('密码至少 6 位')

    const existing = await userRepository.getByEmail(normalized)
    if (existing) throw new Error('该邮箱已注册，请直接登录')

    const { hash, salt } = await createPasswordHash(password)
    const user = await userRepository.create({
      email: normalized,
      displayName: normalized.split('@')[0] ?? '用户',
      passwordHash: hash,
      salt,
    })

    const session: AuthSession = {
      mode: 'registered',
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    }
    await this.saveSession(session)
    return session
  }

  async loginWithPassword(email: string, password: string): Promise<AuthSession> {
    const normalized = email.trim().toLowerCase()
    const user = await userRepository.getByEmail(normalized)
    if (!user) throw new Error('账号不存在，请先注册')
    const hash = await hashPassword(password, user.salt)
    if (hash !== user.passwordHash) throw new Error('密码错误')

    const session: AuthSession = {
      mode: 'registered',
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    }
    await this.saveSession(session)
    return session
  }

  requestVerificationCode(email: string): string {
    const normalized = email.trim().toLowerCase()
    if (!normalized.includes('@')) throw new Error('请输入有效邮箱')
    const code = generateVerificationCode()
    this.pendingCodes.set(normalized, { code, expiresAt: Date.now() + CODE_TTL_MS })
    return code
  }

  async loginWithCode(email: string, code: string): Promise<AuthSession> {
    const normalized = email.trim().toLowerCase()
    const pending = this.pendingCodes.get(normalized)
    if (!pending || pending.expiresAt < Date.now()) throw new Error('验证码已过期，请重新获取')
    if (pending.code !== code.trim()) throw new Error('验证码错误')

    this.pendingCodes.delete(normalized)

    let user = await userRepository.getByEmail(normalized)
    if (!user) {
      const { hash, salt } = await createPasswordHash(code)
      user = await userRepository.create({
        email: normalized,
        displayName: normalized.split('@')[0] ?? '用户',
        passwordHash: hash,
        salt,
      })
    }

    const session: AuthSession = {
      mode: 'registered',
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    }
    await this.saveSession(session)
    return session
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const normalized = email.trim().toLowerCase()
    const pending = this.pendingCodes.get(normalized)
    if (!pending || pending.expiresAt < Date.now()) throw new Error('验证码已过期，请重新获取')
    if (pending.code !== code.trim()) throw new Error('验证码错误')
    if (newPassword.length < 6) throw new Error('密码至少 6 位')

    const user = await userRepository.getByEmail(normalized)
    if (!user) throw new Error('账号不存在')

    const { hash, salt } = await createPasswordHash(newPassword)
    await userRepository.updatePassword(user.id, hash, salt)
    this.pendingCodes.delete(normalized)
  }

  async logout(): Promise<void> {
    await this.clearSession()
  }
}

export const authService = new AuthService()

export type AuthModeType = AuthMode
