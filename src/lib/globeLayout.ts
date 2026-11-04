/**
 * Screen-space label placement and longitude-only camera navigation.
 * Kept independent of Three.js so the math can be regression-tested in Node.
 */

export type LabelSide = 'left' | 'right';

export interface LabelCandidate {
  id: string;
  x: number;
  y: number;
  depth: number;
}

export interface PlacedLabel extends LabelCandidate {
  cardX: number;
  cardY: number;
  side: LabelSide;
}

export interface LabelDimensions {
  cardWidth: number;
  cardHeight: number;
  gap: number;
  padding: number;
  maxLabels: number;
}

export function labelDimensions(width: number): LabelDimensions {
  if (width < 430) {
    return { cardWidth: 118, cardHeight: 62, gap: 8, padding: 7, maxLabels: 2 };
  }
  if (width < 620) {
    return { cardWidth: 132, cardHeight: 70, gap: 9, padding: 9, maxLabels: 3 };
  }
  if (width < 850) {
    return { cardWidth: 152, cardHeight: 74, gap: 10, padding: 11, maxLabels: 4 };
  }
  return { cardWidth: 164, cardHeight: 78, gap: 12, padding: 12, maxLabels: 6 };
}

/** Longitude east is -Z on the unrotated, textured SphereGeometry. */
export function longitudeToAzimuth(longitude: number): number {
  return -longitude * Math.PI / 180;
}

/** Signed minimum turn in [-PI, PI], including the ±180° seam. */
export function shortestAngularDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function easeInOutCubic(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function layoutCityLabels(
  candidates: readonly LabelCandidate[],
  width: number,
  height: number,
  selectedId: string,
  previous: readonly PlacedLabel[] = [],
): PlacedLabel[] {
  const dims = labelDimensions(width);
  const { cardWidth, cardHeight, gap, padding, maxLabels } = dims;
  const laneCapacity = Math.max(0, Math.floor((height - 2 * padding + gap) / (cardHeight + gap)));
  if (laneCapacity === 0 || width < cardWidth + 2 * padding) return [];

  const previousById = new Map(previous.map((pin) => [pin.id, pin]));
  const sideFor = (pin: LabelCandidate): LabelSide => {
    const previousSide = previousById.get(pin.id)?.side;
    // Prevent labels flipping from left to right on tiny camera movements.
    if (previousSide && Math.abs(pin.x - width / 2) < Math.min(width * 0.12, 56)) {
      return previousSide;
    }
    return pin.x < width / 2 ? 'left' : 'right';
  };

  const ranked = candidates
    .filter((pin) => Number.isFinite(pin.x) && Number.isFinite(pin.y)
      && pin.x >= 0 && pin.x <= width && pin.y >= 0 && pin.y <= height)
    .map((pin) => ({
      ...pin,
      side: sideFor(pin),
      // Previous labels get a small stability preference at equal depths.
      score: pin.depth + (previousById.has(pin.id) ? 0.25 : 0)
        + (pin.id === selectedId ? 100 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const selected: typeof ranked = [];
  const lanes: Record<LabelSide, number> = { left: 0, right: 0 };
  for (const candidate of ranked) {
    if (selected.length >= maxLabels) break;
    if (lanes[candidate.side] >= laneCapacity) continue;
    selected.push(candidate);
    lanes[candidate.side] += 1;
  }

  const placed: PlacedLabel[] = [];
  for (const side of ['left', 'right'] as const) {
    const lane = selected.filter((pin) => pin.side === side)
      .sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
    if (lane.length === 0) continue;
    const maximumY = Math.max(padding, height - padding - cardHeight);
    const yValues: number[] = [];
    for (const pin of lane) {
      const desired = Math.min(maximumY, Math.max(padding, pin.y - cardHeight / 2));
      const afterPrevious = yValues.length > 0
        ? yValues[yValues.length - 1] + cardHeight + gap : padding;
      yValues.push(Math.max(desired, afterPrevious));
    }
    yValues[yValues.length - 1] = Math.min(yValues[yValues.length - 1], maximumY);
    for (let index = yValues.length - 2; index >= 0; index -= 1) {
      yValues[index] = Math.min(yValues[index], yValues[index + 1] - cardHeight - gap);
    }
    lane.forEach((pin, index) => {
      placed.push({
        id: pin.id, x: pin.x, y: pin.y, depth: pin.depth, side,
        cardX: side === 'left' ? padding : width - cardWidth - padding,
        cardY: yValues[index],
      });
    });
  }
  return placed;
}
