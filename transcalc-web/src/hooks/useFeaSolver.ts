import { useCallback, useRef, useState } from 'react'
import type { Tet10Mesh } from '../domain/fea/paramMesh'
import type { Tet4Result } from '../domain/fea/tet4Solver'

export interface FeaWorkerRequest {
  meshParams: {
    L: number; W: number; H: number
    nx: number; ny: number; nz: number
    maskType: 'none' | 'binocular' | 'crossbeam' | 'sbeam' | 'threebeam' | 'round' | 'round-hollow' | 'dualbeam' | 'shearweb'
    binocular?:   { leftHoleX: number; rightHoleX: number; holeCy: number; r: number }
    crossbeam?:   { outerRadius: number; innerRadius: number; halfWidth: number }
    sbeam?:       { leftHoleX: number; leftHoleY: number; rightHoleX: number; rightHoleY: number; r: number }
    threebeam?:   { outerRadius: number; innerRadius: number; halfWidth: number }
    round?:       { r: number }
    roundHollow?: { outerR: number; innerR: number }
    dualbeam?:    { T: number; beamSep: number; blockW: number }
    shearweb?:    { voidH: number; webT: number }
  }
  solverParams: {
    E: number; nu: number
    fixedGroup: string; loadGroup: string
    loadVector: [number, number, number]
    torqueX?: number   // optional torsion about X-axis (N·m)
  }
}

export interface FeaProgress {
  phase: string
  iter: number
  maxIter: number
}

export function useFeaSolver() {
  const workerRef = useRef<Worker | null>(null)
  const [solving,  setSolving]  = useState(false)
  const [progress, setProgress] = useState<FeaProgress | null>(null)
  const [solved,   setSolved]   = useState<{ mesh: Tet10Mesh; result: Tet4Result } | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  const solve = useCallback((request: FeaWorkerRequest) => {
    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null }

    setSolving(true)
    setSolved(null)
    setError(null)
    setProgress({ phase: 'Starting…', iter: 0, maxIter: 1 })

    const worker = new Worker(
      new URL('../domain/fea/feaWorker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'progress') {
        setProgress({ phase: msg.phase, iter: msg.iter, maxIter: msg.maxIter })
      } else if (msg.type === 'result') {
        const mesh: Tet10Mesh = {
          nodes:       msg.nodes,
          tets:        msg.tets,
          tets10:      msg.tets10,
          surfaceTris: msg.surfaceTris,
          faceGroups:  new Map((msg.faceGroupsData as [string, number[]][]).map(([k, v]) => [k, new Set(v)])),
          nodeCount:   msg.nodeCount,
          tetCount:    msg.tetCount,
          cornerCount: msg.cornerCount,
        }
        const result: Tet4Result = {
          displacements:   msg.displacements,
          elementStrains:  msg.elementStrains,
          nodalStrains:    msg.nodalStrains,
          vonMisesStress:  msg.vonMisesStress,
          maxDisplacement: msg.maxDisplacement,
          tipDeflection:   msg.tipDeflection,
        }
        setSolved({ mesh, result })
        setSolving(false)
        setProgress(null)
        worker.terminate()
        workerRef.current = null
      } else if (msg.type === 'error') {
        setError(msg.message)
        setSolving(false)
        setProgress(null)
        worker.terminate()
        workerRef.current = null
      }
    }

    worker.onerror = (e) => {
      setError(e.message)
      setSolving(false)
      setProgress(null)
      workerRef.current = null
    }

    worker.postMessage(request)
  }, [])

  const reset = useCallback(() => {
    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null }
    setSolving(false)
    setProgress(null)
    setSolved(null)
    setError(null)
  }, [])

  return { solve, solving, progress, solved, error, reset }
}
