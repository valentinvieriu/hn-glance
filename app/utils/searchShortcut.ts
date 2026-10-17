import { SEARCH_PATH } from '#shared/utils/search'

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
// Discussion focus and the screenshot preview own the keyboard while open.
const MODAL_SELECTOR = '[aria-modal="true"], dialog[open]'

const isEditableTarget = (target: EventTarget | null) => {
  return target instanceof Element && Boolean(target.closest(EDITABLE_SELECTOR))
}

/** The first rendered search field: the page field on `/search`, else the header field. */
const findVisibleSearchInput = () => {
  const inputs = document.querySelectorAll<HTMLInputElement>('input[data-search-input]')

  return Array.from(inputs).find(input => input.getClientRects().length > 0) ?? null
}

/** Global `/` shortcut: focus the visible search field, or open the search page. */
export const handleSearchShortcut = (event: KeyboardEvent) => {
  if (
    event.key !== '/'
    || event.defaultPrevented
    || event.isComposing
    || event.metaKey
    || event.ctrlKey
    || event.altKey
    || isEditableTarget(event.target)
    || document.querySelector(MODAL_SELECTOR)
  ) {
    return
  }

  event.preventDefault()

  const input = findVisibleSearchInput()

  if (input) {
    input.focus()
    input.select()
    return
  }

  void navigateTo(SEARCH_PATH)
}
