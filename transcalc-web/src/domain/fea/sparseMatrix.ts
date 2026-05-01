export class CsrMatrix {
  private tripletI: number[] = []
  private tripletJ: number[] = []
  private tripletV: number[] = []
  private _n: number
  private rowPtr: Int32Array = new Int32Array(0)
  private colIdx: Int32Array = new Int32Array(0)
  private vals:   Float64Array = new Float64Array(0)
  private ready = false

  constructor(n: number) { this._n = n }

  get n() { return this._n }

  add(i: number, j: number, v: number) {
    this.tripletI.push(i)
    this.tripletJ.push(j)
    this.tripletV.push(v)
    this.ready = false
  }

  finalize() {
    const n = this._n
    const nnz = this.tripletI.length
    // Count entries per row
    const count = new Int32Array(n)
    for (let k = 0; k < nnz; k++) count[this.tripletI[k]]++
    // Build rowPtr
    this.rowPtr = new Int32Array(n + 1)
    for (let i = 0; i < n; i++) this.rowPtr[i + 1] = this.rowPtr[i] + count[i]
    // Fill colIdx and vals
    this.colIdx = new Int32Array(nnz)
    this.vals   = new Float64Array(nnz)
    const pos = this.rowPtr.slice(0, n)
    for (let k = 0; k < nnz; k++) {
      const r = this.tripletI[k]
      const p = pos[r]++
      this.colIdx[p] = this.tripletJ[k]
      this.vals[p]   = this.tripletV[k]
    }
    this.ready = true
  }

  multiply(x: Float64Array): Float64Array {
    if (!this.ready) this.finalize()
    const y = new Float64Array(this._n)
    for (let i = 0; i < this._n; i++) {
      let s = 0
      for (let p = this.rowPtr[i]; p < this.rowPtr[i + 1]; p++)
        s += this.vals[p] * x[this.colIdx[p]]
      y[i] = s
    }
    return y
  }

  diag(): Float64Array {
    if (!this.ready) this.finalize()
    const d = new Float64Array(this._n)
    for (let i = 0; i < this._n; i++) {
      for (let p = this.rowPtr[i]; p < this.rowPtr[i + 1]; p++) {
        if (this.colIdx[p] === i) { d[i] += this.vals[p] }
      }
    }
    return d
  }

  getVal(i: number, j: number): number {
    if (!this.ready) this.finalize()
    for (let p = this.rowPtr[i]; p < this.rowPtr[i + 1]; p++)
      if (this.colIdx[p] === j) return this.vals[p]
    return 0
  }
}

export function pcgSolve(
  K: CsrMatrix,
  f: Float64Array,
  tol = 1e-8,
  maxIter = 20000,
  onProgress?: (iter: number, maxIter: number) => void,
): Float64Array {
  const n = K.n
  const diag = K.diag()
  const Minv = new Float64Array(n)
  for (let i = 0; i < n; i++) Minv[i] = diag[i] > 1e-30 ? 1 / diag[i] : 1

  const x = new Float64Array(n)
  const r = new Float64Array(f)           // r = f - K*x, x=0 so r=f
  const z = new Float64Array(n)
  for (let i = 0; i < n; i++) z[i] = Minv[i] * r[i]
  const p = z.slice()
  let rz = dot(r, z)

  // Relative criterion: ||r|| < tol * ||f|| (avoids unit-dependence)
  const tolSq = tol * tol * Math.max(dot(f, f), 1e-60)

  for (let iter = 0; iter < maxIter; iter++) {
    if (onProgress && iter % 200 === 0) onProgress(iter, maxIter)
    const Kp = K.multiply(p)
    const alpha = rz / dot(p, Kp)
    for (let i = 0; i < n; i++) { x[i] += alpha * p[i]; r[i] -= alpha * Kp[i] }
    if (dot(r, r) < tolSq) break
    for (let i = 0; i < n; i++) z[i] = Minv[i] * r[i]
    const rzNew = dot(r, z)
    const beta = rzNew / rz
    for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i]
    rz = rzNew
  }
  return x
}

function dot(a: Float64Array, b: Float64Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}
