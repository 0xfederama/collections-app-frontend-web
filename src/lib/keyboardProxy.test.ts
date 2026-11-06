import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  KEYBOARD_PROXY_MS,
  focusKeyboardProxy,
  handOffKeyboardFocus,
  keyboardProxyOpener,
  releaseKeyboardProxy,
} from './keyboardProxy'

const proxies = () =>
  document.querySelectorAll<HTMLInputElement>('body > input[aria-hidden="true"]')

describe('focusKeyboardProxy (W2 iOS keyboard)', () => {
  afterEach(() => {
    releaseKeyboardProxy()
    vi.useRealTimers()
  })

  it('focuses a hidden, untabbable proxy input synchronously', () => {
    focusKeyboardProxy()
    const [proxy] = proxies()
    expect(proxies()).toHaveLength(1)
    expect(proxy).toHaveFocus()
    expect(proxy).toHaveAttribute('aria-hidden', 'true')
    expect(proxy?.tabIndex).toBe(-1)
  })

  it('a second call replaces the proxy instead of stacking inputs', () => {
    focusKeyboardProxy()
    focusKeyboardProxy()
    expect(proxies()).toHaveLength(1)
  })

  it('releaseKeyboardProxy removes the proxy and is safe to call again', () => {
    focusKeyboardProxy()
    releaseKeyboardProxy()
    expect(proxies()).toHaveLength(0)
    expect(() => releaseKeyboardProxy()).not.toThrow()
  })

  it('removes the proxy once the real field has taken focus', () => {
    focusKeyboardProxy()
    const field = document.createElement('input')
    document.body.append(field)
    field.focus()
    expect(field).toHaveFocus()
    releaseKeyboardProxy()
    expect(proxies()).toHaveLength(0)
    field.remove()
  })

  it('removes an unused proxy after KEYBOARD_PROXY_MS', () => {
    vi.useFakeTimers()
    focusKeyboardProxy()
    vi.advanceTimersByTime(KEYBOARD_PROXY_MS - 1)
    expect(proxies()).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(proxies()).toHaveLength(0)
  })

  it('hands focus to the real field, then removes the proxy (focus never on <body>)', () => {
    focusKeyboardProxy()
    const field = document.createElement('input')
    document.body.append(field)
    handOffKeyboardFocus(field)
    expect(field).toHaveFocus()
    expect(proxies()).toHaveLength(0)
    field.remove()
  })

  it('keeps the proxy focused while the real field is not mounted yet', () => {
    focusKeyboardProxy()
    handOffKeyboardFocus(null)
    expect(proxies()).toHaveLength(1)
    expect(proxies()[0]).toHaveFocus()
  })

  it('a repeated tap keeps a proxy focused at every step and remembers the opener', () => {
    const button = document.createElement('button')
    document.body.append(button)
    button.focus()
    focusKeyboardProxy()
    focusKeyboardProxy()
    expect(proxies()[0]).toHaveFocus()
    expect(keyboardProxyOpener()).toBe(button)
    button.remove()
  })

  it('uses 16px text so iOS does not zoom when the proxy takes focus', () => {
    focusKeyboardProxy()
    expect(proxies()[0]).toHaveClass('text-base')
  })
})
