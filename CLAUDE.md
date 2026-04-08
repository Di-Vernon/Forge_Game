# Forge Game — 검 만들기 게임

검 강화하기 플래시게임 리마스터. +0→+25 확률 기반 강화 게임.
게임 모토: **"초반 운게임 → 중반 전략게임 → 후반 스토리게임"** (최대 7시간)

## ⚠️ 문서 동기화 규칙 (최우선)

게임 설계에 변경이 발생하면 (칭호, 확률, 비용, 재료, 조각, 건너뛰기 등), **반드시 아래 문서를 모두 업데이트**한다:
1. `CLAUDE.md` (이 파일) — 해당 변경이 개발 규칙에 영향을 주는 경우
2. `docs/knowledge_base.md` — 게임 설계 데이터 변경 시
3. `docs/balancing_status.md` — 수치 확정/변경 시
4. `docs/glossary.md` — 용어 추가/변경 시
5. `docs/simulation_history.md` — 시뮬레이션 완료 시
6. Project Custom Instruction — 칭호/Block/Phase/보호/건너뛰기 구조 변경 시

**코드 변경만 하고 문서를 업데이트하지 않는 것은 금지.** 문서와 코드가 불일치하면 다음 세션에서 잘못된 컨텍스트로 작업하게 된다.

## 용어

@docs/glossary.md 참조. Block(레벨 그룹)과 Phase(플레이어 여정)는 코드의 ForgePhase(UI 상태 머신)와 **별개**. "제작"은 강화 성공 + 조합소 제작 모두 포함. "파괴"는 보호 미발동 시에만 발생(실패 ≠ 파괴).

## Tech Stack

React 18 + Vite + TypeScript, localStorage, GSAP, jsfxr, Howler.js, Galmuri, simplex-noise.
렌더링: React DOM + PNG(픽셀아트) + CSS 이펙트 (PixiJS 보류). 검 표시: 128px PNG → image-rendering: pixelated 확대. 파티클/셰이크는 useRef + rAF (React state 금지).

## Commands

- `npm run dev` / `npm run build` / `npm test` (Vitest 173+) / `npm run lint`

## Architecture

```
src/game/       순수 함수 (React 무의존): engine, economy, titles, fragments, storage, materials, skip
src/components/ screens/ (Home,Forge,Destroy,ShopCraft,Storage,Dex) + screens/swords/ (SwordDisplay,SwordEffects,swordAnimations.css) + ui/ (Button,TitleUnlockModal)
src/effects/    ForgeEffects, ScreenShake, ParticleSystem (DOM pool 200개)
src/audio/      SoundManager (Web Audio), sounds (jsfxr 7종)
src/data/       swords.json (26검), config.json (확률,드랍,칭호,조합소), swordOrientations.json (검별 CSS 회전값)
src/utils/      swordImage.ts (getSwordImagePath, getSwordGlowColor)
src/types/      Sword, Title, Fragment, GameState, ForgeOutcome
src/hooks/      useGameState
```

## Code Rules (절대 준수)

1. 모든 확률/비용은 `data/config.json`에서 읽기 (하드코딩 금지)
2. `save/load`는 `storage.ts`를 통해서만 (직접 localStorage 접근 금지)
3. `game/` 폴더는 React에 의존하지 않는 순수 함수
4. 파티클/셰이크를 React state로 관리 금지 — useRef + rAF
5. 삼항식: 좁은 조건부터 체크 (넓은 조건이 먼저 오면 데드코드)
6. GSAP 즉시 세팅: `gsap.set()` 사용 (`gsap.to(duration:0)`과 다르게 동기 적용)
7. 스크린 셰이크 오프셋: `Math.round()`로 정수 처리
8. `prefers-reduced-motion` 시 연출 완전 스킵 금지 — 대체 피드백 제공
9. 건너뛰기: `skip.ts`의 `canSkip()` + `executeSkip()` 사용 — 직접 state 조작 금지
10. 재료 차감 시점: 강화 시도 즉시 소모. 재료 보존 조건: (a) 재련의 정점 장착 + 실패 + level≥17, (b) 검성의 대장장이 보호 발동 시

## Design Rules (절대 변경 금지)

1. 25강 체계, 등급 없음. 실패 시 기본 파괴(+0). 피티/천장 없음
2. +25 여명 판매 불가. 스토리는 검 설명문으로만 간접 전달
3. 서버 연동 전제 설계 금지 (localStorage 우선)

## ForgeOutcome

```typescript
interface ForgeOutcome {
  result: 'success' | 'fail'; isNearMiss: boolean;
  destroyed: boolean; protectionTriggered: boolean;
  protectionSource: TitleId | null; newLevel: number;
}
// 조각 드랍은 ForgeOutcome 미포함. DestroyScreen "줍기" 시 별도 호출.
```

## Screen Navigation

```
Home ←→ Forge / ShopCraft / Storage
Forge → Destroy (엔진 자동) → Home (줍기) or Forge (복원권)
```

## 게임 데이터 참조

- 전체 설계: @docs/knowledge_base.md
- 용어: @docs/glossary.md
- 밸런싱 현황: @docs/balancing_status.md
- 시뮬 히스토리: @docs/simulation_history.md
- 경제 모델: @docs/economy_model.md
