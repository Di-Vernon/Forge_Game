# 검 만들기 게임 — 플레이테스트 이슈 목록

> 플레이테스트 중 발견된 UI/UX 이슈를 기록한다.
> 일정 수량 모인 후 일괄 수정한다.
>
> 날짜: 2026-04-08 (업데이트)

---

## 이슈 목록

| # | 화면 | 심각도 | 이슈 | 상태 |
|---|------|--------|------|------|
| 1 | ForgeScreen | Minor | SwordDisplay 포멜(pommel)이 검 본체와 분리되어 별도 사각형으로 보임. | 미수정 (로컬 미반영) |
| 2 | ForgeScreen | Minor | 하단 footer(+레벨, 검 이름)의 텍스트가 보이지 않음. | 미수정 (로컬 미반영) |
| 3 | ForgeScreen | Major | 검 디자인 전면 개편. → **하이브리드 D방식으로 변경 확정**: PNG 이미지(PixelLab) + CSS/SVG 이펙트 오버레이. 26개 grid 이미지 생성 완료. | 이미지 완료, 코드 미구현 |
| 4 | 전체 | Major | 화면 여백 과다. max-width/max-height 컨테이너 + 반응형. | 미수정 (로컬 미반영) |
| 5 | 밸런싱 | Info | 복원 스크롤 Block별 소모량: 1/2/3/5/8/0. config.json#scrollCostByBlock. | 미수정 (로컬 미반영) |
| 6 | HomeScreen | Info | 도감 스크린 + 버튼 추가. discoveredLevels 추적. | 미수정 (로컬 미반영) |
| 7 | ForgeScreen | Major | SELL 버튼 클릭 시 판매 대신 검 도안 모달이 열리는 버그. onClick 이벤트 전파 문제. | 미수정 |
| 8 | StorageScreen | Info | 보관함 검 클릭 시 판매/강화 선택 기능 추가. sellFromStorage + continueFromStorage 액션 필요. | 미수정 |
| 9 | 전체 | Minor | sword-float idle 애니메이션 삭제. 검은 정지 상태가 기본. 검별 고유 이펙트만 유지. | 미수정 |

---

## 참고: 이슈 #1~#6은 이전 Claude Code remote 세션에서 수정되었으나 로컬에 반영되지 않음.
## 다음 Claude Code 실행 시 (teleport to terminal) 모든 이슈를 일괄 처리할 것.

---

## 분류 기준

| 심각도 | 정의 |
|--------|------|
| Critical | 게임 진행 불가 (클릭 불가, 화면 갇힘 등) |
| Major | 기능은 작동하지만 혼란 유발 (잘못된 수치 표시, 의도와 다른 동작) |
| Minor | 시각적 문제, 폴리싱 필요 (정렬, 색상, 간격 등) |
| Info | 개선 권장 (UX 향상, 편의 기능 등) |
