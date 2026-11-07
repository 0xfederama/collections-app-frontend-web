import { useEffect, useState } from 'react'
import { loadEmoji, type EmojiGroup } from './emojiData'

/** Fetches the emoji data the first time `enabled` is true; `retry` tries again after a failure. */
export function useEmoji(enabled: boolean) {
  const [groups, setGroups] = useState<EmojiGroup[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled || groups) return
    let live = true
    loadEmoji().then(
      (loaded) => live && setGroups(loaded),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [enabled, groups, attempt])

  return {
    groups,
    failed,
    retry: () => {
      setFailed(false)
      setAttempt((count) => count + 1)
    },
  }
}
