import { useState } from 'react'
import { classifyError, type TreeError } from './errors'

/**
 * Runs one async write for a dialog: tracks pending (no double submit) and keeps the classified
 * error so the dialog can show it while keeping its input (UI_SPEC §9).
 */
export function useAction(noun: 'folder' | 'list', name?: string) {
  const [error, setError] = useState<TreeError | null>(null)
  const [pending, setPending] = useState(false)

  /** Resolves `true` when the write succeeded. */
  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    setPending(true)
    setError(null)
    try {
      await action()
      return true
    } catch (caught) {
      setError(classifyError(caught, noun, name))
      return false
    } finally {
      setPending(false)
    }
  }

  return { error, pending, run, clearError: () => setError(null), setError }
}
