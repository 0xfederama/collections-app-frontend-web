import { describe, expect, it } from 'vitest'
import { ACCEPT, checkImageFile, checkImageUrl, MAX_IMAGE_BYTES } from './checks'

function file(name: string, type: string, size = 100) {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('AT-06 checkImageFile', () => {
  it.each([
    ['a.jpg', 'image/jpeg'],
    ['a.png', 'image/png'],
    ['a.webp', 'image/webp'],
    ['A.PNG', 'IMAGE/PNG'],
  ])('accepts %s (%s)', (name, type) => {
    expect(checkImageFile(file(name, type))).toBeNull()
  })

  it('offers exactly jpeg, png and webp to the file input', () => {
    expect(ACCEPT).toBe('image/jpeg,image/png,image/webp')
  })

  it.each(['a.jpg', 'a.JPEG', 'a.png', 'a.webp'])(
    'falls back to the extension when the browser reports no type (%s)',
    (name) => {
      expect(checkImageFile(file(name, ''))).toBeNull()
    },
  )

  it('rejects an unknown extension with no type', () => {
    expect(checkImageFile(file('a.bmp', ''))).toMatch(/not a JPEG, PNG or WebP/)
    expect(checkImageFile(file('noext', ''))).toMatch(/not a JPEG, PNG or WebP/)
  })

  it('rejects SVG with a specific message', () => {
    expect(checkImageFile(file('logo.svg', 'image/svg+xml'))).toBe(
      '“logo.svg” is an SVG. Use a JPEG, PNG or WebP image.',
    )
    expect(checkImageFile(file('logo.svg', ''))).toMatch(/not a JPEG, PNG or WebP/)
  })

  it('rejects GIF and other image types', () => {
    expect(checkImageFile(file('a.gif', 'image/gif'))).toMatch(/not a JPEG, PNG or WebP/)
  })

  it('a text file renamed .jpg is not detectable by name; its reported type is what counts', () => {
    expect(checkImageFile(file('fake.jpg', 'text/plain'))).toMatch(/not a JPEG, PNG or WebP/)
    // With no reported type the extension wins: the server must catch this (415).
    expect(checkImageFile(file('fake.jpg', ''))).toBeNull()
  })

  it('accepts exactly 10 MiB', () => {
    expect(checkImageFile(file('a.png', 'image/png', MAX_IMAGE_BYTES))).toBeNull()
  })

  it('rejects 10 MiB + 1 byte and states the size', () => {
    const message = checkImageFile(file('big.png', 'image/png', MAX_IMAGE_BYTES + 1))
    expect(message).toBe('“big.png” is 10.0 MiB. Images can be at most 10 MiB.')
  })

  it('shows the size of a much larger file', () => {
    expect(checkImageFile(file('big.png', 'image/png', 25 * 1024 * 1024))).toContain('25.0 MiB')
  })

  it('rejects an empty file', () => {
    expect(checkImageFile(file('a.png', 'image/png', 0))).toBe('“a.png” is empty.')
  })
})

describe('AT-07 checkImageUrl', () => {
  it('accepts an https address, trimmed', () => {
    expect(checkImageUrl('https://example.com/photo.jpg')).toBeNull()
    expect(checkImageUrl('  https://example.com/photo.jpg  ')).toBeNull()
  })

  it('rejects http', () => {
    expect(checkImageUrl('http://example.com/a.jpg')).toBe('The address must start with https://.')
  })

  it.each(['ftp://example.com/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA'])(
    'rejects another scheme (%s)',
    (value) => {
      expect(checkImageUrl(value)).toBe('The address must start with https://.')
    },
  )

  it('rejects empty and blank input', () => {
    expect(checkImageUrl('')).toBe('Enter the address of an image.')
    expect(checkImageUrl('   ')).toBe('Enter the address of an image.')
  })

  it('rejects garbage', () => {
    expect(checkImageUrl('not a url')).toMatch(/not a valid address/)
    expect(checkImageUrl('example.com/a.jpg')).toMatch(/not a valid address/)
  })

  it('accepts 2048 characters and rejects 2049', () => {
    const prefix = 'https://example.com/'
    expect(checkImageUrl(prefix + 'a'.repeat(2048 - prefix.length))).toBeNull()
    expect(checkImageUrl(prefix + 'a'.repeat(2049 - prefix.length))).toBe(
      'The address must be at most 2048 characters.',
    )
  })
})
