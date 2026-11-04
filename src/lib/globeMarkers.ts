import { geoToCartesian, isSurfaceVisible } from './astronomy.ts';
import type { City } from './cities.ts';

export interface CityMarker {
  id: string;
  x: number;
  y: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Return EVERY front-facing city marker with its projected screen position.
 * The complete city registry is considered on every update. Backside
 * markers are hidden by Earth, but reappear when the view rotates.
 * No label-ranking or mobile count cap applies.
 */
export function projectVisibleCityMarkers(
  cities: readonly Pick<City, 'id' | 'latitude' | 'longitude'>[],
  cameraPosition: readonly number[],
  globeRadius: number,
  width: number,
  height: number,
  project: (position: readonly [number, number, number]) => ProjectedPoint,
): CityMarker[] {
  if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) return [];
  const padding = 14;
  const result: CityMarker[] = [];
  for (const city of cities) {
    const point = geoToCartesian(city.latitude, city.longitude, globeRadius + 0.012);
    if (!isSurfaceVisible(point, cameraPosition, globeRadius)) continue;
    const ndc = project(point);
    if (![ndc.x, ndc.y, ndc.z].every(Number.isFinite) || ndc.z < -1 || ndc.z > 1) continue;
    const x = (ndc.x * 0.5 + 0.5) * width;
    const y = (0.5 - ndc.y * 0.5) * height;
    // Avoid clipping the button's pointer target at the viewport edge.
    if (x < padding || x > width - padding || y < padding || y > height - padding) continue;
    result.push({ id: city.id, x, y });
  }
  return result;
}
