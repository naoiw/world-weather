import assert from 'node:assert/strict';
import test from 'node:test';
import { CITIES } from '../src/lib/cities.ts';
import { geoToCartesian } from '../src/lib/astronomy.ts';
import { projectVisibleCityMarkers } from '../src/lib/globeMarkers.ts';
import { longitudeToAzimuth, shortestAngularDelta, easeInOutCubic } from '../src/lib/globeNavigation.ts';

test('city registry has 20 unique entries and valid coordinates/timezones', () => {
  assert.equal(CITIES.length, 20);
  const ids = CITIES.map((city) => city.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const city of CITIES) {
    assert.ok(city.latitude >= -90 && city.latitude <= 90, city.id);
    assert.ok(city.longitude >= -180 && city.longitude <= 180, city.id);
    assert.doesNotThrow(() => new Intl.DateTimeFormat('en-US', { timeZone: city.timeZone }), city.id);
  }
  for (const id of ['bangkok', 'moscow', 'brasilia', 'manila']) {
    assert.ok(CITIES.find((city) => city.id === id), id);
  }
});

test('camera focus is aligned with the globe texture and city longitude', () => {
  for (const longitude of [-179, -118.2437, -46.6333, 0, 2.3522, 139.6503, 179]) {
    const azimuth = longitudeToAzimuth(longitude);
    const [x, , z] = geoToCartesian(0, longitude);
    assert.ok(Math.abs(Math.cos(azimuth) - x) < 1e-10);
    assert.ok(Math.abs(Math.sin(azimuth) - z) < 1e-10);
  }
});

test('focus uses the shortest direction across the international date line', () => {
  const from = longitudeToAzimuth(170);
  const to = longitudeToAzimuth(-170);
  assert.ok(Math.abs(shortestAngularDelta(from, to) + 20 * Math.PI / 180) < 1e-10);
  assert.ok(Math.abs(shortestAngularDelta(to, from) - 20 * Math.PI / 180) < 1e-10);
  assert.ok(Math.abs(shortestAngularDelta(0, 0)) < 1e-10);
  assert.equal(easeInOutCubic(-1), 0);
  assert.equal(easeInOutCubic(2), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
});

/** Mimic a camera aimed at the origin with a 90° field of view. */
function projector(camera: readonly number[], width: number, height: number) {
  const length = Math.hypot(...camera);
  const forward = camera.map((v) => -v / length);
  const up: [number, number, number] = [0, 1, 0];
  const right: [number, number, number] = [
    forward[1] * up[2] - forward[2] * up[1],
    forward[2] * up[0] - forward[0] * up[2],
    forward[0] * up[1] - forward[1] * up[0],
  ];
  const rl = Math.hypot(...right);
  const normalizedRight = right.map((v) => v / rl);
  return (point: readonly [number, number, number]) => {
    const delta = point.map((v, i) => v - camera[i]);
    const depth = delta.reduce((sum, v, i) => sum + v * forward[i], 0);
    const x = delta.reduce((sum, v, i) => sum + v * normalizedRight[i], 0) / depth;
    const y = delta.reduce((sum, v, i) => sum + v * up[i], 0) / depth;
    return { x: x * height / width, y, z: 0 };
  };
}

test('all 20 cities are considered; every city becomes a marker when facing the camera', () => {
  const visibleIds = new Set<string>();
  const width = 900;
  const height = 900;
  for (const city of CITIES) {
    const [x, y, z] = geoToCartesian(city.latitude, city.longitude, 5.2);
    const camera = [x, y, z];
    const result = projectVisibleCityMarkers(CITIES, camera, 1.55, width, height,
      projector(camera, width, height));
    assert.ok(result.some((marker) => marker.id === city.id), city.id);
    result.forEach((marker) => visibleIds.add(marker.id));
  }
  assert.deepEqual([...visibleIds].sort(), CITIES.map((city) => city.id).sort());
});

test('front-facing markers are not capped to 2–6 or ranked like old labels', () => {
  const cities = Array.from({ length: 20 }, (_, i) => ({
    id: `test-${i}`, latitude: (i - 10) * 2, longitude: (i - 10) * 2,
  }));
  const markers = projectVisibleCityMarkers(cities, [5, 0, 0], 1.55, 800, 600,
    () => ({ x: 0, y: 0, z: 0 }));
  assert.equal(markers.length, 20);
});

test('backside markers are hidden and reappear after rotation', () => {
  const cities = [
    { id: 'front', latitude: 0, longitude: 0 },
    { id: 'back', latitude: 0, longitude: 180 },
  ];
  const projection = () => ({ x: 0, y: 0, z: 0 });
  assert.deepEqual(projectVisibleCityMarkers(cities, [5, 0, 0], 1.55, 800, 600,
    projection).map((marker) => marker.id), ['front']);
  assert.deepEqual(projectVisibleCityMarkers(cities, [-5, 0, 0], 1.55, 800, 600,
    projection).map((marker) => marker.id), ['back']);
});

test('invalid projections and offscreen markers are skipped', () => {
  const cities = [{ id: 'tokyo', latitude: 0, longitude: 0 }];
  const front = [5, 0, 0];
  assert.equal(projectVisibleCityMarkers(cities, front, 1.55, 800, 600,
    () => ({ x: Number.NaN, y: 0, z: 0 })).length, 0);
  assert.equal(projectVisibleCityMarkers(cities, front, 1.55, 800, 600,
    () => ({ x: 3, y: 0, z: 0 })).length, 0);
  assert.equal(projectVisibleCityMarkers(cities, front, 1.55, 800, 600,
    () => ({ x: 0, y: 0, z: 2 })).length, 0);
});
