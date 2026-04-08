import { useState, useEffect, useCallback, useRef } from 'react'
import type { GameState, ForgeOutcome, Round, FragmentId, TitleId } from '../types'
import { getForgeEffectParams } from '../effects/ForgeEffects'
import { load, save, createInitialState } from '../game/storage'
import { attemptForge } from '../game/engine'
import { getUpgradeCost, getSellPrice, canAffordUpgrade, canSell } from '../game/economy'
import { addFragment, removeFragments, type FragmentDropResult } from '../game/fragments'
import { canAffordMaterials, deductMaterials } from '../game/materials'
import { canSkip, executeSkip } from '../game/skip'
import { getNewlyUnlockedTitles, unlockTitles } from '../game/titles'
import configJson from '../data/config.json'

// 도감: 레벨을 발견 목록에 추가
function addDiscovered(existing: number[], level: number): number[] {
  if (existing.includes(level)) return existing
  return [...existing, level].sort((a, b) => a - b)
}

// 도감: 0~target까지 모든 레벨을 발견 목록에 추가
function addDiscoveredRange(existing: number[], target: number): number[] {
  const set = new Set(existing)
  for (let i = 0; i <= target; i++) set.add(i)
  if (set.size === existing.length) return existing
  return [...set].sort((a, b) => a - b)
}

// name이 null인 칭호(미정 슬롯)는 알림 제외
const NOTIFIABLE_TITLES = new Set<TitleId>(
  (Object.entries(configJson.titles) as [TitleId, { name: string | null }][])
    .filter(([, v]) => v.name !== null)
    .map(([id]) => id)
)

export type Screen = 'home' | 'forge' | 'destroy' | 'shop_craft' | 'storage' | 'dex'
export type ForgePhase = 'idle' | 'forging' | 'waiting_reveal' | 'success' | 'fail' | 'near_miss'

export interface UseGameStateReturn {
  state: GameState
  screen: Screen
  forgePhase: ForgePhase
  lastOutcome: ForgeOutcome | null
  pendingTitleUnlocks: TitleId[]
  actions: {
    startRound: () => void
    forge: () => void
    reveal: () => void
    sell: () => void
    storeCurrentSword: () => void
    useScroll: () => void
    pickFragment: (drops: FragmentDropResult[]) => void
    goHome: () => void
    goForge: () => void
    goShopCraft: () => void
    goStorage: () => void
    equipTitle: (id: TitleId | null) => void
    buyScroll: (count: number, totalPrice: number) => void
    craftScroll: (fragmentId: FragmentId, amount: number, yieldCount: number) => void
    craftSword: (level: number, materials: { fragmentId: FragmentId; amount: number }[]) => void
    skip: () => void
    goDex: () => void
    dismissTitleUnlock: () => void
  }
}

export function useGameState(): UseGameStateReturn {
  const [state, setState] = useState<GameState>(() => load() ?? createInitialState())
  const [screen, setScreen] = useState<Screen>('home')
  const [forgePhase, setForgePhase] = useState<ForgePhase>('idle')
  const [lastOutcome, setLastOutcome] = useState<ForgeOutcome | null>(null)
  const [pendingTitleUnlocks, setPendingTitleUnlocks] = useState<TitleId[]>([])

  // 이전 unlockedTitles 추적 — 새로 획득한 칭호만 알림
  const prevUnlockedRef = useRef<TitleId[]>(state.unlockedTitles)
  // waiting_reveal 단계에서 reveal()이 참조할 대기 중인 결과
  const pendingOutcomeRef = useRef<ForgeOutcome | null>(null)

  // 상태 변경 시 자동 저장
  useEffect(() => {
    save(state)
  }, [state])

  // 칭호 획득 감지 → pendingTitleUnlocks에 적재
  useEffect(() => {
    const prev = prevUnlockedRef.current
    const curr = state.unlockedTitles
    const newOnes = curr.filter((id) => !prev.includes(id))
    if (newOnes.length > 0) {
      const notifiable = newOnes.filter((id) => NOTIFIABLE_TITLES.has(id))
      if (notifiable.length > 0) {
        setPendingTitleUnlocks((p) => [...p, ...notifiable])
      }
    }
    prevUnlockedRef.current = curr
  }, [state.unlockedTitles])

  const startRound = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentLevel: 0,
      currentRound: {
        id: Date.now(),
        startedAt: Date.now(),
        endedAt: null,
        peakLevel: 0,
        endReason: null,
        totalSpent: 0,
        totalEarned: 0,
      },
    }))
    setScreen('forge')
    setLastOutcome(null)
  }, [])

  const forge = useCallback(() => {
    setState((prevState) => {
      // 이 함수 내에서는 최신 state를 사용해야 하므로 prevState 참조
      if (
        prevState.currentLevel === null ||
        prevState.currentRound === null ||
        forgePhase !== 'idle'
      ) return prevState

      const level = prevState.currentLevel
      if (level >= 25) return prevState

      const cost = getUpgradeCost(level)
      if (!canAffordUpgrade(prevState.gold, level)) return prevState
      if (!canAffordMaterials(prevState, level + 1)) return prevState

      // 판정은 즉시 수행 (순수 함수)
      const outcome = attemptForge(
        level,
        prevState.equippedTitle
      )

      // UI 상태 업데이트 (side effect — setState 밖에서 처리)
      // React 배치 업데이트를 활용해 setState 반환 후 처리
      setTimeout(() => {
        setLastOutcome(outcome)
        setForgePhase('forging')

        const fx = getForgeEffectParams(
          level,
          outcome.result === 'success',
          outcome.isNearMiss,
          outcome.destroyed,
        )

        setTimeout(() => {
          if (fx.revealMode) {
            // level >= 17 성공: 사용자가 탭해야 결과를 공개
            pendingOutcomeRef.current = outcome
            setForgePhase('waiting_reveal')
          } else {
            const phase: ForgePhase =
              outcome.result === 'success' ? 'success' :
              outcome.isNearMiss ? 'near_miss' : 'fail'

            setForgePhase(phase)

            if (outcome.destroyed) {
              setScreen('destroy')
            }

            setTimeout(() => setForgePhase('idle'), fx.resultHoldMs)
          }
        }, fx.flashDuration)
      }, 0)

      // 골드 차감
      const newGold = prevState.gold - cost
      const updatedRound: Round = {
        ...prevState.currentRound,
        totalSpent: prevState.currentRound.totalSpent + cost,
      }

      // 재료 차감 판정:
      // - 재련의 정점: 실패 시 +17 이상이면 재료 보존 (골드는 소모, 레벨 파괴)
      // - 검성의 대장장이: 보호 발동 시 재료 보존
      const preserveByRefinePeak =
        outcome.result === 'fail' &&
        prevState.equippedTitle === 'refine_peak' &&
        level >= 17
      const preserveBySwordSaint =
        outcome.protectionTriggered &&
        outcome.protectionSource === 'sword_saint'
      const preserveMaterials = preserveByRefinePeak || preserveBySwordSaint
      const stateAfterMaterials = preserveMaterials
        ? prevState
        : deductMaterials(prevState, level + 1)

      if (outcome.result === 'success') {
        const newLevel = outcome.newLevel
        const baekYaCrafted = prevState.baekYaCrafted || newLevel === 17
        const next: GameState = {
          ...stateAfterMaterials,
          currentLevel: newLevel,
          gold: newGold,
          craftCount: prevState.craftCount + 1,
          baekYaCrafted,
          discoveredLevels: addDiscovered(prevState.discoveredLevels, newLevel),
          currentRound: {
            ...updatedRound,
            peakLevel: Math.max(updatedRound.peakLevel, newLevel),
          },
        }
        const newTitles = getNewlyUnlockedTitles(next)
        return unlockTitles(next, newTitles)
      }

      if (outcome.protectionTriggered) {
        return {
          ...stateAfterMaterials,
          currentLevel: outcome.newLevel,
          gold: newGold,
          currentRound: updatedRound,
        }
      }

      // 파괴
      const destroyCountHigh =
        level >= 8
          ? prevState.destroyCountHigh + 1
          : prevState.destroyCountHigh
      const next: GameState = {
        ...stateAfterMaterials,
        gold: newGold,
        currentRound: updatedRound,
        destroyCount: prevState.destroyCount + 1,
        destroyCountHigh,
      }
      const newTitles = getNewlyUnlockedTitles(next)
      return unlockTitles(next, newTitles)
    })
  }, [forgePhase])

  // waiting_reveal 단계에서 사용자가 탭하면 실제 결과를 공개
  const reveal = useCallback(() => {
    const outcome = pendingOutcomeRef.current
    if (!outcome || forgePhase !== 'waiting_reveal') return
    pendingOutcomeRef.current = null

    if (outcome.result === 'success') {
      setForgePhase('success')
      setTimeout(() => setForgePhase('idle'), 280)
    } else {
      // 파괴 (level >= 15, non-near-miss)
      // App.tsx가 forgePhase='fail' + lastOutcome.destroyed 감지 → 그레이스케일 시작
      setForgePhase('fail')
      setTimeout(() => {
        setScreen('destroy')
        setForgePhase('idle')
      }, 900)
    }
  }, [forgePhase])

  const sell = useCallback(() => {
    setState((prev) => {
      if (prev.currentLevel === null || prev.currentRound === null) return prev
      if (!canSell(prev.currentLevel)) return prev

      const earned = getSellPrice(prev.currentLevel, prev.equippedTitle)
      const round: Round = {
        ...prev.currentRound,
        endedAt: Date.now(),
        endReason: 'sold',
        totalEarned: earned,
      }
      const next: GameState = {
        ...prev,
        gold: prev.gold + earned,
        currentLevel: null,
        currentRound: null,
        sellCount: prev.sellCount + 1,
        rounds: [...prev.rounds, round],
      }
      const newTitles = getNewlyUnlockedTitles(next)
      return unlockTitles(next, newTitles)
    })
    setScreen('home')
  }, [])

  const storeCurrentSword = useCallback(() => {
    setState((prev) => {
      if (prev.currentLevel === null || prev.currentRound === null) return prev

      const storedLevel = prev.currentLevel
      const round: Round = {
        ...prev.currentRound,
        endedAt: Date.now(),
        endReason: 'stored',
        totalEarned: 0,
      }
      const next: GameState = {
        ...prev,
        currentLevel: null,
        currentRound: null,
        storage: [...prev.storage, storedLevel],
        rounds: [...prev.rounds, round],
      }
      const newTitles = getNewlyUnlockedTitles(next)
      return unlockTitles(next, newTitles)
    })
    setScreen('home')
  }, [])

  // 복원 스크롤 사용 (DestroyScreen에서 호출)
  // 파괴 직전 레벨로 복원 — currentLevel은 이미 파괴 직전 레벨을 유지하고 있음
  const useScroll = useCallback(() => {
    setState((prev) => {
      if (prev.scrolls <= 0 || prev.currentLevel === null) return prev
      return {
        ...prev,
        scrolls: prev.scrolls - 1,
      }
    })
    setScreen('forge')
    setForgePhase('idle')
  }, [])

  // 조각 줍기 (DestroyScreen에서 호출)
  // drops: DestroyScreen이 rollFragmentDrop을 직접 호출해 결과를 미리 보여준 뒤 전달
  const pickFragment = useCallback((drops: FragmentDropResult[]) => {
    setState((prev) => {
      if (prev.currentRound === null) return prev

      const round: Round = {
        ...prev.currentRound,
        endedAt: Date.now(),
        endReason: 'destroyed',
        totalEarned: 0,
      }

      // 조각 인벤토리 업데이트
      let fragments = prev.fragments
      let totalNew = 0
      const newTypes: FragmentId[] = []
      for (const drop of drops) {
        for (let i = 0; i < drop.count; i++) {
          fragments = addFragment(fragments, drop.fragmentId)
        }
        totalNew += drop.count
        if (!newTypes.includes(drop.fragmentId)) newTypes.push(drop.fragmentId)
      }

      // fragTypesEverOwned 업데이트
      const newTypesEverOwned = [...prev.fragTypesEverOwned]
      for (const t of newTypes) {
        if (!newTypesEverOwned.includes(t)) newTypesEverOwned.push(t)
      }

      const next: GameState = {
        ...prev,
        currentLevel: null,
        currentRound: null,
        rounds: [...prev.rounds, round],
        fragments,
        totalFragsAcquired: prev.totalFragsAcquired + totalNew,
        fragTypesEverOwned: newTypesEverOwned,
      }
      const newTitles = getNewlyUnlockedTitles(next)
      return unlockTitles(next, newTitles)
    })
    setScreen('home')
  }, [])

  // 상점: 골드 차감 + 스크롤 추가
  const buyScroll = useCallback((count: number, totalPrice: number) => {
    setState((prev) => {
      if (prev.gold < totalPrice) return prev
      return { ...prev, gold: prev.gold - totalPrice, scrolls: prev.scrolls + count }
    })
  }, [])

  // 조합소: 조각 차감 + 스크롤 생성
  const craftScroll = useCallback((fragmentId: FragmentId, amount: number, yieldCount: number) => {
    setState((prev) => {
      if (prev.fragments[fragmentId] < amount) return prev
      return {
        ...prev,
        fragments: removeFragments(prev.fragments, fragmentId, amount),
        scrolls: prev.scrolls + yieldCount,
      }
    })
  }, [])

  // 조합소: 조각 차감 + 검 생성 + 강화소 이동
  const craftSword = useCallback((
    level: number,
    materials: { fragmentId: FragmentId; amount: number }[]
  ) => {
    setState((prev) => {
      if (prev.currentLevel !== null) return prev
      for (const mat of materials) {
        if (prev.fragments[mat.fragmentId] < mat.amount) return prev
      }
      let fragments = { ...prev.fragments }
      for (const mat of materials) {
        fragments = { ...fragments, [mat.fragmentId]: fragments[mat.fragmentId] - mat.amount }
      }
      const newRound: Round = {
        id: Date.now(),
        startedAt: Date.now(),
        endedAt: null,
        peakLevel: level,
        endReason: null,
        totalSpent: 0,
        totalEarned: 0,
      }
      const baekYaCrafted = prev.baekYaCrafted || level === 17
      const next: GameState = {
        ...prev,
        currentLevel: level,
        currentRound: newRound,
        fragments,
        craftCount: prev.craftCount + 1,
        craftCountCombine: prev.craftCountCombine + 1,
        baekYaCrafted,
        discoveredLevels: addDiscovered(prev.discoveredLevels, level),
      }
      const newTitles = getNewlyUnlockedTitles(next)
      return unlockTitles(next, newTitles)
    })
    // 제작 연출 후 강화소 이동
    setTimeout(() => setScreen('forge'), 1200)
  }, [])

  // 건너뛰기: canSkip 확인 후 executeSkip 실행
  const skip = useCallback(() => {
    setState((prev) => {
      if (!canSkip(prev)) return prev
      const next = executeSkip(prev)
      const withDex: GameState = {
        ...next,
        discoveredLevels: addDiscoveredRange(prev.discoveredLevels, next.currentLevel!),
      }
      const newTitles = getNewlyUnlockedTitles(withDex)
      return unlockTitles(withDex, newTitles)
    })
  }, [])

  const goHome = useCallback(() => setScreen('home'), [])
  const goForge = useCallback(() => setScreen('forge'), [])
  const goShopCraft = useCallback(() => setScreen('shop_craft'), [])
  const goStorage = useCallback(() => setScreen('storage'), [])
  const goDex = useCallback(() => setScreen('dex'), [])

  // 칭호 획득 알림 닫기 (순차 표시: slice(1))
  const dismissTitleUnlock = useCallback(() => {
    setPendingTitleUnlocks((p) => p.slice(1))
  }, [])

  // 라운드 진행 중에는 칭호 변경 불가 (재진입 케이스 포함)
  const equipTitle = useCallback((id: TitleId | null) => {
    setState((prev) => {
      if (prev.currentRound !== null) return prev
      return { ...prev, equippedTitle: id }
    })
  }, [])

  return {
    state,
    screen,
    forgePhase,
    lastOutcome,
    pendingTitleUnlocks,
    actions: {
      startRound, forge, reveal, sell, storeCurrentSword, useScroll, pickFragment,
      goHome, goForge, goShopCraft, goStorage, equipTitle,
      buyScroll, craftScroll, craftSword, skip, goDex, dismissTitleUnlock,
    },
  }
}
