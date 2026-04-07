/**
 * game/materials.ts
 * 재료 검 요구사항 확인 및 차감. React에 의존하지 않는 순수 함수.
 *
 * Block 4+ (+17 이상) 강화 시 하위 레벨 검을 재료로 소모.
 * 재료 검은 storage 배열에서 소모됨.
 */

import configJson from '../data/config.json'
import type { GameState } from '../types'

// ────────────────────────────────────────────────────────────────
// 내부 타입
// ────────────────────────────────────────────────────────────────

interface MaterialSword {
  level: number
  count: number
}

interface MaterialReq {
  swords: MaterialSword[]
}

// ────────────────────────────────────────────────────────────────
// config 접근
// ────────────────────────────────────────────────────────────────

const materialRequirements = configJson.materialRequirements as Record<string, MaterialReq>

// ────────────────────────────────────────────────────────────────
// 공개 타입
// ────────────────────────────────────────────────────────────────

export interface SwordMaterialRequirement {
  level: number
  count: number
}

// ────────────────────────────────────────────────────────────────
// 공개 함수
// ────────────────────────────────────────────────────────────────

/**
 * 해당 레벨 강화에 필요한 재료 검 목록 반환.
 * 재료 없으면 빈 배열 반환.
 *
 * @param targetLevel - 강화 목표 레벨 (강화 후 도달하는 레벨)
 */
export function getMaterialRequirements(targetLevel: number): SwordMaterialRequirement[] {
  const req = materialRequirements[String(targetLevel)]
  if (!req) return []
  return req.swords.map((s) => ({ level: s.level, count: s.count }))
}

/**
 * 현재 보관함(storage)에 해당 레벨 강화에 필요한 재료 검이 있는지 확인.
 *
 * @param state       - 현재 게임 상태 (storage 참조)
 * @param targetLevel - 강화 목표 레벨
 */
export function canAffordMaterials(state: GameState, targetLevel: number): boolean {
  const reqs = getMaterialRequirements(targetLevel)
  if (reqs.length === 0) return true

  // 복사본에서 하나씩 제거해가며 충족 여부 확인 (중복 레벨 처리)
  const storageCopy = [...state.storage]
  for (const mat of reqs) {
    let needed = mat.count
    for (let i = 0; i < storageCopy.length && needed > 0; i++) {
      if (storageCopy[i] === mat.level) {
        storageCopy.splice(i, 1)
        i--
        needed--
      }
    }
    if (needed > 0) return false
  }
  return true
}

/**
 * 강화에 필요한 재료 검을 storage에서 차감한 새 GameState 반환 (불변).
 * 재료 없는 레벨이면 state를 그대로 반환.
 *
 * @throws canAffordMaterials가 false인 상태에서 호출하면 에러
 */
export function deductMaterials(state: GameState, targetLevel: number): GameState {
  const reqs = getMaterialRequirements(targetLevel)
  if (reqs.length === 0) return state

  let storage = [...state.storage]
  for (const mat of reqs) {
    let remaining = mat.count
    const next: number[] = []
    for (const l of storage) {
      if (l === mat.level && remaining > 0) {
        remaining--
      } else {
        next.push(l)
      }
    }
    if (remaining > 0) {
      throw new Error(`재료 부족: +${mat.level} 검 ${mat.count}개 필요, 보관함에 부족`)
    }
    storage = next
  }

  return { ...state, storage }
}
