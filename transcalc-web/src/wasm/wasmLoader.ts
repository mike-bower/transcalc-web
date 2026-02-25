export type WasmModule = {
  solve_cubic: (a: number, b: number, c: number, d: number) => Float64Array | number[]
}

let instance: WasmModule | null = null

export async function loadWasm(): Promise<WasmModule> {
  if (instance) return instance
  // After running `npm run build:wasm`, wasm-pack will create `wasm/pkg` that can be imported.
  // The path below assumes `wasm/pkg` is emitted at project root under `wasm/pkg`.
  // Adjust path depending on your build output.
  const pkg = await import('../../wasm/pkg')
  instance = pkg as unknown as WasmModule
  return instance
}
