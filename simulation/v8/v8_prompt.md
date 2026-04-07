# 검 만들기 게임 — v8 최종 확률 최적화 시뮬레이션

## 사전 작업: simulation 폴더 정리

**이 작업을 가장 먼저 수행하라.**

```bash
# 기존 시뮬레이션 폴더 전부 정리 (v5, v6, v7 및 루트 파일들)
cd C:/Users/PC/project/Forge_Game/simulation
rm -rf v5 v6 v7 v8
rm -f *.py *.json *.md

# v8 작업 디렉토리 생성
mkdir -p v8
cd v8
```

---

## 게임 개요

검 강화 게임. +0(목검)에서 시작, 최대 +25(여명)까지 강화. 실패 시 전 구간 파괴(+0 리셋). 목표 플레이타임: **5~7시간 (최대 7시간)**.

**게임 모토:** "초반 운게임 → 중반 전략게임(파밍/칭호/조각 배합으로 돌파) → 후반 스토리게임(검 설명문으로 세계관 유추)"

---

## 핵심 메커니즘: 3단계 유저 여정

### Phase A: 칭호 없음 (보호 없음)
- +0~+13 구간을 반복. 파밍(+7~+8 판매), 도전(+13+ 시도)
- 실패 = **전 구간 파괴 (+0 리셋)**, 보호 없음
- 이 과정에서 골드/조각 축적, 시스템 학습, 첫 파괴의 충격 경험
- **칭호 획득 조건**: +13 이상에서 **5회 파괴** 경험 → "잿불의 대장장이" 해금

### Phase B: 잿불의 대장장이 장착 후 +25 푸시
- 잿불 효과: 실패 시 `PROTECT_PCT` 확률로 **현재 레벨 유지**, 나머지 확률로 **+0 리셋**
- 재료 검은 보호 여부와 무관하게 항상 소모됨
- +0에서 시작하여 +25까지 도달

### Phase C: 재료 파밍 (별도 계산)
- +17 이상 강화에 재료 검 필요 (최대 +16 이하, 비재귀적)
- Phase B 시뮬레이션의 visits[n] 데이터로 재료 소모량 계산
- 재료 파밍 시간 = E_farm(재료 레벨) × 소모 개수

**총 플레이타임 = Phase A 시간 + Phase B 시간 + Phase C 시간**

---

## 고정 데이터

```python
# 강화 비용 (고정, 변경 불가)
COST = [None,
    5,10,15,22,32,48,72,108,160,235,
    340,480,680,960,1350,1900,2700,3800,5300,7400,
    10400,14500,20000,28000,0]

# 판매가 (시뮬레이션에서는 비사용 — 골드 경제는 별도)
# 재료 요구사항 (v7 단순화, 비재귀적)
MATERIAL_REQ = {
    17: [(12, 1)],         # 엑스칼리버 ×1
    18: [(12, 1)],         # 엑스칼리버 ×1
    19: [(12, 2)],         # 엑스칼리버 ×2
    20: [(16, 1)],         # 블러디 쇼텔 ×1
    21: [(11, 1)],         # 무형검 ×1
    22: [(16, 1)],         # 블러디 쇼텔 ×1
    23: [(2, 1)],          # 투박한 철검 ×1
    24: [(16, 1)],         # 블러디 쇼텔 ×1
    25: [(16, 2), (12, 1)], # 블러디 쇼텔 ×2 + 엑스칼리버 ×1
}
```

---

## 테스트 매트릭스: 6 확률 곡선 × 4 보호율 = 24 시나리오

### 확률 곡선 6종

모든 곡선은 +1~+7(운 구간)은 동일. +8~+25이 다름.
곡선 설계 원칙: +13 근처에서 바닥 → +14에서 반등 → +17~+21 전략 벽 → +22~+25 회복.

```python
CURVES = {
  "C1": {
    "name": "깊은골짜기",
    "desc": "+13에서 40%까지 급락, +17~21에서 35% 바닥, +25에서 60% 회복",
    "probs": [0,
      0.95,0.93,0.91,0.89,0.86, 0.82,0.78,  # +1~+7 (운)
      0.73,0.67,0.60, 0.53,0.46,0.40,        # +8~+13 (학습, 현행 유사)
      0.65,0.58,0.52,                         # +14~+16 (잿불 반등)
      0.42,0.38,0.35, 0.35,0.35,              # +17~+21 (전략 바닥)
      0.42,0.50,0.57,0.63]                    # +22~+25 (스토리 회복)
  },
  "C2": {
    "name": "완만학습",
    "desc": "+8~+13을 상향, 복귀 비용 감소. 전략 벽 40%",
    "probs": [0,
      0.95,0.93,0.91,0.89,0.86, 0.82,0.78,
      0.75,0.70,0.65, 0.60,0.55,0.48,
      0.65,0.60,0.55,
      0.45,0.42,0.40, 0.38,0.38,
      0.45,0.52,0.58,0.63]
  },
  "C3": {
    "name": "극적반전",
    "desc": "+13에서 38%까지 깊게 빠지고, +14에서 70%로 극적 반등. 후반 65%",
    "probs": [0,
      0.95,0.93,0.91,0.89,0.86, 0.82,0.78,
      0.73,0.67,0.60, 0.53,0.45,0.38,
      0.70,0.65,0.58,
      0.48,0.43,0.40, 0.38,0.38,
      0.45,0.52,0.60,0.65]
  },
  "C4": {
    "name": "높은바닥",
    "desc": "전 구간 바닥이 45%. 안정적이지만 긴장감 낮을 수 있음",
    "probs": [0,
      0.95,0.93,0.91,0.89,0.86, 0.82,0.78,
      0.75,0.70,0.65, 0.60,0.55,0.50,
      0.68,0.63,0.58,
      0.52,0.48,0.46, 0.45,0.45,
      0.50,0.55,0.60,0.65]
  },
  "C5": {
    "name": "이중골짜기",
    "desc": "+13과 +20에서 두 번의 바닥. 중간에 +16에서 잠깐 숨통",
    "probs": [0,
      0.95,0.93,0.91,0.89,0.86, 0.82,0.78,
      0.73,0.67,0.60, 0.53,0.46,0.40,
      0.65,0.60,0.58,
      0.50,0.45,0.40, 0.35,0.35,
      0.42,0.50,0.58,0.65]
  },
  "C6": {
    "name": "후반관대",
    "desc": "+17~+21 바닥은 깊지만(35%), +22~+25가 70%로 빠르게 회복",
    "probs": [0,
      0.95,0.93,0.91,0.89,0.86, 0.82,0.78,
      0.75,0.70,0.65, 0.58,0.50,0.43,
      0.65,0.60,0.55,
      0.45,0.40,0.37, 0.35,0.35,
      0.48,0.58,0.65,0.72]
  },
}
```

### 보호율 4종
```python
PROTECT_PCTS = [0.50, 0.55, 0.58, 0.60]
```

---

## 시뮬레이션 구조 (4개 병렬 에이전트 + 1개 종합)

### Agent 1: Phase A — 칭호 획득 시뮬레이션

**입력**: 확률 곡선 6종 (Phase A는 보호 없으므로 보호율 무관)
**시뮬레이션**: 각 곡선 × 20,000명

```python
def simulate_title_acquisition(probs, rng):
    """
    보호 없음 상태에서 "+13 이상 5회 파괴"까지의 총 클릭 수.
    유저 행동:
    - 기본: +0→+7/+8 반복 판매 (파밍)
    - 파괴 경험 0~2회: 25% 확률로 +13+ 도전
    - 파괴 경험 3~4회: 50% 확률로 +13+ 도전 (적극적)
    - 판매 대신 도전 시: 가능한 한 높이 올리다가 파괴
    
    실패 = +0 리셋 (보호 없음)
    종료 조건: high_destroys >= 5
    안전장치: max_clicks = 100,000
    """
    total_clicks = 0
    high_destroys = 0  # +13 이상 파괴 횟수
    rounds = 0
    max_level_ever = 0
    
    while high_destroys < 5 and total_clicks < 100000:
        rounds += 1
        level = 0
        
        # 이번 라운드 행동 결정
        if high_destroys >= 3:
            push_mode = rng.random() < 0.50
        else:
            push_mode = rng.random() < 0.25
        
        sell_target = 99 if push_mode else (7 + (1 if rng.random() < 0.4 else 0))
        
        while level < 25:
            if level >= sell_target:
                break  # 판매
            
            total_clicks += 1
            next_lv = level + 1
            if rng.random() < probs[next_lv]:
                level = next_lv
                max_level_ever = max(max_level_ever, level)
            else:
                if level >= 13:
                    high_destroys += 1
                level = 0
                break
    
    return {"clicks": total_clicks, "rounds": rounds, "max_level": max_level_ever}
```

**수집 메트릭 (곡선별)**:
- 클릭: mean, p25, p50, p75, p90
- 시간 환산: p50_clicks / 1200 (시간)
- 평균 라운드 수

**출력**: `phase_a_results.json`

---

### Agent 2: Phase B — 보호 푸시 (해석적 + Monte Carlo)

**입력**: 확률 곡선 6종 × 보호율 4종 = 24 시나리오

**해석적 풀이** (Markov chain, numpy):

```python
def solve_protected_push(probs, protect_pct):
    """
    E[n] = 상태 n에서 +25까지의 기대 클릭.
    E[n] = 1 + p(n+1)·E[n+1] + (1-p(n+1))·protect_pct·E[n] + (1-p(n+1))·(1-protect_pct)·E[0]
    
    정리: E[n]·(1 - (1-p)·protect) = 1 + p·E[n+1] + (1-p)·(1-protect)·E[0]
    E[n] = a[n] + b[n]·E[0]
    역방향 계산 후 E[0] = a[0] / (1 - b[0])
    """
    # (구현은 이전 대화에서 검증된 코드 사용)
```

**Monte Carlo 검증**: 각 시나리오 10,000회
- visits[n] 추적: 각 상태에서 강화를 시도한 횟수
- 구간별 체류 클릭 비율 계산

```python
def simulate_protected_push(probs, protect_pct, rng, max_clicks=2000000):
    level = 0
    clicks = 0
    visits = [0] * 26
    section_clicks = {"0-7":0, "8-13":0, "14-16":0, "17-21":0, "22-25":0}
    
    while level < 25 and clicks < max_clicks:
        clicks += 1
        visits[level] += 1
        
        # 구간 분류
        if level <= 7: section_clicks["0-7"] += 1
        elif level <= 13: section_clicks["8-13"] += 1
        elif level <= 16: section_clicks["14-16"] += 1
        elif level <= 21: section_clicks["17-21"] += 1
        else: section_clicks["22-25"] += 1
        
        target = level + 1
        if rng.random() < probs[target]:
            level = target
        else:
            if rng.random() < protect_pct:
                pass  # 보호: 현재 레벨 유지
            else:
                level = 0  # 파괴: +0 리셋
    
    success = (level >= 25)
    ratios = {k: v/max(clicks,1) for k,v in section_clicks.items()}
    return {"clicks": clicks, "success": success, "visits": visits, "section_ratios": ratios}
```

**수집 메트릭 (시나리오별)**:
- 해석적 E0
- MC: mean, p25, p50, p75, p90 클릭
- 달성률 (2M 클릭 내)
- 구간별 체류 비율
- visits[n] 평균 (재료 계산용)

**출력**: `phase_b_results.json`

---

### Agent 3: Phase C — 재료 파밍 비용 계산

**입력**: Agent 2의 visits[n] 데이터 (JSON에서 읽기)
**Agent 2가 먼저 완료되어야 함** — Agent 2의 출력 파일을 polling하라.

```python
def calc_material_farming(visits_mean, probs, protect_pct):
    """
    재료 파밍 비용 계산.
    
    E_farm(m) = +0→+m까지의 기대 클릭 (보호 적용)
    재료 소모량 = visits[n] (n = target-1, 즉 해당 레벨 시도 횟수)
    총 재료 클릭 = sum(visits[n] * count * E_farm(req_level))
    """
    # E_farm 계산 (해석적: +0→+m Markov chain, 흡수 상태 m)
    # 보호 적용: 실패 시 protect_pct로 머무름, 나머지 +0
    
    E_farm = {}
    for m in set(req for reqs in MATERIAL_REQ.values() for req, cnt in reqs):
        # +0→+m 까지의 기대 클릭 (m에서 흡수)
        E_farm[m] = solve_absorbing_chain(probs, protect_pct, absorb_at=m)
    
    total_material_clicks = 0
    for target_level in range(17, 26):
        if target_level in MATERIAL_REQ:
            n = target_level - 1  # state index
            for (req_level, count) in MATERIAL_REQ[target_level]:
                consumed = visits_mean[n] * count
                total_material_clicks += consumed * E_farm[req_level]
    
    return total_material_clicks, E_farm
```

**수집 메트릭 (시나리오별)**:
- E_farm(2), E_farm(11), E_farm(12), E_farm(16)
- 재료별 소모량
- 총 재료 클릭
- 시간 환산

**출력**: `phase_c_results.json`

---

### Agent 4: 체감 분석 & 점수 산정

**입력**: Agent 1, 2, 3의 결과 JSON 파일
**Agent 1, 2, 3이 모두 완료되어야 함.**

```python
def calculate_score(phase_a_hours, phase_b_hours, phase_c_hours, 
                    achievement_rate, section_ratios, p90_hours, p50_hours):
    total_hours = phase_a_hours + phase_b_hours + phase_c_hours
    score = 0
    
    # 1. 총 플레이타임 (35점) — 5.5~6.5시간 최적, 최대 7시간
    if total_hours <= 7.0:
        deviation = abs(total_hours - 6.0) / 6.0
        score += max(0, (1 - deviation)) * 35
    
    # 2. 페이즈 비율 (25점)
    # Phase A(칭호획득) 25~45%, Phase B(푸시) 40~60%, Phase C(재료) 5~20% 이상적
    a_ratio = phase_a_hours / max(total_hours, 0.01)
    b_ratio = phase_b_hours / max(total_hours, 0.01)
    if 0.20 <= a_ratio <= 0.50 and 0.35 <= b_ratio <= 0.65:
        score += 25
    elif 0.15 <= a_ratio <= 0.55 and 0.30 <= b_ratio <= 0.70:
        score += 15
    else:
        score += 5
    
    # 3. 달성 가능성 (15점) — 95%+ 달성률
    score += min(achievement_rate / 0.95, 1.0) * 15
    
    # 4. 구간 분포 균형 (15점) — Phase B 내에서
    max_section = max(section_ratios.values())
    score += max(0, 1 - (max_section - 0.35) / 0.65) * 15
    
    # 5. 분산 적절성 (10점) — p90/p50 = 1.5~2.5
    var_ratio = p90_hours / max(p50_hours, 0.01)
    if 1.4 <= var_ratio <= 2.5:
        score += 10
    elif 1.2 <= var_ratio <= 3.0:
        score += 5
    
    return round(score, 1)
```

**체감 분석** (각 시나리오별):
- "+20 강화를 10번 시도했을 때" 성공/보호/파괴 기대 횟수
- Phase A(칭호 획득)에서 유저가 겪는 경험 서술
- Phase B(푸시)에서의 감정 곡선 서술
- 전체 여정의 "서사적 흐름" 평가

**출력**: `scoring_results.json`, `scoring_report.md`

---

### Agent 5: 종합 보고서 (모든 에이전트 완료 후)

모든 에이전트 결과를 종합하여 최종 보고서 작성.

**포함 내용**:
1. **24 시나리오 결과 요약 표** (곡선×보호율 × Phase A/B/C 시간 × 총 시간 × 점수)
2. **Top 3 최적 시나리오 상세 분석**
3. **최적 시나리오의 확률 곡선** (+1~+25 전체, config.json 형식)
4. **유저 여정 타임라인** (0시간~7시간 구간별 경험)
5. **체감 분석** (10회 시도 체험표)
6. **재료 체인 확정안** (MATERIAL_REQ)
7. **잿불 칭호 확정 스펙**
8. **변경 권고 사항** (있으면)

**출력**: `final_report.md`, `final_balance.json`

---

## 병렬 실행 가이드

### 의존성 그래프
```
Agent 1 (Phase A) ──────────────────────────────┐
Agent 2 (Phase B) ──→ Agent 3 (Phase C) ──────→ Agent 4 (점수) ──→ Agent 5 (종합)
```

- Agent 1과 Agent 2는 **동시 실행** 가능 (독립적)
- Agent 3은 **Agent 2 완료 후** 실행 (visits 데이터 필요)
- Agent 4는 **Agent 1, 2, 3 모두 완료 후** 실행
- Agent 5는 **Agent 4 완료 후** 실행

### 실행 명령

```bash
cd C:/Users/PC/project/Forge_Game/simulation/v8

# Step 1: Phase A + Phase B 병렬 실행
claude -p "$(cat v8_prompt.md)

너의 임무는 **Agent 1 (Phase A: 칭호 획득 시뮬레이션)**이다.
6개 확률 곡선 × 20,000명 시뮬레이션을 실행하라.
Python 스크립트를 sim_phase_a.py로 저장하고 실행하라.
결과를 phase_a_results.json으로 저장하라.
완료 시 stderr에 'AGENT1_DONE'을 출력하라." &

claude -p "$(cat v8_prompt.md)

너의 임무는 **Agent 2 (Phase B: 보호 푸시)**이다.
6개 확률 곡선 × 4개 보호율 = 24 시나리오.
해석적 풀이(Markov chain) + Monte Carlo 10,000회 검증.
Python 스크립트를 sim_phase_b.py로 저장하고 실행하라.
결과를 phase_b_results.json으로 저장하라.
numpy가 필요하면 pip install numpy 실행.
⚠️ Monte Carlo에서 개별 시뮬 max_clicks = 2,000,000.
⚠️ 느린 시나리오(해석적 E0 > 50,000)는 MC를 2,000회로 축소.
완료 시 stderr에 'AGENT2_DONE'을 출력하라." &

wait

# Step 2: Phase C (Agent 2 결과 필요)
claude -p "$(cat v8_prompt.md)

너의 임무는 **Agent 3 (Phase C: 재료 파밍 비용)**이다.
phase_b_results.json을 읽고, 각 시나리오의 visits 데이터로 재료 파밍 비용을 계산하라.
Python 스크립트를 sim_phase_c.py로 저장하고 실행하라.
결과를 phase_c_results.json으로 저장하라."

# Step 3: 점수 산정 (Agent 1,2,3 결과 필요)
claude -p "$(cat v8_prompt.md)

너의 임무는 **Agent 4 (점수 산정 & 체감 분석)**이다.
phase_a_results.json, phase_b_results.json, phase_c_results.json을 읽고,
24 시나리오의 점수를 산정하고 체감 분석을 수행하라.
결과를 scoring_results.json, scoring_report.md로 저장하라."

# Step 4: 종합 보고서
claude -p "$(cat v8_prompt.md)

너의 임무는 **Agent 5 (종합 보고서)**이다.
모든 결과 파일을 읽고 최종 보고서를 작성하라.
결과를 final_report.md, final_balance.json으로 저장하라."
```

---

## 코드 지침

- **Python 3.10+**, numpy 사용 가능 (pip install numpy)
- 진행률: 매 2,000회마다 stderr 출력 `[Agent N] Case C3/protect=0.55: 4000/10000 done`
- 시드: 각 시나리오별 고정 시드 (재현 가능). `seed = hash((curve_name, protect_pct, sim_index)) % 2**32`
- JSON 출력: UTF-8, indent=2, ensure_ascii=False
- 모든 시간은 **클릭 수 ÷ 1200 = 시간** 으로 환산 (20클릭/분 × 60분)
- 파일 경로: 모두 `C:/Users/PC/project/Forge_Game/simulation/v8/` 내

---

## 성공 기준

시뮬레이션이 "성공"하려면:

1. **24 시나리오 중 최소 5개 이상**이 총 플레이타임 5~7시간 범위에 들어와야 함
2. **최고 점수 시나리오의 점수**가 60점 이상이어야 함
3. **Phase A 비율**이 총 시간의 20~50% 사이여야 함 (초반 경험이 존재)
4. **달성률**이 95% 이상이어야 함

이 기준을 만족하는 시나리오가 없으면, Agent 4가 **확률 곡선 수정 제안**을 보고서에 포함하라.
