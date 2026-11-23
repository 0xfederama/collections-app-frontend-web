/** The browser features the share flow uses; injected so tests need no real navigator. */
export interface ShareNavigator {
  share?: (data: { text: string }) => Promise<void>
  canShare?: (data: { text: string }) => boolean
  clipboard?: { writeText?: (text: string) => Promise<void> }
}

export type ShareOutcome = 'shared' | 'cancelled' | 'fallback'

/**
 * Opens the system share sheet. 'fallback' means the caller should show the copy dialog: no
 * `navigator.share` (plain http is not a secure context) or it failed for another reason.
 * Call it synchronously from the click so the user activation is kept.
 */
export async function shareViaSystem(text: string, nav: ShareNavigator): Promise<ShareOutcome> {
  if (typeof nav.share !== 'function') return 'fallback'
  const data = { text }
  try {
    if (nav.canShare && nav.canShare(data) === false) return 'fallback'
    await nav.share(data)
    return 'shared'
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'fallback'
  }
}

/**
 * Copies `text`: the async clipboard when there is one, else `execCommand('copy')` on `field`
 * (the dialog's selected textarea, so it works without a secure context). Returns whether it worked.
 */
export async function copyText(
  text: string,
  nav: ShareNavigator,
  field: HTMLTextAreaElement | null,
  doc: Pick<Document, 'execCommand'> = document,
): Promise<boolean> {
  if (typeof nav.clipboard?.writeText === 'function') {
    try {
      await nav.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the legacy path.
    }
  }
  if (!field || typeof doc.execCommand !== 'function') return false
  try {
    field.focus()
    field.select()
    return doc.execCommand('copy')
  } catch {
    return false
  }
}
