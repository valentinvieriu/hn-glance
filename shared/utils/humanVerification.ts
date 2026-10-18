/**
 * Human-verification contract shared by the Turnstile client and the Nitro
 * routes that spend upstream or Workers AI capacity per request.
 */

export const HUMAN_VERIFICATION_PATH = '/api/human/verify'
export const HUMAN_VERIFICATION_HEADER = 'X-HN-Verification'
export const HUMAN_VERIFICATION_REQUIRED = 'required'
export const TURNSTILE_ACTION = 'session'

/** Cloudflare's always-passing test sitekey, used outside production builds. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'

/**
 * The production widget's public sitekey. Pre-clearance on this widget also
 * sets `cf_clearance`, which satisfies the zone's WAF challenge rule.
 */
export const TURNSTILE_SITE_KEY = '0x4AAAAAAFaTCW8Z6IlurlCn'

/** A Worker gate or a WAF challenge both ask the browser to verify, then retry. */
export const isHumanVerificationResponse = (response: Pick<Response, 'status' | 'headers'> | undefined) => {
  return response?.status === 403 && (
    response.headers.get(HUMAN_VERIFICATION_HEADER) === HUMAN_VERIFICATION_REQUIRED
    || response.headers.get('cf-mitigated') === 'challenge'
  )
}
