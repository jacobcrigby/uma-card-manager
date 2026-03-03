/**
 * Utility functions for formatting display values.
 */

export function formatType(type: number): string {
  const typeNames: { [key: number]: string } = {
    0: 'Speed',
    1: 'Stamina',
    2: 'Power',
    3: 'Guts',
    4: 'Wit',
    5: 'Friend',
  };
  return typeNames[type] || `Type ${type}`;
}

export function formatRarity(rarity: number): string {
  const rarityNames: { [key: number]: string } = {
    1: 'R',
    2: 'SR',
    3: 'SSR',
  };
  return rarityNames[rarity] || `Rarity ${rarity}`;
}

export function formatLB(lb: number): string {
  if (lb === 4) {
    return 'MLB';
  }
  return `LB${lb}`;
}

export function getTierColor(tier: string): string {
  const tierColors: { [key: string]: string } = {
    'S+': '#DC3545', // Reddish
    S: '#E67E22', // Dark orange
    A: '#FF9800', // Light orange
    B: '#FFD54F', // Yellow
    C: '#90EE90', // Light green
    D: '#B0BEC5', // Blue gray
    E: '#CFD8DC', // Light blue gray
    F: '#ECEFF1', // Very light gray
  };
  return tierColors[tier] || '#E0E0E0'; // Default gray
}

export function getTierTextColor(tier: string): string {
  // Use white text for darker backgrounds (S+, S)
  // Use black text for lighter backgrounds (A, B, C, D, E, F)
  const darkTiers = ['S+', 'S'];
  return darkTiers.includes(tier) ? '#FFFFFF' : '#000000';
}
