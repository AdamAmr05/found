import { useQuery } from 'convex/react'
import { useEffect, useState } from 'react'

import { api } from '../../../convex/_generated/api'

const THREAD_STORAGE_KEY = 'found-active-thread-id'

interface ResumeState {
  readonly storageLoaded: boolean
  readonly storedThreadId?: string
  readonly trustedThreadId?: string
}

function writeStoredThreadId(threadId: string | undefined): void {
  if (threadId) {
    window.sessionStorage.setItem(THREAD_STORAGE_KEY, threadId)
  } else {
    window.sessionStorage.removeItem(THREAD_STORAGE_KEY)
  }
}

export function useResumableThread() {
  const [resumeState, setResumeState] = useState<ResumeState>({
    storageLoaded: false,
  })
  const { storageLoaded, storedThreadId, trustedThreadId } = resumeState
  const canResume = useQuery(
    api.thread.canResume,
    storedThreadId ? { threadId: storedThreadId } : 'skip',
  )

  useEffect(() => {
    const threadId =
      window.sessionStorage.getItem(THREAD_STORAGE_KEY) ?? undefined
    // oxlint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is an external system unavailable during SSR.
    setResumeState(
      threadId
        ? { storageLoaded: true, storedThreadId: threadId }
        : { storageLoaded: true },
    )
  }, [])

  useEffect(() => {
    if (!storedThreadId || canResume !== false) return
    writeStoredThreadId(undefined)
    // oxlint-disable-next-line react-hooks/set-state-in-effect -- access validation invalidates external sessionStorage state.
    setResumeState({ storageLoaded: true })
  }, [canResume, storedThreadId])

  function rememberThread(threadId: string): void {
    writeStoredThreadId(threadId)
    setResumeState({
      storageLoaded: true,
      storedThreadId: threadId,
      trustedThreadId: threadId,
    })
  }

  function forgetThread(): void {
    writeStoredThreadId(undefined)
    setResumeState({ storageLoaded: true })
  }

  const trusted =
    storedThreadId !== undefined &&
    (trustedThreadId === storedThreadId || canResume === true)
  const restoring =
    !storageLoaded ||
    Boolean(storedThreadId && !trusted && canResume === undefined)

  return {
    forgetThread,
    rememberThread,
    restoring,
    threadId: trusted ? storedThreadId : undefined,
  }
}
