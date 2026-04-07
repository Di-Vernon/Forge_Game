/**
 * game/economy.ts
 * 비용/판매가 계산, 골드 관리. React에 의존하지 않는 순수 함수.
 */

import swordsData from '../data/swords.json'
import configJson from '../data/config.json'
import type { TitleId } from '../types'

// ────────────────────────────────────────────────────────────────
// 내부 헬퍼
// ────────────────────────────────────────────────────────────────

function getSwordData(level: number) {
  const sword = swordsData.find((s) => s.level === level)
  if (!sword) throw new Error(`검 데이터 없음: level ${level}`)
  return sword
}

const upgradeCosts = configJson.upgradeCosts as Record<string, number>

// ────────────────────────────────────────────────────────────────
// 공개 함수
// ────────────────────────────────────────────────────────────────

/**
 * 강화 비용(골드) 반환. config.json.upgradeCosts에서 읽음.
 * 모든 레벨(0~24)에 골드 비용이 존재함.
 *
 * @param level - 강화 출발 레벨 (0~24)
 */
export function getUpgradeCost(level: number): number {
  const cost = upgradeCosts[String(level)]
  if (cost === undefined) throw new Error(`강화 비용 미설정 레벨: ${level}`)
  return cost
}

/**
 * 해당 레벨의 검을 판매할 수 있는지 여부.
 * +25 여명은 판매 불가.
 */
export function canSell(level: number): boolean {
  return level !== 25
}

/**
 * 판매가 반환. 흥정의 달인 칭호 장착 시 +50% 적용.
 *
 * @throws +25 여명에 대해 호출하면 에러 발생 (절대 골드 지급 금지)
 */
export function getSellPrice(level: number, equippedTitle: TitleId | null): number {
  if (!canSell(level)) {
    throw new Error('+25 여명은 판매 불가. canSell() 확인 후 호출할 것.')
  }

  const sword = getSwordData(level)
  // canSell 통과 시 sellPrice는 반드시 number
  let price = sword.sellPrice as number

  if (equippedTitle === 'bargain_master') {
    price = Math.floor(price * 1.5)
  }

  return price
}

/**
 * 현재 골드로 해당 레벨 강화가 가능한지 여부.
 * 재료 검 조건 체크는 별도 (Step 4에서 구현).
 */
export function canAffordUpgrade(gold: number, level: number): boolean {
  const cost = getUpgradeCost(level)
  return gold >= cost
}

/**
 * 강화 비용을 골드에서 차감한 결과 반환.
 *
 * @throws 골드 부족이면 에러
 */
export function deductUpgradeCost(gold: number, level: number): number {
  const cost = getUpgradeCost(level)
  if (gold < cost) {
    throw new Error(`골드 부족: 보유 ${gold}G, 필요 ${cost}G`)
  }
  return gold - cost
}

/**
 * 판매 골드를 현재 골드에 더한 결과 반환.
 *
 * @throws +25 여명 판매 시도 시 에러
 */
export function addSellProceeds(
  gold: number,
  level: number,
  equippedTitle: TitleId | null
): number {
  const price = getSellPrice(level, equippedTitle)
  return gold + price
}
