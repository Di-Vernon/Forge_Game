/**
 * HomeScreen.tsx
 * 게임 허브. 강화소/상점·조합소/보관함 진입 + 칭호 장착.
 */

import { useState } from 'react'
import styles from './HomeScreen.module.css'
import Button from '../ui/Button'
import type { GameState, TitleId } from '../../types'
import configJson from '../../data/config.json'

// ── 데이터 ─────────────────────────────────────────────────────

interface TitleEntry {
  name: string | null
  condition: string | null
  effectDescription: string | null
}

const titlesData = configJson.titles as Record<string, TitleEntry>

// 이름이 확정된 칭호만 UI에 표시 (title_8, title_9 제외)
const DISPLAY_TITLE_IDS = (Object.entries(titlesData) as [TitleId, TitleEntry][])
  .filter(([, v]) => v.name !== null)
  .map(([id]) => id)

function formatGold(g: number): string {
  return g.toLocaleString('ko-KR') + ' G'
}

// ── 칭호 선택 모달 ──────────────────────────────────────────────

interface TitleModalProps {
  unlockedTitles: TitleId[]
  equipped: TitleId | null
  onEquip: (id: TitleId | null) => void
  onClose: () => void
}

function TitleModal({ unlockedTitles, equipped, onEquip, onClose }: TitleModalProps) {
  function handleSelect(id: TitleId | null) {
    onEquip(id)
    onClose()
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>칭호 선택</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.titleGrid}>
          {/* 칭호 없음 옵션 */}
          <button
            className={`${styles.titleCard} ${equipped === null ? styles.titleCardEquipped : ''}`}
            onClick={() => handleSelect(null)}
          >
            <span className={styles.cardName}>칭호 없음</span>
            <span className={styles.cardEffect}>효과 없음</span>
            {equipped === null && <span className={styles.cardBadge}>장착 중</span>}
          </button>

          {/* 칭호 목록 */}
          {DISPLAY_TITLE_IDS.map((id) => {
            const data = titlesData[id]
            const isUnlocked = unlockedTitles.includes(id)
            const isEquipped = equipped === id

            return (
              <button
                key={id}
                className={[
                  styles.titleCard,
                  isEquipped ? styles.titleCardEquipped : '',
                  !isUnlocked ? styles.titleCardLocked : '',
                ].join(' ')}
                disabled={!isUnlocked}
                onClick={() => isUnlocked && handleSelect(id)}
              >
                {isUnlocked ? (
                  <>
                    <span className={styles.cardName}>{data.name}</span>
                    <span className={styles.cardEffect}>{data.effectDescription}</span>
                    <span className={styles.cardCondition}>{data.condition}</span>
                    {isEquipped && <span className={styles.cardBadge}>장착 중</span>}
                  </>
                ) : (
                  <>
                    <span className={`${styles.cardName} ${styles.locked}`}>???</span>
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
  )
}

// ── Props ───────────────────────────────────────────────────────

interface Props {
  state: GameState
  bgmOn: boolean
  onBgmToggle: () => void
  onGoForge: () => void
  onGoShopCraft: () => void
  onGoStorage: () => void
  onEquipTitle: (id: TitleId | null) => void
}

// ── 컴포넌트 ────────────────────────────────────────────────────

export default function HomeScreen({
  state,
  bgmOn,
  onBgmToggle,
  onGoForge,
  onGoShopCraft,
  onGoStorage,
  onEquipTitle,
}: Props) {
  const [showTitleModal, setShowTitleModal] = useState(false)

  const totalFragments = Object.values(state.fragments).reduce((a, b) => a + b, 0)
  const equippedData = state.equippedTitle ? titlesData[state.equippedTitle] : null
  const uniqueStorageCount = new Set(state.storage).size
  // 라운드 진행 중이면 칭호 잠금 (브라우저 재진입 포함)
  const roundActive = state.currentRound !== null

  return (
    <div className={styles.screen}>
      {/* ── 헤더 ────────────────────────────────── */}
      <header className={styles.header}>
        <button
          className={`${styles.bgmBtn} ${bgmOn ? styles.bgmOn : ''}`}
          onClick={onBgmToggle}
        >
          ♪ BGM {bgmOn ? 'ON' : 'OFF'}
        </button>

        <div className={styles.headerStats}>
          {totalFragments > 0 && (
            <span className={styles.headerStat}>
              <span className={styles.headerStatLabel}>조각</span>
              <span className={styles.headerStatVal}>{totalFragments}</span>
            </span>
          )}
          <span className={styles.headerStat}>
            <span className={styles.headerStatLabel}>스크롤</span>
            <span className={styles.headerStatVal}>{state.scrolls}</span>
          </span>
        </div>
      </header>

      {/* ── 메인 ────────────────────────────────── */}
      <main className={styles.main}>
        {/* 게임 타이틀 */}
        <div className={styles.titleSection}>
          <div className={styles.titleDecor}>⚔</div>
          <h1 className={styles.gameTitle}>검 만들기</h1>
          <div className={styles.titleSubtext}>대장간에서 전설의 검을 완성하라</div>
        </div>

        {/* 칭호 선택 — 라운드 진행 중에는 잠금 */}
        <button
          className={`${styles.titleBadge} ${roundActive ? styles.titleBadgeLocked : ''}`}
          onClick={() => !roundActive && setShowTitleModal(true)}
          title={roundActive ? '라운드 중 칭호 변경 불가' : '칭호 변경'}
          aria-disabled={roundActive}
        >
          {equippedData?.name
            ? <><span className={styles.titleStar}>★</span> {equippedData.name} <span className={styles.titleStar}>★</span></>
            : <span className={styles.titleNone}>칭호 없음</span>
          }
          {!roundActive && <span className={styles.titleEditHint}>▾</span>}
          {roundActive  && <span className={styles.titleLockHint}>🔒</span>}
        </button>

        {/* 강화소 입장 / 강화 계속하기 */}
        <Button variant="gold" size="lg" onClick={onGoForge}>
          {roundActive ? '강화 계속하기' : '강화소 입장'}
        </Button>

        {/* 보조 네비게이션 */}
        <div className={styles.navRow}>
          <Button variant="primary" size="md" onClick={onGoShopCraft}>
            상점 / 조합소
          </Button>
          <Button variant="primary" size="md" onClick={onGoStorage}>
            보관함 {uniqueStorageCount}/25
          </Button>
        </div>
      </main>

      {/* ── 하단 골드 표시 ──────────────────────── */}
      <footer className={styles.footer}>
        <span className={styles.footerLabel}>GOLD</span>
        <span className={styles.footerGold}>{formatGold(state.gold)}</span>
      </footer>

      {/* ── 칭호 선택 모달 ──────────────────────── */}
      {showTitleModal && (
        <TitleModal
          unlockedTitles={state.unlockedTitles}
          equipped={state.equippedTitle}
          onEquip={onEquipTitle}
          onClose={() => setShowTitleModal(false)}
        />
      )}
    </div>
  )
}
