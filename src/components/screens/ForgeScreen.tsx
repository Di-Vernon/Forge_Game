import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import styles from './ForgeScreen.module.css'
import Button from '../ui/Button'
import SwordDisplay from './swords/SwordDisplay'
import type { GameState, ForgeOutcome } from '../../types'
import type { ForgePhase } from '../../hooks/useGameState'
import {
  getSellPrice,
  getUpgradeCost,
  canAffordUpgrade,
  canSell,
} from '../../game/economy'
import { getSuccessRate } from '../../game/engine'
import { canSkip, getSkipInfo } from '../../game/skip'
import { canAffordMaterials, getMaterialRequirements } from '../../game/materials'
import { soundManager } from '../../audio/SoundManager'
import swordsData from '../../data/swords.json'
import configJson from '../../data/config.json'

// ────────────────────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────────────────────

function formatGold(g: number): string {
  return g.toLocaleString('ko-KR') + ' G'
}

// 조각 한국어 이름
const fragmentNames = configJson.fragments as Record<string, { name: string }>
function fragName(id: string): string { return fragmentNames[id]?.name ?? id }

function rateClass(rate: number): string {
  if (rate >= 0.6) return styles.high
  if (rate >= 0.3) return styles.medium
  if (rate >= 0.15) return styles.low
  return styles.veryLow
}

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────

interface Props {
  state: GameState
  forgePhase: ForgePhase
  lastOutcome: ForgeOutcome | null
  bgmOn: boolean
  onBgmToggle: () => void
  onForge: () => void
  onReveal: () => void
  onSell: () => void
  onStore: () => void
  onStartRound: () => void
  onSkip: () => void
}

// ────────────────────────────────────────────────────────────────
// 컴포넌트
// ────────────────────────────────────────────────────────────────

export default function ForgeScreen({
  state,
  forgePhase,
  lastOutcome,
  bgmOn,
  onBgmToggle,
  onForge,
  onReveal,
  onSell,
  onStore,
  onStartRound,
  onSkip,
}: Props) {
  const isRoundActive = state.currentLevel !== null && state.currentRound !== null
  const level = state.currentLevel ?? 0

  // waiting_reveal 단계에서 구 레벨 표시 (새 레벨은 탭 후 공개)
  const preForgeLevelRef = useRef(level)
  const displayLevel = forgePhase === 'waiting_reveal' ? preForgeLevelRef.current : level

  const sword = swordsData.find((s) => s.level === displayLevel)!

  const cost = getUpgradeCost(level)
  const isMaxLevel = level === 25
  const isForging = forgePhase === 'forging'
  const isWaitingReveal = forgePhase === 'waiting_reveal'
  const isBusy = forgePhase !== 'idle'

  const rate = isRoundActive && !isMaxLevel
    ? getSuccessRate(level, state.equippedTitle)
    : null

  const sellPrice = isRoundActive && canSell(level)
    ? getSellPrice(level, state.equippedTitle)
    : null

  const canForge =
    isRoundActive &&
    !isMaxLevel &&
    canAffordUpgrade(state.gold, level) &&
    canAffordMaterials(state, level + 1) &&
    !isBusy

  const [showLore, setShowLore] = useState(false)

  const totalFragments = Object.values(state.fragments).reduce((a, b) => a + b, 0)

  // ── GSAP refs ──────────────────────────────────────────────────
  const swordWrapperRef   = useRef<HTMLDivElement>(null)
  const forgingOverlayRef = useRef<HTMLDivElement>(null)

  // 강화 버튼 클릭 — 레벨 캡처 후 강화 요청
  function handleForge() {
    preForgeLevelRef.current = level
    void soundManager.init().then(() => {
      soundManager.play('ui_click', { volume: 0.5 })
    })
    onForge()
  }

  // ── 사운드: 결과 페이즈 전환 시 ────────────────────────────────
  // near_miss 사운드는 아래 GSAP 타임라인에서 처리
  useEffect(() => {
    if (forgePhase === 'success') {
      soundManager.play('forge_success')
    } else if (forgePhase === 'fail') {
      soundManager.play('forge_fail')
    }
    // 'near_miss': GSAP 타임라인(forging phase)에서 이미 처리
    // 'waiting_reveal': 소리 없음 (reveal 시 재생)
  }, [forgePhase])

  // ── Near-miss GSAP 타임라인 ─────────────────────────────────────
  // forging 페이즈 진입 시 + isNearMiss=true → 성공→하드컷→파괴 시퀀스
  useEffect(() => {
    if (forgePhase !== 'forging' || !lastOutcome?.isNearMiss) return
    const overlay = forgingOverlayRef.current
    if (!overlay) return

    // t=0: 성공인 척 — 밝은 플래시 + forge_success SFX
    soundManager.play('forge_success')
    gsap.to(overlay, { backgroundColor: 'rgba(88,160,48,0.55)', duration: 0.05 })

    // t=300ms: 하드컷 — SFX 즉시 중단 + 플래시 즉시 소멸 (transition 없음)
    const t1 = setTimeout(() => {
      soundManager.stop('forge_success')
      gsap.set(overlay, { backgroundColor: 'transparent' })
    }, 300)

    // t=500ms: 무음 구간 끝 — forge_fail SFX 재생
    const t2 = setTimeout(() => {
      soundManager.play('forge_fail')
    }, 500)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  // lastOutcome은 forgePhase='forging'과 동시에 배치 업데이트됨
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forgePhase])

  // ── GSAP: 성공 시 검 바운스, 실패 시 흔들기 ────────────────────
  useGSAP(() => {
    if (!swordWrapperRef.current) return
    if (forgePhase === 'success') {
      gsap.fromTo(
        swordWrapperRef.current,
        { scale: 0.92, filter: 'brightness(2.5)' },
        { scale: 1, filter: 'brightness(1)', duration: 0.5, ease: 'back.out(2.5)' }
      )
    } else if (forgePhase === 'fail' || forgePhase === 'near_miss') {
      gsap.fromTo(
        swordWrapperRef.current,
        { x: -10 },
        { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.15)' }
      )
    } else if (forgePhase === 'waiting_reveal') {
      gsap.fromTo(
        swordWrapperRef.current,
        { scale: 1 },
        { scale: 1.04, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }
      )
    } else if (forgePhase === 'idle') {
      gsap.killTweensOf(swordWrapperRef.current)
      gsap.set(swordWrapperRef.current, { scale: 1, x: 0, filter: 'brightness(1)' })
    }
  }, { dependencies: [forgePhase] })

  // 칭호명
  const titleId = state.equippedTitle
  const titleName = titleId
    ? (configJson.titles as Record<string, { name: string | null }>)[titleId]?.name ?? null
    : null

  // 불굴/검성 보호 칭호 장착 여부 표시
  const protectionTitleEquipped =
    state.equippedTitle === 'indomitable_smith' ||
    state.equippedTitle === 'sword_saint'

  // 건너뛰기
  const skipInfo = getSkipInfo(state.equippedTitle)
  const skipAvailable = canSkip(state) && !isBusy

  // 재료 검 요구사항 (+17 이상)
  const materialReqs = isRoundActive && !isMaxLevel
    ? getMaterialRequirements(level + 1)
    : []

  // 보호 발동 여부
  const showProtection =
    forgePhase === 'idle' &&
    lastOutcome !== null &&
    lastOutcome.protectionTriggered === true

  const protectionIsSwordSaint = lastOutcome?.protectionSource === 'sword_saint'

  return (
    <div className={styles.screen}>
      {/* ── 헤더 ──────────────────────────────── */}
      <header className={styles.header}>
        <button
          className={`${styles.bgmBtn} ${bgmOn ? styles.bgmBtnOn : ''}`}
          onClick={onBgmToggle}
        >
          ♪ BGM {bgmOn ? 'ON' : 'OFF'}
        </button>

        <div className={styles.titleBadge}>
          {titleName ? `★ ${titleName} ★` : ''}
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>GOLD</span>
            <span className={`${styles.statValue} ${styles.goldStat}`}>
              {formatGold(state.gold)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>조각</span>
            <span className={styles.statValue}>{totalFragments}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>스크롤</span>
            <span className={styles.statValue}>{state.scrolls}</span>
          </div>
        </div>
      </header>

      {/* ── 메인 ──────────────────────────────── */}
      <main className={styles.main}>
        {/* 판매 패널 (좌) */}
        <aside className={styles.sidePanel}>
          {isRoundActive && canSell(level) ? (
            <>
              <span className={styles.panelLabel}>How much</span>
              <span className={styles.panelPrice}>
                {sellPrice != null ? formatGold(sellPrice) : '—'}
              </span>
              <Button
                variant="ghost"
                size="lg"
                disabled={isBusy || sellPrice == null}
                onClick={() => { onSell() }}
                fullWidth
              >
                SELL
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isBusy || level === 0}
                onClick={onStore}
                fullWidth
              >
                보관
              </Button>
            </>
          ) : isMaxLevel ? (
            <>
              <span className={styles.panelLabel}>판매 불가</span>
              <span className={`${styles.panelPrice} ${styles.dimmed}`}>여명</span>
              <Button variant="primary" size="lg" onClick={onStore} fullWidth>
                보관함에 넣기
              </Button>
            </>
          ) : (
            <span className={styles.panelLabel}>—</span>
          )}
        </aside>

        {/* 검 중앙 */}
        <section className={styles.swordCenter}>
          {/* 강화 애니메이션 오버레이 */}
          <div
            ref={forgingOverlayRef}
            className={[
              styles.forgingOverlay,
              // near-miss 중 forging: GSAP가 제어 → CSS 클래스 없음
              // near-miss near_miss 단계: fail 스타일 (near_miss CSS는 2400ms짜리이므로 제외)
              isBusy && lastOutcome?.isNearMiss && forgePhase === 'near_miss' ? styles.fail :
              isBusy && !lastOutcome?.isNearMiss ? styles[forgePhase] : '',
            ].join(' ')}
          />

          {/* 보호 발동 배너 */}
          {showProtection && (
            <div className={styles.protectionBanner}>
              <span className={styles.protectionIcon}>🛡</span>
              <span className={styles.protectionText}>보호 발동!</span>
              {protectionIsSwordSaint && (
                <span className={styles.protectionSub}>재료 보존됨</span>
              )}
            </div>
          )}

          {/* 검 이름 라벨 (상단 중앙) */}
          {isRoundActive && (
            <div className={styles.swordLabel}>
              <span className={styles.levelTag}>+{displayLevel}</span>
              <button
                className={styles.swordNameBtn}
                disabled={isBusy}
                onClick={() => !isBusy && setShowLore(true)}
              >
                {sword.name}
              </button>
            </div>
          )}

          {/* 검 표시 */}
          <div
            ref={swordWrapperRef}
            className={`${styles.swordWrapper} ${!isBusy && isRoundActive ? styles.swordClickable : ''}`}
            onClick={() => { if (!isBusy && isRoundActive) setShowLore(true) }}
            title={isRoundActive && !isBusy ? '검 도안 보기' : undefined}
          >
            <SwordDisplay level={displayLevel} forgePhase={forgePhase} />
          </div>

          {/* 결과 공개 대기 오버레이 (waiting_reveal 전용) */}
          {forgePhase === 'waiting_reveal' && (
            <div className={styles.revealOverlay} onClick={onReveal}>
              <div className={styles.revealOrb} />
              <span className={styles.revealPrompt}>탭하여 결과 확인</span>
            </div>
          )}

          {/* 라운드 미시작 오버레이 */}
          {!isRoundActive && (
            <div className={styles.startOverlay}>
              <span className={styles.startTitle}>대장간</span>
              <Button variant="ember" size="lg" onClick={onStartRound}>
                강화 시작
              </Button>
            </div>
          )}
        </section>

        {/* 강화 패널 (우) */}
        <aside className={`${styles.sidePanel} ${styles.rightPanel}`}>
          {isRoundActive && !isMaxLevel ? (
            <>
              <span className={styles.panelLabel}>성공률</span>
              {rate != null && (
                <span className={`${styles.rateDisplay} ${rateClass(rate)}`}>
                  {Math.round(rate * 100)}%
                </span>
              )}
              <Button
                variant={canForge ? 'ember' : 'primary'}
                size="lg"
                disabled={!canForge}
                onClick={handleForge}
                fullWidth
              >
                {isForging ? '강화 중…' : isWaitingReveal ? '공개 대기…' : 'UPGRADE'}
              </Button>
              <div className={styles.costTag}>
                cost:{' '}
                <span>{formatGold(cost)}</span>
              </div>
              {protectionTitleEquipped && (
                <span className={styles.indomitableNote}>
                  🛡 보호 칭호 장착 중
                </span>
              )}
              {!canAffordUpgrade(state.gold, level) && (
                <span className={styles.phaseNote}>골드 부족</span>
              )}
              {/* 재료 검 요구사항 표시 (+17 이상) */}
              {materialReqs.length > 0 && (
                <div className={styles.materialReqs}>
                  <span className={styles.materialLabel}>재료 필요</span>
                  {materialReqs.map((mat) => {
                    const matSword = swordsData.find((s) => s.level === mat.level)
                    const haveCount = state.storage.filter((l) => l === mat.level).length
                    const enough = haveCount >= mat.count
                    return (
                      <span
                        key={mat.level}
                        className={`${styles.materialItem} ${enough ? styles.materialOk : styles.materialLack}`}
                      >
                        {enough ? '✓' : '✗'} {matSword?.name ?? `+${mat.level}`} ×{mat.count}
                        <span className={styles.materialHave}>({haveCount}/{mat.count})</span>
                      </span>
                    )
                  })}
                </div>
              )}
              {/* 건너뛰기 */}
              {skipInfo !== null && level === 0 && (
                <div className={styles.actionRow}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!skipAvailable}
                    onClick={onSkip}
                    fullWidth
                  >
                    건너뛰기 → +{skipInfo.targetLevel}
                  </Button>
                  <span className={styles.skipCost}>
                    {skipInfo.gold != null && skipInfo.gold > 0
                      ? formatGold(skipInfo.gold)
                      : '무료'}
                    {skipInfo.fragmentId && skipInfo.fragmentCount > 0
                      ? ` + ${fragName(skipInfo.fragmentId)} ×${skipInfo.fragmentCount}`
                      : ''}
                  </span>
                </div>
              )}
            </>
          ) : isMaxLevel ? (
            <span className={`${styles.rateDisplay} ${styles.high}`}>MAX</span>
          ) : (
            <span className={styles.panelLabel}>—</span>
          )}
        </aside>
      </main>

      {/* ── 푸터 ──────────────────────────────── */}
      <footer className={styles.footer}>
        <button className={styles.storageBtn}>My Storage ({state.storage.length})</button>
      </footer>

      {/* ── 검 도안 모달 ──────────────────────────────────── */}
      {showLore && (
        <div className={styles.loreBackdrop} onClick={() => setShowLore(false)}>
          <div className={styles.loreModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.loreHeader}>
              <span className={styles.loreLevelTag}>+{displayLevel}</span>
              <span className={styles.loreTitle}>{sword.name}</span>
              <button className={styles.loreClose} onClick={() => setShowLore(false)}>✕</button>
            </div>
            <div className={styles.loreBody}>
              <p className={styles.loreText}>{sword.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
