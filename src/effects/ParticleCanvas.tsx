/**
 * ParticleCanvas.tsx
 * position: fixed, z-index: 500 전체화면 캔버스.
 * ParticleSystem의 draw 콜백을 구독해 파티클을 렌더링한다.
 * pointer-events: none — 게임 UI 인터랙션 방해 안 함.
 */

import { useRef, useEffect } from 'react'
import {
  registerDrawCallback,
  unregisterDrawCallback,
  type Particle,
} from './ParticleSystem'

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function resize() {
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function draw(particles: readonly Particle[]) {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        if (!p.active) continue
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        // 픽셀아트 느낌 — 안티앨리어싱 없이 사각형으로
        ctx.fillRect(
          Math.round(p.x - p.size / 2),
          Math.round(p.y - p.size / 2),
          Math.ceil(p.size),
          Math.ceil(p.size),
        )
      }
      ctx.globalAlpha = 1
    }

    registerDrawCallback(draw)

    return () => {
      window.removeEventListener('resize', resize)
      unregisterDrawCallback()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        500,
        pointerEvents: 'none',
        imageRendering: 'pixelated',
      }}
      aria-hidden="true"
    />
  )
}
