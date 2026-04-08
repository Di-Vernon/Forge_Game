# 검 만들기 게임 — 세션 핸드오프
# 작성일: 2026-04-08

## 현재 상태: 검 이미지 에셋 완성 → Claude Code 구현 대기

---

## 이전 세션 요약

1. 게임 엔진 v4.0, v11 밸런싱, 경제 모델, UI 스크린 5개 완성
2. 플레이테스트 이슈 수집 (#1~#6) + 스크롤 Block별 소모량 확정
3. Claude Code로 1차 수정 (컨테이너 반응형, 스크롤 소모량, 도감 등)
4. **검 디자인 전면 재설계** — SVG 코드 방식 포기 → **하이브리드 D방식** 확정
5. PixelLab AI로 26개 검 픽셀아트 이미지 생성 완료 (grid_00~grid_25.png)

---

## 완료된 작업 (이번 세션)

### 검 디자인 관련
- 26개 검 전체 디자인 스펙 확정 (`docs/sword_design_spec.md`)
- Block별 viewBox 스케일링 + 뽕맛 가이드 확정
- PixelLab 프롬프트 26개 작성 + 생성 (`docs/pixellab_prompts.md`)
- **26개 grid 이미지 생성 완료** (`public/sprites/swords/grid_00~25.png`)
  - 각 grid는 4분할 이미지 (128×128 × 4 = 256×256)
  - 아직 개별 분리 안 됨 → Claude Code에서 Python 스크립트로 일괄 분리 필요

### 밸런싱 관련
- 복원 스크롤 Block별 소모량 확정: 1/2/3/5/8/0
- config.json에 `scrollCostByBlock` 추가됨
- `docs/balancing_status.md`, `docs/knowledge_base.md` 업데이트됨

### 이전 Claude Code 작업 (remote에서 실행 — 로컬 미반영)
- 이슈 #1~#4 + #6 수정, 도감 스크린 추가
- **로컬에 반영되지 않음** — teleport to terminal로 재실행 필요

---

## 미완료 작업 (우선순위 순)

### P0: Claude Code 프롬프트 실행 (가장 긴급)

**아래 작업을 하나의 Claude Code 프롬프트로 실행:**

#### Task 1: 이미지 분리 + 선택
- `public/sprites/swords/grid_XX.png` (4분할) → 개별 `sword_XX.png` 분리
- Python PIL/Pillow 스크립트로 일괄 처리
- 4개 중 선택: 유저가 선호 번호를 지정하지 않았으므로 **좌상(1번)**을 기본 선택
- 분리 후 grid 파일 보존 (백업)

#### Task 2: SwordDisplay 하이브리드 재작성
- 기존 SVG 코드 렌더링 → **PNG 이미지 + CSS/SVG 이펙트 오버레이**
- 구조:
  ```
  src/components/screens/swords/
    ├── SwordDisplay.tsx        // PNG 이미지 + 이펙트 레이어
    ├── SwordEffects.tsx        // 검별 고유 이펙트 컴포넌트들
    └── swordAnimations.css     // CSS keyframes (rune-flow, mist-drift 등)
  ```
- 검 본체: `<img src="/sprites/swords/sword_XX.png" />`
- 이펙트 오버레이: absolute positioned div with CSS animations
- Block별 스케일링: CSS transform scale로 처리

#### Task 3: 검별 CSS 이펙트 (13개 검)
- +8: 룬 푸른 glow 일렁임 (rune-flow, 3s)
- +11: 흰색 아지랑이 (mist-drift, 3~4s)
- +13: 검은 안개 (dark-mist, 4s)
- +15: 달빛 glow 호흡 (moonlight-pulse, 5s)
- +16: 핏물 흐름 (blood-drip, 2~4s)
- +17: 백색 glow 맥동 (white-pulse, 3s)
- +18: 번개 깜빡임 (lightning-flicker, 불규칙)
- +19: 마력 맥 drift (3s)
- +22: LED 깜빡임 (led-blink, 2s)
- +24: 초록 안개 일렁임 (eerie-glow, 4s)
- +25: 실린더 회전 + glow + 안개 (2~3s)
- Block별 glow 강도: Block 1~2: 10~12px, Block 3: 16~20px, Block 4: 20~32px, Block 5~6: 28~40px

#### Task 4: 버그 수정 — Sell 버튼
- ForgeScreen에서 SELL 클릭 시 검 도안 모달이 열리는 버그
- onClick 이벤트 전파 문제 확인 + e.stopPropagation() 추가

#### Task 5: 보관함 판매/강화 기능
- StorageScreen 검 클릭 → 액션 모달 (판매 + 강화 계속)
- useGameState에 `sellFromStorage`, `continueFromStorage` 액션 추가
- 라운드 진행 중이면 강화 계속 비활성화

#### Task 6: sword-float 애니메이션 삭제
- index.css, SwordDisplay, HomeScreen에서 완전 제거

#### Task 7: DestroyScreen, StorageScreen의 검 표현도 PNG로
- BrokenSwordDisplay → 파괴 시 PNG에 CSS grayscale/crack 효과
- MiniSword → PNG 축소판

### P1: 유저 검 선택 (Task 1 이후)
- grid에서 4개 중 어떤 것을 쓸지 유저에게 확인
- 확인 후 선택된 이미지로 교체

### P2: 총 플레이타임 조정
- p50=9.54h → 목표 7h (베타 실측 후)

### P3: 비주얼 폴리싱
- 모루 디테일, 버튼 gradient 등

### P4: 하드모드 설계

---

## 핵심 수치 (확정)

- 확률: V11_C (95%→65%, +13→+14 반전 68%)
- 보호: 불굴 35%, 검성 60% + materialPreserveOnProtect
- 초기 골드: 2,000G
- 스크롤 가격: ×1=150G, ×5=637G, ×10=1,125G
- **스크롤 소모: Block 1=1, 2=2, 3=3, 4=5, 5=8, 6=0**
- 테스트: 182개 통과

---

## 참조 문서

- `CLAUDE.md` — 개발 규칙
- `docs/knowledge_base.md` — 게임 설계 전체
- `docs/sword_design_spec.md` — **26개 검 비주얼 디자인 스펙 (필독)**
- `docs/pixellab_prompts.md` — PixelLab 프롬프트 기록
- `docs/economy_model.md` — 경제 모델
- `docs/balancing_status.md` — 확정/미확정 수치
- `docs/playtest_issues.md` — 플레이테스트 이슈 목록

---

## 이 세션에서 할 일

1. Claude Code에 종합 프롬프트 입력 (**teleport to terminal** 모드!)
2. Task 1~7 실행
3. npm run dev로 시각적 확인
4. grid에서 검 선택 확인
