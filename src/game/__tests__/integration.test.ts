import { describe, it, expect } from 'vitest'
import { createInitialState } from '../storage'
import { attemptForge, getSuccessRate } from '../engine'
import { getUpgradeCost, getSellPrice } from '../economy'
import { rollFragmentDrop } from '../fragments'
import { isTitleConditionMet, getNewlyUnlockedTitles, unlockTitles } from '../titles'
import { canAffordMaterials, deductMaterials, getMaterialRequirements } from '../materials'
import { canSkip, executeSkip, getSkipInfo } from '../skip'
import type { GameState, TitleId } from '../../types'

function seq(...values: number[]) {
  let i = 0
  return () => values[i++]
}

describe('통합 시나리오', () => {

  describe('시나리오 1: 초보자 첫 라운드 — 강화 → 파괴 → 조각 획득 → 초심자 칭호', () => {
    it('전체 흐름', () => {
      let state = createInitialState()
      expect(state.gold).toBe(2000)

      // 라운드 시작
      state = { ...state, currentLevel: 0, currentRound: {
        id: 1, startedAt: Date.now(), endedAt: null, peakLevel: 0,
        endReason: null, totalSpent: 0, totalEarned: 0,
      }}

      // +0→+1 강화 (성공 고정)
      const cost0 = getUpgradeCost(0)
      expect(cost0).toBe(5)
      const outcome1 = attemptForge(0, null, seq(0.0)) // 성공
      expect(outcome1.result).toBe('success')
      state = { ...state, currentLevel: 1, gold: state.gold - cost0 }

      // +1→+2 강화 (성공 고정)
      const cost1 = getUpgradeCost(1)
      const outcome2 = attemptForge(1, null, seq(0.0))
      expect(outcome2.result).toBe('success')
      state = { ...state, currentLevel: 2, gold: state.gold - cost1 }

      // +2→+3 강화 (실패 → 파괴)
      const cost2 = getUpgradeCost(2)
      const outcome3 = attemptForge(2, null, seq(0.99)) // 실패
      expect(outcome3.destroyed).toBe(true)
      state = {
        ...state,
        currentLevel: 0,
        gold: state.gold - cost2,
        destroyCount: state.destroyCount + 1,
      }

      // 초심자 칭호 해금 확인
      expect(isTitleConditionMet('beginners_luck', state)).toBe(true)
      const newTitles = getNewlyUnlockedTitles(state)
      expect(newTitles).toContain('beginners_luck')
      state = unlockTitles(state, newTitles)

      // 조각 드랍 (초심자 장착 → 100%)
      state = { ...state, equippedTitle: 'beginners_luck' }
      const drops = rollFragmentDrop(2, 'beginners_luck', seq(0.0, 0.0))
      expect(drops.length).toBeGreaterThan(0)
    })
  })

  describe('시나리오 2: 불굴 보호 발동 → 레벨 유지', () => {
    it('전체 흐름', () => {
      // 실패 + 보호 발동 (rng: 0.99=실패, 0.10=보호 발동 35% 미만)
      const outcome = attemptForge(10, 'indomitable_smith', seq(0.99, 0.10))
      expect(outcome.result).toBe('fail')
      expect(outcome.destroyed).toBe(false)
      expect(outcome.protectionTriggered).toBe(true)
      expect(outcome.protectionSource).toBe('indomitable_smith')
      expect(outcome.newLevel).toBe(10) // 레벨 유지
    })
  })

  describe('시나리오 3: +17 강화 — 재료 체크 + 재련의 정점 보존', () => {
    it('재료 충분 → 강화 가능', () => {
      const reqs = getMaterialRequirements(17)
      expect(reqs).toEqual([{ level: 12, count: 1 }])

      const state = { ...createInitialState(), storage: [12, 16, 5] }
      expect(canAffordMaterials(state, 17)).toBe(true)

      const newState = deductMaterials(state, 17)
      expect(newState.storage).not.toContain(12) // +12 제거됨
      expect(newState.storage).toContain(16)
      expect(newState.storage).toContain(5)
    })

    it('재료 부족 → 강화 불가', () => {
      const state = { ...createInitialState(), storage: [5, 8] }
      expect(canAffordMaterials(state, 17)).toBe(false)
    })
  })

  describe('시나리오 4: 전설의 대장장이 건너뛰기 → +25', () => {
    it('전체 흐름', () => {
      let state: GameState = {
        ...createInitialState(),
        currentLevel: 0,
        equippedTitle: 'legend_smith' as TitleId,
        unlockedTitles: ['legend_smith' as TitleId],
        gold: 5000,
        currentRound: {
          id: 1, startedAt: Date.now(), endedAt: null, peakLevel: 0,
          endReason: null, totalSpent: 0, totalEarned: 0,
        },
      }

      // 건너뛰기 가능 확인
      expect(canSkip(state)).toBe(true)
      const info = getSkipInfo('legend_smith')!
      expect(info.targetLevel).toBe(25)
      expect(info.gold).toBe(0)

      // 건너뛰기 실행
      state = executeSkip(state)
      expect(state.currentLevel).toBe(25)
      expect(state.gold).toBe(5000) // 무료
      expect(state.currentRound!.peakLevel).toBe(25)

      // +25에서 건너뛰기 다시 불가 (레벨이 0이 아님)
      expect(canSkip(state)).toBe(false)
    })
  })

  describe('시나리오 5: 칭호 해금 조건 — 잔해의 수집가', () => {
    it('5종 보유 시 해금', () => {
      const state: GameState = {
        ...createInitialState(),
        fragTypesEverOwned: [
          'rusty_iron', 'refined_iron', 'enchanted_iron',
          'moonlight', 'spirit',
        ],
      }
      expect(isTitleConditionMet('scavenger', state)).toBe(true)
    })
    it('20개 획득 시 해금', () => {
      const state = { ...createInitialState(), totalFragsAcquired: 20 }
      expect(isTitleConditionMet('scavenger', state)).toBe(true)
    })
  })

  describe('시나리오 6: 경제 일관성 — 전 레벨 골드 비용 존재', () => {
    it('+0~+24 모든 레벨에 골드 비용이 number로 존재', () => {
      for (let i = 0; i <= 24; i++) {
        const cost = getUpgradeCost(i)
        expect(typeof cost).toBe('number')
        expect(cost).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('시나리오 7: 판매 시스템', () => {
    it('+25 판매 불가', () => {
      expect(() => getSellPrice(25, null)).toThrow()
    })
    it('흥정의 달인 +50%', () => {
      const normal = getSellPrice(12, null)
      const bargain = getSellPrice(12, 'bargain_master')
      expect(bargain).toBe(Math.floor(normal * 1.5))
    })
  })

  describe('시나리오 8: 검성의 대장장이 — 보호 + 파편 드랍', () => {
    it('실패 + 보호 발동 → 레벨 유지', () => {
      // rng: 0.99=실패, 0.20=보호 발동 (60% 미만)
      const outcome = attemptForge(15, 'sword_saint', seq(0.99, 0.20))
      expect(outcome.protectionTriggered).toBe(true)
      expect(outcome.protectionSource).toBe('sword_saint')
      expect(outcome.newLevel).toBe(15)
    })
    it('실패 + 파괴 + 파편 드랍', () => {
      // rng: 0.0(드랍통과), 0.0(조각선택), 0.0(수량1개), 0.0(파편추가)
      const drops = rollFragmentDrop(15, 'sword_saint', seq(0.0, 0.0, 0.0, 0.0))
      expect(drops.length).toBe(2) // 일반 드랍 + 검성 파편
      expect(drops.some(d => d.fragmentId === 'swordmaster')).toBe(true)
    })
  })

  describe('시나리오 9: 잔해의 수집가 — 100% 드랍 + 2배', () => {
    it('수량 1개 → ×2 = 2개', () => {
      // autoPass → rng: 0.0(조각선택), 0.0(수량1개→×2)
      const drops = rollFragmentDrop(2, 'scavenger', seq(0.0, 0.0))
      expect(drops[0].count).toBe(2)
    })
    it('수량 2개 → ×2 = 4개', () => {
      // autoPass → rng: 0.0(조각선택), 0.90(수량2개→×2)
      const drops = rollFragmentDrop(2, 'scavenger', seq(0.0, 0.90))
      expect(drops[0].count).toBe(4)
    })
  })

  describe('시나리오 10: 재료 체인 비재귀성 검증', () => {
    it('모든 재료 검은 +16 이하', () => {
      for (let level = 17; level <= 25; level++) {
        const reqs = getMaterialRequirements(level)
        for (const req of reqs) {
          expect(req.level).toBeLessThanOrEqual(16)
        }
      }
    })
    it('재료 검 자체는 재료를 요구하지 않음', () => {
      for (let level = 17; level <= 25; level++) {
        const reqs = getMaterialRequirements(level)
        for (const req of reqs) {
          // 재료 검(≤+16)의 재료 요구 = 빈 배열
          expect(getMaterialRequirements(req.level)).toEqual([])
        }
      }
    })
  })

  describe('시나리오 11: 건너뛰기 — totalSpent 추적', () => {
    it('건너뛰기 골드 비용이 totalSpent에 반영됨', () => {
      const state: GameState = {
        ...createInitialState(),
        currentLevel: 0,
        equippedTitle: 'scavenger' as TitleId,
        unlockedTitles: ['scavenger' as TitleId],
        gold: 500,
        fragments: { ...createInitialState().fragments, refined_iron: 2 },
        currentRound: {
          id: 1, startedAt: Date.now(), endedAt: null, peakLevel: 0,
          endReason: null, totalSpent: 0, totalEarned: 0,
        },
      }
      const next = executeSkip(state)
      expect(next.currentRound!.totalSpent).toBe(100) // scavenger skip costs 100G
    })
  })

  describe('시나리오 12: V11_C 확률 곡선 검증', () => {
    it('+7→+8: 75%', () => expect(getSuccessRate(7, null)).toBe(0.75))
    it('+12→+13: 50%', () => expect(getSuccessRate(12, null)).toBe(0.50))
    it('+13→+14: 68% (반전 구간)', () => expect(getSuccessRate(13, null)).toBe(0.68))
    it('+20→+21: 48% (최저)', () => expect(getSuccessRate(20, null)).toBe(0.48))
    it('+24→+25: 65%', () => expect(getSuccessRate(24, null)).toBe(0.65))
  })

  describe('시나리오 13: 성공률 — 달인 보정 +2%p 반영', () => {
    it('달인 장착 시 성공률이 미장착보다 높음', () => {
      for (let level = 0; level <= 24; level++) {
        const normal = getSuccessRate(level, null)
        const master = getSuccessRate(level, 'master_smith')
        expect(master).toBeGreaterThan(normal)
      }
    })
    it('+8 구간 (70%) 달인 → 72%', () => {
      const rate = getSuccessRate(8, 'master_smith')
      expect(rate).toBeCloseTo(0.72)
    })
  })

})
