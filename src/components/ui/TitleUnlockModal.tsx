/**
 * TitleUnlockModal.tsx
 * 칭호 획득 시 표시되는 알림 모달. App 최상위에서 렌더링.
 * 여러 칭호 동시 획득 → 하나씩 순차 표시 (onDismiss마다 slice).
 * 이스터에그 칭호(mythic_tale): bronze → glitch → gold 연출.
 */

import { useState, useEffect } from 'react'
import styles from './TitleUnlockModal.module.css'
import type { TitleId } from '../../types'
import configJson from '../../data/config.json'
import { soundManager } from '../../audio/SoundManager'

interface TitleEntry {
  name: string | null
  condition: string | null
  effectDescription: string | null
}
const titlesData = configJson.titles as Record<string, TitleEntry>

const EASTER_EGG_TITLES = new Set<TitleId>(['mythic_tale'])

type EggPhase = 'bronze' | 'glitching' | 'gold'

interface Props {
  titleId: TitleId
  onDismiss: () => void
}

export default function TitleUnlockModal({ titleId, onDismiss }: Props) {
  const entry = titlesData[titleId]
  if (!entry || entry.name === null) return null

  const isEasterEgg = EASTER_EGG_TITLES.has(titleId)

  return isEasterEgg
    ? <EasterEggModal entry={entry} onDismiss={onDismiss} />
    : <NormalModal entry={entry} onDismiss={onDismiss} />
}

// ── 일반 칭호 모달 ──────────────────────────────────────────────

function NormalModal({ entry, onDismiss }: { entry: TitleEntry; onDismiss: () => void }) {
  useEffect(() => {
    void soundManager.init().then(() => soundManager.play('title_unlock'))
  }, [])

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.starRow} aria-hidden="true">
          <span className={styles.star}>★</span>
          <span className={styles.star}>★</span>
          <span className={styles.star}>★</span>
        </div>

        <div className={styles.acquired}>칭호 획득</div>
        <div className={styles.titleName}>{entry.name}</div>
        <div className={styles.divider} />

        {entry.effectDescription && (
          <div className={styles.effect}>{entry.effectDescription}</div>
        )}
        {entry.condition && (
          <div className={styles.condition}>획득 조건: {entry.condition}</div>
        )}

        <button className={styles.confirmBtn} onClick={onDismiss} autoFocus>
          확인
        </button>
      </div>
    </div>
  )
}

// ── 이스터에그 칭호 모달 ────────────────────────────────────────

function EasterEggModal({ entry, onDismiss }: { entry: TitleEntry; onDismiss: () => void }) {
  const [phase, setPhase] = useState<EggPhase>('bronze')

  useEffect(() => {
    // bronze → glitch → gold 자동 전환
    const t1 = setTimeout(() => {
      setPhase('glitching')
      void soundManager.init().then(() => soundManager.play('title_easter_egg'))
    }, 1600)
    const t2 = setTimeout(() => setPhase('gold'), 2500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const modalClass = [
    styles.modal,
    styles.eggModal,
    phase === 'glitching' ? styles.eggGlitching : '',
    phase === 'gold'      ? styles.eggGold       : '',
  ].join(' ')

  return (
    <div className={styles.backdrop}>
      <div className={modalClass}>
        {/* 별 장식 */}
        <div className={styles.starRow} aria-hidden="true">
          <span className={`${styles.star} ${phase === 'gold' ? styles.eggStar : ''}`}>★</span>
          <span className={`${styles.star} ${phase === 'gold' ? styles.eggStar : ''}`}>★</span>
          <span className={`${styles.star} ${phase === 'gold' ? styles.eggStar : ''}`}>★</span>
        </div>

        <div className={`${styles.acquired} ${phase !== 'bronze' ? styles.eggAcquired : ''}`}>
          {phase === 'bronze' ? '칭호 획득' : phase === 'glitching' ? '칭호 획득' : '✦ 전설 칭호 해금 ✦'}
        </div>

        <div className={`${styles.titleName} ${phase === 'gold' ? styles.eggTitleName : phase === 'glitching' ? styles.eggGlitchText : ''}`}
             data-text={entry.name}
        >
          {entry.name}
        </div>

        <div className={styles.divider} />

        {entry.effectDescription && (
          <div className={styles.effect}>{entry.effectDescription}</div>
        )}
        {entry.condition && (
          <div className={styles.condition}>획득 조건: {entry.condition}</div>
        )}

        {/* 확인 버튼 — gold 단계에서만 활성화 */}
        <button
          className={`${styles.confirmBtn} ${phase === 'gold' ? styles.eggConfirmBtn : styles.eggConfirmHidden}`}
          onClick={phase === 'gold' ? onDismiss : undefined}
          disabled={phase !== 'gold'}
          autoFocus={phase === 'gold'}
        >
          확인
        </button>
      </div>
    </div>
  )
}
