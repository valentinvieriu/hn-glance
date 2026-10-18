import {
  HUMAN_VERIFICATION_PATH,
  isHumanVerificationResponse,
  TURNSTILE_ACTION,
} from '#shared/utils/humanVerification'

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileRenderOptions = {
  'sitekey': string
  'action': string
  'appearance': 'interaction-only'
  'callback': (token: string) => void
  'error-callback': () => void
  'expired-callback': () => void
  'timeout-callback': () => void
}

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let turnstileScript: Promise<TurnstileApi> | null = null
let pendingVerification: Promise<void> | null = null

const loadTurnstile = () => {
  turnstileScript ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile)
      return
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.addEventListener('load', () => window.turnstile
      ? resolve(window.turnstile)
      : reject(new Error('Turnstile did not initialize')))
    script.addEventListener('error', () => reject(new Error('Turnstile failed to load')))
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    turnstileScript = null
    throw error
  })

  return turnstileScript
}

/** The widget stays invisible unless Cloudflare needs an interaction. */
const solveTurnstile = async (siteKey: string) => {
  const turnstile = await loadTurnstile()
  const container = document.createElement('div')
  container.className = 'human-check'
  document.body.appendChild(container)

  let widgetId: string | undefined

  try {
    return await new Promise<string>((resolve, reject) => {
      const fail = () => reject(new Error('Turnstile verification failed'))

      widgetId = turnstile.render(container, {
        'sitekey': siteKey,
        'action': TURNSTILE_ACTION,
        'appearance': 'interaction-only',
        'callback': resolve,
        'error-callback': fail,
        'expired-callback': fail,
        'timeout-callback': fail,
      })
    })
  } finally {
    if (widgetId) turnstile.remove(widgetId)
    container.remove()
  }
}

/** One verification serves every request that was refused at the same time. */
const verifyHuman = (siteKey: string) => {
  pendingVerification ??= (async () => {
    if (!siteKey) throw new Error('Turnstile sitekey is not configured')

    const token = await solveTurnstile(siteKey)
    await $fetch(HUMAN_VERIFICATION_PATH, { method: 'POST', body: { token } })
  })().finally(() => {
    pendingVerification = null
  })

  return pendingVerification
}

export const isHumanVerificationError = (error: unknown) => {
  return isHumanVerificationResponse((error as { response?: Response } | null)?.response)
}

/**
 * `$fetch` for routes behind the human gate. Server renders forward the
 * session cookie; a refused browser request verifies once and retries.
 */
export const useHumanFetch = () => {
  const requestFetch = useRequestFetch()
  const siteKey = useRuntimeConfig().public.turnstileSiteKey

  return async <T>(url: string, options?: { query?: Record<string, string> }) => {
    try {
      return await requestFetch<T>(url, options)
    } catch (error) {
      if (!import.meta.client || !isHumanVerificationError(error)) throw error

      await verifyHuman(siteKey)
      return await requestFetch<T>(url, options)
    }
  }
}
