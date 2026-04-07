import { describe, it, expect, beforeEach, vi } from 'vitest'
import { save, load, reset, createInitialState, SAVE_VERSION } from '../storage'
import type { GameState } from '../../types'

// ────────────────────────────────────────────────────────────────
// localStorage 목 (Node 환경에 localStorage 없음)
// ────────────────────────────────────────────────────────────────

const makeLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

const localStorageMock = makeLocalStorageMock()

beforeEach(() => {
  localStorageMock.clear()
  vi.stubGlobal('localStorage', localStorageMock)
})

// ────────────────────────────────────────────────────────────────
// createInitialState
// ────────────────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('초기 골드: 2000G', () => {
    expect(createInitialState().gold).toBe(2000)
  })

  it('칭호/라운드/보관함 모두 비어있음', () => {
    const state = createInitialState()
    expect(state.unlockedTitles).toHaveLength(0)
    expect(state.rounds).toHaveLength(0)
    expect(state.storage).toHaveLength(0)
    expect(state.currentRound).toBeNull()
    expect(state.currentLevel).toBeNull()
  })

  it('버전이 SAVE_VERSION과 일치', () => {
    expect(createInitialState().version).toBe(SAVE_VERSION)
  })

  it('조각 인벤토리 전부 0', () => {
    const { fragments } = createInitialState()
    expect(Object.values(fragments).every((v) => v === 0)).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────
// save / load
// ────────────────────────────────────────────────────────────────

describe('save & load', () => {
  it('저장 없음: load → null', () => {
    expect(load()).toBeNull()
  })

  it('save 후 load → 원본과 동일', () => {
    const state = createInitialState()
    save(state)
    const loaded = load()
    expect(loaded).not.toBeNull()
    expect(loaded!.gold).toBe(state.gold)
    expect(loaded!.version).toBe(state.version)
  })

  it('변경된 상태도 정확히 복원', () => {
    const state: GameState = {
      ...createInitialState(),
      gold: 1234,
      destroyCount: 7,
      sellCount: 3,
      unlockedTitles: ['beginners_luck'],
      storage: [10, 15],
      scrolls: 2,
    }
    save(state)
    const loaded = load()!
    expect(loaded.gold).toBe(1234)
    expect(loaded.destroyCount).toBe(7)
    expect(loaded.unlockedTitles).toContain('beginners_luck')
    expect(loaded.storage).toEqual([10, 15])
    expect(loaded.scrolls).toBe(2)
  })

  it('세이브 덮어쓰기: 마지막 상태만 남음', () => {
    save({ ...createInitialState(), gold: 100 })
    save({ ...createInitialState(), gold: 999 })
    expect(load()!.gold).toBe(999)
  })
})

// ────────────────────────────────────────────────────────────────
// 버전 불일치
// ────────────────────────────────────────────────────────────────

describe('load — 버전 불일치', () => {
  it('다른 버전이면 null 반환', () => {
    const corrupt = { ...createInitialState(), version: 99 }
    localStorageMock.setItem('forge_game_save', JSON.stringify(corrupt))
    expect(load()).toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────
// 손상된 데이터
// ────────────────────────────────────────────────────────────────

describe('load — 손상된 데이터', () => {
  it('JSON 파싱 불가 데이터: null 반환', () => {
    localStorageMock.setItem('forge_game_save', 'not-valid-json{{')
    expect(load()).toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────
// reset
// ────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('리셋 후 load → null', () => {
    save(createInitialState())
    reset()
    expect(load()).toBeNull()
  })

  it('초기 상태 반환', () => {
    const state = reset()
    expect(state.gold).toBe(2000)
    expect(state.version).toBe(SAVE_VERSION)
  })
})
