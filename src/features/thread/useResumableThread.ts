import { useSessionQuery } from 'convex-helpers/react/sessions'
import { useEffect, useState } from 'react'

import { api } from '../../../convex/_generated/api'

const THREAD_STORAGE_KEY = 'found-active-thread-id'

function writeStoredThreadId(threadId: string | undefined): void {
  if (threadId) {
    window.sessionStorage.setItem(THREAD_STORAGE_KEY, threadId)
  } else {
    window.sessionStorage.removeItem(THREAD_STORAGE_KEY)
  }
}

export function useResumableThread() {
  const [storedThreadId, setStoredThreadId] = useState<string>()
  const canResume = useSessionQuery(
    api.thread.canResume,
    storedThreadId ? { threadId: storedThreadId } : ('skip' as const),
  )

  useEffect(() => {
    // oxlint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is an external system unavailable during SSR.
    setStoredThreadId(
      window.sessionStorage.getItem(THREAD_STORAGE_KEY) ?? undefined,
    )
  }, [])

  useEffect(() => {
    if (storedThreadId && canResume === false) writeStoredThreadId(undefined)
  }, [canResume, storedThreadId])

  function rememberThread(threadId: string): void {
    writeStoredThreadId(threadId)
    setStoredThreadId(threadId)
  }

  function forgetThread(): void {
    writeStoredThreadId(undefined)
    setStoredThreadId(undefined)
  }

  return {
    forgetThread,
    rememberThread,
    threadId: canResume ? storedThreadId : undefined,
  }
}
