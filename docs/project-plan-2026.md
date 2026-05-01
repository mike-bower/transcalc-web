# Transcalc Project Plan — 2026
## Commercial SaaS Platform for Robotics Transducer Design

**Version:** 1.0  
**Date:** April 2026  
**Owner:** Mike Bower

---

## Project Objective

Evolve Transcalc from a feature-complete engineering tool into a commercially deployable SaaS product targeting robotics transducer designers, OEM sensor manufacturers, and academic robotics programs. Deliver a customer-demonstrable release in Q2 2026 and a billable SaaS MVP by Q4 2026.

---

## Guiding Principles

- **Engineering correctness first.** Every new feature must have domain-level tests before UI work begins.
- **Progressive enhancement.** Each phase produces a usable, shippable increment — not a big-bang release.
- **Reuse over reinvention.** Extend existing patterns (shared geometry models, FEA worker, SectionToggle, FeaViewer3D) before introducing new architecture.
- **Robotics focus.** Prioritize the multi-axis F/T calculators and binocular/structural cell designs that have no equivalent in any competing tool.

---

## Phase Overview

| Phase | Focus | Target | Exit Criterion |
|-------|-------|--------|----------------|
| 1 | Engineering completeness | Q2 2026 (June) | All calculators have FEA; 2D/3D previews correct |
| 2 | Advanced analysis features | Q3 2026 (Sep) | STL import, virtual gage placement, PDF export |
| 3 | SaaS infrastructure | Q3–Q4 2026 (Oct) | Cloud-hosted, user accounts, project sharing |
| 4 | Commercial launch | Q4 2026 (Dec) | First paying customers; pricing page live |

---

## Phase 1: Engineering Completeness
**Target: June 2026 · ~0.5 FTE · ~8 weeks**

### Goal
Every calculator has a correct 3D model, a correct 2D engineering sketch, and 3D FEA with an analytical comparison table. The binocular geometry is the reference standard — the same physical model drives all three views.

### Work Items

#### 1.1 Binocular Geometry Corrections (In Progress)
- [x] Fix 2-arm cutout to stadium shape (slot height = 2R)
- [x] Fix 4-arm cutout to vertical arm cuts from hole centers
- [x] Fix camera distance bug in 3D preview
- [x] Fix FEA mask to include connecting slot
- [ ] Verify 4-arm FEA mask includes vertical cuts and center slot
- [ ] Validate FEA strain vs. analytical for binocular 2-arm

#### 1.2 FEA — Remaining Calculators
Wire `*Fea3DCalc` sub-components into all calculators that currently show "3D FEA not yet available." Priority order reflects robotics impact:

| Calculator | Mask Type | Load Case | Priority |
|------------|-----------|-----------|----------|
| S-Beam | `sbeam` | Transverse Fy at tip | High |
| Reverse Beam | `none` (rect) | Center Fy, pinned ends | High |
| Dual Beam | `dualbeam` | Fixed-guided Fy | High (done) |
| Square Shear | `none` (rect) | Transverse Fy | Medium |
| Round Shear | `round` | Transverse Fy | Medium |
| Round S-Beam Shear | `round` | Transverse Fy | Medium |
| Square Torque | `none` (rect) | Torque Mx about X | Medium |
| Round Solid Torque | `round` | Torque Mx | Medium |
| Round Hollow Torque | `round-hollow` | Torque Mx | Medium |
| Pressure (diaphragm) | TBD (round) | Uniform pressure Pz | Low |
| Hexapod F/T | Strut (parametric) | Axial strut load | Low |

#### 1.3 3D Preview Polish
- Fix any remaining camera/scale issues in `*ModelPreview.tsx` components
- Ensure all previews respect the CLAUDE.md material palette and lighting standards
- Add gage pads to previews missing them (shear and torque types)

#### 1.4 2D Sketch Polish
- Verify all sketch components render correctly at default parameters
- Add top view to any sketch that is currently side-view only
- Standardize gage color coding: orange (+ε active), blue (−ε active), gray (passive)

#### 1.5 Test Coverage Expansion
- Add analytical convergence tests for each new `*Fea3DCalc` using known closed-form solutions
- Expand thin test files: `shearBeams.test.ts`, `pressure.test.ts`, `sqtorque.test.ts`
- Target: 1,300 tests / 65 files by end of Phase 1

### Phase 1 Deliverable
A fully consistent engineering tool where every calculator has three synchronized views (analytical, 2D sketch, 3D model/FEA). Demonstrable at an engineering conference or customer meeting.

---

## Phase 2: Advanced Analysis Features
**Target: September 2026 · ~0.5–0.75 FTE · ~10 weeks**

### Goal
Extend the analysis capability from parametric-only to arbitrary geometry (STL import) and add virtual gage placement — the killer feature for robotics customers who need to validate non-standard sensor geometries.

### Work Items

#### 2.1 Virtual Gage Placement
Arguably the highest-value feature for professional users. After an FEA solve, the user clicks on the deformed surface to place a virtual gage, sets its orientation, and reads the axial strain.

- BVH raycasting from mouse click → surface triangle hit (`surfaceTris` from `Tet10Mesh`)
- Gage marker placed at hit point with draggable direction arrow (angle in surface tangent plane)
- Axial strain readout: `ε_axial = nᵀ · ε_tensor · n` (gage direction unit vector, `nodalStrains`)
- Multiple gages displayed simultaneously with labels
- Output: strain table (each gage's ε_axial, matching the `BinocularStrainProfile` pattern)

**Files:** `FeaViewer3D.tsx` (raycasting + gage overlay), new `gageRaycast.ts` (domain logic)

#### 2.2 Bridge Output from Virtual Gages
- Wire placed virtual gages into Wheatstone bridge arms (reuse `bridges.ts`)
- Compute predicted bridge output mV/V from FEA gage strains
- Compare to analytical bridge sensitivity from corresponding calculator
- Display as a comparison table alongside the FEA results

**Files:** reuses `bridges.ts`; new `virtualBridge.ts` for the gage→bridge mapping

#### 2.3 STL Import + TetGen WASM Meshing
Allows users to upload a custom sensor body (e.g. from CAD) and run FEA on it directly.

- STL parser (`stlParser.ts`): binary and ASCII STL → `StlSurface { vertices, normals, nTris }`
- TetGen compiled to WASM via Emscripten (BSD license, H. Si)
- `tetgenBridge.ts`: `loadTetGen()` + `meshSurface(surface, qualityRatio) → Tet10Mesh`
- Mesh quality slider (TetGen -q parameter); surface preview before meshing
- BC assignment panel: auto-detect face groups by position/normal → assign fixed/load/free
- Route: new `calcKey = 'fea3d'` in `WorkspaceRouter.tsx` and `TransducerGallery`

**Files:** `stlParser.ts`, `tetgenBridge.ts`, `Fea3DCalc.tsx` (workspace component)

#### 2.4 PDF / Report Export
- Print-to-PDF via `window.print()` with a dedicated print stylesheet (`print.css`)
- Report includes: calculator inputs, analytical results table, 2D sketch SVG, FEA comparison table, gage reading table
- No external dependency; works in all modern browsers

**Files:** `print.css`, print layout wrapper in each calculator component

### Phase 2 Deliverable
A tool that can validate any sensor geometry — parametric or imported — with virtual gage placement and automatic bridge output prediction. Publishable as a technical paper demo or conference poster.

---

## Phase 3: SaaS Infrastructure
**Target: October 2026 · ~0.5 FTE engineering + 0.5 FTE infrastructure · ~8 weeks**

### Goal
Deploy Transcalc as a hosted web service with user accounts, project persistence in the cloud, and a tiered access model.

### Work Items

#### 3.1 Hosting and CI/CD
- Deploy static build to Vercel or Cloudflare Pages (zero-server frontend)
- GitHub Actions CI: `npm test -- --run` + `npm run build` on every PR
- Custom domain: `transcalc.io` or similar
- Environment: production + staging branches

#### 3.2 User Accounts and Authentication
- Auth provider: Auth0 or Supabase Auth (OAuth: Google + GitHub; email/password fallback)
- JWT-based session; no passwords stored in-house
- User profile: name, email, organization, seat tier

#### 3.3 Cloud Project Storage
- Replace local file download/upload with cloud-synced project library
- Backend: Supabase (Postgres + Storage) or PlanetScale — one `projects` table per user
- API: REST endpoints for list/get/save/delete projects
- Offline-first: local changes queued and synced on reconnect

#### 3.4 Access Tiers
| Tier | Price | Limits | Target |
|------|-------|--------|--------|
| Free | $0 | 3 saved projects; no FEA | Students, evaluators |
| Professional | $79/mo | Unlimited projects; full FEA; PDF export | Practicing engineers |
| Team | $199/mo (5 seats) | Shared project library; team dashboard | Engineering groups |
| Academic | $29/mo | Full features; .edu email required | Researchers |

#### 3.5 Usage Analytics
- Privacy-first telemetry (Plausible or self-hosted): page views, calculator usage counts, FEA solve counts
- No personally identifiable data; no third-party ad trackers

### Phase 3 Deliverable
A live SaaS product with a working paywall, project sync, and at least 3 paying beta customers.

---

## Phase 4: Commercial Launch
**Target: December 2026 · ~0.25 FTE engineering + 0.25 FTE marketing**

### Goal
Formal public launch with pricing page, documentation, and initial customer acquisition.

### Work Items

#### 4.1 Documentation Site
- mdBook or Docusaurus site at `docs.transcalc.io`
- Sections: Getting Started, Calculator Reference, FEA Guide, API Reference (future)
- Embed legacy CHM help content (already in `public/legacy-help/`)
- Video walkthroughs: one per major calculator type (screen capture + voiceover)

#### 4.2 Landing Page and Marketing
- Product landing page with feature overview, screenshots, and pricing table
- Case studies: 2–3 robotics use cases with specific sensor types
- LinkedIn and ResearchGate outreach to robotics MEMs/sensor engineering community
- Submit to Hacker News "Show HN" and engineering Reddit communities

#### 4.3 Partner and Integration Outreach
- Contact robotics OEMs using ATI/JR3 sensors for co-design partnerships
- Offer academic institution licenses to MIT, CMU, ETH robotics labs
- Explore API access tier for CAD/simulation tool integration (Fusion 360, ANSYS)

#### 4.4 Support Infrastructure
- In-app feedback widget (Canny.io or GitHub Issues)
- Support email alias; <24h response target for paid tiers
- Status page (UptimeRobot)

### Phase 4 Deliverable
Public launch, pricing page live, 10+ paying customers, press coverage in at least one engineering publication.

---

## Resource Plan

| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|---------|---------|---------|---------|
| Engineering (domain + UI) | 0.5 FTE | 0.75 FTE | 0.5 FTE | 0.25 FTE |
| Infrastructure / DevOps | — | — | 0.5 FTE | 0.1 FTE |
| Design / UX | 0.1 FTE | 0.1 FTE | 0.25 FTE | 0.25 FTE |
| Marketing / BD | — | — | 0.1 FTE | 0.25 FTE |

**Current team:** 1 engineer (Mike Bower). Phases 1 and 2 are achievable solo. Phase 3 requires either a part-time infrastructure contractor (~20 hrs/week) or a co-founder with backend/DevOps background.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| TetGen WASM compilation complexity | High | Medium | Allocate 2-week spike in Phase 2; fall back to server-side meshing if needed |
| FEA solve time too slow in browser | Medium | High | Web Worker is already in place; upgrade to WASM-compiled solver if needed |
| Auth/billing integration delays Phase 3 | Medium | Medium | Use Stripe + Auth0 managed services; avoid custom auth |
| Low initial customer conversion | Medium | Medium | Launch free tier to build user base before pushing paid conversion |
| Competitor releases similar tool | Low | High | Differentiate on multi-axis F/T depth and FEA-to-gage integration — no competitor has both |
| Key engineer unavailable | Medium | High | All code is typed, tested, and documented in CLAUDE.md; AI-assisted continuation is feasible |

---

## Success Metrics

### Engineering (Phase 1)
- All 18 calculators have FEA with analytical comparison table
- FEA error < 5% for tip deflection and peak strain on medium mesh
- 0 test regressions; ≥1,300 tests passing

### Product (Phase 2)
- Virtual gage placement functional on parametric and STL-imported geometries
- PDF export covers all calculator types
- STL import handles files from Fusion 360 and SolidWorks

### Business (Phases 3–4)
- 500 registered free users within 60 days of launch
- 25 paying subscribers within 90 days of launch
- Net Promoter Score ≥ 40 from first cohort survey
- 3 academic institution licenses signed by end of 2026

---

## Immediate Next Actions (Next 2 Weeks)

1. **Validate binocular 4-arm FEA mask** — add connecting slot and vertical cuts to the FEA worker binocular mask; run medium mesh FEA and compare strain to analytical
2. **S-Beam FEA** — create `SBeamFea3DCalc.tsx` using existing `sbeam` mask; wire into `SBeamCalc.tsx` 3D View section
3. **Reverse Beam FEA** — create `ReverseBeamFea3DCalc.tsx` (rect mesh, pinned BCs); wire into `ReverseBeamCalc.tsx`
4. **Torque FEA** — add `torqueX` loading path to square column FEA sub-component; reuse existing torsion mesh and analytical formulas
5. **Expand test coverage** — add 10 convergence tests for each new FEA calc

---

*This plan is a living document. Update the version number and date when milestones are completed or priorities shift.*
