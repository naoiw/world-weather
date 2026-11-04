import assert from 'node:assert/strict';
import test from 'node:test';
import { geoToCartesian } from '../src/lib/astronomy.ts';
import {
  longitudeToAzimuth, shortestAngularDelta, easeInOutCubic,
  labelDimensions, layoutCityLabels, type LabelCandidate,
} from '../src/lib/globeLayout.ts';

test('camera focus is aligned with the globe texture and city longitude', () => {
  for (const longitude of [-179, -118.2437, -46.6333, 0, 2.3522, 139.6503, 179]) {
    const azimuth = longitudeToAzimuth(longitude);
    const [x, , z] = geoToCartesian(0, longitude);
    assert.ok(Math.abs(Math.cos(azimuth) - x) < 1e-10);
    assert.ok(Math.abs(Math.sin(azimuth) - z) < 1e-10);
  }
});

test('focus uses shortest direction across the international date line', () => {
  const from = longitudeToAzimuth(170);
  const to = longitudeToAzimuth(-170);
  assert.ok(Math.abs(shortestAngularDelta(from, to) + 20 * Math.PI / 180) < 1e-10);
  assert.ok(Math.abs(shortestAngularDelta(to, from) - 20 * Math.PI / 180) < 1e-10);
  assert.ok(Math.abs(shortestAngularDelta(0, 0)) < 1e-10);
  assert.equal(easeInOutCubic(-1), 0);
  assert.equal(easeInOutCubic(2), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
});

test('labels stay within the viewport and never overlap within a lane', () => {
  const candidates: LabelCandidate[] = Array.from({ length: 16 }, (_, index) => ({
    id: String(index), x: index % 2 === 0 ? 110 : 430,
    y: 48 + index * 19, depth: 1.3 - index * 0.04,
  }));
  for (const [width, height] of [[360, 340], [560, 430], [820, 510], [1024, 700]]) {
    const pins = layoutCityLabels(candidates, width, height, '15');
    const { cardWidth, cardHeight, gap, padding, maxLabels } = labelDimensions(width);
    assert.ok(pins.length <= maxLabels);
    for (const pin of pins) {
      assert.ok(pin.cardX >= padding && pin.cardX + cardWidth <= width - padding);
      assert.ok(pin.cardY >= padding && pin.cardY + cardHeight <= height - padding);
      for (const other of pins) {
        if (pin.id === other.id || pin.side !== other.side) continue;
        assert.ok(pin.cardY + cardHeight + gap <= other.cardY
          || other.cardY + cardHeight + gap <= pin.cardY,
        `overlap at ${width} px between ${pin.id} and ${other.id}`);
      }
    }
  }
});

test('mobile labels prefer the selected city and retain the same side near center', () => {
  const previous = layoutCityLabels([{ id: 'tokyo', x: 169, y: 155, depth: 1 }],
    360, 340, 'tokyo');
  assert.equal(previous[0].side, 'left');
  const pins = layoutCityLabels([
    { id: 'tokyo', x: 192, y: 156, depth: 0.4 },
    { id: 'seoul', x: 120, y: 162, depth: 1.1 },
    { id: 'beijing', x: 105, y: 172, depth: 1.3 },
    { id: 'sydney', x: 245, y: 180, depth: 1.4 },
  ], 360, 340, 'tokyo', previous);
  assert.ok(pins.some((pin) => pin.id === 'tokyo'));
  assert.equal(pins.find((pin) => pin.id === 'tokyo')?.side, 'left');
  assert.ok(pins.length <= 2);
});

test('tiny viewports do not produce invalid card coordinates', () => {
  assert.deepEqual(layoutCityLabels([{ id: 'tokyo', x: 90, y: 15, depth: 1 }],
    180, 45, 'tokyo'), []);
});
