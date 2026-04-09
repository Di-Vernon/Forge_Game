# 검 만들기 게임 — UI/UX 디자인 대격변 종합 문서

작성일: 2026-04-09 / 버전: 1.0

> 이 문서는 게임의 전체 비주얼/UX를 "앱"에서 "게임"으로 전환하는 대격변 설계서이다.
> 3건의 Deep Research 결과 + Jeffrey의 직접 구상을 통합하여 작성.
> Claude Code 프롬프트 제작의 기반 문서로 사용한다.

---

## 1. 디자인 철학

### 핵심 원칙 (5대 원칙)

1. **2~3초 예감 구간이 게임 필의 핵심** — 강화를 즉시 해결하지 않는다
2. **12색 제한 팔레트** (따뜻한 30~40도 hue) — 이것이 "게임" 정체성을 만든다
3. **모든 상호작용에 시각+청각+운동 3중 피드백** — 하나라도 빠지면 "앱"이 된다
4. **성공/실패 에너지 차이 극대화** — 색온도, 음량(10~15dB), 애니메이션 길이 모두 달라야
5. **불완전함이 비밀 재료** — 파티클 ±30px 지터, 타이밍 ±100ms, opacity 100% 금지

### "앱"과 "게임"의 결정적 차이

| 요소 | 앱 UI | 게임 UI |
|------|-------|---------|
| 반응 속도 | 즉시 | 예감→플래시→결과→여운 (4단계) |
| 버튼 | 플랫, 클릭 즉시 반응 | 눌림감(translateY), 그림자 압축, 스프링 복귀 |
| 배경 | 단색 또는 그라디언트 | "장소"로서의 배경 (대장간 내부, 화로, 도구) |
| 텍스트 | 즉시 변경 | 롤링, 페이드, 스케일 바운스 |
| 피드백 | 색상 변경 정도 | 셰이크 + 파티클 + 플래시 + 사운드 동시 |

---

## 2. 색상 팔레트 (12색 확정)

기존 `#0c0906` + `#c89028` 유지하면서 확장. 다크소울 대장장이 화면과 동일 계열.

| Hex | 역할 | 용도 |
|-----|------|------|
| `#0c0906` | 최심 배경 | 페이지 배경, 가장 어두운 영역 |
| `#1a1410` | 패널 배경 | 카드/모달 배경 |
| `#2a2420` | 상승 표면 | 사이드 패널, 버튼 배경 |
| `#3a332c` | 테두리/구분선 | 패널 경계, 격자 |
| `#8b2500` | 깊은 불씨 | 실패 상태, 위험 표시, 배경 glow |
| `#c89028` | 주 금색 (기존) | 메인 악센트, 버튼, 활성 요소 |
| `#e89030` | 용해 악센트 | 호버 상태, 진행 바, 확인 |
| `#f0b848` | 뜨거운 하이라이트 | 성공 플래시, 최대 레벨 표시 |
| `#fff0c8` | 불꽃 백색 | 파티클 중심, glow 코어만 — 대면적 사용 금지 |
| `#e8d8b4` | 주 텍스트 | 모든 제목, 검 이름 (대비 ~14:1) |
| `#c0a878` | 본문 텍스트 | 설명, 스탯, 보조 정보 (대비 ~8.5:1) |
| `#5a4a3a` | 비활성/뮤트 | 잠긴 항목, 자원 부족 |

### 5단계 불씨 온도 램프

```
#8b2500 → #c89028 → #e89030 → #f0b848 → #fff0c8
차가운(실패)                              백열(최대 강화)
```

차가운(실패)에서 백열(최대 강화)로 자연스러운 온도 스케일.

---

## 3. 화면 구조 대격변

### 3-1. 기존 구조 (폐기)

- Home과 Forge가 완전히 다른 화면으로 전환
- 사이드 패널이 항상 고정
- 화면 전환에 연속성 없음

### 3-2. 신규 구조 (Jeffrey 구상)

**핵심 개념**: 중앙 영역은 항상 유지. 좌우 패널만 슬라이드로 교체.

**메인 화면 (Home) 레이아웃**:

```
+----------+----------------------+----------+
|          |                      |          |
|  보관함   |                      |  칭호    |
|  조합소   |    게임 이름          |  설정    |
|  상점     |    [FORGE 버튼]      |  도감    |
|  도감     |    검 표시            |          |
|          |                      |          |
+----------+----------------------+----------+
```

**Forge 진입 트랜지션 (스타크래프트식)**:

1. FORGE 버튼 클릭
2. 좌측 메뉴 패널 → 왼쪽 화면 밖으로 슬라이드 아웃 (300ms, power2.inOut)
3. 우측 메뉴 패널 → 오른쪽 화면 밖으로 슬라이드 아웃 (300ms, power2.inOut)
4. 동시에 Forge 전용 패널이 양 옆에서 슬라이드 인 (좌측: 판매 패널, 우측: 강화 패널)
5. 중앙의 검은 제자리에서 자연스럽게 유지

**구현 힌트**:

```tsx
<div className="game-container">
  <aside style={{
    transform: `translateX(${isForge ? '-100%' : '0'})`,
    transition: 'transform 300ms cubic-bezier(0.45,0,0.55,1)'
  }}>
    {isForge ? <ForgeLeftPanel /> : <HomeLeftPanel />}
  </aside>
  <main><ForgeCenter /></main>
  <aside style={{
    transform: `translateX(${isForge ? '0' : '100%'})`,
    transition: 'transform 300ms cubic-bezier(0.45,0,0.55,1)'
  }}>
    {isForge ? <ForgeRightPanel /> : <HomeRightPanel />}
  </aside>
</div>
```

### 3-3. 상점 화면

컨셉: 실제 중세 상점 공간. 상품이 벽에 걸려있고 아래에 카운터 책상.

### 3-4. 조합소 화면

벽에 레시피 재료 진열, 카운터 위에 조합 도구.

### 3-5. 보관함 화면

벽면 무기 랙, 검들이 세로로 걸려있음.

### 3-6. 파괴 화면

검은 화면 + "파 괴" 텍스트 (다크소울 YOU DIED 스타일), `#8b2500`, 75% opacity, 2초 fade-in.

---

## 4. 중앙 영역: 대장간 배경 (5-레이어 아키텍처)

```
Layer 5 (최상): React DOM — UI 텍스트, 검 이름, 레벨
Layer 4:        CSS 파티클 — 떠다니는 불씨 (CSS animation, 10~20개)
Layer 3:        Canvas — 화로 불꽃 파티클 시스템 (rAF, 60~150개)
Layer 2:        픽셀아트 PNG — 대장간 내부 배경 이미지
Layer 1 (최하): CSS 그라디언트 — 비네트 + 화로 warmglow
```

### Layer 1: CSS 그라디언트

```css
.game-bg {
  background:
    radial-gradient(ellipse 60% 40% at 50% 75%, #c8902840 0%, transparent 70%), /* 화로 warmglow */
    radial-gradient(ellipse 100% 100% at 50% 50%, #1a1410 30%, #0c0906 100%);    /* 비네트 */
}
```

### Layer 2: 픽셀아트 배경 PNG

- 파일: `public/backgrounds/forge_interior.png`
- 사이즈: 1280×720px 픽셀아트 (블러 없이 image-rendering: pixelated)
- 컨셉: 대장간 내부. 왼쪽 벽에 도구들(망치, 집게), 오른쪽 아래에 화로가 보임. 중앙은 검 표시 공간으로 비워둠. 천장에 매달린 사슬, 어두운 돌벽.

### Layer 3: Canvas 화로 파티클

```ts
interface Ember {
  x: number; y: number;
  vx: number; vy: number; // vy는 항상 음수 (위로)
  size: number;           // 1~3px
  life: number;           // 0~1
  color: string;          // 5단계 온도 팔레트에서 랜덤
}

// 화로 위치: canvas 하단 중앙 (x: 50%, y: 85%)
// 파티클 생성: 매 프레임 2~3개, 총 60~150개 유지
// 수명: 1.5~3초. life가 0.3 이하면 opacity 급감
// 바람 효과: vx에 simplex-noise 기반 미세 흔들림 ±0.5
```

### Layer 4: CSS 불씨 파티클

```css
@keyframes ember-float {
  0%   { transform: translate(0, 0) scale(1);     opacity: 0.8; }
  50%  { transform: translate(var(--dx), -40px) scale(0.7); opacity: 0.5; }
  100% { transform: translate(var(--dx2), -80px) scale(0.3); opacity: 0; }
}
.ember {
  position: absolute;
  width: 2px; height: 2px;
  border-radius: 50%;
  background: #f0b848;
  animation: ember-float 2s ease-out forwards;
  /* --dx, --dx2: JS로 랜덤 주입 (-20~+20px) */
}
```

---

## 5. 검 표시

- **크기**: 450~520px 균일 (기존 블록별 310~620px 범위에서 변경)
- **방향**: `swordOrientations.json`의 `rotate(-45deg)` 제거. 이미지 원본 방향 그대로 표시.
- **강화 레벨 텍스트 색상** (검 위 중앙 표시):

| 레벨 | 색상 |
|------|------|
| +0 ~ +3 | 회색 (`#5a4a3a`) |
| +4 ~ +6 | 흰색 (`#e8d8b4`) |
| +7 ~ +9 | 하늘 (`#88ccff`) |
| +10 ~ +12 | 초록 (`#88dd88`) |
| +13 ~ +15 | 보라 (`#cc88ff`) |
| +16 ~ +19 | 주황 (`#e89030`) |
| +20 ~ +24 | 금 (`#f0b848`) |
| +25 | 적금 (`#ff8844`) |

- **검 이름 위치**: 검 위 중앙 (기존 좌하단 푸터에서 이동)

---

## 6. 피드백 애니메이션 시스템

### 4단계 범용 구조

```
예감 (400~600ms) → 플래시 (100ms) → 결과 공개 (300ms) → 여운 (500~800ms)
```

### 케이스별 상세 타이밍

| 케이스 | 예감 | 플래시 | 결과 | 여운 | 총 |
|--------|------|--------|------|------|----|
| 성공 (일반) | 500ms 망치 소리 | 80ms 백색 | 검 레벨 업 | 600ms 파티클 | 1,780ms |
| 실패 (보호 발동) | 400ms | 100ms 붉은 | 레벨 유지 텍스트 | 400ms 진동 | 1,300ms |
| 파괴 | 600ms 긴장 | 200ms 붉은 점멸 | 검은화면+"파 괴" 2초 | — | ~3,000ms |
| Near-miss | 700ms 성공 SFX | 하드컷 | 파괴로 전환 | 상동 | ~3,400ms |
| 칭호 해금 | — | — | 모달 등장 | 별 파티클 2초 | ~2,000ms |
| 마일스톤 (+12/+17/+22/+25) | — | 황금 플래시 | 검 스케일 바운스 | 파티클 1.5초 | ~2,000ms |

**적응형 페이싱**: 기본 400~600ms → 10회 연속 강화 후 200~350ms로 단축.

---

## 7. 버튼 디자인

### 금속 플레이트 스타일

```css
.btn-forge-primary {
  background: linear-gradient(180deg, #3a332c 0%, #2a2420 50%, #1a1410 100%);
  border: 1px solid #c89028;
  border-bottom-width: 3px; /* 두꺼운 하단 테두리 = 두께감 */
  box-shadow:
    inset 0 1px 0 #ffffff18,  /* 상단 하이라이트 */
    0 4px 8px #00000080;      /* 깊이감 그림자 */
  color: #e8d8b4;
  font-family: 'Galmuri11', monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: transform 80ms, box-shadow 80ms;
}
.btn-forge-primary:active {
  transform: translateY(2px);
  box-shadow: inset 0 1px 0 #ffffff18, 0 2px 4px #00000080;
  border-bottom-width: 1px; /* 눌림 효과 */
}
```

### UPGRADE 버튼 5단계 상태

| 상태 | 비주얼 | 설명 |
|------|--------|------|
| 기본 | 금 테두리, 정상 밝기 | 강화 가능 |
| 호버 | `#e89030` 테두리, glow 약하게 | 마우스 오버 |
| 클릭 | translateY(2px), 테두리 두께 감소 | 눌림 |
| 강화 중 | 비활성, 스핀 인디케이터 | forging 상태 |
| 재료/골드 부족 | `#5a4a3a` 테두리, opacity 0.6 | 비활성 |

---

## 8. 타이포그래피

Galmuri 픽셀 퍼펙트 규칙: **정수 배수 사이즈만 사용.**

| 용도 | 폰트 | 사이즈 | 색상 |
|------|------|--------|------|
| 검 이름 (대형) | Galmuri11-Bold | 16px | `#e8d8b4` |
| 강화 레벨 (+N) | Galmuri11-Bold | 24px | 레벨별 색상 (섹션 5 참조) |
| 패널 제목 | Galmuri11 | 14px | `#c0a878` |
| 본문/설명 | Galmuri11 | 11px | `#c0a878` |
| 골드/수량 숫자 | GalmuriMono11 | 14px | `#c89028` |
| 버튼 텍스트 | Galmuri11-Bold | 12px | `#e8d8b4` |
| 비활성/잠금 | Galmuri9 | 11px | `#5a4a3a` |

---

## 9. 사운드 설계

### 앰비언스 3-레이어

| 레이어 | 사운드 | 볼륨 | 메모 |
|--------|--------|------|------|
| L1 | 대장간 배경음 (화로 타는 소리, 쇠 두드리는 소리 원거리) | 20% | 루프, 항상 재생 |
| L2 | 풀무 소리 (강화 시작 시 fade-in) | 30% | forging 상태에서만 |
| L3 | 쇳물 소리 (성공 직후 짧게) | 40% | 성공 결과 공개 시 |

### 강화 타이밍 동기화

```
버튼 클릭 →  즉시: "딸깍" 효과음 (버튼 물리감)
예감 구간 →  200ms: 풀무 소리 fade-in
플래시 →     0ms:   성공이면 "쨍" / 실패면 "쿵"
결과 공개 → +100ms: 레벨업이면 "반짝이" / 파괴면 무음 → 2초 후 낮은 "웅웅"
```

**피로 방지**: 동일 SFX 연속 재생 시 pitch ±3% 랜덤 변조. 10회 연속 실패 시 앰비언스 볼륨 자동 -5%.

---

## 10. 숫자 애니메이션

### 골드 롤링 (GSAP)

```ts
// 골드 변화 시 롤링 카운터 (GSAP)
gsap.to(goldDisplay, {
  innerText: newGold,
  duration: 0.4,
  snap: { innerText: 1 },
  ease: 'power2.out',
});
// 골드 감소 시: 빨간색으로 잠깐 변경 후 복귀
// 골드 증가 시: 노란색으로 잠깐 변경 후 복귀
```

### 진행 바

```css
.resource-bar {
  background: #1a1410;
  border: 1px solid #3a332c;
  height: 6px;
  border-radius: 1px;
}
.resource-bar-fill {
  background: linear-gradient(90deg, #c89028, #f0b848);
  box-shadow: 0 0 6px #c8902880;
  transition: width 300ms ease-out;
}
```

---

## 11. 삭제/변경 확정 목록

| 항목 | 기존 | 변경 |
|------|------|------|
| 모루 에셋 | ForgeScreen 하단 | 삭제 |
| 격자 배경 | 32px 패턴 | 5레이어 배경 교체 |
| 검 이름 위치 | 좌하단 푸터 | 검 위 중앙 |
| 검 회전 | rotate(-45deg) 등 swordOrientations.json 값 적용 | 제거 (원본 방향) |
| 파괴 화면 | PNG+grayscale+crack 이펙트 | 검은 화면 + "파 괴" 텍스트 |
| 화면 전환 | 완전한 화면 교체 | 중앙 유지, 패널 슬라이드 |
| 검 크기 | Block별 310~620px | 450~520px 균일 |
| Home/Forge | 별도 Screen 컴포넌트 | 단일 화면 + 패널 교체 |
| 상점/조합소 | 플랫 리스트 UI | 공간 기반 UI (중세 상점 컨셉) |
| 강화 결과 | 즉시 반영 | 4단계 (예감→플래시→공개→여운) |

---

## 12. 변경하지 않는 것

- 검 PNG 이미지 (`public/sprites/swords/`)
- SwordEffects CSS (glow, 핏물, 번개 등 고유 idle 이펙트)
- 게임 로직 전체 (`src/game/`)
- ForgeOutcome 인터페이스
- Galmuri 폰트
- `swords.json`, `config.json`
- 기존 테스트 182개

---

## 13. 구현 순서 (Phase별)

| Phase | 내용 | 우선순위 | 상태 |
|-------|------|---------|------|
| Phase 1 | 색상 팔레트 CSS 변수화 + 레이아웃 구조 (슬라이드 패널) | 기반 | ✅ 완료 |
| Phase 2 | 5레이어 대장간 배경 + Canvas 파티클 (EmberCanvas) | 분위기 | ✅ 완료 |
| Phase 3 | 4단계 피드백 애니메이션 + 버튼 물리감 + 사운드 동기화 | 피드백 | ✅ 완료 |
| Phase 4 | 상점/조합소/보관함 공간 기반 UI (중세 상점·병기고 컨셉) | 공간 UI | ✅ 완료 |
| Phase 5 | 앰비언스 사운드 + 화면 전환 효과 + 마일스톤 시네마틱 | 폴리싱 | ✅ 완료 |

### Phase 5 구현 상세 (2026-04-09)

- **AmbientManager** (`src/audio/AmbientManager.ts`): 순수 Web Audio API 절차적 앰비언스. 용광로 저역 럼블(저역 필터 노이즈 75Hz) + 불꽃 크래클(대역통과 노이즈 380Hz + 2.1Hz LFO 명멸) + 42Hz 사인 기저 진동. bgmOn 토글 연동, 2초 페이드인 / 0.8초 페이드아웃.
- **화면 전환** (`src/index.css`): `@keyframes screen-enter` (opacity 0→1, 0.18s). 비-게임 화면(Destroy/ShopCraft/Storage/Dex) React key 기반 마운트 애니메이션.
- **마일스톤 시네마틱** (`src/App.tsx`, `MilestoneOverlay`): discoveredLevels 변화 감지. +12/+17/+22/+25 최초 달성 시 3.5초 인라인 오버레이. Block별 색상(파랑/보라/금/백금), `milestone-in/level/name/line` 키프레임 시퀀스. `prefers-reduced-motion` 시 표시 생략.
