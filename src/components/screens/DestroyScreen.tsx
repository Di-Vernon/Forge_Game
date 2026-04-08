/**
 * DestroyScreen.tsx
 * 검 파괴 시 표시되는 화면. KB 섹션 5-2.
 *
 * 선택지:
 *   줍기 — rollFragmentDrop 결과를 보여준 뒤 홈으로 복귀
 *   복원권 사용 — 레벨 하락 후 ForgeScreen 복귀 (하락량: Step 4에서 config 기반으로 구현 예정)
 */

import { useState, useEffect } from 'react'
import styles from './DestroyScreen.module.css'
import Button from '../ui/Button'
import type { GameState, FragmentId } from '../../types'
import { rollFragmentDrop, type FragmentDropResult } from '../../game/fragments'
import swordsData from '../../data/swords.json'
import configJson from '../../data/config.json'

// ── 조각 이름 조회 ──────────────────────────────────────────────

const fragmentCfg = configJson.fragments as Record<string, { name: string }>
function getFragmentName(id: FragmentId): string {
  return fragmentCfg[id]?.name ?? id
}

function formatGold(g: number): string {
  return g.toLocaleString('ko-KR') + ' G'
}

// ── 검 색상 (SwordDisplay와 동일한 로직) ───────────────────────

interface SwordCfg {
  bladeColor: string
  guardColor: string
  gripColor: string
  accentColor: string
  glowColor: string | null
}

function getSwordCfg(level: number): SwordCfg {
  if (level >= 25) return { bladeColor: '#f0f4ff', guardColor: '#c8d8ff', gripColor: '#a0b8e8', accentColor: '#ffffff',  glowColor: '#c0d8ff' }
  if (level >= 23) return { bladeColor: '#cc3010', guardColor: '#882010', gripColor: '#601808', accentColor: '#ff5030',  glowColor: '#ff4020' }
  if (level >= 17) return { bladeColor: '#d4a820', guardColor: '#a07810', gripColor: '#705008', accentColor: '#ffe060',  glowColor: '#ffd030' }
  if (level >= 13) return { bladeColor: '#9040c0', guardColor: '#602880', gripColor: '#401860', accentColor: '#c070ff',  glowColor: '#a050e0' }
  if (level >= 8)  return { bladeColor: '#3870c8', guardColor: '#204880', gripColor: '#182858', accentColor: '#60a0ff',  glowColor: '#4488dd' }
  if (level >= 4)  return { bladeColor: '#408840', guardColor: '#285828', gripColor: '#503820', accentColor: '#80cc60',  glowColor: null }
  if (level >= 2)  return { bladeColor: '#c8c8c8', guardColor: '#909090', gripColor: '#503820', accentColor: '#e8e8e8',  glowColor: null }
  return                  { bladeColor: '#908060', guardColor: '#605040', gripColor: '#503820', accentColor: '#b0a080',  glowColor: null }
}

// ── BrokenSwordDisplay ─────────────────────────────────────────
// 크로스가드(y≈123) 기준으로 두 조각으로 분리
// 날 부분: rotate(-22 32 123) — 왼쪽으로 기울어짐
// 그립 부분: rotate(-14 32 123) — 오른쪽으로 쓰러짐 (아래 방향에서 CCW = 우향)

function BrokenSwordDisplay({ level, className }: { level: number; className?: string }) {
  const cfg = getSwordCfg(level)
  const glowStyle = cfg.glowColor
    ? { filter: `drop-shadow(0 0 6px ${cfg.glowColor}90) drop-shadow(0 0 16px ${cfg.glowColor}40)` }
    : {}

  return (
    <div className={`${styles.brokenWrap} ${className ?? ''}`}>
      <svg
        viewBox="0 0 64 200"
        width="80"
        height="240"
        overflow="visible"
        style={{ ...glowStyle, shapeRendering: 'crispEdges' }}
        aria-label={`파괴된 +${level}강 검`}
      >
        {/* ── 날 조각 (위 ← 왼쪽으로 기울어짐) ── */}
        <g transform="rotate(-22 32 123)">
          {/* 날끝 */}
          <polygon points="32,0 28,20 36,20" fill={cfg.bladeColor} opacity="0.88" />
          {/* 날 몸통 */}
          <rect x="28" y="18" width="8" height="103" fill={cfg.bladeColor} opacity="0.88" />
          {/* 풀러 (Phase 2+) */}
          {level >= 8 && (
            <rect x="31" y="28" width="2" height="83" fill={cfg.accentColor} opacity="0.4" />
          )}
          {/* 크로스가드 상단 절반 */}
          <rect x="10" y="118" width="44" height="5" fill={cfg.guardColor} opacity="0.88" />
          {level >= 13 && (
            <>
              <rect x="6"  y="119" width="8" height="4" fill={cfg.accentColor} opacity="0.75" />
              <rect x="50" y="119" width="8" height="4" fill={cfg.accentColor} opacity="0.75" />
            </>
          )}
        </g>

        {/* 파편 조각 1 (날 부근) */}
        <rect
          x="24" y="110"
          width="5" height="3"
          fill={cfg.bladeColor} opacity="0.45"
          transform="rotate(-35 26 111) translate(-14 -6)"
        />
        <rect
          x="36" y="114"
          width="4" height="3"
          fill={cfg.guardColor} opacity="0.35"
          transform="rotate(20 38 115) translate(8 -4)"
        />

        {/* ── 그립 조각 (아래 → 오른쪽으로 쓰러짐) ── */}
        <g transform="rotate(-14 32 123)">
          {/* 크로스가드 하단 절반 */}
          <rect x="10" y="123" width="44" height="5" fill={cfg.guardColor} opacity="0.88" />
          {/* 그립 */}
          <rect x="29" y="128" width="6" height="44" fill={cfg.gripColor} />
          {/* 그립 감김 */}
          {[134, 142, 150, 158].map((y) => (
            <rect key={y} x="27" y={y} width="10" height="3" fill={cfg.guardColor} opacity="0.6" />
          ))}
          {/* 포멜 */}
          <rect x="24" y="172" width="16" height="14" fill={cfg.guardColor} />
          {level >= 17 && (
            <rect x="28" y="174" width="8" height="10" fill={cfg.accentColor} opacity="0.7" />
          )}
        </g>

        {/* 파편 조각 2 (그립 부근) */}
        <rect
          x="14" y="128"
          width="4" height="3"
          fill={cfg.guardColor} opacity="0.4"
          transform="rotate(-15 16 129) translate(-6 8)"
        />
      </svg>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────

interface Props {
  state: GameState
  onPickFragment: (drops: FragmentDropResult[]) => void
  onUseScroll: () => void
}

type DestroyPhase = 'entering' | 'idle' | 'picking' | 'restoring'

// ── 페이즈 분류 ─────────────────────────────────────────────────
// Phase 1~2 (level 1~12): 담백하고 빠름
// Phase 3   (level 13~16): 강화된 셰이크, 패널 아웃라인 펄스
// Phase 4+  (level 17+):   균열 오버레이, CSS 저주파 진동, 느린 드리프트
function getDestroyTier(level: number): 'low' | 'mid' | 'high' {
  if (level >= 17) return 'high'
  if (level >= 13) return 'mid'
  return 'low'
}

// ── 컴포넌트 ────────────────────────────────────────────────────

export default function DestroyScreen({ state, onPickFragment, onUseScroll }: Props) {
  const [phase, setPhase] = useState<DestroyPhase>('entering')
  const [pickedDrops, setPickedDrops] = useState<FragmentDropResult[] | null>(null)

  const level = state.currentLevel ?? 0
  const sword = swordsData.find((s) => s.level === level)!
  const destroyTier = getDestroyTier(level)
  // level 0, 1은 드랍 테이블이 비어있어 항상 null → 슬롯 자체를 숨김
  const canPickup = level >= 2

  // 진입 애니메이션 종료 → idle
  // Phase 4+는 tap-to-reveal에서 이미 연출을 마쳤으므로 더 빠르게 idle 복귀
  useEffect(() => {
    const delay = destroyTier === 'high' ? 450 : 750
    const t = setTimeout(() => setPhase('idle'), delay)
    return () => clearTimeout(t)
  }, [destroyTier])

  function handlePickFragment() {
    const drops = rollFragmentDrop(level, state.equippedTitle)
    setPickedDrops(drops)
    setPhase('picking')
    // 결과 1.8초 표시 후 홈으로
    setTimeout(() => onPickFragment(drops), 1800)
  }

  function handleUseScroll() {
    setPhase('restoring')
    // 복원 연출 후 ForgeScreen 복귀
    setTimeout(() => onUseScroll(), 700)
  }

  const swordClass =
    phase === 'entering'  ?
      (destroyTier === 'high' ? styles.swordEnteringHigh :
       destroyTier === 'mid'  ? styles.swordEnteringMid  : styles.swordEntering) :
    phase === 'restoring' ? styles.swordRestoring :
    (destroyTier === 'high' ? styles.swordBrokenHigh : styles.swordBroken)

  const screenClass = [
    styles.screen,
    destroyTier === 'mid'  ? styles.screenMid  : '',
    destroyTier === 'high' ? styles.screenHigh : '',
  ].join(' ')

  return (
    <div className={screenClass}>
      {/* 대장간 배경 그리드 */}
      <div className={styles.gridBg} />

      {/* 어두운 분위기 오버레이 */}
      <div className={styles.darkOverlay} />

      {/* 진입 / 복원 플래시 오버레이 */}
      {/* Phase 4+: tap-to-reveal에서 이미 연출 완료 → 진입 플래시 없음 */}
      {phase === 'entering' && destroyTier !== 'high' && <div className={styles.destroyFlash} />}
      {phase === 'restoring' && <div className={styles.restoreFlash} />}

      {/* 균열 오버레이 (Phase 4+, +20 이상에서 강화) */}
      {destroyTier === 'high' && <div className={`${styles.crackOverlay} ${level >= 20 ? styles.crackOverlayIntense : ''}`} />}

      {/* ── 우측 상단 stats ─────────────────────────── */}
      <div className={styles.statsCorner}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>GOLD</span>
          <span className={`${styles.statValue} ${styles.gold}`}>{formatGold(state.gold)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>스크롤</span>
          <span className={styles.statValue}>{state.scrolls}</span>
        </div>
      </div>

      {/* ── 메인 ────────────────────────────────────── */}
      <main className={styles.main}>

        {/* 파괴된 검 + 모루 */}
        <div className={styles.swordArea}>
          <BrokenSwordDisplay level={level} className={swordClass} />
          <div className={styles.anvil} />
        </div>

        {/* 결과 메시지 (picking 상태) */}
        {phase === 'picking' && pickedDrops !== null && (
          <div className={styles.resultToast}>
            {pickedDrops.length === 0 ? (
              <span className={styles.toastEmpty}>아무것도 남지 않았다...</span>
            ) : (
              <>
                <span className={styles.toastLabel}>조각 획득!</span>
                {pickedDrops.map((drop, i) => (
                  <span key={i} className={styles.toastItem}>
                    {getFragmentName(drop.fragmentId)}{drop.count > 1 ? ` ×${drop.count}` : ''}
                  </span>
                ))}
              </>
            )}
          </div>
        )}

        {/* 선택 버튼 (idle 상태) */}
        {phase === 'idle' && (
          <div className={`${styles.choiceRow} ${destroyTier === 'mid' ? styles.choiceRowMid : ''}`}>
            {/* 줍기 — level 0, 1은 드랍 없음 → "돌아가기"로 대체 */}
            {canPickup ? (
              <>
                <div className={styles.choiceSlot}>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handlePickFragment}
                    fullWidth
                  >
                    줍기
                  </Button>
                  <span className={styles.choiceNote}>조각 회수</span>
                </div>
                <div className={styles.choiceDivider} />
              </>
            ) : (
              <>
                <div className={styles.choiceSlot}>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => onPickFragment([])}
                    fullWidth
                  >
                    돌아가기
                  </Button>
                  <span className={styles.choiceNote}>드랍 없음</span>
                </div>
                <div className={styles.choiceDivider} />
              </>
            )}

            {/* 복원권 사용 */}
            <div className={styles.choiceSlot}>
              <Button
                variant={state.scrolls > 0 ? 'gold' : 'primary'}
                size="lg"
                disabled={state.scrolls <= 0}
                onClick={handleUseScroll}
                fullWidth
              >
                복원권 사용
              </Button>
              <span className={`${styles.choiceNote} ${state.scrolls <= 0 ? styles.noteWarn : ''}`}>
                {state.scrolls > 0
                  ? `+${level}(으)로 복원 · 스크롤 1개 소모`
                  : '복원 스크롤이 없습니다'}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ── 푸터: 파괴된 검 정보 ─────────────────────── */}
      <footer className={styles.footer}>
        <span className={styles.levelTag}>+{level}</span>
        <span className={styles.swordName}>{sword.name}</span>
        <span className={styles.destroyBadge}>파괴됨</span>
      </footer>
    </div>
  )
}
