# Transcalc Web (Starter)

This repository is a starter scaffold for a web-first rewrite of Transcalc using React + TypeScript + Vite.

Getting started

```bash
# from project root
cd transcalc-web
npm install
npm run dev
```

Scripts

- `npm run dev` — start dev server
- `npm run build` — build production bundle
- `npm run preview` — preview production bundle
- `npm run test` — run unit tests (Vitest)

What is included

- React + TypeScript + Vite app
- Sample domain module: `src/domain/core.ts` (cantilever stress calculator)
- Unit test for domain logic using Vitest
- Minimal GitHub Actions CI workflow (runs install, test, build)

Next steps

- Replace sample domain with full port of legacy algorithms (TypeScript or Rust→WASM)
- Add import/conversion tools for legacy files
- Add LLM assistant service with server-side proxy
- Add UI/UX polish and accessibility work
