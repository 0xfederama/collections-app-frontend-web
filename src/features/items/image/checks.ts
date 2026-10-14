/** Client-side checks for an item image. They only save a round trip: the server stays authoritative. */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_URL_LENGTH = 2048
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** Value for the file input's `accept`. */
export const ACCEPT = ACCEPTED_TYPES.join(',')

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** A file's type as the browser reports it, falling back to the extension when it reports none. */
function typeOf(file: File): string {
  if (file.type) return file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[extension] ?? ''
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

/** The reason a file cannot be uploaded, or `null` when it looks fine. */
export function checkImageFile(file: File): string | null {
  const type = typeOf(file)
  if (type === 'image/svg+xml') return `“${file.name}” is an SVG. Use a JPEG, PNG or WebP image.`
  if (!ACCEPTED_TYPES.includes(type)) {
    return `“${file.name}” is not a JPEG, PNG or WebP image.`
  }
  if (file.size === 0) return `“${file.name}” is empty.`
  if (file.size > MAX_IMAGE_BYTES) {
    return `“${file.name}” is ${formatBytes(file.size)}. Images can be at most 10 MiB.`
  }
  return null
}

/** The reason an image address cannot be used, or `null`. Only `https://` is offered (UI_SPEC §4). */
export function checkImageUrl(value: string): string | null {
  const url = value.trim()
  if (!url) return 'Enter the address of an image.'
  if (url.length > MAX_URL_LENGTH)
    return `The address must be at most ${MAX_URL_LENGTH} characters.`
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return 'The address must start with https://.'
  } catch {
    return 'That is not a valid address. It should look like https://example.com/photo.jpg.'
  }
  return null
}
