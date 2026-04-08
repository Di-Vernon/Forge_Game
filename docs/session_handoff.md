# 검 만들기 게임 — 세션 핸드오프
# 작성일: 2026-04-09

## 현재 상태: UI 디자인 대격변 준비 중

---

## 완료된 작업

### Task 1~7 (2026-04-09 완료)
1. **이미지 분리**: grid_00~25.png → sword_XX.png 25개 추출 (유저 선택 기반), grid 삭제. sword_03 없음 (fallback → sword_02)
2. **SwordDisplay 하이브리드 재작성**: SVG 코드 → PNG + CSS 이펙트. `src/components/screens/swords/` 폴더 구조
3. **CSS 이펙트 13개 검**: SwordEffects.tsx + swordAnimations.css (12 keyframes)
4. **SELL 버그 수정**: e.stopPropagation() + z-index 조정
5. **보관함 액션**: sellFromStorage, continueFromStorage 구현. +25 판매 불가, 라운드 중 강화 계속 비활성화
6. **sword-float 완전 삭제**: grep 0건 확인
7. **DestroyScreen/StorageScreen PNG 전환**: grayscale 필터 + crack 오버레이, 48px 썸네일

### 코드 품질
- tsc --noEmit 클린, 182/182 테스트 통과, eslint 클린
- 공유 유틸: `src/utils/swordImage.ts` (getSwordImagePath, getSwordGlowColor)

---

## 진행 중인 작업

### P0: 디자인 대격변 — 중세 대장간 테마로 전면 개편

**현재 문제점:**
- 격자 배경 + 황금빛 UI가 너무 기계적이고 차가움
- 모루 에셋이 조잡함 → **삭제 확정**
- 검 이름이 좌하단 푸터에 너무 작게 표시 → **검 영역 바로 위 중앙으로 이동**
- 파괴 화면에 불필요한 검 이미지/에셋 → **검은 화면만 표시로 간소화**

**목표 디자인:**
- 중세 대장간 분위기 (돌벽, 불빛, 나무 질감)
- 격자 배경 제거
- 모루 에셋 제거
- 전체 색감/분위기 대격변

### P0-1: 검 이미지 방향 통일
- 방향 자동감지 방식 취소
- PixelLab에서 세로 방향으로 이미지 재생성 예정
- 재생성 후 기존 sword_XX.png 교체

### P0-2: 검 크기 대폭 상향
- 현재 80~260px → 310~620px으로 상향 필요
- 이미지 재생성 후 적용

---

## 미완료 작업 (우선순위 순)

### P1: 총 플레이타임 조정
- p50=9.54h → 목표 7h (베타 실측 후)

### P2: 하드모드 설계

---

## UI 변경 사항 (확정)

| 항목 | 기존 | 변경 |
|------|------|------|
| 모루 에셋 | ForgeScreen 하단에 표시 | **삭제** |
| 검 이름 위치 | 좌하단 푸터 (작은 텍스트) | **검 영역 바로 위 중앙** |
| 파괴 화면 | PNG + grayscale 필터 + crack 오버레이 | **검은 화면만 (이미지/에셋 없음)** |
| 전체 테마 | 격자 배경 + 황금빛 | **중세 대장간 (돌벽, 불빛, 나무 질감)** |
| 검 방향 | CSS 회전 (자동감지) | **이미지 자체를 세로로 재생성** |

---

## 핵심 수치 (확정)

- 확률: V11_C (95%→65%, +13→+14 반전 68%)
- 보호: 불굴 35%, 검성 60% + materialPreserveOnProtect
- 초기 골드: 2,000G
- 스크롤 가격: ×1=150G, ×5=637G, ×10=1,125G
- 스크롤 소모: Block 1=1, 2=2, 3=3, 4=5, 5=8, 6=0
- 테스트: 182개 통과

---

## 참조 문서

- `CLAUDE.md` — 개발 규칙
- `docs/knowledge_base.md` — 게임 설계 전체
- `docs/sword_design_spec.md` — 26개 검 비주얼 디자인 스펙
- `docs/economy_model.md` — 경제 모델
- `docs/balancing_status.md` — 확정/미확정 수치
- `docs/playtest_issues.md` — 플레이테스트 이슈 목록
