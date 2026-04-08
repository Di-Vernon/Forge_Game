/**
 * StorageScreen.tsx
 * 보관함 — 1~25강 고정 25칸 도감 그리드.
 * 보관한 적 있으면 밝게 + 수량 / 없으면 어둡게 + 자물쇠.
 */

import { useState } from 'react'
import styles from './StorageScreen.module.css'
import Button from '../ui/Button'
import type { GameState } from '../../types'
import swordsData from '../../data/swords.json'

// ── 색상 설정 (SwordDisplay와 동일 체계) ────────────────────────

interface SwordCfg {
  bladeColor: string
  guardColor: string
  gripColor: string
  accentColor: string
  glowColor: string | null
}

function getSwordCfg(level: number): SwordCfg {
  if (level >= 25) return { bladeColor: '#f0f4ff', guardColor: '#c8d8ff', gripColor: '#a0b8e8', accentColor: '#ffffff', glowColor: '#c0d8ff' }
  if (level >= 23) return { bladeColor: '#cc3010', guardColor: '#882010', gripColor: '#601808', accentColor: '#ff5030', glowColor: '#ff4020' }
  if (level >= 17) return { bladeColor: '#d4a820', guardColor: '#a07810', gripColor: '#705008', accentColor: '#ffe060', glowColor: '#ffd030' }
  if (level >= 13) return { bladeColor: '#9040c0', guardColor: '#602880', gripColor: '#401860', accentColor: '#c070ff', glowColor: '#a050e0' }
  if (level >= 8)  return { bladeColor: '#3870c8', guardColor: '#204880', gripColor: '#182858', accentColor: '#60a0ff', glowColor: '#4488dd' }
  if (level >= 4)  return { bladeColor: '#408840', guardColor: '#285828', gripColor: '#503820', accentColor: '#80cc60', glowColor: null }
  if (level >= 2)  return { bladeColor: '#c8c8c8', guardColor: '#909090', gripColor: '#503820', accentColor: '#e8e8e8', glowColor: null }
  return               { bladeColor: '#908060', guardColor: '#605040', gripColor: '#503820', accentColor: '#b0a080', glowColor: null }
}

// ── 미니 검 SVG ─────────────────────────────────────────────────

function MiniSword({ level }: { level: number }) {
  const cfg = getSwordCfg(level)
  const filterStyle: React.CSSProperties = cfg.glowColor
    ? { filter: `drop-shadow(0 0 3px ${cfg.glowColor}) drop-shadow(0 0 8px ${cfg.glowColor}50)` }
    : {}

  return (
    <svg
      viewBox="0 0 64 200"
      width="24"
      height="75"
      style={{ ...filterStyle, shapeRendering: 'crispEdges' }}
      aria-hidden="true"
    >
      <polygon points="32,0 28,20 36,20" fill={cfg.bladeColor} />
      <rect x="28" y="18" width="8" height="108" fill={cfg.bladeColor} />
      {level >= 8 && (
        <rect x="31" y="28" width="2" height="88" fill={cfg.accentColor} opacity="0.5" />
      )}
      <rect x="10" y="118" width="44" height="10" fill={cfg.guardColor} />
      {level >= 13 && (
        <>
          <rect x="6"  y="120" width="8" height="6" fill={cfg.accentColor} />
          <rect x="50" y="120" width="8" height="6" fill={cfg.accentColor} />
        </>
      )}
      <rect x="29" y="128" width="6" height="44" fill={cfg.gripColor} />
      {[134, 142, 150, 158].map((y) => (
        <rect key={y} x="27" y={y} width="10" height="3" fill={cfg.guardColor} opacity="0.7" />
      ))}
      <rect x="24" y="172" width="16" height="14" fill={cfg.guardColor} />
      {level >= 17 && (
        <rect x="28" y="174" width="8" height="10" fill={cfg.accentColor} opacity="0.8" />
      )}
      {level === 25 && (
        <>
          <line x1="32" y1="-10" x2="32" y2="210" stroke="#c0d8ff" strokeWidth="1" opacity="0.4" />
          <line x1="-10" y1="128" x2="74" y2="128" stroke="#c0d8ff" strokeWidth="1" opacity="0.4" />
        </>
      )}
    </svg>
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
  const cfg = getSwordCfg(level)
  const levelColor = cfg.glowColor ?? cfg.accentColor
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
  const cfg = getSwordCfg(level)
  const levelColor = cfg.glowColor ?? cfg.accentColor

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

// ── 메인 컴포넌트 ────────────────────────────────────────────────

interface Props {
  state: GameState
  onBack: () => void
}

export default function StorageScreen({ state, onBack }: Props) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

  // 레벨별 보유 수량
  const countByLevel: Record<number, number> = {}
  for (const l of state.storage) {
    countByLevel[l] = (countByLevel[l] ?? 0) + 1
  }

  const uniqueCount = Object.keys(countByLevel).length

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

      {/* ── 상세 모달 ────────────────────── */}
      {selectedLevel !== null && (
        <LoreModal
          level={selectedLevel}
          onClose={() => setSelectedLevel(null)}
        />
      )}
    </div>
  )
}
