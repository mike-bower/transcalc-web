import { useState } from 'react'
import { MATERIALS, getMaterial, type Material } from '../domain/materials'
import { getMaterialAppearance, swatchStyle } from '../domain/materialAppearance'
import { useMaterialLibrary, type UserMaterial } from './MaterialContext'
import MaterialLibraryModal from './MaterialLibraryModal'

const GPA_PER_MPSI   = 6.8947572932
const KSI_PER_MPA   = 1 / GPA_PER_MPSI   // 1 MPa = 0.14504 ksi
const LB_IN3_PER_KG_M3 = 1 / 27679.9047  // 1 kg/m³ = 3.6127e-5 lb/in³

export interface MaterialSelection {
  id:           string
  name:         string
  eGPaDisplay:  number   // GPa (SI) or Mpsi (US)
  nu:           number
  densityKgM3:  number
  yieldMPa?:    number
}

interface Props {
  materialId: string
  unitSystem: 'SI' | 'US'
  onSelect:   (sel: MaterialSelection) => void
}

function toDisplay(eGPa: number, us: boolean): number {
  return us ? +(eGPa / GPA_PER_MPSI).toFixed(4) : eGPa
}

function selectionFrom(m: Material, us: boolean): MaterialSelection {
  return { id: m.id, name: m.name, eGPaDisplay: toDisplay(m.eGPa, us), nu: m.nu, densityKgM3: m.densityKgM3, yieldMPa: m.yieldMPa }
}

const SELECT_STYLE: React.CSSProperties = {
  flex: 1, minWidth: 0,
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid var(--line)',
  background: '#fff',
  color: 'var(--ink)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
}

const BTN: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 4, border: '1px solid var(--line)',
  background: '#f1f5f9', color: 'var(--ink)', cursor: 'pointer',
  fontSize: 13, lineHeight: 1, whiteSpace: 'nowrap', alignSelf: 'flex-end',
}

export default function MaterialSelector({ materialId, unitSystem, onSelect }: Props) {
  const us = unitSystem === 'US'
  const modUnit = us ? 'Mpsi' : 'GPa'

  const { allMaterials, isModified, isBuiltIn } = useMaterialLibrary()
  const [libraryOpen, setLibraryOpen] = useState(false)

  const current = allMaterials.find(m => m.id === materialId) ?? getMaterial(materialId)
  const app     = getMaterialAppearance(materialId)

  function handleSelect(id: string) {
    const m = allMaterials.find(mat => mat.id === id) ?? getMaterial(id)
    onSelect(selectionFrom(m, us))
  }

  function handleLibrarySelect(id: string) {
    handleSelect(id)
    setLibraryOpen(false)
  }

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      {/* Selector row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 4 }}>
        {/* Swatch sphere */}
        <div style={{ ...swatchStyle(app.swatchHex, 30), alignSelf: 'flex-end', marginBottom: 4, cursor: 'pointer' }} onClick={() => setLibraryOpen(true)} title="Open material library" />

        <label style={{ flex: 1, minWidth: 0 }}>
          Material
          <div style={{ display: 'flex', gap: 4 }}>
            <select
              value={materialId}
              onChange={e => handleSelect(e.target.value)}
              style={SELECT_STYLE}
            >
              {allMaterials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}{isBuiltIn(m.id) && isModified(m.id) ? ' *' : ''}
                </option>
              ))}
            </select>
          </div>
        </label>

        <button type="button" onClick={() => setLibraryOpen(true)} style={BTN} title="Browse and manage all materials">
          Library
        </button>
      </div>

      {/* Properties summary */}
      <div style={{ display: 'flex', gap: 20, fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 4 }}>
        <span>E = {toDisplay(current.eGPa, us)} {modUnit}</span>
        <span>ν = {current.nu}</span>
        {current.yieldMPa != null && (
          us
            ? <span>σy = {+(current.yieldMPa * KSI_PER_MPA).toFixed(3)} ksi</span>
            : <span>σy = {current.yieldMPa} MPa</span>
        )}
        {current.densityKgM3 != null && (
          us
            ? <span>ρ = {+(current.densityKgM3 * LB_IN3_PER_KG_M3).toFixed(5)} lb/in³</span>
            : <span>ρ = {current.densityKgM3} kg/m³</span>
        )}
      </div>

      {/* Library modal */}
      {libraryOpen && (
        <MaterialLibraryModal
          currentId={materialId}
          unitSystem={unitSystem}
          onSelect={handleLibrarySelect}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  )
}
