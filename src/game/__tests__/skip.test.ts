import { describe, it, expect } from 'vitest'
import { getSkipInfo, canSkip, executeSkip } from '../skip'
import { createInitialState } from '../storage'
import type { GameState } from '../../types'

// ────────────────────────────────────────────────────────────────
// 헬퍼
// ────────────────────────────────────────────────────────────────

function inRoundState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState()
  return {
    ...base,
    currentLevel: 0,
    currentRound: {
      id: 1,
      startedAt: Date.now(),
      endedAt: null,
      peakLevel: 0,
      endReason: null,
      totalSpent: 0,
      totalEarned: 0,
    },
    ...overrides,
  }
}

// ────────────────────────────────────────────────────────────────
// getSkipInfo
// ────────────────────────────────────────────────────────────────

describe('getSkipInfo', () => {
  it('null 칭호 → null', () => {
    expect(getSkipInfo(null)).toBeNull()
  })

  it('건너뛰기 없는 칭호 → null', () => {
    expect(getSkipInfo('beginners_luck')).toBeNull()
    expect(getSkipInfo('bargain_master')).toBeNull()
    expect(getSkipInfo('mythic_tale')).toBeNull()
  })

  it('잔해의 수집가 → targetLevel=5, refined_iron×1, gold=100', () => {
    const info = getSkipInfo('scavenger')
    expect(info).not.toBeNull()
    expect(info!.targetLevel).toBe(5)
    expect(info!.fragmentId).toBe('refined_iron')
    expect(info!.fragmentCount).toBe(1)
    expect(info!.gold).toBe(100)
  })

  it('불굴의 대장장이 → targetLevel=7, refined_iron×1, gold=116', () => {
    const info = getSkipInfo('indomitable_smith')
    expect(info).not.toBeNull()
    expect(info!.targetLevel).toBe(7)
    expect(info!.fragmentId).toBe('refined_iron')
    expect(info!.fragmentCount).toBe(1)
    expect(info!.gold).toBe(116)
  })

  it('검성의 대장장이 → targetLevel=8, enchanted_iron×1, gold=238', () => {
    const info = getSkipInfo('sword_saint')
    expect(info!.targetLevel).toBe(8)
    expect(info!.fragmentId).toBe('enchanted_iron')
    expect(info!.fragmentCount).toBe(1)
    expect(info!.gold).toBe(238)
  })

  it('달인 대장장이 → targetLevel=12, unknown_mineral×1, gold=4418', () => {
    const info = getSkipInfo('master_smith')
    expect(info!.targetLevel).toBe(12)
    expect(info!.fragmentId).toBe('unknown_mineral')
    expect(info!.fragmentCount).toBe(1)
    expect(info!.gold).toBe(4418)
  })

  it('재련의 정점 → targetLevel=12, unknown_mineral×1, gold=4418', () => {
    const info = getSkipInfo('refine_peak')
    expect(info!.targetLevel).toBe(12)
    expect(info!.fragmentId).toBe('unknown_mineral')
    expect(info!.fragmentCount).toBe(1)
    expect(info!.gold).toBe(4418)
  })

  it('전설의 대장장이 → targetLevel=25, 조각 없음, gold=0', () => {
    const info = getSkipInfo('legend_smith')
    expect(info!.targetLevel).toBe(25)
    expect(info!.fragmentId).toBeNull()
    expect(info!.fragmentCount).toBe(0)
    expect(info!.gold).toBe(0)
  })
})

// ────────────────────────────────────────────────────────────────
// canSkip
// ────────────────────────────────────────────────────────────────

describe('canSkip', () => {
  it('라운드 미시작 → false', () => {
    const state = createInitialState()
    expect(canSkip({ ...state, equippedTitle: 'scavenger' })).toBe(false)
  })

  it('currentLevel !== 0 → false', () => {
    const state = inRoundState({ currentLevel: 5, equippedTitle: 'scavenger' })
    expect(canSkip(state)).toBe(false)
  })

  it('레벨이 0이 아니면 → false', () => {
    // 건너뛰기 후 레벨이 올라가므로 같은 라운드에서 재사용 불가
    const state = inRoundState({
      equippedTitle: 'scavenger',
      currentLevel: 5,
      fragments: { ...createInitialState().fragments, rusty_iron: 1 },
    })
    expect(canSkip(state)).toBe(false)
  })

  it('건너뛰기 없는 칭호 → false', () => {
    const state = inRoundState({ equippedTitle: 'beginners_luck' })
    expect(canSkip(state)).toBe(false)
  })

  it('칭호 미장착 → false', () => {
    const state = inRoundState({ equippedTitle: null })
    expect(canSkip(state)).toBe(false)
  })

  it('조각 부족 → false', () => {
    const state = inRoundState({
      equippedTitle: 'scavenger',
      // refined_iron: 0 (기본값)
    })
    expect(canSkip(state)).toBe(false)
  })

  it('조각 충분 + 골드 충분 → true', () => {
    const state = inRoundState({
      equippedTitle: 'scavenger',
      gold: 100,
      fragments: { ...createInitialState().fragments, refined_iron: 1 },
    })
    expect(canSkip(state)).toBe(true)
  })

  it('조각 충분 + 골드 부족 → false', () => {
    const state = inRoundState({
      equippedTitle: 'scavenger',
      gold: 99,
      fragments: { ...createInitialState().fragments, refined_iron: 1 },
    })
    expect(canSkip(state)).toBe(false)
  })

  it('전설의 대장장이: 조각 0개, gold=0 → true', () => {
    const state = inRoundState({ equippedTitle: 'legend_smith' })
    expect(canSkip(state)).toBe(true)
  })

  it('불굴 건너뛰기: 골드(116) + refined_iron 충분 → true', () => {
    const state = inRoundState({
      equippedTitle: 'indomitable_smith',
      gold: 116,
      fragments: { ...createInitialState().fragments, refined_iron: 1 },
    })
    expect(canSkip(state)).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────
// executeSkip
// ────────────────────────────────────────────────────────────────

describe('executeSkip', () => {
  it('canSkip false이면 에러', () => {
    const state = createInitialState()
    expect(() => executeSkip(state)).toThrow()
  })

  it('잔해의 수집가: +5로 점프, refined_iron 1개 차감, gold 100 차감', () => {
    const state = inRoundState({
      equippedTitle: 'scavenger',
      gold: 200,
      fragments: { ...createInitialState().fragments, refined_iron: 3 },
    })
    const next = executeSkip(state)
    expect(next.currentLevel).toBe(5)
    expect(next.fragments.refined_iron).toBe(2)
    expect(next.gold).toBe(100)
  })

  it('peakLevel이 목표 레벨로 업데이트됨', () => {
    const state = inRoundState({
      equippedTitle: 'indomitable_smith',
      gold: 200,
      fragments: { ...createInitialState().fragments, refined_iron: 1 },
    })
    const next = executeSkip(state)
    expect(next.currentRound!.peakLevel).toBe(7)
  })

  it('전설의 대장장이: +25, 조각/골드 차감 없음', () => {
    const state = inRoundState({ equippedTitle: 'legend_smith' })
    const origFrags = { ...state.fragments }
    const next = executeSkip(state)
    expect(next.currentLevel).toBe(25)
    expect(next.gold).toBe(state.gold)
    expect(next.fragments).toEqual(origFrags)
  })

  it('불변 — 원본 state 변경 없음', () => {
    const state = inRoundState({
      equippedTitle: 'scavenger',
      gold: 200,
      fragments: { ...createInitialState().fragments, refined_iron: 2 },
    })
    executeSkip(state)
    expect(state.currentLevel).toBe(0)
    expect(state.fragments.refined_iron).toBe(2)
  })

  it('검성의 대장장이: +8, enchanted_iron 1개 차감', () => {
    const state = inRoundState({
      equippedTitle: 'sword_saint',
      fragments: { ...createInitialState().fragments, enchanted_iron: 2 },
    })
    const next = executeSkip(state)
    expect(next.currentLevel).toBe(8)
    expect(next.fragments.enchanted_iron).toBe(1)
  })
})
