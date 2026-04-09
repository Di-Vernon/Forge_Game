/**
 * GameScreen.tsx
 * 통합 Home + Forge 화면 — 좌우 패널 슬라이드 교체 방식
 * - home: 홈 좌(네비) + 홈 우(칭호/통계) 패널 표시
 * - forge: 포지 좌(판매) + 포지 우(강화) 패널 표시
 * 중앙 검 표시 영역은 항상 유지.
 */

import { useState, useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import styles from './GameScreen.module.css'
import Button from '../ui/Button'
import SwordDisplay from './swords/SwordDisplay'
import { getLevelColor } from './swords/SwordDisplay'
import EmberCanvas from '../../effects/EmberCanvas'
import type { GameState, ForgeOutcome, TitleId } from '../../types'
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

// ── 유틸 ────────────────────────────────────────────────────────

function formatGold(g: number): string {
  return g.toLocaleString('ko-KR') + ' G'
}

const fragmentNames = configJson.fragments as Record<string, { name: string }>
function fragName(id: string): string { return fragmentNames[id]?.name ?? id }

interface TitleEntry {
  name: string | null
  condition: string | null
  effectDescription: string | null
}

const titlesData = configJson.titles as Record<string, TitleEntry>
const titleProtection = configJson.titleProtection as Record<
  string,
  { chance: number; materialPreserveOnProtect?: boolean }
>

const DISPLAY_TITLE_IDS = (Object.entries(titlesData) as [TitleId, TitleEntry][])
  .filter(([, v]) => v.name !== null)
  .map(([id]) => id)

// prefers-reduced-motion (모듈 수준, 재렌더 없이)
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 강화 오버레이 CSS 클래스 매핑
const FORGE_CLASS: Partial<Record<ForgePhase, string>> = {
  forging:        styles.forging,
  success:        styles.success,
  fail:           styles.fail,
  near_miss:      styles['near_miss'],  // underscored key
  waiting_reveal: '',
  idle:           '',
}

// ── Props ────────────────────────────────────────────────────────

interface Props {
  screen: 'home' | 'forge'
  state: GameState
  forgePhase: ForgePhase
  lastOutcome: ForgeOutcome | null
  bgmOn: boolean
  onBgmToggle: () => void
  // Home 액션
  onGoForge: () => void
  onGoShopCraft: () => void
  onGoStorage: () => void
  onGoDex: () => void
  onEquipTitle: (id: TitleId | null) => void
  // Forge 액션
  onForge: () => void
  onReveal: () => void
  onSell: () => void
  onStore: () => void
  onStartRound: () => void
  onSkip: () => void
}

// ── 컴포넌트 ─────────────────────────────────────────────────────

export default function GameScreen({
  screen,
  state,
  forgePhase,
  lastOutcome,
  bgmOn,
  onBgmToggle,
  onGoForge,
  onGoShopCraft,
  onGoStorage,
  onGoDex,
  onEquipTitle,
  onForge,
  onReveal,
  onSell,
  onStore,
  onStartRound,
  onSkip,
}: Props) {
  const isForge = screen === 'forge'
  const isRoundActive = state.currentLevel !== null && state.currentRound !== null
  const roundActive = state.currentRound !== null
  const level = state.currentLevel ?? 0

  // waiting_reveal 단계에서 이전 레벨 표시
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
  const [showTitleModal, setShowTitleModal] = useState(false)

  const totalFragments = Object.values(state.fragments).reduce((a, b) => a + b, 0)
  const equippedData = state.equippedTitle ? titlesData[state.equippedTitle] : null
  const uniqueStorageCount = new Set(state.storage).size

  // ── GSAP refs ──────────────────────────────────────────────────
  const swordWrapperRef   = useRef<HTMLDivElement>(null)
  const forgingOverlayRef = useRef<HTMLDivElement>(null)
  const goldDisplayRef    = useRef<HTMLSpanElement>(null)

  // ── 골드 롤링 (GSAP proxy tween) ──────────────────────────────
  const prevGoldRef         = useRef(state.gold)
  const isFirstGoldRender   = useRef(true)

  useGSAP(() => {
    if (isFirstGoldRender.current) {
      isFirstGoldRender.current = false
      prevGoldRef.current = state.gold
      return
    }
    if (!goldDisplayRef.current) return
    const from = prevGoldRef.current
    const to   = state.gold
    prevGoldRef.current = to
    if (from === to) return

    const proxy = { val: from }
    const dur = Math.min(0.85, Math.abs(to - from) / 3000 + 0.3)
    gsap.to(proxy, {
      val: to,
      duration: dur,
      ease: 'power2.out',
      onUpdate: () => {
        if (goldDisplayRef.current) {
          goldDisplayRef.current.textContent =
            Math.round(proxy.val).toLocaleString('ko-KR') + ' G'
        }
      },
    })
  }, { dependencies: [state.gold] })

  // 강화 버튼 — 레벨 캡처 후 강화 요청
  function handleForge() {
    preForgeLevelRef.current = level
    void soundManager.init().then(() => {
      soundManager.play('ui_click', { volume: 0.5 })
    })
    onForge()
  }

  // 사운드: 결과 페이즈 전환 시
  useEffect(() => {
    if (forgePhase === 'success') soundManager.play('forge_success')
    else if (forgePhase === 'fail') soundManager.play('forge_fail')
    // near_miss: GSAP 타임라인에서 처리
    // waiting_reveal: 소리 없음
  }, [forgePhase])

  // Near-miss GSAP 타임라인
  useEffect(() => {
    if (forgePhase !== 'forging' || !lastOutcome?.isNearMiss) return
    const overlay = forgingOverlayRef.current
    if (!overlay) return

    soundManager.play('forge_success')
    gsap.to(overlay, { backgroundColor: 'rgba(88,160,48,0.55)', duration: 0.05 })

    const t1 = setTimeout(() => {
      soundManager.stop('forge_success')
      gsap.set(overlay, { backgroundColor: 'transparent' })
    }, 300)

    const t2 = setTimeout(() => {
      soundManager.play('forge_fail')
    }, 500)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forgePhase])

  // GSAP: 성공 바운스 / 실패 흔들기 / reveal 맥동
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

  // 칭호
  const titleId = state.equippedTitle
  const titleName = titleId
    ? (configJson.titles as Record<string, { name: string | null }>)[titleId]?.name ?? null
    : null

  const protectionTitleEquipped =
    state.equippedTitle === 'indomitable_smith' ||
    state.equippedTitle === 'sword_saint'

  // 건너뛰기
  const skipInfo = getSkipInfo(state.equippedTitle)
  const skipAvailable = canSkip(state) && !isBusy

  // 재료 요구사항 (+17 이상)
  const materialReqs = isRoundActive && !isMaxLevel
    ? getMaterialRequirements(level + 1)
    : []

  // 보호 발동 배너
  const showProtection =
    forgePhase === 'idle' &&
    lastOutcome !== null &&
    lastOutcome.protectionTriggered === true

  const protectionIsSwordSaint = lastOutcome?.protectionSource === 'sword_saint'

  const levelColor = getLevelColor(displayLevel)

  // 강화 오버레이 클래스
  const overlayClass = [
    styles.forgingOverlay,
    isBusy && lastOutcome?.isNearMiss && forgePhase === 'near_miss'
      ? styles.fail
      : isBusy && !lastOutcome?.isNearMiss
      ? (FORGE_CLASS[forgePhase] ?? '')
      : '',
  ].join(' ')

  return (
    <div className={styles.layout}>

      {/* ══ 헤더 ═════════════════════════════════════════════════ */}
      <header className={styles.header}>
        <button
          className={`${styles.bgmBtn} ${bgmOn ? styles.bgmBtnOn : ''}`}
          onClick={onBgmToggle}
        >
          ♪ BGM {bgmOn ? 'ON' : 'OFF'}
        </button>

        <div className={`${styles.titleBadge} ${titleName ? '' : styles.titleBadgeNone}`}>
          {titleName ? `★ ${titleName} ★` : '— 칭호 없음 —'}
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>GOLD</span>
            <span ref={goldDisplayRef} className={`${styles.statValue} ${styles.statGold} ${styles.goldRoll}`}>
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

      {/* ══ 메인 3열 ══════════════════════════════════════════════ */}
      <div className={styles.mainArea}>

        {/* ── 좌측 패널 슬롯 ──────────────────────────────────── */}
        <div className={styles.panelLeft}>

          {/* 홈 좌: 네비게이션 */}
          <div className={`${styles.panel} ${styles.homeLeftPanel} ${!isForge ? styles.panelVisible : styles.panelOutLeft}`}>
            <div className={styles.panelInner}>
              <span className={styles.panelSectionLabel}>네비게이션</span>
              <Button variant="gold" size="lg" onClick={onGoForge} fullWidth>
                {roundActive ? '강화 계속' : '강화소 입장'}
              </Button>
              <div className={styles.panelDivider} />
              <Button variant="primary" size="md" onClick={onGoShopCraft} fullWidth>
                상점 / 조합소
              </Button>
              <Button variant="primary" size="md" onClick={onGoStorage} fullWidth>
                보관함 {uniqueStorageCount}/25
              </Button>
              <Button variant="primary" size="md" onClick={onGoDex} fullWidth>
                도감 {state.discoveredLevels.length}/26
              </Button>
            </div>
          </div>

          {/* 포지 좌: 판매/보관 */}
          <div className={`${styles.panel} ${styles.forgeLeftPanel} ${isForge ? styles.panelVisible : styles.panelOutLeft}`}>
            <div className={styles.panelInner}>
              {isRoundActive && canSell(level) ? (
                <>
                  <span className={styles.panelSectionLabel}>판매</span>
                  <span className={`${styles.sellPrice} ${sellPrice == null ? styles.sellPriceDimmed : ''}`}>
                    {sellPrice != null ? formatGold(sellPrice) : '—'}
                  </span>
                  <Button
                    variant="ghost"
                    size="lg"
                    disabled={isBusy || sellPrice == null}
                    onClick={onSell}
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
                  <span className={styles.panelSectionLabel}>판매 불가</span>
                  <span className={`${styles.sellPrice} ${styles.sellPriceDimmed}`}>여명</span>
                  <Button variant="primary" size="lg" onClick={onStore} fullWidth>
                    보관함에 넣기
                  </Button>
                </>
              ) : (
                <span className={styles.panelSectionLabel}>—</span>
              )}
            </div>
          </div>
        </div>

        {/* ── 중앙: 검 영역 ────────────────────────────────────── */}
        <div className={styles.center}>

          {/* Layer 3: 불씨 파티클 (ambient) */}
          {!prefersReducedMotion && <EmberCanvas active={isForge} />}

          {/* 검 이름 + 레벨 태그 (강화 중 + 라운드 활성) */}
          {isForge && isRoundActive && (
            <div className={styles.swordNameArea}>
              <span className={styles.levelTag} style={{ color: levelColor }}>
                +{displayLevel}
              </span>
              <button
                className={styles.swordName}
                style={{ background: 'none', border: 'none', cursor: isBusy ? 'default' : 'pointer', padding: 0 }}
                disabled={isBusy}
                onClick={() => !isBusy && setShowLore(true)}
              >
                {sword.name}
              </button>
            </div>
          )}

          {/* 강화 플래시 오버레이 */}
          {isForge && (
            <div ref={forgingOverlayRef} className={overlayClass} />
          )}

          {/* 보호 발동 배너 */}
          {isForge && showProtection && (
            <div className={styles.protectionBanner}>
              <span className={styles.protectionIcon}>🛡</span>
              <span className={styles.protectionText}>보호 발동!</span>
              {protectionIsSwordSaint && (
                <span className={styles.protectionSub}>재료 보존됨</span>
              )}
            </div>
          )}

          {/* 검 래퍼 */}
          <div
            ref={swordWrapperRef}
            className={`${styles.swordWrapper} ${isForge && !isBusy && isRoundActive ? styles.swordClickable : ''}`}
            onClick={() => { if (isForge && !isBusy && isRoundActive) setShowLore(true) }}
            title={isForge && isRoundActive && !isBusy ? '검 도안 보기' : undefined}
          >
            <SwordDisplay level={displayLevel} forgePhase={forgePhase} />
          </div>

          {/* 결과 공개 대기 오버레이 */}
          {isForge && forgePhase === 'waiting_reveal' && (
            <div className={styles.revealOverlay} onClick={onReveal}>
              <div className={styles.revealOrb} />
              <span className={styles.revealPrompt}>탭하여 결과 확인</span>
            </div>
          )}

          {/* 홈 — 라운드 없음: 게임 타이틀 오버레이 */}
          {!isForge && !roundActive && (
            <div className={styles.homeOverlay}>
              <div className={styles.gameTitle}>
                <span className={styles.gameTitleText}>검 만들기</span>
                <span className={styles.gameTitleSub}>대장간에서 전설의 검을 완성하라</span>
              </div>
              <Button variant="gold" size="lg" onClick={onGoForge}>강화소 입장</Button>
            </div>
          )}

          {/* 홈 — 라운드 진행 중: 계속하기 오버레이 */}
          {!isForge && roundActive && (
            <div className={styles.continueOverlay}>
              <span className={styles.levelTag} style={{ color: getLevelColor(level) }}>
                +{level}
              </span>
              <Button variant="gold" size="lg" onClick={onGoForge}>강화 계속하기</Button>
            </div>
          )}
        </div>

        {/* ── 우측 패널 슬롯 ──────────────────────────────────── */}
        <div className={styles.panelRight}>

          {/* 홈 우: 칭호 + 통계 */}
          <div className={`${styles.panel} ${styles.homeRightPanel} ${!isForge ? styles.panelVisible : styles.panelOutRight}`}>
            <div className={styles.panelInner}>
              <span className={styles.panelSectionLabel}>칭호</span>
              <button
                className={`${styles.titleSelectBtn} ${roundActive ? styles.titleSelectBtnLocked : ''}`}
                onClick={() => { if (!roundActive) setShowTitleModal(true) }}
              >
                {equippedData?.name ? (
                  <>
                    <span className={styles.titleSelectName}>{equippedData.name}</span>
                    {equippedData.effectDescription && (
                      <span className={styles.titleSelectEffect}>{equippedData.effectDescription}</span>
                    )}
                  </>
                ) : (
                  <span className={styles.titleSelectNone}>칭호 없음</span>
                )}
                <span className={styles.titleSelectHint}>
                  {roundActive ? '🔒 라운드 중' : '▾ 변경'}
                </span>
              </button>

              <div className={styles.panelDivider} />
              <span className={styles.panelSectionLabel}>통계</span>
              <div className={styles.homeStatBlock}>
                <div className={styles.homeStatRow}>
                  <span className={styles.homeStatKey}>골드</span>
                  <span className={`${styles.homeStatVal} ${styles.homeStatGold}`}>{formatGold(state.gold)}</span>
                </div>
                <div className={styles.homeStatRow}>
                  <span className={styles.homeStatKey}>조각</span>
                  <span className={styles.homeStatVal}>{totalFragments}</span>
                </div>
                <div className={styles.homeStatRow}>
                  <span className={styles.homeStatKey}>스크롤</span>
                  <span className={styles.homeStatVal}>{state.scrolls}</span>
                </div>
                <div className={styles.homeStatRow}>
                  <span className={styles.homeStatKey}>보관함</span>
                  <span className={styles.homeStatVal}>{state.storage.length}/25</span>
                </div>
                <div className={styles.homeStatRow}>
                  <span className={styles.homeStatKey}>도감</span>
                  <span className={styles.homeStatVal}>{state.discoveredLevels.length}/26</span>
                </div>
              </div>
            </div>
          </div>

          {/* 포지 우: 강화 컨트롤 */}
          <div className={`${styles.panel} ${styles.forgeRightPanel} ${isForge ? styles.panelVisible : styles.panelOutRight}`}>
            <div className={styles.panelInner}>
              {!isRoundActive ? (
                <>
                  <span className={styles.panelSectionLabel}>강화 대기</span>
                  <Button variant="gold" size="lg" onClick={onStartRound} fullWidth>
                    강화 시작
                  </Button>
                </>
              ) : isMaxLevel ? (
                <span className={`${styles.rateDisplay} ${styles.rateHigh}`}>MAX</span>
              ) : (
                <>
                  <span className={styles.panelSectionLabel}>강화</span>
                  {rate != null && (
                    <span className={`${styles.rateDisplay} ${
                      rate >= 0.6 ? styles.rateHigh :
                      rate >= 0.3 ? styles.rateMedium :
                      rate >= 0.15 ? styles.rateLow :
                      styles.rateVeryLow
                    }`}>
                      {Math.round(rate * 100)}%
                    </span>
                  )}
                  <div className={`${styles.upgradeBtnWrap} ${canForge && forgePhase === 'idle' ? styles.upgradeCharged : ''}`}>
                    <Button
                      variant={canForge ? 'gold' : 'primary'}
                      size="lg"
                      disabled={!canForge}
                      onClick={handleForge}
                      fullWidth
                    >
                      {isForging ? '강화 중…' : isWaitingReveal ? '공개 대기…' : 'UPGRADE'}
                    </Button>
                  </div>
                  <div className={styles.costTag}>
                    cost: <span>{formatGold(cost)}</span>
                  </div>
                  {protectionTitleEquipped && (
                    <span className={styles.indomitableNote}>🛡 보호 칭호 장착 중</span>
                  )}
                  {!canAffordUpgrade(state.gold, level) && (
                    <span className={styles.warnNote}>골드 부족</span>
                  )}
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 검 도안 모달 ══════════════════════════════════════════ */}
      {showLore && (
        <div className={styles.modalBackdrop} onClick={() => setShowLore(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalLevelTag} style={{ color: levelColor }}>
                +{displayLevel}
              </span>
              <span className={styles.modalTitle}>{sword.name}</span>
              <button className={styles.modalClose} onClick={() => setShowLore(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.loreText}>{sword.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* ══ 칭호 선택 모달 ════════════════════════════════════════ */}
      {showTitleModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowTitleModal(false)}>
          <div
            className={`${styles.modal} ${styles.titleModalWide}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>칭호 선택</span>
              <button className={styles.modalClose} onClick={() => setShowTitleModal(false)}>✕</button>
            </div>
            <div className={styles.titleGrid}>
              {/* 칭호 없음 */}
              <button
                className={`${styles.titleCard} ${state.equippedTitle === null ? styles.titleCardEquipped : ''}`}
                onClick={() => { onEquipTitle(null); setShowTitleModal(false) }}
              >
                <span className={styles.cardName}>칭호 없음</span>
                <span className={styles.cardEffect}>효과 없음</span>
                {state.equippedTitle === null && <span className={styles.cardBadge}>장착 중</span>}
              </button>

              {DISPLAY_TITLE_IDS.map((id) => {
                const data = titlesData[id]
                const isUnlocked = state.unlockedTitles.includes(id)
                const isEquipped = state.equippedTitle === id
                const skip = getSkipInfo(id)

                return (
                  <button
                    key={id}
                    className={[
                      styles.titleCard,
                      isEquipped ? styles.titleCardEquipped : '',
                      !isUnlocked ? styles.titleCardLocked : '',
                    ].join(' ')}
                    disabled={!isUnlocked}
                    onClick={() => {
                      if (isUnlocked) { onEquipTitle(id); setShowTitleModal(false) }
                    }}
                  >
                    {isUnlocked ? (
                      <>
                        <span className={styles.cardName}>{data.name}</span>
                        <span className={styles.cardEffect}>{data.effectDescription}</span>
                        {titleProtection[id] && (
                          <span className={styles.cardProtection}>
                            🛡 {Math.round(titleProtection[id].chance * 100)}% 보호
                            {titleProtection[id].materialPreserveOnProtect && ' + 재료 보존'}
                          </span>
                        )}
                        {skip && (
                          <span className={styles.cardSkip}>
                            건너뛰기: +0→+{skip.targetLevel}
                            {skip.gold != null && skip.gold > 0
                              ? ` (${skip.gold.toLocaleString('ko-KR')}G`
                              : ' (무료'}
                            {skip.fragmentId && skip.fragmentCount > 0
                              ? ` + ${fragName(skip.fragmentId)} ×${skip.fragmentCount})`
                              : ')'}
                          </span>
                        )}
                        <span className={styles.cardCondition}>{data.condition}</span>
                        {isEquipped && <span className={styles.cardBadge}>장착 중</span>}
                      </>
                    ) : (
                      <>
                        <span className={`${styles.cardName} ${styles.cardNameLocked}`}>???</span>
                        <span className={styles.cardCondition}>{data.condition}</span>
                        <span className={styles.lockIcon}>🔒</span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
