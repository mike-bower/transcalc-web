import * as THREE from 'three'

export interface MaterialAppearance {
  color: number       // Three.js hex integer for body mesh
  roughness: number   // 0 = mirror, 1 = matte
  metalness: number   // 0 = dielectric, 1 = full metal
  swatchHex: string   // CSS hex color for UI swatch gradient
  category: string    // display grouping label
}

const TABLE: Record<string, MaterialAppearance> = {
  // ── Alloy steels ─────────────────────────────────────────────────────────
  steel_4340:         { color: 0x7a8d9e, roughness: 0.38, metalness: 0.80, swatchHex: '#7a8d9e', category: 'Alloy Steel' },
  steel_4140:         { color: 0x7a8d9e, roughness: 0.40, metalness: 0.78, swatchHex: '#7a8d9e', category: 'Alloy Steel' },

  // ── Maraging steel ────────────────────────────────────────────────────────
  maraging_18ni_250:  { color: 0x8e9aa6, roughness: 0.30, metalness: 0.82, swatchHex: '#8e9aa6', category: 'Maraging Steel' },

  // ── Stainless steels ─────────────────────────────────────────────────────
  ss_17_4_ph:         { color: 0xb4bec8, roughness: 0.18, metalness: 0.88, swatchHex: '#b4bec8', category: 'Stainless Steel' },
  ss_17_7_ph:         { color: 0xb4bec8, roughness: 0.20, metalness: 0.88, swatchHex: '#b4bec8', category: 'Stainless Steel' },
  ss_ph_15_7_mo:      { color: 0xb0bcc8, roughness: 0.18, metalness: 0.88, swatchHex: '#b0bcc8', category: 'Stainless Steel' },
  ss_15_5_ph:         { color: 0xb2bec8, roughness: 0.20, metalness: 0.87, swatchHex: '#b2bec8', category: 'Stainless Steel' },
  ss_304:             { color: 0xc8cccc, roughness: 0.14, metalness: 0.92, swatchHex: '#c8cccc', category: 'Stainless Steel' },

  // ── Aluminum alloys ───────────────────────────────────────────────────────
  al_2024_t81:        { color: 0xc4ccd4, roughness: 0.22, metalness: 0.84, swatchHex: '#c4ccd4', category: 'Aluminum' },
  al_2024_t4:         { color: 0xc4ccd4, roughness: 0.24, metalness: 0.83, swatchHex: '#c4ccd4', category: 'Aluminum' },
  al_7075_t6:         { color: 0xccd4dc, roughness: 0.20, metalness: 0.86, swatchHex: '#ccd4dc', category: 'Aluminum' },
  al_6061_t6:         { color: 0xbec8d0, roughness: 0.26, metalness: 0.83, swatchHex: '#bec8d0', category: 'Aluminum' },
  al_2014_t6:         { color: 0xc4ccd4, roughness: 0.22, metalness: 0.85, swatchHex: '#c4ccd4', category: 'Aluminum' },

  // ── Titanium ─────────────────────────────────────────────────────────────
  ti_6al4v:           { color: 0x7088a0, roughness: 0.32, metalness: 0.76, swatchHex: '#7088a0', category: 'Titanium' },

  // ── Beryllium copper ─────────────────────────────────────────────────────
  becu_25:            { color: 0xb88820, roughness: 0.22, metalness: 0.88, swatchHex: '#b88820', category: 'Beryllium Copper' },
}

export const DEFAULT_APPEARANCE: MaterialAppearance = {
  color: 0x8a9098, roughness: 0.35, metalness: 0.78, swatchHex: '#8a9098', category: 'Metal',
}

export const CATEGORY_ORDER = [
  'Alloy Steel', 'Maraging Steel', 'Stainless Steel',
  'Aluminum', 'Titanium', 'Beryllium Copper', 'User Material', 'Metal',
]

export function getMaterialAppearance(materialId?: string): MaterialAppearance {
  if (!materialId) return DEFAULT_APPEARANCE
  return TABLE[materialId] ?? DEFAULT_APPEARANCE
}

// Build a MeshStandardMaterial for the body of a model preview.
// Callers may pass overrides (e.g. adjusted roughness for a secondary surface).
export function makeBodyMaterial(
  materialId?: string,
  overrides: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  const app = getMaterialAppearance(materialId)
  return new THREE.MeshStandardMaterial({
    color: app.color,
    roughness: app.roughness,
    metalness: app.metalness,
    ...overrides,
  })
}

// CSS swatch gradient simulating a lit metallic sphere.
export function swatchStyle(hex: string, size = 28): React.CSSProperties {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const hi = `rgb(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)})`
  const mid = `rgb(${r},${g},${b})`
  const lo = `rgb(${Math.max(0, r - 55)},${Math.max(0, g - 55)},${Math.max(0, b - 55)})`
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle at 36% 32%, ${hi}, ${mid} 54%, ${lo} 100%)`,
    boxShadow: '0 2px 6px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.25)',
    border: '1px solid rgba(0,0,0,0.14)',
    flexShrink: 0,
  }
}
