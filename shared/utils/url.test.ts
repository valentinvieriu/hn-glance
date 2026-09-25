import { describe, expect, it } from 'vitest'
import { getUrlDomain } from './url'

describe('getUrlDomain', () => {
  it('strips a leading www and falls back for missing or invalid URLs', () => {
    expect(getUrlDomain('https://www.example.com/a', 'source')).toBe('example.com')
    expect(getUrlDomain('https://docs.example.com', 'source')).toBe('docs.example.com')
    expect(getUrlDomain('', 'Hacker News')).toBe('Hacker News')
    expect(getUrlDomain('not a url', 'source')).toBe('source')
  })
})
