import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MATERIALS, getMaterial, type Material } from '../domain/materials'

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserMaterial extends Material {
  isUserCreated: true
}

const BUILT_IN_IDS = new Set(MATERIALS.map(m => m.id))

export interface MaterialLibraryState {
  allMaterials: Material[]
  userMaterials: UserMaterial[]
  hiddenIds: string[]
  // Works for user materials and built-in overrides
  addMaterial:    (m: Omit<UserMaterial, 'isUserCreated'>) => void
  editMaterial:   (id: string, patch: Partial<Omit<Material, 'id'>>) => void
  deleteMaterial: (id: string) => void   // user → remove; built-in → hide
  resetBuiltIn:   (id: string) => void   // restore built-in to original values
  restoreBuiltIn: (id: string) => void   // un-hide a hidden built-in
  isBuiltIn:      (id: string) => boolean
  isModified:     (id: string) => boolean
  isHiddenBuiltIn:(id: string) => boolean
}

// ── Context ──────────────────────────────────────────────────────────────────

export const MaterialLibraryContext = createContext<MaterialLibraryState>({
  allMaterials: MATERIALS,
  userMaterials: [],
  hiddenIds: [],
  addMaterial:    () => undefined,
  editMaterial:   () => undefined,
  deleteMaterial: () => undefined,
  resetBuiltIn:   () => undefined,
  restoreBuiltIn: () => undefined,
  isBuiltIn:      id => BUILT_IN_IDS.has(id),
  isModified:     () => false,
  isHiddenBuiltIn:() => false,
})

// ── Storage ──────────────────────────────────────────────────────────────────

const USER_KEY      = 'transcalc_user_materials'
const OVERRIDES_KEY = 'transcalc_material_overrides'
const HIDDEN_KEY    = 'transcalc_hidden_materials'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function MaterialLibraryProvider({ children }: { children: ReactNode }) {
  const [userMaterials, setUserMaterials] = useState<UserMaterial[]>(
    () => load<UserMaterial[]>(USER_KEY, []),
  )
  const [overrides, setOverrides] = useState<Record<string, Partial<Material>>>(
    () => load<Record<string, Partial<Material>>>(OVERRIDES_KEY, {}),
  )
  const [hiddenIds, setHiddenIds] = useState<string[]>(
    () => load<string[]>(HIDDEN_KEY, []),
  )

  useEffect(() => { save(USER_KEY,      userMaterials) }, [userMaterials])
  useEffect(() => { save(OVERRIDES_KEY, overrides)     }, [overrides])
  useEffect(() => { save(HIDDEN_KEY,    hiddenIds)      }, [hiddenIds])

  const allMaterials = useMemo<Material[]>(() => [
    ...MATERIALS
      .filter(m => !hiddenIds.includes(m.id))
      .map(m => overrides[m.id] ? { ...m, ...overrides[m.id] } : m),
    ...userMaterials,
  ], [userMaterials, overrides, hiddenIds])

  const addMaterial = useCallback((m: Omit<UserMaterial, 'isUserCreated'>) => {
    setUserMaterials(prev => [...prev, { ...m, isUserCreated: true }])
  }, [])

  const editMaterial = useCallback((id: string, patch: Partial<Omit<Material, 'id'>>) => {
    if (BUILT_IN_IDS.has(id)) {
      setOverrides(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }))
    } else {
      setUserMaterials(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
    }
  }, [])

  const deleteMaterial = useCallback((id: string) => {
    if (BUILT_IN_IDS.has(id)) {
      setHiddenIds(prev => prev.includes(id) ? prev : [...prev, id])
    } else {
      setUserMaterials(prev => prev.filter(m => m.id !== id))
    }
  }, [])

  const resetBuiltIn = useCallback((id: string) => {
    setOverrides(prev => { const next = { ...prev }; delete next[id]; return next })
    setHiddenIds(prev => prev.filter(h => h !== id))
  }, [])

  const restoreBuiltIn = useCallback((id: string) => {
    setHiddenIds(prev => prev.filter(h => h !== id))
  }, [])

  const isBuiltIn      = useCallback((id: string) => BUILT_IN_IDS.has(id), [])
  const isModified     = useCallback((id: string) => id in overrides, [overrides])
  const isHiddenBuiltIn= useCallback((id: string) => hiddenIds.includes(id), [hiddenIds])

  return (
    <MaterialLibraryContext.Provider value={{
      allMaterials, userMaterials, hiddenIds,
      addMaterial, editMaterial, deleteMaterial,
      resetBuiltIn, restoreBuiltIn,
      isBuiltIn, isModified, isHiddenBuiltIn,
    }}>
      {children}
    </MaterialLibraryContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useMaterialLibrary(): MaterialLibraryState {
  return useContext(MaterialLibraryContext)
}

export function useResolveMaterial(id: string): Material {
  const { allMaterials } = useMaterialLibrary()
  return allMaterials.find(m => m.id === id) ?? getMaterial(id)
}
