/**
 * swordImage.ts
 * 검 이미지 경로 및 glow 색상 공유 유틸.
 */

/** sword_03.png 없음 → sword_02.png fallback */
export function getSwordImagePath(level: number): string {
  const effectiveLevel = level === 3 ? 2 : level
  return `/sprites/swords/sword_${String(effectiveLevel).padStart(2, '0')}.png`
}

/** 검별 glow 색상 (sword_design_spec.md 기준). null = glow 없음 */
export function getSwordGlowColor(level: number): string | null {
  const GLOW_MAP: Record<number, string> = {
    8: '#4488dd',
    9: '#882020',
    10: '#c0d8ff',
    11: '#ffffff20',
    12: '#9944cc',
    13: '#4a1860',
    14: '#cc4410',
    15: '#8090c0',
    16: '#aa1818',
    17: '#e0e8ff',
    18: '#4080c0',
    19: '#6020a0',
    20: '#e8d060',
    21: '#484848',
    22: '#d4a020',
    23: '#881818',
    24: '#20a040',
    25: '#20a040',
  }
  return GLOW_MAP[level] ?? null
}
