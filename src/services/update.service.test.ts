import { describe, expect, it } from 'vitest'
import { isNewerVersion, parseVersion } from '@/services/update.service'

describe('update.service', () => {
  it('parses version tags', () => {
    expect(parseVersion('v0.3.0')).toEqual([0, 3, 0])
    expect(parseVersion('0.3.1')).toEqual([0, 3, 1])
  })

  it('detects newer releases', () => {
    expect(isNewerVersion('v0.4.0', '0.3.0')).toBe(true)
    expect(isNewerVersion('v0.3.0', '0.3.0')).toBe(false)
    expect(isNewerVersion('v0.2.9', '0.3.0')).toBe(false)
  })
})
