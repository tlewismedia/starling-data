'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GPUComputationRenderer, Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js'
import styles from './FlockLoader.module.css'
import positionShader from './shaders/positionShader'
import velocityShader from './shaders/velocityShader'
import birdVertex from './shaders/birdVertex'
import birdFragment from './shaders/birdFragment'
import FlockLoaderDebugPanel, { DebugValues } from './FlockLoaderDebugPanel'
import { FLOCK_PRESETS, FlockPreset, FlockPresetName } from './presets'
import { FlockState } from './flockState'

export type FlockLoaderProps = {
  active: boolean
  children?: ReactNode
  /** Named parameter preset. Individual tuning props still override the preset's values. */
  flock?: FlockPresetName
  birdCount?: number
  sphereRadius?: number
  kInner?: number
  kOuter?: number
  separation?: number
  alignment?: number
  cohesion?: number
  cameraDistance?: number
  /** Snapshot to seed positions + velocities with. Captured via debug panel. */
  initialState?: FlockState
}

type VelocityUniforms = {
  delta: { value: number }
  separation_distance: { value: number }
  alignment_distance: { value: number }
  cohesion_distance: { value: number }
  sphere_radius: { value: number }
  k_inner: { value: number }
  k_outer: { value: number }
}

type BirdUniforms = {
  texturePosition: { value: THREE.Texture | null }
  textureVelocity: { value: THREE.Texture | null }
  fogNear: { value: number }
  fogFar: { value: number }
  fogStrength: { value: number }
}

// How strongly distant birds fade (0 = no fade, 1 = fully transparent at far edge).
const FOG_STRENGTH = 0.85
// Range of the fog band, as a multiple of sphereRadius around the camera distance.
const FOG_RANGE_FACTOR = 1.3

// Defaults for the initial-velocity seeding. Tunable from the debug panel.
const DEFAULT_SWIRL = 1.5
const DEFAULT_JITTER = 3

export default function FlockLoader({
  active,
  children = 'Thinking...',
  flock = 'default',
  birdCount = 1024,
  sphereRadius,
  kInner,
  kOuter,
  separation,
  alignment,
  cohesion,
  cameraDistance,
  initialState,
}: FlockLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const velocityUniformsRef = useRef<VelocityUniforms | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const birdUniformsRef = useRef<BirdUniforms | null>(null)
  const captureStateRef = useRef<(() => FlockState) | null>(null)

  // Resolve preset → per-prop values. Individual props override the preset.
  // Widen from the narrow literal `as const` type to `FlockPreset` so the
  // optional `initialState` is reachable without per-preset narrowing.
  const preset: FlockPreset = FLOCK_PRESETS[flock]
  const propSphereRadius = sphereRadius ?? preset.sphereRadius
  const propKInner = kInner ?? preset.kInner
  const propKOuter = kOuter ?? preset.kOuter
  const propSeparation = separation ?? preset.separation
  const propAlignment = alignment ?? preset.alignment
  const propCohesion = cohesion ?? preset.cohesion
  const propCameraDistance = cameraDistance ?? preset.cameraDistance
  const effectiveInitialState = initialState ?? preset.initialState

  // Debug mode: ?flock-debug in the URL surfaces a tuning panel whose state
  // overrides the tuning props. Evaluated once at mount; SSR-safe.
  const [debugEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('flock-debug')
  })
  const [debugValues, setDebugValues] = useState<DebugValues>(() => ({
    sphereRadius: propSphereRadius,
    kInner: propKInner,
    kOuter: propKOuter,
    separation: propSeparation,
    alignment: propAlignment,
    cohesion: propCohesion,
    cameraDistance: propCameraDistance,
    swirl: DEFAULT_SWIRL,
    jitter: DEFAULT_JITTER,
  }))

  // Counter bumped by the debug panel's "Reseed" button. Remounts the
  // simulation (via the `[birdCount, reseedCounter]` dep on the setup effect)
  // with fresh random init using the current swirl/jitter, ignoring any
  // baked-in snapshot so the sliders' effect is immediately visible.
  const [reseedCounter, setReseedCounter] = useState(0)

  // When the preset changes, re-seed the debug panel so it reflects the new
  // values (user customisations in the panel are intentionally discarded).
  useEffect(() => {
    setDebugValues((prev) => ({
      ...prev,
      sphereRadius: preset.sphereRadius,
      kInner: preset.kInner,
      kOuter: preset.kOuter,
      separation: preset.separation,
      alignment: preset.alignment,
      cohesion: preset.cohesion,
      cameraDistance: preset.cameraDistance,
    }))
    // `preset` is derived from `flock`; resyncing on preset identity is cheap.
  }, [preset])

  // "Effective" values: debug state when enabled, resolved props otherwise.
  const effSphereRadius = debugEnabled ? debugValues.sphereRadius : propSphereRadius
  const effKInner = debugEnabled ? debugValues.kInner : propKInner
  const effKOuter = debugEnabled ? debugValues.kOuter : propKOuter
  const effSeparation = debugEnabled ? debugValues.separation : propSeparation
  const effAlignment = debugEnabled ? debugValues.alignment : propAlignment
  const effCohesion = debugEnabled ? debugValues.cohesion : propCohesion
  const effCameraDistance = debugEnabled ? debugValues.cameraDistance : propCameraDistance

  // One-time (per-birdCount) Three.js setup.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const textureSize = Math.max(2, Math.ceil(Math.sqrt(birdCount)))
    const actualBirdCount = textureSize * textureSize

    // Scene + camera.
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      5000,
    )
    const initAxis = effCameraDistance / Math.sqrt(3)
    camera.position.set(initAxis, initAxis, initAxis)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Transparent renderer.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.className = styles.canvas
    container.appendChild(renderer.domElement)

    // GPU compute: position + velocity ping-ponged between render targets.
    const gpuCompute = new GPUComputationRenderer(textureSize, textureSize, renderer)
    const dtPosition = gpuCompute.createTexture()
    const dtVelocity = gpuCompute.createTexture()

    // Seed the simulation. If an `initialState` snapshot was provided and its
    // bird count matches, use it verbatim (pre-settled formation). Otherwise
    // fall back to the random-ball + swirl seed.
    const pixelCount = textureSize * textureSize
    const isReseed = reseedCounter > 0
    const snapshot = effectiveInitialState
    const snapshotMatches =
      !isReseed &&
      snapshot &&
      snapshot.birdCount === pixelCount &&
      snapshot.positions.length === pixelCount * 4 &&
      snapshot.velocities.length === pixelCount * 4

    const seedSwirl = debugEnabled ? debugValues.swirl : DEFAULT_SWIRL
    const seedJitter = debugEnabled ? debugValues.jitter : DEFAULT_JITTER

    if (snapshotMatches && snapshot) {
      ;(dtPosition.image.data as unknown as Float32Array).set(snapshot.positions)
      ;(dtVelocity.image.data as unknown as Float32Array).set(snapshot.velocities)
    } else {
      if (!isReseed && snapshot && !snapshotMatches) {
        console.warn(
          `FlockLoader: initialState.birdCount (${snapshot.birdCount}) does not match ` +
            `simulation size (${pixelCount}); falling back to random seed.`,
        )
      }
      fillPositionTexture(dtPosition, effSphereRadius * 0.6)
      fillVelocityTexture(dtVelocity, dtPosition, seedSwirl, seedJitter)
    }

    const positionVar = gpuCompute.addVariable('texturePosition', positionShader, dtPosition)
    const velocityVar = gpuCompute.addVariable('textureVelocity', velocityShader, dtVelocity)
    gpuCompute.setVariableDependencies(positionVar, [positionVar, velocityVar])
    gpuCompute.setVariableDependencies(velocityVar, [positionVar, velocityVar])

    const velocityUniforms = velocityVar.material.uniforms as unknown as VelocityUniforms
    velocityUniforms.delta = { value: 0.0 }
    velocityUniforms.separation_distance = { value: effSeparation }
    velocityUniforms.alignment_distance = { value: effAlignment }
    velocityUniforms.cohesion_distance = { value: effCohesion }
    velocityUniforms.sphere_radius = { value: effSphereRadius }
    velocityUniforms.k_inner = { value: effKInner }
    velocityUniforms.k_outer = { value: effKOuter }

    const positionUniforms = positionVar.material.uniforms as { delta: { value: number } }
    positionUniforms.delta = { value: 0.0 }

    const initError = gpuCompute.init()
    if (initError !== null) {
      console.error('FlockLoader: GPUComputationRenderer init error:', initError)
    }

    // Warm the simulation up for ~2s of virtual time before anything is ever
    // shown, so the first fade-in reveals a settled, flowing flock instead of
    // an explosion from a tight initial ball. Skipped when an `initialState`
    // snapshot already seeded a pre-settled formation.
    if (!snapshotMatches) {
      const WARMUP_FRAMES = 120
      const warmupDelta = 1 / 60
      velocityUniforms.delta.value = warmupDelta
      positionUniforms.delta.value = warmupDelta
      for (let i = 0; i < WARMUP_FRAMES; i++) {
        gpuCompute.compute()
      }
    }

    // Bird mesh.
    const birdGeometry = createBirdGeometry(actualBirdCount, textureSize)
    const initialFogRange = effSphereRadius * FOG_RANGE_FACTOR
    const birdUniforms: BirdUniforms = {
      texturePosition: { value: null },
      textureVelocity: { value: null },
      fogNear: { value: effCameraDistance - initialFogRange },
      fogFar: { value: effCameraDistance + initialFogRange },
      fogStrength: { value: FOG_STRENGTH },
    }
    const birdMaterial = new THREE.ShaderMaterial({
      uniforms: birdUniforms,
      vertexShader: birdVertex,
      fragmentShader: birdFragment,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    })
    birdUniformsRef.current = birdUniforms
    const birdMesh = new THREE.Mesh(birdGeometry, birdMaterial)
    birdMesh.rotation.y = Math.PI / 2
    birdMesh.matrixAutoUpdate = false
    birdMesh.updateMatrix()
    scene.add(birdMesh)

    velocityUniformsRef.current = velocityUniforms

    // Expose a capture function to the debug panel: reads back the current
    // position and velocity render targets into plain arrays. Rounded to 3
    // decimal places to keep the pasted JSON compact.
    captureStateRef.current = () => {
      const n = textureSize * textureSize
      const pos = new Float32Array(n * 4)
      const vel = new Float32Array(n * 4)
      renderer.readRenderTargetPixels(
        gpuCompute.getCurrentRenderTarget(positionVar),
        0,
        0,
        textureSize,
        textureSize,
        pos,
      )
      renderer.readRenderTargetPixels(
        gpuCompute.getCurrentRenderTarget(velocityVar),
        0,
        0,
        textureSize,
        textureSize,
        vel,
      )
      const round = (v: number) => Math.round(v * 1000) / 1000
      return {
        birdCount: n,
        positions: Array.from(pos, round),
        velocities: Array.from(vel, round),
      }
    }

    // RAF loop.
    let lastTime = performance.now()
    let rafId = 0
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const now = performance.now()
      let dt = (now - lastTime) / 1000
      if (dt > 1) dt = 1
      lastTime = now

      velocityUniforms.delta.value = dt
      positionUniforms.delta.value = dt

      gpuCompute.compute()

      birdUniforms.texturePosition.value =
        gpuCompute.getCurrentRenderTarget(positionVar).texture
      birdUniforms.textureVelocity.value =
        gpuCompute.getCurrentRenderTarget(velocityVar).texture

      renderer.render(scene, camera)
    }
    tick()

    // Resize.
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', handleResize)
      velocityUniformsRef.current = null
      cameraRef.current = null
      birdUniformsRef.current = null
      captureStateRef.current = null
      disposeGpu(gpuCompute, positionVar, velocityVar)
      birdGeometry.dispose()
      birdMaterial.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
    // birdCount is the one prop that requires a full rebuild (texture size changes).
    // reseedCounter bumps trigger an intentional full rebuild from the debug panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birdCount, reseedCounter])

  // Live-sync effective tuning values into shader uniforms without rebuilding.
  useEffect(() => {
    const u = velocityUniformsRef.current
    if (!u) return
    u.separation_distance.value = effSeparation
    u.alignment_distance.value = effAlignment
    u.cohesion_distance.value = effCohesion
    u.sphere_radius.value = effSphereRadius
    u.k_inner.value = effKInner
    u.k_outer.value = effKOuter
  }, [effSeparation, effAlignment, effCohesion, effSphereRadius, effKInner, effKOuter])

  // Live-sync camera distance along the (1,1,1) diagonal.
  useEffect(() => {
    const cam = cameraRef.current
    if (!cam) return
    const axis = effCameraDistance / Math.sqrt(3)
    cam.position.set(axis, axis, axis)
    cam.lookAt(0, 0, 0)
  }, [effCameraDistance])

  // Live-sync depth-fog band to track the flock's extent around the camera.
  useEffect(() => {
    const u = birdUniformsRef.current
    if (!u) return
    const range = effSphereRadius * FOG_RANGE_FACTOR
    u.fogNear.value = effCameraDistance - range
    u.fogFar.value = effCameraDistance + range
  }, [effCameraDistance, effSphereRadius])

  return (
    <>
      <div ref={containerRef} className={styles.flockLoader} data-active={active}>
        <div className={`${styles.thinkingText} ${styles.thinkingBack}`} aria-hidden="true">
          <span>{children}</span>
        </div>
        {/* Three.js canvas is appended here by the useEffect. */}
        <div className={`${styles.thinkingText} ${styles.thinkingFront}`} aria-hidden="true">
          <span>{children}</span>
        </div>
      </div>
      {debugEnabled && (
        <FlockLoaderDebugPanel
          values={debugValues}
          onChange={setDebugValues}
          onCaptureState={() => captureStateRef.current?.() ?? null}
          onReseed={() => setReseedCounter((c) => c + 1)}
        />
      )}
    </>
  )
}

// --- Helpers (module-private) ----------------------------------------------

// Sample uniformly inside a ball of `radius` at origin.
// `r = R * cbrt(u)` with a random unit direction gives even volumetric density.
function fillPositionTexture(texture: THREE.DataTexture, radius: number) {
  const arr = texture.image.data as unknown as Float32Array
  for (let i = 0; i < arr.length; i += 4) {
    const r = radius * Math.cbrt(Math.random())
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const sinPhi = Math.sin(phi)
    arr[i + 0] = r * sinPhi * Math.cos(theta)
    arr[i + 1] = r * sinPhi * Math.sin(theta)
    arr[i + 2] = r * Math.cos(phi)
    // Random initial wing-flap phase so birds don't flap in lockstep.
    arr[i + 3] = Math.random() * 62.83
  }
}

// Tangential swirl around a random axis + small random jitter. Gives the
// flock coherent angular momentum so it keeps flowing in a visible direction
// instead of settling to zero mean velocity (which reads as a static blob).
// `swirl` sets the tangential magnitude; `jitter` adds per-axis random noise.
function fillVelocityTexture(
  velocityTexture: THREE.DataTexture,
  positionTexture: THREE.DataTexture,
  swirl: number,
  jitter: number,
) {
  const vel = velocityTexture.image.data as unknown as Float32Array
  const pos = positionTexture.image.data as unknown as Float32Array

  // Random unit vector for the swirl axis (one per mount).
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const ax = Math.sin(phi) * Math.cos(theta)
  const ay = Math.sin(phi) * Math.sin(theta)
  const az = Math.cos(phi)

  for (let i = 0; i < vel.length; i += 4) {
    const px = pos[i + 0]
    const py = pos[i + 1]
    const pz = pos[i + 2]

    // Tangential direction = cross(position, axis).
    let tx = py * az - pz * ay
    let ty = pz * ax - px * az
    let tz = px * ay - py * ax
    const len = Math.sqrt(tx * tx + ty * ty + tz * tz)
    if (len > 0.0001) {
      tx = (tx / len) * swirl
      ty = (ty / len) * swirl
      tz = (tz / len) * swirl
    } else {
      tx = 0
      ty = 0
      tz = 0
    }

    vel[i + 0] = tx + (Math.random() - 0.5) * jitter
    vel[i + 1] = ty + (Math.random() - 0.5) * jitter
    vel[i + 2] = tz + (Math.random() - 0.5) * jitter
    vel[i + 3] = 1
  }
}

// Each bird is 3 triangles (body + 2 wings); 9 verts total.
// Vertex IDs 4 and 7 are the wingtips (used by the vertex shader to flap).
const BIRD_TRIANGLE_VERTS: readonly number[] = [
  // body
  0, 0, -6, 0, 1, -15, 0, 0, 8,
  // left wing
  0, 0, -4, -6, 0, 0, 0, 0, 4,
  // right wing
  0, 0, 4, 6, 0, 0, 0, 0, -4,
]

function createBirdGeometry(birdCount: number, textureSize: number): THREE.BufferGeometry {
  const vertsPerBird = 9
  const pointCount = birdCount * vertsPerBird

  const positions = new Float32Array(pointCount * 3)
  const references = new Float32Array(pointCount * 2)
  const vertexIds = new Float32Array(pointCount)

  for (let f = 0; f < birdCount; f++) {
    for (let i = 0; i < BIRD_TRIANGLE_VERTS.length; i++) {
      positions[f * BIRD_TRIANGLE_VERTS.length + i] = BIRD_TRIANGLE_VERTS[i]
    }
  }

  for (let v = 0; v < pointCount; v++) {
    const birdIdx = Math.floor(v / vertsPerBird)
    references[v * 2] = (birdIdx % textureSize) / textureSize
    references[v * 2 + 1] = Math.floor(birdIdx / textureSize) / textureSize
    vertexIds[v] = v % vertsPerBird
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('reference', new THREE.BufferAttribute(references, 2))
  geometry.setAttribute('birdVertex', new THREE.BufferAttribute(vertexIds, 1))
  geometry.scale(0.35, 0.35, 0.35)
  return geometry
}

function disposeGpu(
  gpu: GPUComputationRenderer,
  ...vars: Variable[]
) {
  for (const v of vars) {
    v.material.dispose()
    // Render targets live inside GPUComputationRenderer; its own dispose
    // (if present in this three version) handles them. Fall back gracefully.
  }
  const maybeDispose = (gpu as unknown as { dispose?: () => void }).dispose
  if (typeof maybeDispose === 'function') {
    maybeDispose.call(gpu)
  }
}
