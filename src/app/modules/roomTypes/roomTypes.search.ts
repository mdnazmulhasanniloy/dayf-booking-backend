import httpStatus from 'http-status';
import { z } from 'zod';
import AppError from '../../error/AppError';

const polygonSchema = z
  .array(
    z.tuple([
      z.number().finite().min(-180).max(180),
      z.number().finite().min(-90).max(90),
    ]),
  )
  .min(3)
  .max(500);

/** Accept a JSON ring of [longitude, latitude] pairs from the query string. */
export const parseSearchPolygon = (input: unknown) => {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      throw new AppError(httpStatus.BAD_REQUEST, 'polygon must be valid JSON');
    }
  }

  const parsed = polygonSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'polygon must contain 3 to 500 numeric [longitude, latitude] pairs within valid coordinate ranges',
    );
  }

  const ring = parsed.data;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) ring.pop();

  if (
    new Set(ring.map(point => JSON.stringify(point))).size !== ring.length ||
    ring.length < 3
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'polygon requires at least 3 distinct vertices without repeats',
    );
  }

  ring.push([...first]);
  const cross = (a: number[], b: number[], c: number[]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const onSegment = (a: number[], b: number[], p: number[]) =>
    cross(a, b, p) === 0 &&
    p[0] >= Math.min(a[0], b[0]) &&
    p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) &&
    p[1] <= Math.max(a[1], b[1]);

  // City boundaries must be simple rings: no crossing or overlapping edges.
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    const next = ring[(i + 2) % (ring.length - 1)];
    if (onSegment(a, b, next) || onSegment(b, next, a)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'polygon edges must not overlap',
      );
    }
    for (let j = i + 2; j < ring.length - 1; j++) {
      if (i === 0 && j === ring.length - 2) continue;
      const c = ring[j];
      const d = ring[j + 1];
      if (
        (cross(a, b, c) * cross(a, b, d) < 0 &&
          cross(c, d, a) * cross(c, d, b) < 0) ||
        onSegment(a, b, c) ||
        onSegment(a, b, d) ||
        onSegment(c, d, a) ||
        onSegment(c, d, b)
      ) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'polygon edges must not intersect',
        );
      }
    }
  }
  return { type: 'Polygon' as const, coordinates: [ring] };
};
