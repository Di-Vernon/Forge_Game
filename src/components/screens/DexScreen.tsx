/**
 * DexScreen.tsx
 * 도감 — 지금까지 도달한 검 목록을 열람.
 */

import { useState } from 'react'
import styles from './DexScreen.module.css'
import Button from '../ui/Button'
import type { GameState } from '../../types'
import swordsData from '../../data/swords.json'

// ── Block 라벨 ─────────────────────────────────────────────────
const BLOCK_LABELS: Record<number, string> = {
  1: 'Block 1 · +0 ~ +7',
  2: 'Block 2 · +8 ~ +12',
  3: 'Block 3 · +13 ~ +17',
  4: 'Block 4 · +18 ~ +22',
  5: 'Block 5 · +23 ~ +24',
  6: 'Block 6 · +25',
}

// ── Props ──────────────────────────────────────────────────────
interface Props {
  state: GameState
  onBack: () => void
}

// ── 컴포넌트 ───────────────────────────────────────────────────
export default function DexScreen({ state, onBack }: Props) {
  const [viewingSword, setViewingSword] = useState<typeof swordsData[number] | null>(null)

  const discovered = new Set(state.discoveredLevels)
  const discoveredCount = discovered.size

  // Block별 그룹 렌더링
  let lastBlock = 0

  return (
    <div className={styles.screen}>
      {/* ── 헤더 ────────────────────────────────── */}
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← 돌아가기
        </Button>
        <span className={styles.headerTitle}>도감</span>
        <span className={styles.headerCount}>
          <span className={styles.headerCountNum}>{discoveredCount}</span>/26
        </span>
      </header>

      {/* ── 검 리스트 ────────────────────────────── */}
      <div className={styles.list}>
        {swordsData.map((sword) => {
          const isDiscovered = discovered.has(sword.level)
          const block = sword.block
          const showDivider = block !== lastBlock
          lastBlock = block

          const accentClass =
            block === 1 ? styles.accentBlock1 :
            block === 2 ? styles.accentBlock2 :
            block === 3 ? styles.accentBlock3 :
            block === 4 ? styles.accentBlock4 :
            block === 5 ? styles.accentBlock5 :
            styles.accentBlock6

          return (
            <div key={sword.level}>
              {showDivider && (
                <div className={styles.blockDivider}>
                  {BLOCK_LABELS[block] ?? `Block ${block}`}
                </div>
              )}
              <button
                className={`${styles.entry} ${!isDiscovered ? styles.entryLocked : ''}`}
                onClick={() => isDiscovered && setViewingSword(sword)}
                disabled={!isDiscovered}
              >
                <div className={`${styles.accentBar} ${accentClass}`} />
                <span className={`${styles.entryLevel} ${!isDiscovered ? styles.lockedLevel : ''}`}>
                  +{sword.level}
                </span>
                <span className={`${styles.entryName} ${!isDiscovered ? styles.lockedName : ''}`}>
                  {isDiscovered ? sword.name : '???'}
                </span>
                {isDiscovered
                  ? <span className={styles.entryStatus}>&#10003;</span>
                  : <span className={styles.entryLock}>&#128274;</span>
                }
              </button>
            </div>
          )
        })}
      </div>

      {/* ── 검 도안 모달 ────────────────────────── */}
      {viewingSword && (
        <div className={styles.loreBackdrop} onClick={() => setViewingSword(null)}>
          <div className={styles.loreModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.loreHeader}>
              <span className={styles.loreLevelTag}>+{viewingSword.level}</span>
              <span className={styles.loreTitle}>{viewingSword.name}</span>
              <button className={styles.loreClose} onClick={() => setViewingSword(null)}>
                &#10005;
              </button>
            </div>
            <div className={styles.loreBody}>
              <p className={styles.loreText}>{viewingSword.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
