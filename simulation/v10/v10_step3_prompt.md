# v10 Step 3~4: Sim-B2 (건너뛰기 비용 탐색) + Sim-C (+25 달성)

## 사전 작업

```bash
cd C:/Users/PC/project/Forge_Game/simulation/v10
pip install numpy
```

기존 sim_a, sim_b1, sim_d 결과를 읽어서 사용한다.

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

+0(목검) → +25(여명) 강화 게임. 실패 시 기본 +0 리셋. 칭호 보호로 완화.
**목표 플레이타임: 5~7시간 (최적 6시간).**
**게임 모토: "초반 운게임 → 중반 전략게임 → 후반 스토리게임"**

---

## 이전 단계 결과 요약 (v10 Step 1~2)

### Phase A 확정

- **불굴 획득 조건**: +8 이상에서 **15회 파괴** (v9의 "아무데서나 15회"에서 변경)
- **소요 시간**: ambitious 기준 p50 ≈ **25분**
- **축적물** (ambitious p50 기준):
  - 골드: 약 24,000G
  - 녹슨철조각: 약 43개
  - 마력부여철조각: 약 18개
  - 정제된철조각: 약 6개
  - 광물파편: 약 5개
  - 달빛조각: 약 1개
  - 사령조각: 약 2개
  - 검성의파편: 약 0.3개
  - 뒤틀린마력파편: 약 0개

### Phase B 유망 조합 (Sim-B1, 건너뛰기 OFF)

| ID | 곡선 | 불굴 보호율 | Phase B 시간 | 완료율 |
|----|------|-----------|------------|------|
| B1 | C1(깊은골짜기) | 30% | 1.97h | 79% |
| B2 | C1(깊은골짜기) | 35% | 1.62h | 86% |
| B3 | C3(극적반전) | 25% | 1.87h | 75% |
| B4 | C3(극적반전) | 30% | 1.55h | 83% |
| B5 | C6(후반관대) | 25% | 1.55h | 84% |
| B6 | C6(후반관대) | 30% | 1.29h | 89% |

### Sim-D 핵심 E_farm 값

```python
# 불굴 보호율별 E_farm(+12) — 재료 파밍 기본 비용
E_FARM_12 = {
    "C1": {0.25: 140.4, 0.30: 123.0, 0.35: 107.6},
    "C3": {0.25: 143.1, 0.30: 125.3, 0.35: 109.6},
    "C6": {0.25: 107.9, 0.30: 95.7, 0.35: 84.8},
}

# 검성 보호율별 E_farm(+16) — Sim-C에서 사용
E_FARM_16_SAINT = {
    "C1": {0.50: 329.6, 0.55: 255.6, 0.60: 197.6},
    "C3": {0.50: 288.3, 0.55: 226.0, 0.60: 176.7},
    "C6": {0.50: 244.7, 0.55: 194.1, 0.60: 153.7},
}
```

---

## 게임 데이터 (전체)

### 확률 곡선 — 이번 단계에서 사용하는 3종만

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
    "C3": {
        "name": "극적반전",
        "probs": {
            8:0.73, 9:0.67, 10:0.60, 11:0.53, 12:0.45, 13:0.38,
            14:0.70, 15:0.65, 16:0.58,
            17:0.48, 18:0.43, 19:0.40, 20:0.38, 21:0.38,
            22:0.45, 23:0.52, 24:0.60, 25:0.65
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

def get_prob(curve_probs, target_level, has_master=False):
    if target_level <= 7:
        p = PROB_COMMON[target_level]
    else:
        p = curve_probs[target_level]
    if has_master:
        p = min(p + 0.02, 1.0)  # 달인 대장장이: +2%p
    return p
```

### 비용/판매가/재료 (고정)

```python
COST = {
    1:5, 2:10, 3:15, 4:22, 5:32, 6:48, 7:72,
    8:108, 9:160, 10:235, 11:340, 12:480,
    13:680, 14:960, 15:1350, 16:1900, 17:2700,
    18:3800, 19:5300, 20:7400, 21:10400, 22:14500,
    23:20000, 24:28000, 25:0
}

SELL = {
    0:2, 1:15, 2:38, 3:78, 4:155, 5:300, 6:550, 7:950,
    8:1600, 9:2700, 10:4500, 11:10000, 12:28000,
    13:75000, 14:200000, 15:550000, 16:2500000,
    17:5000000, 18:10000000, 19:20000000, 20:40000000,
    21:80000000, 22:160000000, 23:300000000, 24:600000000,
    25:0
}

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
    if level < 2 or level > 24:
        return None
    base_chance = DROP_BASE_CHANCE[level]
    if title == "beginner_luck":
        base_chance = 1.0
    if rng.random() >= base_chance:
        return None
    table = DROP_TABLE[level]
    total = sum(table.values())
    roll = rng.random() * total
    cumulative = 0
    for frag, weight in table.items():
        cumulative += weight
        if roll < cumulative:
            qty = 1
            if title == "scavenger" and rng.random() < 0.60:
                qty = 2
            return {frag: qty}
    return None
```

### 건너뛰기 비용 — 3세트 탐색

```python
SKIP_COST_SETS = {
    "low": {
        5:  {"gold": 500,    "녹슨철조각": 1},
        7:  {"gold": 2000,   "녹슨철조각": 1},
        8:  {"gold": 4000,   "마력부여철조각": 1},
        12: {"gold": 20000,  "마력부여철조각": 1},
    },
    "mid": {
        5:  {"gold": 1000,   "녹슨철조각": 1},
        7:  {"gold": 4000,   "녹슨철조각": 1},
        8:  {"gold": 8000,   "마력부여철조각": 1},
        12: {"gold": 50000,  "마력부여철조각": 1},
    },
    "high": {
        5:  {"gold": 2000,   "녹슨철조각": 1},
        7:  {"gold": 8000,   "녹슨철조각": 1},
        8:  {"gold": 15000,  "마력부여철조각": 1},
        12: {"gold": 100000, "마력부여철조각": 1},
    },
}
```

### 칭호 보호율 탐색

```python
# Sim-B2에서 사용 (곡선별 최적 불굴 보호율)
SELECTED_COMBOS = [
    {"curve": "C1", "protect_indom": 0.30},
    {"curve": "C1", "protect_indom": 0.35},
    {"curve": "C3", "protect_indom": 0.25},
    {"curve": "C3", "protect_indom": 0.30},
    {"curve": "C6", "protect_indom": 0.25},
    {"curve": "C6", "protect_indom": 0.30},
]

# Sim-C에서 사용
PROTECT_SAINT_RANGE = [0.50, 0.55, 0.60]
FRAG_DROP_SAINT = 0.50
```

---

## Sim-B2: 건너뛰기 비용 탐색

**목적**: 유망한 곡선+보호율 조합에서, 건너뛰기 비용이 Phase B 시간에 미치는 영향을 측정.

**시작 상태**: Phase A ambitious 기준 축적물 (15회 파괴 기준 추정)
```python
INITIAL_STATE_B = {
    "gold": 24000,
    "fragments": {
        "녹슨철조각": 43,
        "마력부여철조각": 18,
        "정제된철조각": 6,
        "광물파편": 5,
        "달빛조각": 1,
        "사령조각": 2,
        "검성의파편": 0,
        "뒤틀린마력파편": 0,
    }
}
```

**종료 조건**: 백야(+17) 최초 제작 → 검성 획득
**보호**: 불굴 (SELECTED_COMBOS의 protect_indom)
**건너뛰기**: ON — 파괴 후 복귀 시 칭호별 건너뛰기 사용 (불굴: +7 건너뛰기)

```python
def sim_b2(curve_probs, protect_indom, skip_costs, initial_state, rng, max_clicks=300000):
    gold = initial_state["gold"]
    fragments = dict(initial_state["fragments"])
    clicks = 0
    level = 0
    max_level = 0
    destructions = 0
    skips_used = 0
    baekya_crafted = False

    # sim_d_results.json에서 E_farm(+12, protect_indom) 읽기
    e_farm_12 = get_e_farm_12(curve_name, protect_indom)

    while not baekya_crafted and clicks < max_clicks:
        # 파괴 후 복귀 시 건너뛰기 판단
        if level == 0 and skips_used == 0:  # 라운드당 1회 제한 간소화
            skip_target = 7  # 불굴의 건너뛰기
            skip_cost = skip_costs.get(skip_target)
            if skip_cost and can_afford_skip(gold, fragments, skip_cost):
                gold -= skip_cost["gold"]
                for frag, qty in skip_cost.items():
                    if frag != "gold":
                        fragments[frag] = fragments.get(frag, 0) - qty
                level = skip_target
                skips_used += 1

        if level >= 25:
            break

        target = level + 1

        # +17 강화 시 재료 파밍 비용
        if target == 17:
            clicks += int(e_farm_12)  # 엑스칼리버 1개 파밍

        cost = COST[target]
        if gold < cost:
            if level >= 1:
                gold += SELL[level]
            level = 0
            skips_used = 0  # 새 라운드
            continue

        gold -= cost
        clicks += 1

        if rng.random() < get_prob(curve_probs, target):
            level = target
            max_level = max(max_level, level)
            if target == 17:
                baekya_crafted = True
        else:
            if rng.random() < protect_indom:
                pass  # 보호
            else:
                # 파괴
                if level >= 2:
                    drop = roll_fragment_drop(level, "indomitable", rng)
                    if drop:
                        for f, q in drop.items():
                            fragments[f] = fragments.get(f, 0) + q
                destructions += 1
                level = 0
                skips_used = 0  # 새 라운드

    return {
        "clicks": clicks,
        "hours": clicks / 1200,
        "completed": baekya_crafted,
        "destructions": destructions,
        "skips_used": skips_used,
        "gold": gold,
        "fragments": fragments,
    }
```

**규모**: 6 조합 × 3 비용세트 = **18 시나리오**, 각 **5,000명**

**수집 메트릭**:
- clicks/hours: mean, p50, p90
- 완료율
- 건너뛰기 사용 횟수 (mean)
- 건너뛰기 OFF(Sim-B1) 대비 시간 절감률
- 종료 시 골드/조각

**출력**: `sim_b2_results.json`, `sim_b2_report.md`

---

## Sim-C: 강한 보호 시대 (+25 달성)

**목적**: 검성 칭호 획득 후 +25까지의 총 시간 측정.

**시작 상태**: Sim-B2 종료 시점의 축적물 (시나리오별 p50 사용)
**종료 조건**: +25 여명 달성
**보호**: 검성 장착 (PROTECT_SAINT% + 파괴 시 50% 검성의 파편 드랍)
**건너뛰기**: ON — 검성의 +8 건너뛰기 사용

**칭호 전환 전략**: 검성을 기본으로 사용하되, 시뮬에서는 검성 고정으로 단순화.
이유: 검성이 55~60% 보호 + +8 건너뛰기로 Phase C에서 가장 강력. 달인(+2%p)이나 재련(재료 보존)은 보조적이므로 첫 시뮬에서는 고정.

```python
def sim_c(curve_probs, protect_saint, initial_state, skip_costs, rng, max_clicks=500000):
    gold = initial_state["gold"]
    fragments = dict(initial_state["fragments"])
    clicks = 0
    level = 0
    visits = [0] * 26
    destructions = 0
    skips_used_total = 0
    saint_frags_earned = 0

    while level < 25 and clicks < max_clicks:
        # 파괴 후 +8 건너뛰기 (검성)
        if level == 0:
            skip_cost = skip_costs.get(8)
            if skip_cost and can_afford_skip(gold, fragments, skip_cost):
                gold -= skip_cost["gold"]
                for frag, qty in skip_cost.items():
                    if frag != "gold":
                        fragments[frag] = fragments.get(frag, 0) - qty
                level = 8
                skips_used_total += 1

        target = level + 1
        visits[level] += 1

        # 재료 처리 (+17 이상)
        if target >= 17 and target in MATERIAL_REQ:
            for (req_level, req_count) in MATERIAL_REQ[target]:
                # 재료 검 조달: 건너뛰기(+12) 또는 파밍
                for _ in range(req_count):
                    # +12 건너뛰기 가능 시 사용
                    skip_12_cost = skip_costs.get(12)
                    if req_level == 12 and skip_12_cost and can_afford_skip(gold, fragments, skip_12_cost):
                        gold -= skip_12_cost["gold"]
                        for frag, qty in skip_12_cost.items():
                            if frag != "gold":
                                fragments[frag] = fragments.get(frag, 0) - qty
                    elif req_level == 2:
                        clicks += 3  # +2는 거의 공짜
                    elif req_level == 11:
                        # 무형검 파밍 또는 검성의 파편 조합소
                        if fragments.get("검성의파편", 0) >= 1:
                            fragments["검성의파편"] -= 1  # 조합소 제작
                        else:
                            e_farm_11 = get_e_farm(curve_probs, protect_saint, 11)
                            clicks += int(e_farm_11)
                    else:
                        # +12 또는 +16 파밍
                        e_farm = get_e_farm(curve_probs, protect_saint, req_level)
                        clicks += int(e_farm)

        cost = COST[target]
        if gold < cost:
            if level >= 1:
                gold += SELL[level]
            level = 0
            continue

        gold -= cost
        clicks += 1

        if rng.random() < get_prob(curve_probs, target, has_master=True):
            level = target
        else:
            if rng.random() < protect_saint:
                pass  # 보호: 레벨 유지, 재료는 이미 소모됨
            else:
                # 파괴
                if rng.random() < FRAG_DROP_SAINT:
                    fragments["검성의파편"] = fragments.get("검성의파편", 0) + 1
                    saint_frags_earned += 1
                if level >= 2:
                    drop = roll_fragment_drop(level, "sword_saint", rng)
                    if drop:
                        for f, q in drop.items():
                            fragments[f] = fragments.get(f, 0) + q
                destructions += 1
                level = 0

    return {
        "clicks": clicks,
        "hours": clicks / 1200,
        "success": level >= 25,
        "visits": visits,
        "destructions": destructions,
        "skips_used": skips_used_total,
        "saint_frags_earned": saint_frags_earned,
        "gold": gold,
        "fragments": fragments,
    }
```

**⚠️ get_e_farm 함수**: sim_d_results.json에서 미리 계산된 해석적 E_farm 값을 읽어서 사용. 하위 캠페인을 직접 시뮬하지 않음 (성능 최적화).

**규모**: 
- Sim-B2의 Top 3 조합 × 3 검성보호율 = **9 시나리오** (또는 6 조합 × 3 = 18)
- 각 **5,000명**

**⚠️ 성능**: max_clicks=500,000. 느린 시나리오(검성 50%)는 3,000명으로 축소 가능.

**수집 메트릭**:
- clicks/hours: mean, p50, p75, p90
- +25 달성률
- visits[n] mean → 재료 소모량 계산
- 구간별 체류 비율 (0-7, 8-12, 13-16, 17-21, 22-25)
- 건너뛰기(+8) 사용 횟수 mean
- 검성의 파편 축적량 mean
- 파괴 횟수 mean

**출력**: `sim_c_results.json`, `sim_c_report.md`

---

## 종합 보고서

Sim-B2 + Sim-C 결과를 합산하여 최종 판정.

```python
def total_score(phase_a_hours, phase_b_hours, phase_c_hours, 
                achievement_rate, p90_hours, p50_hours):
    total = phase_a_hours + phase_b_hours + phase_c_hours
    score = 0

    # 1. 총 플레이타임 (35점) — 5~7시간, 6시간 최적
    if total <= 7.0:
        dev = abs(total - 6.0) / 6.0
        score += max(0, (1 - dev)) * 35

    # 2. Phase 비율 (25점)
    a_ratio = phase_a_hours / total
    b_ratio = phase_b_hours / total
    c_ratio = phase_c_hours / total
    if 0.05 <= a_ratio <= 0.15 and 0.15 <= b_ratio <= 0.40 and 0.45 <= c_ratio <= 0.75:
        score += 25
    elif 0.03 <= a_ratio <= 0.20 and 0.10 <= b_ratio <= 0.45:
        score += 15
    else:
        score += 5

    # 3. 달성률 (15점)
    score += min(achievement_rate / 0.95, 1.0) * 15

    # 4. 분산 적절성 (15점) — p90/p50 = 1.5~2.5
    var = p90_hours / max(p50_hours, 0.01)
    if 1.4 <= var <= 2.5:
        score += 15
    elif 1.2 <= var <= 3.0:
        score += 8

    # 5. 초반 체감 (10점)
    if phase_a_hours >= 0.3:
        score += 10
    elif phase_a_hours >= 0.15:
        score += 5

    return round(score, 1)
```

**종합 보고서에 반드시 포함할 것**:

1. **전 시나리오 결과표**: 곡선 × 불굴보호율 × 건너뛰기비용 × 검성보호율 → Phase A/B/C 시간 + 총 시간 + 점수
2. **Top 5 시나리오 상세 분석**
3. **Phase 비율 도표**: A% / B% / C% 가 "운/전략/스토리"에 맞는지
4. **최적 config.json 출력** (확률 곡선 + 보호율 + 건너뛰기 비용)
5. **체감 분석**: "+20 강화 10회 시도 시 성공/보호/파괴 기대 횟수"
6. **기준 미달 시 수정 제안**

**출력**: `final_report.md`, `final_balance.json`

---

## 실행 명령

### Step 3: Sim-B2 + Sim-C 순차 실행

```bash
cd C:/Users/PC/project/Forge_Game/simulation/v10

claude -p "$(cat v10_step3_prompt.md)

너의 임무는 **Sim-B2 (건너뛰기 비용 탐색)** + **Sim-C (+25 달성)** + **종합 보고서**이다.
3개를 순차 실행한다.

## 실행 순서

### 1단계: Sim-B2
sim_d_results.json에서 E_farm 값을 읽어서 사용.
6 조합(곡선×불굴보호율) × 3 비용세트 = 18시나리오, 각 5,000명.
→ sim_b2_results.json, sim_b2_report.md

### 2단계: Sim-C
Sim-B2 결과에서 비용세트별 최적 3조합을 선정.
선정된 조합 × 3 검성보호율 = 최대 9시나리오, 각 5,000명.
sim_d_results.json에서 검성 보호율별 E_farm 값을 사용.
→ sim_c_results.json, sim_c_report.md

### 3단계: 종합 보고서
Phase A(0.42h 고정) + Phase B(Sim-B2) + Phase C(Sim-C) 합산.
total_score 함수로 점수 산정.
→ final_report.md, final_balance.json

## 주의사항
- sim_d_results.json을 반드시 읽고 E_farm 값을 참조할 것
- Sim-C에서 재료 파밍은 E_farm 해석값을 clicks에 더하는 방식 (하위 캠페인 미시뮬)
- max_clicks: Sim-B2=300,000, Sim-C=500,000
- Phase A 시간은 **0.42h (25분)** 고정값 사용
- 진행률: stderr에 출력
- 시드: hash((curve, protect, cost_set, sim_idx)) % 2**32"
```

---

## 코드 지침

- Python 3.10+, numpy 사용 가능
- 진행률: stderr에 `[Sim-B2][C1/p30/mid] 2500/5000`
- JSON: UTF-8, indent=2, ensure_ascii=False
- 시간: 클릭 ÷ 1200 = 시간
- 파일: `C:/Users/PC/project/Forge_Game/simulation/v10/`

## 성공 기준

1. **총 플레이타임 5~7시간** 범위 시나리오 3개 이상
2. **+25 달성률 95% 이상**
3. **Phase A 비율 5~15%**, Phase B 비율 15~40%, Phase C 비율 45~75%
4. **최고 점수 70점 이상**
