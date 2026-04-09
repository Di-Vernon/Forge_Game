/**
 * AmbientManager.ts
 * 대장간 분위기 앰비언스 — 순수 Web Audio API 절차적 생성음.
 * 외부 파일 없이 노이즈 + 오실레이터로 용광로/불꽃 소리 구현.
 * bgmOn 토글에 연동 (start / stop).
 */

type Stoppable = AudioBufferSourceNode | OscillatorNode

class AmbientManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private stoppables: Stoppable[] = []
  private active = false

  private async _ensureCtx(): Promise<AudioContext> {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    return this.ctx
  }

  /** 화이트 노이즈 AudioBuffer 생성 */
  private _makeNoise(ctx: AudioContext, sec = 5): AudioBuffer {
    const len = ctx.sampleRate * sec
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  async start(): Promise<void> {
    if (this.active) return
    try {
      const ctx = await this._ensureCtx()

      // 마스터 게인 — 2초 페이드인
      this.masterGain = ctx.createGain()
      this.masterGain.gain.setValueAtTime(0, ctx.currentTime)
      this.masterGain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 2.0)
      this.masterGain.connect(ctx.destination)

      const noiseBuf = this._makeNoise(ctx, 5)

      // ── 1. 용광로 저역 럼블 (저역 필터 노이즈) ─────────────
      const furnaceSrc = ctx.createBufferSource()
      furnaceSrc.buffer = noiseBuf
      furnaceSrc.loop = true

      const furnaceLpf = ctx.createBiquadFilter()
      furnaceLpf.type = 'lowpass'
      furnaceLpf.frequency.value = 75
      furnaceLpf.Q.value = 0.5

      const furnaceGain = ctx.createGain()
      furnaceGain.gain.value = 0.28

      furnaceSrc.connect(furnaceLpf)
      furnaceLpf.connect(furnaceGain)
      furnaceGain.connect(this.masterGain)
      furnaceSrc.start()
      this.stoppables.push(furnaceSrc)

      // ── 2. 불꽃 크래클 (대역 통과 노이즈 + LFO 명멸) ─────
      const crackleSrc = ctx.createBufferSource()
      crackleSrc.buffer = noiseBuf
      crackleSrc.loop = true
      crackleSrc.loopStart = 0.7   // 루프 오프셋 (모노 겹침 방지)

      const crackleBpf = ctx.createBiquadFilter()
      crackleBpf.type = 'bandpass'
      crackleBpf.frequency.value = 380
      crackleBpf.Q.value = 0.35

      const crackleGain = ctx.createGain()
      crackleGain.gain.value = 0.11

      // 2.1Hz LFO → 불꽃 명멸 진폭 변조
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 2.1

      const lfoDepth = ctx.createGain()
      lfoDepth.gain.value = 0.055   // ±0.055 변조 깊이

      lfo.connect(lfoDepth)
      lfoDepth.connect(crackleGain.gain)

      crackleSrc.connect(crackleBpf)
      crackleBpf.connect(crackleGain)
      crackleGain.connect(this.masterGain)
      crackleSrc.start()
      lfo.start()
      this.stoppables.push(crackleSrc, lfo)

      // ── 3. 저주파 기저 진동 (42Hz 사인) ─────────────────
      const rumbleOsc = ctx.createOscillator()
      rumbleOsc.type = 'sine'
      rumbleOsc.frequency.value = 42

      const rumbleGain = ctx.createGain()
      rumbleGain.gain.value = 0.032

      rumbleOsc.connect(rumbleGain)
      rumbleGain.connect(this.masterGain)
      rumbleOsc.start()
      this.stoppables.push(rumbleOsc)

      this.active = true
    } catch {
      // 앰비언스 실패는 게임플레이에 영향 없음
    }
  }

  stop(): void {
    if (!this.ctx || !this.masterGain || !this.active) return
    const now = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now)
    this.masterGain.gain.linearRampToValueAtTime(0, now + 0.8)

    // 페이드아웃 완료 후 노드 정리
    const toStop = this.stoppables
    const mg = this.masterGain
    this.stoppables = []
    this.masterGain = null
    this.active = false

    setTimeout(() => {
      toStop.forEach(s => { try { s.stop() } catch { /* already ended */ } })
      try { mg.disconnect() } catch { /* ok */ }
    }, 900)
  }
}

export const ambientManager = new AmbientManager()
