import { settingsRepository, userRepository } from '@/repositories'
import { createPasswordHash, hashPassword } from '@/utils/crypto'
import { isValidEmail, normalizeEmail } from '@/utils/email'
import { SETTING_KEYS, type AuthMode, type AuthSession } from '@/models'

export interface SendCodeResult {
  sent: boolean
  message: string
}

type CodePurpose = 'login' | 'register' | 'reset'

class AuthService {
  emailEnabled(): boolean {
    return import.meta.env.VITE_EMAIL_ENABLED === 'true'
  }

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

  private sessionFromUser(user: { id: string; email: string; displayName: string }): AuthSession {
    return {
      mode: 'registered',
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    }
  }

  private apiUrl(path: string): string {
    const root = (import.meta.env.VITE_EMAIL_API_URL || '/api/send-code').replace(/\/send-code$/, '')
    return `${root}${path}`
  }

  private async postApi(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch(this.apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!response.ok || payload?.ok === false) {
      throw new Error(String(payload?.error || '服务请求失败'))
    }
    return payload ?? {}
  }

  async sendVerificationCode(
    email: string,
    purpose: CodePurpose = 'login',
  ): Promise<SendCodeResult> {
    const normalized = normalizeEmail(email)
    if (!isValidEmail(normalized)) throw new Error('请输入有效邮箱')
    if (!this.emailEnabled()) {
      throw new Error('验证码发送失败，请稍后重试')
    }

    const payload = await this.postApi('/send-code', { email: normalized, purpose })
    return {
      sent: true,
      message: String(payload.message || '验证码已发送，请查收邮箱'),
    }
  }

  private async verifyRemote(
    email: string,
    code: string,
    purpose: CodePurpose,
  ): Promise<boolean> {
    const payload = await this.postApi('/verify-code', { email, code, purpose })
    const trialGranted = payload.trialGranted === true
    if (purpose !== 'reset') {
      await settingsRepository.setAiTrialAvailable(trialGranted)
    }
    return trialGranted
  }

  async register(email: string, password: string, code: string): Promise<AuthSession> {
    const normalized = normalizeEmail(email)
    if (!isValidEmail(normalized)) throw new Error('请输入有效邮箱')
    if (password.length < 6) throw new Error('密码至少 6 位')

    const existing = await userRepository.getByEmail(normalized)
    if (existing) throw new Error('该邮箱已注册，请直接登录')

    await this.verifyRemote(normalized, code, 'register')

    const { hash, salt } = await createPasswordHash(password)
    const user = await userRepository.create({
      email: normalized,
      displayName: normalized.split('@')[0] ?? '用户',
      passwordHash: hash,
      salt,
    })

    const session = this.sessionFromUser(user)
    await this.saveSession(session)
    return session
  }

  async loginWithPassword(email: string, password: string): Promise<AuthSession> {
    const normalized = normalizeEmail(email)
    if (!isValidEmail(normalized)) throw new Error('请输入有效邮箱')
    const user = await userRepository.getByEmail(normalized)
    if (!user) throw new Error('账号不存在，请先注册')
    const hash = await hashPassword(password, user.salt)
    if (hash !== user.passwordHash) throw new Error('密码错误')

    const session = this.sessionFromUser(user)
    await this.saveSession(session)
    return session
  }

  async loginWithCode(email: string, code: string): Promise<AuthSession> {
    const normalized = normalizeEmail(email)
    if (!isValidEmail(normalized)) throw new Error('请输入有效邮箱')
    await this.verifyRemote(normalized, code, 'login')

    let user = await userRepository.getByEmail(normalized)
    if (!user) {
      const { hash, salt } = await createPasswordHash(crypto.randomUUID())
      user = await userRepository.create({
        email: normalized,
        displayName: normalized.split('@')[0] ?? '用户',
        passwordHash: hash,
        salt,
      })
    }

    const session = this.sessionFromUser(user)
    await this.saveSession(session)
    return session
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const normalized = normalizeEmail(email)
    if (newPassword.length < 6) throw new Error('密码至少 6 位')
    await this.verifyRemote(normalized, code, 'reset')

    const user = await userRepository.getByEmail(normalized)
    if (!user) throw new Error('账号不存在')

    const { hash, salt } = await createPasswordHash(newPassword)
    await userRepository.updatePassword(user.id, hash, salt)
  }

  async logout(): Promise<void> {
    await this.clearSession()
  }
}

export const authService = new AuthService()

export type AuthModeType = AuthMode
