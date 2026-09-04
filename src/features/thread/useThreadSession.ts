import {
  optimisticallySendMessage,
  useUIMessages,
} from '@convex-dev/agent/react'
import { useMutation } from 'convex/react'
import { useState } from 'react'

import { api } from '../../../convex/_generated/api'
import type { FoundUIMessage } from './ThreadMessage'
import { useResumableThread } from './useResumableThread'

// Owns the active conversation's subscriptions, draft, and send lifecycle.
export function useThreadSession() {
  const { forgetThread, rememberThread, restoring, threadId } =
    useResumableThread()
  const [drafts, setDrafts] = useState<Map<string, string>>(() => new Map())
  const draftKey = threadId ?? 'new-thread'
  const draft = drafts.get(draftKey) ?? ''
  function setDraft(value: string): void {
    setDrafts((previous) => new Map(previous).set(draftKey, value))
  }
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const startThread = useMutation(api.thread.start)
  const sendMessage = useMutation(api.thread.send).withOptimisticUpdate(
    (store, args) => {
      optimisticallySendMessage(api.thread.listMessages)(store, {
        threadId: args.threadId,
        prompt: args.prompt,
      })
    },
  )
  const messageQuery = useUIMessages(
    api.thread.listMessages,
    threadId ? { threadId } : 'skip',
    {
      initialNumItems: 40,
      stream: true,
    },
  )
  // SAFETY: listMessages returns the Agent component's UIMessage values unchanged.
  // The Agent component owns the full message union. Found narrows only its
  // three stable tool parts in ThreadMessage.
  const messages = messageQuery.results as FoundUIMessage[]
  const latestMessage = messages.at(-1)
  const runActive = Boolean(
    threadId &&
    (latestMessage?.role === 'user' ||
      (latestMessage?.role === 'assistant' &&
        (latestMessage.status === 'pending' ||
          latestMessage.status === 'streaming'))),
  )
  const interactionBlocked = submitting || runActive || restoring
  const openingThread =
    restoring || (threadId && messageQuery.status === 'LoadingFirstPage')

  async function submit(promptOverride?: string): Promise<void> {
    const prompt = (promptOverride ?? draft).trim()
    if (!prompt || interactionBlocked) return

    setSubmitting(true)
    setSubmitError(undefined)
    setDraft('')
    try {
      if (threadId) {
        await sendMessage({ threadId, prompt })
      } else {
        const newThreadId = await startThread({ prompt })
        rememberThread(newThreadId)
      }
    } catch (error) {
      setDraft(prompt)
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'The message could not be sent.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function startNewThread(): void {
    if (submitting) return
    forgetThread()
    setSubmitError(undefined)
  }

  function selectThread(id: string): void {
    if (submitting || id === threadId) return
    rememberThread(id)
    setSubmitError(undefined)
  }

  return {
    draft,
    interactionBlocked,
    messages,
    openingThread,
    runActive,
    setDraft,
    selectThread,
    startNewThread,
    submit,
    submitError,
    submitting,
    threadId,
  }
}
