/**
 * game/fragments.ts
 * 조각 드랍 로직. React에 의존하지 않는 순수 함수.
 *
 * 5단계 판정:
 * 1) 드랍 테이블 확인 → 빈 배열이면 [] 반환
 * 2) 드랍 여부: beginners_luck/scavenger → 100%, 그 외 rng() < dropBaseChance
 * 3) 가중 랜덤 조각 선택 (rng 호출)
 * 4) 수량: rng() < 0.80 → 1개, 그 외 2개
 * 5) scavenger ×2 배수; sword_saint는 swordmaster 50% 추가 드랍 (rng 4회차)
 *
 * level 0, 1, 25: 드랍 테이블이 비어있어 항상 [] 반환
 */

import configJson from '../data/config.json'
import type { FragmentId, FragmentInventory, TitleId } from '../types'

// ────────────────────────────────────────────────────────────────
// 내부 타입
// ────────────────────────────────────────────────────────────────

interface DropEntry {
  fragmentId: string
  weight: number
}

interface DropTableEntry {
  level: number
  drops: DropEntry[]
}

interface TitleProtectionEntry {
  chance: number
  fragmentDropChance?: number
}

// ────────────────────────────────────────────────────────────────
// config 접근
// ────────────────────────────────────────────────────────────────

const dropTable = configJson.dropTable as DropTableEntry[]
const dropBaseChance = configJson.dropBaseChance as number
const fragmentQuantityChance = configJson.fragmentQuantityChance as { single: number; double: number }
const titleProtection = configJson.titleProtection as Record<string, TitleProtectionEntry>

// ────────────────────────────────────────────────────────────────
// 공개 타입
// ────────────────────────────────────────────────────────────────

export interface FragmentDropResult {
  fragmentId: FragmentId
  count: number
}

// ────────────────────────────────────────────────────────────────
// 내부 헬퍼
// ────────────────────────────────────────────────────────────────

function getDropEntries(level: number): DropEntry[] {
  const entry = dropTable.find((t) => t.level === level)
  return entry ? entry.drops : []
}

function pickWeighted(drops: DropEntry[], rng: () => number): FragmentId | null {
  if (drops.length === 0) return null

  const totalWeight = drops.reduce((sum, d) => sum + d.weight, 0)
  const r = rng() * totalWeight
  let cumulative = 0
  for (const entry of drops) {
    cumulative += entry.weight
    if (r < cumulative) return entry.fragmentId as FragmentId
  }
  return drops[drops.length - 1].fragmentId as FragmentId
}

// ────────────────────────────────────────────────────────────────
// 공개 함수
// ────────────────────────────────────────────────────────────────

/**
 * 조각 드랍을 시도하고 결과 배열을 반환.
 * 드랍 없으면 빈 배열 [].
 *
 * rng 호출 순서:
 * 1회차: 드랍 여부 판정 (beginners_luck/scavenger 시 스킵)
 * 2회차: 가중 랜덤 조각 선택
 * 3회차: 수량 판정 (1 or 2)
 * 4회차: sword_saint 검성의 파편 추가 드랍 판정 (드랍 성공 시에만)
 *
 * @param swordLevel    - 파괴된 검의 레벨
 * @param equippedTitle - 현재 장착 칭호
 * @param rng           - 테스트 주입용 난수 함수 (기본: Math.random)
 */
export function rollFragmentDrop(
  swordLevel: number,
  equippedTitle: TitleId | null,
  rng: () => number = Math.random
): FragmentDropResult[] {
  // 1단계: 드랍 테이블 확인
  const drops = getDropEntries(swordLevel)
  if (drops.length === 0) return []

  // 2단계: 드랍 여부 판정
  const autoPass = equippedTitle === 'beginners_luck' || equippedTitle === 'scavenger'
  if (!autoPass && rng() >= dropBaseChance) return []

  // 3단계: 가중 랜덤 조각 선택
  const fragmentId = pickWeighted(drops, rng)
  if (fragmentId === null) return []

  // 4단계: 수량
  const baseCount = rng() < fragmentQuantityChance.single ? 1 : 2

  // 5단계: scavenger ×2 배수
  const finalCount = equippedTitle === 'scavenger' ? baseCount * 2 : baseCount
  const results: FragmentDropResult[] = [{ fragmentId, count: finalCount }]

  // 5단계: sword_saint 검성의 파편 추가 드랍
  if (equippedTitle === 'sword_saint') {
    const cfg = titleProtection['sword_saint']
    const dropChance = cfg?.fragmentDropChance ?? 0
    if (dropChance > 0 && rng() < dropChance) {
      results.push({ fragmentId: 'swordmaster', count: 1 })
    }
  }

  return results
}

/**
 * 인벤토리에 조각 하나를 추가한 새 인벤토리 반환 (불변).
 */
export function addFragment(
  inventory: FragmentInventory,
  fragmentId: FragmentId
): FragmentInventory {
  return {
    ...inventory,
    [fragmentId]: inventory[fragmentId] + 1,
  }
}

/**
 * 인벤토리에서 조각 n개를 차감한 새 인벤토리 반환 (불변).
 *
 * @throws 보유 수량이 부족하면 에러
 */
export function removeFragments(
  inventory: FragmentInventory,
  fragmentId: FragmentId,
  amount: number
): FragmentInventory {
  const current = inventory[fragmentId]
  if (current < amount) {
    throw new Error(`조각 부족: ${fragmentId} 보유 ${current}개, 필요 ${amount}개`)
  }
  return {
    ...inventory,
    [fragmentId]: current - amount,
  }
}

/**
 * 빈 조각 인벤토리 생성.
 */
export function createEmptyInventory(): FragmentInventory {
  return {
    rusty_iron: 0,
    refined_iron: 0,
    enchanted_iron: 0,
    moonlight: 0,
    unknown_mineral: 0,
    spirit: 0,
    swordmaster: 0,
    twisted_mana: 0,
  }
}
