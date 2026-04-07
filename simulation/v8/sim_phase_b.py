"""
v8 Agent 2 - Phase B: 보호 푸시 시뮬레이션
6 곡선 × 4 보호율 = 24 시나리오
해석적 Markov chain + Monte Carlo 검증
"""
import numpy as np, random, json, statistics, time, sys
from pathlib import Path

OUT = Path(__file__).parent / "phase_b_results.json"

CURVES = {
  "C1": {"name":"깊은골짜기",  "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.46,0.40, 0.65,0.58,0.52, 0.42,0.38,0.35,0.35,0.35, 0.42,0.50,0.57,0.63]},
  "C2": {"name":"완만학습",    "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.60,0.55,0.48, 0.65,0.60,0.55, 0.45,0.42,0.40,0.38,0.38, 0.45,0.52,0.58,0.63]},
  "C3": {"name":"극적반전",    "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.45,0.38, 0.70,0.65,0.58, 0.48,0.43,0.40,0.38,0.38, 0.45,0.52,0.60,0.65]},
  "C4": {"name":"높은바닥",    "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.60,0.55,0.50, 0.68,0.63,0.58, 0.52,0.48,0.46,0.45,0.45, 0.50,0.55,0.60,0.65]},
  "C5": {"name":"이중골짜기",  "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.46,0.40, 0.65,0.60,0.58, 0.50,0.45,0.40,0.35,0.35, 0.42,0.50,0.58,0.65]},
  "C6": {"name":"후반관대",    "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.58,0.50,0.43, 0.65,0.60,0.55, 0.45,0.40,0.37,0.35,0.35, 0.48,0.58,0.65,0.72]},
}
PROTECT_PCTS = [0.50, 0.55, 0.58, 0.60]
MAX_CLICKS   = 2_000_000
N_RUNS       = 5000   # 효율적 실행 (해석적 결과로 보완)

SECTIONS = {
    "0-7":   lambda lv: lv <= 7,
    "8-13":  lambda lv: 8 <= lv <= 13,
    "14-16": lambda lv: 14 <= lv <= 16,
    "17-21": lambda lv: 17 <= lv <= 21,
    "22-25": lambda lv: lv >= 22,
}

# ── 해석적 풀이 ─────────────────────────────────────────────
def solve_e0(probs, protect, absorb=25):
    """E[0] = 상태 0에서 absorb까지 기대 클릭 (backward induction)."""
    N = absorb
    a, b = [0.0] * N, [0.0] * N
    for n in range(N - 1, -1, -1):
        p = probs[n + 1]; q = 1.0 - p
        d = 1.0 - q * protect
        if n == N - 1:
            a[n] = 1.0 / d
            b[n] = q * (1.0 - protect) / d
        else:
            a[n] = (1.0 + p * a[n + 1]) / d
            b[n] = (p * b[n + 1] + q * (1.0 - protect)) / d
    return a[0] / (1.0 - b[0])

def solve_visits(probs, protect, absorb=25):
    """N[0,:] = (I-Q)^{-1}[0,:] — 상태 0에서 시작해 흡수 전 각 상태 방문 기대값."""
    N = absorb
    Q = np.zeros((N, N))
    for s in range(N):
        p = probs[s + 1]; q = 1.0 - p
        if s + 1 < N:
            Q[s, s + 1] = p
        Q[s, s]  += q * protect
        Q[s, 0]  += q * (1.0 - protect)
    return np.linalg.solve(np.eye(N) - Q, np.eye(N))[0, :]

# ── Monte Carlo ──────────────────────────────────────────────
def simulate_protected_push(probs, protect_pct, rng, max_clicks=MAX_CLICKS):
    level   = 0
    clicks  = 0
    visits  = [0] * 26
    sec_cl  = {"0-7": 0, "8-13": 0, "14-16": 0, "17-21": 0, "22-25": 0}

    while level < 25 and clicks < max_clicks:
        clicks += 1
        visits[level] += 1
        for sname, fn in SECTIONS.items():
            if fn(level):
                sec_cl[sname] += 1
                break

        target = level + 1
        if rng.random() < probs[target]:
            level = target
        else:
            if rng.random() < protect_pct:
                pass   # 보호: 현재 레벨 유지
            else:
                level = 0  # 파괴: +0 리셋

    success = (level >= 25)
    ratios  = {k: v / max(clicks, 1) for k, v in sec_cl.items()}
    return {"clicks": clicks, "success": success,
            "visits": visits[:25], "section_ratios": ratios}

def pct(lst, p):
    lst2 = sorted(lst)
    i = int(len(lst2) * p)
    return lst2[min(i, len(lst2) - 1)]

# ── 메인 ────────────────────────────────────────────────────
results = {}
t0 = time.time()
print("=== Phase B: Protected Push Simulation ===", file=sys.stderr)

for ck, cv in CURVES.items():
    probs = cv["probs"]
    for pct_v in PROTECT_PCTS:
        key = f"{ck}_p{int(pct_v*100)}"

        # 해석적
        e0_analytical = float(solve_e0(probs, pct_v))
        visits_analytical = solve_visits(probs, pct_v).tolist()

        # MC
        n_runs = N_RUNS
        clicks_list, succ_list = [], []
        all_visits  = [0.0] * 25
        agg_ratios  = {k: 0.0 for k in SECTIONS}
        rng = random.Random(hash((ck, pct_v)) % 2**32)

        for i in range(n_runs):
            r = simulate_protected_push(probs, pct_v, rng)
            clicks_list.append(r["clicks"])
            succ_list.append(r["success"])
            for n in range(25):
                all_visits[n] += r["visits"][n]
            for k in agg_ratios:
                agg_ratios[k] += r["section_ratios"][k]

            if (i + 1) % 1000 == 0:
                elapsed = time.time() - t0
                ac = sum(succ_list)
                print(f"  [{key}] {i+1}/{n_runs}, ach={ac/(i+1):.1%}, {elapsed:.0f}s", file=sys.stderr)

        mean_v = [v / n_runs for v in all_visits]
        mean_r = {k: v / n_runs for k, v in agg_ratios.items()}
        ach_rate = sum(succ_list) / n_runs
        mean_c   = statistics.mean(clicks_list)
        p50_c    = pct(clicks_list, 0.50)
        p75_c    = pct(clicks_list, 0.75)
        p90_c    = pct(clicks_list, 0.90)

        results[key] = {
            "curve": ck,
            "curve_name": cv["name"],
            "protect_pct": pct_v,
            "analytical_e0": round(e0_analytical, 1),
            "analytical_e0_hours": round(e0_analytical / 1200, 3),
            "analytical_visits": [round(v, 3) for v in visits_analytical],
            "mc_n_runs":     n_runs,
            "mc_achievement_rate": round(ach_rate, 4),
            "mc_clicks_mean": round(mean_c, 1),
            "mc_clicks_p50":  p50_c,
            "mc_clicks_p75":  p75_c,
            "mc_clicks_p90":  p90_c,
            "mc_hours_p50":   round(p50_c / 1200, 3),
            "mc_hours_p90":   round(p90_c / 1200, 3),
            "mc_visits_mean": [round(v, 3) for v in mean_v],
            "mc_section_ratios": {k: round(v, 4) for k, v in mean_r.items()},
        }
        elapsed = time.time() - t0
        print(f"  [{key}] E0={e0_analytical:,.0f}  p50={p50_c:,}  ach={ach_rate:.1%}  {elapsed:.0f}s", file=sys.stderr)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\nAGENT2_DONE -> {OUT}", file=sys.stderr)
print(f"AGENT2_DONE")
