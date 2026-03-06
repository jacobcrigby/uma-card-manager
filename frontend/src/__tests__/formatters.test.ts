import { describe, it, expect } from 'vitest';
import {
  formatType,
  formatRarity,
  formatLB,
  getTierColor,
  getTierTextColor,
} from '../utils/formatters.js';

// ── formatType ────────────────────────────────────────────────────────────────

describe('formatType', () => {
  it('maps all 6 known types correctly', () => {
    expect(formatType(0)).toBe('Speed');
    expect(formatType(1)).toBe('Stamina');
    expect(formatType(2)).toBe('Power');
    expect(formatType(3)).toBe('Guts');
    expect(formatType(4)).toBe('Wit');
    expect(formatType(5)).toBe('Friend');
  });

  it('returns "Type N" for unknown types', () => {
    expect(formatType(6)).toBe('Type 6');
    expect(formatType(-1)).toBe('Type -1');
    expect(formatType(99)).toBe('Type 99');
  });
});

// ── formatRarity ──────────────────────────────────────────────────────────────

describe('formatRarity', () => {
  it('maps 1→R, 2→SR, 3→SSR', () => {
    expect(formatRarity(1)).toBe('R');
    expect(formatRarity(2)).toBe('SR');
    expect(formatRarity(3)).toBe('SSR');
  });

  it('returns "Rarity N" for unknown values', () => {
    expect(formatRarity(0)).toBe('Rarity 0');
    expect(formatRarity(4)).toBe('Rarity 4');
    expect(formatRarity(99)).toBe('Rarity 99');
  });
});

// ── formatLB ──────────────────────────────────────────────────────────────────

describe('formatLB', () => {
  it('formats 0–3 as LB0–LB3', () => {
    expect(formatLB(0)).toBe('LB0');
    expect(formatLB(1)).toBe('LB1');
    expect(formatLB(2)).toBe('LB2');
    expect(formatLB(3)).toBe('LB3');
  });

  it('formats 4 as MLB', () => {
    expect(formatLB(4)).toBe('MLB');
  });
});

// ── getTierColor ──────────────────────────────────────────────────────────────

describe('getTierColor', () => {
  it('returns the reddish color for S+', () => {
    expect(getTierColor('S+')).toBe('#DC3545');
  });

  it('returns a defined color for each standard tier', () => {
    const tiers = ['S+', 'S', 'A', 'B', 'C', 'D', 'E', 'F'];
    for (const tier of tiers) {
      const color = getTierColor(tier);
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('returns the default gray (#E0E0E0) for unknown tiers', () => {
    expect(getTierColor('X')).toBe('#E0E0E0');
    expect(getTierColor('')).toBe('#E0E0E0');
    expect(getTierColor('Z+')).toBe('#E0E0E0');
  });

  it('S and S+ have distinct colors', () => {
    expect(getTierColor('S+')).not.toBe(getTierColor('S'));
  });
});

// ── getTierTextColor ──────────────────────────────────────────────────────────

describe('getTierTextColor', () => {
  it('returns white for S+', () => {
    expect(getTierTextColor('S+')).toBe('#FFFFFF');
  });

  it('returns white for S', () => {
    expect(getTierTextColor('S')).toBe('#FFFFFF');
  });

  it('returns black for A', () => {
    expect(getTierTextColor('A')).toBe('#000000');
  });

  it('returns black for lighter tiers (B, C, D, E, F)', () => {
    for (const tier of ['B', 'C', 'D', 'E', 'F']) {
      expect(getTierTextColor(tier)).toBe('#000000');
    }
  });

  it('returns black for unknown tier', () => {
    expect(getTierTextColor('X')).toBe('#000000');
  });
});
