/**
 * ScreenShake.ts
 * Squirrel Eiserloh 트라우마 모델 기반 화면 흔들림.
 * simplex-noise로 부드러운 Perlin 오프셋을 생성한다.
 * 픽셀 명료도를 위해 최종 값은 정수로 반올림.
 */

import { createNoise2D } from 'simplex-noise'

// 각도 변위용 노이즈 생성기 (X, Y, Angle)
const noiseX = createNoise2D()
const noiseY = createNoise2D()

export interface ShakeState {
  trauma: number   // 0~1 (1 = 최대 흔들림)
  time: number     // 노이즈 샘플링 시간축
}

/** 최대 픽셀 오프셋 (trauma=1 기준) */
const MAX_OFFSET_PX = 14
/** 트라우마 감쇄 속도 (초당 감소량) */
const DECAY_PER_SEC = 1.4
/** 노이즈 주파수 (높을수록 빠른 흔들림) */
const NOISE_FREQ = 8

export function createShakeState(): ShakeState {
  return { trauma: 0, time: 0 }
}

/**
 * 트라우마 추가. 여러 이벤트가 겹쳐도 최대 1 초과 안 함.
 * @param state  현재 ShakeState (불변 — 새 객체 반환)
 * @param amount 추가할 트라우마 (0~1)
 */
export function addTrauma(state: ShakeState, amount: number): ShakeState {
  return { ...state, trauma: Math.min(1, state.trauma + amount) }
}

/**
 * 매 프레임마다 호출. 트라우마를 감쇄하고 현재 오프셋을 계산한다.
 * @param state   현재 ShakeState
 * @param deltaMs 경과 시간 (ms)
 * @returns [newState, offsetX, offsetY]
 */
export function updateShake(
  state: ShakeState,
  deltaMs: number,
): [ShakeState, number, number] {
  if (state.trauma <= 0) return [state, 0, 0]

  const deltaSec = deltaMs / 1000
  const newTrauma = Math.max(0, state.trauma - DECAY_PER_SEC * deltaSec)
  const newTime = state.time + deltaSec

  // shake = trauma² (곡선 감쇄)
  const shake = newTrauma * newTrauma
  const maxOff = shake * MAX_OFFSET_PX

  const rawX = noiseX(newTime * NOISE_FREQ, 0) * maxOff
  const rawY = noiseY(0, newTime * NOISE_FREQ) * maxOff

  // 픽셀 명료도 — 정수 스냅
  const offsetX = Math.round(rawX)
  const offsetY = Math.round(rawY)

  return [{ trauma: newTrauma, time: newTime }, offsetX, offsetY]
}
