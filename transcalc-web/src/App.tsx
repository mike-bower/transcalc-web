import React, { useState } from 'react'
import { computeCantileverStress } from './domain/core'

export default function App() {
  const [load, setLoad] = useState(100)
  const [width, setWidth] = useState(25)
  const [thickness, setThickness] = useState(2)
  const [momentArm, setMomentArm] = useState(100)

  const stress = computeCantileverStress(load, width, thickness, momentArm)

  return (
    <div className="container">
      <h1>Transcalc — Sample</h1>
      <div className="grid">
        <label>
          Applied load (N)
          <input type="number" value={load} onChange={(e) => setLoad(Number(e.target.value))} />
        </label>
        <label>
          Beam width (mm)
          <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
        </label>
        <label>
          Thickness (mm)
          <input type="number" value={thickness} onChange={(e) => setThickness(Number(e.target.value))} />
        </label>
        <label>
          Moment arm (mm)
          <input type="number" value={momentArm} onChange={(e) => setMomentArm(Number(e.target.value))} />
        </label>
      </div>
      <div className="result">Estimated bending stress: {stress.toFixed(3)} MPa</div>
    </div>
  )
}
