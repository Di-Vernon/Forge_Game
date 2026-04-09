/**
 * SwordDisplay.tsx
 * PNG 이미지 + CSS/SVG 이펙트 오버레이 방식.
 * 검 본체: public/sprites/swords/sword_XX.png (128×128 픽셀아트)
 * 이펙트: SwordEffects.tsx (13개 검 고유 CSS 이펙트)
 *
 * v2 변경:
 *  - 크기 450~520px 균일 (Block별 310~620px → 폐기)
 *  - rotate(-45deg) 제거 — 원본 PNG 방향 그대로 표시
 */

import type { ForgePhase } from '../../../hooks/useGameState'
import { getSwordImagePath, getSwordGlowColor } from '../../../utils/swordImage'
import SwordEffects from './SwordEffects'

// ── 검별 표시 크기 (px) — 450~520 균일 ────────────────────────────
const SWORD_SIZES: Record<number, number> = {
  // Block 1 (+0~+7): 450~470
  0:  450,
  1:  452,
  2:  455,
  3:  454,
  4:  458,
  5:  462,
  6:  458,
  7:  465,
  // Block 2 (+8~+12): 470~485
  8:  472,
  9:  470,
  10: 476,
  11: 480,
  12: 484,
  // Block 3 (+13~+16): 488~500
  13: 490,
  14: 496,
  15: 492,
  16: 488,
  // Block 4 (+17~+22): 480~515
  17: 492,
  18: 500,
  19: 503,
  20: 508,
  21: 512,
  22: 480,  // 아크라이트 = 단검, 상대적으로 작게
  // Block 5~6 (+23~+25): 515~520
  23: 515,
  24: 518,
  25: 520,
}

const DEFAULT_SIZE = 460

// ── 강화 레벨별 색상 ───────────────────────────────────────────────
export function getLevelColor(level: number): string {
  if (level <= 3)  return '#5a4a3a'
  if (level <= 6)  return '#e8d8b4'
  if (level <= 9)  return '#88ccff'
  if (level <= 12) return '#88dd88'
  if (level <= 15) return '#cc88ff'
  if (level <= 19) return '#e89030'
  if (level <= 24) return '#f0b848'
  return '#ff8844'  // +25
}

interface Props {
  level: number
  forgePhase: ForgePhase
}

export default function SwordDisplay({ level, forgePhase }: Props) {
  const isAnimating = forgePhase === 'forging' || forgePhase === 'waiting_reveal'
  const isSuccess = forgePhase === 'success'
  const isFail = forgePhase === 'fail' || forgePhase === 'near_miss'

  const overlayColor = isSuccess
    ? 'rgba(88,160,48,0.22)'
    : isFail
    ? 'rgba(139,37,0,0.28)'
    : isAnimating
    ? 'rgba(200,144,40,0.12)'
    : 'transparent'

  const size = SWORD_SIZES[level] ?? DEFAULT_SIZE
  const glowColor = getSwordGlowColor(level)
  const glowFilter = glowColor
    ? `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 28px ${glowColor}40)`
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

      {/* 검 래퍼 — 회전 없음, 원본 PNG 방향 그대로 */}
      <div
        style={{
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
            width: size,
            height: size,
            imageRendering: 'pixelated',
            filter: glowFilter,
            userSelect: 'none',
            maxWidth: '97%',
            maxHeight: '97%',
            objectFit: 'contain',
          }}
        />

        {/* 이펙트 오버레이 */}
        <div
          style={{
            position: 'absolute',
            width: size,
            height: size,
            maxWidth: '97%',
            maxHeight: '97%',
          }}
        >
          <SwordEffects level={level} />
        </div>
      </div>
    </div>
  )
}
