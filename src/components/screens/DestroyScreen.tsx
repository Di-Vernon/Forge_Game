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
import { getSwordImagePath, getSwordGlowColor } from '../../utils/swordImage'
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

// ── BrokenSwordDisplay — PNG + grayscale + 균열 오버레이 ──────

function BrokenSwordDisplay({ level, className }: { level: number; className?: string }) {
  const glowColor = getSwordGlowColor(level)
  const glowFilter = glowColor
    ? `grayscale(1) brightness(0.5) drop-shadow(0 0 6px ${glowColor}90)`
    : 'grayscale(1) brightness(0.5)'

  return (
    <div className={`${styles.brokenWrap} ${className ?? ''}`} style={{ position: 'relative' }}>
      <img
        src={getSwordImagePath(level)}
        alt={`파괴된 +${level}강 검`}
        draggable={false}
        style={{
          width: 120,
          height: 120,
          imageRendering: 'pixelated',
          filter: glowFilter,
          opacity: 0.7,
          transform: 'rotate(-45deg)',
          userSelect: 'none',
        }}
      />
      {/* 균열 오버레이 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            linear-gradient(135deg, transparent 42%, rgba(0,0,0,0.35) 42.5%, rgba(0,0,0,0.35) 43%, transparent 43.5%),
            linear-gradient(155deg, transparent 48%, rgba(0,0,0,0.25) 48.5%, rgba(0,0,0,0.25) 49%, transparent 49.5%),
            linear-gradient(120deg, transparent 55%, rgba(0,0,0,0.2) 55.5%, rgba(0,0,0,0.2) 56%, transparent 56.5%)
          `,
        }}
      />
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
            {(() => {
              const scrollCost = (configJson.scrollCostByBlock as Record<string, number>)[String(sword.block)] ?? 1
              const canRestore = state.scrolls >= scrollCost
              return (
                <div className={styles.choiceSlot}>
                  <Button
                    variant={canRestore ? 'gold' : 'primary'}
                    size="lg"
                    disabled={!canRestore}
                    onClick={handleUseScroll}
                    fullWidth
                  >
                    복원권 사용
                  </Button>
                  <span className={`${styles.choiceNote} ${!canRestore ? styles.noteWarn : ''}`}>
                    {canRestore
                      ? `+${level}(으)로 복원 · 스크롤 ${scrollCost}개 소모`
                      : `복원 스크롤이 부족합니다 (필요: ${scrollCost}개)`}
                  </span>
                </div>
              )
            })()}
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
