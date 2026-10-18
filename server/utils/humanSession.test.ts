import { describe, expect, it, vi } from 'vitest'
import { isHumanVerificationResponse, TURNSTILE_ACTION } from '#shared/utils/humanVerification'
import {
  createHumanSessionValue,
  HUMAN_SESSION_TTL_SECONDS,
  parseTurnstileHostnames,
  readHumanSessionValue,
  verifyTurnstileToken,
} from './humanSession'

const SECRET = 'turnstile-secret'

const siteverify = (body: unknown, init: ResponseInit = {}) => {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), init))
}

describe('human session cookie', () => {
  it('accepts its own unexpired signature', async () => {
    const { value, sessionId } = await createHumanSessionValue(SECRET, 1_000_000)

    await expect(readHumanSessionValue(SECRET, value, 1_000_000)).resolves.toBe(sessionId)
  })

  it('rejects expired, re-signed, tampered, and malformed values', async () => {
    const now = 1_000_000
    const { value } = await createHumanSessionValue(SECRET, now)
    const [version, sessionId, expiresAt, signature] = value.split('.')

    await expect(readHumanSessionValue(SECRET, value, now + HUMAN_SESSION_TTL_SECONDS * 1000)).resolves.toBeNull()
    await expect(readHumanSessionValue('other-secret', value, now)).resolves.toBeNull()
    await expect(readHumanSessionValue(SECRET, `${version}.${sessionId}.${Number(expiresAt) + 60}.${signature}`, now)).resolves.toBeNull()
    await expect(readHumanSessionValue(SECRET, `${version}.other.${expiresAt}.${signature}`, now)).resolves.toBeNull()
    await expect(readHumanSessionValue(SECRET, `${value}.extra`, now)).resolves.toBeNull()
    await expect(readHumanSessionValue(SECRET, 'v1.id.123.%%%', now)).resolves.toBeNull()
    await expect(readHumanSessionValue(SECRET, undefined, now)).resolves.toBeNull()
  })
})

describe('verifyTurnstileToken', () => {
  const hostnames = parseTurnstileHostnames(' HNGlance.com, ,www.hnglance.com ')

  it('requires success, the session action, and an allowed hostname', async () => {
    const fetchImpl = siteverify({ success: true, action: TURNSTILE_ACTION, hostname: 'hnglance.com' })

    await expect(verifyTurnstileToken({ secret: SECRET, token: 'token', hostnames, remoteIp: '203.0.113.7', fetchImpl })).resolves.toBe(true)

    const body = fetchImpl.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(body.get('secret')).toBe(SECRET)
    expect(body.get('response')).toBe('token')
    expect(body.get('remoteip')).toBe('203.0.113.7')
  })

  it.each([
    { success: false, action: TURNSTILE_ACTION, hostname: 'hnglance.com' },
    { success: true, action: 'login', hostname: 'hnglance.com' },
    { success: true, action: TURNSTILE_ACTION, hostname: 'evil.example' },
    { success: true, action: TURNSTILE_ACTION },
  ])('rejects %o', async (result) => {
    await expect(verifyTurnstileToken({ secret: SECRET, token: 'token', hostnames, fetchImpl: siteverify(result) })).resolves.toBe(false)
  })

  it('accepts test-key results without an action', async () => {
    const fetchImpl = siteverify({ success: true, hostname: 'example.com', metadata: { result_with_testing_key: true } })

    await expect(verifyTurnstileToken({ secret: SECRET, token: 'token', hostnames: parseTurnstileHostnames('example.com'), fetchImpl })).resolves.toBe(true)
  })

  it('fails closed without calling Siteverify for unusable input', async () => {
    const fetchImpl = siteverify({ success: true, action: TURNSTILE_ACTION, hostname: 'hnglance.com' })

    await expect(verifyTurnstileToken({ secret: SECRET, token: '', hostnames, fetchImpl })).resolves.toBe(false)
    await expect(verifyTurnstileToken({ secret: SECRET, token: 'x'.repeat(2049), hostnames, fetchImpl })).resolves.toBe(false)
    await expect(verifyTurnstileToken({ secret: SECRET, token: 42, hostnames, fetchImpl })).resolves.toBe(false)
    await expect(verifyTurnstileToken({ secret: SECRET, token: 'token', hostnames: new Set(), fetchImpl })).resolves.toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('fails closed on upstream errors', async () => {
    const rejected = vi.fn<typeof fetch>(async () => { throw new Error('offline') })

    await expect(verifyTurnstileToken({ secret: SECRET, token: 'token', hostnames, fetchImpl: rejected })).resolves.toBe(false)
    await expect(verifyTurnstileToken({ secret: SECRET, token: 'token', hostnames, fetchImpl: siteverify({}, { status: 500 }) })).resolves.toBe(false)
    await expect(verifyTurnstileToken({
      secret: SECRET,
      token: 'token',
      hostnames,
      fetchImpl: vi.fn<typeof fetch>(async () => new Response('not json')),
    })).resolves.toBe(false)
  })
})

describe('isHumanVerificationResponse', () => {
  it('recognizes the Worker gate and WAF challenges, not other refusals', () => {
    expect(isHumanVerificationResponse(new Response(null, { status: 403, headers: { 'X-HN-Verification': 'required' } }))).toBe(true)
    expect(isHumanVerificationResponse(new Response(null, { status: 403, headers: { 'cf-mitigated': 'challenge' } }))).toBe(true)
    expect(isHumanVerificationResponse(new Response(null, { status: 403 }))).toBe(false)
    expect(isHumanVerificationResponse(new Response(null, { status: 429, headers: { 'X-HN-Verification': 'required' } }))).toBe(false)
    expect(isHumanVerificationResponse(undefined)).toBe(false)
  })
})
