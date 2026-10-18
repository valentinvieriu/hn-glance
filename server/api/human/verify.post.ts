export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: unknown } | null>(event).catch(() => null)
  const { expiresAt } = await issueHumanSession(event, body?.token)

  return { verified: true, expiresAt }
})
