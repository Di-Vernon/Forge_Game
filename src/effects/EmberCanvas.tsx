/**
 * EmberCanvas.tsx
 * 대장간 분위기 불씨 파티클 (Layer 3).
 * position:absolute — 부모 기준. pointer-events:none.
 * React state 완전 배제 — useRef + rAF 루프만 사용.
 */

import { useRef, useEffect } from 'react'

const EMBER_COLORS = ['#f0b848', '#e89030', '#c89028', '#8b2500', '#e07028']
const POOL_SIZE = 44
const SPAWN_MS  = 85  // 불씨 생성 주기 (ms)

interface Ember {
  x: number; y: number
  vx: number; vy: number
  life: number; decay: number
  size: number; colorIdx: number
}

interface Props {
  /** false 시 신규 스폰 중단, 기존 파티클은 자연 소멸 */
  active?: boolean
}

export default function EmberCanvas({ active = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number | null>(null)

  // active prop → 클로저에서 최신값 읽기 위해 ref 동기화
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 오브젝트 풀
    const pool: Ember[] = Array.from({ length: POOL_SIZE }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, decay: 0, size: 1, colorIdx: 0,
    }))

    function resize() {
      if (!canvas) return
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function spawnEmber(w: number, h: number) {
      const idle = pool.find(e => e.life <= 0)
      if (!idle) return
      idle.x       = w * (0.20 + Math.random() * 0.60)
      idle.y       = h * (0.68 + Math.random() * 0.22)
      idle.vx      = (Math.random() - 0.5) * 0.55
      idle.vy      = -(0.38 + Math.random() * 0.62)
      idle.life    = 0.65 + Math.random() * 0.32   // max ~0.97
      idle.decay   = 0.0030 + Math.random() * 0.0040
      idle.size    = 1 + Math.round(Math.random() * 2)
      idle.colorIdx = (Math.random() * EMBER_COLORS.length) | 0
    }

    let lastTime  = performance.now()
    let lastSpawn = 0

    function loop(now: number) {
      const dt = Math.min(now - lastTime, 50)
      lastTime = now

      const w = canvas!.width
      const h = canvas!.height

      // 스폰
      if (activeRef.current && now - lastSpawn > SPAWN_MS) {
        lastSpawn = now
        spawnEmber(w, h)
      }

      ctx!.clearRect(0, 0, w, h)

      let hasActive = false
      for (const e of pool) {
        if (e.life <= 0) continue
        hasActive = true

        // 물리 업데이트
        e.x  += e.vx * dt * 0.06
        e.y  += e.vy * dt * 0.06
        e.vx += (Math.random() - 0.5) * 0.016  // 수평 노이즈
        e.life -= e.decay * dt
        if (e.life <= 0) { e.life = 0; continue }

        // 렌더 (픽셀아트 — 정수 좌표 + 안티앨리어싱 없이)
        ctx!.globalAlpha = Math.min(e.life, 0.97)
        ctx!.fillStyle   = EMBER_COLORS[e.colorIdx]
        ctx!.fillRect(Math.round(e.x), Math.round(e.y), e.size, e.size)
      }
      ctx!.globalAlpha = 1

      if (hasActive || activeRef.current) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      ro.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])  // 마운트 시 1회 — active 변경은 activeRef로 처리

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:       'absolute',
        inset:          0,
        width:          '100%',
        height:         '100%',
        pointerEvents:  'none',
        imageRendering: 'pixelated',
        zIndex:         1,
      }}
      aria-hidden="true"
    />
  )
}
