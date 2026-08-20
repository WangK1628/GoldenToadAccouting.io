import {
  deletePending,
  hasGithubToken,
  readPending,
  readProfile,
  upsertProfile,
  writePending,
} from './github-users'
import {
  EMAIL_RE,
  generateVerificationCode,
  hashCode,
  normalizeEmail,
  resolveTrialUserKey,
  userFolderId,
} from './ids'
import { deleteLocalPending, readLocalPending, writeLocalPending } from './local-pending'
import { sendVerificationEmail } from './mail'
import type { ApiPurpose, ApiResult, PendingRecord, UserProfile } from './types'

const CODE_TTL_MS = 5 * 60 * 1000
const RATE_WINDOW_MS = 60_000
const recentSends = new Map<string, number>()
const memoryPending = new Map<string, PendingRecord>()
const memoryTrialUseCount = new Map<string, number>()
const MAX_TRIAL_USES = 3

function getTrialUseCount(userId: string, profile: UserProfile | null): number {
  if (memoryTrialUseCount.has(userId)) return memoryTrialUseCount.get(userId) ?? 0
  return profile?.trialUsed ? MAX_TRIAL_USES : 0
}

function json(status: number, body: Record<string, unknown>): ApiResult {
  return { status, json: body }
}

function parsePurpose(value: unknown): ApiPurpose {
  if (value === 'reset' || value === 'register') return value
  return 'login'
}

function asEnv(env: Record<string, string>): Record<string, string> {
  return env
}

async function persistPending(
  env: Record<string, string>,
  userId: string,
  record: PendingRecord,
): Promise<void> {
  memoryPending.set(userId, record)
  await writeLocalPending(userId, record).catch(() => undefined)
  if (!hasGithubToken(env)) return
  await writePending(env, userId, record).catch((error) => {
    console.error('[users:pending]', error)
  })
}

async function loadPending(
  env: Record<string, string>,
  userId: string,
): Promise<PendingRecord | null> {
  const local = memoryPending.get(userId) ?? (await readLocalPending(userId))
  if (local) return local
  if (!hasGithubToken(env)) return null
  try {
    return await readPending(env, userId)
  } catch {
    return null
  }
}

async function clearPending(env: Record<string, string>, userId: string): Promise<void> {
  memoryPending.delete(userId)
  await deleteLocalPending(userId)
  if (!hasGithubToken(env)) return
  await deletePending(env, userId).catch(() => undefined)
}

async function loadProfile(env: Record<string, string>, userId: string): Promise<UserProfile | null> {
  if (!hasGithubToken(env)) return null
  try {
    return await readProfile(env, userId)
  } catch {
    return null
  }
}

export async function handleSendCode(
  env: Record<string, string>,
  body: Record<string, unknown>,
): Promise<ApiResult> {
  const email = normalizeEmail(String(body.email ?? ''))
  const purpose = parsePurpose(body.purpose)
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: '请输入有效邮箱' })

  const last = recentSends.get(email) ?? 0
  if (Date.now() - last < RATE_WINDOW_MS) {
    return json(429, { ok: false, error: '发送太频繁，请稍后再试' })
  }

  const userId = userFolderId(email)
  if (purpose === 'reset' && hasGithubToken(asEnv(env))) {
    const profile = await loadProfile(asEnv(env), userId)
    if (!profile) return json(404, { ok: false, error: '该邮箱尚未注册' })
  }

  const code = generateVerificationCode()
  const record: PendingRecord = {
    email,
    codeHash: hashCode(email, code),
    purpose,
    expiresAt: Date.now() + CODE_TTL_MS,
  }
  await persistPending(asEnv(env), userId, record)

  try {
    await sendVerificationEmail(asEnv(env), email, code, purpose)
  } catch (error) {
    await clearPending(asEnv(env), userId)
    return json(502, {
      ok: false,
      error: error instanceof Error ? error.message : '验证码发送失败，请稍后重试',
    })
  }

  recentSends.set(email, Date.now())
  return json(200, { ok: true, message: '验证码已发送，请查收邮箱' })
}

export async function handleVerifyCode(
  env: Record<string, string>,
  body: Record<string, unknown>,
): Promise<ApiResult> {
  const email = normalizeEmail(String(body.email ?? ''))
  const code = String(body.code ?? '').trim()
  const purpose = parsePurpose(body.purpose)
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: '请输入有效邮箱' })
  if (!/^\d{6}$/.test(code)) return json(400, { ok: false, error: '验证码格式错误' })

  const userId = userFolderId(email)
  const pending = await loadPending(asEnv(env), userId)

  if (!pending || pending.expiresAt < Date.now()) {
    return json(400, { ok: false, error: '验证码已过期，请重新获取' })
  }
  if (pending.codeHash !== hashCode(email, code)) {
    return json(400, { ok: false, error: '验证码错误' })
  }

  await clearPending(asEnv(env), userId)

  const now = new Date().toISOString()
  let profile = await loadProfile(asEnv(env), userId)

  if (purpose === 'register' && profile) {
    return json(409, { ok: false, error: '该邮箱已注册，请直接登录' })
  }
  if (purpose === 'reset' && hasGithubToken(asEnv(env)) && !profile) {
    return json(404, { ok: false, error: '该邮箱尚未注册' })
  }

  if (!profile) {
    profile = {
      id: userId,
      email,
      createdAt: now,
      updatedAt: now,
      trialUsed: false,
    }
    if (hasGithubToken(asEnv(env))) {
      try {
        await upsertProfile(asEnv(env), profile, `chore(users): 新建用户 ${userId.slice(0, 8)}`)
      } catch (error) {
        console.error('[users:create]', error)
      }
    }
  }

  return json(200, {
    ok: true,
    userId,
    trialGranted: !profile.trialUsed,
  })
}

export async function handleAiTrial(
  env: Record<string, string>,
  body: Record<string, unknown>,
  emailHeader: string,
  userIdHeader = '',
): Promise<ApiResult> {
  const userId = resolveTrialUserKey(body, emailHeader, userIdHeader)
  if (!userId) return json(400, { ok: false, error: '缺少用户标识' })

  const apiKey = env.TRIAL_DEEPSEEK_API_KEY
  if (!apiKey) return json(403, { ok: false, error: '请先在设置中填写 API Key' })

  const profile = await loadProfile(asEnv(env), userId)
  const useCount = getTrialUseCount(userId, profile)
  if (useCount >= MAX_TRIAL_USES) {
    return json(403, {
      ok: false,
      error: '免费体验已用完（最多 3 次），请在设置中填写自己的 DeepSeek API Key',
    })
  }

  const baseUrl = (env.TRIAL_DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
  const model = env.TRIAL_DEEPSEEK_MODEL || 'deepseek-chat'
  const messages = body.messages
  const tools = body.tools
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: typeof body.model === 'string' ? body.model : model,
      messages,
      tools,
      tool_choice: Array.isArray(tools) && tools.length ? 'auto' : undefined,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
      stream: false,
    }),
  })

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null
  if (!response.ok) {
    const err = payload?.error as { message?: string } | undefined
    return json(response.status, {
      ok: false,
      error: err?.message || `试用请求失败 (${response.status})`,
    })
  }
  return json(200, payload ?? {})
}

export async function handleConsumeTrial(
  env: Record<string, string>,
  body: Record<string, unknown>,
  userIdHeader = '',
): Promise<ApiResult> {
  const userId = resolveTrialUserKey(body, '', userIdHeader)
  if (!userId) return json(400, { ok: false, error: '缺少用户标识' })

  const profile = await loadProfile(asEnv(env), userId)
  const nextCount = getTrialUseCount(userId, profile) + 1
  memoryTrialUseCount.set(userId, nextCount)

  if (!profile) return json(200, { ok: true, uses: nextCount })

  if (profile.trialUsed && nextCount >= MAX_TRIAL_USES) {
    return json(200, { ok: true, already: true, uses: nextCount })
  }

  if (nextCount >= MAX_TRIAL_USES) {
    profile.trialUsed = true
    profile.updatedAt = new Date().toISOString()
    if (hasGithubToken(asEnv(env))) {
      await upsertProfile(asEnv(env), profile, `chore(users): 消耗试用 ${userId.slice(0, 8)}`).catch(
        (error) => console.error('[users:trial]', error),
      )
    }
  }
  return json(200, { ok: true, uses: nextCount })
}
