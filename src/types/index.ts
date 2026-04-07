// ────────────────────────────────────────────────────────────────
// 검 (Sword)
// ────────────────────────────────────────────────────────────────

/**
 * Block 분류
 * 1: Block 1 (+0~+7)  — 운게임. 골드 전용
 * 2: Block 2 (+8~+12) — 학습. 골드 전용
 * 3: Block 3 (+13~+16) — 전략 전환. 골드 전용
 * 4: Block 4 (+17~+22) — 오기 구간. 골드 + 하위 검 재료
 * 5: Block 5 (+23~+24) — 최종 도전. 골드 + 하위 검 재료
 * 6: Block 6 (+25)     — 완주. 재료만
 */
export type Block = 1 | 2 | 3 | 4 | 5 | 6

export interface Sword {
  /** 강화 단계 0~25 */
  level: number
  /** 검 이름 (예: "목검", "여명") */
  name: string
  /** 검 도안 설명문 */
  description: string
  /** 판매가 (골드). +25 여명은 null (판매 불가) */
  sellPrice: number | null
  /** Block 분류 */
  block: Block
}

// ────────────────────────────────────────────────────────────────
// 조각 (Fragment)
// ────────────────────────────────────────────────────────────────

export type FragmentId =
  | 'rusty_iron'      // 녹슨 철조각
  | 'refined_iron'    // 정제된 철조각
  | 'enchanted_iron'  // 마력이 부여된 철조각
  | 'moonlight'       // 달빛 조각
  | 'unknown_mineral' // 알 수 없는 광물 파편
  | 'spirit'          // 사령 조각
  | 'swordmaster'     // 검성의 파편
  | 'twisted_mana'    // 뒤틀린 마력파편

export interface Fragment {
  id: FragmentId
  name: string
}

export interface FragmentInventory {
  rusty_iron: number
  refined_iron: number
  enchanted_iron: number
  moonlight: number
  unknown_mineral: number
  spirit: number
  swordmaster: number
  twisted_mana: number
}

// ────────────────────────────────────────────────────────────────
// 칭호 (Title)
// ────────────────────────────────────────────────────────────────

export type TitleId =
  | 'beginners_luck'     // #1 초심자의 행운
  | 'bargain_master'     // #2 흥정의 달인
  | 'scavenger'          // #3 잔해의 수집가
  | 'indomitable_smith'  // #4 불굴의 대장장이
  | 'master_smith'       // #5 달인 대장장이
  | 'refine_peak'        // #6 재련의 정점
  | 'sword_saint'        // #7 검성의 대장장이
  | 'legend_smith'       // #8 전설의 대장장이
  | 'mythic_tale'        // #9 신화 속 이야기

export interface Title {
  id: TitleId
  name: string
  /** 획득 조건 설명 */
  condition: string
  /** 효과 설명 */
  effectDescription: string
}

// ────────────────────────────────────────────────────────────────
// 강화 결과 (ForgeOutcome)
// ────────────────────────────────────────────────────────────────

export interface ForgeOutcome {
  /** 성공/실패 판정 */
  result: 'success' | 'fail'
  /**
   * Near-miss 여부. 판정 로직에 영향 없음 — 연출 플래그.
   * 실패 시 fromLevel >= 15이면 true.
   */
  isNearMiss: boolean
  /** 검 파괴 여부. true이면 라운드 종료 */
  destroyed: boolean
  /**
   * 칭호 보호 발동 여부 (불굴 35% / 검성 60%).
   * 발동 시 destroyed=false, newLevel=현재 레벨 유지.
   */
  protectionTriggered: boolean
  /**
   * 보호를 발동시킨 칭호 ID. 미발동 시 null.
   */
  protectionSource: TitleId | null
  /**
   * 강화 후 레벨. 파괴 시에는 의미 없음 (destroyed 플래그로 판단할 것).
   */
  newLevel: number
}

// ────────────────────────────────────────────────────────────────
// 라운드 (Round)
// 0강 시작 → 판매/파괴 종료까지 한 사이클
// ────────────────────────────────────────────────────────────────

export type RoundEndReason = 'sold' | 'destroyed' | 'stored' | 'max_level'

export interface Round {
  /** 라운드 ID (단조 증가) */
  id: number
  /** 시작 시각 (epoch ms) */
  startedAt: number
  /** 종료 시각. 진행 중이면 null */
  endedAt: number | null
  /** 최고 달성 단계 */
  peakLevel: number
  /** 라운드 종료 이유 */
  endReason: RoundEndReason | null
  /** 이 라운드에서 사용한 총 골드 */
  totalSpent: number
  /** 이 라운드에서 획득한 골드 (판매 시) */
  totalEarned: number
}

// ────────────────────────────────────────────────────────────────
// 게임 상태 (GameState)
// ────────────────────────────────────────────────────────────────

export interface GameState {
  /** 현재 골드 */
  gold: number
  /** 현재 강화 중인 검 레벨 (0~25). null이면 라운드 시작 전 */
  currentLevel: number | null
  /** 복원 스크롤 보유 개수 */
  scrolls: number
  /** 조각 인벤토리 */
  fragments: FragmentInventory
  /** 보관함에 있는 검 레벨 목록 */
  storage: number[]
  /** 보유 중인 칭호 ID 목록 */
  unlockedTitles: TitleId[]
  /** 현재 장착 칭호 */
  equippedTitle: TitleId | null
  /** 누적 파괴 횟수 */
  destroyCount: number
  /** +8 이상에서 파괴된 횟수 (불굴의 대장장이 조건용) */
  destroyCountHigh: number
  /** 누적 판매 횟수 */
  sellCount: number
  /** 제작 횟수 — 강화 성공 + 조합소 제작 합산 (달인/전설 조건 참조) */
  craftCount: number
  /** 조합소 제작 횟수 (재련의 정점 조건용) */
  craftCountCombine: number
  /** 총 조각 획득 수 (잔해의 수집가 조건용) */
  totalFragsAcquired: number
  /** 보유한 적 있는 조각 종류 (잔해의 수집가 조건용) */
  fragTypesEverOwned: FragmentId[]
  /** 백야(+17) 최초 제작 여부 (검성의 대장장이 조건용) */
  baekYaCrafted: boolean
  /** 라운드 기록 (완료된 라운드) */
  rounds: Round[]
  /** 현재 진행 중인 라운드 */
  currentRound: Round | null
  /** 저장 버전 (마이그레이션 대비) */
  version: number
}
