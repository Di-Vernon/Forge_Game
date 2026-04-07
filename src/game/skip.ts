/**
 * game/skip.ts
 * 건너뛰기 시스템. 특정 칭호 장착 시 골드+조각 지불 → 즉시 해당 레벨 검 획득.
 * currentLevel === 0일 때만 사용 가능. 사용 후 레벨이 올라가므로 자연히 1회로 제한됨.
 */

import configJson from '../data/config.json'
import type { GameState, TitleId, FragmentId } from '../types'

// ────────────────────────────────────────────────────────────────
// 타입 & 상수
// ────────────────────────────────────────────────────────────────

interface SkipCostCfg {
  targetLevel: number
  gold: number | null
  fragmentId: string | null
  fragmentCount: number
}

export interface SkipInfo {
  titleId: TitleId
  targetLevel: number
  gold: number | null        // null = TBD (시뮬 확정 예정), 0 = 무료
  fragmentId: FragmentId | null
  fragmentCount: number
}

const skipCostsRaw = configJson.skipCosts as Record<string, SkipCostCfg>

// ────────────────────────────────────────────────────────────────
// 공개 함수
// ────────────────────────────────────────────────────────────────

/**
 * 칭호에 해당하는 건너뛰기 정보를 반환.
 * 건너뛰기 옵션이 없는 칭호(beginners_luck, bargain_master, mythic_tale)이면 null.
 */
export function getSkipInfo(titleId: TitleId | null): SkipInfo | null {
  if (!titleId) return null
  const cfg = skipCostsRaw[titleId]
  if (!cfg) return null
  return {
    titleId,
    targetLevel: cfg.targetLevel,
    gold: cfg.gold,
    fragmentId: cfg.fragmentId as FragmentId | null,
    fragmentCount: cfg.fragmentCount,
  }
}

/**
 * 현재 state에서 건너뛰기가 가능한지 반환.
 *
 * 조건:
 * 1. 라운드 진행 중 (currentRound !== null)
 * 2. 현재 레벨 = +0
 * 3. 장착 칭호에 건너뛰기 정보 존재
 * 4. 골드 충분 (gold가 null이 아닐 때)
 * 5. 필요 조각 보유
 */
export function canSkip(state: GameState): boolean {
  if (state.currentRound === null || state.currentLevel === null) return false
  if (state.currentLevel !== 0) return false

  const info = getSkipInfo(state.equippedTitle)
  if (!info) return false

  if (info.gold !== null && state.gold < info.gold) return false

  if (info.fragmentId !== null && info.fragmentCount > 0) {
    if (state.fragments[info.fragmentId] < info.fragmentCount) return false
  }

  return true
}

/**
 * 건너뛰기 실행. 새로운 GameState를 반환.
 * canSkip(state) === false이면 에러를 던진다.
 */
export function executeSkip(state: GameState): GameState {
  if (!canSkip(state)) throw new Error('executeSkip: canSkip 조건 미충족')

  const info = getSkipInfo(state.equippedTitle)!

  // 골드 차감
  const newGold = info.gold !== null && info.gold > 0
    ? state.gold - info.gold
    : state.gold

  // 조각 차감
  const newFragments = info.fragmentId !== null && info.fragmentCount > 0
    ? {
        ...state.fragments,
        [info.fragmentId]: state.fragments[info.fragmentId] - info.fragmentCount,
      }
    : state.fragments

  const skipGoldCost = info.gold !== null && info.gold > 0 ? info.gold : 0

  return {
    ...state,
    currentLevel: info.targetLevel,
    gold: newGold,
    fragments: newFragments,
    currentRound: {
      ...state.currentRound!,
      peakLevel: Math.max(state.currentRound!.peakLevel, info.targetLevel),
      totalSpent: state.currentRound!.totalSpent + skipGoldCost,
    },
  }
}
