/**
 * Transcalc project file schema (.tcalc.json)
 *
 * Captures the full session state so it can be saved and restored.
 * No backend required — download/upload via the browser.
 */

export const SCHEMA_VERSION = '1.0'

export interface ProjectMeta {
  /** Schema version for forward-compatibility checks */
  schemaVersion: string
  /** ISO 8601 timestamp of when the file was saved */
  savedAt: string
  /** Optional user-supplied description */
  description?: string
}

export interface ProjectState {
  meta: ProjectMeta

  /** 'SI' | 'US' */
  unitSystem: string

  /** Key of the currently selected calculator (e.g. 'bbcant', 'zvstemp') */
  selectedCalcKey: string

  /**
   * Per-calculator input snapshots.
   * Key = calcKey, value = record of input field names → values.
   * Only calculators the user has visited will have entries.
   */
  inputs: Record<string, Record<string, number | string | boolean>>
}

/** Construct a fresh ProjectState with sensible defaults */
export function newProject(): ProjectState {
  return {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
    },
    unitSystem: 'SI',
    selectedCalcKey: 'bbcant',
    inputs: {},
  }
}

/** Serialise a ProjectState to a pretty-printed JSON string */
export function serialiseProject(state: ProjectState): string {
  const fresh: ProjectState = {
    ...state,
    meta: {
      ...state.meta,
      savedAt: new Date().toISOString(),
    },
  }
  return JSON.stringify(fresh, null, 2)
}

/** Parse and validate a JSON string as a ProjectState. Throws on error. */
export function parseProject(json: string): ProjectState {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('File is not valid JSON.')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Project file must be a JSON object.')
  }

  const obj = parsed as Record<string, unknown>

  if (typeof obj['meta'] !== 'object' || obj['meta'] === null) {
    throw new Error('Missing "meta" field in project file.')
  }

  const meta = obj['meta'] as Record<string, unknown>
  if (typeof meta['schemaVersion'] !== 'string') {
    throw new Error('Missing or invalid "meta.schemaVersion".')
  }
  if (meta['schemaVersion'] !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported project version "${meta['schemaVersion']}". Expected "${SCHEMA_VERSION}".`
    )
  }

  if (typeof obj['unitSystem'] !== 'string') {
    throw new Error('Missing "unitSystem" in project file.')
  }
  if (typeof obj['selectedCalcKey'] !== 'string') {
    throw new Error('Missing "selectedCalcKey" in project file.')
  }
  if (typeof obj['inputs'] !== 'object' || obj['inputs'] === null) {
    throw new Error('Missing "inputs" in project file.')
  }

  return parsed as ProjectState
}
