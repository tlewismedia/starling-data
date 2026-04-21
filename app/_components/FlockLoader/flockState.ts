/**
 * A snapshot of the flocking simulation's current positions and velocities.
 * Captured via the debug panel's "Copy state" button, pasted into code as a
 * constant, and handed to `<FlockLoader initialState={...} />` to seed the
 * textures from a known-good formation instead of random init.
 *
 * `positions` and `velocities` both have length `birdCount * 4` — each bird
 * occupies four floats (xyzw) in the texture.
 */
export type FlockState = {
  birdCount: number
  positions: number[]
  velocities: number[]
}
