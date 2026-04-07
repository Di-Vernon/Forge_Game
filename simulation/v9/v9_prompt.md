# 검 만들기 게임 — v9 밸런싱 시뮬레이션 프롬프트

## 사전 작업

```bash
cd C:/Users/PC/project/Forge_Game/simulation
rm -rf v5 v6 v7 v8
cd v9
```

---

## 용어 (혼동 금지)

| 용어 | 정의 |
|------|------|
| **Block** | 레벨 그룹. Block 1(+0~+7) ~ Block 6(+25). 코드 블록/UI 블록과 무관 |
| **Phase** | 플레이어 여정. Phase A(+12 도달) ~ Phase D(+25 달성). 코드의 ForgePhase와 무관 |
| **강화** | +n → +n+1 시도 |
| **제작** | 검을 만드는 행위. 강화 성공 + 조합소 제작 **모두 포함** |
| **파괴** | 강화 실패 후 +0 리셋. 보호 발동 시 파괴 아님 (레벨 유지) |
| **보호** | 칭호 효과로 파괴 대신 현재 레벨 유지. 재료 보존과 별개 |
| **건너뛰기** | 칭호 부가효과. 골드+조각 지불 → 즉시 검 획득. 라운드당 1회 |
| **재료 검** | +17 이상 강화에 필요한 하위 검 (≤+16). 비재귀적 |
| **조각** | 파괴 시 드랍되는 8종 소재 |

---

## 게임 개요

+0(목검) → +25(여명) 강화 게임. 실패 시 기본 +0 리셋(전 구간 파괴). 칭호 보호로 완화 가능.
**목표 플레이타임: 최대 7시간.**

게임 모토: **"초반 운게임 → 중반 전략게임 → 후반 스토리게임"**

---

## 게임 데이터 (전체)

### 확률 곡선 — 테스트 케이스 6종

+1~+7은 전 케이스 고정. +8~+25만 다름.

```python
# 전 케이스 공통 (+1~+7)
PROB_COMMON = {1:0.95, 2:0.93, 3:0.90, 4:0.87, 5:0.83, 6:0.78, 7:0.73}

CURVES = {
    "C1": {
        "name": "깊은골짜기",
        "desc": "+13에서 40%까지 급락, +20~21에서 35% 바닥, +25에서 63% 회복",
        "probs": {
            8:0.73, 9:0.67, 10:0.60, 11:0.53, 12:0.46, 13:0.40,
            14:0.65, 15:0.58, 16:0.52,
            17:0.42, 18:0.38, 19:0.35, 20:0.35, 21:0.35,
            22:0.42, 23:0.50, 24:0.57, 25:0.63
        }
    },
    "C2": {
        "name": "완만학습",
        "desc": "+8~+13 상향(복귀 비용 감소). +20~21에서 38% 바닥",
        "probs": {
            8:0.75, 9:0.70, 10:0.65, 11:0.60, 12:0.55, 13:0.48,
            14:0.65, 15:0.60, 16:0.55,
            17:0.45, 18:0.42, 19:0.40, 20:0.38, 21:0.38,
            22:0.45, 23:0.52, 24:0.58, 25:0.63
        }
    },
    "C3": {
        "name": "극적반전",
        "desc": "+13에서 38%까지 깊게, +14에서 70%로 극적 반등",
        "probs": {
            8:0.73, 9:0.67, 10:0.60, 11:0.53, 12:0.45, 13:0.38,
            14:0.70, 15:0.65, 16:0.58,
            17:0.48, 18:0.43, 19:0.40, 20:0.38, 21:0.38,
            22:0.45, 23:0.52, 24:0.60, 25:0.65
        }
    },
    "C4": {
        "name": "높은바닥",
        "desc": "전 구간 바닥 45%. 안정적이지만 긴장감 낮을 수 있음",
        "probs": {
            8:0.75, 9:0.70, 10:0.65, 11:0.60, 12:0.55, 13:0.50,
            14:0.68, 15:0.63, 16:0.58,
            17:0.52, 18:0.48, 19:0.46, 20:0.45, 21:0.45,
            22:0.50, 23:0.55, 24:0.60, 25:0.65
        }
    },
    "C5": {
        "name": "이중골짜기",
        "desc": "+13과 +20에서 두 번의 바닥. +16에서 잠깐 숨통",
        "probs": {
            8:0.73, 9:0.67, 10:0.60, 11:0.53, 12:0.46, 13:0.40,
            14:0.65, 15:0.60, 16:0.58,
            17:0.50, 18:0.45, 19:0.40, 20:0.35, 21:0.35,
            22:0.42, 23:0.50, 24:0.58, 25:0.65
        }
    },
    "C6": {
        "name": "후반관대",
        "desc": "+17~21 바닥은 깊지만(35%), +22~25가 72%까지 빠르게 회복",
        "probs": {
            8:0.75, 9:0.70, 10:0.65, 11:0.58, 12:0.50, 13:0.43,
            14:0.65, 15:0.60, 16:0.55,
            17:0.45, 18:0.40, 19:0.37, 20:0.35, 21:0.35,
            22:0.48, 23:0.58, 24:0.65, 25:0.72
        }
    },
}
```

### 강화 비용 (전 케이스 고정)

```python
COST = {
    1:5, 2:10, 3:15, 4:22, 5:32, 6:48, 7:72,
    8:108, 9:160, 10:235, 11:340, 12:480,
    13:680, 14:960, 15:1350, 16:1900, 17:2700,
    18:3800, 19:5300, 20:7400, 21:10400, 22:14500,
    23:20000, 24:28000, 25:0
}
```

### 판매가 (시뮬 확정 대상이지만, 아래를 초기값으로 사용)

```python
SELL = {
    0:2, 1:15, 2:38, 3:78, 4:155, 5:300, 6:550, 7:950,
    8:1600, 9:2700, 10:4500, 11:10000, 12:28000,
    13:75000, 14:200000, 15:550000, 16:2500000,
    17:5000000, 18:10000000, 19:20000000, 20:40000000,
    21:80000000, 22:160000000, 23:300000000, 24:600000000,
    25:0  # 판매 불가
}
```

### 재료 요구 (v7, 비재귀적 — 모든 재료 ≤+16)

```python
MATERIAL_REQ = {
    17: [(12,1)],          # 엑스칼리버 ×1
    18: [(12,1)],          # 엑스칼리버 ×1
    19: [(12,2)],          # 엑스칼리버 ×2
    20: [(16,1)],          # 블러디 쇼텔 ×1
    21: [(11,1)],          # 무형검 ×1
    22: [(16,1)],          # 블러디 쇼텔 ×1
    23: [(2,1)],           # 투박한 철검 ×1
    24: [(16,1)],          # 블러디 쇼텔 ×1
    25: [(16,2),(12,1)],   # 블러디 쇼텔 ×2 + 엑스칼리버 ×1
}
```

### 칭호 시스템 (9개, 획득 순으로 게임 내 등장)

```python
TITLES = {
    "beginner_luck": {
        "name": "초심자의 행운",
        "condition": "첫 파괴",
        "effect": "파괴 시 100% 조각 드랍 (dropBaseChance 오버라이드)",
        "skip": None,
    },
    "haggler": {
        "name": "흥정의 달인",
        "condition": "15회 판매",
        "effect": "판매가 +50%",
        "skip": None,
    },
    "scavenger": {
        "name": "잔해의 수집가",
        "condition": "조각 5종 보유 or 20개 획득",
        "effect": "파괴 시 60% 확률로 조각 2배 드랍",
        "skip": {"target": 5, "cost_type": "gold+녹슨철조각"},
    },
    "indomitable": {
        "name": "불굴의 대장장이",
        "condition": "15회 파괴",
        "effect": "파괴 시 PROTECT_INDOM% 확률로 현재 레벨 유지",
        "skip": {"target": 7, "cost_type": "gold+녹슨/정제철조각"},
    },
    "master": {
        "name": "달인 대장장이",
        "condition": "+18 이상 첫 제작",
        "effect": "성공 확률 +2%p",
        "skip": {"target": 12, "cost_type": "gold+마력/광물조각"},
    },
    "refine_peak": {
        "name": "재련의 정점",
        "condition": "조합소 검 제작 3회",
        "effect": "+17 이상 실패 시 재료 검 보존",
        "skip": {"target": 12, "cost_type": "gold+뒤틀린마력파편"},
    },
    "sword_saint": {
        "name": "검성의 대장장이",
        "condition": "백야(+17) 최초 제작 or 무형검(+11) 3회 제작",
        "effect": "파괴 시 PROTECT_SAINT% 보호 + FRAG_DROP_SAINT% 검성의 파편 드랍",
        "skip": {"target": 8, "cost_type": "gold+마력부여철조각"},
    },
    "legendary": {
        "name": "전설의 대장장이",
        "condition": "+25 제작",
        "effect": "+25 무료 제작 (재료+골드 면제)",
        "skip": {"target": 25, "cost_type": "free"},
    },
    "mythic": {
        "name": "신화 속 이야기",
        "condition": "+1~+25 전부 보관",
        "effect": "없음 (이스터에그)",
        "skip": None,
    },
}
```

### 조각 드랍 테이블

```python
DROP_BASE_CHANCE = {
    # 시뮬 탐색 대상. 아래는 v8 기준 초기값 (상향 방향)
    2:0.25, 3:0.25, 4:0.25, 5:0.28,
    6:0.30, 7:0.30, 8:0.35, 9:0.35,
    10:0.38, 11:0.40, 12:0.40,
    13:0.45, 14:0.45, 15:0.50, 16:0.50,
    17:0.60, 18:0.60, 19:0.65, 20:0.65,
    21:0.65, 22:0.70, 23:0.70, 24:0.75,
}

DROP_TABLE = {
    2:{"녹슨철조각":80,"정제된철조각":5},
    3:{"녹슨철조각":80,"정제된철조각":5},
    4:{"녹슨철조각":75,"정제된철조각":8},
    5:{"녹슨철조각":70,"정제된철조각":15},
    6:{"마력부여철조각":100},
    7:{"녹슨철조각":65,"정제된철조각":20},
    8:{"마력부여철조각":100},
    9:{"사령조각":100},
    10:{"달빛조각":100},
    11:{"검성의파편":100},
    12:{"광물파편":100},
    13:{"달빛조각":50,"사령조각":50},
    14:{"광물파편":40,"마력부여철조각":40,"뒤틀린마력파편":8},
    15:{"달빛조각":100},
    16:{"사령조각":100},
    17:{"검성의파편":100},
    18:{"뒤틀린마력파편":100},
    19:{"사령조각":50,"뒤틀린마력파편":50},
    20:{"광물파편":100},
    21:{"뒤틀린마력파편":100},
    22:{"뒤틀린마력파편":100},
    23:{"녹슨철조각":50,"정제된철조각":50},
    24:{"뒤틀린마력파편":100},
}
```

### 건너뛰기 비용 (초기값, 시뮬에서 조정)

```python
SKIP_COST = {
    5:  {"gold": 200,  "녹슨철조각": 3},
    7:  {"gold": 600,  "녹슨철조각": 5, "정제된철조각": 2},
    8:  {"gold": 1000, "마력부여철조각": 2},
    12: {"gold": 5000, "마력부여철조각": 3, "광물파편": 2},
    25: "free",
}
```

### 탐색할 보호율

```python
PROTECT_INDOM_RANGE = [0.20, 0.25, 0.30, 0.35, 0.40]  # 불굴
PROTECT_SAINT_RANGE = [0.50, 0.55, 0.60]                # 검성
FRAG_DROP_SAINT = 0.50                                    # 검성 파편 드랍 (고정)
```

---

## 시뮬레이션 구조: 4개 시뮬레이션

### Sim-A: 보호 없는 시대 (+0 → 불굴 획득)

**종료 조건**: 파괴 15회 달성 → 불굴의 대장장이 획득
**보호**: 없음. 실패 = 무조건 +0 리셋.
**칭호**: 초심자의 행운(첫 파괴 후), 흥정의 달인(15회 판매 후), 잔해의 수집가(조각 조건 충족 시) 중 선택

**유저 행동 모델 (5종 페르소나)**:

```python
PERSONAS_A = {
    "cautious": {
        "desc": "조심스러운 초보. +7에서 판매, 가끔 도전",
        "sell_at": 7,
        "push_chance": 0.15,  # 판매 대신 도전할 확률
        "title_pref": "beginner_luck",
    },
    "farmer": {
        "desc": "안정형 파머. +8에서 판매, 골드 우선",
        "sell_at": 8,
        "push_chance": 0.10,
        "title_pref": "haggler",
    },
    "ambitious": {
        "desc": "야심찬 중수. +10 목표, 적극 도전",
        "sell_at": 10,
        "push_chance": 0.30,
        "title_pref": "beginner_luck",
    },
    "yolo": {
        "desc": "욜로 도박꾼. 판매 안 하고 계속 올림",
        "sell_at": 99,
        "push_chance": 1.0,
        "title_pref": "beginner_luck",
    },
    "crafter": {
        "desc": "전략적 조합러. +8 판매, 조각 수집 집중",
        "sell_at": 8,
        "push_chance": 0.20,
        "title_pref": "scavenger",
    },
}
```

**시뮬레이션 로직**:

```python
def sim_a_one_user(probs, persona, rng, max_clicks=50000):
    gold = 2000  # 초기 골드
    fragments = {}  # 조각 보유량
    level = 0
    clicks = 0
    destructions = 0
    sales = 0
    max_level = 0
    title = None  # 현재 장착 칭호
    titles_unlocked = set()
    craft_count = 0  # 제작 횟수 (강화 성공 + 조합소)

    while destructions < 15 and clicks < max_clicks:
        # 칭호 해금 체크
        if destructions >= 1 and "beginner_luck" not in titles_unlocked:
            titles_unlocked.add("beginner_luck")
            title = persona["title_pref"]  # 자동 장착
        if sales >= 15 and "haggler" not in titles_unlocked:
            titles_unlocked.add("haggler")
        # 잔해의 수집가 체크: 5종 보유 or 20개 총 획득
        # ... (구현)

        # 행동 결정: 판매 vs 계속 강화
        if level >= persona["sell_at"] and rng.random() > persona["push_chance"]:
            # 판매
            price = SELL[level]
            if "haggler" in titles_unlocked and title == "haggler":
                price = int(price * 1.5)
            gold += price
            sales += 1
            level = 0
            continue

        # 강화 시도
        if level >= 25:
            break
        target = level + 1
        cost = COST[target]
        if gold < cost:
            # 골드 부족 → 현재 검 판매 후 재시작
            gold += SELL[level]
            sales += 1
            level = 0
            continue

        gold -= cost
        clicks += 1

        if rng.random() < probs[target]:
            level = target
            max_level = max(max_level, level)
            craft_count += 1  # 강화 성공 = 제작 1회
        else:
            # 파괴 → +0
            # 조각 드랍 판정
            if level >= 2:
                drop_result = roll_fragment_drop(level, title, rng)
                if drop_result:
                    for frag, qty in drop_result.items():
                        fragments[frag] = fragments.get(frag, 0) + qty
            destructions += 1
            level = 0

    return {
        "clicks": clicks,
        "destructions": destructions,
        "sales": sales,
        "gold": gold,
        "fragments": dict(fragments),
        "max_level": max_level,
        "titles_unlocked": list(titles_unlocked),
        "craft_count": craft_count,
    }
```

**수집 메트릭 (곡선 × 페르소나별, 각 10,000명)**:
- 불굴 획득까지: clicks(mean/p50/p90), 시간 환산(÷1200)
- 기간 중 축적: 골드(mean/p50), 조각 종류별 수량, 최고 도달 레벨
- 칭호 획득 순서: 초심자→흥정→잔해 시점
- 판매 횟수, 파괴 횟수 분포

**출력**: `sim_a_results.json`, `sim_a_report.md`

---

### Sim-B: 약한 보호 시대 (불굴 → 검성 획득)

**시작 상태**: Sim-A의 중앙값 축적물 (골드, 조각, 칭호) 이어받음
**종료 조건**: 검성의 대장장이 획득 (백야 최초 제작 or 무형검 3회 제작)
**보호**: 불굴 장착 시 PROTECT_INDOM% 확률로 현재 레벨 유지

**칭호 전략**: 유저가 여러 칭호를 전환하며 사용
- 불굴: +13+ 도전 시 (보호 + +7 건너뛰기)
- 흥정: 파밍 시 (판매가 +50%)
- 잔해: 조각 수집 시 (2배 드랍)
- 달인: +18 첫 제작 후 (확률 +2%p + +12 건너뛰기)
- 재련의 정점: 조합소 검 3회 제작 후 (+17+ 재료 보존 + +12 건너뛰기)

**시뮬레이션 로직 핵심**:

```python
def sim_b_one_user(probs, protect_indom, initial_state, rng, max_clicks=100000):
    """
    initial_state: Sim-A 결과 (gold, fragments, titles_unlocked, craft_count)
    종료: 백야(+17) 최초 제작 or 무형검(+11) 3회 제작
    """
    state = copy(initial_state)
    sword_saint_unlocked = False
    mugyeom_crafts = 0  # 무형검 제작 횟수
    baekya_crafted = False

    while not sword_saint_unlocked and state["clicks"] < max_clicks:
        # 칭호 선택 AI: 상황에 따라 최적 칭호 선택
        title = choose_title_b(state, protect_indom)

        # 라운드 시작: +0에서 시작 (또는 건너뛰기 사용)
        level = 0
        if title in ["indomitable"] and state has skip cost:
            level = 7  # +7 건너뛰기
            deduct skip cost
        elif title in ["master", "refine_peak"] and can afford:
            level = 12  # +12 건너뛰기
            deduct skip cost

        # 강화 루프
        while level < 25:
            target = level + 1
            # 재료 체크 (+17 이상)
            if target >= 17 and target in MATERIAL_REQ:
                if not has_materials(state, target):
                    break  # 재료 부족 → 판매 or 파밍

            state["clicks"] += 1
            gold -= COST[target]

            if rng.random() < get_prob(probs, target, title):
                level = target
                state["craft_count"] += 1

                # 무형검/백야 제작 체크
                if target == 11:
                    mugyeom_crafts += 1
                if target == 17 and not baekya_crafted:
                    baekya_crafted = True
                    sword_saint_unlocked = True  # 검성 획득!
                if mugyeom_crafts >= 3:
                    sword_saint_unlocked = True  # 검성 획득 (무형검 루트)

                # 달인 대장장이 체크
                if target >= 18 and "master" not in state["titles"]:
                    state["titles"].add("master")

                # 재련의 정점 체크
                # ...
            else:
                # 실패 처리
                protected = False
                if title == "indomitable":
                    if rng.random() < protect_indom:
                        protected = True  # 보호: 레벨 유지

                if protected:
                    # 레벨 유지. 재료는 소모됨.
                    consume_materials(state, target)
                else:
                    # 파괴: +0 리셋
                    # 조각 드랍
                    drop_fragments(state, level, title, rng)
                    consume_materials(state, target)
                    level = 0
                break  # 라운드 종료

    return state
```

**탐색 매트릭스**: 6 곡선 × 5 보호율 = 30 시나리오, 각 5,000명
**수집 메트릭**:
- 검성 획득까지: clicks, 시간
- 검성 획득 경로: 백야 루트 vs 무형검 3회 루트 비율
- 칭호 전환 패턴
- 건너뛰기 사용 횟수/효과
- 축적 상태 (골드, 조각, 최고 레벨)

**출력**: `sim_b_results.json`, `sim_b_report.md`

---

### Sim-C: 강한 보호 시대 (검성 → +25 달성)

**시작 상태**: Sim-B 종료 시점의 축적물 이어받음
**종료 조건**: +25 여명 달성
**보호**: 검성 장착 시 PROTECT_SAINT% 보호 + 파괴 시 50% 검성의 파편 드랍

**핵심 로직: visits[n] 추적 + 재료 비용 계산**

```python
def sim_c_one_user(probs, protect_saint, initial_state, rng, max_clicks=500000):
    state = copy(initial_state)
    visits = [0] * 26  # 각 state 방문 횟수

    level = 0  # 건너뛰기 적용 후 시작점
    # 검성 칭호: +8 건너뛰기 가능

    while level < 25 and state["clicks"] < max_clicks:
        target = level + 1
        visits[level] += 1

        # 재료 처리 (+17 이상)
        if target >= 17 and target in MATERIAL_REQ:
            # 재료 조달: 건너뛰기 or 보유분 사용 or 파밍
            # 건너뛰기 가능 시: 골드+조각으로 즉시 재료 검 획득
            # 보유분 사용: fragments/storage에서 꺼냄
            # 파밍: +0부터 재료 레벨까지 강화 (하위 캠페인)
            material_clicks = prepare_materials(state, target, probs, protect_saint, rng)
            state["clicks"] += material_clicks

        state["clicks"] += 1

        if rng.random() < get_prob(probs, target, state["title"]):
            level = target
        else:
            # 실패
            if rng.random() < protect_saint:
                pass  # 보호: 레벨 유지
            else:
                # 파괴
                if rng.random() < FRAG_DROP_SAINT:
                    state["fragments"]["검성의파편"] += 1  # 검성 파편 드랍
                drop_fragments(state, level, state["title"], rng)
                level = 0
                # +8 건너뛰기 (검성 칭호)
                if can_afford_skip(state, 8):
                    level = 8
                    deduct_skip_cost(state, 8)

    success = (level >= 25)
    return {
        "clicks": state["clicks"],
        "success": success,
        "visits": visits,
        "fragments": state["fragments"],
    }
```

**탐색 매트릭스**: 6 곡선 × 3 검성보호율 = 18 시나리오, 각 5,000명

**⚠️ 성능 주의**:
- max_clicks = 500,000 (약 417시간). 초과 시 미달성 기록.
- 재료 하위 캠페인에도 10,000클릭 제한.
- 해석적 E_farm 값을 사전 계산하여, 하위 캠페인 대신 확률적 비용으로 대체 가능.

**수집 메트릭**:
- +25 달성률
- 총 clicks (push + materials)
- 시간 환산
- visits[n] 평균 → 재료 소모량 산출
- 구간별 체류 비율
- 건너뛰기 사용 빈도/절약 효과
- 검성 파편 축적량

**출력**: `sim_c_results.json`, `sim_c_report.md`

---

### Sim-D: 재료 경제 & 건너뛰기 효과 검증 (독립)

**다른 시뮬과 독립적으로 실행 가능.** 수학적 검증 위주.

#### D-1: 해석적 E_farm 계산

각 곡선 × 보호율에서, 재료 검 파밍 비용:
- E_farm(+2): +0→+2 기대 클릭 (보호 적용)
- E_farm(+11): +0→+11 기대 클릭
- E_farm(+12): +0→+12 기대 클릭
- E_farm(+16): +0→+16 기대 클릭

Markov chain으로 해석적 풀이 (numpy.linalg.solve).
건너뛰기 적용 시 E_farm_skip: 건너뛰기 레벨에서 시작.
예: 검성(+8 건너뛰기) 장착 시 E_farm_skip(+12) = E(+8→+12)

#### D-2: 건너뛰기 효과 정량화

```
건너뛰기 절약 = E_farm(target) - E_farm_skip(target)
절약률 = 절약 / E_farm(target)
```

각 칭호별 건너뛰기의 절약 효과를 표로 제시.

#### D-3: 조각 공급량 vs 건너뛰기 비용

Sim-A 결과의 평균 조각 축적량으로, 건너뛰기를 몇 번 사용할 수 있는지 계산.
```
사용 가능 횟수 = min(보유 조각[종류] / 건너뛰기 비용[종류] for 종류 in 필요조각)
```

#### D-4: 보호 시 재료 소모 vs 보존 비교

Sim-C의 visits[n] 기반으로:
- 현행 (보호 시 재료 소모): total_mat = sum(visits[n] × count × E_farm)
- 가상 (보호 시 재료 보존): total_mat_saved = sum((visits[n] - protected[n]) × count × E_farm)
- 절약 효과: total_mat - total_mat_saved

**출력**: `sim_d_results.json`, `sim_d_report.md`

---

## 종합 점수 산정

Sim-A + Sim-B + Sim-C 결과를 합산하여 총 플레이타임과 체감 점수 산정.

```python
def total_score(sim_a, sim_b, sim_c):
    total_hours = sim_a["hours"] + sim_b["hours"] + sim_c["hours"]
    score = 0

    # 1. 총 플레이타임 (35점) — 5~7시간, 6시간 최적
    if total_hours <= 7.0:
        dev = abs(total_hours - 6.0) / 6.0
        score += max(0, (1 - dev)) * 35

    # 2. Phase 비율 (25점)
    a_ratio = sim_a["hours"] / total_hours
    b_ratio = sim_b["hours"] / total_hours
    c_ratio = sim_c["hours"] / total_hours
    # Phase A 20~40%, Phase B 25~40%, Phase C 25~45%
    if 0.15 <= a_ratio <= 0.45 and 0.20 <= b_ratio <= 0.45 and 0.20 <= c_ratio <= 0.50:
        score += 25
    elif 0.10 <= a_ratio <= 0.50 and 0.15 <= b_ratio <= 0.50:
        score += 15

    # 3. 달성률 (15점)
    score += min(sim_c["achievement_rate"] / 0.95, 1.0) * 15

    # 4. 분산 적절성 (15점) — p90/p50 = 1.5~2.5
    var = sim_c["p90_hours"] / max(sim_c["p50_hours"], 0.01)
    if 1.4 <= var <= 2.5: score += 15
    elif 1.2 <= var <= 3.0: score += 8

    # 5. 초반 파괴 체감 (10점) — Phase A에서 15회 파괴가 불쾌하지 않은가
    # Phase A 시간 > 1시간이면 파괴가 충분히 분산됨
    if sim_a["hours"] >= 1.0: score += 10
    elif sim_a["hours"] >= 0.5: score += 5

    return round(score, 1)
```

---

## 실행 가이드

### 의존성
```
Sim-A (독립) ─────→ Sim-B (A 결과 사용) ─────→ Sim-C (B 결과 사용)
Sim-D (독립)                                      ↑ D-4는 C 결과 사용
```

### 병렬 실행 명령

```bash
cd C:/Users/PC/project/Forge_Game/simulation/v9

# Step 1: Sim-A + Sim-D 병렬
claude -p "$(cat v9_prompt.md)

너의 임무는 **Sim-A (보호 없는 시대)**이다.
6곡선 × 5페르소나 = 30 시나리오, 각 10,000명.
Python 스크립트: sim_a.py. 결과: sim_a_results.json, sim_a_report.md.
완료 시 'SIMA_DONE' 출력." &

claude -p "$(cat v9_prompt.md)

너의 임무는 **Sim-D (재료 경제 검증)**이다.
해석적 풀이 위주 (numpy 사용).
Python 스크립트: sim_d.py. 결과: sim_d_results.json, sim_d_report.md.
⚠️ D-4는 sim_c_results.json이 필요하므로 나중에 별도 실행.
완료 시 'SIMD_DONE' 출력." &

wait

# Step 2: Sim-B (A 결과 필요)
claude -p "$(cat v9_prompt.md)

너의 임무는 **Sim-B (약한 보호 시대)**이다.
sim_a_results.json을 읽고 중앙값 축적물로 초기 상태 설정.
6곡선 × 5보호율 = 30 시나리오, 각 5,000명.
Python 스크립트: sim_b.py. 결과: sim_b_results.json, sim_b_report.md."

# Step 3: Sim-C (B 결과 필요)
claude -p "$(cat v9_prompt.md)

너의 임무는 **Sim-C (강한 보호 시대)**이다.
sim_b_results.json을 읽고 축적물 이어받기.
6곡선 × 3보호율 = 18 시나리오, 각 5,000명.
max_clicks=500,000. 느린 시나리오는 2,000명으로 축소 가능.
Python 스크립트: sim_c.py. 결과: sim_c_results.json, sim_c_report.md."

# Step 4: 종합 (A+B+C+D 결과 종합)
claude -p "$(cat v9_prompt.md)

너의 임무는 **종합 보고서**이다.
sim_a/b/c/d_results.json 전부 읽고:
1. 전 시나리오 총 플레이타임 = A+B+C 시간 합산
2. 점수 산정 (total_score 함수)
3. Top 5 시나리오 상세 분석
4. 최적 확률 곡선 + 보호율 조합 확정
5. 확정 데이터 (config.json 형태로 출력)
결과: final_report.md, final_balance.json."
```

### 코드 지침

- Python 3.10+, `pip install numpy` 사용 가능
- 진행률 stderr 출력: `[Sim-A][C2/farmer] 5000/10000 done, avg=3200clicks`
- 시드: 시나리오별 고정 `seed = hash((curve, persona_or_protect, sim_idx)) % 2**32`
- JSON: UTF-8, indent=2, ensure_ascii=False
- 시간 환산: 클릭 ÷ 1200 = 시간 (20클릭/분 × 60분)
- 모든 파일: `C:/Users/PC/project/Forge_Game/simulation/v9/` 내 저장
- web search 활용 가능: 시뮬레이션 방법론 참고

### 성공 기준

1. **총 플레이타임 5~7시간** 범위에 들어오는 시나리오 최소 3개
2. **달성률 95% 이상**
3. **Phase A 비율 15~45%** (초반 경험이 충분히 존재)
4. **최고 점수 60점 이상**

기준 미달 시, 종합 보고서에 **곡선/보호율 수정 제안** 포함.
