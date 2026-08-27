import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { budgetCeiling } from './candidates'

/**
 * The user's stated ceiling is a requirement, not a constant. Every surface
 * that judges a candidate against it reads it from here, so editing the
 * requirement in one place re-evaluates the whole world rather than the one
 * component that happens to own the number.
 */
const CeilingContext = createContext<number>(budgetCeiling)

export function CeilingProvider({
  ceiling,
  children,
}: {
  readonly ceiling: number
  readonly children: ReactNode
}) {
  return (
    <CeilingContext.Provider value={ceiling}>
      {children}
    </CeilingContext.Provider>
  )
}

export function useCeiling(): number {
  return useContext(CeilingContext)
}
