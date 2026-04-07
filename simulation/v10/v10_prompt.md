# 검 만들기 게임 — v10 밸런싱 시뮬레이션

## 사전 작업

```bash
cd C:/Users/PC/project/Forge_Game/simulation
rm -rf v5 v6 v7 v8 v9
mkdir -p v10
cd v10
```

---

## 용어 (혼동 금지)

| 용어 | 정의 |
|------|------|
| **Block** | 레벨 그룹. Block 1(+0~+7) ~ Block 6(+25). 코드 블록/UI 블록과 무관 |
| **Phase** | 플레이어 여정. Phase A(+12 도달) ~ Phase D(+25 달성). 코드 ForgePhase와 무관 |
| **강화** | +n → +n+1 시도 |
| **제작** | 검을 만드는 행위. 강화 성공 + 조합소 제작 **모두 포함** |
| **파괴** | 강화 실패 후 +0 리셋. 보호 발동 시 파괴 아님 (레벨 유지) |
| **보호** | 칭호 효과로 파괴 대신 현재 레벨 유지. 재료 보존과 별개 |
| **건너뛰기** | 칭호 부가효과. 골드+조각 1개 지불 → 즉시 검 획득. 라운드당 1회 |
| **재료 검** | +17 이상 강화에 필요한 하위 검 (≤+16). 비재귀적 |
| **조각** | 파괴 시 드랍되는 8종 소재 |

---

## 게임 개요

+0(목검) → +25(여명) 강화 게임. 실패 시 기본 +0 리셋(전 구간 파괴). 칭호 보호로 완화 가능.
**목표 플레이타임: 5~7시간 (최적 6시간).**
**게임 모토: "초반 운게임 → 중반 전략게임 → 후반 스토리게임"**

---

## v9 대비 변경사항 (v10)

| 항목 | v9 | v10 |
|------|-----|-----|
| 불굴 획득 조건 | 15회 파괴 | **+8 이상에서 20회 파괴** |
| 검성 획득 조건 | 백야 최초 or 무형검 3회 | **백야(+17) 최초 제작만** |
| 건너뛰기 비용 | 조각 다수 + 골드 소액 | **조각 1개 + 골드 대폭 상승** |

v9 핵심 문제: Phase A=5분(1.4%), Phase B=8분(2.2%), Phase C=6.2h(96.4%). 운게임/전략게임 단계가 사실상 없었음.

---

## 게임 데이터

### 확률 곡선 — 6종

```python
PROB_COMMON = {1:0.95, 2:0.93, 3:0.90, 4:0.87, 5:0.83, 6:0.78, 7:0.73}

CURVES = {
    "C1": {
        "name": "깊은골짜기",
        "probs": {
            8:0.73, 9:0.67, 10:0.60, 11:0.53, 12:0.46, 13:0.40,
            14:0.65, 15:0.58, 16:0.52,
            17:0.42, 18:0.38, 19:0.35, 20:0.35, 21:0.35,
            22:0.42, 23:0.50, 24:0.57, 25:0.63
        }
    },
    "C2": {
        "name": "완만학습",
        "probs": {
            8:0.75, 9:0.70, 10:0.65, 11:0.60, 12:0.55, 13:0.48,
            14:0.65, 15:0.60, 16:0.55,
            17:0.45, 18:0.42, 19:0.40, 20:0.38, 21:0.38,
            22:0.45, 23:0.52, 24:0.58, 25:0.63
        }
    },
    "C3": {
        "name": "극적반전",
        "probs": {
            8:0.73, 9:0.67, 10:0.60, 11:0.53, 12:0.45, 13:0.38,
            14:0.70, 15:0.65, 16:0.58,
            17:0.48, 18:0.43, 19:0.40, 20:0.38, 21:0.38,
            22:0.45, 23:0.52, 24:0.60, 25:0.65
        }
    },
    "C4": {
        "name": "높은바닥",
        "probs": {
            8:0.75, 9:0.70, 10:0.65, 11:0.60, 12:0.55, 13:0.50,
            14:0.68, 15:0.63, 16:0.58,
            17:0.52, 18:0.48, 19:0.46, 20:0.45, 21:0.45,
            22:0.50, 23:0.55, 24:0.60, 25:0.65
        }
    },
    "C5": {
        "name": "이중골짜기",
        "probs": {
            8:0.73, 9:0.67, 10:0.60, 11:0.53, 12:0.46, 13:0.40,
            14:0.65, 15:0.60, 16:0.58,
            17:0.50, 18:0.45, 19:0.40, 20:0.35, 21:0.35,
            22:0.42, 23:0.50, 24:0.58, 25:0.65
        }
    },
    "C6": {
        "name": "후반관대",
        "probs": {
            8:0.75, 9:0.70, 10:0.65, 11:0.58, 12:0.50, 13:0.43,
            14:0.65, 15:0.60, 16:0.55,
            17:0.45, 18:0.40, 19:0.37, 20:0.35, 21:0.35,
            22:0.48, 23:0.58, 24:0.65, 25:0.72
        }
    },
}

def get_prob(curve_probs, target_level):
    if target_level <= 7:
        return PROB_COMMON[target_level]
    return curve_probs[target_level]
```

### 강화 비용 (고정)

```python
COST = {
    1:5, 2:10, 3:15, 4:22, 5:32, 6:48, 7:72,
    8:108, 9:160, 10:235, 11:340, 12:480,
    13:680, 14:960, 15:1350, 16:1900, 17:2700,
    18:3800, 19:5300, 20:7400, 21:10400, 22:14500,
    23:20000, 24:28000, 25:0
}
```

### 판매가

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

### 재료 요구 (비재귀적, 모든 재료 ≤+16)

```python
MATERIAL_REQ = {
    17: [(12,1)],
    18: [(12,1)],
    19: [(12,2)],
    20: [(16,1)],
    21: [(11,1)],
    22: [(16,1)],
    23: [(2,1)],
    24: [(16,1)],
    25: [(16,2),(12,1)],
}
```

### 칭호 시스템 (9개)

```python
TITLES = {
    "beginner_luck": {
        "name": "초심자의 행운",
        "condition": "첫 파괴",
        "effect": "파괴 시 100% 조각 드랍 (dropBaseChance → 100%)",
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
        "condition": "조각 5종 보유 or 총 20개 획득",
        "effect": "파괴 시 60% 확률로 조각 2배 드랍",
        "skip": {"target": 5},
    },
    "indomitable": {
        "name": "불굴의 대장장이",
        "condition": "+8 이상에서 20회 파괴",  # ← v10 변경
        "effect": "파괴 시 PROTECT_INDOM% 확률로 현재 레벨 유지",
        "skip": {"target": 7},
    },
    "master": {
        "name": "달인 대장장이",
        "condition": "+18 이상 첫 제작",
        "effect": "성공 확률 +2%p",
        "skip": {"target": 12},
    },
    "refine_peak": {
        "name": "재련의 정점",
        "condition": "조합소 검 제작 3회",
        "effect": "+17 이상 실패 시 재료 검 보존 (보호는 아님)",
        "skip": {"target": 12},
    },
    "sword_saint": {
        "name": "검성의 대장장이",
        "condition": "백야(+17) 최초 제작",  # ← v10 변경 (무형검 루트 삭제)
        "effect": "파괴 시 PROTECT_SAINT% 보호 + 50% 검성의 파편 드랍",
        "skip": {"target": 8},
    },
    "legendary": {
        "name": "전설의 대장장이",
        "condition": "+25 제작",
        "effect": "+25 무료 제작 (재료+골드 면제)",
        "skip": {"target": 25, "cost": "free"},
    },
    "mythic": {
        "name": "신화 속 이야기",
        "condition": "+1~+25 전부 보관",
        "effect": "없음 (이스터에그)",
        "skip": None,
    },
}
```

### 조각 드랍

```python
DROP_BASE_CHANCE = {
    2:0.25, 3:0.25, 4:0.25, 5:0.28,
    6:0.30, 7:0.30, 8:0.35, 9:0.35,
    10:0.38, 11:0.40, 12:0.40,
    13:0.45, 14:0.45, 15:0.50, 16:0.50,
    17:0.60, 18:0.60, 19:0.65, 20:0.65,
    21:0.65, 22:0.70, 23:0.70, 24:0.75,
}
# +0, +1: 드랍 없음. +25: 판매 불가, 드랍 없음.

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

def roll_fragment_drop(level, title, rng):
    """파괴 후 조각 드랍 판정. level = 파괴 직전 레벨."""
    if level < 2 or level > 24:
        return None

    base_chance = DROP_BASE_CHANCE[level]
    if title == "beginner_luck":
        base_chance = 1.0  # 100% 오버라이드

    if rng.random() >= base_chance:
        return None

    # 드랍 테이블에서 weight 기반 선택
    table = DROP_TABLE[level]
    total = sum(table.values())
    roll = rng.random() * total
    cumulative = 0
    for frag, weight in table.items():
        cumulative += weight
        if roll < cumulative:
            qty = 1
            if title == "scavenger" and rng.random() < 0.60:
                qty = 2  # 잔해의 수집가: 60% 확률로 2배
            return {frag: qty}
    return None
```

### 탐색 변수

```python
# Sim-A 고정
INDOM_CONDITION = {"min_level": 8, "destroy_count": 20}
INITIAL_GOLD = 2000

# Sim-B1 탐색: 불굴 보호율 5단계 (건너뛰기 OFF)
PROTECT_INDOM_RANGE = [0.20, 0.25, 0.30, 0.35, 0.40]

# Sim-C 탐색: 검성 보호율 3단계
PROTECT_SAINT_RANGE = [0.50, 0.55, 0.60]
FRAG_DROP_SAINT = 0.50  # 고정
```

---

## 시뮬레이션 Step 1: Sim-A + Sim-D (병렬)

### Sim-A: 보호 없는 시대 (+0 → 불굴 획득)

**종료 조건**: **+8 이상에서 20회 파괴** → 불굴의 대장장이 획득
**보호**: 없음. 실패 = 무조건 +0 리셋.

**유저 행동 모델 (5종 페르소나)**:

```python
PERSONAS = {
    "cautious": {
        "desc": "조심스러운 초보. +7에서 판매, 가끔 도전",
        "sell_at": 7, "push_chance": 0.15,
        "title_pref": "beginner_luck",
    },
    "farmer": {
        "desc": "안정형 파머. +8에서 판매, 골드 우선",
        "sell_at": 8, "push_chance": 0.10,
        "title_pref": "haggler",
    },
    "ambitious": {
        "desc": "야심찬 중수. +10 목표, 적극 도전",
        "sell_at": 10, "push_chance": 0.30,
        "title_pref": "beginner_luck",
    },
    "yolo": {
        "desc": "욜로 도박꾼. 판매 안 하고 계속 올림",
        "sell_at": 99, "push_chance": 1.0,
        "title_pref": "beginner_luck",
    },
    "crafter": {
        "desc": "전략적 조합러. +8 판매, 조각 수집 집중",
        "sell_at": 8, "push_chance": 0.20,
        "title_pref": "scavenger",
    },
}
```

**시뮬레이션 로직**:

```python
def sim_a(probs, persona, rng, max_clicks=200000):
    gold = INITIAL_GOLD
    fragments = {}
    total_frag_acquired = 0  # 총 획득 조각 수 (잔해의 수집가 조건용)
    level = 0
    clicks = 0
    destructions_high = 0  # +8 이상 파괴 횟수 (불굴 조건)
    destructions_total = 0
    sales = 0
    max_level = 0
    title = None
    titles_unlocked = set()

    while destructions_high < 20 and clicks < max_clicks:
        # 칭호 해금 체크
        if destructions_total >= 1 and "beginner_luck" not in titles_unlocked:
            titles_unlocked.add("beginner_luck")
            if persona["title_pref"] == "beginner_luck":
                title = "beginner_luck"
        if sales >= 15 and "haggler" not in titles_unlocked:
            titles_unlocked.add("haggler")
            if persona["title_pref"] == "haggler":
                title = "haggler"
        # 잔해의 수집가: 5종 보유 or 20개 총 획득
        frag_types = len([k for k,v in fragments.items() if v > 0])
        if (frag_types >= 5 or total_frag_acquired >= 20) and "scavenger" not in titles_unlocked:
            titles_unlocked.add("scavenger")
            if persona["title_pref"] == "scavenger":
                title = "scavenger"

        # 행동 결정
        if level >= persona["sell_at"] and rng.random() > persona["push_chance"]:
            price = SELL[level]
            if title == "haggler":
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
            if level >= 1:
                gold += SELL[level]
                sales += 1
            level = 0
            continue

        gold -= cost
        clicks += 1

        if rng.random() < get_prob(probs, target):
            level = target
            max_level = max(max_level, level)
        else:
            # 파괴
            if level >= 8:
                destructions_high += 1
            if level >= 2:
                drop = roll_fragment_drop(level, title, rng)
                if drop:
                    for frag, qty in drop.items():
                        fragments[frag] = fragments.get(frag, 0) + qty
                        total_frag_acquired += qty
            destructions_total += 1
            level = 0

    return {
        "clicks": clicks,
        "destructions_high": destructions_high,
        "destructions_total": destructions_total,
        "sales": sales,
        "gold": gold,
        "fragments": dict(fragments),
        "max_level": max_level,
        "titles_unlocked": list(titles_unlocked),
        "completed": destructions_high >= 20,
    }
```

**규모**: 6곡선 × 5페르소나 = 30 시나리오, 각 **10,000명**
**시간 환산**: 클릭 ÷ 1200 = 시간 (20클릭/분 × 60분)

**수집 메트릭** (시나리오별):
- clicks: mean, p25, p50, p75, p90
- hours: p50, p90 (= clicks / 1200)
- 완료율 (max_clicks 내 불굴 획득 비율)
- 종료 시 골드: mean, p50
- 종료 시 조각: 종류별 mean
- 파괴 횟수: total mean, high(+8이상) mean
- 판매 횟수: mean
- 최고 레벨: p50, max
- 칭호 해금 비율 (초심자/흥정/잔해)

**출력**: `sim_a_results.json`, `sim_a_report.md`

---

### Sim-D: 해석적 E_farm + 건너뛰기 분석

**독립 실행. numpy 사용.**

#### D-1: E_farm 해석적 계산

보호 없음, 불굴 보호, 검성 보호 각각에 대해 +0→목표 레벨 기대 클릭.

```python
def solve_e_farm(probs, protect_pct, target_level):
    """
    Markov chain: +0에서 target_level까지의 기대 클릭.
    target_level에 도달하면 흡수(종료).
    실패 시: protect_pct 확률로 현재 레벨 유지, 나머지 +0 리셋.
    """
    import numpy as np
    n = target_level  # states: 0, 1, ..., n-1 (n에 도달하면 종료)
    A = np.zeros((n, n))
    b = np.ones(n)

    for i in range(n):
        target = i + 1
        p = get_prob(probs, target)
        fail = 1 - p
        stay = fail * protect_pct
        reset = fail * (1 - protect_pct)

        A[i][i] = 1 - stay  # 대각선: 1 - 머무를 확률
        if target < n:
            A[i][target] = -p  # 성공 → 다음 state
        # target == n이면 흡수 → b에 포함
        A[i][0] -= reset  # 실패 → +0

    E = np.linalg.solve(A, b)
    return E[0]
```

계산 대상:
- 보호 없음 (protect=0): E_farm(+2), E_farm(+7), E_farm(+8), E_farm(+11), E_farm(+12), E_farm(+16)
- 불굴 보호 (protect=0.20~0.40, 5단계): E_farm(+12), E_farm(+16), E_farm(+17)
- 검성 보호 (protect=0.50~0.60, 3단계): E_farm(+12), E_farm(+16)

#### D-2: 건너뛰기 절약 효과

건너뛰기 시작점에서 목표까지의 E_farm:
- +5 건너뛰기: E_farm(+0→+5) 절약
- +7 건너뛰기: E_farm(+0→+7) 절약
- +8 건너뛰기: E_farm(+0→+8) 절약
- +12 건너뛰기: E_farm(+0→+12) 절약

#### D-3: Phase B 예상 시간 (해석적)

불굴 보호율별, +0→+17 기대 클릭:
```
E_push(+17, protect) = solve_e_farm(probs, protect, 17)
```
재료 비용 추가: +17 강화에 엑스칼리버(+12) 1개 필요.
```
E_total_B = E_push(+17) + E_farm(+12, protect) × visits_at_16
```
다만 visits_at_16은 해석적으로도 계산 가능 (Markov chain의 방문 횟수 기대값).

**출력**: `sim_d_results.json`, `sim_d_report.md`

---

## 시뮬레이션 Step 2: Sim-B1 (A 결과 필요)

### Sim-B1: 약한 보호 시대 — 곡선 × 보호율 탐색 (건너뛰기 OFF)

**시작 상태**: Sim-A의 **페르소나별 p50** 축적물 사용 (가장 대표적인 페르소나 1개 선택, 또는 전체 평균)
**종료 조건**: **백야(+17) 최초 제작** → 검성의 대장장이 획득
**보호**: 불굴 장착 (PROTECT_INDOM% 확률로 현재 레벨 유지)
**건너뛰기**: **이 시뮬에서는 OFF** (순수 곡선+보호율 성능 측정)

```python
def sim_b1(probs, protect_indom, initial_state, rng, max_clicks=300000):
    """
    초기 상태에서 백야(+17) 최초 제작까지.
    건너뛰기 없음. 불굴 보호만 적용.
    """
    gold = initial_state["gold"]
    fragments = dict(initial_state["fragments"])
    clicks = 0
    level = 0
    max_level = 0
    destructions = 0
    baekya_crafted = False

    while not baekya_crafted and clicks < max_clicks:
        if level >= 25:
            # +25 도달 시 (거의 없겠지만 안전장치)
            break

        target = level + 1

        # +17 강화 시 재료 체크 (엑스칼리버 +12 필요)
        # 이 시뮬에서는 재료를 별도 파밍으로 조달
        # 단순화: +17 시도 시 E_farm(+12) 클릭을 추가 비용으로 계산
        if target == 17:
            # 재료 파밍 비용 추가 (엑스칼리버 1개)
            e_farm_12 = estimate_e_farm_12(probs, protect_indom)
            clicks += int(e_farm_12)

        cost = COST[target]
        if gold < cost:
            # 골드 부족: 현재 검 판매 후 재시작
            if level >= 1:
                gold += SELL[level]
            level = 0
            continue

        gold -= cost
        clicks += 1

        p = get_prob(probs, target)
        if protect_indom > 0 and target > 1:
            # 달인 대장장이 체크: +18 이상 첫 제작 시 확률 +2%p
            # Phase B에서는 아직 달인이 없으므로 적용 안 됨
            pass

        if rng.random() < p:
            level = target
            max_level = max(max_level, level)
            if target == 17:
                baekya_crafted = True  # 검성 획득!
        else:
            # 실패
            if rng.random() < protect_indom:
                # 보호: 레벨 유지
                pass
            else:
                # 파괴: +0 리셋
                if level >= 2:
                    drop = roll_fragment_drop(level, "indomitable", rng)
                    if drop:
                        for f, q in drop.items():
                            fragments[f] = fragments.get(f, 0) + q
                destructions += 1
                level = 0

    return {
        "clicks": clicks,
        "hours": clicks / 1200,
        "completed": baekya_crafted,
        "max_level": max_level,
        "destructions": destructions,
        "gold": gold,
        "fragments": fragments,
    }
```

**⚠️ 재료 파밍 처리**: +17 강화 시도 시 엑스칼리버(+12) 1개가 필요하다. 이 시뮬에서는 재료를 별도 파밍하는 시간을 `E_farm(+12, protect_indom)` 클릭으로 환산하여 clicks에 더한다. E_farm(+12)는 Sim-D의 해석적 결과를 사용. (Sim-D가 먼저 완료되어야 하므로, sim_d_results.json을 읽어서 사용.)

**규모**: 6곡선 × 5보호율 = **30 시나리오**, 각 **5,000명**

**수집 메트릭** (시나리오별):
- clicks: mean, p25, p50, p75, p90
- hours: mean, p50, p90
- 완료율 (max_clicks 내 백야 제작 비율)
- 파괴 횟수: mean
- 종료 시 골드, 조각
- 최고 도달 레벨: p50, p90

**출력**: `sim_b1_results.json`, `sim_b1_report.md`

### Sim-B1 보고서에 반드시 포함할 것

1. **6곡선 × 5보호율 = 30칸 매트릭스**: p50 시간 + 완료율
2. **Phase B 예상 시간이 1~2시간인 조합** 강조 표시
3. **Phase A(Sim-A) + Phase B(Sim-B1) 합산 시간** 표시
4. **각 곡선별 "최적 불굴 보호율"** (Phase B가 1~2h가 되는 보호율)
5. **추천 Top 5 조합** (곡선+보호율)

---

## 실행 명령

### Step 1: Sim-A + Sim-D 병렬

```bash
cd C:/Users/PC/project/Forge_Game/simulation/v10

# Sim-A
claude -p "$(cat v10_prompt.md)

너의 임무는 **Sim-A (보호 없는 시대)**이다.
불굴 획득 조건: +8 이상에서 20회 파괴.
6곡선 × 5페르소나 = 30시나리오, 각 10,000명.
Python: sim_a.py → sim_a_results.json, sim_a_report.md.
진행률: stderr에 [Sim-A][C2/farmer] 5000/10000 형식.
numpy 필요 시 pip install numpy.
완료 시 'SIMA_DONE' 출력." &

# Sim-D
claude -p "$(cat v10_prompt.md)

너의 임무는 **Sim-D (해석적 E_farm)**이다.
D-1: 보호 없음/불굴/검성별 E_farm 계산 (numpy).
D-2: 건너뛰기 절약 효과.
D-3: Phase B 예상 시간 (불굴 보호율별 +0→+17).
Python: sim_d.py → sim_d_results.json, sim_d_report.md.
완료 시 'SIMD_DONE' 출력." &

wait
```

### Step 2: Sim-B1 (A+D 결과 필요)

```bash
claude -p "$(cat v10_prompt.md)

너의 임무는 **Sim-B1 (약한 보호 시대 — 곡선×보호율 탐색)**이다.
sim_a_results.json에서 전체 평균 축적물을 초기 상태로 사용.
sim_d_results.json에서 E_farm(+12, 보호율별) 값을 읽어서 재료 비용에 사용.
건너뛰기 OFF. 불굴 보호만.
6곡선 × 5보호율 = 30시나리오, 각 5,000명.
Python: sim_b1.py → sim_b1_results.json, sim_b1_report.md.
⚠️ max_clicks=300,000. 느린 시나리오는 경고 표시.

보고서에 반드시 포함:
1. 30칸 매트릭스 (곡선×보호율 → p50 시간 + 완료율)
2. Phase A+B 합산 시간
3. 추천 Top 5 조합"
```

### Step 3~5: 유저가 B1 결과를 보고 결정한 후 별도 실행

Sim-B2 (건너뛰기 비용 탐색)와 Sim-C (+25 달성)는 **B1 결과를 보고 곡선+보호율을 확정한 후** 실행한다. 프롬프트는 B1 결과에 따라 별도 작성.

---

## 코드 지침

- Python 3.10+, numpy 사용 (`pip install numpy`)
- 진행률: stderr에 `[Sim-X][C2/p30] 2500/5000 done`
- 시드: `seed = hash((curve, persona_or_protect, sim_idx)) % 2**32`
- JSON: UTF-8, indent=2, ensure_ascii=False
- 시간 환산: 클릭 ÷ 1200 = 시간 (20클릭/분 × 60분)
- 파일 경로: `C:/Users/PC/project/Forge_Game/simulation/v10/`

---

## 성공 기준 (Phase A + Phase B 합산 기준)

이 Step 1+2에서의 성공 기준:

1. **Phase A (Sim-A) p50**: 20~50분 (현재 5분이었으므로 4~10배 증가 기대)
2. **Phase B (Sim-B1) p50**: 1~2시간
3. **Phase A + B 합산**: 1.5~3시간 (총 6~7시간의 25~45%)
4. **Phase B 완료율**: 90% 이상 (300,000 클릭 내)

기준 미달 시, 보고서에 **불굴 보호율 또는 곡선 수정 제안** 포함.
