import { describe, expect, it } from 'vitest'
import { parseHnUserExists } from './hnUser'

describe('HN user existence responses', () => {
  it('recognizes present and missing users', () => {
    expect(parseHnUserExists({ id: true, karma: true })).toBe(true)
    expect(parseHnUserExists(null)).toBe(false)
  })

  it('rejects unexpected upstream payloads', () => {
    expect(() => parseHnUserExists({})).toThrow('Unexpected HN Firebase user response')
    expect(() => parseHnUserExists('present')).toThrow('Unexpected HN Firebase user response')
  })
})
