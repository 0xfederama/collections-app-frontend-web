import { describe, expect, it, vi } from 'vitest'
import { copyText, shareViaSystem } from './shareFlow'

const abort = () => Object.assign(new Error('cancelled'), { name: 'AbortError' })

describe('roadmap 40 shareViaSystem', () => {
  it('shares the text', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    expect(await shareViaSystem('* a', { share })).toBe('shared')
    expect(share).toHaveBeenCalledWith({ text: '* a' })
  })
  it('does nothing more on cancel (AbortError)', async () => {
    expect(await shareViaSystem('x', { share: () => Promise.reject(abort()) })).toBe('cancelled')
  })
  it('falls back on any other error', async () => {
    expect(await shareViaSystem('x', { share: () => Promise.reject(new Error('no')) })).toBe(
      'fallback',
    )
  })
  it('falls back without navigator.share', async () => {
    expect(await shareViaSystem('x', {})).toBe('fallback')
  })
  it('falls back when canShare says no, and still shares when it is missing', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    expect(await shareViaSystem('x', { share, canShare: () => false })).toBe('fallback')
    expect(share).not.toHaveBeenCalled()
    expect(await shareViaSystem('x', { share, canShare: () => true })).toBe('shared')
  })
})

describe('roadmap 40 copyText', () => {
  const field = () => document.createElement('textarea')
  it('uses the async clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(
      await copyText('t', { clipboard: { writeText } }, field(), { execCommand: vi.fn() }),
    ).toBe(true)
    expect(writeText).toHaveBeenCalledWith('t')
  })
  it('uses execCommand without a clipboard', async () => {
    const execCommand = vi.fn().mockReturnValue(true)
    expect(await copyText('t', {}, field(), { execCommand })).toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })
  it('reports failure when execCommand returns false or the clipboard rejects', async () => {
    expect(await copyText('t', {}, field(), { execCommand: () => false })).toBe(false)
    expect(
      await copyText(
        't',
        { clipboard: { writeText: () => Promise.reject(new Error('x')) } },
        field(),
        {
          execCommand: () => false,
        },
      ),
    ).toBe(false)
    expect(await copyText('t', {}, null, { execCommand: () => true })).toBe(false)
  })
})
