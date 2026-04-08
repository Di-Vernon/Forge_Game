/**
 * SwordDisplay.tsx
 * PNG 이미지 + CSS/SVG 이펙트 오버레이 방식.
 * 검 본체: public/sprites/swords/sword_XX.png (128×128 픽셀아트)
 * 이펙트: SwordEffects.tsx (13개 검 고유 CSS 이펙트)
 */

import type { ForgePhase } from '../../../hooks/useGameState'
import { getSwordImagePath, getSwordGlowColor } from '../../../utils/swordImage'
import SwordEffects from './SwordEffects'

// ── 검별 표시 크기 (px) ─────────────────────────────────────────
const SWORD_SIZES: Record<number, { width: number; height: number }> = {
  // Block 1
  0:  { width: 80,  height: 80  },
  1:  { width: 90,  height: 90  },
  2:  { width: 100, height: 100 },
  3:  { width: 96,  height: 96  },
  4:  { width: 110, height: 110 },
  5:  { width: 120, height: 120 },
  6:  { width: 110, height: 110 },
  7:  { width: 115, height: 115 },
  // Block 2
  8:  { width: 130, height: 130 },
  9:  { width: 125, height: 125 },
  10: { width: 135, height: 135 },
  11: { width: 140, height: 140 },
  12: { width: 145, height: 145 },
  // Block 3
  13: { width: 160, height: 160 },
  14: { width: 190, height: 190 },
  15: { width: 180, height: 180 },
  16: { width: 170, height: 170 },
  // Block 4
  17: { width: 180, height: 180 },
  18: { width: 210, height: 210 },
  19: { width: 210, height: 210 },
  20: { width: 220, height: 220 },
  21: { width: 230, height: 230 },
  22: { width: 150, height: 150 },
  // Block 5~6
  23: { width: 200, height: 200 },
  24: { width: 250, height: 250 },
  25: { width: 260, height: 260 },
}

const DEFAULT_SIZE = { width: 100, height: 100 }

interface Props {
  level: number
  forgePhase: ForgePhase
}

export default function SwordDisplay({ level, forgePhase }: Props) {
  const isAnimating = forgePhase === 'forging' || forgePhase === 'waiting_reveal'
  const isSuccess = forgePhase === 'success'
  const isFail = forgePhase === 'fail' || forgePhase === 'near_miss'

  const overlayColor = isSuccess
    ? 'rgba(88,160,48,0.25)'
    : isFail
    ? 'rgba(176,40,32,0.25)'
    : isAnimating
    ? 'rgba(200,144,40,0.15)'
    : 'transparent'

  const size = SWORD_SIZES[level] ?? DEFAULT_SIZE
  const glowColor = getSwordGlowColor(level)
  const glowFilter = glowColor
    ? `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 24px ${glowColor}40)`
    : undefined

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      {/* 배경 오버레이 (성공/실패 플래시) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: overlayColor,
          transition: 'background 0.15s',
          pointerEvents: 'none',
        }}
      />

      {/* 검 래퍼 — 대각선 회전 */}
      <div
        style={{
          transform: 'rotate(-45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* 검 PNG 이미지 */}
        <img
          src={getSwordImagePath(level)}
          alt={`+${level}강 검`}
          draggable={false}
          style={{
            width: size.width,
            height: size.height,
            imageRendering: 'pixelated',
            filter: glowFilter,
            userSelect: 'none',
          }}
        />

        {/* 이펙트 오버레이 */}
        <div
          style={{
            position: 'absolute',
            width: size.width,
            height: size.height,
          }}
        >
          <SwordEffects level={level} />
        </div>
      </div>
    </div>
  )
}
