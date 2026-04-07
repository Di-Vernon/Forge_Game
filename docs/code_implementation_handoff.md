# 검 만들기 게임 — 코드 구현 세션 핸드오프

이 문서는 **다음 대화에서 첫 메시지로 전달**하면 된다. 이 문서만으로 작업 맥락을 이해하고 7개 Step을 순차 실행할 수 있도록 설계되었다.

---

## 프로젝트 개요

한국 플래시게임 "검 강화하기" 리마스터. +0(목검)→+25(여명) 강화 게임.
React 18 + Vite + TypeScript. localStorage 기반. 게임 엔진 106+ 유닛 테스트 보유.
프로젝트 경로: `C:\Users\PC\project\Forge_Game\`

**게임 모토**: "초반 운게임 → 중반 전략게임(칭호 교체로 자원 관리) → 후반 스토리게임(검 설명문으로 세계관 유추)"

**문서 참조** (상세 데이터는 여기에):
- `CLAUDE.md` — 개발 규칙 (~80줄)
- `docs/knowledge_base.md` — 게임 설계 성경 (v4.0)
- `docs/glossary.md` — 용어 사전
- `docs/balancing_status.md` — 확정/미확정 수치 현황

---

## 이번 세션의 목표

**게임 엔진의 핵심 메커니즘을 v4.0 설계에 맞게 전면 업데이트한다.**

현재 코드는 v1.0 설계(불굴 = 1회 발동 + 단계 하락 모델, 칭호 7개)를 기반으로 한다.
v4.0 설계(불굴/검성 = 확률 기반 보호 모델, 칭호 9개, 잔해 100%+2배, 건너뛰기 시스템)로 전환해야 한다.

---

## 현재 코드 ↔ 목표 설계: 구체적 갭

### 1. TitleId (types/index.ts)

**현재**:
```typescript
export type TitleId =
  | 'beginners_luck'     // 초심자의 행운
  | 'indomitable_smith'  // 불굴의 대장장이
  | 'bargain_master'     // 흥정의 달인
  | 'master_smith'       // 달인 대장장이
  | 'legend_smith'       // 전설의 대장장이
  | 'divine_realm'       // 신의 경지에 오른 자 ← 삭제 대상
  | 'mythic_tale'        // 신화 속 이야기
  | 'title_8'            // 미정 ← 삭제 대상
  | 'title_9'            // 미정 ← 삭제 대상
```

**목표**:
```typescript
export type TitleId =
  | 'beginners_luck'     // 초심자의 행운
  | 'bargain_master'     // 흥정의 달인
  | 'scavenger'          // 잔해의 수집가 ← 신규
  | 'indomitable_smith'  // 불굴의 대장장이
  | 'master_smith'       // 달인 대장장이
  | 'refine_peak'        // 재련의 정점 ← 신규
  | 'sword_saint'        // 검성의 대장장이 ← 신규
  | 'legend_smith'       // 전설의 대장장이
  | 'mythic_tale'        // 신화 속 이야기
```

### 2. GameState (types/index.ts)

**추가해야 할 필드**:
```typescript
interface GameState {
  // 기존 필드 유지 +
  destroyCountHigh: number    // +8 이상에서 파괴된 횟수 (불굴 조건용)
  craftCount: number          // 제작 횟수 (강화 성공 + 조합소 합산) (재련의 정점 조건용)
  craftCountCombine: number   // 조합소 제작 횟수 (재련의 정점 조건용)
  totalFragsAcquired: number  // 총 조각 획득 수 (잔해의 수집가 조건용)
  fragTypesEverOwned: FragmentId[]  // 보유한 적 있는 조각 종류 (잔해의 수집가 조건용)
  baekYaCrafted: boolean      // 백야(+17) 최초 제작 여부 (검성 조건용)
}
```

### 3. ForgeOutcome (types/index.ts)

**현재** (단계 하락 모델):
```typescript
interface ForgeOutcome {
  result: 'success' | 'fail'
  isNearMiss: boolean
  destroyed: boolean
  indomitableTriggered: boolean  // 불굴 발동
  levelsDropped: number          // 1~4단계 하락 ← 폐기
  newLevel: number
}
```

**목표** (보호 모델):
```typescript
interface ForgeOutcome {
  result: 'success' | 'fail'
  isNearMiss: boolean
  destroyed: boolean                  // true = +0 리셋
  protectionTriggered: boolean        // 불굴 or 검성 보호 발동 여부
  protectionSource: TitleId | null    // 어떤 칭호가 보호했는지
  newLevel: number                    // 성공 시 +1, 보호 시 현재 유지, 파괴 시 0
  // 조각 드랍은 ForgeOutcome에 포함하지 않음. DestroyScreen에서 별도 호출.
}
```

### 4. engine.ts — attemptForge()

**현재 로직**:
```
실패 → 불굴 장착 + 라운드 미사용 → 발동 → 1~4단계 하락
실패 → 그 외 → 파괴 (+0 리셋)
```

**목표 로직**:
```
실패 → 불굴 장착 → 30% 확률로 보호(레벨 유지), 70% 파괴(+0)
실패 → 검성 장착 → 55% 확률로 보호(레벨 유지), 45% 파괴(+0)
실패 → 그 외 칭호 or 미장착 → 무조건 파괴(+0)
달인 장착 시 → 성공률 +2%p (기존과 동일, 보호 없음)
```

**추가**: 재료 체크는 attemptForge 외부에서 처리. attemptForge는 순수 판정만.

### 5. titles.ts — isTitleConditionMet()

**현재 → 목표** 변경사항:

| TitleId | 현재 조건 | 목표 조건 |
|---------|----------|----------|
| beginners_luck | destroyCount >= 1 | 동일 |
| bargain_master | sellCount >= 15 | 동일 |
| **scavenger** | 없음 | fragTypesEverOwned.length >= 5 OR totalFragsAcquired >= 20 |
| indomitable_smith | destroyCount >= 15 | **destroyCountHigh >= 15** |
| master_smith | peakLevel >= 18 | 동일 |
| **refine_peak** | 없음 | craftCountCombine >= 3 |
| **sword_saint** | 없음 | baekYaCrafted === true |
| legend_smith | peakLevel === 25 | 동일 |
| ~~divine_realm~~ | 25강 2개 보관 | **삭제** |
| mythic_tale | 1~25 전부 보관 | 동일 |

### 6. fragments.ts — rollFragmentDrop()

**현재**: 초심자의 행운만 100% 드랍
**목표**:
- 초심자의 행운: 100% 드랍 (1개)
- **잔해의 수집가**: 100% 드랍 + 수량 2배 (2개)
- **검성의 대장장이**: 파괴 시 50% 확률로 검성의 파편 추가 드랍 (일반 드랍과 별도 판정)
- 기본: dropBaseChance 확률로 1개

### 7. config.json

**주요 변경**:
- `destroyPrevention` → 삭제 (단계 하락 모델 폐기)
- `titles` → 9개로 업데이트 (divine_realm, title_8, title_9 삭제. scavenger, sword_saint, refine_peak 추가)
- `titleProtection` → 신규 섹션 (불굴 30%, 검성 55%, 검성 파편 50%)
- `materialRequirements` → 신규 섹션 (재료 체인 v7)
- `skipCosts` → 신규 섹션 (칭호별 건너뛰기 비용)
- `masterSmithBonusRate` → 0.02로 변경 (0.03 → 0.02)
- `initialGold` → 2000으로 변경 (500 → 2000)

### 8. 신규: game/skip.ts

```typescript
// 건너뛰기: 칭호 부가효과. 골드+조각 1개 지불 → 즉시 검 획득
export function canSkip(state: GameState, targetLevel: number): boolean
export function executeSkip(state: GameState, targetLevel: number): GameState
```

---

## 7 Step 작업 계획

### Step 1: 타입 + config.json 설계 (Claude와 논의)

Claude와 함께 아래를 확정한 후, Claude Code 프롬프트를 작성:
1. TitleId 9개 ID 최종 확인
2. GameState 추가 필드 확정
3. ForgeOutcome 새 구조 확정
4. config.json 전체 스키마 설계
5. Round 인터페이스 변경 (indomitableUsed → 삭제. 보호 모델에서는 라운드당 제한 없음)

**미리 정해야 할 설계 결정**:
- (a) ForgeOutcome에서 levelsDropped를 완전 제거할지 → **제거 추천**. 복원 스크롤의 하락 단계는 별도 함수로 분리.
- (b) config.json의 `phases` 키를 `blocks`로 변경할지 → **변경 추천**. 코드와 설계 용어 통일.
- (c) 재료 데이터 위치 → **config.json에 `materialRequirements` 섹션으로 추가 추천**. swords.json은 표시 데이터만.

### Step 2: 타입 + config 구현 (Claude Code)

```
Claude Code에 지시할 내용:
1. types/index.ts — TitleId, GameState, ForgeOutcome, Round 수정
2. data/config.json — 전면 재작성 (새 스키마)
3. npm run build 통과 확인 (타입 에러는 OK, 컴파일 에러만 수정)
```

### Step 3: 엔진 + 칭호 + 조각 설계 (Claude와 논의)

Claude와 함께 각 함수의 입출력/분기/엣지케이스를 명세한 후, Claude Code 프롬프트 작성.
핵심: attemptForge()의 보호 판정 로직, 재료 체크 분리, 조각 드랍의 잔해/검성 분기.

### Step 4: 엔진 + 칭호 + 조각 구현 (Claude Code) ← 가장 큰 작업

```
Claude Code에 지시할 내용:
1. engine.ts — attemptForge() 보호 모델로 전면 수정. rollLevelDrop() 삭제.
2. titles.ts — 9개 칭호 조건. getNewlyUnlockedTitles() 업데이트.
3. fragments.ts — rollFragmentDrop()에 잔해/검성 분기 추가.
4. economy.ts — getUpgradeCost()가 +17 이상에서도 골드 비용 반환하도록 수정.
5. 테스트 전면 업데이트 (engine.test.ts, titles.test.ts, fragments.test.ts)
6. npm test 통과 확인
```

### Step 5: 건너뛰기 + 칭호 UI 설계 (Claude와 논의)

game/skip.ts 로직 + 칭호 패널 UI 컴포넌트 설계.

### Step 6: 건너뛰기 + 칭호 UI 구현 (Claude Code)

```
Claude Code에 지시할 내용:
1. game/skip.ts 신규 구현 + 테스트
2. 칭호 UI 컴포넌트 (미해금 칭호 조건 표시, 장착 토글)
3. npm test + npm run build 통과
```

### Step 7: 통합 테스트 (Claude Code)

전체 테스트 스위트 + 시나리오별 검증.

---

## 핵심 설계 규칙 (Claude Code에 항상 전달)

1. 모든 확률/비용은 `data/config.json`에서 읽기 (하드코딩 금지)
2. `game/` 폴더는 React에 의존하지 않는 순수 함수
3. ForgeOutcome에 조각 드랍 포함하지 않음 — DestroyScreen "줍기" 시 별도 호출
4. "제작" 카운트 = 강화 성공 + 조합소 합산
5. 라운드 중 칭호 변경 불가 — equipTitle() 가드
6. "파괴" = 보호 미발동 시에만 발생. "실패" ≠ "파괴"
7. 재료 소모 시점: 강화 시도 시 즉시 소모. 보호 발동 시에도 소모 (재련의 정점 장착 시 예외)

---

## 재료 체인 (v7, 비재귀적, config.json에 반영)

```
+17: 엑스칼리버(+12) ×1
+18: 엑스칼리버(+12) ×1
+19: 엑스칼리버(+12) ×2
+20: 블러디 쇼텔(+16) ×1
+21: 무형검(+11) ×1
+22: 블러디 쇼텔(+16) ×1
+23: 투박한 철검(+2) ×1
+24: 블러디 쇼텔(+16) ×1
+25: 블러디 쇼텔(+16) ×2 + 엑스칼리버(+12) ×1
```

---

## 칭호 9개 확정 데이터

| # | ID | 이름 | 획득 조건 | 주 효과 | 건너뛰기 |
|---|-----|------|----------|---------|---------|
| 1 | beginners_luck | 초심자의 행운 | 첫 파괴 | 100% 조각 드랍 | 없음 |
| 2 | bargain_master | 흥정의 달인 | 15회 판매 | 판매가 +50% | 없음 |
| 3 | scavenger | 잔해의 수집가 | 조각 5종 보유 or 20개 획득 | 100% 드랍 + 2배 | +0→+5 |
| 4 | indomitable_smith | 불굴의 대장장이 | +8이상 15회 파괴 | 30% 보호 | +0→+7 |
| 5 | master_smith | 달인 대장장이 | +18 첫 제작 | 확률 +2%p | +0→+12 |
| 6 | refine_peak | 재련의 정점 | 조합소 제작 3회 | +17+ 재료 보존 | +0→+12 |
| 7 | sword_saint | 검성의 대장장이 | 백야(+17) 최초 제작 | 55% 보호 + 50% 파편 | +0→+8 |
| 8 | legend_smith | 전설의 대장장이 | +25 제작 | +25 무료 제작 | +25 |
| 9 | mythic_tale | 신화 속 이야기 | +1~+25 전부 보관 | 없음 | 없음 |

---

## 작업 흐름

```
[Step 1] Claude와 논의 → 타입+config 설계 확정
  ↓ Jeffrey: "이 프롬프트를 Claude Code에 전달해"
[Step 2] Claude Code 실행 → types/, config.json 수정
  ↓ Jeffrey: "결과 보고" → Claude 확인
[Step 3] Claude와 논의 → 엔진+칭호+조각 설계 확정
  ↓ Jeffrey: "이 프롬프트를 Claude Code에 전달해"
[Step 4] Claude Code 실행 → game/*.ts + 테스트 수정 (가장 큰 작업)
  ↓ Jeffrey: "결과 보고" → Claude 확인
[Step 5] Claude와 논의 → 건너뛰기+UI 설계 확정
  ↓ Jeffrey: "이 프롬프트를 Claude Code에 전달해"
[Step 6] Claude Code 실행 → game/skip.ts + UI 구현
  ↓
[Step 7] Claude Code 실행 → 통합 테스트
```

각 Step에서 Claude는 **Claude Code에 전달할 프롬프트를 작성**하고, Jeffrey가 이를 **복사해서 Claude Code에 붙여넣기**한다. Claude Code 실행 결과를 Jeffrey가 Claude에게 보고하면, Claude가 리뷰하고 다음 Step으로 넘어간다.

---

## 시작하기

다음 대화에서 이 문서를 전달한 후, "Step 1부터 시작하자"라고 말하면 된다.

Step 1에서 먼저 결정할 세 가지:
1. ForgeOutcome.levelsDropped 제거 여부 (추천: 제거)
2. config.json phases → blocks 변경 여부 (추천: 변경)
3. 재료 데이터를 config.json에 넣을지 swords.json에 넣을지 (추천: config.json)
