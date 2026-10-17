/** Context under a story card title, such as the comment behind a search match. */
export type StoryCardNote = {
  label: string
  /** Plain-text excerpt, clamped to two lines. */
  quote?: string
  /** In-app destination for the label, such as a comment deep link. */
  to?: string
}
