/**
 * DestroyScreen.tsx — 다크소울 스타일 파괴 화면
 * 순수 검정 배경 + "파 괴" 텍스트 (2s 페이드인)
 * 기능: 줍기(조각 회수) / 복원권 사용
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

// ── Props ──────────────────────────────────────────────────────

interface Props {
  state: GameState
  onPickFragment: (drops: FragmentDropResult[]) => void
  onUseScroll: () => void
}

type DestroyPhase = 'entering' | 'idle' | 'picking' | 'restoring'

// ── 컴포넌트 ────────────────────────────────────────────────────

export default function DestroyScreen({ state, onPickFragment, onUseScroll }: Props) {
  const [phase, setPhase] = useState<DestroyPhase>('entering')
  const [pickedDrops, setPickedDrops] = useState<FragmentDropResult[] | null>(null)

  const level = state.currentLevel ?? 0
  const sword = swordsData.find((s) => s.level === level)!
  // level 0, 1은 드랍 테이블이 비어있음 → 줍기 대신 돌아가기
  const canPickup = level >= 2
  // Phase 4+ (level 17+): 진입 진동
  const isHighTier = level >= 17

  // 진입 → idle 전환 (페이드인 애니메이션 완료 후)
  useEffect(() => {
    const delay = isHighTier ? 700 : 2400
    const t = setTimeout(() => setPhase('idle'), delay)
    return () => clearTimeout(t)
  }, [isHighTier])

  function handlePickFragment() {
    const drops = rollFragmentDrop(level, state.equippedTitle)
    setPickedDrops(drops)
    setPhase('picking')
    setTimeout(() => onPickFragment(drops), 1800)
  }

  function handleUseScroll() {
    setPhase('restoring')
    setTimeout(() => onUseScroll(), 700)
  }

  const scrollCost =
    (configJson.scrollCostByBlock as Record<string, number>)[String(sword.block)] ?? 1
  const canRestore = state.scrolls >= scrollCost

  return (
    <div className={`${styles.screen} ${isHighTier ? styles.screenHigh : ''}`}>

      {/* 복원 플래시 */}
      {phase === 'restoring' && <div className={styles.restoreFlash} />}

      {/* 우측 상단 stats */}
      <div className={styles.statsCorner}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>GOLD</span>
          <span className={`${styles.statValue} ${styles.gold}`}>
            {state.gold.toLocaleString('ko-KR')} G
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>스크롤</span>
          <span className={styles.statValue}>{state.scrolls}</span>
        </div>
      </div>

      {/* "파 괴" 텍스트 */}
      <div className={styles.destroyTitle}>파 괴</div>

      {/* 검 이름 + 레벨 */}
      <div className={styles.swordInfo}>
        <span className={styles.levelTag}>+{level}</span>
        <span className={styles.swordName}>{sword.name}</span>
      </div>

      {/* 선택 패널 (idle) */}
      {phase === 'idle' && (
        <div className={styles.choicePanel}>
          {/* 줍기 / 돌아가기 */}
          <div className={styles.choiceSlot}>
            {canPickup ? (
              <>
                <Button variant="ghost" size="lg" onClick={handlePickFragment} fullWidth>
                  줍기
                </Button>
                <span className={styles.choiceNote}>조각 회수</span>
              </>
            ) : (
              <>
                <Button variant="ghost" size="lg" onClick={() => onPickFragment([])} fullWidth>
                  돌아가기
                </Button>
                <span className={styles.choiceNote}>드랍 없음</span>
              </>
            )}
          </div>

          <div className={styles.choiceDivider} />

          {/* 복원권 사용 */}
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
                ? `+${level}(으)로 복원 · 스크롤 ${scrollCost}개`
                : `스크롤 부족 (필요: ${scrollCost}개)`}
            </span>
          </div>
        </div>
      )}

      {/* 결과 토스트 (picking) */}
      {phase === 'picking' && pickedDrops !== null && (
        <div className={styles.resultToast}>
          {pickedDrops.length === 0 ? (
            <span className={styles.toastEmpty}>아무것도 남지 않았다...</span>
          ) : (
            <>
              <span className={styles.toastLabel}>조각 획득</span>
              {pickedDrops.map((drop, i) => (
                <span key={i} className={styles.toastItem}>
                  {getFragmentName(drop.fragmentId)}
                  {drop.count > 1 ? ` ×${drop.count}` : ''}
                </span>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
