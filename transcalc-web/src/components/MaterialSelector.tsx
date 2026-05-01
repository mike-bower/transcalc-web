/**
 * MaterialSelector — drop-in replacement for the inline material <select> +
 * properties block that every calculator currently duplicates.
 *
 * Usage
 * -----
 *   <MaterialSelector
 *     materialId={materialId}
 *     unitSystem={unitSystem}
 *     onSelect={sel => {
 *       setMaterialId(sel.id)
 *       setModulusGPa(sel.eGPaDisplay)
 *       setPoisson(sel.nu)
 *     }}
 *   />
 *
 * `sel.eGPaDisplay` is already converted to the display unit:
 *   - SI  → GPa
 *   - US  → Mpsi
 *
 * When the user picks "Custom" the component still calls onSelect so the
 * caller can update materialId; it passes the *current* display values
 * back unchanged so the calculator's existing inputs keep their values.
 *
 * The component also provides an optional modal editor for user-created
 * materials (CRUD via MaterialLibraryContext).
 */
import { useState } from 'react'
import { MATERIALS, getMaterial, type Material } from '../domain/materials'
import { useMaterialLibrary, type UserMaterial } from './MaterialContext'

const GPA_PER_MPSI = 6.8947572932

// ── Types ────────────────────────────────────────────────────────────────────

export interface MaterialSelection {
  id: string
  name: string
  eGPaDisplay: number   // GPa (SI) or Mpsi (US)
  nu: number
  densityKgM3: number
  yieldMPa?: number
}

interface Props {
  materialId: string
  unitSystem: 'SI' | 'US'
  /** Called when the user selects any material (including Custom). */
  onSelect: (sel: MaterialSelection) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDisplay(eGPa: number, us: boolean): number {
  return us ? +(eGPa / GPA_PER_MPSI).toFixed(4) : eGPa
}

function selectionFrom(m: Material, us: boolean): MaterialSelection {
  return {
    id: m.id,
    name: m.name,
    eGPaDisplay: toDisplay(m.eGPa, us),
    nu: m.nu,
    densityKgM3: m.densityKgM3,
    yieldMPa: m.yieldMPa,
  }
}

function optionLabel(m: Material): string {
  const e = m.eGPa
  const yl = m.yieldMPa ? `, σy=${m.yieldMPa} MPa` : ''
  return `${m.name} — E=${e} GPa${yl}`
}

// ── Blank template for a new user material ───────────────────────────────────

const BLANK_USER: Omit<UserMaterial, 'isUserCreated'> = {
  id: '',
  name: '',
  eGPa: 200,
  nu: 0.30,
  densityKgM3: 7850,
  yieldMPa: undefined,
}

// ── Styles ────────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid var(--line)',
  background: '#fff',
  color: 'var(--ink)',
  marginTop: 4,
  fontFamily: 'inherit',
  fontSize: 'inherit',
}

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  marginTop: 4,
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaterialSelector({ materialId, unitSystem, onSelect }: Props) {
  const us = unitSystem === 'US'
  const modUnit = us ? 'Mpsi' : 'GPa'

  const { allMaterials, addMaterial, updateMaterial, deleteMaterial, userMaterials } =
    useMaterialLibrary()

  // ── Editor modal state ──────────────────────────────────────────────────────
  const [editorOpen, setEditorOpen]       = useState(false)
  const [editTarget, setEditTarget]       = useState<string | null>(null) // id being edited, or null = new
  const [draft, setDraft]                 = useState<Omit<UserMaterial, 'isUserCreated'>>(BLANK_USER)
  const [idError, setIdError]             = useState('')

  // ── Resolve current material ────────────────────────────────────────────────
  const current = allMaterials.find(m => m.id === materialId) ?? getMaterial(materialId)
  const isCustom = materialId === 'custom'
  const isUserMaterial = userMaterials.some(m => m.id === materialId)

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSelect(id: string) {
    const m = allMaterials.find(mat => mat.id === id) ?? getMaterial(id)
    onSelect(selectionFrom(m, us))
  }

  function openNewEditor() {
    setDraft({ ...BLANK_USER, id: `user_${Date.now()}` })
    setEditTarget(null)
    setIdError('')
    setEditorOpen(true)
  }

  function openEditEditor(id: string) {
    const m = userMaterials.find(mat => mat.id === id)
    if (!m) return
    setDraft({ ...m })
    setEditTarget(id)
    setIdError('')
    setEditorOpen(true)
  }

  function handleEditorSave() {
    if (!draft.name.trim()) { setIdError('Name is required.'); return }
    if (!draft.id.trim())   { setIdError('ID is required.');   return }
    if (editTarget === null) {
      // new material — check for id conflict
      if (allMaterials.some(m => m.id === draft.id)) {
        setIdError(`ID "${draft.id}" already exists. Choose a different ID.`)
        return
      }
      addMaterial(draft)
      // auto-select the new material
      onSelect(selectionFrom({ ...draft, isUserCreated: true } as UserMaterial, us))
    } else {
      updateMaterial(editTarget, {
        name: draft.name,
        eGPa: draft.eGPa,
        nu: draft.nu,
        densityKgM3: draft.densityKgM3,
        yieldMPa: draft.yieldMPa,
        remarks: draft.remarks,
      })
      // Re-apply if currently selected
      if (materialId === editTarget) {
        onSelect(selectionFrom({ ...draft, id: editTarget } as Material, us))
      }
    }
    setEditorOpen(false)
  }

  function handleDelete(id: string) {
    if (!window.confirm(`Delete user material "${id}"? This cannot be undone.`)) return
    deleteMaterial(id)
    // If deleted material was selected, fall back to default
    if (materialId === id) {
      const fallback = getMaterial('steel_4340')
      onSelect(selectionFrom(fallback, us))
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      {/* ── Material select row ── */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 4 }}>
        <label style={{ flex: 1, minWidth: 0 }}>
          Material
          <select
            value={materialId}
            onChange={e => handleSelect(e.target.value)}
            style={SELECT_STYLE}
          >
            {allMaterials.map(m => (
              <option key={m.id} value={m.id}>{optionLabel(m)}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={openNewEditor}
          title="Add user material"
          style={{
            padding: '5px 10px', borderRadius: 4, border: '1px solid var(--line)',
            background: '#f1f5f9', color: 'var(--ink)', cursor: 'pointer',
            fontSize: 13, lineHeight: 1, marginBottom: 0, whiteSpace: 'nowrap',
            alignSelf: 'flex-end',
          }}
        >
          + New
        </button>
        {isUserMaterial && (
          <>
            <button
              type="button"
              onClick={() => openEditEditor(materialId)}
              title="Edit this user material"
              style={{
                padding: '5px 8px', borderRadius: 4, border: '1px solid var(--line)',
                background: '#f1f5f9', color: 'var(--ink)', cursor: 'pointer',
                fontSize: 13, alignSelf: 'flex-end',
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(materialId)}
              title="Delete this user material"
              style={{
                padding: '5px 8px', borderRadius: 4, border: '1px solid #fca5a5',
                background: '#fff1f2', color: '#b91c1c', cursor: 'pointer',
                fontSize: 13, alignSelf: 'flex-end',
              }}
            >
              Del
            </button>
          </>
        )}
      </div>

      {/* ── Properties display / custom inputs ── */}
      {isCustom ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
          <label>
            Modulus of Elasticity ({modUnit})
            <input
              type="number"
              value={toDisplay(current.eGPa, us)}
              onChange={e => {
                const display = +e.target.value
                onSelect({
                  ...selectionFrom(current, us),
                  eGPaDisplay: display,
                })
              }}
              style={INPUT_STYLE}
            />
          </label>
          <label>
            Poisson Ratio ν
            <input
              type="number"
              value={current.nu}
              onChange={e => {
                onSelect({
                  ...selectionFrom(current, us),
                  nu: +e.target.value,
                })
              }}
              style={INPUT_STYLE}
            />
          </label>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 4 }}>
          <span>E = {toDisplay(current.eGPa, us)} {modUnit}</span>
          <span>ν = {current.nu}</span>
          {current.yieldMPa != null && <span>σy = {current.yieldMPa} MPa</span>}
        </div>
      )}

      {/* ── User material editor modal ── */}
      {editorOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={e => { if (e.target === e.currentTarget) setEditorOpen(false) }}
        >
          <div
            style={{
              background: '#fff', borderRadius: 8, padding: '24px 28px',
              width: 420, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>
              {editTarget === null ? 'New User Material' : `Edit: ${draft.name}`}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ gridColumn: '1 / -1' }}>
                Name
                <input
                  type="text" value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              {editTarget === null && (
                <label style={{ gridColumn: '1 / -1' }}>
                  ID (unique, no spaces)
                  <input
                    type="text" value={draft.id}
                    onChange={e => { setDraft(d => ({ ...d, id: e.target.value.replace(/\s/g, '_') })); setIdError('') }}
                    style={{ ...INPUT_STYLE, borderColor: idError ? '#f87171' : undefined }}
                  />
                  {idError && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{idError}</span>}
                </label>
              )}
              <label>
                E (GPa)
                <input
                  type="number" min={0} step={0.1} value={draft.eGPa}
                  onChange={e => setDraft(d => ({ ...d, eGPa: +e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label>
                ν (Poisson)
                <input
                  type="number" min={0} max={0.5} step={0.01} value={draft.nu}
                  onChange={e => setDraft(d => ({ ...d, nu: +e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label>
                Density (kg/m³)
                <input
                  type="number" min={0} step={10} value={draft.densityKgM3}
                  onChange={e => setDraft(d => ({ ...d, densityKgM3: +e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label>
                Yield Strength (MPa)
                <input
                  type="number" min={0} step={1}
                  value={draft.yieldMPa ?? ''}
                  onChange={e =>
                    setDraft(d => ({
                      ...d,
                      yieldMPa: e.target.value === '' ? undefined : +e.target.value,
                    }))
                  }
                  placeholder="optional"
                  style={INPUT_STYLE}
                />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Remarks (optional)
                <input
                  type="text" value={draft.remarks ?? ''}
                  onChange={e => setDraft(d => ({ ...d, remarks: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
            </div>

            {idError && editTarget !== null && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '8px 0 0' }}>{idError}</p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                style={{
                  padding: '6px 16px', borderRadius: 4,
                  border: '1px solid var(--line)', background: '#f1f5f9',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditorSave}
                style={{
                  padding: '6px 16px', borderRadius: 4,
                  border: '1px solid rgba(96,165,250,0.7)',
                  background: 'rgba(37,99,235,0.85)', color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {editTarget === null ? 'Add Material' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
