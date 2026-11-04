import assert from 'node:assert/strict';
import test from 'node:test';
import { geoToCartesian, isSurfaceVisible, subsolarPoint } from '../src/lib/astronomy.ts';

test('geographic east is -Z on the unrotated Three.js textured sphere', () => {
  const [x, y, z] = geoToCartesian(0, 0);
  assert.ok(Math.abs(x - 1) < 1e-10 && Math.abs(y) < 1e-10 && Math.abs(z) < 1e-10);
  assert.ok(Math.abs(geoToCartesian(0, 90)[2] + 1) < 1e-10);
  assert.ok(Math.abs(geoToCartesian(0, -90)[2] - 1) < 1e-10);
  assert.ok(Math.abs(geoToCartesian(90, 0)[1] - 1) < 1e-10);
});

/** In SphereGeometry, x = -cos(2πu) and z = sin(2πu) at the equator. */
function sphereTextureU(x: number, z: number): number {
  return ((Math.atan2(z, -x) / (2 * Math.PI)) + 1) % 1;
}

test('city positions agree with Earth texture UVs (regression: São Paulo ≠ Madagascar)', () => {
  const locations = [
    { name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
    { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
    { name: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
    { name: 'Madagascar', latitude: -18.9, longitude: 47.5 },
    { name: 'Sydney', latitude: -33.8688, longitude: 151.2093 },
    { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437 },
  ];
  for (const city of locations) {
    const [x, , z] = geoToCartesian(city.latitude, city.longitude);
    const u = sphereTextureU(x, z);
    const expected = (city.longitude + 180) / 360;
    assert.ok(Math.abs(u - expected) < 1e-9,
      `${city.name}: expected texture u=${expected}, got ${u}`);
  }
  const [saoX, , saoZ] = geoToCartesian(-23.5505, -46.6333);
  const [madX, , madZ] = geoToCartesian(-18.9, 47.5);
  assert.ok(Math.abs(sphereTextureU(saoX, saoZ) - sphereTextureU(madX, madZ)) > 0.2);
});

test('subsolar latitude follows the seasons', () => {
  const equinox = subsolarPoint(new Date('2026-03-20T12:00:00Z'));
  const june = subsolarPoint(new Date('2026-06-21T12:00:00Z'));
  const december = subsolarPoint(new Date('2026-12-21T12:00:00Z'));
  assert.ok(Math.abs(equinox.latitude) < 1.5);
  assert.ok(june.latitude > 22 && june.latitude < 24);
  assert.ok(december.latitude < -22 && december.latitude > -24);
});

test('subsolar longitude follows UTC, independent of browser timezone', () => {
  const noon = subsolarPoint(new Date('2026-04-01T12:00:00Z'));
  const midnight = subsolarPoint(new Date('2026-04-01T00:00:00Z'));
  assert.ok(Math.abs(noon.longitude) < 8);
  assert.ok(Math.abs(midnight.longitude) > 170);
});

test('visibility accounts for the sphere horizon, not just front hemisphere', () => {
  assert.equal(isSurfaceVisible([1, 0, 0], [5, 0, 0], 1), true);
  assert.equal(isSurfaceVisible([-1, 0, 0], [5, 0, 0], 1), false);
  assert.equal(isSurfaceVisible([0, 1, 0], [5, 0, 0], 1), false);
});
