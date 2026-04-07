"""
v8 Agent 1 - Phase A: 칭호 획득 시뮬레이션
+13 이상 5회 파괴 → 잿불의 대장장이 해금까지의 클릭 수
보호 없음 (실패 = +0 리셋)
"""
import random, json, statistics, time, sys
from pathlib import Path

OUT = Path(__file__).parent / "phase_a_results.json"

CURVES = {
  "C1": {"name":"깊은골짜기",  "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.46,0.40, 0.65,0.58,0.52, 0.42,0.38,0.35,0.35,0.35, 0.42,0.50,0.57,0.63]},
  "C2": {"name":"완만학습",    "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.60,0.55,0.48, 0.65,0.60,0.55, 0.45,0.42,0.40,0.38,0.38, 0.45,0.52,0.58,0.63]},
  "C3": {"name":"극적반전",    "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.45,0.38, 0.70,0.65,0.58, 0.48,0.43,0.40,0.38,0.38, 0.45,0.52,0.60,0.65]},
  "C4": {"name":"높은바닥",    "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.60,0.55,0.50, 0.68,0.63,0.58, 0.52,0.48,0.46,0.45,0.45, 0.50,0.55,0.60,0.65]},
  "C5": {"name":"이중골짜기",  "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.46,0.40, 0.65,0.60,0.58, 0.50,0.45,0.40,0.35,0.35, 0.42,0.50,0.58,0.65]},
  "C6": {"name":"후반관대",    "probs":[0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.58,0.50,0.43, 0.65,0.60,0.55, 0.45,0.40,0.37,0.35,0.35, 0.48,0.58,0.65,0.72]},
}
N_RUNS = 20000
MAX_CLICKS = 100000

def simulate_title_acquisition(probs, rng):
    total_clicks = 0
    high_destroys = 0
    rounds = 0
    max_level_ever = 0

    while high_destroys < 5 and total_clicks < MAX_CLICKS:
        rounds += 1
        level = 0
        push_mode = rng.random() < (0.50 if high_destroys >= 3 else 0.25)
        sell_target = 99 if push_mode else (7 + (1 if rng.random() < 0.4 else 0))

        while level < 25:
            if level >= sell_target:
                break
            total_clicks += 1
            if rng.random() < probs[level + 1]:
                level += 1
                if level > max_level_ever:
                    max_level_ever = level
            else:
                if level >= 13:
                    high_destroys += 1
                level = 0
                break

    return {"clicks": total_clicks, "rounds": rounds, "max_level": max_level_ever}

def pct(lst, p):
    lst2 = sorted(lst)
    i = int(len(lst2) * p)
    return lst2[min(i, len(lst2)-1)]

results = {}
t0 = time.time()
print("=== Phase A: Title Acquisition Simulation ===", file=sys.stderr)

for ck, cv in CURVES.items():
    probs = cv["probs"]
    clicks_list = []
    rounds_list = []
    maxlv_list  = []
    rng = random.Random(hash(ck) % 2**32)

    for i in range(N_RUNS):
        r = simulate_title_acquisition(probs, rng)
        clicks_list.append(r["clicks"])
        rounds_list.append(r["rounds"])
        maxlv_list.append(r["max_level"])

    mean_c  = statistics.mean(clicks_list)
    p25_c   = pct(clicks_list, 0.25)
    p50_c   = pct(clicks_list, 0.50)
    p75_c   = pct(clicks_list, 0.75)
    p90_c   = pct(clicks_list, 0.90)
    elapsed = time.time() - t0

    results[ck] = {
        "curve_name": cv["name"],
        "n_runs": N_RUNS,
        "clicks_mean": round(mean_c, 1),
        "clicks_p25":  p25_c,
        "clicks_p50":  p50_c,
        "clicks_p75":  p75_c,
        "clicks_p90":  p90_c,
        "hours_p50":   round(p50_c / 1200, 3),
        "hours_mean":  round(mean_c / 1200, 3),
        "rounds_mean": round(statistics.mean(rounds_list), 1),
        "max_level_mean": round(statistics.mean(maxlv_list), 1),
        "timeout_rate": round(sum(1 for c in clicks_list if c >= MAX_CLICKS) / N_RUNS, 4),
    }
    print(f"  [{ck}] {cv['name']}: p50={p50_c:,} clicks ({p50_c/1200:.2f}h)  {elapsed:.1f}s", file=sys.stderr)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\nAGENT1_DONE -> {OUT}", file=sys.stderr)
print(f"AGENT1_DONE")
