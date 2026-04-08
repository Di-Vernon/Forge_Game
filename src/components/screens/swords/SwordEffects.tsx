/**
 * SwordEffects.tsx
 * 검별 고유 CSS idle 이펙트 오버레이 (13개 검).
 * absolute positioned, pointer-events: none.
 */

import './swordAnimations.css'

const base: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
}

/** +8 인챈티드 소드: 푸른 룬 glow 일렁임 */
function RuneFlowEffect() {
  return (
    <div style={base}>
      <div
        style={{
          position: 'absolute',
          inset: '10% 20%',
          background: 'radial-gradient(ellipse, rgba(68,136,221,0.3) 0%, transparent 70%)',
          animation: 'rune-flow 2.5s ease-in-out infinite',
        }}
      />
    </div>
  )
}

/** +11 무형검: 흰색 아지랑이 */
function MistDriftEffect() {
  return (
    <div style={base}>
      <div
        style={{
          position: 'absolute',
          inset: '5% 10%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.15) 0%, transparent 60%)',
          animation: 'mist-drift 4s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '20% 5%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.1) 0%, transparent 50%)',
          animation: 'mist-drift 5s ease-in-out infinite 1.5s',
        }}
      />
    </div>
  )
}

/** +13 사월도: 검은 안개 */
function DarkMistEffect() {
  return (
    <div style={base}>
      <div
        style={{
          position: 'absolute',
          inset: '15% 15%',
          background: 'radial-gradient(ellipse, rgba(40,10,60,0.35) 0%, transparent 65%)',
          animation: 'dark-mist 3s ease-in-out infinite',
        }}
      />
    </div>
  )
}

/** +15 암월의 대검: 달빛 호흡 glow */
function MoonlightPulseEffect() {
  return (
    <div
      style={{
        ...base,
        animation: 'moonlight-pulse 3s ease-in-out infinite',
      }}
    />
  )
}

/** +16 블러디 쇼텔: 핏물 흐름 */
function BloodDripEffect() {
  return (
    <div style={base}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${25 + i * 20}%`,
            top: '30%',
            width: 3,
            height: 12,
            borderRadius: 2,
            background: 'rgba(170,24,24,0.6)',
            animation: `blood-drip ${1.8 + i * 0.4}s ease-in infinite ${i * 0.6}s`,
          }}
        />
      ))}
    </div>
  )
}

/** +17 백야: 백색 맥동 glow */
function WhitePulseEffect() {
  return (
    <div
      style={{
        ...base,
        animation: 'white-pulse 2.5s ease-in-out infinite',
      }}
    />
  )
}

/** +18 하운드 기사의 검: 번개 깜빡임 */
function LightningFlickerEffect() {
  return (
    <div style={base}>
      <div
        style={{
          position: 'absolute',
          inset: '5% 15%',
          background: 'radial-gradient(ellipse, rgba(64,128,192,0.4) 0%, transparent 65%)',
          animation: 'lightning-flicker 1.2s steps(1) infinite',
        }}
      />
    </div>
  )
}

/** +19 억겁의 사선: 마력 맥 drift */
function MagicVeinDriftEffect() {
  return (
    <div style={base}>
      <div
        style={{
          position: 'absolute',
          inset: '10% 15%',
          background: 'radial-gradient(ellipse, rgba(96,32,160,0.3) 0%, transparent 60%)',
          animation: 'magic-vein-drift 3s ease-in-out infinite',
        }}
      />
    </div>
  )
}

/** +22 아크라이트: LED 깜빡임 */
function LedBlinkEffect() {
  return (
    <div style={base}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${30 + i * 15}%`,
            top: `${40 + i * 8}%`,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: '#d4a020',
            boxShadow: '0 0 6px #d4a020',
            animation: `led-blink 0.8s steps(1) infinite ${i * 0.27}s`,
          }}
        />
      ))}
    </div>
  )
}

/** +24 태초의 획: 초록 안개 일렁임 */
function EerieGlowEffect() {
  return (
    <div style={base}>
      <div
        style={{
          position: 'absolute',
          inset: '5% 10%',
          background: 'radial-gradient(ellipse, rgba(32,160,64,0.25) 0%, transparent 60%)',
          animation: 'eerie-glow 4.5s ease-in-out infinite',
        }}
      />
    </div>
  )
}

/** +25 여명: 실린더 회전 + glow + 안개 */
function DawnEffect() {
  return (
    <div style={base}>
      {/* glow pulse */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          animation: 'dawn-pulse 3s ease-in-out infinite',
        }}
      />
      {/* 실린더 구멍 순차 점멸 */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${20 + i * 10}%`,
            top: `${35 + (i % 3) * 8}%`,
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#20a040',
            boxShadow: '0 0 8px rgba(32,160,64,0.8)',
            animation: `cylinder-rotate 1.8s ease-in-out infinite ${i * 0.3}s`,
          }}
        />
      ))}
      {/* 안개 */}
      <div
        style={{
          position: 'absolute',
          inset: '0% 5%',
          background: 'radial-gradient(ellipse, rgba(32,160,64,0.12) 0%, transparent 55%)',
          animation: 'eerie-glow 5s ease-in-out infinite 1s',
        }}
      />
    </div>
  )
}

export default function SwordEffects({ level }: { level: number }) {
  switch (level) {
    case 8:  return <RuneFlowEffect />
    case 11: return <MistDriftEffect />
    case 13: return <DarkMistEffect />
    case 15: return <MoonlightPulseEffect />
    case 16: return <BloodDripEffect />
    case 17: return <WhitePulseEffect />
    case 18: return <LightningFlickerEffect />
    case 19: return <MagicVeinDriftEffect />
    case 22: return <LedBlinkEffect />
    case 24: return <EerieGlowEffect />
    case 25: return <DawnEffect />
    default: return null
  }
}
