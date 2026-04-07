/**
 * ForgeEffects.ts
 * 강화 연출 파라미터 계산. 레벨·결과에 따라 이펙트 강도를 결정한다.
 */

import type { SoundId } from '../audio/SoundManager'

export interface ForgeEffectParams {
  /** CSS flash 애니메이션 지속 시간 (ms) */
  flashDuration: number
  /** 결과 표시 유지 시간 (ms) — 이후 idle 복귀 */
  resultHoldMs: number
  /** 화면 흔들림 트라우마 강도 (0~1) */
  shakeTrauma: number
  /** 파티클 프리셋 */
  particlePreset: 'success' | 'destroy' | 'celebration' | null
  /** 재생할 사운드 */
  soundId: SoundId
  /**
   * 결과 숨김 모드: 강화 애니메이션 후 사용자가 탭해야 결과를 공개.
   * - 성공: level >= 17 (Phase 4+), level 24 (celebration) 제외
   * - 파괴: level >= 15, near-miss 제외
   */
  revealMode: boolean
}

/**
 * 강화 레벨·결과를 기반으로 이펙트 파라미터를 반환한다.
 *
 * 타이밍 기준표 (flashDuration + resultHoldMs):
 *   Phase 1~2 (+1~+12) 성공: ~700ms
 *   Phase 3  (+13~+16) 성공: ~1280ms
 *   Phase 4  (+17~+22) 성공: ~1500ms (+ 탭 투 리빌)
 *   Phase 5  (+23)     성공: ~1800ms (+ 탭 투 리빌)
 *   Phase 6  (+24→+25) 성공: ~3400ms
 *
 * @param level      강화 시도 시점의 레벨 (0~24)
 * @param isSuccess  강화 성공 여부
 * @param isNearMiss Near-miss 여부 (success=false, level>=15)
 * @param isDestroyed 파괴 여부
 */
export function getForgeEffectParams(
  level: number,
  isSuccess: boolean,
  isNearMiss: boolean,
  isDestroyed: boolean,
): ForgeEffectParams {

  // ── 성공 ────────────────────────────────────────────────────────
  if (isSuccess) {
    // 각 phase 플래그 — 높은 레벨부터 체크
    const isCelebration = level === 24  // +24→+25 달성 (여명 탄생)
    const isVeryHigh    = level >= 23   // Phase 5: 격노/태초 (23)
    const isHigh        = level >= 17   // Phase 4: 백야~아크라이트
    const isMid         = level >= 13   // Phase 3: 사월도~블러디 쇼텔

    return {
      // 높은 레벨을 먼저 체크 (이전 버그: isMid가 isVeryHigh를 가로막음)
      flashDuration:  isCelebration ? 3000 : isVeryHigh ? 1800 : isHigh ? 1500 : isMid ? 1000 : 500,
      resultHoldMs:   isCelebration ? 400  : 200,
      shakeTrauma:    isCelebration ? 0.9  : isVeryHigh ? 0.5 : isHigh ? 0.35 : 0.1,
      particlePreset: isCelebration ? 'celebration' : isHigh ? 'success' : null,
      soundId:        'forge_success',
      // 탭 투 리빌: Phase 4~5 성공 (level 17~23). celebration(24)은 즉시 공개
      revealMode:     isHigh && !isCelebration,
    }
  }

  // ── Near-miss (파괴, level>=15, 전용 GSAP 시퀀스 사용) ────────────
  if (isNearMiss) {
    return {
      // GSAP 타임라인이 300+200ms 시퀀스를 처리하므로 600ms면 충분
      flashDuration:  600,
      resultHoldMs:   600,
      shakeTrauma:    0.4,
      particlePreset: null,
      soundId:        'forge_fail',   // GSAP가 먼저 forge_success → stop → forge_fail 순으로 제어
      revealMode:     false,          // near-miss는 자체 GSAP 시퀀스 사용
    }
  }

  // ── 파괴 (non-near-miss) ────────────────────────────────────────
  if (isDestroyed) {
    const isHigh = level >= 15
    return {
      flashDuration:  1000,
      resultHoldMs:   900,
      shakeTrauma:    isHigh ? 0.75 : 0.5,
      particlePreset: 'destroy',
      soundId:        'forge_destroy',
      // level >= 15 파괴도 탭 투 리빌 (성공과 구분 불가 연출)
      revealMode:     isHigh,
    }
  }

  // ── 일반 실패 (불굴 발동 등 — 파괴 없음) ─────────────────────────
  return {
    flashDuration:  1000,
    resultHoldMs:   600,
    shakeTrauma:    0.2,
    particlePreset: null,
    soundId:        'forge_fail',
    revealMode:     false,
  }
}
