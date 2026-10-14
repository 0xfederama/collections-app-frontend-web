import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockViewport } from '../test-utils'
import { BREAKPOINTS, classifyWidth, useBreakpoint } from './breakpoints'

describe('W-04 breakpoints', () => {
  it('uses the UI_SPEC §2 thresholds', () => {
    expect(BREAKPOINTS).toEqual({ tablet: 768, desktop: 1024, wide: 1280 })
  })

  it.each([
    [0, 'mobile'],
    [375, 'mobile'],
    [767, 'mobile'],
    [768, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
    [1279, 'desktop'],
    [1280, 'wide'],
    [1920, 'wide'],
  ])('classifyWidth(%i) is %s', (width, expected) => {
    expect(classifyWidth(width)).toBe(expected)
  })

  it('useBreakpoint reads the initial viewport', () => {
    mockViewport(800)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('tablet')
  })

  it('useBreakpoint follows viewport changes across every boundary', () => {
    mockViewport(375)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('mobile')
    mockViewport(768)
    expect(result.current).toBe('tablet')
    mockViewport(1024)
    expect(result.current).toBe('desktop')
    mockViewport(1280)
    expect(result.current).toBe('wide')
    mockViewport(1279)
    expect(result.current).toBe('desktop')
    mockViewport(767)
    expect(result.current).toBe('mobile')
  })

  it('useBreakpoint falls back to window.innerWidth when matchMedia is missing', () => {
    // test-setup leaves jsdom without matchMedia and innerWidth = 1024
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('desktop')
  })
})
