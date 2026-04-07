import { describe, it, expect } from 'vitest'
import { getMaterialRequirements, canAffordMaterials, deductMaterials } from '../materials'
import { createInitialState } from '../storage'
import type { GameState } from '../../types'

function baseState(): GameState {
  return createInitialState()
}

// ────────────────────────────────────────────────────────────────
// getMaterialRequirements
// ────────────────────────────────────────────────────────────────

describe('getMaterialRequirements', () => {
  it('level 17 (백야): +12 ×1', () => {
    const reqs = getMaterialRequirements(17)
    expect(reqs).toEqual([{ level: 12, count: 1 }])
  })

  it('level 19 (억겁의 사선): +12 ×2', () => {
    const reqs = getMaterialRequirements(19)
    expect(reqs).toEqual([{ level: 12, count: 2 }])
  })

  it('level 25 (여명): +16 ×2 + +12 ×1', () => {
    const reqs = getMaterialRequirements(25)
    expect(reqs).toEqual([
      { level: 16, count: 2 },
      { level: 12, count: 1 },
    ])
  })

  it('level 0~16: 재료 없음 (빈 배열)', () => {
    for (let i = 0; i <= 16; i++) {
      expect(getMaterialRequirements(i)).toEqual([])
    }
  })
})

// ────────────────────────────────────────────────────────────────
// canAffordMaterials
// ────────────────────────────────────────────────────────────────

describe('canAffordMaterials', () => {
  it('재료 없는 레벨 (0~16): 항상 true', () => {
    const state = baseState()
    for (let i = 0; i <= 16; i++) {
      expect(canAffordMaterials(state, i)).toBe(true)
    }
  })

  it('level 17: storage에 +12 없으면 false', () => {
    const state = baseState()
    expect(canAffordMaterials(state, 17)).toBe(false)
  })

  it('level 17: storage에 +12 있으면 true', () => {
    const state = { ...baseState(), storage: [12] }
    expect(canAffordMaterials(state, 17)).toBe(true)
  })

  it('level 19 (+12 ×2): +12 하나만 있으면 false', () => {
    const state = { ...baseState(), storage: [12] }
    expect(canAffordMaterials(state, 19)).toBe(false)
  })

  it('level 19 (+12 ×2): +12 두 개 있으면 true', () => {
    const state = { ...baseState(), storage: [12, 12] }
    expect(canAffordMaterials(state, 19)).toBe(true)
  })

  it('level 25 (+16 ×2 + +12 ×1): 모두 있으면 true', () => {
    const state = { ...baseState(), storage: [16, 16, 12] }
    expect(canAffordMaterials(state, 25)).toBe(true)
  })

  it('level 25: +16 하나 부족하면 false', () => {
    const state = { ...baseState(), storage: [16, 12] }
    expect(canAffordMaterials(state, 25)).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────────
// deductMaterials
// ────────────────────────────────────────────────────────────────

describe('deductMaterials', () => {
  it('재료 없는 레벨: state 그대로 반환', () => {
    const state = baseState()
    const result = deductMaterials(state, 5)
    expect(result.storage).toEqual([])
  })

  it('level 17: +12 제거', () => {
    const state = { ...baseState(), storage: [12, 10, 8] }
    const result = deductMaterials(state, 17)
    expect(result.storage).not.toContain(12)
    expect(result.storage).toContain(10)
    expect(result.storage).toContain(8)
  })

  it('level 19: +12 두 개 제거', () => {
    const state = { ...baseState(), storage: [12, 12, 8] }
    const result = deductMaterials(state, 19)
    expect(result.storage.filter((l) => l === 12)).toHaveLength(0)
    expect(result.storage).toContain(8)
  })

  it('level 25: +16 두 개 + +12 하나 제거', () => {
    const state = { ...baseState(), storage: [16, 16, 12, 10] }
    const result = deductMaterials(state, 25)
    expect(result.storage.filter((l) => l === 16)).toHaveLength(0)
    expect(result.storage.filter((l) => l === 12)).toHaveLength(0)
    expect(result.storage).toContain(10)
  })

  it('불변 — 원본 storage 변경 없음', () => {
    const storage = [12, 10]
    const state = { ...baseState(), storage }
    deductMaterials(state, 17)
    expect(state.storage).toEqual([12, 10])
  })

  it('재료 부족 시 에러', () => {
    const state = baseState()
    expect(() => deductMaterials(state, 17)).toThrow()
  })
})
