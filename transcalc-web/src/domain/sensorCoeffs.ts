// Polynomial coefficient evaluator (port of TCoefficient.GetValue)
export class Coefficient {
  private c: number[]
  constructor(...coeffs: number[]) {
    // expect up to 7 coefficients (c0..c6)
    this.c = coeffs.slice(0, 7)
    while (this.c.length < 7) this.c.push(0)
  }

  getValue(t: number): number {
    const [c0, c1, c2, c3, c4, c5, c6] = this.c
    const t1 = t
    const t2 = t1 * t
    const t3 = t2 * t
    const t4 = t3 * t
    const t5 = t4 * t
    const t6 = t5 * t
    return (
      c0 + c1 * t1 + c2 * t2 + c3 * t3 + c4 * t4 + c5 * t5 + c6 * t6
    )
  }
}

export type CoeffSet = {
  us: Coefficient
  si: Coefficient
}
