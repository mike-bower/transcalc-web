import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateBinobeamStrainExplicit } from '../domain/binobeam'
import { solveBinobeamFea, type BinobeamFeaResult } from '../domain/fea/binobeamSolver'
import BinobeamFeaViewer from './BinobeamFeaViewer'
import BinocularSketch2D from './BinocularSketch2D'
import { BinocularModelPreview } from './BinocularModelPreview'
import { BinocularStrainProfile } from './diagrams/BinocularStrainProfile'

const parseInput = (raw: string): number => {
  if (raw.trim() === '') return Number.NaN
  return Number(raw)
}

const show = (value: number, digits: number): string => (Number.isFinite(value) ? value.toFixed(digits) : '—')
const round = (value: number, digits: number = 8): number => {
  const p = Math.pow(10, digits)
  return Math.round(value * p) / p
}

type UnitSystem = 'US' | 'SI'

const N_PER_LBF = 4.4482216152605
const MM_PER_IN = 25.4
const MPSI_PER_GPA = 0.1450377377
const GPA_PER_MPSI = 6.8947572932
const BINOBEAM_FEA_MESH = {
  elementsAlongLength: 16,
  elementsAlongHeight: 10,
} as const

type BinocularBeamWorkspaceProps = {
  unitSystem: UnitSystem
  onUnitChange: (next: UnitSystem) => void
  onHelpTokensChange?: (tokens: Record<string, string>) => void
}

export default function BinocularBeamWorkspace({ unitSystem, onUnitChange, onHelpTokensChange }: BinocularBeamWorkspaceProps) {
  const [analysisPath, setAnalysisPath] = useState<'closed-form' | 'fea'>('closed-form')
  const [activeFrame, setActiveFrame] = useState<'design' | 'compensation' | 'trim'>('design')
  const [appliedForce, setAppliedForce] = useState(unitSystem === 'US' ? 100 : 500)
  const [distanceBetweenHoles, setDistanceBetweenHoles] = useState(unitSystem === 'US' ? 2.5 : 60)
  const [radius, setRadius] = useState(unitSystem === 'US' ? 0.5 : 12)
  const [beamWidth, setBeamWidth] = useState(unitSystem === 'US' ? 1.0 : 25)
  const [beamHeight, setBeamHeight] = useState(unitSystem === 'US' ? 2.0 : 50)
  const [minimumThickness, setMinimumThickness] = useState(unitSystem === 'US' ? 0.15 : 4)
  const [modulus, setModulus] = useState(unitSystem === 'US' ? 10.6 : 73.1)
  const [gageLength, setGageLength] = useState(unitSystem === 'US' ? 0.25 : 6)
  const [gageFactor, setGageFactor] = useState(2.1)
  const [bridgeConfig, setBridgeConfig] = useState(0) // 0: Full, 1: Half, 2: Poisson, 3: Quarter
  const [poisson, setPoisson] = useState(0.33)
  const [feaState, setFeaState] = useState<{
    result: BinobeamFeaResult | null
    error: string
    isSolving: boolean
  }>({
    result: null,
    error: '',
    isSolving: false,
  })

  const distanceLoadHole = 0

  const forceUnit = unitSystem === 'US' ? 'lbf' : 'N'
  const lengthUnit = unitSystem === 'US' ? 'in' : 'mm'
  const modulusUnit = unitSystem === 'US' ? 'Mpsi' : 'GPa'

  const prevUnit = useRef<UnitSystem>(unitSystem)
  useEffect(() => {
    if (prevUnit.current === unitSystem) return
    prevUnit.current = unitSystem
    if (unitSystem === 'SI') {
      setAppliedForce((v) => round(v * N_PER_LBF))
      setDistanceBetweenHoles((v) => round(v * MM_PER_IN))
      setRadius((v) => round(v * MM_PER_IN))
      setBeamWidth((v) => round(v * MM_PER_IN))
      setBeamHeight((v) => round(v * MM_PER_IN))
      setMinimumThickness((v) => round(v * MM_PER_IN))
      setModulus((v) => round(v * GPA_PER_MPSI))
      setGageLength((v) => round(v * MM_PER_IN))
    } else {
      setAppliedForce((v) => round(v / N_PER_LBF))
      setDistanceBetweenHoles((v) => round(v / MM_PER_IN))
      setRadius((v) => round(v / MM_PER_IN))
      setBeamWidth((v) => round(v / MM_PER_IN))
      setBeamHeight((v) => round(v / MM_PER_IN))
      setMinimumThickness((v) => round(v / MM_PER_IN))
      setModulus((v) => round(v * MPSI_PER_GPA))
      setGageLength((v) => round(v / MM_PER_IN))
    }
  }, [unitSystem])

  const result = useMemo(() => {
    const checks: Array<[number, string]> = [
      [appliedForce, 'Applied Force'],
      [distanceBetweenHoles, 'Distance between Holes'],
      [radius, 'Radius'],
      [beamWidth, 'Beam Width'],
      [beamHeight, 'Beam Height'],
      [minimumThickness, 'Minimum Thickness'],
      [modulus, 'Modulus of Elasticity'],
      [gageLength, 'Gage Length'],
      [gageFactor, 'Gage Factor'],
    ]
    const bad = checks.find(([value]) => !Number.isFinite(value) || value <= 0)
    if (bad) {
      return {
        error: `${bad[1]} must be a positive value.`,
        avgStrain: Number.NaN,
        gradient: Number.NaN,
        fullSpanSensitivity: Number.NaN,
        zOffset: Number.NaN,
        gageCenterline: Number.NaN,
      }
    }

    try {
      const solved = calculateBinobeamStrainExplicit(
        {
          appliedLoad: appliedForce,
          distanceBetweenHoles: distanceBetweenHoles,
          radius,
          beamWidth,
          beamHeight,
          distanceLoadHole,
          minimumThickness,
          modulus,
          gageLength,
          gageFactor,
        },
        unitSystem
      )
      const zUnits = unitSystem === 'US' ? solved.zOffset / 0.0254 : solved.zOffset / 0.001
      return {
        error: '',
        ...solved,
        gageCenterline: distanceBetweenHoles + zUnits * 2,
      }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Unable to solve binocular beam.',
        avgStrain: Number.NaN,
        gradient: Number.NaN,
        fullSpanSensitivity: Number.NaN,
        zOffset: Number.NaN,
        gageCenterline: Number.NaN,
      }
    }
  }, [appliedForce, distanceBetweenHoles, radius, beamWidth, beamHeight, minimumThickness, modulus, gageLength, gageFactor, distanceLoadHole, unitSystem])

  useEffect(() => {
    if (analysisPath !== 'fea') return
    setFeaState((prev) => ({ ...prev, isSolving: true, error: '' }))
    const timer = window.setTimeout(() => {
      try {
        const solved = solveBinobeamFea(
          {
            unitSystem,
            appliedForce,
            distanceBetweenGageCls: distanceBetweenHoles,
            radius,
            beamWidth,
            beamHeight,
            minimumThickness,
            modulus,
            gageLength,
            gageFactor,
          },
          BINOBEAM_FEA_MESH
        )
        setFeaState({
          result: solved,
          error: '',
          isSolving: false,
        })
      } catch (err) {
        setFeaState({
          result: null,
          error: err instanceof Error ? err.message : 'Unable to solve binocular FEA for current inputs.',
          isSolving: false,
        })
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [analysisPath, unitSystem, appliedForce, distanceBetweenGageCls, radius, beamWidth, beamHeight, minimumThickness, modulus, gageLength, gageFactor])

  useEffect(() => {
    if (!onHelpTokensChange) return
    onHelpTokensChange({
      af1: Number.isFinite(appliedForce) ? appliedForce.toString() : '—',
      af2: forceUnit,
      cl1: Number.isFinite(distanceBetweenHoles) ? distanceBetweenHoles.toString() : '—',
      cl2: lengthUnit,
      rad1: Number.isFinite(radius) ? radius.toString() : '—',
      rad2: lengthUnit,
      bw1: Number.isFinite(beamWidth) ? beamWidth.toString() : '—',
      bw2: lengthUnit,
      bh1: Number.isFinite(beamHeight) ? beamHeight.toString() : '—',
      bh2: lengthUnit,
      mt1: Number.isFinite(minimumThickness) ? minimumThickness.toString() : '—',
      mt2: lengthUnit,
      me1: Number.isFinite(modulus) ? modulus.toString() : '—',
      me2: modulusUnit,
      gl1: Number.isFinite(gageLength) ? gageLength.toString() : '—',
      gl2: lengthUnit,
      gf1: Number.isFinite(gageFactor) ? gageFactor.toString() : '—',
      gc1: show(result.gageCenterline, 4),
      gcu1: lengthUnit,
      gs1: show(result.avgStrain, 1),
      sv1: show(result.gradient, 2),
      sf1: show(result.fullSpanSensitivity, 4),
    })
  }, [
    onHelpTokensChange,
    appliedForce,
    distanceBetweenHoles,
    radius,
    beamWidth,
    beamHeight,
    minimumThickness,
    modulus,
    gageLength,
    gageFactor,
    forceUnit,
    lengthUnit,
    modulusUnit,
    result.gageCenterline,
    result.avgStrain,
    result.gradient,
    result.fullSpanSensitivity,
  ])

  return (
    <div cWorkflow Navigation Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-700 shrink-0 shadow-sm z-10 transition-colors">
        <div className="flex items-center space-x-8">
          <h2 className="text-xl font-bold text-white tracking-tight mr-4">Transcalc</h2>
          <nav className="flex space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            {[
              { id: 'design', label: '① Design' },
              { id: 'compensation', label: '② Compensation' },
              { id: 'trim', label: '③ Trim' }
            ].map((frame) => (
              <button
                key={frame.id}
                onClick={() => setActiveFrame(frame.id as any)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                  activeFrame === frame.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {frame.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="inline-flex p-1 bg-slate-800 rounded-lg shadow-sm border border-slate-700">
            <button
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all duration-200 ${
                analysisPath === 'closed-form'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setAnalysisPath('closed-form')}
            >
              Closed-form
            </button>
            <button
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all duration-200 ${
                analysisPath === 'fea'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setAnalysisPath('fea')}
            >
              FEA Analysis
            </button>
          </div>
          <div className="inline-flex p-1 bg-slate-800 rounded-xl shadow-sm border border-slate-700">
            {(['SI', 'US'] as const).map((sys) => (
              <button
                key={sys}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                  unitSystem === sys
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => onUnitChange(sys)}
              >
                {sys}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden bg-slate-900">
        {/* Sidebar: Geometric Parameters */}
        <aside className="w-80 border-r border-slate-700 bg-slate-800 overflow-y-auto px-6 py-6 pb-20 scrollbar-thin">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Geometric Parameters</h3>
              <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center">
                <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path></svg>
              </div>
            </div>
            
            {[
              { label: 'Applied Force', unit: forceUnit, value: appliedForce, setter: setAppliedForce },
              { label: 'Hole Spacing', unit: lengthUnit, value: distanceBetweenHoles, setter: setDistanceBetweenHoles },
              { label: 'Hole Radius', unit: lengthUnit, value: radius, setter: setRadius },
              { label: 'Beam Width', unit: lengthUnit, value: beamWidth, setter: setBeamWidth },
              { label: 'Beam Height', unit: lengthUnit, value: beamHeight, setter: setBeamHeight },
              { label: 'Min. Thickness', unit: lengthUnit, value: minimumThickness, setter: setMinimumThickness },
              { label: 'Modulus', unit: modulusUnit, value: modulus, setter: setModulus },
              { label: 'Gage Length', unit: lengthUnit, value: gageLength, setter: setGageLength },
              { label: 'Gage Factor', unit: '', value: gageFactor, setter: setGageFactor, isDimensionless: true }
            ].map((field, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-1.5 px-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                <label className="text-[11px] font-bold text-slate-200 uppercase tracking-tight flex-1 truncate">
                  {field.label}
                  {field.unit && <span className="ml-1 text-[9px] text-slate-400 font-normal lowercase tracking-normal">({field.unit})</span>}
                </label>
                <div className="shrink-0">
                  <input
                    type="number"
                    step="any"
                    className="w-24 px-3 py-1 text-right text-xs border border-slate-600 rounded bg-slate-900 focus:bg-slate-950 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none font-mono font-bold text-blue-400 placeholder-slate-700 shadow-inner"
                    value={Number.isFinite(field.value) ? field.value : ''}
                    onChange={(e) => field.setter(parseInput(e.target.value))}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
             <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
               <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 text-center">Reference Profile</h4>
               <img 
                src="/legacy-help/bino.jpg" 
                alt="Binocular beam geometry" 
                className="max-w-full h-auto rounded-lg opacity-40 hover:opacity-100 transition-opacity grayscale invert" 
              />
             </div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 flex flex-col min-h-0 bg-slate-900 p-6 overflow-y-auto scrollbar-thin">
          {/* Global Design Results */}
          <section className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Nominal Strain', value: show(result.avgStrain, 1), unit: 'µε', color: 'text-blue-400', bg: 'bg-blue-400/5' },
              { label: 'Strain Range', value: `${show(result.minStrain, 0)}-${show(result.maxStrain, 0)}`, unit: 'µε', color: 'text-slate-100', bg: 'bg-white/5' },
              { label: 'Variation', value: show(result.gradient, 2), unit: '%', color: 'text-amber-400', bg: 'bg-amber-400/5' },
              { label: 'Sensitivity', value: show(result.fullSpanSensitivity, 4), unit: 'mV/V', color: 'text-emerald-400', bg: 'bg-emerald-400/5' }
            ].map((res, i) => (
              <div key={i} className={`${res.bg} backdrop-blur-sm p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center text-center shadow-xl ring-1 ring-white/5`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 leading-tight">{res.label}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black font-mono tracking-tighter ${res.color}`}>{res.value}</span>
                  <span className="text-[10px] font-black text-slate-400 italic uppercase">{res.unit}</span>
                </div>
              </div>
            ))}
          </section>

          {/* Visualization Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-20">
            {/* Left: 3D Model */}
            <div className="xl:col-span-3 bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col relative">
              <div className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md flex justify-between items-center z-10">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Geometric Preview (3D)</h3>
                <div className="flex items-center gap-4">
                  <div className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-600 text-[9px] font-bold text-slate-400">
                    CL: {show(result.gageCenterline, 4)}
                  </div>
                </div>
              </div>
              <div className="h-[450px] relative bg-slate-900">
                <BinocularModelPreview 
                  params={{
                    beamWidth,
                    beamHeight,
                    distHoles: distanceBetweenHoles,
                    radius,
                    minThick: minimumThickness,
                    load: appliedForce
                  }}
                  us={unitSystem === 'US'}
                />
              </div>
              <div className="p-3 bg-slate-900/50 border-t border-slate-700 flex justify-center gap-10">
                 <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Calculated Z-Offset: <span className="font-mono text-white ml-2">{show(result.zOffset, 4)} {lengthUnit}</span></div>
              </div>
            </div>

            {/* Right: Strain Profile Plots */}
            <div className="xl:col-span-2 flex flex-col gap-6">
              {/* Plot 1: Strain vs Gage Offset */}
              <BinocularStrainProfile 
                label="Strain vs. Gage Offset (με)"
                maxStrain={result.maxStrain}
                avgStrain={result.avgStrain}
                edgeStrain={result.minStrain}
                gageLengthMm={unitSystem === 'SI' ? gageLength : gageLength * 25.4}
                color="#6366f1"
              />

              {/* Plot 2: Full Bending Bridge Result */}
              <BinocularStrainProfile 
                label="Bridge Output (με) - Effective"
                maxStrain={result.avgStrain * 1.1} // Showing relative effective headroom
                avgStrain={result.avgStrain}
                edgeStrain={result.avgStrain * 0.95}
                gageLengthMm={unitSystem === 'SI' ? gageLength : gageLength * 25.4}
                color="#10b981"
              />

              {/* FEA Overlay Toggle if in FEA mode */}
              {analysisPath === 'fea' && (
                 <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 p-4 shadow-2xl relative min-h-[250px] overflow-hidden">
                    <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live FEA Result</span>
                    </div>
                    {feaState.result ? (
                       <BinobeamFeaViewer
                          result={feaState.result}
                          widthMeters={unitSystem === 'US' ? beamWidth * 0.0254 : beamWidth * 0.001}
                          unitSystem={unitSystem}
                          distanceBetweenGageCls={distanceBetweenHoles}
                          radius={radius}
                          beamHeight={beamHeight}
                          minimumThickness={minimumThickness}
                          beamWidth={beamWidth}
                       />
                    ) : (
                       <div className="h-full flex items-center justify-center text-slate-600 font-mono text-xs italic">
                          {feaState.isSolving ? 'Solving Mesh...' : 'FEA Error'}
                       </div>
                    )}
                 </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Frame Footer Info */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-4">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project: Transcalc-Binocular</span>
           <span className="text-[10px] font-medium text-slate-300">|</span>
           <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{activeFrame} mode</span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 uppercase">
           Build 2026.04.06-A
        </div>
      </footer>
    </div>
  )
}
l Insights</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Toggle to <strong>FEA Analysis</strong> to interactive 3D deformation plots and local strain distribution maps for the current geometry.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
