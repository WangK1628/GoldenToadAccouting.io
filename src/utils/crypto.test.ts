import { describe, expect, it } from 'vitest'
import { createPasswordHash, hashPassword } from '@/utils/crypto'

describe('crypto', () => {
  it('hashes password consistently with same salt', async () => {
    const { hash, salt } = await createPasswordHash('secret123')
    const again = await hashPassword('secret123', salt)
    expect(again).toBe(hash)
  })

  it('produces different hashes for different passwords', async () => {
    const a = await createPasswordHash('alpha')
    const b = await createPasswordHash('beta')
    expect(a.hash).not.toBe(b.hash)
  })
})
