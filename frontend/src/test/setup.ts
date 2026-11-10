import '@testing-library/jest-dom/vitest'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver
}

const htmlElement = HTMLElement.prototype as HTMLElement & {
  hasPointerCapture?: (pointerId: number) => boolean
  setPointerCapture?: (pointerId: number) => void
  releasePointerCapture?: (pointerId: number) => void
}

htmlElement.hasPointerCapture ??= () => false
htmlElement.setPointerCapture ??= () => {}
htmlElement.releasePointerCapture ??= () => {}

const elementProto = Element.prototype as Element & {
  scrollIntoView?: (arg?: unknown) => void
}

elementProto.scrollIntoView ??= () => {}
