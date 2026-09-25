import type { H3Event } from 'h3'
import { isValidHnItemId, isValidHnUsername } from '#shared/utils/hn'

export const requireHnItemIdParam = (event: H3Event) => {
  const itemId = getRouterParam(event, 'id')

  if (!isValidHnItemId(itemId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid story ID is required',
    })
  }

  return itemId
}

export const requireHnUsernameParam = (event: H3Event) => {
  const username = getRouterParam(event, 'username')

  if (!isValidHnUsername(username)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid username is required',
    })
  }

  return username
}
