/** Touch screens (phones, tablets): the primary pointer is coarse. Desktop and laptops are not. */
export const isTouchDevice = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
