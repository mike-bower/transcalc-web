use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn solve_cubic(a: f64, b: f64, c: f64, d: f64) -> Box<[f64]> {
    // Port of a robust cubic solver returning real roots.
    // Normalize coefficients if a != 1
    if a.abs() < std::f64::EPSILON {
        // Degenerate: quadratic bx^2 + cx + d = 0
        if b.abs() < std::f64::EPSILON {
            // linear: cx + d = 0
            if c.abs() < std::f64::EPSILON {
                return vec![].into_boxed_slice();
            }
            return vec![-d / c].into_boxed_slice();
        }
        let disc = c * c - 4.0 * b * d;
        if disc < 0.0 {
            return vec![].into_boxed_slice();
        }
        if disc.abs() < 1e-15 {
            return vec![ -c / (2.0 * b) ].into_boxed_slice();
        }
        let s = disc.sqrt();
        return vec![(-c + s) / (2.0 * b), (-c - s) / (2.0 * b)].into_boxed_slice();
    }

    let a1 = b / a;
    let a2 = c / a;
    let a3 = d / a;

    let q = (3.0 * a2 - a1 * a1) / 9.0;
    let r = (9.0 * a1 * a2 - 27.0 * a3 - 2.0 * a1 * a1 * a1) / 54.0;
    let disc = q * q * q + r * r;

    if disc > 0.0 {
        // one real root
        let s = (r + disc.sqrt()).cbrt();
        let t = (r - disc.sqrt()).cbrt();
        let root = -a1 / 3.0 + (s + t);
        return vec![root].into_boxed_slice();
    } else if disc.abs() <= 1e-15 {
        // multiple roots, at least two equal
        let s = r.cbrt();
        let root1 = -a1 / 3.0 + 2.0 * s;
        let root2 = -a1 / 3.0 - s;
        return vec![root1, root2, root2].into_boxed_slice();
    } else {
        // three real roots
        let theta = (r / (-q * q * q).sqrt()).acos();
        let two_sqrt_q = 2.0 * (-q).sqrt();
        let r1 = -a1 / 3.0 + two_sqrt_q * (theta / 3.0).cos();
        let r2 = -a1 / 3.0 + two_sqrt_q * ((theta + 2.0 * std::f64::consts::PI) / 3.0).cos();
        let r3 = -a1 / 3.0 + two_sqrt_q * ((theta + 4.0 * std::f64::consts::PI) / 3.0).cos();
        return vec![r1, r2, r3].into_boxed_slice();
    }
}
