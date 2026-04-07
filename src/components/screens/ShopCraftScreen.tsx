/**
 * ShopCraftScreen.tsx
 * 상점(복원 스크롤 구매) / 조합소(조각 → 스크롤·검 제작) — 탭 전환 구조.
 * KB 섹션 4 참조.
 */

import { useState } from 'react'
import styles from './ShopCraftScreen.module.css'
import Button from '../ui/Button'
import type { GameState, FragmentId, FragmentInventory } from '../../types'
import swordsData from '../../data/swords.json'
import configJson from '../../data/config.json'

// ── 정적 데이터 ─────────────────────────────────────────────────

type ScrollPriceKey = 'x1' | 'x5' | 'x10'

interface ScrollPriceEntry { count: number; price: number | null }
const scrollPrices = configJson.shop.scrollPrices as Record<ScrollPriceKey, ScrollPriceEntry>

const SCROLL_ITEMS: { key: ScrollPriceKey; label: string }[] = [
  { key: 'x1',  label: '복원 스크롤 ×1'  },
  { key: 'x5',  label: '복원 스크롤 ×5'  },
  { key: 'x10', label: '복원 스크롤 ×10' },
]

interface ScrollCraftEntry { fragmentId: string; amount: number | null; yield: number }
const scrollCraftRecipes = configJson.crafting.scroll as ScrollCraftEntry[]

interface SwordMaterial { fragmentId: string; amount: number | null }
interface SwordRecipe   { resultLevel: number; materials: SwordMaterial[] }
const swordCraftRecipes = configJson.crafting.swords as SwordRecipe[]

// 조각 한국어 이름
const fragmentNames = configJson.fragments as Record<string, { name: string }>
function fragName(id: string): string { return fragmentNames[id]?.name ?? id }

// 조각별 강조 색상
const FRAG_COLORS: Record<string, string> = {
  rusty_iron:      '#a06840',
  refined_iron:    '#b0b8c0',
  enchanted_iron:  '#60a0ff',
  moonlight:       '#90d0ff',
  unknown_mineral: '#80cc80',
  spirit:          '#c070ff',
  swordmaster:     '#ffe060',
  twisted_mana:    '#ff6070',
}

function formatGold(g: number): string { return g.toLocaleString('ko-KR') + ' G' }

// ── 조각 인벤토리 표시 ─────────────────────────────────────────

function FragmentInventory({ fragments }: { fragments: FragmentInventory }) {
  const entries = Object.entries(fragments) as [FragmentId, number][]
  const hasAny = entries.some(([, n]) => n > 0)

  return (
    <div className={styles.fragBar}>
      {entries.map(([id, count]) => (
        <div
          key={id}
          className={`${styles.fragChip} ${count === 0 ? styles.fragChipEmpty : ''}`}
          title={fragName(id)}
        >
          <span
            className={styles.fragDot}
            style={{ background: FRAG_COLORS[id] ?? '#888' }}
          />
          <span className={styles.fragLabel}>{fragName(id)}</span>
          <span className={styles.fragCount} style={count > 0 ? { color: FRAG_COLORS[id] } : {}}>
            {count}
          </span>
        </div>
      ))}
      {!hasAny && (
        <span className={styles.fragNone}>보유 조각 없음</span>
      )}
    </div>
  )
}

// ── 상점 탭 ────────────────────────────────────────────────────

interface ShopTabProps {
  gold: number
  scrolls: number
  onBuy: (count: number, totalPrice: number) => void
  showToast: (msg: string) => void
}

function ShopTab({ gold, scrolls, onBuy, showToast }: ShopTabProps) {
  function handleBuy(key: ScrollPriceKey) {
    const entry = scrollPrices[key]
    if (!entry.price) return
    onBuy(entry.count, entry.price)
    showToast(`복원 스크롤 ${entry.count}개 구매 완료`)
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.shopGoldBar}>
        <span className={styles.shopGoldLabel}>보유 골드</span>
        <span className={styles.shopGoldVal}>{formatGold(gold)}</span>
      </div>

      <ul className={styles.shopList}>
        {SCROLL_ITEMS.map(({ key, label }) => {
          const entry = scrollPrices[key]
          const price  = entry.price
          const canBuy = price !== null && gold >= price
          return (
            <li key={key} className={styles.shopItem}>
              <span className={styles.shopItemIcon}>📜</span>
              <div className={styles.shopItemInfo}>
                <span className={styles.shopItemName}>{label}</span>
                {price !== null
                  ? <span className={styles.shopItemPrice}>{formatGold(price)}</span>
                  : <span className={styles.shopItemTbd}>가격 미정</span>
                }
                {price !== null && gold < price && (
                  <span className={styles.shopItemWarn}>골드 부족</span>
                )}
              </div>
              <Button
                variant={canBuy ? 'gold' : 'ghost'}
                size="sm"
                disabled={!canBuy}
                onClick={() => handleBuy(key)}
              >
                구매
              </Button>
            </li>
          )
        })}
      </ul>

      <div className={styles.shopScrollBar}>
        <span className={styles.shopGoldLabel}>보유 스크롤</span>
        <span className={styles.shopGoldVal}>{scrolls}개</span>
      </div>
    </div>
  )
}

// ── 조합소 탭 ──────────────────────────────────────────────────

interface CraftTabProps {
  state: GameState
  onCraftSword: (level: number, materials: { fragmentId: FragmentId; amount: number }[]) => void
  showToast: (msg: string) => void
}

function CraftTab({ state, onCraftSword, showToast }: CraftTabProps) {
  const hasSword = state.currentLevel !== null

  function handleCraftSword(recipe: SwordRecipe) {
    const materials = recipe.materials as { fragmentId: FragmentId; amount: number }[]
    const sword = swordsData.find((s) => s.level === recipe.resultLevel)!
    showToast(`제작 완료! +${recipe.resultLevel} ${sword.name} → 강화소로 이동`)
    onCraftSword(recipe.resultLevel, materials)
  }

  return (
    <div className={styles.tabContent}>
      {/* 보유 조각 인벤토리 */}
      <div className={styles.sectionHeader}>보유 조각</div>
      <FragmentInventory fragments={state.fragments} />

      {/* ── A. 복원 스크롤 제작 ── */}
      <div className={styles.sectionHeader}>복원 스크롤 제작</div>
      <ul className={styles.craftList}>
        {scrollCraftRecipes.map((recipe) => {
          const have = state.fragments[recipe.fragmentId as FragmentId] ?? 0
          const isDefined = recipe.amount !== null
          const canCraft = isDefined && have >= recipe.amount!
          return (
            <li key={recipe.fragmentId} className={styles.craftItem}>
              <div className={styles.craftItemLeft}>
                <span
                  className={styles.craftFragDot}
                  style={{ background: FRAG_COLORS[recipe.fragmentId] ?? '#888' }}
                />
                <div className={styles.craftItemInfo}>
                  <span className={styles.craftItemName}>
                    {fragName(recipe.fragmentId)}
                  </span>
                  <span className={styles.craftItemMat}>
                    {isDefined
                      ? <>×{recipe.amount} <span className={styles.craftHave}>(보유: {have})</span></>
                      : <span className={styles.craftTbd}>재료 미정</span>
                    }
                    &nbsp;→&nbsp;스크롤 ×{recipe.yield}
                  </span>
                </div>
              </div>
              <Button
                variant={canCraft ? 'primary' : 'ghost'}
                size="sm"
                disabled={!canCraft}
              >
                제작
              </Button>
            </li>
          )
        })}
      </ul>

      {/* ── B. 검 직접 제작 ── */}
      <div className={styles.sectionHeader}>검 직접 제작</div>

      {hasSword && (
        <div className={styles.craftWarning}>
          현재 검을 판매하거나 보관한 후 제작 가능합니다
        </div>
      )}

      <ul className={styles.craftList}>
        {swordCraftRecipes.map((recipe) => {
          const sword = swordsData.find((s) => s.level === recipe.resultLevel)!
          const allDefined = recipe.materials.every((m) => m.amount !== null)
          const canAfford = allDefined && recipe.materials.every(
            (m) => (state.fragments[m.fragmentId as FragmentId] ?? 0) >= m.amount!
          )
          const canCraft = !hasSword && allDefined && canAfford

          return (
            <li key={recipe.resultLevel} className={styles.craftItem}>
              <div className={styles.craftItemLeft}>
                <span className={styles.craftSwordLevel} style={{ color: getSwordColor(recipe.resultLevel) }}>
                  +{recipe.resultLevel}
                </span>
                <div className={styles.craftItemInfo}>
                  <span className={styles.craftItemName}>{sword.name}</span>
                  <div className={styles.craftMaterials}>
                    {recipe.materials.map((mat) => {
                      const have = state.fragments[mat.fragmentId as FragmentId] ?? 0
                      const needed = mat.amount
                      const enough = needed !== null && have >= needed
                      return (
                        <span
                          key={mat.fragmentId}
                          className={`${styles.craftMatChip} ${enough ? styles.craftMatOk : ''} ${needed === null ? styles.craftMatTbd : ''}`}
                        >
                          <span style={{ color: FRAG_COLORS[mat.fragmentId] ?? '#888' }}>●</span>
                          {' '}{fragName(mat.fragmentId)}
                          {needed !== null
                            ? <> ×{needed} <span className={styles.craftHave}>({have}/{needed})</span></>
                            : ' × 미정'
                          }
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
              <Button
                variant={canCraft ? 'gold' : 'ghost'}
                size="sm"
                disabled={!canCraft}
                onClick={() => handleCraftSword(recipe)}
              >
                제작
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function getSwordColor(level: number): string {
  if (level >= 23) return '#ff5030'
  if (level >= 17) return '#ffe060'
  if (level >= 13) return '#c070ff'
  if (level >= 8)  return '#60a0ff'
  if (level >= 4)  return '#80cc60'
  return '#b0a080'
}

// ── Props ───────────────────────────────────────────────────────

interface Props {
  state: GameState
  onBack: () => void
  onBuyScroll: (count: number, totalPrice: number) => void
  onCraftSword: (level: number, materials: { fragmentId: FragmentId; amount: number }[]) => void
}

// ── 메인 컴포넌트 ───────────────────────────────────────────────

type Tab = 'shop' | 'craft'

export default function ShopCraftScreen({ state, onBack, onBuyScroll, onCraftSword }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('shop')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  return (
    <div className={styles.screen}>
      {/* ── 헤더 ────────────────────────── */}
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={onBack}>← 돌아가기</Button>

        {/* 탭 전환 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'shop' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            상점
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'craft' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('craft')}
          >
            조합소
          </button>
        </div>

        {/* 요약 stats */}
        <div className={styles.headerStats}>
          <span className={styles.hStat}>
            <span className={styles.hStatLabel}>G</span>
            <span className={styles.hStatVal}>{formatGold(state.gold)}</span>
          </span>
          <span className={styles.hStat}>
            <span className={styles.hStatLabel}>스크롤</span>
            <span className={styles.hStatVal}>{state.scrolls}</span>
          </span>
        </div>
      </header>

      {/* ── 탭 인디케이터 ───────────────── */}
      <div className={styles.tabBar}>
        <div
          className={styles.tabIndicator}
          style={{ transform: activeTab === 'craft' ? 'translateX(100%)' : 'translateX(0)' }}
        />
      </div>

      {/* ── 콘텐츠 ──────────────────────── */}
      <div className={styles.body}>
        {activeTab === 'shop' ? (
          <ShopTab
            gold={state.gold}
            scrolls={state.scrolls}
            onBuy={onBuyScroll}
            showToast={showToast}
          />
        ) : (
          <CraftTab
            state={state}
            onCraftSword={onCraftSword}
            showToast={showToast}
          />
        )}
      </div>

      {/* ── 토스트 ──────────────────────── */}
      {toast && (
        <div className={styles.toast}>{toast}</div>
      )}
    </div>
  )
}
