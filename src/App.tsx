import { useState, useRef, useEffect, useCallback } from 'react'
import { useGameState } from './hooks/useGameState'
import HomeScreen from './components/screens/HomeScreen'
import ForgeScreen from './components/screens/ForgeScreen'
import DestroyScreen from './components/screens/DestroyScreen'
import ShopCraftScreen from './components/screens/ShopCraftScreen'
import StorageScreen from './components/screens/StorageScreen'
import DexScreen from './components/screens/DexScreen'
import TitleUnlockModal from './components/ui/TitleUnlockModal'
import ParticleCanvas from './effects/ParticleCanvas'
import {
  burstSuccess,
  burstDestroy,
  burstCelebration,
  burstTitleUnlock,
  startLoop,
} from './effects/ParticleSystem'
import {
  createShakeState,
  addTrauma,
  updateShake,
  type ShakeState,
} from './effects/ScreenShake'
import type { ForgePhase } from './hooks/useGameState'

// 모션 감소 선호 여부 확인
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const { state, screen, forgePhase, lastOutcome, pendingTitleUnlocks, actions } = useGameState()
  const [bgmOn, setBgmOn] = useState(false)
  // 고단계 파괴 reveal 후 그레이스케일 상태
  const [grayscale, setGrayscale] = useState(false)

  // ── 화면 흔들림 ──────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const shakeRef     = useRef<ShakeState>(createShakeState())
  const shakeRafRef  = useRef<number | null>(null)
  const lastFrameRef = useRef<number>(0)

  const runShakeLoop = useCallback(() => {
    const now = performance.now()
    const delta = now - lastFrameRef.current
    lastFrameRef.current = now

    const [newState, ox, oy] = updateShake(shakeRef.current, delta)
    shakeRef.current = newState

    if (containerRef.current) {
      containerRef.current.style.transform =
        ox === 0 && oy === 0 ? '' : `translate(${ox}px, ${oy}px)`
    }

    if (newState.trauma > 0) {
      shakeRafRef.current = requestAnimationFrame(runShakeLoop)
    } else {
      shakeRafRef.current = null
      if (containerRef.current) containerRef.current.style.transform = ''
    }
  }, [])

  // 셰이크 트리거 — prefersReducedMotion 시 테두리 펄스로 대체
  function triggerShake(amount: number, isSuccess = false) {
    if (prefersReducedMotion) {
      const el = containerRef.current
      if (!el) return
      el.classList.remove('shake-feedback')
      el.style.setProperty('--shake-color', isSuccess ? '#ffd700' : '#ff4040')
      void el.offsetWidth               // reflow → animation 재시작
      el.classList.add('shake-feedback')
      setTimeout(() => el.classList.remove('shake-feedback'), 300)
      return
    }
    shakeRef.current = addTrauma(shakeRef.current, amount)
    if (shakeRafRef.current === null) {
      lastFrameRef.current = performance.now()
      shakeRafRef.current = requestAnimationFrame(runShakeLoop)
    }
  }

  // 글로우 트리거 — prefersReducedMotion 시 파티클 대체
  function triggerGlow(color: string) {
    if (!prefersReducedMotion) return
    const el = containerRef.current
    if (!el) return
    el.classList.remove('glow-feedback')
    el.style.setProperty('--glow-color', color)
    void el.offsetWidth
    el.classList.add('glow-feedback')
    setTimeout(() => el.classList.remove('glow-feedback'), 500)
  }

  // ── 파티클 버스트 + 셰이크 — forgePhase 전환 감지 ───────────────
  const prevPhaseRef = useRef<ForgePhase>('idle')

  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = forgePhase

    if (prev === 'waiting_reveal' && forgePhase === 'success') {
      // reveal 후 성공
      const cx = window.innerWidth / 2
      const cy = window.innerHeight * 0.4
      if (!prefersReducedMotion) { burstSuccess(cx, cy); startLoop() }
      else triggerGlow('#ffd700')
      triggerShake(0.25, true)
    } else if (prev === 'forging' && forgePhase === 'success') {
      // 일반 성공 (level 1~16)
      const cx = window.innerWidth / 2
      const cy = window.innerHeight * 0.4
      if (!prefersReducedMotion) { burstSuccess(cx, cy); startLoop() }
      else triggerGlow('#ffd700')
      triggerShake(0.15, true)
    } else if (forgePhase === 'success' && state.currentLevel === 25) {
      // +25 달성 (celebration 경로 — level 24 성공, revealMode=false)
      if (!prefersReducedMotion) { burstCelebration(); startLoop() }
      else triggerGlow('#e8b040')
      triggerShake(0.5, true)
    } else if (prev === 'waiting_reveal' && forgePhase === 'fail') {
      // 탭 투 리빌 후 파괴 (level >= 15)
      const cx = window.innerWidth / 2
      const cy = window.innerHeight * 0.45
      if (!prefersReducedMotion) { burstDestroy(cx, cy); startLoop() }
      else triggerGlow('#ff4040')
      triggerShake(0.6)
      // 그레이스케일 전환 (Fix 5) — 0.8s CSS transition
      if (lastOutcome?.destroyed && (state.currentLevel ?? 0) >= 15) {
        setGrayscale(true)
      }
    } else if (prev === 'forging' && forgePhase === 'fail') {
      // 즉시 실패 (level < 15 or 불굴)
      if (!prefersReducedMotion) {
        // 파티클 없음 (파괴 없는 즉시 실패)
      } else triggerGlow('#ff4040')
      triggerShake(0.2)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forgePhase])

  // 그레이스케일 자동 해제 (4s) + 화면 이동 시 즉시 해제
  useEffect(() => {
    if (!grayscale) return
    const t = setTimeout(() => setGrayscale(false), 4000)
    return () => clearTimeout(t)
  }, [grayscale])

  useEffect(() => {
    if (screen !== 'destroy') setGrayscale(false)
  }, [screen])

  // ── 칭호 획득 파티클 ─────────────────────────────────────────────
  const prevTitleCountRef = useRef(pendingTitleUnlocks.length)
  useEffect(() => {
    if (pendingTitleUnlocks.length > prevTitleCountRef.current) {
      if (!prefersReducedMotion) { burstTitleUnlock(); startLoop() }
      else triggerGlow('#ffd700')
    }
    prevTitleCountRef.current = pendingTitleUnlocks.length
  }, [pendingTitleUnlocks.length])

  // ── clean up on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (shakeRafRef.current !== null) cancelAnimationFrame(shakeRafRef.current)
    }
  }, [])

  const toggleBgm = () => setBgmOn((v) => !v)

  function renderScreen() {
    if (screen === 'home') {
      return (
        <HomeScreen
          state={state}
          bgmOn={bgmOn}
          onBgmToggle={toggleBgm}
          onGoForge={actions.goForge}
          onGoShopCraft={actions.goShopCraft}
          onGoStorage={actions.goStorage}
          onGoDex={actions.goDex}
          onEquipTitle={actions.equipTitle}
        />
      )
    }

    if (screen === 'forge') {
      return (
        <ForgeScreen
          state={state}
          forgePhase={forgePhase}
          lastOutcome={lastOutcome}
          bgmOn={bgmOn}
          onBgmToggle={toggleBgm}
          onForge={actions.forge}
          onReveal={actions.reveal}
          onSell={actions.sell}
          onStore={actions.storeCurrentSword}
          onStartRound={actions.startRound}
          onSkip={actions.skip}
        />
      )
    }

    if (screen === 'destroy') {
      return (
        <DestroyScreen
          state={state}
          onPickFragment={actions.pickFragment}
          onUseScroll={actions.useScroll}
        />
      )
    }

    if (screen === 'shop_craft') {
      return (
        <ShopCraftScreen
          state={state}
          onBack={actions.goHome}
          onBuyScroll={actions.buyScroll}
          onCraftScroll={actions.craftScroll}
          onCraftSword={actions.craftSword}
        />
      )
    }

    if (screen === 'storage') {
      return <StorageScreen state={state} onBack={actions.goHome} />
    }

    if (screen === 'dex') {
      return <DexScreen state={state} onBack={actions.goHome} />
    }

    return null
  }

  return (
    <>
      {/* 화면 흔들림 + 그레이스케일 컨테이너 */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          filter: grayscale ? 'grayscale(100%)' : 'none',
          transition: grayscale ? 'filter 0.8s ease' : 'filter 1.5s ease',
        }}
      >
        {renderScreen()}
      </div>

      {/* 전역 파티클 레이어 */}
      {!prefersReducedMotion && <ParticleCanvas />}

      {/* 칭호 획득 모달 */}
      {pendingTitleUnlocks.length > 0 && (
        <TitleUnlockModal
          titleId={pendingTitleUnlocks[0]}
          onDismiss={actions.dismissTitleUnlock}
        />
      )}
    </>
  )
}
