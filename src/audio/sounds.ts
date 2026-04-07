/**
 * sounds.ts
 * jsfxr 24-element parameter arrays for all game sound effects.
 * Format: [waveType, envelopeAttack, envelopeSustain, envelopePunch, envelopeDecay,
 *          startFreq, minFreq, slide, deltaSlide, vibratoDepth, vibratoSpeed,
 *          changeAmount, changeSpeed, squareDuty, dutySweep, repeatSpeed,
 *          phaserOffset, phaserSweep, lpfCutoff, lpfCutoffSweep, lpfResonance,
 *          hpfCutoff, hpfCutoffSweep, masterVolume]
 */

/** 강화 성공 — 밝고 상승하는 쨍한 톤 */
export const SOUND_FORGE_SUCCESS: number[] = [
  0,    // wave: square
  0.0,  // attack
  0.1,  // sustain
  0.5,  // punch
  0.35, // decay
  0.52, // startFreq
  0.0,  // minFreq
  0.22, // slide
  0.0,  // deltaSlide
  0.0,  // vibratoDepth
  0.0,  // vibratoSpeed
  0.0,  // changeAmount
  0.0,  // changeSpeed
  0.5,  // squareDuty
  0.0,  // dutySweep
  0.0,  // repeatSpeed
  0.0,  // phaserOffset
  0.0,  // phaserSweep
  1.0,  // lpfCutoff
  0.0,  // lpfCutoffSweep
  0.0,  // lpfResonance
  0.0,  // hpfCutoff
  0.0,  // hpfCutoffSweep
  0.4,  // masterVolume
]

/** 강화 실패 — 둔탁하게 떨어지는 톤 */
export const SOUND_FORGE_FAIL: number[] = [
  3,    // wave: noise
  0.0,  // attack
  0.05, // sustain
  0.0,  // punch
  0.4,  // decay
  0.25, // startFreq
  0.0,  // minFreq
  -0.3, // slide (하강)
  0.0,  // deltaSlide
  0.0,  // vibratoDepth
  0.0,  // vibratoSpeed
  0.0,  // changeAmount
  0.0,  // changeSpeed
  0.0,  // squareDuty
  0.0,  // dutySweep
  0.0,  // repeatSpeed
  0.0,  // phaserOffset
  0.0,  // phaserSweep
  0.5,  // lpfCutoff
  -0.2, // lpfCutoffSweep
  0.0,  // lpfResonance
  0.0,  // hpfCutoff
  0.0,  // hpfCutoffSweep
  0.45, // masterVolume
]

/** 파괴 — 무겁고 낮은 폭발음 */
export const SOUND_FORGE_DESTROY: number[] = [
  3,    // wave: noise
  0.0,  // attack
  0.1,  // sustain
  0.6,  // punch
  0.6,  // decay
  0.1,  // startFreq
  0.0,  // minFreq
  -0.5, // slide
  0.0,  // deltaSlide
  0.0,  // vibratoDepth
  0.0,  // vibratoSpeed
  0.0,  // changeAmount
  0.0,  // changeSpeed
  0.0,  // squareDuty
  0.0,  // dutySweep
  0.0,  // repeatSpeed
  0.0,  // phaserOffset
  0.0,  // phaserSweep
  0.3,  // lpfCutoff
  -0.3, // lpfCutoffSweep
  0.5,  // lpfResonance
  0.0,  // hpfCutoff
  0.0,  // hpfCutoffSweep
  0.55, // masterVolume
]

/** UI 클릭 — 가벼운 틱 */
export const SOUND_UI_CLICK: number[] = [
  0,    // wave: square
  0.0,  // attack
  0.0,  // sustain
  0.1,  // punch
  0.12, // decay
  0.6,  // startFreq
  0.0,  // minFreq
  0.0,  // slide
  0.0,  // deltaSlide
  0.0,  // vibratoDepth
  0.0,  // vibratoSpeed
  0.0,  // changeAmount
  0.0,  // changeSpeed
  0.5,  // squareDuty
  0.0,  // dutySweep
  0.0,  // repeatSpeed
  0.0,  // phaserOffset
  0.0,  // phaserSweep
  1.0,  // lpfCutoff
  0.0,  // lpfCutoffSweep
  0.0,  // lpfResonance
  0.0,  // hpfCutoff
  0.0,  // hpfCutoffSweep
  0.25, // masterVolume
]

/** 복원권 사용 — 마법 같은 상승음 */
export const SOUND_SCROLL_USE: number[] = [
  1,    // wave: sawtooth
  0.0,  // attack
  0.15, // sustain
  0.3,  // punch
  0.45, // decay
  0.35, // startFreq
  0.0,  // minFreq
  0.35, // slide
  0.0,  // deltaSlide
  0.1,  // vibratoDepth
  0.2,  // vibratoSpeed
  0.0,  // changeAmount
  0.0,  // changeSpeed
  0.0,  // squareDuty
  0.0,  // dutySweep
  0.0,  // repeatSpeed
  0.0,  // phaserOffset
  0.0,  // phaserSweep
  0.8,  // lpfCutoff
  0.1,  // lpfCutoffSweep
  0.3,  // lpfResonance
  0.0,  // hpfCutoff
  0.0,  // hpfCutoffSweep
  0.38, // masterVolume
]

/** 칭호 획득 — 팡파르 느낌의 짧은 상승 */
export const SOUND_TITLE_UNLOCK: number[] = [
  0,    // wave: square
  0.0,  // attack
  0.2,  // sustain
  0.4,  // punch
  0.5,  // decay
  0.4,  // startFreq
  0.0,  // minFreq
  0.3,  // slide
  0.05, // deltaSlide
  0.0,  // vibratoDepth
  0.0,  // vibratoSpeed
  0.5,  // changeAmount
  0.55, // changeSpeed
  0.5,  // squareDuty
  0.0,  // dutySweep
  0.3,  // repeatSpeed
  0.0,  // phaserOffset
  0.0,  // phaserSweep
  1.0,  // lpfCutoff
  0.0,  // lpfCutoffSweep
  0.0,  // lpfResonance
  0.0,  // hpfCutoff
  0.0,  // hpfCutoffSweep
  0.45, // masterVolume
]

/** 이스터에그 칭호 — 글리치 느낌의 노이즈 버스트 */
export const SOUND_TITLE_EASTER_EGG: number[] = [
  3,    // wave: noise
  0.05, // attack
  0.3,  // sustain
  0.8,  // punch
  0.7,  // decay
  0.5,  // startFreq
  0.0,  // minFreq
  0.0,  // slide
  0.0,  // deltaSlide
  0.5,  // vibratoDepth
  0.8,  // vibratoSpeed
  0.0,  // changeAmount
  0.0,  // changeSpeed
  0.0,  // squareDuty
  0.0,  // dutySweep
  0.5,  // repeatSpeed
  0.3,  // phaserOffset
  0.2,  // phaserSweep
  0.6,  // lpfCutoff
  0.0,  // lpfCutoffSweep
  0.5,  // lpfResonance
  0.1,  // hpfCutoff
  0.0,  // hpfCutoffSweep
  0.5,  // masterVolume
]
