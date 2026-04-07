import { describe, it, expect } from 'vitest'
import {
  rollFragmentDrop,
  addFragment,
  removeFragments,
  createEmptyInventory,
} from '../fragments'
import type { FragmentInventory } from '../../types'

function seq(...values: number[]) {
  let i = 0
  return () => values[i++]
}

const emptyInv = (): FragmentInventory => createEmptyInventory()

// ────────────────────────────────────────────────────────────────
// rollFragmentDrop
// ────────────────────────────────────────────────────────────────

describe('rollFragmentDrop', () => {
  describe('드랍 불가 레벨 (level 0, 1, 25)', () => {
    it('level 0: 빈 배열', () => {
      expect(rollFragmentDrop(0, null, seq(0.0))).toEqual([])
    })

    it('level 1: 빈 배열', () => {
      expect(rollFragmentDrop(1, null, seq(0.0))).toEqual([])
    })

    it('level 25: 빈 배열', () => {
      expect(rollFragmentDrop(25, null, seq(0.0))).toEqual([])
    })
  })

  describe('1단계: 드랍 여부 판정', () => {
    it('rng >= 0.60: 빈 배열', () => {
      expect(rollFragmentDrop(2, null, seq(0.60))).toEqual([])
      expect(rollFragmentDrop(2, null, seq(0.99))).toEqual([])
    })

    it('rng < 0.60: 드랍 발생 (배열 길이 >= 1)', () => {
      // 1회차(drop check=0.0 pass), 2회차(fragment select=0.0), 3회차(qty=0.5)
      const result = rollFragmentDrop(2, null, seq(0.0, 0.0, 0.5))
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('beginners_luck: 1단계 항상 통과', () => {
    it('높은 rng여도 드랍 발생 (rng 소모 없이 통과)', () => {
      // 1단계 스킵 → 1회차(fragment=0.0 → rusty_iron), 2회차(qty=0.5 → 1)
      const result = rollFragmentDrop(2, 'beginners_luck', seq(0.0, 0.5))
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('beginners_luck + level 0: 드랍 테이블 없으므로 여전히 []', () => {
      expect(rollFragmentDrop(0, 'beginners_luck', seq(0.0))).toEqual([])
    })
  })

  describe('scavenger: 1단계 항상 통과 + 수량 2배', () => {
    it('scavenger + qty=1 → count=2', () => {
      // 1단계 스킵 → 1회차(fragment=0.0 → rusty_iron), 2회차(qty=0.5<0.80 → 1) → ×2 = 2
      const result = rollFragmentDrop(2, 'scavenger', seq(0.0, 0.5))
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].count).toBe(2)
    })

    it('scavenger + qty=2 → count=4', () => {
      // 2회차(qty=0.99>=0.80 → 2) → ×2 = 4
      const result = rollFragmentDrop(2, 'scavenger', seq(0.0, 0.99))
      expect(result[0].count).toBe(4)
    })
  })

  describe('2단계: 가중 랜덤 조각 선택', () => {
    it('level 2: 낮은 rng → rusty_iron (weight 80)', () => {
      // beginners_luck: 1단계 스킵 → 1회차(fragment=0.0 → rusty_iron), 2회차(qty=0.5)
      const result = rollFragmentDrop(2, 'beginners_luck', seq(0.0, 0.5))
      expect(result[0].fragmentId).toBe('rusty_iron')
    })

    it('level 2: 높은 rng → refined_iron (weight 5)', () => {
      // r = 0.99 * 85 = 84.15 → rusty(80) 누적 < 84.15, rusty+refined(85) > 84.15 → refined_iron
      const result = rollFragmentDrop(2, 'beginners_luck', seq(0.99, 0.5))
      expect(result[0].fragmentId).toBe('refined_iron')
    })

    it('level 9 (귀검): spirit만 있어서 항상 spirit', () => {
      expect(rollFragmentDrop(9, 'beginners_luck', seq(0.0, 0.5))[0].fragmentId).toBe('spirit')
      expect(rollFragmentDrop(9, 'beginners_luck', seq(0.5, 0.5))[0].fragmentId).toBe('spirit')
    })

    it('level 17 (백야): swordmaster', () => {
      // beginners_luck 사용 → 1회차(fragment), 2회차(qty), 3회차(sword_saint? No - not equipped)
      // Wait: beginners_luck is equipped, not sword_saint. So no 4th rng call.
      const result = rollFragmentDrop(17, 'beginners_luck', seq(0.0, 0.5))
      expect(result[0].fragmentId).toBe('swordmaster')
    })
  })

  describe('3단계: 수량', () => {
    it('qty rng < 0.80: count=1', () => {
      // 1회차(fragment=0.0), 2회차(qty=0.79 < 0.80 → 1)
      const result = rollFragmentDrop(2, 'beginners_luck', seq(0.0, 0.79))
      expect(result[0].count).toBe(1)
    })

    it('qty rng >= 0.80: count=2', () => {
      // 2회차(qty=0.80 >= 0.80 → 2)
      const result = rollFragmentDrop(2, 'beginners_luck', seq(0.0, 0.80))
      expect(result[0].count).toBe(2)
    })
  })

  describe('sword_saint: 검성의 파편 추가 드랍', () => {
    it('rng 4회차 < 0.50: swordmaster 추가됨', () => {
      // sword_saint: 1단계 rng 있음
      // 1회차(drop check=0.0 pass), 2회차(fragment=0.0), 3회차(qty=0.5), 4회차(sword_saint=0.49 < 0.50)
      const result = rollFragmentDrop(2, 'sword_saint', seq(0.0, 0.0, 0.5, 0.49))
      expect(result.length).toBe(2)
      expect(result.some((r) => r.fragmentId === 'swordmaster')).toBe(true)
    })

    it('rng 4회차 >= 0.50: swordmaster 없음', () => {
      // 4회차(sword_saint=0.50 >= 0.50 → 미발동)
      const result = rollFragmentDrop(2, 'sword_saint', seq(0.0, 0.0, 0.5, 0.50))
      expect(result.length).toBe(1)
      expect(result.some((r) => r.fragmentId === 'swordmaster')).toBe(false)
    })

    it('드랍 실패 시 sword_saint rng 호출 없음 (rng 소진 확인)', () => {
      // 1회차(drop check=0.99 >= 0.60 → 드랍 실패)
      // sword_saint rng 호출 안됨 → 추가 조각 없음
      const result = rollFragmentDrop(2, 'sword_saint', seq(0.99))
      expect(result).toEqual([])
    })
  })

  describe('통계 검증 (level 2, 1000회)', () => {
    it('rusty_iron이 refined_iron보다 훨씬 많이 나옴 (weight 80 vs 5)', () => {
      const counts: Record<string, number> = {}
      for (let i = 0; i < 1000; i++) {
        const drops = rollFragmentDrop(2, 'beginners_luck')
        for (const drop of drops) {
          counts[drop.fragmentId] = (counts[drop.fragmentId] ?? 0) + drop.count
        }
      }
      expect(counts['rusty_iron']).toBeGreaterThan((counts['refined_iron'] ?? 0) * 5)
    })
  })
})

// ────────────────────────────────────────────────────────────────
// addFragment
// ────────────────────────────────────────────────────────────────

describe('addFragment', () => {
  it('조각 1개 추가', () => {
    const result = addFragment(emptyInv(), 'rusty_iron')
    expect(result.rusty_iron).toBe(1)
    expect(result.refined_iron).toBe(0) // 다른 조각 변경 없음
  })

  it('기존 수량에 누적', () => {
    const inv = { ...emptyInv(), moonlight: 5 }
    expect(addFragment(inv, 'moonlight').moonlight).toBe(6)
  })

  it('불변 — 원본 인벤토리 변경 없음', () => {
    const original = emptyInv()
    addFragment(original, 'spirit')
    expect(original.spirit).toBe(0)
  })
})

// ────────────────────────────────────────────────────────────────
// removeFragments
// ────────────────────────────────────────────────────────────────

describe('removeFragments', () => {
  it('정상 차감', () => {
    const inv = { ...emptyInv(), swordmaster: 3 }
    const result = removeFragments(inv, 'swordmaster', 2)
    expect(result.swordmaster).toBe(1)
  })

  it('수량 부족 시 에러', () => {
    expect(() => removeFragments(emptyInv(), 'twisted_mana', 1)).toThrow()
  })

  it('불변 — 원본 변경 없음', () => {
    const inv = { ...emptyInv(), rusty_iron: 5 }
    removeFragments(inv, 'rusty_iron', 3)
    expect(inv.rusty_iron).toBe(5)
  })
})
