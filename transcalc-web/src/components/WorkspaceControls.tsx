import type { ReactNode } from 'react'

type UnitSystem = 'SI' | 'US'

interface Props {
  unitSystem: UnitSystem
  onUnitChange: (u: UnitSystem) => void
  mode: 'analytical' | '3d-fea'
  onModeChange: (m: 'analytical' | '3d-fea') => void
  children?: ReactNode
}

export default function WorkspaceControls({ unitSystem, onUnitChange, mode, onModeChange, children }: Props) {
  return (
    <div className="workspace-controls">
      <div className="analysis-toggle">
        <button className={mode === 'analytical' ? 'active' : ''} onClick={() => onModeChange('analytical')}>Analytical</button>
        <button className={mode === '3d-fea' ? 'active' : ''} onClick={() => onModeChange('3d-fea')}>3D FEA</button>
      </div>
      <div className="analysis-toggle">
        <button className={unitSystem === 'SI' ? 'active' : ''} onClick={() => onUnitChange('SI')}>SI</button>
        <button className={unitSystem === 'US' ? 'active' : ''} onClick={() => onUnitChange('US')}>US</button>
      </div>
      {children}
    </div>
  )
}
