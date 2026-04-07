/**
 * ParticleSystem.ts
 * 오브젝트 풀 기반 파티클 시스템 (GC 스파이크 방지).
 * 200개 파티클 사전 할당, rAF 루프 외부에서 관리.
 */

export interface Particle {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number      // 0~1 (1=생존, 0=소멸)
  decay: number     // 프레임당 life 감소량
  size: number      // 픽셀
  color: string     // CSS 색
  gravity: number   // px/s²
}

const POOL_SIZE = 200
const pool: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
  active: false, x: 0, y: 0, vx: 0, vy: 0,
  life: 0, decay: 0, size: 4, color: '#ffffff', gravity: 0,
}))

function getParticle(): Particle | null {
  return pool.find((p) => !p.active) ?? null
}

function spawn(cfg: Omit<Particle, 'active'>): void {
  const p = getParticle()
  if (!p) return
  Object.assign(p, cfg, { active: true })
}

// ── 프리셋 ──────────────────────────────────────────────────────

const W = () => window.innerWidth
const H = () => window.innerHeight

/** 강화 성공 — 금빛 불꽃 */
export function burstSuccess(cx: number, cy: number): void {
  const colors = ['#e8b040', '#ffd060', '#ffe090', '#cc8820']
  for (let i = 0; i < 28; i++) {
    const angle = (Math.random() * Math.PI * 2)
    const speed = 80 + Math.random() * 160
    spawn({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 1,
      decay: 0.018 + Math.random() * 0.012,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 120,
    })
  }
}

/** 파괴 — 붉은 파편 */
export function burstDestroy(cx: number, cy: number): void {
  const colors = ['#cc3010', '#ff5030', '#882010', '#ffaa60']
  for (let i = 0; i < 36; i++) {
    const angle = (Math.random() * Math.PI * 2)
    const speed = 60 + Math.random() * 220
    spawn({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      life: 1,
      decay: 0.014 + Math.random() * 0.01,
      size: 2 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 180,
    })
  }
}

/** +25 달성 축하 — 무지개 폭발 */
export function burstCelebration(): void {
  const colors = ['#e8b040', '#60a0ff', '#c070ff', '#58a030', '#ff5030', '#ffffff']
  const cx = W() / 2
  const cy = H() * 0.4
  for (let i = 0; i < 80; i++) {
    const angle = (Math.random() * Math.PI * 2)
    const speed = 100 + Math.random() * 300
    spawn({
      x: cx + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * 60,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      life: 1,
      decay: 0.008 + Math.random() * 0.008,
      size: 4 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 100,
    })
  }
}

/** 칭호 획득 — 금+흰 별빛 */
export function burstTitleUnlock(): void {
  const cx = W() / 2
  const cy = H() * 0.35
  const colors = ['#e8b040', '#ffffff', '#ffd080']
  for (let i = 0; i < 24; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8
    const speed = 60 + Math.random() * 120
    spawn({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.016 + Math.random() * 0.012,
      size: 3 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 80,
    })
  }
}

// ── rAF 루프 ─────────────────────────────────────────────────────

let rafId: number | null = null
let lastTs = 0

export type DrawFn = (particles: readonly Particle[]) => void
let onDraw: DrawFn | null = null

export function registerDrawCallback(fn: DrawFn): void {
  onDraw = fn
}

export function unregisterDrawCallback(): void {
  onDraw = null
}

function tick(ts: number): void {
  const delta = Math.min(ts - lastTs, 50) // 최대 50ms (탭 비활성 대비)
  lastTs = ts

  const deltaSec = delta / 1000
  let anyActive = false

  for (const p of pool) {
    if (!p.active) continue
    p.x  += p.vx * deltaSec
    p.y  += p.vy * deltaSec
    p.vy += p.gravity * deltaSec
    p.life -= p.decay
    if (p.life <= 0) { p.active = false; continue }
    anyActive = true
  }

  onDraw?.(pool)

  if (anyActive) {
    rafId = requestAnimationFrame(tick)
  } else {
    rafId = null
  }
}

/** 파티클 버스트 후 루프 시작 (이미 실행 중이면 무시) */
export function startLoop(): void {
  if (rafId !== null) return
  lastTs = performance.now()
  rafId = requestAnimationFrame(tick)
}

/** 모든 파티클 초기화 */
export function clearAll(): void {
  for (const p of pool) p.active = false
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
}
