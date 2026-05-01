import { createContext, useContext } from 'react'

export interface KbOpenArgs {
  entryId?: string
  calcKey?: string
}

export const KbContext = createContext<(args?: KbOpenArgs) => void>(() => {})
export const useKb = () => useContext(KbContext)
