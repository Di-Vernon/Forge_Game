import { describe, it, expect } from 'vitest'
import {
  isTitleConditionMet,
  getNewlyUnlockedTitles,
  unlockTitle,
  unlockTitles,
} from '../titles'
import type { GameState, Round } from '../../types'
import { createInitialState } from '../storage'

// ────────────────────────────────────────────────────────────────
// 헬퍼
// ────────────────────────────────────────────────────────────────

function makeRound(peakLevel: number): Round {
  return {
    id: 1,
    startedAt: 0,
    endedAt: 1000,
    peakLevel,
    endReason: 'sold',
    totalSpent: 0,
    totalEarned: 0,
  }
}

function baseState(): GameState {
  return createInitialState()
}

// ────────────────────────────────────────────────────────────────
// isTitleConditionMet
// ────────────────────────────────────────────────────────────────

describe('isTitleConditionMet', () => {
  describe('초심자의 행운 (beginners_luck)', () => {
    it('파괴 0회: false', () => {
      expect(isTitleConditionMet('beginners_luck', baseState())).toBe(false)
    })

    it('파괴 1회: true (첫 파괴)', () => {
      const state = { ...baseState(), destroyCount: 1 }
      expect(isTitleConditionMet('beginners_luck', state)).toBe(true)
    })
  })

  describe('흥정의 달인 (bargain_master)', () => {
    it('판매 14회: false', () => {
      const state = { ...baseState(), sellCount: 14 }
      expect(isTitleConditionMet('bargain_master', state)).toBe(false)
    })

    it('판매 15회: true', () => {
      const state = { ...baseState(), sellCount: 15 }
      expect(isTitleConditionMet('bargain_master', state)).toBe(true)
    })
  })

  describe('잔해의 수집가 (scavenger)', () => {
    it('조각 종류 4종 & 총획득 19개: false', () => {
      const state = {
        ...baseState(),
        fragTypesEverOwned: ['rusty_iron', 'refined_iron', 'moonlight', 'spirit'] as const,
        totalFragsAcquired: 19,
      }
      expect(isTitleConditionMet('scavenger', state)).toBe(false)
    })

    it('조각 5종 보유: true', () => {
      const state = {
        ...baseState(),
        fragTypesEverOwned: ['rusty_iron', 'refined_iron', 'moonlight', 'spirit', 'enchanted_iron'] as const,
      }
      expect(isTitleConditionMet('scavenger', state)).toBe(true)
    })

    it('총 20개 획득: true', () => {
      const state = { ...baseState(), totalFragsAcquired: 20 }
      expect(isTitleConditionMet('scavenger', state)).toBe(true)
    })
  })

  describe('불굴의 대장장이 (indomitable_smith)', () => {
    it('+8 이상 파괴 14회: false', () => {
      const state = { ...baseState(), destroyCountHigh: 14 }
      expect(isTitleConditionMet('indomitable_smith', state)).toBe(false)
    })

    it('+8 이상 파괴 15회: true', () => {
      const state = { ...baseState(), destroyCountHigh: 15 }
      expect(isTitleConditionMet('indomitable_smith', state)).toBe(true)
    })
  })

  describe('달인 대장장이 (master_smith)', () => {
    it('18강 미달 라운드만 있으면: false', () => {
      const state = { ...baseState(), rounds: [makeRound(17)] }
      expect(isTitleConditionMet('master_smith', state)).toBe(false)
    })

    it('완료 라운드에 18강 달성: true', () => {
      const state = { ...baseState(), rounds: [makeRound(18)] }
      expect(isTitleConditionMet('master_smith', state)).toBe(true)
    })

    it('현재 진행 라운드에서 18강 달성: true', () => {
      const state = {
        ...baseState(),
        currentRound: { ...makeRound(18), endedAt: null, endReason: null },
      }
      expect(isTitleConditionMet('master_smith', state)).toBe(true)
    })
  })

  describe('재련의 정점 (refine_peak)', () => {
    it('조합소 제작 2회: false', () => {
      const state = { ...baseState(), craftCountCombine: 2 }
      expect(isTitleConditionMet('refine_peak', state)).toBe(false)
    })

    it('조합소 제작 3회: true', () => {
      const state = { ...baseState(), craftCountCombine: 3 }
      expect(isTitleConditionMet('refine_peak', state)).toBe(true)
    })
  })

  describe('검성의 대장장이 (sword_saint)', () => {
    it('백야 미제작: false', () => {
      expect(isTitleConditionMet('sword_saint', baseState())).toBe(false)
    })

    it('백야 제작됨: true', () => {
      const state = { ...baseState(), baekYaCrafted: true }
      expect(isTitleConditionMet('sword_saint', state)).toBe(true)
    })
  })

  describe('전설의 대장장이 (legend_smith)', () => {
    it('25강 라운드 없으면: false', () => {
      const state = { ...baseState(), rounds: [makeRound(24)] }
      expect(isTitleConditionMet('legend_smith', state)).toBe(false)
    })

    it('완료 라운드에 25강 달성: true', () => {
      const state = { ...baseState(), rounds: [makeRound(25)] }
      expect(isTitleConditionMet('legend_smith', state)).toBe(true)
    })

    it('현재 라운드 25강: true', () => {
      const state = {
        ...baseState(),
        currentRound: { ...makeRound(25), endedAt: null, endReason: null },
      }
      expect(isTitleConditionMet('legend_smith', state)).toBe(true)
    })
  })

  describe('신화 속 이야기 (mythic_tale)', () => {
    it('일부만 있으면: false', () => {
      const state = { ...baseState(), storage: [1, 2, 3] }
      expect(isTitleConditionMet('mythic_tale', state)).toBe(false)
    })

    it('1~25 전부 있으면: true', () => {
      const allLevels = Array.from({ length: 25 }, (_, i) => i + 1)
      const state = { ...baseState(), storage: allLevels }
      expect(isTitleConditionMet('mythic_tale', state)).toBe(true)
    })

    it('중복 포함 + 1~25 전부: true', () => {
      const allLevels = Array.from({ length: 25 }, (_, i) => i + 1)
      const state = { ...baseState(), storage: [...allLevels, 1, 5, 25] }
      expect(isTitleConditionMet('mythic_tale', state)).toBe(true)
    })

    it('25강 없으면 false', () => {
      const levels1to24 = Array.from({ length: 24 }, (_, i) => i + 1)
      const state = { ...baseState(), storage: levels1to24 }
      expect(isTitleConditionMet('mythic_tale', state)).toBe(false)
    })
  })
})

// ────────────────────────────────────────────────────────────────
// getNewlyUnlockedTitles
// ────────────────────────────────────────────────────────────────

describe('getNewlyUnlockedTitles', () => {
  it('초기 상태: 해금 칭호 없음', () => {
    expect(getNewlyUnlockedTitles(baseState())).toEqual([])
  })

  it('조건 충족 + 미보유: 새 칭호 반환', () => {
    const state = { ...baseState(), destroyCount: 1 }
    expect(getNewlyUnlockedTitles(state)).toContain('beginners_luck')
  })

  it('조건 충족 + 이미 보유: 제외됨', () => {
    const state = {
      ...baseState(),
      destroyCount: 1,
      unlockedTitles: ['beginners_luck' as const],
    }
    expect(getNewlyUnlockedTitles(state)).not.toContain('beginners_luck')
  })

  it('여러 조건 동시 충족', () => {
    const state = {
      ...baseState(),
      destroyCount: 1,
      destroyCountHigh: 15,
      sellCount: 15,
    }
    const newTitles = getNewlyUnlockedTitles(state)
    expect(newTitles).toContain('beginners_luck')
    expect(newTitles).toContain('indomitable_smith')
    expect(newTitles).toContain('bargain_master')
  })
})

// ────────────────────────────────────────────────────────────────
// unlockTitle / unlockTitles
// ────────────────────────────────────────────────────────────────

describe('unlockTitle', () => {
  it('새 칭호 추가', () => {
    const result = unlockTitle(baseState(), 'beginners_luck')
    expect(result.unlockedTitles).toContain('beginners_luck')
  })

  it('이미 보유한 칭호: 중복 추가 안됨', () => {
    const state = { ...baseState(), unlockedTitles: ['beginners_luck' as const] }
    const result = unlockTitle(state, 'beginners_luck')
    expect(result.unlockedTitles.filter((t) => t === 'beginners_luck')).toHaveLength(1)
  })

  it('불변 — 원본 상태 변경 없음', () => {
    const original = baseState()
    unlockTitle(original, 'beginners_luck')
    expect(original.unlockedTitles).toHaveLength(0)
  })
})

describe('unlockTitles', () => {
  it('여러 칭호 한번에 해금', () => {
    const result = unlockTitles(baseState(), ['beginners_luck', 'bargain_master'])
    expect(result.unlockedTitles).toContain('beginners_luck')
    expect(result.unlockedTitles).toContain('bargain_master')
  })

  it('빈 배열이면 상태 그대로', () => {
    const state = baseState()
    const result = unlockTitles(state, [])
    expect(result.unlockedTitles).toHaveLength(0)
  })
})
