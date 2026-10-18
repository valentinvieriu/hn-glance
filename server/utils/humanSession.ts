import type { H3Event } from 'h3'
import {
  HUMAN_VERIFICATION_HEADER,
  HUMAN_VERIFICATION_REQUIRED,
  TURNSTILE_ACTION,
} from '#shared/utils/humanVerification'

const SESSION_COOKIE = 'hn_glance_human'
const SESSION_VERSION = 'v1'
const SESSION_KEY_LABEL = 'hn-glance-human-session-v1'
export const HUMAN_SESSION_TTL_SECONDS = 24 * 60 * 60

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const SITEVERIFY_TIMEOUT_MS = 10_000
const TOKEN_MAX_LENGTH = 2048

type RateLimiter = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>
}

export type HumanVerificationEnv = {
  HN_GLANCE_TURNSTILE_SECRET?: unknown
  HN_GLANCE_TURNSTILE_HOSTNAMES?: unknown
  HN_GLANCE_HUMAN_RATE_LIMITER?: RateLimiter
}

type SiteverifyResult = {
  success?: unknown
  action?: unknown
  hostname?: unknown
  metadata?: { result_with_testing_key?: unknown }
}

const encoder = new TextEncoder()

const toBase64Url = (bytes: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const fromBase64Url = (value: string) => {
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(binary, character => character.charCodeAt(0))
  } catch {
    return null
  }
}

/** Derive a purpose-bound key so session signatures never reuse the Turnstile secret directly. */
const importSessionKey = async (secret: string) => {
  const rootKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const derivedKey = await crypto.subtle.sign('HMAC', rootKey, encoder.encode(SESSION_KEY_LABEL))

  return await crypto.subtle.importKey(
    'raw',
    derivedKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export const createHumanSessionValue = async (secret: string, now = Date.now()) => {
  const sessionId = crypto.randomUUID()
  const expiresAt = Math.floor(now / 1000) + HUMAN_SESSION_TTL_SECONDS
  const payload = `${SESSION_VERSION}.${sessionId}.${expiresAt}`
  const signature = await crypto.subtle.sign('HMAC', await importSessionKey(secret), encoder.encode(payload))

  return { value: `${payload}.${toBase64Url(signature)}`, sessionId, expiresAt }
}

/** Returns the session ID of a valid, unexpired cookie value, or null. */
export const readHumanSessionValue = async (secret: string, value: unknown, now = Date.now()) => {
  if (typeof value !== 'string' || value.length > 256) return null

  const [version, sessionId, expiresAtText, signatureText, ...rest] = value.split('.')
  const expiresAt = Number(expiresAtText)

  if (
    rest.length > 0
    || version !== SESSION_VERSION
    || !sessionId
    || !Number.isSafeInteger(expiresAt)
    || expiresAt <= Math.floor(now / 1000)
    || !signatureText
  ) {
    return null
  }

  const signature = fromBase64Url(signatureText)
  if (!signature) return null

  const isValid = await crypto.subtle.verify(
    'HMAC',
    await importSessionKey(secret),
    signature,
    encoder.encode(`${version}.${sessionId}.${expiresAt}`),
  )

  return isValid ? sessionId : null
}

export const parseTurnstileHostnames = (value: unknown) => {
  return new Set(typeof value === 'string'
    ? value.split(',').map(hostname => hostname.trim().toLowerCase()).filter(Boolean)
    : [])
}

type TurnstileVerification = {
  secret: string
  token: unknown
  hostnames: Set<string>
  remoteIp?: string
  fetchImpl?: typeof fetch
}

/** Fails closed on network errors, non-2xx responses, and unexpected bodies. */
export const verifyTurnstileToken = async ({
  secret,
  token,
  hostnames,
  remoteIp,
  fetchImpl = fetch,
}: TurnstileVerification) => {
  if (typeof token !== 'string' || token.length === 0 || token.length > TOKEN_MAX_LENGTH || hostnames.size === 0) {
    return false
  }

  let result: SiteverifyResult

  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    })

    if (!response.ok) return false
    result = await response.json() as SiteverifyResult
  } catch {
    return false
  }

  // Test secrets return no action; they only ever reach local development.
  const actionMatches = result.action === TURNSTILE_ACTION
    || result.metadata?.result_with_testing_key === true

  return result.success === true
    && actionMatches
    && typeof result.hostname === 'string'
    && hostnames.has(result.hostname.toLowerCase())
}

const getHumanVerificationEnv = (event: H3Event) => {
  return event.context.cloudflare?.env as HumanVerificationEnv | undefined
}

const getTurnstileSecret = (env: HumanVerificationEnv | undefined) => {
  return typeof env?.HN_GLANCE_TURNSTILE_SECRET === 'string'
    ? env.HN_GLANCE_TURNSTILE_SECRET.trim()
    : ''
}

/** Exchanges a fresh Turnstile token for a signed human-session cookie. */
export const issueHumanSession = async (event: H3Event, token: unknown) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const env = getHumanVerificationEnv(event)
  const secret = getTurnstileSecret(env)

  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Human verification is unavailable',
    })
  }

  const verified = await verifyTurnstileToken({
    secret,
    token,
    hostnames: parseTurnstileHostnames(env?.HN_GLANCE_TURNSTILE_HOSTNAMES),
    remoteIp: getRequestHeader(event, 'cf-connecting-ip'),
  })

  if (!verified) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Human verification failed',
    })
  }

  const session = await createHumanSessionValue(secret)

  setCookie(event, SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: getRequestURL(event).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: HUMAN_SESSION_TTL_SECONDS,
  })

  return { expiresAt: session.expiresAt }
}

/**
 * Gate for routes whose cache misses spend Workers AI or Algolia capacity.
 * Cached responses never reach this check, so it only guards real work.
 */
export const requireHumanSession = async (event: H3Event) => {
  const env = getHumanVerificationEnv(event)
  const secret = getTurnstileSecret(env)
  const sessionId = secret
    ? await readHumanSessionValue(secret, getCookie(event, SESSION_COOKIE))
    : null

  if (!sessionId) {
    setHeaders(event, {
      'Cache-Control': 'no-store',
      [HUMAN_VERIFICATION_HEADER]: HUMAN_VERIFICATION_REQUIRED,
    })
    throw createError({
      statusCode: 403,
      statusMessage: 'Human verification required',
    })
  }

  const rateLimit = await env?.HN_GLANCE_HUMAN_RATE_LIMITER?.limit({ key: sessionId })

  if (rateLimit && !rateLimit.success) {
    setHeaders(event, {
      'Cache-Control': 'no-store',
      'Retry-After': '60',
    })
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests',
    })
  }
}
