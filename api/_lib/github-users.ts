import type { PendingRecord, UserProfile } from './types'

interface GithubFile {
  sha: string
  content?: string
}

function repoParts(env: Record<string, string>) {
  const owner = env.GITHUB_REPO_OWNER || 'WangK1628'
  const repo = env.GITHUB_REPO_NAME || 'GoldenToadAccouting.io'
  const branch = env.GITHUB_USERS_BRANCH || 'main'
  const root = (env.GITHUB_USERS_DIR || 'data/users').replace(/\/$/, '')
  const token = env.GITHUB_TOKEN || env.GH_TOKEN || ''
  return { owner, repo, branch, root, token }
}

export function hasGithubToken(env: Record<string, string>): boolean {
  return Boolean(env.GITHUB_TOKEN || env.GH_TOKEN)
}

function requireToken(env: Record<string, string>): string {
  const { token } = repoParts(env)
  if (!token) throw new Error('用户库暂不可用')
  return token
}

async function github(
  env: Record<string, string>,
  method: string,
  apiPath: string,
  body?: unknown,
): Promise<Response> {
  const { owner, repo } = repoParts(env)
  const token = requireToken(env)
  return fetch(`https://api.github.com/repos/${owner}/${repo}${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'golden-toad-accounting',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function getFile(env: Record<string, string>, filePath: string): Promise<GithubFile | null> {
  const { branch } = repoParts(env)
  const response = await github(
    env,
    'GET',
    `/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
  )
  if (response.status === 404) return null
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`GitHub 读取失败 (${response.status}) ${detail.slice(0, 180)}`)
  }
  return (await response.json()) as GithubFile
}

function decodeContent(file: GithubFile): string {
  const raw = (file.content ?? '').replace(/\n/g, '')
  return Buffer.from(raw, 'base64').toString('utf8')
}

async function putFile(
  env: Record<string, string>,
  filePath: string,
  json: unknown,
  message: string,
  sha?: string,
): Promise<void> {
  const { branch } = repoParts(env)
  const payload: Record<string, string> = {
    message,
    content: Buffer.from(JSON.stringify(json, null, 2), 'utf8').toString('base64'),
    branch,
  }
  if (sha) payload.sha = sha
  const response = await github(env, 'PUT', `/contents/${filePath}`, payload)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`GitHub 写入失败 (${response.status}) ${detail.slice(0, 180)}`)
  }
}

async function deleteFile(
  env: Record<string, string>,
  filePath: string,
  sha: string,
  message: string,
): Promise<void> {
  const { branch } = repoParts(env)
  const response = await github(env, 'DELETE', `/contents/${filePath}`, { message, sha, branch })
  if (!response.ok && response.status !== 404) {
    const detail = await response.text()
    throw new Error(`GitHub 删除失败 (${response.status}) ${detail.slice(0, 180)}`)
  }
}

export function profilePath(env: Record<string, string>, userId: string): string {
  return `${repoParts(env).root}/${userId}/profile.json`
}

export function pendingPath(env: Record<string, string>, userId: string): string {
  return `${repoParts(env).root}/_pending/${userId}.json`
}

export async function readProfile(
  env: Record<string, string>,
  userId: string,
): Promise<UserProfile | null> {
  const file = await getFile(env, profilePath(env, userId))
  if (!file) return null
  return JSON.parse(decodeContent(file)) as UserProfile
}

export async function upsertProfile(
  env: Record<string, string>,
  profile: UserProfile,
  message: string,
): Promise<void> {
  const path = profilePath(env, profile.id)
  const existing = await getFile(env, path)
  await putFile(env, path, profile, message, existing?.sha)
}

export async function writePending(
  env: Record<string, string>,
  userId: string,
  record: PendingRecord,
): Promise<void> {
  const path = pendingPath(env, userId)
  const existing = await getFile(env, path)
  await putFile(env, path, record, `chore(users): pending code ${userId.slice(0, 8)}`, existing?.sha)
}

export async function readPending(
  env: Record<string, string>,
  userId: string,
): Promise<PendingRecord | null> {
  const file = await getFile(env, pendingPath(env, userId))
  if (!file) return null
  return JSON.parse(decodeContent(file)) as PendingRecord
}

export async function deletePending(env: Record<string, string>, userId: string): Promise<void> {
  const path = pendingPath(env, userId)
  const existing = await getFile(env, path)
  if (!existing) return
  await deleteFile(env, path, existing.sha, `chore(users): clear pending ${userId.slice(0, 8)}`)
}
