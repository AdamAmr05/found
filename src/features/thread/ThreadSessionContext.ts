import { createContext, useContext } from 'react'

import type { useThreadSession } from './useThreadSession'

export const ThreadSessionContext = createContext<
  ReturnType<typeof useThreadSession> | undefined
>(undefined)

export function useThreadSessionContext() {
  const session = useContext(ThreadSessionContext)
  if (!session) throw new Error('Thread session requires the app workspace')
  return session
}
