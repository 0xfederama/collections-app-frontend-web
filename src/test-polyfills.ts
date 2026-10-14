// Loaded first by test-setup.ts: some libraries (dnd-kit) read these APIs while being imported.
// jsdom lacks these browser APIs; Radix Select/Menu/Popover and dnd-kit need them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}
