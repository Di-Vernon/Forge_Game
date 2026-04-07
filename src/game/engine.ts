/**
 * game/engine.ts
 * 강화 판정 로직. React에 의존하지 않는 순수 함수.
 *
 * 강화 흐름:
 * 1. 최종 성공률 계산 (기본 확률 + 달인 대장장이 보너스)
 * 2. Math.random() < finalRate 로 성공/실패 판정
 * 3. 실패 시:
 *    a. 불굴의 대장장이 장착 → 35% 확률로 보호 (레벨 유지)
 *    b. 검성의 대장장이 장착 → 60% 확률로 보호 (레벨 유지)
 *    c. 그 외 → 파괴 (+0 리셋)
 * 4. Near-miss 플래그: 실패 && fromLevel >= 15 이면 true (연출 전용)
 */

import configJson from '../data/config.json'
import type { ForgeOutcome, TitleId } from '../types'

// ────────────────────────────────────────────────────────────────
// 내부 타입
// ────────────────────────────────────────────────────────────────

interface RateEntry {
  from: number
  to: number
  rate: number
  nearMiss: boolean
}

interface TitleProtectionEntry {
  chance: number
  fragmentDropChance?: number
}

// ────────────────────────────────────────────────────────────────
// config 접근
// ────────────────────────────────────────────────────────────────

const upgradeSuccessRates = configJson.upgradeSuccessRates as RateEntry[]
const titleProtection = configJson.titleProtection as Record<string, TitleProtectionEntry>
const masterSmithBonus = configJson.masterSmithBonusRate as number

// ────────────────────────────────────────────────────────────────
// 공개 함수
// ────────────────────────────────────────────────────────────────

/**
 * 최종 강화 성공률 반환.
 * 달인 대장장이 칭호 장착 시 보너스 적용, 상한 1.0 클램프.
 *
 * @param fromLevel - 현재 검 레벨 (0~24)
 * @param equippedTitle - 현재 장착 칭호
 */
export function getSuccessRate(fromLevel: number, equippedTitle: TitleId | null): number {
  const entry = upgradeSuccessRates.find((r) => r.from === fromLevel)
  if (!entry) throw new Error(`강화 확률 미설정 레벨: ${fromLevel}`)

  let rate = entry.rate
  if (equippedTitle === 'master_smith') {
    rate = Math.min(1, rate + masterSmithBonus)
  }
  return rate
}

/**
 * 강화 시도 메인 함수.
 *
 * 주의: rng는 최대 2회 호출됨.
 * - 1회차: 성공/실패 판정
 * - 2회차: 보호 칭호 발동 판정 (불굴/검성)
 *
 * @param currentLevel  - 현재 검 레벨 (0~24)
 * @param equippedTitle - 현재 장착 칭호
 * @param rng           - 테스트 주입용 난수 함수 (기본: Math.random)
 */
export function attemptForge(
  currentLevel: number,
  equippedTitle: TitleId | null,
  rng: () => number = Math.random
): ForgeOutcome {
  if (currentLevel < 0 || currentLevel >= 25) {
    throw new Error(`강화 불가 레벨: ${currentLevel}`)
  }

  const finalRate = getSuccessRate(currentLevel, equippedTitle)
  const isSuccess = rng() < finalRate

  if (isSuccess) {
    return {
      result: 'success',
      isNearMiss: false,
      destroyed: false,
      protectionTriggered: false,
      protectionSource: null,
      newLevel: currentLevel + 1,
    }
  }

  // ── 실패 경로 ──────────────────────────────────────────────────

  // Near-miss: 판정에 영향 없음, 연출 플래그만
  const isNearMiss = currentLevel >= 15

  // 칭호 보호 판정
  const protectionTitleIds: TitleId[] = ['indomitable_smith', 'sword_saint']
  if (equippedTitle !== null && protectionTitleIds.includes(equippedTitle)) {
    const cfg = titleProtection[equippedTitle]
    if (cfg && rng() < cfg.chance) {
      // 보호 발동 — 레벨 유지
      return {
        result: 'fail',
        isNearMiss,
        destroyed: false,
        protectionTriggered: true,
        protectionSource: equippedTitle,
        newLevel: currentLevel,
      }
    }
  }

  // 파괴
  return {
    result: 'fail',
    isNearMiss,
    destroyed: true,
    protectionTriggered: false,
    protectionSource: null,
    newLevel: 0, // destroyed=true일 때 이 값은 무의미
  }
}
