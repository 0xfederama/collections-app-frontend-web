import { useEffect, useState } from 'react'

export type BackendStatus = 'checking' | 'ready' | 'down'

// Temporary plain fetch for the dev shell; replaced by lib/api in W-02.
export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/readyz', { signal: controller.signal })
      .then((res) => setStatus(res.ok ? 'ready' : 'down'))
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setStatus('down')
      })
    return () => controller.abort()
  }, [])

  return status
}
