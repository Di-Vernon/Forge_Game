import { describe, it, expect } from 'vitest'
import { getSuccessRate, attemptForge } from '../engine'

// ────────────────────────────────────────────────────────────────
// 헬퍼
// ────────────────────────────────────────────────────────────────

/** rng를 순서대로 반환하는 시퀀스 생성기 */
function seq(...values: number[]) {
  let i = 0
  return () => values[i++]
}

// ────────────────────────────────────────────────────────────────
// getSuccessRate
// ────────────────────────────────────────────────────────────────

describe('getSuccessRate', () => {
  it('+0→+1은 95%', () => {
    expect(getSuccessRate(0, null)).toBe(0.95)
  })

  it('+24→+25는 65%', () => {
    expect(getSuccessRate(24, null)).toBe(0.65)
  })

  it('달인 대장장이: 기본 확률 + 0.02', () => {
    // +0: 0.95 + 0.02 = 0.97
    expect(getSuccessRate(0, 'master_smith')).toBeCloseTo(0.97)
    // +24: 0.65 + 0.02 = 0.67
    expect(getSuccessRate(24, 'master_smith')).toBeCloseTo(0.67)
  })

  it('달인 대장장이: 합산 확률이 1.0을 초과하지 않음', () => {
    expect(getSuccessRate(0, 'master_smith')).toBeLessThanOrEqual(1.0)
  })

  it('다른 칭호는 확률 보정 없음', () => {
    expect(getSuccessRate(10, 'bargain_master')).toBe(0.60)
    expect(getSuccessRate(10, 'indomitable_smith')).toBe(0.60)
  })

  it('잘못된 레벨에서 에러 발생', () => {
    expect(() => getSuccessRate(25, null)).toThrow()
    expect(() => getSuccessRate(-1, null)).toThrow()
  })
})

// ────────────────────────────────────────────────────────────────
// attemptForge
// ────────────────────────────────────────────────────────────────

describe('attemptForge', () => {
  describe('성공 케이스', () => {
    it('rng가 성공률 미만이면 성공', () => {
      const outcome = attemptForge(0, null, seq(0.0))
      expect(outcome.result).toBe('success')
      expect(outcome.newLevel).toBe(1)
      expect(outcome.destroyed).toBe(false)
      expect(outcome.isNearMiss).toBe(false)
      expect(outcome.protectionTriggered).toBe(false)
      expect(outcome.protectionSource).toBeNull()
    })

    it('+14 성공: nearMiss false', () => {
      const outcome = attemptForge(14, null, seq(0.0))
      expect(outcome.result).toBe('success')
      expect(outcome.isNearMiss).toBe(false)
    })

    it('+15 성공: nearMiss false (성공이면 nearMiss 없음)', () => {
      const outcome = attemptForge(15, null, seq(0.0))
      expect(outcome.result).toBe('success')
      expect(outcome.isNearMiss).toBe(false)
    })
  })

  describe('실패 + 파괴', () => {
    it('칭호 없음, 실패 → 파괴', () => {
      const outcome = attemptForge(5, null, seq(0.99))
      expect(outcome.result).toBe('fail')
      expect(outcome.destroyed).toBe(true)
      expect(outcome.protectionTriggered).toBe(false)
      expect(outcome.protectionSource).toBeNull()
    })

    it('+14 실패: nearMiss false', () => {
      const outcome = attemptForge(14, null, seq(0.99))
      expect(outcome.isNearMiss).toBe(false)
    })

    it('+15 실패: nearMiss true', () => {
      const outcome = attemptForge(15, null, seq(0.99))
      expect(outcome.result).toBe('fail')
      expect(outcome.isNearMiss).toBe(true)
      expect(outcome.destroyed).toBe(true)
    })

    it('+24 실패: nearMiss true', () => {
      const outcome = attemptForge(24, null, seq(0.99))
      expect(outcome.isNearMiss).toBe(true)
    })
  })

  describe('불굴의 대장장이 (35% 보호)', () => {
    it('보호 발동: rng 2회차 < 0.35 → 레벨 유지', () => {
      // 1회차 rng(0.99): 실패 판정, 2회차 rng(0.05): 보호 발동 (0.05 < 0.35)
      const outcome = attemptForge(10, 'indomitable_smith', seq(0.99, 0.05))
      expect(outcome.result).toBe('fail')
      expect(outcome.destroyed).toBe(false)
      expect(outcome.protectionTriggered).toBe(true)
      expect(outcome.protectionSource).toBe('indomitable_smith')
      expect(outcome.newLevel).toBe(10)
    })

    it('보호 미발동: rng 2회차 >= 0.35 → 파괴', () => {
      // 2회차 rng(0.35): 보호 미발동 (0.35 >= 0.35)
      const outcome = attemptForge(10, 'indomitable_smith', seq(0.99, 0.35))
      expect(outcome.destroyed).toBe(true)
      expect(outcome.protectionTriggered).toBe(false)
      expect(outcome.protectionSource).toBeNull()
    })

    it('칭호 미장착: 보호 없음 → 파괴', () => {
      const outcome = attemptForge(10, null, seq(0.99))
      expect(outcome.destroyed).toBe(true)
      expect(outcome.protectionTriggered).toBe(false)
    })

    it('+15 실패 + 불굴 발동: nearMiss true이면서 destroyed false', () => {
      const outcome = attemptForge(15, 'indomitable_smith', seq(0.99, 0.05))
      expect(outcome.isNearMiss).toBe(true)
      expect(outcome.destroyed).toBe(false)
      expect(outcome.protectionTriggered).toBe(true)
    })
  })

  describe('검성의 대장장이 (60% 보호)', () => {
    it('보호 발동: rng 2회차 < 0.60 → 레벨 유지', () => {
      const outcome = attemptForge(10, 'sword_saint', seq(0.99, 0.10))
      expect(outcome.result).toBe('fail')
      expect(outcome.destroyed).toBe(false)
      expect(outcome.protectionTriggered).toBe(true)
      expect(outcome.protectionSource).toBe('sword_saint')
      expect(outcome.newLevel).toBe(10)
    })

    it('보호 미발동: rng 2회차 >= 0.60 → 파괴', () => {
      const outcome = attemptForge(10, 'sword_saint', seq(0.99, 0.60))
      expect(outcome.destroyed).toBe(true)
      expect(outcome.protectionTriggered).toBe(false)
    })
  })

  describe('불굴 경계값', () => {
    it('보호 발동 경계: rng 2회차 = 0.34 → 보호 발동 (0.34 < 0.35)', () => {
      const outcome = attemptForge(10, 'indomitable_smith', seq(0.99, 0.34))
      expect(outcome.protectionTriggered).toBe(true)
      expect(outcome.destroyed).toBe(false)
    })
  })

  describe('검성 경계값', () => {
    it('보호 발동 경계: rng 2회차 = 0.59 → 보호 발동 (0.59 < 0.60)', () => {
      const outcome = attemptForge(10, 'sword_saint', seq(0.99, 0.59))
      expect(outcome.protectionTriggered).toBe(true)
      expect(outcome.destroyed).toBe(false)
    })
  })

  describe('경계값 / 예외', () => {
    it('level 25에서 호출하면 에러', () => {
      expect(() => attemptForge(25, null)).toThrow()
    })

    it('level -1에서 호출하면 에러', () => {
      expect(() => attemptForge(-1, null)).toThrow()
    })
  })
})
