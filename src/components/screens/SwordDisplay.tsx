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
  accentColor: string
  glowColor: string | null
}

function getConfig(level: number): SwordConfig {
  if (level >= 25)
    return {
      bladeColor: '#f0f4ff', bladeHighlight: '#ffffff', bladeShadow: '#c0d0f0',
      guardColor: '#c8d8ff', guardHighlight: '#e0ecff', guardShadow: '#90a8d8',
      gripColor: '#a0b8e8', accentColor: '#ffffff', glowColor: '#c0d8ff',
    }
  if (level >= 23)
    return {
      bladeColor: '#cc3010', bladeHighlight: '#ff5535', bladeShadow: '#881808',
      guardColor: '#882010', guardHighlight: '#aa3018', guardShadow: '#601008',
      gripColor: '#601808', accentColor: '#ff5030', glowColor: '#ff4020',
    }
  if (level >= 17)
    return {
      bladeColor: '#d4a820', bladeHighlight: '#ffe060', bladeShadow: '#a07810',
      guardColor: '#a07810', guardHighlight: '#c89820', guardShadow: '#705008',
      gripColor: '#705008', accentColor: '#ffe060', glowColor: '#ffd030',
    }
  if (level >= 13)
    return {
      bladeColor: '#9040c0', bladeHighlight: '#c070ff', bladeShadow: '#602080',
      guardColor: '#602880', guardHighlight: '#8040a0', guardShadow: '#401860',
      gripColor: '#401860', accentColor: '#c070ff', glowColor: '#a050e0',
    }
  if (level >= 8)
    return {
      bladeColor: '#3870c8', bladeHighlight: '#60a0ff', bladeShadow: '#204080',
      guardColor: '#204880', guardHighlight: '#3068a0', guardShadow: '#182858',
      gripColor: '#182858', accentColor: '#60a0ff', glowColor: '#4488dd',
    }
  if (level >= 4)
    return {
      bladeColor: '#408840', bladeHighlight: '#60b060', bladeShadow: '#286828',
      guardColor: '#285828', guardHighlight: '#387838', guardShadow: '#1a3a1a',
      gripColor: '#503820', accentColor: '#80cc60', glowColor: null,
    }
  if (level >= 2)
    return {
      bladeColor: '#c8c8c8', bladeHighlight: '#e8e8e8', bladeShadow: '#909090',
      guardColor: '#909090', guardHighlight: '#b0b0b0', guardShadow: '#686868',
      gripColor: '#503820', accentColor: '#e8e8e8', glowColor: null,
    }
  return {
    bladeColor: '#908060', bladeHighlight: '#b0a080', bladeShadow: '#705840',
    guardColor: '#605040', guardHighlight: '#786858', guardShadow: '#483828',
    gripColor: '#503820', accentColor: '#b0a080', glowColor: null,
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
          viewBox="0 0 200 300"
          style={{
            ...filterStyle,
            ...animStyle,
            maxWidth: '220px',
            maxHeight: '320px',
            width: '60%',
            height: 'auto',
          }}
          aria-label={`+${level}강 검`}
        >
          <defs>
            {/* 날 그라디언트 */}
            <linearGradient id={`${uid}-blade`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={cfg.bladeHighlight} />
              <stop offset="100%" stopColor={cfg.bladeShadow} />
            </linearGradient>
            {/* 가드 그라디언트 */}
            <linearGradient id={`${uid}-guard`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cfg.guardHighlight} />
              <stop offset="100%" stopColor={cfg.guardShadow} />
            </linearGradient>
            {/* 날 하이라이트 (에지 라인) */}
            <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cfg.bladeHighlight} stopOpacity="0.8" />
              <stop offset="100%" stopColor={cfg.bladeHighlight} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ── 날 (blade) — 테이퍼드 폴리곤 ── */}
          <polygon
            points="100,12 86,170 114,170"
            fill={`url(#${uid}-blade)`}
          />

          {/* 날 에지 하이라이트 (왼쪽 면) */}
          <line
            x1="100" y1="12" x2="86" y2="170"
            stroke={cfg.bladeHighlight} strokeWidth="1.5" opacity="0.5"
          />

          {/* 풀러 (blood groove) — Block 2+ */}
          {level >= 8 && (
            <line
              x1="100" y1="45" x2="100" y2="155"
              stroke={cfg.accentColor} strokeWidth="2" opacity="0.4"
            />
          )}

          {/* ── 크로스가드 — 곡선 path ── */}
          <path
            d={level >= 13
              ? 'M55,168 Q100,180 145,168 L145,178 Q100,166 55,178 Z'
              : 'M62,168 Q100,178 138,168 L138,178 Q100,168 62,178 Z'
            }
            fill={`url(#${uid}-guard)`}
          />

          {/* 가드 장식 — Block 3+ */}
          {level >= 13 && (
            <>
              <circle cx="58" cy="173" r="4" fill={cfg.accentColor} opacity="0.8" />
              <circle cx="142" cy="173" r="4" fill={cfg.accentColor} opacity="0.8" />
            </>
          )}

          {/* ── 그립 — 가드에서 자연스럽게 연결 ── */}
          <rect x="94" y="178" width="12" height="55" rx="2"
                fill={cfg.gripColor} />

          {/* 그립 감김 — 사선 줄무늬 */}
          {[186, 194, 202, 210, 218, 226].map((y) => (
            <line
              key={y}
              x1="93" y1={y} x2="107" y2={y + 4}
              stroke={cfg.guardColor} strokeWidth="2" opacity="0.6"
            />
          ))}

          {/* ── 포멜 — 그립 하단에 연결된 형태 ── */}
          <ellipse cx="100" cy="237" rx="10" ry="8"
                   fill={cfg.guardColor} />
          {/* 포멜 장식 — Block 4+ */}
          {level >= 17 && (
            <ellipse cx="100" cy="237" rx="5" ry="4"
                     fill={cfg.accentColor} opacity="0.8" />
          )}

          {/* +25 여명 특수 광채 */}
          {level === 25 && (
            <>
              <line x1="100" y1="-10" x2="100" y2="260"
                    stroke="#c0d8ff" strokeWidth="1.5" opacity="0.4" />
              <line x1="40" y1="130" x2="160" y2="130"
                    stroke="#c0d8ff" strokeWidth="1.5" opacity="0.4" />
              <circle cx="100" cy="90" r="40"
                      fill="none" stroke="#c0d8ff" strokeWidth="0.8" opacity="0.2" />
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
