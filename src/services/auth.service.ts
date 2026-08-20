import { settingsRepository, userRepository } from '@/repositories'
import { createPasswordHash, hashPassword } from '@/utils/crypto'
import { isValidEmail, normalizeEmail } from '@/utils/email'
import { createId } from '@/utils/id'
import { apiUrl } from '@/utils/api-url'
import { ADMIN_ACCOUNT, isAdminAccount } from '@/constants/admin'
import { SETTING_KEYS, type AuthMode, type AuthSession } from '@/models'

export interface SendCodeResult {
  sent: boolean
  message: string
}

type CodePurpose = 'login' | 'register' | 'reset'

class AuthService {
  emailEnabled(): boolean {
    return import.meta.env.VITE_EMAIL_ENABLED !== 'false'
  }

  async getSession(): Promise<AuthSession | null> {
    const raw = await settingsRepository.get(SETTING_KEYS.authSession)
    if (!raw) return null
    try {
      const session = JSON.parse(raw) as AuthSession
      if (session.mode === 'guest' && !session.userId) {
        session.userId = createId('guest')
        await this.saveSession(session)
      }
      return session
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
    const raw = await settingsRepository.get(SETTING_KEYS.authSession)
    let userId = createId('guest')
    if (raw) {
      try {
        const existing = JSON.parse(raw) as AuthSession
        if (existing.mode === 'guest' && existing.userId) {
          userId = existing.userId
        }
      } catch {
        // ignore broken session payload
      }
    }
    const session: AuthSession = {
      mode: 'guest',
      userId,
      email: null,
      displayName: '游客',
    }
    await this.saveSession(session)
    await this.ensureFirstLaunchReward()
    return session
  }

  private async ensureFirstLaunchReward(): Promise<void> {
    const granted = await settingsRepository.get(SETTING_KEYS.firstLaunchReward)
    if (granted === '1') return
    const points = await settingsRepository.getAiPoints()
    if (points === 0) {
      await settingsRepository.grantGuideRewardPoints()
    }
    await settingsRepository.set(SETTING_KEYS.firstLaunchReward, '1')
  }

  private sessionFromUser(user: { id: string; email: string; displayName: string }): AuthSession {
    const admin = isAdminAccount(user.email)
    return {
      mode: admin ? 'admin' : 'registered',
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    }
  }

  async ensureAdminUser(): Promise<void> {
    const existing = await userRepository.getByEmail(ADMIN_ACCOUNT.email)
    if (existing) return
    const { hash, salt } = await createPasswordHash(ADMIN_ACCOUNT.password)
    await userRepository.create({
      email: ADMIN_ACCOUNT.email,
      displayName: ADMIN_ACCOUNT.displayName,
      passwordHash: hash,
      salt,
    })
  }

  private apiUrl(path: string): string {
    return apiUrl(path)
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

    try {
      const payload = await this.postApi('/send-code', { email: normalized, purpose })
      await settingsRepository.set(SETTING_KEYS.emailPending, '')
      return {
        sent: true,
        message: String(payload.message || '验证码已发送，请查收邮箱'),
      }
    } catch {
      return this.sendLocalCode(normalized, purpose)
    }
  }

  private async hashEmailCode(email: string, code: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${email}|${code}`))
    return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  private async sendLocalCode(email: string, purpose: CodePurpose): Promise<SendCodeResult> {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const record = {
      email,
      purpose,
      codeHash: await this.hashEmailCode(email, code),
      expiresAt: Date.now() + 5 * 60 * 1000,
    }
    await settingsRepository.set(SETTING_KEYS.emailPending, JSON.stringify(record))

    const title =
      purpose === 'reset' ? '重置密码验证码' : purpose === 'register' ? '注册验证码' : '登录验证码'
    const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: `金蝉记账 ${title}`,
        _template: 'box',
        _captcha: 'false',
        message: `您的${title}是 ${code}，5 分钟内有效。如非本人操作请忽略。`,
      }),
    })
    const payload = (await response.json().catch(() => null)) as { success?: string | boolean } | null
    const ok = payload?.success === true || payload?.success === 'true'
    if (!response.ok || !ok) {
      await settingsRepository.set(SETTING_KEYS.emailPending, '')
      throw new Error('验证码发送失败，请稍后重试')
    }

    return { sent: true, message: '验证码已发送，请查收邮箱' }
  }

  private async verifyLocal(email: string, code: string, purpose: CodePurpose): Promise<boolean> {
    const raw = await settingsRepository.get(SETTING_KEYS.emailPending)
    if (!raw) return false
    try {
      const pending = JSON.parse(raw) as {
        email?: string
        purpose?: string
        codeHash?: string
        expiresAt?: number
      }
      if (pending.email !== email || pending.purpose !== purpose) return false
      if (!pending.expiresAt || pending.expiresAt < Date.now()) return false
      const hash = await this.hashEmailCode(email, code)
      if (hash !== pending.codeHash) return false
      await settingsRepository.set(SETTING_KEYS.emailPending, '')
      return true
    } catch {
      return false
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

  private async verifyCode(email: string, code: string, purpose: CodePurpose): Promise<void> {
    try {
      await this.verifyRemote(email, code, purpose)
    } catch (error) {
      if (await this.verifyLocal(email, code, purpose)) {
        if (purpose !== 'reset') await settingsRepository.setAiTrialAvailable(false)
        return
      }
      throw error
    }
  }

  async register(email: string, password: string, code: string): Promise<AuthSession> {
    const normalized = normalizeEmail(email)
    if (!isValidEmail(normalized)) throw new Error('请输入有效邮箱')
    if (password.length < 6) throw new Error('密码至少 6 位')

    const existing = await userRepository.getByEmail(normalized)
    if (existing) throw new Error('该邮箱已注册，请直接登录')

    await this.verifyCode(normalized, code, 'register')

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

  async loginWithPassword(account: string, password: string): Promise<AuthSession> {
    if (isAdminAccount(account)) {
      await this.ensureAdminUser()
      const user = await userRepository.getByEmail(ADMIN_ACCOUNT.email)
      if (!user) throw new Error('账号不存在')
      const hash = await hashPassword(password, user.salt)
      if (hash !== user.passwordHash) throw new Error('密码错误')
      const session = this.sessionFromUser(user)
      await this.saveSession(session)
      return session
    }

    const normalized = normalizeEmail(account)
    if (!isValidEmail(normalized)) throw new Error('请输入有效邮箱或管理员账号')
    let user = await userRepository.getByEmail(normalized)
    if (!user) {
      if (password.length < 6) throw new Error('密码至少 6 位')
      const { hash, salt } = await createPasswordHash(password)
      user = await userRepository.create({
        email: normalized,
        displayName: normalized.split('@')[0] ?? '用户',
        passwordHash: hash,
        salt,
      })
    } else {
      const hash = await hashPassword(password, user.salt)
      if (hash !== user.passwordHash) throw new Error('密码错误')
    }

    const session = this.sessionFromUser(user)
    await this.saveSession(session)
    return session
  }

  async loginWithCode(email: string, code: string): Promise<AuthSession> {
    const normalized = normalizeEmail(email)
    if (!isValidEmail(normalized)) throw new Error('请输入有效邮箱')
    await this.verifyCode(normalized, code, 'login')

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
    await this.verifyCode(normalized, code, 'reset')

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
