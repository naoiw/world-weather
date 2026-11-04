import assert from 'node:assert/strict';
import test from 'node:test';
import { geoToCartesian, isSurfaceVisible, subsolarPoint } from '../src/lib/astronomy.ts';

test('equator and prime meridian map to +X; east to +Z', () => {
  const [x, y, z] = geoToCartesian(0, 0);
  assert.ok(Math.abs(x - 1) < 1e-10 && Math.abs(y) < 1e-10 && Math.abs(z) < 1e-10);
  const east = geoToCartesian(0, 90);
  assert.ok(Math.abs(east[2] - 1) < 1e-10);
  assert.ok(Math.abs(geoToCartesian(90, 0)[1] - 1) < 1e-10);
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
