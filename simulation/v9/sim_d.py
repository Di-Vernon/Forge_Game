"""
Sim-D: 재료 경제 & 건너뛰기 효과 검증 (독립 실행)
D-1: 해석적 E_farm (Markov chain)
D-2: 건너뛰기 절약 효과
D-3: 조각 공급 vs 건너뛰기 비용
D-4: 보호 시 재료 소모 vs 보존 비교 (sim_c_results.json 필요 시)
"""
import json, sys
import numpy as np

PROB_COMMON = {1:0.95, 2:0.93, 3:0.90, 4:0.87, 5:0.83, 6:0.78, 7:0.73}
CURVES = {
    "C1": {8:0.73,9:0.67,10:0.60,11:0.53,12:0.46,13:0.40,14:0.65,15:0.58,16:0.52,17:0.42,18:0.38,19:0.35,20:0.35,21:0.35,22:0.42,23:0.50,24:0.57,25:0.63},
    "C2": {8:0.75,9:0.70,10:0.65,11:0.60,12:0.55,13:0.48,14:0.65,15:0.60,16:0.55,17:0.45,18:0.42,19:0.40,20:0.38,21:0.38,22:0.45,23:0.52,24:0.58,25:0.63},
    "C3": {8:0.73,9:0.67,10:0.60,11:0.53,12:0.45,13:0.38,14:0.70,15:0.65,16:0.58,17:0.48,18:0.43,19:0.40,20:0.38,21:0.38,22:0.45,23:0.52,24:0.60,25:0.65},
    "C4": {8:0.75,9:0.70,10:0.65,11:0.60,12:0.55,13:0.50,14:0.68,15:0.63,16:0.58,17:0.52,18:0.48,19:0.46,20:0.45,21:0.45,22:0.50,23:0.55,24:0.60,25:0.65},
    "C5": {8:0.73,9:0.67,10:0.60,11:0.53,12:0.46,13:0.40,14:0.65,15:0.60,16:0.58,17:0.50,18:0.45,19:0.40,20:0.35,21:0.35,22:0.42,23:0.50,24:0.58,25:0.65},
    "C6": {8:0.75,9:0.70,10:0.65,11:0.58,12:0.50,13:0.43,14:0.65,15:0.60,16:0.55,17:0.45,18:0.40,19:0.37,20:0.35,21:0.35,22:0.48,23:0.58,24:0.65,25:0.72},
}
CURVE_NAMES = {"C1":"깊은골짜기","C2":"완만학습","C3":"극적반전","C4":"높은바닥","C5":"이중골짜기","C6":"후반관대"}

PROTECT_INDOM_RANGE = [0.20, 0.25, 0.30, 0.35, 0.40]
PROTECT_SAINT_RANGE = [0.50, 0.55, 0.60]

COST = {1:5,2:10,3:15,4:22,5:32,6:48,7:72,8:108,9:160,10:235,11:340,12:480,13:680,14:960,15:1350,16:1900,17:2700,18:3800,19:5300,20:7400,21:10400,22:14500,23:20000,24:28000,25:0}

MATERIAL_REQ = {17:[(12,1)],18:[(12,1)],19:[(12,2)],20:[(16,1)],21:[(11,1)],22:[(16,1)],23:[(2,1)],24:[(16,1)],25:[(16,2),(12,1)]}

SKIP_COST = {
    5:  {"gold": 200,  "녹슨철조각": 3},
    7:  {"gold": 600,  "녹슨철조각": 5, "정제된철조각": 2},
    8:  {"gold": 1000, "마력부여철조각": 2},
    12: {"gold": 5000, "마력부여철조각": 3, "광물파편": 2},
    25: "free",
}

def get_prob(curve_probs, level, protect=0.0):
    """단순 확률 반환 (보호는 E_farm에서 별도 처리)"""
    if level <= 7:
        return PROB_COMMON.get(level, 0)
    return curve_probs.get(level, 0)

def e_farm_markov(curve_probs, from_level, to_level, protect=0.0):
    """
    from_level → to_level 기대 클릭 수 계산 (Markov chain).
    protect: 실패 시 레벨 유지 확률 (불굴/검성)
    실패 시 from_level로 리셋 (파괴 모델).
    """
    if from_level >= to_level:
        return 0.0

    # 상태: from_level, from_level+1, ..., to_level (absorbing)
    # E[i] = 1 + p_i * E[i+1] + (1-p_i)*protect * E[i] + (1-p_i)*(1-protect) * E[from_level]
    # E[to_level] = 0 (목표 달성)
    # 연립방정식으로 풀기

    n = to_level - from_level  # 상태 수 (from_level ~ to_level-1)
    # 상태 인덱스 i: 실제 레벨 = from_level + i

    A = np.zeros((n, n))
    b = np.zeros(n)

    for i in range(n):
        real_level = from_level + i
        target = real_level + 1
        p = get_prob(curve_probs, target)
        fail_p = 1.0 - p
        protect_eff = fail_p * protect  # 보호 발동 확률
        destroy_p = fail_p * (1.0 - protect)  # 파괴 확률

        # E[i] = 1 + p * E[i+1] + protect_eff * E[i] + destroy_p * E[0]
        # (1 - protect_eff) * E[i] - p * E[i+1] - destroy_p * E[0] = 1

        A[i][i] += (1.0 - protect_eff)
        if i + 1 < n:
            A[i][i+1] -= p
        # else: i+1 == n means to_level → E = 0, so no term
        A[i][0] -= destroy_p
        b[i] = 1.0

    try:
        E = np.linalg.solve(A, b)
        return float(E[0])
    except np.linalg.LinAlgError:
        return float('inf')

def run_sim_d():
    results = {}

    # ── D-1: E_farm 계산 ───────────────────────────────────
    print("[Sim-D] D-1: 해석적 E_farm 계산...", file=sys.stderr)
    d1 = {}
    target_levels = [2, 7, 8, 11, 12, 16]

    for curve_id, curve_probs_raw in CURVES.items():
        curve_probs = {**PROB_COMMON, **curve_probs_raw}
        d1[curve_id] = {"name": CURVE_NAMES[curve_id]}

        # 보호 없음
        d1[curve_id]["no_protect"] = {}
        for tgt in target_levels:
            e = e_farm_markov(curve_probs, 0, tgt, protect=0.0)
            d1[curve_id]["no_protect"][f"+{tgt}"] = round(e, 2)

        # 불굴 보호율별
        d1[curve_id]["indom"] = {}
        for prot in PROTECT_INDOM_RANGE:
            d1[curve_id]["indom"][f"p{int(prot*100)}"] = {}
            for tgt in target_levels:
                e = e_farm_markov(curve_probs, 0, tgt, protect=prot)
                d1[curve_id]["indom"][f"p{int(prot*100)}"][f"+{tgt}"] = round(e, 2)

        # 검성 보호율별
        d1[curve_id]["saint"] = {}
        for prot in PROTECT_SAINT_RANGE:
            d1[curve_id]["saint"][f"p{int(prot*100)}"] = {}
            for tgt in target_levels:
                e = e_farm_markov(curve_probs, 0, tgt, protect=prot)
                d1[curve_id]["saint"][f"p{int(prot*100)}"][f"+{tgt}"] = round(e, 2)

    results["D1_efarm"] = d1

    # ── D-2: 건너뛰기 절약 효과 ──────────────────────────────
    print("[Sim-D] D-2: 건너뛰기 절약 효과...", file=sys.stderr)
    d2 = {}
    # 건너뛰기 시나리오: (from_level, to_level, 칭호)
    skip_scenarios = [
        (0, 5,  "scavenger",    "잔해의 수집가 → +5"),
        (0, 7,  "indomitable",  "불굴의 대장장이 → +7"),
        (0, 8,  "sword_saint",  "검성의 대장장이 → +8"),
        (0, 12, "master",       "달인 대장장이 → +12"),
        (0, 12, "refine_peak",  "재련의 정점 → +12"),
    ]

    for curve_id, curve_probs_raw in CURVES.items():
        curve_probs = {**PROB_COMMON, **curve_probs_raw}
        d2[curve_id] = {"name": CURVE_NAMES[curve_id], "scenarios": {}}
        for from_l, to_l, title_id, desc in skip_scenarios:
            e_full = e_farm_markov(curve_probs, 0, to_l, protect=0.0)
            e_skip = e_farm_markov(curve_probs, from_l, to_l, protect=0.0) if from_l > 0 else 0.0
            saved = e_full - e_skip
            saved_pct = (saved / e_full * 100) if e_full > 0 else 0
            d2[curve_id]["scenarios"][title_id] = {
                "desc": desc,
                "e_full": round(e_full, 2),
                "e_after_skip": round(e_skip, 2),
                "saved_clicks": round(saved, 2),
                "saved_pct": round(saved_pct, 1),
                "skip_from": from_l,
                "skip_to": to_l,
            }

    results["D2_skip_effect"] = d2

    # ── D-3: 조각 공급량 vs 건너뛰기 비용 ────────────────────
    print("[Sim-D] D-3: 조각 공급량 vs 건너뛰기...", file=sys.stderr)
    # Sim-A의 평균 조각 데이터 (없으면 추정값 사용)
    import os
    if os.path.exists("sim_a_results.json"):
        with open("sim_a_results.json", "r", encoding="utf-8") as f:
            sim_a_data = json.load(f)
        # 전 시나리오 평균 조각
        all_frag_means = {}
        for scen in sim_a_data["scenarios"].values():
            for k, v in scen["fragments_mean"].items():
                all_frag_means[k] = all_frag_means.get(k, 0) + v
        n_s = len(sim_a_data["scenarios"])
        frag_supply = {k: round(v/n_s, 2) for k, v in all_frag_means.items()}
    else:
        # 추정값 (Sim-A 없을 때)
        frag_supply = {"녹슨철조각":8.0,"정제된철조각":1.5,"마력부여철조각":2.0,"달빛조각":0.5,"사령조각":0.5,"광물파편":0.8,"검성의파편":0.3,"뒤틀린마력파편":0.2}

    d3 = {"frag_supply_mean": frag_supply, "skip_affordability": {}}
    for target_level, cost in SKIP_COST.items():
        if cost == "free":
            d3["skip_affordability"][f"+{target_level}"] = {"times": "unlimited", "cost": "free"}
            continue
        times_list = []
        for item, needed in cost.items():
            if item == "gold":
                continue
            have = frag_supply.get(item, 0)
            times_list.append(have / needed if needed > 0 else float('inf'))
        times = min(times_list) if times_list else float('inf')
        d3["skip_affordability"][f"+{target_level}"] = {
            "cost": cost,
            "times_possible": round(times, 1),
        }

    results["D3_skip_supply"] = d3

    # ── D-4: 보호 시 재료 소모 vs 보존 비교 ──────────────────
    if os.path.exists("sim_c_results.json"):
        print("[Sim-D] D-4: 재료 소모 vs 보존 비교 (sim_c 사용)...", file=sys.stderr)
        with open("sim_c_results.json", "r", encoding="utf-8") as f:
            sim_c_data = json.load(f)

        d4 = {}
        for key, scen in sim_c_data.get("scenarios", {}).items():
            visits = scen.get("visits_mean", {})
            if not visits:
                continue
            curve_id = scen.get("curve", "C1")
            protect = scen.get("protect_saint", 0.55)
            curve_probs = {**PROB_COMMON, **CURVES.get(curve_id, {})}

            total_mat_current = 0
            total_mat_saved = 0
            for n_str, v_count in visits.items():
                n = int(n_str)
                if n + 1 not in MATERIAL_REQ:
                    continue
                for mat_level, mat_qty in MATERIAL_REQ[n + 1]:
                    e_mat = e_farm_markov(curve_probs, 0, mat_level, protect=0.0)
                    fail_rate = 1.0 - get_prob(curve_probs, n + 1)
                    # 현행: 시도마다 재료 소모 (보호 여부 무관)
                    total_mat_current += v_count * mat_qty * e_mat
                    # 가상: 보호 발동 시 재료 보존 (재련의 정점 효과)
                    # 보호 발동 횟수 = v_count * fail_rate * protect
                    protected_attempts = v_count * fail_rate * protect
                    # 보존 = protected_attempts * mat_qty * e_mat 절약
                    mat_saved = protected_attempts * mat_qty * e_mat
                    total_mat_saved += mat_saved

            d4[key] = {
                "total_mat_effort_current": round(total_mat_current, 1),
                "mat_effort_saved_if_preserve": round(total_mat_saved, 1),
                "save_pct": round(total_mat_saved / total_mat_current * 100, 1) if total_mat_current > 0 else 0,
            }
        results["D4_mat_preserve"] = d4
    else:
        results["D4_mat_preserve"] = {"note": "sim_c_results.json 없음. D-4 스킵."}

    # ── 저장 ──────────────────────────────────────────────────
    with open("sim_d_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # 보고서 생성
    lines = ["# Sim-D 보고서: 재료 경제 & 건너뛰기 효과\n\n"]

    lines.append("## D-1: 해석적 E_farm (클릭 기준)\n\n")
    lines.append("### 보호 없음 — +0에서 목표 레벨까지 기대 클릭\n")
    lines.append("| 곡선 | +2 | +7 | +8 | +11 | +12 | +16 |\n")
    lines.append("|------|-----|-----|-----|------|------|------|\n")
    for cid in CURVES:
        row = d1[cid]["no_protect"]
        lines.append(f"| {cid}({CURVE_NAMES[cid]}) | {row['+2']:.1f} | {row['+7']:.1f} | {row['+8']:.1f} | {row['+11']:.1f} | {row['+12']:.1f} | {row['+16']:.1f} |\n")

    lines.append("\n### 불굴의 대장장이 보호율별 E_farm(+12)\n")
    lines.append("| 곡선 | p20 | p25 | p30 | p35 | p40 |\n")
    lines.append("|------|-----|-----|-----|-----|-----|\n")
    for cid in CURVES:
        vals = [d1[cid]["indom"].get(f"p{int(p*100)}", {}).get("+12", "?") for p in PROTECT_INDOM_RANGE]
        lines.append(f"| {cid} | " + " | ".join(str(v) for v in vals) + " |\n")

    lines.append("\n### 검성의 대장장이 보호율별 E_farm(+16)\n")
    lines.append("| 곡선 | p50 | p55 | p60 |\n")
    lines.append("|------|-----|-----|-----|\n")
    for cid in CURVES:
        vals = [d1[cid]["saint"].get(f"p{int(p*100)}", {}).get("+16", "?") for p in PROTECT_SAINT_RANGE]
        lines.append(f"| {cid} | " + " | ".join(str(v) for v in vals) + " |\n")

    lines.append("\n## D-2: 건너뛰기 절약 효과\n\n")
    for cid in CURVES:
        lines.append(f"### {cid} ({CURVE_NAMES[cid]})\n")
        lines.append("| 칭호 | 건너뛰기 대상 | 기대클릭(풀) | 기대클릭(건너뛰기 후) | 절약 클릭 | 절약률 |\n")
        lines.append("|------|------------|------------|------------------|---------|------|\n")
        for title_id, sc in d2[cid]["scenarios"].items():
            lines.append(f"| {title_id} | +{sc['skip_to']} | {sc['e_full']:.1f} | {sc['e_after_skip']:.1f} | {sc['saved_clicks']:.1f} | {sc['saved_pct']:.1f}% |\n")
        lines.append("\n")

    lines.append("## D-3: 조각 공급량 vs 건너뛰기 가능 횟수\n\n")
    lines.append("### Sim-A 기준 평균 조각 보유량\n")
    for k, v in sorted(d3["frag_supply_mean"].items(), key=lambda x: -x[1]):
        lines.append(f"- {k}: {v:.2f}개\n")
    lines.append("\n### 건너뛰기 가능 횟수\n")
    for lv, info in d3["skip_affordability"].items():
        if info.get("times") == "unlimited":
            lines.append(f"- {lv}: 무료 (전설의 대장장이)\n")
        else:
            lines.append(f"- {lv}: 약 {info['times_possible']:.1f}회 가능\n")

    if "D4_mat_preserve" in results and "note" not in results["D4_mat_preserve"]:
        lines.append("\n## D-4: 재련의 정점 재료 보존 효과\n\n")
        lines.append("| 시나리오 | 현행 재료 비용(clicks) | 보존 시 절약 | 절약률 |\n")
        lines.append("|---------|-------------------|-----------|------|\n")
        for key, info in list(results["D4_mat_preserve"].items())[:10]:
            lines.append(f"| {key} | {info['total_mat_effort_current']:.0f} | {info['mat_effort_saved_if_preserve']:.0f} | {info['save_pct']:.1f}% |\n")

    with open("sim_d_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("SIMD_DONE", file=sys.stderr)
    print("Sim-D 완료: sim_d_results.json, sim_d_report.md")
    return results

if __name__ == "__main__":
    run_sim_d()
