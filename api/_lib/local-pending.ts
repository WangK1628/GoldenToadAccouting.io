import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PendingRecord } from './types'

function pendingDir(): string {
  if (process.env.VERCEL) return join('/tmp', 'goldentoad-pending')
  return join(process.cwd(), 'data', 'users', '_pending')
}

function pendingFile(userId: string): string {
  return join(pendingDir(), `${userId}.json`)
}

export async function writeLocalPending(userId: string, record: PendingRecord): Promise<void> {
  await mkdir(pendingDir(), { recursive: true })
  await writeFile(pendingFile(userId), JSON.stringify(record), 'utf8')
}

export async function readLocalPending(userId: string): Promise<PendingRecord | null> {
  try {
    const raw = await readFile(pendingFile(userId), 'utf8')
    return JSON.parse(raw) as PendingRecord
  } catch {
    return null
  }
}

export async function deleteLocalPending(userId: string): Promise<void> {
  try {
    await unlink(pendingFile(userId))
  } catch {
    // ignore
  }
}
