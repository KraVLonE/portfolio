import { describe, expect, it } from 'vitest';
import { groupByYear, relativeTime, wasUpdated } from '../utils';
import { summary } from './fixtures';

describe('BLG-12 groupByYear', () => {
  it('groups consecutive posts by year, newest first', () => {
    const g = groupByYear([
      summary(1, 'a', '2026-05-01T00:00:00Z'),
      summary(2, 'b', '2026-01-01T12:00:00Z'),
      summary(3, 'c', '2025-12-01T00:00:00Z'),
    ]);
    expect(g.map((x) => [x.year, x.posts.map((p) => p.title)])).toEqual([[2026, ['a', 'b']], [2025, ['c']]]);
  });
  it('empty list -> no groups', () => expect(groupByYear([])).toEqual([]));
});

describe('BLG-05 wasUpdated', () => {
  it('needs more than a day between publish and update', () => {
    expect(wasUpdated('2026-01-01T00:00:00Z', '2026-01-01T20:00:00Z')).toBe(false);
    expect(wasUpdated('2026-01-01T00:00:00Z', '2026-01-03T00:00:00Z')).toBe(true);
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-01-10T00:00:00Z');
  it.each([
    ['2026-01-09T23:59:30Z', '30 seconds ago'],
    ['2026-01-09T22:00:00Z', '2 hours ago'],
    ['2026-01-07T00:00:00Z', '3 days ago'],
    ['2025-01-10T00:00:00Z', 'last year'],
  ])('%s -> %s', (iso, out) => expect(relativeTime(iso, now)).toBe(out));
});
