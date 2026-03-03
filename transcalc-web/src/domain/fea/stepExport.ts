import type { CantileverFeaInput, CantileverFeaMeshOptions } from './cantilever'

export type CantileverStepExportOptions = CantileverFeaMeshOptions & {
  elementsAcrossWidth?: number
  fileName?: string
}

export type MeshPoint = {
  xMm: number
  yMm: number
  zMm: number
}

export type MeshEdge = {
  a: number
  b: number
}

export type StructuredMesh = {
  points: MeshPoint[]
  edges: MeshEdge[]
  elementsAlongLength: number
  elementsThroughThickness: number
  elementsAcrossWidth: number
}

class StepBuilder {
  private nextId = 1
  private entities: string[] = []

  add(entity: string): number {
    const id = this.nextId
    this.nextId += 1
    this.entities.push(`#${id}=${entity};`)
    return id
  }

  render(fileName: string): string {
    const isoDate = new Date().toISOString()
    return [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION(('Transcalc FEA mesh export'),'2;1');",
      `FILE_NAME('${fileName}','${isoDate}',('Transcalc'),('Transcalc'),'Codex','Transcalc-Web','');`,
      "FILE_SCHEMA(('AUTOMOTIVE_DESIGN_CC2'));",
      'ENDSEC;',
      'DATA;',
      ...this.entities,
      'ENDSEC;',
      'END-ISO-10303-21;',
      '',
    ].join('\n')
  }
}

const clampElements = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback
  return Math.max(1, Math.floor(value as number))
}

const nodeIndex = (i: number, j: number, k: number, ny: number, nz: number): number =>
  i * (ny + 1) * (nz + 1) + j * (nz + 1) + k

export function buildCantileverStructuredMesh(
  input: CantileverFeaInput,
  options: CantileverStepExportOptions = {}
): StructuredMesh {
  const nx = clampElements(options.elementsAlongLength, 24)
  const ny = clampElements(options.elementsThroughThickness, 4)
  const nz = clampElements(options.elementsAcrossWidth, 2)

  const points: MeshPoint[] = []
  for (let i = 0; i <= nx; i += 1) {
    for (let j = 0; j <= ny; j += 1) {
      for (let k = 0; k <= nz; k += 1) {
        points.push({
          xMm: (input.loadPointToGageClLengthMm * i) / nx,
          yMm: -input.thicknessMm / 2 + (input.thicknessMm * j) / ny,
          zMm: -input.beamWidthMm / 2 + (input.beamWidthMm * k) / nz,
        })
      }
    }
  }

  const edges: MeshEdge[] = []
  for (let i = 0; i <= nx; i += 1) {
    for (let j = 0; j <= ny; j += 1) {
      for (let k = 0; k <= nz; k += 1) {
        const a = nodeIndex(i, j, k, ny, nz)
        if (i < nx) edges.push({ a, b: nodeIndex(i + 1, j, k, ny, nz) })
        if (j < ny) edges.push({ a, b: nodeIndex(i, j + 1, k, ny, nz) })
        if (k < nz) edges.push({ a, b: nodeIndex(i, j, k + 1, ny, nz) })
      }
    }
  }

  return {
    points,
    edges,
    elementsAlongLength: nx,
    elementsThroughThickness: ny,
    elementsAcrossWidth: nz,
  }
}

export function generateCantileverMeshStep(
  input: CantileverFeaInput,
  options: CantileverStepExportOptions = {}
): string {
  const mesh = buildCantileverStructuredMesh(input, options)
  const fileName = options.fileName ?? 'cantilever_fea_mesh.step'

  const builder = new StepBuilder()
  const pointRefs = mesh.points.map((p) =>
    builder.add(`CARTESIAN_POINT('',(${p.xMm.toFixed(6)},${p.yMm.toFixed(6)},${p.zMm.toFixed(6)}))`)
  )
  const polylineRefs = mesh.edges.map((edge) =>
    builder.add(`POLYLINE('',(#${pointRefs[edge.a]},#${pointRefs[edge.b]}))`)
  )

  const appCtx = builder.add("APPLICATION_CONTEXT('automotive_design')")
  const productCtx = builder.add(`PRODUCT_CONTEXT('',#${appCtx},'mechanical')`)
  const product = builder.add(`PRODUCT('CantileverMesh','CantileverMesh','',(#${productCtx}))`)
  const productFormation = builder.add(
    `PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('','',#${product},.NOT_KNOWN.)`
  )
  const productDefCtx = builder.add(`PRODUCT_DEFINITION_CONTEXT('part definition',#${appCtx},'design')`)
  const productDef = builder.add(`PRODUCT_DEFINITION('','',#${productFormation},#${productDefCtx})`)
  const productShape = builder.add(`PRODUCT_DEFINITION_SHAPE('','',#${productDef})`)

  const lengthUnit = builder.add('(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.))')
  const angleUnit = builder.add('(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.))')
  const solidAngleUnit = builder.add('(NAMED_UNIT(*)SOLID_ANGLE_UNIT()SI_UNIT($,.STERADIAN.))')
  const uncertainty = builder.add(
    `UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-6),#${lengthUnit},'distance_accuracy_value','confusion')`
  )
  const repContext = builder.add(
    `(GEOMETRIC_REPRESENTATION_CONTEXT(3)GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#${uncertainty}))GLOBAL_UNIT_ASSIGNED_CONTEXT((#${lengthUnit},#${angleUnit},#${solidAngleUnit}))REPRESENTATION_CONTEXT('Context','3D'))`
  )

  const curveSet = builder.add(
    `GEOMETRIC_CURVE_SET('',(${polylineRefs.map((ref) => `#${ref}`).join(',')}))`
  )
  const shapeRep = builder.add(`SHAPE_REPRESENTATION('Cantilever FEA Mesh',(#${curveSet}),#${repContext})`)
  builder.add(`SHAPE_DEFINITION_REPRESENTATION(#${productShape},#${shapeRep})`)

  return builder.render(fileName)
}
