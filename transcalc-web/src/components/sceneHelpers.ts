import * as THREE from 'three'

/**
 * Creates a corner axes gizmo that renders in a small inset viewport.
 * The gizmo mirrors the main camera's orientation so X/Y/Z labels always
 * reflect the current world-space orientation.
 *
 * Usage in the animate loop:
 *   renderer.render(scene, camera)
 *   gizmo.render(camera)
 *
 * Call gizmo.dispose() in cleanup.
 */
export function createAxesGizmo(
  renderer: THREE.WebGLRenderer,
  container: HTMLElement,
): {
  render: (mainCamera: THREE.Camera) => void
  dispose: () => void
} {
  const INSET = 90 // px — size of the corner square

  // Separate minimal scene just for the gizmo
  const gizmoScene = new THREE.Scene()
  const gizmoCamera = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, -10, 10)
  gizmoCamera.position.z = 5

  const axesGroup = new THREE.Group()
  gizmoScene.add(axesGroup)
  gizmoScene.add(new THREE.AmbientLight(0xffffff, 1.5))

  // Arrows: X=red  Y=green  Z=blue  (standard convention)
  const aLen = 0.82, hLen = 0.20, hW = 0.13
  axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), aLen, 0xff4444, hLen, hW))
  axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), aLen, 0x22cc44, hLen, hW))
  axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), aLen, 0x4488ff, hLen, hW))

  // Canvas-sprite labels at arrow tips
  const makeLabel = (text: string, color: string): THREE.Sprite => {
    const cv = document.createElement('canvas')
    cv.width = 64; cv.height = 64
    const ctx = cv.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, 64, 64)
      ctx.fillStyle = color
      ctx.font = 'bold 44px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 32, 32)
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cv),
      transparent: true,
      depthTest: false,
    }))
    sp.scale.set(0.38, 0.38, 1)
    return sp
  }

  const xLbl = makeLabel('X', '#ff9999'); xLbl.position.set(aLen + 0.30, 0, 0)
  const yLbl = makeLabel('Y', '#77ee99'); yLbl.position.set(0, aLen + 0.30, 0)
  const zLbl = makeLabel('Z', '#99bbff'); zLbl.position.set(0, 0, aLen + 0.30)
  axesGroup.add(xLbl, yLbl, zLbl)

  const savedColor = new THREE.Color()

  const render = (mainCam: THREE.Camera) => {
    // Inverse of main camera rotation → axes show world orientation from current viewpoint
    axesGroup.quaternion.copy(mainCam.quaternion).invert()

    const W = container.clientWidth
    const H = container.clientHeight

    renderer.getClearColor(savedColor)
    const savedAlpha = renderer.getClearAlpha()

    // Render gizmo into bottom-left inset, inset enough to clear the rounded corner
    renderer.setScissorTest(true)
    renderer.setScissor(18, 50, INSET, INSET)
    renderer.setViewport(18, 50, INSET, INSET)
    renderer.setClearColor(0x1e293b, 1.0)
    renderer.clear()

    const savedAutoClear = renderer.autoClear
    renderer.autoClear = false
    renderer.render(gizmoScene, gizmoCamera)
    renderer.autoClear = savedAutoClear

    // Restore full viewport
    renderer.setScissorTest(false)
    renderer.setViewport(0, 0, W, H)
    renderer.setClearColor(savedColor, savedAlpha)
  }

  const dispose = () => { /* gizmo uses shared renderer; no separate disposal needed */ }

  return { render, dispose }
}
