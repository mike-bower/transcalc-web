import { useRef, useState } from 'react'
import { serialiseProject, parseProject, ProjectState } from '../domain/projectSchema'

type Props = {
  /** Called to get the current session state for download */
  onGetState: () => ProjectState
  /** Called after a project file is successfully loaded */
  onLoadState: (state: ProjectState) => void
}

export default function ProjectPanel({ onGetState, onLoadState }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadSuccess, setLoadSuccess] = useState(false)

  const handleDownload = () => {
    const state = onGetState()
    const json = serialiseProject(state)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcalc-${new Date().toISOString().slice(0, 10)}.tcalc.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoadError(null)
    setLoadSuccess(false)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const state = parseProject(reader.result as string)
        onLoadState(state)
        setLoadSuccess(true)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load project file.')
      }
    }
    reader.readAsText(file)

    // Reset input so the same file can be reloaded
    e.target.value = ''
  }

  return (
    <div className="project-panel">
      <div className="project-actions">
        <button className="export-btn" onClick={handleDownload}>
          ↓ Save Project
        </button>
        <button className="export-btn" onClick={() => fileRef.current?.click()}>
          ↑ Load Project
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.tcalc.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      {loadError && (
        <p className="workspace-note comp-error" style={{ marginTop: 6 }}>{loadError}</p>
      )}
      {loadSuccess && (
        <p className="workspace-note" style={{ marginTop: 6, color: '#1a6e3a' }}>Project loaded.</p>
      )}
    </div>
  )
}
