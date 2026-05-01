/**
 * MaterialContext — user-customisable material library.
 *
 * Provides a list of materials (built-in VMM-26 list plus any user-created
 * entries) and CRUD operations.  State is persisted to localStorage under
 * the key "transcalc_user_materials".
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { MATERIALS, getMaterial, type Material } from '../domain/materials'

// ── Types ────────────────────────────────────────────────────────────────────

/** A user-created material extends Material and is always stored in the library. */
export interface UserMaterial extends Material {
  isUserCreated: true
}

export interface MaterialLibraryState {
  /** Built-in materials (read-only) plus user-created materials. */
  allMaterials: Material[]
  /** Only the user-created entries. */
  userMaterials: UserMaterial[]
  addMaterial: (m: Omit<UserMaterial, 'isUserCreated'>) => void
  updateMaterial: (id: string, patch: Partial<Omit<UserMaterial, 'id' | 'isUserCreated'>>) => void
  deleteMaterial: (id: string) => void
}

// ── Context ──────────────────────────────────────────────────────────────────

export const MaterialLibraryContext = createContext<MaterialLibraryState>({
  allMaterials: MATERIALS,
  userMaterials: [],
  addMaterial: () => undefined,
  updateMaterial: () => undefined,
  deleteMaterial: () => undefined,
})

// ── Provider ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'transcalc_user_materials'

function loadFromStorage(): UserMaterial[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as UserMaterial[]
  } catch {
    return []
  }
}

function saveToStorage(items: UserMaterial[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota errors */
  }
}

export function MaterialLibraryProvider({ children }: { children: ReactNode }) {
  const [userMaterials, setUserMaterials] = useState<UserMaterial[]>(loadFromStorage)

  useEffect(() => {
    saveToStorage(userMaterials)
  }, [userMaterials])

  const addMaterial = useCallback((m: Omit<UserMaterial, 'isUserCreated'>) => {
    setUserMaterials(prev => [...prev, { ...m, isUserCreated: true }])
  }, [])

  const updateMaterial = useCallback(
    (id: string, patch: Partial<Omit<UserMaterial, 'id' | 'isUserCreated'>>) => {
      setUserMaterials(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)))
    },
    [],
  )

  const deleteMaterial = useCallback((id: string) => {
    setUserMaterials(prev => prev.filter(m => m.id !== id))
  }, [])

  // Built-in materials first, then user materials (user materials come after
  // 'custom' is removed — we keep 'custom' as the last built-in entry).
  const allMaterials: Material[] = [...MATERIALS, ...userMaterials]

  return (
    <MaterialLibraryContext.Provider
      value={{ allMaterials, userMaterials, addMaterial, updateMaterial, deleteMaterial }}
    >
      {children}
    </MaterialLibraryContext.Provider>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMaterialLibrary(): MaterialLibraryState {
  return useContext(MaterialLibraryContext)
}

/**
 * Resolve a material by id from both built-in and user libraries.
 * Falls back to the built-in getMaterial() for unknown ids.
 */
export function useResolveMaterial(id: string): Material {
  const { allMaterials } = useMaterialLibrary()
  return allMaterials.find(m => m.id === id) ?? getMaterial(id)
}
