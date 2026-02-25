Rust→WASM example for `solve_cubic`

Prerequisites
- Install Rust toolchain (rustup) and `wasm-pack`.

Build steps (from project root `transcalc-web`):

```bash
# install wasm-pack if you don't have it
cargo install wasm-pack

# build wasm package (script available in package.json)
npm run build:wasm
```

This will run `wasm-pack build wasm --target bundler --out-dir ../wasm/pkg` and emit a JS+WASM package at `wasm/pkg` that the app can import.

Usage in TypeScript

- Use `src/wasm/wasmLoader.ts` to dynamically import the generated package.
- Example:

```ts
import { loadWasm } from '../wasm/wasmLoader'

async function test() {
  const wasm = await loadWasm()
  const roots = wasm.solve_cubic(1, -6, 11, -6)
  console.log(roots) // expect approx [1,2,3]
}
```

Notes
- The Rust implementation returns an array of real roots (as f64). The wasm-bindgen binding converts `Box<[f64]>` to a JS Float64Array/Array.
- For CI, you can add a step to install `wasm-pack` and run the `build:wasm` script before building the web bundle.
