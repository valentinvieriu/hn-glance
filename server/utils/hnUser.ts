const HN_FIREBASE_API_URL = 'https://hacker-news.firebaseio.com/v0'

type HnShallowUser = {
  id?: unknown
}

export const parseHnUserExists = (value: unknown) => {
  if (value === null) {
    return false
  }

  if (
    typeof value === 'object'
    && value !== null
    && (value as HnShallowUser).id === true
  ) {
    return true
  }

  throw new Error('Unexpected HN Firebase user response')
}

export const fetchHnUserExists = async (username: string) => {
  const response = await $fetch<unknown>(
    `${HN_FIREBASE_API_URL}/user/${encodeURIComponent(username)}.json`,
    {
      query: {
        shallow: 'true',
      },
    },
  )

  return parseHnUserExists(response)
}
