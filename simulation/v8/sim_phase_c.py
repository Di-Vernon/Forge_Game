"""
v8 Agent 3 - Phase C: 재료 파밍 비용 계산
phase_b_results.json 읽어서 각 시나리오의 재료 클릭 계산
재료 소모: 보호 여부 무관하게 매 시도마다 소모 (visits 기반)
"""
import json, sys, numpy as np
from pathlib import Path

BASE = Path(__file__).parent
B_FILE = BASE / "phase_b_results.json"
OUT    = BASE / "phase_c_results.json"

CURVES = {
  "C1": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.46,0.40, 0.65,0.58,0.52, 0.42,0.38,0.35,0.35,0.35, 0.42,0.50,0.57,0.63],
  "C2": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.60,0.55,0.48, 0.65,0.60,0.55, 0.45,0.42,0.40,0.38,0.38, 0.45,0.52,0.58,0.63],
  "C3": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.45,0.38, 0.70,0.65,0.58, 0.48,0.43,0.40,0.38,0.38, 0.45,0.52,0.60,0.65],
  "C4": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.60,0.55,0.50, 0.68,0.63,0.58, 0.52,0.48,0.46,0.45,0.45, 0.50,0.55,0.60,0.65],
  "C5": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.46,0.40, 0.65,0.60,0.58, 0.50,0.45,0.40,0.35,0.35, 0.42,0.50,0.58,0.65],
  "C6": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.58,0.50,0.43, 0.65,0.60,0.55, 0.45,0.40,0.37,0.35,0.35, 0.48,0.58,0.65,0.72],
}

MATERIAL_REQ = {
    17: [(12, 1)],
    18: [(12, 1)],
    19: [(12, 2)],
    20: [(16, 1)],
    21: [(11, 1)],
    22: [(16, 1)],
    23: [(2,  1)],
    24: [(16, 1)],
    25: [(16, 2), (12, 1)],
}
FARM_LEVELS = sorted({r for reqs in MATERIAL_REQ.values() for r, c in reqs})

def solve_e0(probs, protect, absorb):
    N = absorb; a, b = [0.0]*N, [0.0]*N
    for n in range(N-1, -1, -1):
        p = probs[n+1]; q = 1-p; d = 1-q*protect
        if n == N-1: a[n]=1/d; b[n]=q*(1-protect)/d
        else: a[n]=(1+p*a[n+1])/d; b[n]=(p*b[n+1]+q*(1-protect))/d
    return a[0]/(1-b[0])

# Phase B 결과 로드
with open(B_FILE, encoding="utf-8") as f:
    phase_b = json.load(f)

results = {}
print("=== Phase C: Material Farming Cost ===", file=sys.stderr)

for key, bdata in phase_b.items():
    ck   = bdata["curve"]
    pct  = bdata["protect_pct"]
    pr   = CURVES[ck]
    vis  = bdata["analytical_visits"]  # 해석적 visits 사용

    # E_farm 계산
    ef = {m: float(solve_e0(pr, pct, absorb=m)) for m in FARM_LEVELS}

    # 재료별 소모량 및 클릭 계산
    breakdown = {}
    total_mat_clicks = 0.0
    for target in range(17, 26):
        if target in MATERIAL_REQ:
            n = target - 1
            v = vis[n]
            for (req_lv, cnt) in MATERIAL_REQ[target]:
                clicks = v * cnt * ef[req_lv]
                total_mat_clicks += clicks
                bk = f"+{target}_req+{req_lv}x{cnt}"
                breakdown[bk] = {
                    "visits_n": round(v, 3),
                    "count": cnt,
                    "e_farm": round(ef[req_lv], 2),
                    "mat_clicks": round(clicks, 1),
                }

    results[key] = {
        "curve": ck,
        "protect_pct": pct,
        "e_farm": {m: round(v, 2) for m, v in ef.items()},
        "breakdown": breakdown,
        "total_mat_clicks": round(total_mat_clicks, 1),
        "total_mat_hours":  round(total_mat_clicks / 1200, 3),
    }
    print(f"  [{key}] mat_total={total_mat_clicks:,.0f} clicks ({total_mat_clicks/1200:.2f}h)", file=sys.stderr)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\nAGENT3_DONE -> {OUT}", file=sys.stderr)
print("AGENT3_DONE")
