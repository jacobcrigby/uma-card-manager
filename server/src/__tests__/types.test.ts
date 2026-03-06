import { describe, it, expect } from 'vitest';
import { TIER_VALUE, TIER_ORDER, TYPE_NAMES } from '../types.js';

describe('TIER_VALUE', () => {
  it('S+ has the highest value', () => {
    const max = Math.max(...Object.values(TIER_VALUE));
    expect(TIER_VALUE['S+']).toBe(max);
  });

  it('S+ equals 13 (length of TIER_ORDER)', () => {
    expect(TIER_VALUE['S+']).toBe(TIER_ORDER.length);
  });

  it('F has the lowest nonzero value (1)', () => {
    const min = Math.min(...Object.values(TIER_VALUE));
    expect(TIER_VALUE['F']).toBe(min);
    expect(TIER_VALUE['F']).toBe(1);
  });

  it('ordering is consistent: S+ > S > A+ > A > B > C > D > E > F', () => {
    expect(TIER_VALUE['S+']).toBeGreaterThan(TIER_VALUE['S']);
    expect(TIER_VALUE['S']).toBeGreaterThan(TIER_VALUE['A+']);
    expect(TIER_VALUE['A+']).toBeGreaterThan(TIER_VALUE['A']);
    expect(TIER_VALUE['A']).toBeGreaterThan(TIER_VALUE['B']);
    expect(TIER_VALUE['B']).toBeGreaterThan(TIER_VALUE['C']);
    expect(TIER_VALUE['C']).toBeGreaterThan(TIER_VALUE['D']);
    expect(TIER_VALUE['D']).toBeGreaterThan(TIER_VALUE['E']);
    expect(TIER_VALUE['E']).toBeGreaterThan(TIER_VALUE['F']);
  });

  it('covers all 13 tiers in TIER_ORDER', () => {
    expect(Object.keys(TIER_VALUE)).toHaveLength(TIER_ORDER.length);
    for (const tier of TIER_ORDER) {
      expect(TIER_VALUE[tier]).toBeDefined();
    }
  });

  it('unknown tier is undefined (not 0)', () => {
    expect(TIER_VALUE['X']).toBeUndefined();
  });
});

describe('TYPE_NAMES', () => {
  it('has all 6 type keys (0–5)', () => {
    expect(Object.keys(TYPE_NAMES).map(Number).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('maps types to correct names', () => {
    expect(TYPE_NAMES[0]).toBe('Speed');
    expect(TYPE_NAMES[1]).toBe('Stamina');
    expect(TYPE_NAMES[2]).toBe('Power');
    expect(TYPE_NAMES[3]).toBe('Guts');
    expect(TYPE_NAMES[4]).toBe('Wit');
    expect(TYPE_NAMES[5]).toBe('Friend');
  });
});
