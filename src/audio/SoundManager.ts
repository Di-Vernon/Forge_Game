/**
 * SoundManager.ts
 * Web Audio API 기반 싱글턴 사운드 매니저.
 * jsfxr로 생성된 WAV data URL을 캐싱·재생한다.
 * 첫 사용자 인터랙션 이후에만 AudioContext를 초기화 (브라우저 정책).
 */

import jsfxr from 'jsfxr'
import {
  SOUND_FORGE_SUCCESS,
  SOUND_FORGE_FAIL,
  SOUND_FORGE_DESTROY,
  SOUND_UI_CLICK,
  SOUND_SCROLL_USE,
  SOUND_TITLE_UNLOCK,
  SOUND_TITLE_EASTER_EGG,
} from './sounds'

export type SoundId =
  | 'forge_success'
  | 'forge_fail'
  | 'forge_destroy'
  | 'ui_click'
  | 'scroll_use'
  | 'title_unlock'
  | 'title_easter_egg'

const SOUND_PARAMS: Record<SoundId, number[]> = {
  forge_success:    SOUND_FORGE_SUCCESS,
  forge_fail:       SOUND_FORGE_FAIL,
  forge_destroy:    SOUND_FORGE_DESTROY,
  ui_click:         SOUND_UI_CLICK,
  scroll_use:       SOUND_SCROLL_USE,
  title_unlock:     SOUND_TITLE_UNLOCK,
  title_easter_egg: SOUND_TITLE_EASTER_EGG,
}

interface PlayOptions {
  volume?: number   // 0–1, defaults to 1
  pitch?: number    // playback rate, defaults to 1
}

class SoundManager {
  private ctx: AudioContext | null = null
  private bufferCache = new Map<SoundId, AudioBuffer>()
  private activeSources = new Map<SoundId, AudioBufferSourceNode>()
  private muted = false

  /** AudioContext를 생성하고 jsfxr WAV를 미리 디코딩한다. */
  async init(): Promise<void> {
    if (this.ctx) return
    try {
      this.ctx = new AudioContext()
      await Promise.all(
        (Object.entries(SOUND_PARAMS) as [SoundId, number[]][]).map(
          ([id, params]) => this._loadSound(id, params)
        )
      )
    } catch {
      // 사운드 실패는 게임플레이에 영향 없음
    }
  }

  private async _loadSound(id: SoundId, params: number[]): Promise<void> {
    if (!this.ctx) return
    try {
      const dataUrl = jsfxr(params)
      const response = await fetch(dataUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer)
      this.bufferCache.set(id, audioBuffer)
    } catch {
      // 개별 사운드 로드 실패 무시
    }
  }

  play(id: SoundId, opts: PlayOptions = {}): void {
    if (this.muted || !this.ctx) return
    const buffer = this.bufferCache.get(id)
    if (!buffer) return

    try {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume()
      }

      const gainNode = this.ctx.createGain()
      gainNode.gain.value = opts.volume ?? 1

      const source = this.ctx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = opts.pitch ?? 1
      source.connect(gainNode)
      gainNode.connect(this.ctx.destination)
      source.start()
      this.activeSources.set(id, source)
      source.onended = () => { this.activeSources.delete(id) }
    } catch {
      // 재생 실패 무시
    }
  }

  /** 현재 재생 중인 SFX를 즉시 정지 (near-miss 하드컷 등) */
  stop(id: SoundId): void {
    const source = this.activeSources.get(id)
    if (!source) return
    try { source.stop() } catch { /* already ended */ }
    this.activeSources.delete(id)
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  isMuted(): boolean {
    return this.muted
  }

  /** BGM 페이드아웃 (현재는 스텁 — BGM 추가 시 구현) */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fadeOut(_durationMs: number): void {
    // TODO: BGM 구현 시 사용
  }
}

export const soundManager = new SoundManager()
