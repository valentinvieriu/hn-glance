export type CommentReaderMode = 'comment' | 'path'

export type CommentReaderPosition = 'start' | 'current'

export const getCommentReaderMode = (value: unknown): CommentReaderMode => {
  const reader = Array.isArray(value) ? value[0] : value

  return reader === 'path' ? 'path' : 'comment'
}
