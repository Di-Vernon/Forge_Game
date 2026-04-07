/**
 * game/storage.ts
 * localStorage 추상화. save/load/reset 세 가지 인터페이스만 노출.
 *
 * 직접 localStorage 접근 금지 — 반드시 이 모듈을 통할 것.
 * 나중에 서버 저장으로 교체 시 이 파일만 수정하면 됨.
 */

import type { GameState, FragmentInventory } from '../types'
import { createEmptyInventory } from './fragments'

// ────────────────────────────────────────────────────────────────
// 상수
// ────────────────────────────────────────────────────────────────

const SAVE_KEY = 'forge_game_save'
export const SAVE_VERSION = 1

// ────────────────────────────────────────────────────────────────
// 초기 상태
// ────────────────────────────────────────────────────────────────

import configJson from '../data/config.json'

/**
 * 게임 초기 상태 생성.
 * 새 게임 시작 또는 reset() 후 사용.
 */
export function createInitialState(): GameState {
  return {
    gold: configJson.initialGold,
    currentLevel: null,
    scrolls: 0,
    fragments: createEmptyInventory(),
    storage: [],
    unlockedTitles: [],
    equippedTitle: null,
    destroyCount: 0,
    destroyCountHigh: 0,
    sellCount: 0,
    craftCount: 0,
    craftCountCombine: 0,
    totalFragsAcquired: 0,
    fragTypesEverOwned: [],
    baekYaCrafted: false,
    rounds: [],
    currentRound: null,
    version: SAVE_VERSION,
  }
}

// ────────────────────────────────────────────────────────────────
// 공개 함수
// ────────────────────────────────────────────────────────────────

/**
 * 게임 상태를 localStorage에 저장.
 */
export function save(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

/**
 * localStorage에서 게임 상태를 불러옴.
 * 저장된 데이터가 없거나 버전 불일치 시 null 반환.
 *
 * 버전 불일치는 마이그레이션 로직 추가 예정 — 현재는 null 반환으로 처리.
 */
export function load(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY)
  if (raw === null) return null

  try {
    const parsed = JSON.parse(raw) as GameState
    if (parsed.version !== SAVE_VERSION) {
      console.warn(`세이브 버전 불일치: 저장=${parsed.version}, 현재=${SAVE_VERSION}. 초기화.`)
      return null
    }
    // fragments 필드 보장 (구버전 세이브 방어)
    const fragments: FragmentInventory = {
      ...createEmptyInventory(),
      ...parsed.fragments,
    }
    return { ...parsed, fragments }
  } catch {
    console.warn('세이브 데이터 파싱 실패. 초기화.')
    return null
  }
}

/**
 * 저장 데이터를 삭제하고 초기 상태 반환.
 */
export function reset(): GameState {
  localStorage.removeItem(SAVE_KEY)
  return createInitialState()
}
