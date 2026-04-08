/**
 * StorageScreen.tsx
 * 보관함 — 1~25강 고정 25칸 도감 그리드.
 * 보관한 적 있으면 밝게 + 수량 / 없으면 어둡게 + 자물쇠.
 */

import { useState } from 'react'
import styles from './StorageScreen.module.css'
import Button from '../ui/Button'
import type { GameState } from '../../types'
import { getSwordImagePath, getSwordGlowColor } from '../../utils/swordImage'
import { getSellPrice, canSell } from '../../game/economy'
import swordsData from '../../data/swords.json'

// ── 미니 검 PNG ─────────────────────────────────────────────────

function MiniSword({ level }: { level: number }) {
  const glowColor = getSwordGlowColor(level)
  return (
    <img
      src={getSwordImagePath(level)}
      alt={`+${level}`}
      draggable={false}
      style={{
        width: 48,
        height: 48,
        imageRendering: 'pixelated',
        filter: glowColor
          ? `drop-shadow(0 0 3px ${glowColor}) drop-shadow(0 0 8px ${glowColor}50)`
          : undefined,
        userSelect: 'none',
      }}
    />
  )
}

// ── 도감 슬롯 ───────────────────────────────────────────────────

interface SlotProps {
  level: number
  count: number
  onClick: () => void
}

function Slot({ level, count, onClick }: SlotProps) {
  const owned = count > 0
  const sword = swordsData.find((s) => s.level === level)!
  const glowColor = getSwordGlowColor(level)
  const levelColor = glowColor ?? '#b0a080'
  const isLegendary = level === 25

  return (
    <button
      className={`${styles.slot} ${owned ? styles.slotOwned : styles.slotEmpty} ${isLegendary ? styles.slotLegendary : ''}`}
      onClick={onClick}
      disabled={!owned}
      title={owned ? `+${level} ${sword.name}` : `+${level} — 미보관`}
    >
      {count > 1 && (
        <span className={styles.countBadge}>×{count}</span>
      )}

      <span
        className={styles.slotLevel}
        style={owned ? { color: levelColor } : undefined}
      >
        +{level}
      </span>

      <div className={styles.slotSword}>
        {owned
          ? <MiniSword level={level} />
          : <span className={styles.lockIcon}>🔒</span>
        }
      </div>

      <span className={`${styles.slotName} ${!owned ? styles.slotNameEmpty : ''}`}>
        {owned ? sword.name : '???'}
      </span>
    </button>
  )
}

// ── 도감 상세 모달 ───────────────────────────────────────────────

interface LoreModalProps {
  level: number
  onClose: () => void
}

function LoreModal({ level, onClose }: LoreModalProps) {
  const sword = swordsData.find((s) => s.level === level)!
  const glowColor = getSwordGlowColor(level)
  const levelColor = glowColor ?? '#b0a080'

  return (
    <div className={styles.loreBackdrop} onClick={onClose}>
      <div className={styles.loreModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.loreHeader}>
          <span className={styles.loreLevel} style={{ color: levelColor }}>+{level}</span>
          <span className={styles.loreName}>{sword.name}</span>
          <button className={styles.loreClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.loreBody}>
          <p className={styles.loreText}>{sword.description}</p>
        </div>
      </div>
    </div>
  )
}

// ── 액션 모달 (판매/강화 계속) ───────────────────────────────────

interface ActionModalProps {
  level: number
  count: number
  equippedTitle: GameState['equippedTitle']
  isRoundActive: boolean
  onSell: () => void
  onContinue: () => void
  onViewLore: () => void
  onClose: () => void
}

function ActionModal({
  level, count, equippedTitle, isRoundActive,
  onSell, onContinue, onViewLore, onClose,
}: ActionModalProps) {
  const sword = swordsData.find((s) => s.level === level)!
  const glowColor = getSwordGlowColor(level)
  const levelColor = glowColor ?? '#b0a080'
  const sellable = canSell(level)
  const price = sellable ? getSellPrice(level, equippedTitle) : 0

  return (
    <div className={styles.loreBackdrop} onClick={onClose}>
      <div className={styles.loreModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.loreHeader}>
          <span className={styles.loreLevel} style={{ color: levelColor }}>+{level}</span>
          <span className={styles.loreName}>{sword.name}</span>
          {count > 1 && <span className={styles.loreCount}>x{count}</span>}
          <button className={styles.loreClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.actionBody}>
          <div className={styles.actionSword}>
            <MiniSword level={level} />
          </div>
          <div className={styles.actionButtons}>
            <Button
              variant="ghost"
              size="lg"
              disabled={!sellable}
              onClick={onSell}
              fullWidth
            >
              {sellable ? `판매 (${price.toLocaleString('ko-KR')} G)` : '판매 불가'}
            </Button>
            <Button
              variant="gold"
              size="lg"
              disabled={isRoundActive}
              onClick={onContinue}
              fullWidth
            >
              {isRoundActive ? '라운드 진행 중' : '강화 계속'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewLore}
              fullWidth
            >
              도안 보기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────

interface Props {
  state: GameState
  isRoundActive: boolean
  onBack: () => void
  onSellFromStorage: (slotIndex: number) => void
  onContinueFromStorage: (slotIndex: number) => void
}

export default function StorageScreen({
  state, isRoundActive, onBack,
  onSellFromStorage, onContinueFromStorage,
}: Props) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [viewingLore, setViewingLore] = useState<number | null>(null)

  // 레벨별 보유 수량
  const countByLevel: Record<number, number> = {}
  for (const l of state.storage) {
    countByLevel[l] = (countByLevel[l] ?? 0) + 1
  }

  const uniqueCount = Object.keys(countByLevel).length

  function handleSell(level: number) {
    const idx = state.storage.indexOf(level)
    if (idx >= 0) {
      onSellFromStorage(idx)
      setSelectedLevel(null)
    }
  }

  function handleContinue(level: number) {
    const idx = state.storage.indexOf(level)
    if (idx >= 0) {
      onContinueFromStorage(idx)
      setSelectedLevel(null)
    }
  }

  return (
    <div className={styles.screen}>
      {/* ── 헤더 ─────────────────────────── */}
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={onBack}>← 돌아가기</Button>
        <span className={styles.headerTitle}>보관함</span>
        <span className={styles.headerCount}>
          <span className={styles.countNum}>{uniqueCount}</span>
          <span className={styles.countDen}> / 25</span>
          {uniqueCount > 0 && uniqueCount < 25 && (
            <span className={styles.mythProgress}> · 신화 {uniqueCount}/25</span>
          )}
          {uniqueCount === 25 && (
            <span className={styles.mythComplete}> · 신화 달성!</span>
          )}
        </span>
      </header>

      {/* ── 도감 그리드 ──────────────────── */}
      <main className={styles.main}>
        <div className={styles.grid}>
          {Array.from({ length: 25 }, (_, i) => i + 1).map((level) => (
            <Slot
              key={level}
              level={level}
              count={countByLevel[level] ?? 0}
              onClick={() => setSelectedLevel(level)}
            />
          ))}
        </div>
      </main>

      {/* ── 액션 모달 ────────────────────── */}
      {selectedLevel !== null && (
        <ActionModal
          level={selectedLevel}
          count={countByLevel[selectedLevel] ?? 0}
          equippedTitle={state.equippedTitle}
          isRoundActive={isRoundActive}
          onSell={() => handleSell(selectedLevel)}
          onContinue={() => handleContinue(selectedLevel)}
          onViewLore={() => { setViewingLore(selectedLevel); setSelectedLevel(null) }}
          onClose={() => setSelectedLevel(null)}
        />
      )}

      {/* ── 도안 모달 ────────────────────── */}
      {viewingLore !== null && (
        <LoreModal
          level={viewingLore}
          onClose={() => setViewingLore(null)}
        />
      )}
    </div>
  )
}
