'use client'

import styles from './FlockLoader.module.css'
import { FlockState } from './flockState'

export type DebugValues = {
  sphereRadius: number
  kInner: number
  kOuter: number
  separation: number
  alignment: number
  cohesion: number
  cameraDistance: number
  swirl: number
  jitter: number
}

type DebugParamSpec = {
  key: keyof DebugValues
  label: string
  min: number
  max: number
  step: number
}

const PARAMS: DebugParamSpec[] = [
  { key: 'sphereRadius', label: 'Sphere radius', min: 20, max: 600, step: 1 },
  { key: 'kInner', label: 'k inner', min: 0, max: 20, step: 0.1 },
  { key: 'kOuter', label: 'k outer', min: 0, max: 200, step: 1 },
  { key: 'separation', label: 'Separation', min: 0, max: 100, step: 1 },
  { key: 'alignment', label: 'Alignment', min: 0, max: 100, step: 0.1 },
  { key: 'cohesion', label: 'Cohesion', min: 0, max: 100, step: 0.5 },
  { key: 'cameraDistance', label: 'Camera distance', min: 200, max: 3000, step: 10 },
  { key: 'swirl', label: 'Swirl', min: 0, max: 10, step: 0.1 },
  { key: 'jitter', label: 'Jitter', min: 0, max: 10, step: 0.1 },
]

type Props = {
  values: DebugValues
  onChange: (next: DebugValues) => void
  onCaptureState: () => FlockState | null
  onReseed: () => void
}

export default function FlockLoaderDebugPanel({
  values,
  onChange,
  onCaptureState,
  onReseed,
}: Props) {
  const set = (key: keyof DebugValues, value: number) => {
    onChange({ ...values, [key]: value })
  }

  const writeToClipboard = async (json: string, label: string) => {
    try {
      await navigator.clipboard.writeText(json)
    } catch (err) {
      console.error(`FlockLoader: clipboard write failed (${label})`, err)
      console.log(json)
    }
  }

  const copy = () => writeToClipboard(JSON.stringify(values, null, 2), 'values')

  const copyState = () => {
    const state = onCaptureState()
    if (!state) {
      console.warn('FlockLoader: no state to capture (simulation not running yet)')
      return
    }
    // Single-line JSON — the arrays are long; pretty-printing blows it up.
    writeToClipboard(JSON.stringify(state), 'state')
  }

  return (
    <div className={styles.debugPanel}>
      <h2 className={styles.debugTitle}>FlockLoader debug</h2>
      {PARAMS.map(({ key, label, min, max, step }) => (
        <div key={key} className={styles.debugRow}>
          <label className={styles.debugLabel}>{label}</label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={values[key]}
            onChange={(e) => set(key, Number(e.target.value))}
            className={styles.debugRange}
          />
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={values[key]}
            onChange={(e) => set(key, Number(e.target.value))}
            className={styles.debugNumber}
          />
        </div>
      ))}
      <button type="button" onClick={onReseed} className={styles.debugCopy}>
        Reseed (fresh init using Swirl + Jitter)
      </button>
      <button type="button" onClick={copy} className={styles.debugCopy}>
        Copy values (JSON)
      </button>
      <button type="button" onClick={copyState} className={styles.debugCopy}>
        Copy state (JSON)
      </button>
    </div>
  )
}
