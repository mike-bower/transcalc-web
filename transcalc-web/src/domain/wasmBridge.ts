/**
 * WASM bridge for performance-critical solvers.
 *
 * Setup (one-time):
 *   1. Install wasm-pack:  cargo install wasm-pack
 *   2. Build the module:   npm run build:wasm    (runs wasm-pack in transcalc-web/wasm/)
 *   3. Install Vite plugin: npm install -D vite-plugin-wasm
 *   4. Add to vite.config.ts:  import wasmPlugin from 'vite-plugin-wasm'; plugins: [react(), wasmPlugin()]
 *
 * When WASM is not built the bridge silently falls back to the pure-JS solver.
 */

import { solveCubicJs } from './cubicSolver'

type WasmModule = {
  solve_cubic: (a: number, b: number, c: number, d: number) => ArrayLike<number>
}

let wasmMod: WasmModule | null = null

// Use Function constructor so Vite's import-analysis plugin never sees this
// import specifier — safe because the module may not exist until wasm-pack is run.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const _dynamicImport = new Function('u', 'return import(u)') as (
  url: string
) => Promise<Record<string, unknown>>

/**
 * Try to load the compiled WASM module.
 * Safe to call even when wasm-pack has not been run — returns false in that case.
 */
export async function initWasm(): Promise<boolean> {
  try {
    // Build the URL relative to this module's location so it works with Vite's
    // dev server (/@fs/... paths) and in production (hashed assets).
    const wasmUrl = new URL('../../wasm/pkg/transcalc_wasm.js', import.meta.url).href
    const mod = await _dynamicImport(wasmUrl)
    if (typeof mod['default'] === 'function') {
      await (mod['default'] as () => Promise<void>)()
    }
    wasmMod = mod as unknown as WasmModule
    return true
  } catch {
    return false
  }
}

/** Whether the WASM module has been successfully loaded. */
export function isWasmLoaded(): boolean {
  return wasmMod !== null
}

/**
 * Solve a·x³ + b·x² + c·x + d = 0.
 * Uses the Rust/WASM implementation when available; otherwise the JS fallback.
 */
export function solveCubic(a: number, b: number, c: number, d: number): number[] {
  if (wasmMod) {
    try {
      const raw = wasmMod.solve_cubic(a, b, c, d)
      return Array.from(raw).filter((r) => Number.isFinite(r) && !isNaN(r))
    } catch {
      // WASM call failed — fall through to JS
    }
  }
  return solveCubicJs(a, b, c, d)
}
