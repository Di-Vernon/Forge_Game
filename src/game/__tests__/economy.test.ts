import { describe, it, expect } from 'vitest'
import {
  getUpgradeCost,
  canSell,
  getSellPrice,
  canAffordUpgrade,
  deductUpgradeCost,
  addSellProceeds,
} from '../economy'

describe('getUpgradeCost', () => {
  it('level 0 (목검): 5G', () => {
    expect(getUpgradeCost(0)).toBe(5)
  })

  it('level 1 (훈련용 목검): 10G', () => {
    expect(getUpgradeCost(1)).toBe(10)
  })

  it('level 15 (암월의 대검→블러디 쇼텔): 1900G', () => {
    expect(getUpgradeCost(15)).toBe(1900)
  })

  it('level 16 (블러디 쇼텔→백야): 2700G', () => {
    expect(getUpgradeCost(16)).toBe(2700)
  })

  it('level 17 (백야→하운드): 3800G', () => {
    expect(getUpgradeCost(17)).toBe(3800)
  })

  it('level 23 (격노→태초): 28000G', () => {
    expect(getUpgradeCost(23)).toBe(28000)
  })

  it('level 24 (태초→여명): 0G (재료만 필요)', () => {
    expect(getUpgradeCost(24)).toBe(0)
  })

  it('존재하지 않는 레벨에서 에러', () => {
    expect(() => getUpgradeCost(99)).toThrow()
  })
})

describe('canSell', () => {
  it('+0~+24는 판매 가능', () => {
    for (let i = 0; i <= 24; i++) {
      expect(canSell(i)).toBe(true)
    }
  })

  it('+25 여명은 판매 불가', () => {
    expect(canSell(25)).toBe(false)
  })
})

describe('getSellPrice', () => {
  it('level 0 (목검): 2G', () => {
    expect(getSellPrice(0, null)).toBe(2)
  })

  it('level 12 (엑스칼리버): 10000G', () => {
    expect(getSellPrice(12, null)).toBe(10000)
  })

  it('흥정의 달인: 판매가 +50%', () => {
    // 2G * 1.5 = 3G
    expect(getSellPrice(0, 'bargain_master')).toBe(3)
    // 10000G * 1.5 = 15000G
    expect(getSellPrice(12, 'bargain_master')).toBe(15000)
  })

  it('흥정의 달인: 소수점 내림 처리 (floor)', () => {
    // level 1: 12G * 1.5 = 18G (딱 떨어짐)
    expect(getSellPrice(1, 'bargain_master')).toBe(18)
    // level 7: 700G * 1.5 = 1050G
    expect(getSellPrice(7, 'bargain_master')).toBe(1050)
  })

  it('+25 여명에 호출하면 에러', () => {
    expect(() => getSellPrice(25, null)).toThrow()
    expect(() => getSellPrice(25, 'bargain_master')).toThrow()
  })
})

describe('canAffordUpgrade', () => {
  it('보유 골드 >= 비용: true', () => {
    expect(canAffordUpgrade(10, 1)).toBe(true)   // 10 >= 10 ✓
    expect(canAffordUpgrade(50, 1)).toBe(true)   // 여유 있음
  })

  it('보유 골드 < 비용: false', () => {
    expect(canAffordUpgrade(9, 1)).toBe(false)   // 9 < 10
    expect(canAffordUpgrade(0, 5)).toBe(false)   // 0 < 32
  })

  it('level 17 (비용 3800G): 충분한 골드면 true', () => {
    expect(canAffordUpgrade(3800, 17)).toBe(true)
    expect(canAffordUpgrade(3799, 17)).toBe(false)
  })

  it('level 0 (비용 5G): 0G면 false', () => {
    expect(canAffordUpgrade(0, 0)).toBe(false)
    expect(canAffordUpgrade(5, 0)).toBe(true)
  })
})

describe('deductUpgradeCost', () => {
  it('정상 차감', () => {
    expect(deductUpgradeCost(100, 1)).toBe(90)   // 100 - 10
    expect(deductUpgradeCost(100, 3)).toBe(78)   // 100 - 22
  })

  it('골드 부족 시 에러', () => {
    expect(() => deductUpgradeCost(5, 1)).toThrow()  // 5 < 10
  })

  it('level 17 (비용 3800G): 정상 차감', () => {
    expect(deductUpgradeCost(10000, 17)).toBe(10000 - 3800)
  })
})

describe('addSellProceeds', () => {
  it('골드에 판매가 합산', () => {
    expect(addSellProceeds(500, 0, null)).toBe(502)   // 500 + 2
    expect(addSellProceeds(0, 12, null)).toBe(10000)
  })

  it('흥정의 달인 보너스 반영', () => {
    expect(addSellProceeds(0, 12, 'bargain_master')).toBe(15000)
  })

  it('+25 여명 시도 시 에러', () => {
    expect(() => addSellProceeds(1000000, 25, null)).toThrow()
  })
})
