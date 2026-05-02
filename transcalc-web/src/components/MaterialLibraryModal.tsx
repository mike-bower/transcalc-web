import { useEffect, useRef, useState } from 'react'
import { MATERIALS, type Material } from '../domain/materials'
import { getMaterialAppearance, swatchStyle, CATEGORY_ORDER } from '../domain/materialAppearance'
import { useMaterialLibrary, type UserMaterial } from './MaterialContext'

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  currentId:  string
  unitSystem: 'SI' | 'US'
  onSelect:   (id: string) => void
  onClose:    () => void
}

interface DraftMaterial extends Omit<UserMaterial, 'isUserCreated'> {}

const BLANK: DraftMaterial = {
  id: '', name: '', eGPa: 200, nu: 0.30, densityKgM3: 7850, yieldMPa: undefined,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GPA_PER_MPSI = 6.8947572932

function fmt(v: number | undefined, d = 0): string {
  return v != null && Number.isFinite(v) ? v.toFixed(d) : '—'
}

function groupByCategory(materials: Material[]): Map<string, Material[]> {
  const map = new Map<string, Material[]>()
  for (const m of materials) {
    const cat = getMaterialAppearance(m.id).category
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(m)
  }
  return map
}

// ── Styles ────────────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', padding: '5px 8px', borderRadius: 4,
  border: '1px solid #cbd5e1', background: '#fff', fontFamily: 'inherit', fontSize: 13,
}

const BTN_BASE: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
  fontFamily: 'inherit', whiteSpace: 'nowrap',
}

const BTN_EDIT:    React.CSSProperties = { ...BTN_BASE, border: '1px solid #94a3b8', background: '#f1f5f9', color: '#334155' }
const BTN_RESET:   React.CSSProperties = { ...BTN_BASE, border: '1px solid #fcd34d', background: '#fefce8', color: '#92400e' }
const BTN_DELETE:  React.CSSProperties = { ...BTN_BASE, border: '1px solid #fca5a5', background: '#fff1f2', color: '#b91c1c' }
const BTN_SELECT:  React.CSSProperties = { ...BTN_BASE, border: '1px solid rgba(96,165,250,0.7)', background: 'rgba(37,99,235,0.85)', color: '#fff' }
const BTN_RESTORE: React.CSSProperties = { ...BTN_BASE, border: '1px solid #86efac', background: '#f0fdf4', color: '#166534' }
const BTN_PRIMARY: React.CSSProperties = { ...BTN_BASE, padding: '6px 14px', border: '1px solid rgba(96,165,250,0.7)', background: 'rgba(37,99,235,0.85)', color: '#fff', fontSize: 13 }
const BTN_CANCEL:  React.CSSProperties = { ...BTN_BASE, padding: '6px 14px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: 13 }

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaterialLibraryModal({ currentId, unitSystem, onSelect, onClose }: Props) {
  const us = unitSystem === 'US'
  const lib = useMaterialLibrary()
  const { allMaterials, hiddenIds, addMaterial, editMaterial, deleteMaterial, resetBuiltIn, restoreBuiltIn, isBuiltIn, isModified } = lib

  const [search, setSearch]         = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)  // null = new
  const [draft, setDraft]           = useState<DraftMaterial>({ ...BLANK })
  const [draftErr, setDraftErr]     = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Focus search on open
  useEffect(() => { searchRef.current?.focus() }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { editorOpen ? setEditorOpen(false) : onClose() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editorOpen, onClose])

  // ── Editor ────────────────────────────────────────────────────────────────

  function openNew() {
    setDraft({ ...BLANK, id: `user_${Date.now()}` })
    setEditId(null)
    setDraftErr('')
    setEditorOpen(true)
  }

  function openEdit(m: Material) {
    setDraft({ id: m.id, name: m.name, eGPa: m.eGPa, nu: m.nu, densityKgM3: m.densityKgM3, yieldMPa: m.yieldMPa, remarks: m.remarks })
    setEditId(m.id)
    setDraftErr('')
    setEditorOpen(true)
  }

  function saveEditor() {
    if (!draft.name.trim()) { setDraftErr('Name is required.'); return }
    if (editId === null) {
      if (!draft.id.trim()) { setDraftErr('ID is required.'); return }
      if (allMaterials.some(m => m.id === draft.id)) { setDraftErr(`ID "${draft.id}" already exists.`); return }
      addMaterial(draft)
    } else {
      editMaterial(editId, { name: draft.name, eGPa: draft.eGPa, nu: draft.nu, densityKgM3: draft.densityKgM3, yieldMPa: draft.yieldMPa, remarks: draft.remarks })
    }
    setEditorOpen(false)
  }

  // ── Filtered + grouped materials ──────────────────────────────────────────

  const q = search.trim().toLowerCase()
  const filtered = allMaterials.filter(m =>
    !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) ||
    getMaterialAppearance(m.id).category.toLowerCase().includes(q),
  )

  const grouped = groupByCategory(filtered)
  const orderedCats = CATEGORY_ORDER.filter(c => grouped.has(c))
  // Any categories not in CATEGORY_ORDER go at the end
  for (const c of grouped.keys()) if (!orderedCats.includes(c)) orderedCats.push(c)

  const hiddenBuiltIns = MATERIALS.filter(m => hiddenIds.includes(m.id))
    .filter(m => !q || m.name.toLowerCase().includes(q))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 10, width: 'min(860px, 95vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#0f172a', flex: 1 }}>Material Library</h2>
          <input
            ref={searchRef}
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...INPUT, width: 200, flex: 'none' }}
          />
          <button style={BTN_PRIMARY} onClick={openNew}>+ New Material</button>
          <button onClick={onClose} style={{ ...BTN_BASE, border: 'none', background: 'none', fontSize: 18, color: '#64748b', padding: '2px 6px' }} title="Close">×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px 20px' }}>

          {orderedCats.map(cat => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>
                {cat}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {grouped.get(cat)!.map(m => (
                  <MaterialRow
                    key={m.id}
                    material={m}
                    isCurrent={m.id === currentId}
                    isBuiltIn={isBuiltIn(m.id)}
                    isModified={isModified(m.id)}
                    isUserCreated={'isUserCreated' in m}
                    us={us}
                    onSelect={() => { onSelect(m.id); onClose() }}
                    onEdit={() => openEdit(m)}
                    onDelete={() => {
                      const label = isBuiltIn(m.id) ? 'hide' : 'delete'
                      if (window.confirm(`${label === 'hide' ? 'Hide' : 'Delete'} "${m.name}"?`)) deleteMaterial(m.id)
                    }}
                    onReset={isBuiltIn(m.id) && isModified(m.id) ? () => { if (window.confirm(`Reset "${m.name}" to built-in defaults?`)) resetBuiltIn(m.id) } : undefined}
                  />
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && !hiddenBuiltIns.length && (
            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>No materials match "{search}".</p>
          )}

          {/* Hidden materials */}
          {hiddenBuiltIns.length > 0 && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                Hidden Built-In Materials
              </div>
              {hiddenBuiltIns.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', opacity: 0.7 }}>
                  <div style={swatchStyle(getMaterialAppearance(m.id).swatchHex, 22)} />
                  <span style={{ flex: 1, fontSize: 13, color: '#475569' }}>{m.name}</span>
                  <button style={BTN_RESTORE} onClick={() => restoreBuiltIn(m.id)}>Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor sub-modal */}
      {editorOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setEditorOpen(false) }}
        >
          <div style={{ background: '#fff', borderRadius: 8, padding: '24px 28px', width: 420, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>
              {editId === null ? 'New Material' : `Edit: ${draft.name || editId}`}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ gridColumn: '1 / -1' }}>
                Name
                <input type="text" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={{ ...INPUT, marginTop: 4 }} />
              </label>
              {editId === null && (
                <label style={{ gridColumn: '1 / -1' }}>
                  ID (unique, no spaces)
                  <input type="text" value={draft.id}
                    onChange={e => { setDraft(d => ({ ...d, id: e.target.value.replace(/\s/g, '_') })); setDraftErr('') }}
                    style={{ ...INPUT, marginTop: 4, borderColor: draftErr ? '#f87171' : undefined }}
                  />
                </label>
              )}
              <label>
                E (GPa)
                <input type="number" min={0} step={0.1} value={draft.eGPa} onChange={e => setDraft(d => ({ ...d, eGPa: +e.target.value }))} style={{ ...INPUT, marginTop: 4 }} />
              </label>
              <label>
                ν (Poisson)
                <input type="number" min={0} max={0.5} step={0.01} value={draft.nu} onChange={e => setDraft(d => ({ ...d, nu: +e.target.value }))} style={{ ...INPUT, marginTop: 4 }} />
              </label>
              <label>
                Density (kg/m³)
                <input type="number" min={0} step={10} value={draft.densityKgM3} onChange={e => setDraft(d => ({ ...d, densityKgM3: +e.target.value }))} style={{ ...INPUT, marginTop: 4 }} />
              </label>
              <label>
                σy (MPa) — optional
                <input type="number" min={0} step={1} value={draft.yieldMPa ?? ''} placeholder="—"
                  onChange={e => setDraft(d => ({ ...d, yieldMPa: e.target.value === '' ? undefined : +e.target.value }))}
                  style={{ ...INPUT, marginTop: 4 }} />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Remarks (optional)
                <input type="text" value={draft.remarks ?? ''} onChange={e => setDraft(d => ({ ...d, remarks: e.target.value }))} style={{ ...INPUT, marginTop: 4 }} />
              </label>
            </div>
            {draftErr && <p style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0' }}>{draftErr}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={BTN_CANCEL} onClick={() => setEditorOpen(false)}>Cancel</button>
              <button style={BTN_PRIMARY} onClick={saveEditor}>{editId === null ? 'Add Material' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Material row ──────────────────────────────────────────────────────────────

interface RowProps {
  material:      Material
  isCurrent:     boolean
  isBuiltIn:     boolean
  isModified:    boolean
  isUserCreated: boolean
  us:            boolean
  onSelect:      () => void
  onEdit:        () => void
  onDelete:      () => void
  onReset?:      () => void
}

function MaterialRow({ material: m, isCurrent, isBuiltIn, isModified, isUserCreated, us, onSelect, onEdit, onDelete, onReset }: RowProps) {
  const app = getMaterialAppearance(m.id)
  const E = us ? (m.eGPa / 6.8947572932).toFixed(3) + ' Mpsi' : m.eGPa + ' GPa'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6,
      background: isCurrent ? 'rgba(37,99,235,0.06)' : 'transparent',
      border: isCurrent ? '1px solid rgba(96,165,250,0.4)' : '1px solid transparent',
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc' }}
      onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      {/* Swatch */}
      <div style={swatchStyle(app.swatchHex, 30)} />

      {/* Name + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{m.name}</span>
          {isUserCreated && <Badge color="#6366f1" bg="rgba(99,102,241,0.10)">User</Badge>}
          {isBuiltIn && isModified && <Badge color="#b45309" bg="#fef3c7">Modified</Badge>}
          {isCurrent && <Badge color="#1d4ed8" bg="rgba(37,99,235,0.10)">Selected</Badge>}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
          E = {E} &nbsp;·&nbsp; ν = {m.nu} &nbsp;·&nbsp; ρ = {m.densityKgM3} kg/m³
          {m.yieldMPa != null && <>&nbsp;·&nbsp; σy = {m.yieldMPa} MPa</>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button style={BTN_SELECT} onClick={onSelect}>Select</button>
        <button style={BTN_EDIT}   onClick={onEdit}>Edit</button>
        {onReset && <button style={BTN_RESET} onClick={onReset} title="Reset to built-in defaults">Reset</button>}
        <button style={BTN_DELETE} onClick={onDelete} title={isBuiltIn ? 'Hide from list' : 'Delete'}>
          {isBuiltIn ? 'Hide' : 'Del'}
        </button>
      </div>
    </div>
  )
}

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '1px 6px', borderRadius: 10, color, background: bg, textTransform: 'uppercase' }}>
      {children}
    </span>
  )
}
