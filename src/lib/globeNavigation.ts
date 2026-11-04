/** Camera navigation for the globe. Longitude east is -Z on SphereGeometry. */
export function longitudeToAzimuth(longitude: number): number {
  return -longitude * Math.PI / 180;
}

/** Signed shortest direction in [-PI, PI], including the date-line seam. */
export function shortestAngularDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** Smooth stop/start for the camera while preserving manual OrbitControls input. */
export function easeInOutCubic(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
