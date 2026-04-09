import { useState, useRef, useEffect, useCallback } from 'react'
import { useGameState } from './hooks/useGameState'
import GameScreen from './components/screens/GameScreen'
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
import { ambientManager } from './audio/AmbientManager'
import type { ForgePhase } from './hooks/useGameState'
import swordsData from './data/swords.json'

// 모션 감소 선호 여부 확인
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const { state, screen, forgePhase, lastOutcome, pendingTitleUnlocks, actions } = useGameState()
  const [bgmOn, setBgmOn] = useState(false)
  // 고단계 파괴 reveal 후 그레이스케일 상태
  const [grayscale, setGrayscale] = useState(false)
  // 마일스톤 시네마틱 (null = 비활성)
  const [milestoneLevel, setMilestoneLevel] = useState<number | null>(null)

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

  // ── 앰비언스 bgmOn 연동 ──────────────────────────────────────
  useEffect(() => {
    if (bgmOn) { void ambientManager.start() }
    else        { ambientManager.stop() }
  }, [bgmOn])

  // ── 마일스톤 감지 (discoveredLevels 변화 추적) ────────────────
  const prevDiscoveredRef = useRef<number[]>(state.discoveredLevels)
  useEffect(() => {
    const prev = prevDiscoveredRef.current
    prevDiscoveredRef.current = state.discoveredLevels
    const MILESTONES = [12, 17, 22, 25]
    for (const m of MILESTONES) {
      if (!prev.includes(m) && state.discoveredLevels.includes(m)) {
        setMilestoneLevel(m)
        return
      }
    }
  }, [state.discoveredLevels])

  // 마일스톤 자동 해제 (3.5s)
  useEffect(() => {
    if (milestoneLevel === null) return
    const t = setTimeout(() => setMilestoneLevel(null), 3500)
    return () => clearTimeout(t)
  }, [milestoneLevel])

  const toggleBgm = () => setBgmOn((v) => !v)

  function renderScreen() {
    if (screen === 'home' || screen === 'forge') {
      return (
        <GameScreen
          screen={screen}
          state={state}
          forgePhase={forgePhase}
          lastOutcome={lastOutcome}
          bgmOn={bgmOn}
          onBgmToggle={toggleBgm}
          onGoForge={actions.goForge}
          onGoShopCraft={actions.goShopCraft}
          onGoStorage={actions.goStorage}
          onGoDex={actions.goDex}
          onEquipTitle={actions.equipTitle}
          onForge={actions.forge}
          onReveal={actions.reveal}
          onSell={actions.sell}
          onStore={actions.storeCurrentSword}
          onStartRound={actions.startRound}
          onSkip={actions.skip}
        />
      )
    }

    // 비-게임 화면: screen-enter 트랜지션 래퍼
    let content: React.ReactNode = null

    if (screen === 'destroy') {
      content = (
        <DestroyScreen
          state={state}
          onPickFragment={actions.pickFragment}
          onUseScroll={actions.useScroll}
        />
      )
    } else if (screen === 'shop_craft') {
      content = (
        <ShopCraftScreen
          state={state}
          onBack={actions.goHome}
          onBuyScroll={actions.buyScroll}
          onCraftScroll={actions.craftScroll}
          onCraftSword={actions.craftSword}
        />
      )
    } else if (screen === 'storage') {
      content = (
        <StorageScreen
          state={state}
          isRoundActive={state.currentRound !== null}
          onBack={actions.goHome}
          onSellFromStorage={actions.sellFromStorage}
          onContinueFromStorage={actions.continueFromStorage}
        />
      )
    } else if (screen === 'dex') {
      content = <DexScreen state={state} onBack={actions.goHome} />
    }

    return content
      ? <div key={screen} className="screen-enter">{content}</div>
      : null
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

      {/* 마일스톤 시네마틱 오버레이 */}
      {milestoneLevel !== null && !prefersReducedMotion && (
        <MilestoneOverlay level={milestoneLevel} />
      )}
    </>
  )
}

// ── 마일스톤 오버레이 컴포넌트 ────────────────────────────────────

const MILESTONE_COLORS: Record<number, string> = {
  12: '#60a0ff',   // Block 2: 파랑
  17: '#c070ff',   // Block 3: 보라
  22: '#ffe060',   // Block 4: 금
  25: '#f0f0f8',   // Block 6: 백금
}

const MILESTONE_PHASES: Record<number, string> = {
  12: 'Phase A',
  17: 'Phase B',
  22: 'Phase C',
  25: 'Phase D · 완주',
}

function MilestoneOverlay({ level }: { level: number }) {
  const sword = swordsData.find((s) => s.level === level)
  const color = MILESTONE_COLORS[level] ?? '#c89028'
  const phase = MILESTONE_PHASES[level] ?? ''
  const dur = 3.5 // seconds — matches setTimeout 3500ms

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0)',
        pointerEvents: 'none',
        animation: `milestone-in ${dur}s ease forwards`,
      }}
    >
      {/* 중앙 컨텐츠 */}
      <div style={{ textAlign: 'center', userSelect: 'none' }}>
        {/* 레벨 뱃지 */}
        <div
          style={{
            fontFamily: "'GalmuriMono11', monospace",
            fontSize: 22,
            fontWeight: 700,
            color,
            textShadow: `0 0 24px ${color}, 0 0 48px ${color}60`,
            letterSpacing: '0.06em',
            animation: `milestone-level ${dur}s ease forwards`,
            marginBottom: 10,
          }}
        >
          +{level}
        </div>

        {/* 구분선 */}
        <div
          style={{
            height: 1,
            background: color,
            opacity: 0.6,
            margin: '0 auto 14px',
            width: 120,
            animation: `milestone-line ${dur}s ease forwards`,
          }}
        />

        {/* 검 이름 */}
        <div
          style={{
            fontFamily: "'Galmuri14', monospace",
            fontSize: 28,
            color,
            textShadow: `0 0 16px ${color}80`,
            letterSpacing: '0.08em',
            animation: `milestone-name ${dur}s ease forwards`,
            marginBottom: 12,
          }}
        >
          {sword?.name ?? ''}
        </div>

        {/* Phase 라벨 */}
        <div
          style={{
            fontFamily: "'Galmuri9', monospace",
            fontSize: 9,
            color: 'rgba(200,180,140,0.7)',
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            animation: `milestone-name ${dur}s ease forwards`,
          }}
        >
          {phase}
        </div>
      </div>
    </div>
  )
}
