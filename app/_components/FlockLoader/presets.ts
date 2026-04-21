import type { FlockState } from './flockState'
import { DEFAULT_SNAPSHOT } from './snapshots/defaultSnapshot'

export type FlockPreset = {
  sphereRadius: number
  kInner: number
  kOuter: number
  separation: number
  alignment: number
  cohesion: number
  cameraDistance: number
  /** Optional pre-settled formation. When present, `FlockLoader` seeds the
   *  simulation from this instead of randomising — the first render is
   *  already in motion. */
  initialState?: FlockState
}

// Named presets. Consumers pick one via `<FlockLoader flock="immersive" />`.
// Individual props on the component still override the preset's values.
export const FLOCK_PRESETS = {
  default: {
    sphereRadius: 112,
    kInner: 1,
    kOuter: 6,
    separation: 62,
    alignment: 14.8,
    cohesion: 5,
    cameraDistance: 1040,
    initialState: DEFAULT_SNAPSHOT,
  },
  immersive: {
    sphereRadius: 138,
    kInner: 1,
    kOuter: 6,
    separation: 62,
    alignment: 4,
    cohesion: 5,
    cameraDistance: 300,
  },
} as const satisfies Record<string, FlockPreset>

export type FlockPresetName = keyof typeof FLOCK_PRESETS
