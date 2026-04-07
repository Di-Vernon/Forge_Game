/**
 * game/titles.ts
 * 칭호 획득 조건 체크. React에 의존하지 않는 순수 함수.
 *
 * 칭호 효과 적용은 각 도메인 모듈에서 처리:
 * - 초심자의 행운 (beginners_luck): fragments.ts
 * - 잔해의 수집가 (scavenger): fragments.ts
 * - 불굴의 대장장이 (indomitable_smith): engine.ts
 * - 검성의 대장장이 (sword_saint): engine.ts
 * - 흥정의 달인 (bargain_master): economy.ts
 * - 달인 대장장이 (master_smith): engine.ts
 * - 재련의 정점 (refine_peak): engine.ts (Step 4에서 구현)
 */

import type { GameState, TitleId } from '../types'

// ────────────────────────────────────────────────────────────────
// 조건 체크 함수들
// ────────────────────────────────────────────────────────────────

/**
 * 개별 칭호의 획득 조건이 충족됐는지 확인.
 *
 * @param id    - 칭호 ID
 * @param state - 현재 게임 상태
 */
export function isTitleConditionMet(id: TitleId, state: GameState): boolean {
  switch (id) {
    case 'beginners_luck':
      // 첫 파괴 경험
      return state.destroyCount >= 1

    case 'bargain_master':
      // 15회 판매
      return state.sellCount >= 15

    case 'scavenger':
      // 조각 5종 보유 또는 누적 20개 획득
      return (
        state.fragTypesEverOwned.length >= 5 ||
        state.totalFragsAcquired >= 20
      )

    case 'indomitable_smith':
      // +8 이상에서 15회 파괴
      return state.destroyCountHigh >= 15

    case 'master_smith':
      // +18 이상 첫 제작 (완료 라운드 기록 또는 현재 진행 중인 라운드 포함)
      return (
        state.rounds.some((r) => r.peakLevel >= 18) ||
        (state.currentRound !== null && state.currentRound.peakLevel >= 18)
      )

    case 'refine_peak':
      // 조합소에서 검 3회 제작
      return state.craftCountCombine >= 3

    case 'sword_saint':
      // 백야(+17) 최초 제작
      return state.baekYaCrafted

    case 'legend_smith':
      // +25 제작
      return (
        state.rounds.some((r) => r.peakLevel === 25) ||
        (state.currentRound !== null && state.currentRound.peakLevel === 25)
      )

    case 'mythic_tale': {
      // +1~+25 전부 보관 (이스터에그)
      const allLevels = Array.from({ length: 25 }, (_, i) => i + 1)
      return allLevels.every((level) => state.storage.includes(level))
    }
  }
}

/**
 * 현재 게임 상태에서 새로 획득해야 할 칭호 ID 목록 반환.
 * 이미 보유한 칭호는 제외.
 */
export function getNewlyUnlockedTitles(state: GameState): TitleId[] {
  const allTitleIds: TitleId[] = [
    'beginners_luck',
    'bargain_master',
    'scavenger',
    'indomitable_smith',
    'master_smith',
    'refine_peak',
    'sword_saint',
    'legend_smith',
    'mythic_tale',
  ]

  return allTitleIds.filter(
    (id) =>
      !state.unlockedTitles.includes(id) &&
      isTitleConditionMet(id, state)
  )
}

/**
 * 칭호를 보유 목록에 추가한 새 상태 반환 (불변).
 * 이미 보유한 칭호면 그대로 반환.
 */
export function unlockTitle(state: GameState, id: TitleId): GameState {
  if (state.unlockedTitles.includes(id)) return state
  return {
    ...state,
    unlockedTitles: [...state.unlockedTitles, id],
  }
}

/**
 * 여러 칭호를 한번에 해금. getNewlyUnlockedTitles 결과를 받아서 쓸 것.
 */
export function unlockTitles(state: GameState, ids: TitleId[]): GameState {
  return ids.reduce((s, id) => unlockTitle(s, id), state)
}
