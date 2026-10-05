import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'

// jsdom does not implement SubtleCrypto. Password hashing needs it
// (lib/password.ts). Node's implementation is the same WebCrypto API, so the
// test exercises the production code path rather than a stub.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
}

// jsdom does not implement matchMedia, which AppShell uses to close the
// overlay sidebar when the viewport grows past bp.lg.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mql = {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.add(listener),
      removeEventListener: (
        _: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => listeners.delete(listener),
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }
    return mql as unknown as MediaQueryList
  }) as typeof window.matchMedia
}
