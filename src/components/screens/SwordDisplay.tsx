/**
 * SwordDisplay.tsx
 * 검 레벨에 따라 픽셀아트 스타일 SVG 검을 렌더링.
 * 추후 public/sprites/ 스프라이트가 준비되면 이 컴포넌트를 교체.
 */

import type { ForgePhase } from '../../hooks/useGameState'

interface SwordConfig {
  bladeColor: string
  guardColor: string
  gripColor: string
  accentColor: string
  glowColor: string | null
}

// 리서치 3 기준: 회색 → 흰색 → 초록 → 파랑 → 보라 → 금 → 다색/특수
function getConfig(level: number): SwordConfig {
  if (level >= 25)
    // Phase 6: 여명 — 순백 + 청백 광채
    return { bladeColor: '#f0f4ff', guardColor: '#c8d8ff', gripColor: '#a0b8e8', accentColor: '#ffffff', glowColor: '#c0d8ff' }
  if (level >= 23)
    // Phase 5: 격노/태초 — 심홍 + 암적색
    return { bladeColor: '#cc3010', guardColor: '#882010', gripColor: '#601808', accentColor: '#ff5030', glowColor: '#ff4020' }
  if (level >= 17)
    // Phase 4: 금 (백야~아크라이트)
    return { bladeColor: '#d4a820', guardColor: '#a07810', gripColor: '#705008', accentColor: '#ffe060', glowColor: '#ffd030' }
  if (level >= 13)
    // Phase 3: 보라 (사월도~블러디 쇼텔)
    return { bladeColor: '#9040c0', guardColor: '#602880', gripColor: '#401860', accentColor: '#c070ff', glowColor: '#a050e0' }
  if (level >= 8)
    // Phase 2: 파랑 (인챈티드~엑스칼리버)
    return { bladeColor: '#3870c8', guardColor: '#204880', gripColor: '#182858', accentColor: '#60a0ff', glowColor: '#4488dd' }
  if (level >= 4)
    // Phase 1 후반: 초록 (바스타드~카타나) — 단련된 철검
    return { bladeColor: '#408840', guardColor: '#285828', gripColor: '#503820', accentColor: '#80cc60', glowColor: null }
  if (level >= 2)
    // Phase 1 중반: 흰색/은빛 (투박한 철검~쇼트 소드)
    return { bladeColor: '#c8c8c8', guardColor: '#909090', gripColor: '#503820', accentColor: '#e8e8e8', glowColor: null }
  // Phase 1 초반: 회색/나무 (목검~훈련용 목검)
  return   { bladeColor: '#908060', guardColor: '#605040', gripColor: '#503820', accentColor: '#b0a080', glowColor: null }
}

interface Props {
  level: number
  forgePhase: ForgePhase
}

export default function SwordDisplay({ level, forgePhase }: Props) {
  const cfg = getConfig(level)

  const isAnimating = forgePhase === 'forging' || forgePhase === 'waiting_reveal'
  const isSuccess = forgePhase === 'success'
  const isFail = forgePhase === 'fail' || forgePhase === 'near_miss'

  const filterStyle: React.CSSProperties = cfg.glowColor
    ? { filter: `drop-shadow(0 0 10px ${cfg.glowColor}) drop-shadow(0 0 24px ${cfg.glowColor}40)` }
    : {}

  const animStyle: React.CSSProperties = {
    animation: isAnimating
      ? 'pulse-glow 0.3s ease-in-out infinite'
      : isSuccess
      ? 'none'
      : isFail
      ? 'shake 0.4s ease'
      : 'sword-float 3s ease-in-out infinite',
  }

  // 성공/실패 오버레이 색상
  const overlayColor = isSuccess
    ? 'rgba(88,160,48,0.25)'
    : isFail
    ? 'rgba(176,40,32,0.25)'
    : isAnimating
    ? 'rgba(200,144,40,0.15)'
    : 'transparent'

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

      {/* 검 SVG */}
      <svg
        viewBox="0 0 64 200"
        width="80"
        height="240"
        style={{ ...filterStyle, ...animStyle, shapeRendering: 'crispEdges' }}
        aria-label={`+${level}강 검`}
      >
        {/* 날끝 (blade tip) */}
        <polygon
          points="32,0 28,20 36,20"
          fill={cfg.bladeColor}
        />
        {/* 날 몸통 (blade body) */}
        <rect x="28" y="18" width="8" height="108" fill={cfg.bladeColor} />

        {/* 풀러 (blood groove) — Phase 2 이상 */}
        {level >= 8 && (
          <rect x="31" y="28" width="2" height="88" fill={cfg.accentColor} opacity="0.5" />
        )}

        {/* 크로스가드 */}
        <rect x="10" y="118" width="44" height="10" fill={cfg.guardColor} />
        {/* 가드 장식 — Phase 3 이상 */}
        {level >= 13 && (
          <>
            <rect x="6"  y="120" width="8"  height="6" fill={cfg.accentColor} />
            <rect x="50" y="120" width="8"  height="6" fill={cfg.accentColor} />
          </>
        )}

        {/* 그립 */}
        <rect x="29" y="128" width="6" height="44" fill={cfg.gripColor} />
        {/* 그립 감김 */}
        {[134, 142, 150, 158].map((y) => (
          <rect key={y} x="27" y={y} width="10" height="3"
                fill={cfg.guardColor} opacity="0.7" />
        ))}

        {/* 포멜 */}
        <rect x="24" y="172" width="16" height="14" fill={cfg.guardColor} />
        {/* 포멜 장식 — Phase 4 이상 */}
        {level >= 17 && (
          <rect x="28" y="174" width="8" height="10" fill={cfg.accentColor} opacity="0.8" />
        )}

        {/* +25 여명 특수 광채 */}
        {level === 25 && (
          <>
            <line x1="32" y1="-10" x2="32" y2="210" stroke="#c0d8ff" strokeWidth="1" opacity="0.4" />
            <line x1="-10" y1="128" x2="74" y2="128" stroke="#c0d8ff" strokeWidth="1" opacity="0.4" />
          </>
        )}
      </svg>
    </div>
  )
}
