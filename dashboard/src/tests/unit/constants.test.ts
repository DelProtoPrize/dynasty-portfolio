import { describe, it, expect } from 'vitest';
import { fmt, pctShare, median, hhiTone } from '../../lib/constants';

describe('fmt', () => {
  it('formats numbers with commas', () => {
    expect(fmt(1000)).toBe('1,000');
    expect(fmt(46460)).toBe('46,460');
  });

  it('returns dash for null/undefined', () => {
    expect(fmt(null)).toBe('–');
    expect(fmt(undefined)).toBe('–');
  });
});

describe('pctShare', () => {
  it('calculates percentage', () => {
    expect(pctShare(100, 1000)).toBe('10.0%');
    expect(pctShare(46460, 435453)).toBe('10.7%');
  });

  it('returns dash when total is 0', () => {
    expect(pctShare(100, 0)).toBe('–');
  });

  it('returns dash when value is null', () => {
    expect(pctShare(null, 1000)).toBe('–');
  });
});

describe('median', () => {
  it('computes median of odd-length array', () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it('computes median of even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('returns null for empty array', () => {
    expect(median([])).toBe(null);
  });

  it('handles unsorted input', () => {
    expect(median([5, 1, 3])).toBe(3);
  });
});

describe('hhiTone', () => {
  it('returns kpi-bad for high concentration', () => {
    expect(hhiTone(0.25)).toBe('kpi-bad');
  });

  it('returns kpi-warn for moderate', () => {
    expect(hhiTone(0.18)).toBe('kpi-warn');
  });

  it('returns kpi-good for low', () => {
    expect(hhiTone(0.1)).toBe('kpi-good');
  });
});
