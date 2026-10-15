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
// CodeMirror (description editor) measures text through Range rects, which jsdom does not implement.
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }
Range.prototype.getBoundingClientRect ??= () => ({ ...emptyRect, toJSON: () => emptyRect })
Range.prototype.getClientRects ??= () =>
  ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: [][Symbol.iterator],
  }) as unknown as DOMRectList
