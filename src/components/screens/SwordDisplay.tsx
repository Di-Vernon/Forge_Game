/**
 * SwordDisplay.tsx
 * 검 레벨에 따라 SVG 검을 렌더링.
 * 대각선 배치, 테이퍼드 날, 곡선 크로스가드, 연결 포멜, SVG 그라디언트.
 */

import type { ForgePhase } from '../../hooks/useGameState'

interface SwordConfig {
  bladeColor: string
  bladeHighlight: string
  bladeShadow: string
  guardColor: string
  guardHighlight: string
  guardShadow: string
  gripColor: string
  gripHighlight: string
  gripShadow: string
  accentColor: string
  glowColor: string | null
}

function getConfig(level: number): SwordConfig {
  if (level >= 25)
    return {
      bladeColor: '#e8f0ff', bladeHighlight: '#ffffff', bladeShadow: '#a0b8e8',
      guardColor: '#c8d8ff', guardHighlight: '#e0ecff', guardShadow: '#90a8d8',
      gripColor: '#a0b8e8', gripHighlight: '#c0d0f0', gripShadow: '#7890c0',
      accentColor: '#ffffff', glowColor: '#c0d8ff',
    }
  if (level >= 23)
    return {
      bladeColor: '#cc3010', bladeHighlight: '#ff7050', bladeShadow: '#701808',
      guardColor: '#882010', guardHighlight: '#aa3018', guardShadow: '#601008',
      gripColor: '#601808', gripHighlight: '#803020', gripShadow: '#401008',
      accentColor: '#ff5030', glowColor: '#ff4020',
    }
  if (level >= 17)
    return {
      bladeColor: '#d4a820', bladeHighlight: '#ffe880', bladeShadow: '#886010',
      guardColor: '#a07810', guardHighlight: '#c89820', guardShadow: '#705008',
      gripColor: '#705008', gripHighlight: '#907018', gripShadow: '#503800',
      accentColor: '#ffe060', glowColor: '#ffd030',
    }
  if (level >= 13)
    return {
      bladeColor: '#9040c0', bladeHighlight: '#d090ff', bladeShadow: '#502070',
      guardColor: '#602880', guardHighlight: '#8040a0', guardShadow: '#401860',
      gripColor: '#401860', gripHighlight: '#603080', gripShadow: '#281048',
      accentColor: '#c070ff', glowColor: '#a050e0',
    }
  if (level >= 8)
    return {
      bladeColor: '#3870c8', bladeHighlight: '#80b8ff', bladeShadow: '#183878',
      guardColor: '#204880', guardHighlight: '#3068a0', guardShadow: '#182858',
      gripColor: '#182858', gripHighlight: '#284070', gripShadow: '#101840',
      accentColor: '#60a0ff', glowColor: '#4488dd',
    }
  if (level >= 4)
    return {
      bladeColor: '#408840', bladeHighlight: '#80cc60', bladeShadow: '#205020',
      guardColor: '#285828', guardHighlight: '#387838', guardShadow: '#1a3a1a',
      gripColor: '#503820', gripHighlight: '#685030', gripShadow: '#382010',
      accentColor: '#80cc60', glowColor: null,
    }
  if (level >= 2)
    return {
      bladeColor: '#b0b0b0', bladeHighlight: '#e0e0e0', bladeShadow: '#707878',
      guardColor: '#909090', guardHighlight: '#b0b0b0', guardShadow: '#686868',
      gripColor: '#503820', gripHighlight: '#685030', gripShadow: '#382010',
      accentColor: '#e8e8e8', glowColor: null,
    }
  return {
    bladeColor: '#908060', bladeHighlight: '#c0a878', bladeShadow: '#685838',
    guardColor: '#605040', guardHighlight: '#786858', guardShadow: '#483828',
    gripColor: '#503820', gripHighlight: '#685030', gripShadow: '#382010',
    accentColor: '#b0a080', glowColor: null,
  }
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

  const overlayColor = isSuccess
    ? 'rgba(88,160,48,0.25)'
    : isFail
    ? 'rgba(176,40,32,0.25)'
    : isAnimating
    ? 'rgba(200,144,40,0.15)'
    : 'transparent'

  // Unique gradient IDs to avoid conflicts if multiple instances
  const uid = `sw-${level}`

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

      {/* 대각선 회전 wrapper */}
      <div
        style={{
          transform: 'rotate(-45deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        {/* 검 SVG */}
        <svg
          viewBox="0 0 200 340"
          style={{
            ...filterStyle,
            ...animStyle,
            maxWidth: '260px',
            maxHeight: '360px',
            width: '60%',
            height: 'auto',
          }}
          aria-label={`+${level}강 검`}
        >
          <defs>
            {/* 날 좌→우 그라디언트 (2면) */}
            <linearGradient id={`${uid}-blade`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={cfg.bladeHighlight} />
              <stop offset="40%" stopColor={cfg.bladeColor} />
              <stop offset="100%" stopColor={cfg.bladeShadow} />
            </linearGradient>
            {/* 날 shine (수직 반사) */}
            <linearGradient id={`${uid}-shine`} x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="50%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0.2" />
            </linearGradient>
            {/* 가드 그라디언트 (상→하) */}
            <linearGradient id={`${uid}-guard`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cfg.guardHighlight} />
              <stop offset="100%" stopColor={cfg.guardShadow} />
            </linearGradient>
            {/* 그립 원통 쉐이딩 (좌→우) */}
            <linearGradient id={`${uid}-grip`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={cfg.gripHighlight} />
              <stop offset="50%" stopColor={cfg.gripColor} />
              <stop offset="100%" stopColor={cfg.gripShadow} />
            </linearGradient>
          </defs>

          {/* ── 날 (blade) — 테이퍼드 폴리곤 ── */}
          <polygon
            points="100,8 86,190 114,190"
            fill={`url(#${uid}-blade)`}
          />

          {/* 날 shine (반사 하이라이트 — 얇은 수직선) */}
          <rect
            x="97" y="20" width="3" height="140"
            fill={`url(#${uid}-shine)`} opacity="0.5"
          />
          {/* 추가 smear (Block 2+) */}
          {level >= 8 && (
            <rect x="94" y="40" width="2" height="60" fill="white" opacity="0.15" />
          )}

          {/* 풀러 (blood groove) — Block 2+ */}
          {level >= 8 && (
            <line
              x1="100" y1="35" x2="100" y2="175"
              stroke={cfg.accentColor} strokeWidth="1.5" opacity="0.35"
            />
          )}

          {/* ── 크로스가드 — 곡선 path ── */}
          <path
            d={level >= 13
              ? 'M56,190 Q100,202 144,190 L144,200 Q100,188 56,200 Z'
              : 'M62,190 Q100,200 138,190 L138,200 Q100,190 62,200 Z'
            }
            fill={`url(#${uid}-guard)`}
          />

          {/* 가드 장식 — Block 3+ */}
          {level >= 13 && (
            <>
              <circle cx="52" cy="195" r="5" fill={cfg.accentColor} opacity="0.8" />
              <circle cx="148" cy="195" r="5" fill={cfg.accentColor} opacity="0.8" />
            </>
          )}

          {/* ── 그립 — 가드에서 자연스럽게 연결, 원통 쉐이딩 ── */}
          <rect
            x="93" y="200" width="14" height="60" rx="2"
            fill={`url(#${uid}-grip)`}
          />

          {/* 그립 감김 — 사선 줄무늬 */}
          {[208, 216, 224, 232, 240, 248].map((y) => (
            <line
              key={y}
              x1="92" y1={y} x2="108" y2={y + 5}
              stroke={cfg.guardColor} strokeWidth="2.5" opacity="0.5"
            />
          ))}

          {/* ── 포멜 — 그립 하단에 연결 (분리 금지) ── */}
          <ellipse cx="100" cy="264" rx="11" ry="9"
                   fill={`url(#${uid}-guard)`} />
          {/* 포멜 장식 — Block 4+ */}
          {level >= 17 && (
            <circle cx="100" cy="264" r="4" fill={cfg.accentColor} opacity="0.7" />
          )}

          {/* +25 여명 특수 광채 */}
          {level === 25 && (
            <>
              <line x1="100" y1="-20" x2="100" y2="290"
                    stroke="#c0d8ff" strokeWidth="1.5" opacity="0.3" />
              <line x1="-20" y1="195" x2="220" y2="195"
                    stroke="#c0d8ff" strokeWidth="1.5" opacity="0.3" />
              <circle cx="100" cy="100" r="40"
                      fill="none" stroke="#c0d8ff" strokeWidth="0.8" opacity="0.2" />
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
