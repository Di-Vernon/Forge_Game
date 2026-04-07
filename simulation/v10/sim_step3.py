#!/usr/bin/env python3
"""
sim_step3.py — v10 Step 3: Sim-B2 (건너뛰기 ON) + Sim-C (+25 달성) + 종합 보고서
Phase A = 0.42h 고정값 사용
"""
import json, sys, os
import numpy as np
import hashlib

os.chdir("C:/Users/PC/project/Forge_Game/simulation/v10")

# =====================================================================
# Constants
# =====================================================================
PHASE_A_HOURS = 0.42
N_USERS_B2 = 5000
N_USERS_C = 5000
MAX_CLICKS_B2 = 300_000
MAX_CLICKS_C = 500_000
CLICKS_PER_HOUR = 1200
FRAG_DROP_SAINT = 0.50

# =====================================================================
# Game Data
# =====================================================================
PROB_COMMON = {1:0.95, 2:0.93, 3:0.90, 4:0.87, 5:0.83, 6:0.78, 7:0.73}

CURVES = {
    "C1": {"name":"깊은골짜기","probs":{8:0.73,9:0.67,10:0.60,11:0.53,12:0.46,13:0.40,14:0.65,15:0.58,16:0.52,17:0.42,18:0.38,19:0.35,20:0.35,21:0.35,22:0.42,23:0.50,24:0.57,25:0.63}},
    "C3": {"name":"극적반전","probs":{8:0.73,9:0.67,10:0.60,11:0.53,12:0.45,13:0.38,14:0.70,15:0.65,16:0.58,17:0.48,18:0.43,19:0.40,20:0.38,21:0.38,22:0.45,23:0.52,24:0.60,25:0.65}},
    "C6": {"name":"후반관대","probs":{8:0.75,9:0.70,10:0.65,11:0.58,12:0.50,13:0.43,14:0.65,15:0.60,16:0.55,17:0.45,18:0.40,19:0.37,20:0.35,21:0.35,22:0.48,23:0.58,24:0.65,25:0.72}},
}

COST = {1:5,2:10,3:15,4:22,5:32,6:48,7:72,8:108,9:160,10:235,11:340,12:480,
        13:680,14:960,15:1350,16:1900,17:2700,18:3800,19:5300,20:7400,
        21:10400,22:14500,23:20000,24:28000,25:0}

SELL = {0:2,1:15,2:38,3:78,4:155,5:300,6:550,7:950,8:1600,9:2700,
        10:4500,11:10000,12:28000,13:75000,14:200000,15:550000,16:2500000,
        17:5000000,18:10000000,19:20000000,20:40000000,
        21:80000000,22:160000000,23:300000000,24:600000000,25:0}

MATERIAL_REQ = {
    17:[(12,1)], 18:[(12,1)], 19:[(12,2)],
    20:[(16,1)], 21:[(11,1)], 22:[(16,1)],
    23:[(2,1)],  24:[(16,1)], 25:[(16,2),(12,1)],
}

DROP_BASE_CHANCE = {
    2:0.25,3:0.25,4:0.25,5:0.28,6:0.30,7:0.30,8:0.35,9:0.35,
    10:0.38,11:0.40,12:0.40,13:0.45,14:0.45,15:0.50,16:0.50,
    17:0.60,18:0.60,19:0.65,20:0.65,21:0.65,22:0.70,23:0.70,24:0.75,
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

INITIAL_STATE_B = {
    "gold": 24000,
    "fragments": {
        "녹슨철조각":43,"마력부여철조각":18,"정제된철조각":6,
        "광물파편":5,"달빛조각":1,"사령조각":2,
        "검성의파편":0,"뒤틀린마력파편":0,
    }
}

SELECTED_COMBOS = [
    {"curve":"C1","protect_indom":0.30},
    {"curve":"C1","protect_indom":0.35},
    {"curve":"C3","protect_indom":0.25},
    {"curve":"C3","protect_indom":0.30},
    {"curve":"C6","protect_indom":0.25},
    {"curve":"C6","protect_indom":0.30},
]

SKIP_COST_SETS = {
    "low":  {5:{"gold":500,"녹슨철조각":1},7:{"gold":2000,"녹슨철조각":1},8:{"gold":4000,"마력부여철조각":1},12:{"gold":20000,"마력부여철조각":1}},
    "mid":  {5:{"gold":1000,"녹슨철조각":1},7:{"gold":4000,"녹슨철조각":1},8:{"gold":8000,"마력부여철조각":1},12:{"gold":50000,"마력부여철조각":1}},
    "high": {5:{"gold":2000,"녹슨철조각":1},7:{"gold":8000,"녹슨철조각":1},8:{"gold":15000,"마력부여철조각":1},12:{"gold":100000,"마력부여철조각":1}},
}

PROTECT_SAINT_RANGE = [0.50, 0.55, 0.60]

# =====================================================================
# Helpers
# =====================================================================

def get_prob(curve_probs, target):
    return PROB_COMMON.get(target, curve_probs.get(target, 0))

def roll_fragment(level, rng):
    if level < 2 or level > 24:
        return {}
    base = DROP_BASE_CHANCE.get(level, 0)
    if rng.random() >= base:
        return {}
    table = DROP_TABLE.get(level, {})
    if not table:
        return {}
    names, weights = list(table.keys()), list(table.values())
    total = sum(weights)
    r = rng.random() * total
    cum = 0
    chosen = names[-1]
    for n, w in zip(names, weights):
        cum += w
        if r < cum:
            chosen = n
            break
    return {chosen: 1}

def can_afford_skip(gold, fragments, skip_cost):
    if gold < skip_cost["gold"]:
        return False
    for k, v in skip_cost.items():
        if k == "gold":
            continue
        if fragments.get(k, 0) < v:
            return False
    return True

def apply_skip(gold, fragments, skip_cost):
    gold -= skip_cost["gold"]
    for k, v in skip_cost.items():
        if k != "gold":
            fragments[k] = fragments.get(k, 0) - v
    return gold, fragments

def get_seed(*args):
    key = "_".join(str(a) for a in args)
    return int(hashlib.md5(key.encode()).hexdigest()[:8], 16)

def pct(arr, p):
    return float(np.percentile(arr, p))

def compute_e_farm_analytical(curve_probs, protect, target_level):
    """Backward induction: E[clicks from 0 → target_level] with protection."""
    probs = []
    for lv in range(1, target_level + 1):
        if lv <= 7:
            probs.append(PROB_COMMON[lv])
        else:
            probs.append(curve_probs.get(lv, 0))

    # E[i] = A[i]*E[0] + B[i]
    A = [0.0] * (target_level + 1)
    B = [0.0] * (target_level + 1)
    for i in range(target_level - 1, -1, -1):
        p = probs[i]
        fp = 1.0 - p
        d = 1.0 - fp * protect
        A[i] = (fp * (1.0 - protect) + p * A[i + 1]) / d
        B[i] = (1.0 + p * B[i + 1]) / d
    return B[0] / (1.0 - A[0])

def get_e_farm_indom(curve_name, protect_indom, target_level, sim_d):
    pk = f"p{int(protect_indom*100)}"
    lk = f"+{target_level}"
    try:
        return float(sim_d["D1"][curve_name]["indom"][pk][lk])
    except (KeyError, TypeError):
        return compute_e_farm_analytical(CURVES[curve_name]["probs"], protect_indom, target_level)

def get_e_farm_saint(curve_name, protect_saint, target_level, sim_d):
    pk = f"p{int(protect_saint*100)}"
    lk = f"+{target_level}"
    try:
        return float(sim_d["D1"][curve_name]["saint"][pk][lk])
    except (KeyError, TypeError):
        return compute_e_farm_analytical(CURVES[curve_name]["probs"], protect_saint, target_level)

# =====================================================================
# Sim-B2
# =====================================================================

def sim_b2_one(curve_probs, protect_indom, e_farm_12, skip_costs, initial_state, rng):
    gold = initial_state["gold"]
    frags = dict(initial_state["fragments"])
    clicks = 0
    level = 0
    max_level = 0
    destructions = 0
    skips_round = 0   # per-round skip counter
    skips_total = 0
    baekya = False

    while not baekya and clicks < MAX_CLICKS_B2:
        # +7 건너뛰기 (불굴 칭호, 라운드당 1회)
        if level == 0 and skips_round == 0:
            sc = skip_costs.get(7)
            if sc and can_afford_skip(gold, frags, sc):
                gold, frags = apply_skip(gold, frags, sc)
                level = 7
                skips_round = 1
                skips_total += 1

        target = level + 1
        if target > 17:
            break

        # +17 시도: 재료(엑스칼리버 +12) 파밍 비용
        if target == 17:
            clicks += int(e_farm_12)
            if clicks >= MAX_CLICKS_B2:
                break

        cost = COST[target]
        if gold < cost:
            if level > 0:
                gold += SELL[level]
                level = 0
                skips_round = 0
            else:
                break  # 파산
            continue

        gold -= cost
        clicks += 1

        p = get_prob(curve_probs, target)
        if rng.random() < p:
            level = target
            max_level = max(max_level, level)
            if target == 17:
                baekya = True
        else:
            if rng.random() < protect_indom:
                pass  # 보호: 레벨 유지
            else:
                # 파괴
                drop = roll_fragment(level, rng)
                for k, v in drop.items():
                    frags[k] = frags.get(k, 0) + v
                destructions += 1
                level = 0
                skips_round = 0

    return {
        "clicks": clicks,
        "hours": clicks / CLICKS_PER_HOUR,
        "completed": baekya,
        "max_level": max_level,
        "destructions": destructions,
        "skips_used": skips_total,
        "gold": gold,
        "fragments": frags,
        "hit_max": clicks >= MAX_CLICKS_B2,
    }

def run_sim_b2(sim_d, b1_scenarios):
    print("[Sim-B2] 시작...", file=sys.stderr)
    results = {}

    for combo in SELECTED_COMBOS:
        curve = combo["curve"]
        prot = combo["protect_indom"]
        pk = f"p{int(prot*100)}"
        cprobs = CURVES[curve]["probs"]
        e12 = get_e_farm_indom(curve, prot, 12, sim_d)
        b1_p50 = b1_scenarios.get(f"{curve}_{pk}", {}).get("hours", {}).get("p50")

        for cs_name, skip_costs in SKIP_COST_SETS.items():
            key = f"{curve}_{pk}_{cs_name}"
            seed = get_seed(curve, pk, cs_name, "simB2v10")
            rng = np.random.default_rng(seed)

            hours_l, gold_l = [], []
            frags_done = {}   # sum of frags from COMPLETED users
            destr_l, skips_l = [], []
            completed = 0
            hit_max = 0
            gold_done = []    # gold from completed users

            for i in range(N_USERS_B2):
                if i % 1000 == 0:
                    print(f"[Sim-B2][{key}] {i}/{N_USERS_B2}", file=sys.stderr)
                init = {
                    "gold": INITIAL_STATE_B["gold"],
                    "fragments": dict(INITIAL_STATE_B["fragments"]),
                }
                r = sim_b2_one(cprobs, prot, e12, skip_costs, init, rng)
                hours_l.append(r["hours"])
                gold_l.append(r["gold"])
                destr_l.append(r["destructions"])
                skips_l.append(r["skips_used"])
                if r["completed"]:
                    completed += 1
                    gold_done.append(r["gold"])
                    for k, v in r["fragments"].items():
                        frags_done[k] = frags_done.get(k, 0) + v
                if r["hit_max"]:
                    hit_max += 1

            n_done = max(completed, 1)
            frag_mean_done = {k: round(v/n_done, 2) for k, v in frags_done.items()}
            gold_p50_done = pct(gold_done, 50) if gold_done else pct(gold_l, 50)

            reduction = None
            if b1_p50 and b1_p50 > 0:
                b2_p50 = pct(hours_l, 50)
                reduction = round((1 - b2_p50 / b1_p50) * 100, 1)

            scen = {
                "curve": curve,
                "curve_name": CURVES[curve]["name"],
                "protect_indom": prot,
                "cost_set": cs_name,
                "e_farm_12": e12,
                "n_users": N_USERS_B2,
                "hours": {
                    "mean": float(np.mean(hours_l)),
                    "p50": pct(hours_l, 50),
                    "p75": pct(hours_l, 75),
                    "p90": pct(hours_l, 90),
                },
                "completion_rate": completed / N_USERS_B2,
                "skips_mean": float(np.mean(skips_l)),
                "destructions_mean": float(np.mean(destr_l)),
                "b1_hours_p50": b1_p50,
                "reduction_pct": reduction,
                "gold_end_p50": gold_p50_done,
                "fragments_end_mean": frag_mean_done,
                "hit_max_pct": hit_max / N_USERS_B2 * 100,
            }
            results[key] = scen
            print(f"  [{key}] p50={scen['hours']['p50']:.2f}h cr={scen['completion_rate']:.1%} "
                  f"skip={scen['skips_mean']:.1f} red={reduction}%", file=sys.stderr)

    output = {
        "sim": "B2_v10",
        "description": "건너뛰기 ON, 불굴 보호, +17 백야 목표",
        "initial_state": INITIAL_STATE_B,
        "scenarios": results,
    }
    with open("sim_b2_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("[Sim-B2] sim_b2_results.json 저장 완료", file=sys.stderr)

    _write_b2_report(results, b1_scenarios)
    return output

def _write_b2_report(results, b1_scenarios):
    lines = []
    lines.append("# Sim-B2 v10 보고서: 건너뛰기 ON (불굴 보호)\n\n")
    lines.append("**목적**: 건너뛰기 비용이 Phase B 시간에 미치는 영향 측정\n\n")
    lines.append(f"**Phase A 기준**: {PHASE_A_HOURS}h (25분, ambitious)\n\n")

    # 결과 매트릭스
    lines.append("## 결과 매트릭스 (Phase B p50 / 완료율 / 건너뛰기 평균)\n\n")
    lines.append("| 곡선/보호율 | low | mid | high |\n")
    lines.append("|------------|-----|-----|------|\n")
    for combo in SELECTED_COMBOS:
        c, pk = combo["curve"], f"p{int(combo['protect_indom']*100)}"
        row = []
        for cs in ["low","mid","high"]:
            s = results[f"{c}_{pk}_{cs}"]
            h = s["hours"]["p50"]
            cr = s["completion_rate"]
            sk = s["skips_mean"]
            flag = "✅" if 1.0<=h<=2.0 else ("⚠️" if h<1.0 else "❌")
            row.append(f"{h:.2f}h/{cr:.0%}/↑{sk:.1f}{flag}")
        lines.append(f"| {c}({CURVES[c]['name']})/{pk} | " + " | ".join(row) + " |\n")

    # B1→B2 절감
    lines.append("\n## B1→B2 시간 절감 (p50)\n\n")
    lines.append("| 곡선/보호율 | B1(OFF) | B2-low | B2-mid | B2-high |\n")
    lines.append("|------------|---------|--------|--------|--------|\n")
    for combo in SELECTED_COMBOS:
        c, pk = combo["curve"], f"p{int(combo['protect_indom']*100)}"
        b1_h = b1_scenarios.get(f"{c}_{pk}", {}).get("hours", {}).get("p50", 0)
        row = [f"{b1_h:.2f}h"]
        for cs in ["low","mid","high"]:
            s = results[f"{c}_{pk}_{cs}"]
            h = s["hours"]["p50"]
            rd = s.get("reduction_pct") or 0
            row.append(f"{h:.2f}h(-{rd:.0f}%)")
        lines.append(f"| {c}({CURVES[c]['name']})/{pk} | " + " | ".join(row) + " |\n")

    # A+B 합산
    lines.append("\n## Phase A+B 합산 (p50)\n\n")
    lines.append("| 곡선/보호율 | low | mid | high |\n")
    lines.append("|------------|-----|-----|------|\n")
    for combo in SELECTED_COMBOS:
        c, pk = combo["curve"], f"p{int(combo['protect_indom']*100)}"
        row = []
        for cs in ["low","mid","high"]:
            s = results[f"{c}_{pk}_{cs}"]
            ab = PHASE_A_HOURS + s["hours"]["p50"]
            flag = "✅" if 0.8<=ab<=3.0 else "⚠️"
            row.append(f"{ab:.2f}h{flag}")
        lines.append(f"| {c}({CURVES[c]['name']})/{pk} | " + " | ".join(row) + " |\n")

    # Top 5
    lines.append("\n## Top 5 조합\n\n")
    scored = []
    for s in results.values():
        h = s["hours"]["p50"]
        cr = s["completion_rate"]
        rd = s.get("reduction_pct") or 0
        score = (max(0, 1-abs(h-1.5)/1.5)*50 + min(cr,0.95)/0.95*35 + min(rd/30,1)*15)
        scored.append({**s, "score": round(score,1), "phase_ab": PHASE_A_HOURS+h})
    scored.sort(key=lambda x: -x["score"])

    lines.append("| 순위 | 곡선 | 보호율 | 비용 | Phase B p50 | A+B | 완료율 | 절감 | 건너뛰기↑ | 점수 |\n")
    lines.append("|------|------|--------|------|------------|-----|--------|------|------------|------|\n")
    for i, s in enumerate(scored[:5], 1):
        bh = s["hours"]["p50"]
        b_ok = "✅" if 1.0<=bh<=2.0 else "⚠️"
        ab = s["phase_ab"]
        ab_ok = "✅" if 0.8<=ab<=3.5 else "⚠️"
        lines.append(f"| {i} | {s['curve']}({s['curve_name']}) | {s['protect_indom']:.0%} | {s['cost_set']} "
                     f"| {bh:.2f}h{b_ok} | {ab:.2f}h{ab_ok} | {s['completion_rate']:.1%} "
                     f"| {s.get('reduction_pct',0):.0f}% | {s['skips_mean']:.1f}회 | {s['score']} |\n")

    # 기준
    ok = sum(1 for s in results.values() if 1.0<=s["hours"]["p50"]<=2.0 and s["completion_rate"]>=0.90)
    lines.append("\n## 성공 기준\n\n")
    lines.append(f"- Phase B 1~2h + 완료율 90%+: **{ok}개 조합**\n")
    lines.append(("✅" if ok>=3 else "⚠️") + f" {'달성' if ok>=3 else '미달'}\n")

    with open("sim_b2_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("[Sim-B2] sim_b2_report.md 저장 완료", file=sys.stderr)

# =====================================================================
# Sim-C
# =====================================================================

def sim_c_one(curve_probs, curve_name, protect_saint, skip_costs, initial_state, rng, sim_d):
    gold = initial_state["gold"]
    frags = dict(initial_state["fragments"])
    clicks = 0
    level = 0
    visits = [0] * 26
    destructions = 0
    skips_total = 0
    saint_earned = 0

    while level < 25 and clicks < MAX_CLICKS_C:
        # +8 건너뛰기 (검성 칭호, level==0일 때마다 시도)
        if level == 0:
            sc = skip_costs.get(8)
            if sc and can_afford_skip(gold, frags, sc):
                gold, frags = apply_skip(gold, frags, sc)
                level = 8
                skips_total += 1

        visits[level] += 1
        target = level + 1

        # 재료 처리 (+17 이상)
        if target >= 17 and target in MATERIAL_REQ:
            for (req_lv, req_cnt) in MATERIAL_REQ[target]:
                for _ in range(req_cnt):
                    if req_lv == 2:
                        clicks += 3
                    elif req_lv == 11:
                        # 무형검: 검성의파편 조합 or 파밍
                        if frags.get("검성의파편", 0) >= 1:
                            frags["검성의파편"] -= 1
                        else:
                            e11 = get_e_farm_saint(curve_name, protect_saint, 11, sim_d)
                            clicks += int(e11)
                    elif req_lv == 12:
                        # 엑스칼리버: +12 건너뛰기 or 파밍
                        sc12 = skip_costs.get(12)
                        if sc12 and can_afford_skip(gold, frags, sc12):
                            gold, frags = apply_skip(gold, frags, sc12)
                        else:
                            e12 = get_e_farm_saint(curve_name, protect_saint, 12, sim_d)
                            clicks += int(e12)
                    else:
                        # +16 파밍
                        e16 = get_e_farm_saint(curve_name, protect_saint, req_lv, sim_d)
                        clicks += int(e16)

        cost = COST.get(target, 0)
        if gold < cost:
            if level > 0:
                gold += SELL[level]
                level = 0
            else:
                break  # 파산
            continue

        gold -= cost
        clicks += 1

        p = get_prob(curve_probs, target)
        if rng.random() < p:
            level = target
        else:
            if rng.random() < protect_saint:
                pass  # 보호: 레벨 유지
            else:
                # 파괴
                if rng.random() < FRAG_DROP_SAINT:
                    frags["검성의파편"] = frags.get("검성의파편", 0) + 1
                    saint_earned += 1
                drop = roll_fragment(level, rng)
                for k, v in drop.items():
                    frags[k] = frags.get(k, 0) + v
                destructions += 1
                level = 0

    return {
        "clicks": clicks,
        "hours": clicks / CLICKS_PER_HOUR,
        "success": level >= 25,
        "visits": visits,
        "destructions": destructions,
        "skips_used": skips_total,
        "saint_frags_earned": saint_earned,
        "gold": gold,
        "fragments": frags,
        "hit_max": clicks >= MAX_CLICKS_C,
    }

def select_top3_from_b2(b2_results):
    """비용세트별 최고 점수 1개씩 선발 → 총 3개"""
    best = {}
    for key, s in b2_results["scenarios"].items():
        cs = s["cost_set"]
        h = s["hours"]["p50"]
        cr = s["completion_rate"]
        rd = s.get("reduction_pct") or 0
        score = max(0,1-abs(h-1.5)/1.5)*50 + min(cr,0.95)/0.95*40 + min(rd/30,1)*10
        if cs not in best or score > best[cs]["_score"]:
            best[cs] = {**s, "_key": key, "_score": score}
    return list(best.values())

def run_sim_c(b2_results, sim_d):
    print("[Sim-C] 시작...", file=sys.stderr)
    top3 = select_top3_from_b2(b2_results)
    print("[Sim-C] Top 3 선정:", file=sys.stderr)
    for t in top3:
        print(f"  {t['_key']}: B2 p50={t['hours']['p50']:.2f}h cr={t['completion_rate']:.1%}", file=sys.stderr)

    results = {}

    for b2s in top3:
        curve = b2s["curve"]
        prot_indom = b2s["protect_indom"]
        cs_name = b2s["cost_set"]
        skip_costs = SKIP_COST_SETS[cs_name]
        cprobs = CURVES[curve]["probs"]

        # Sim-C 초기 상태: B2 완료자 p50 종료 상태
        c_init = {
            "gold": b2s["gold_end_p50"],
            "fragments": {k: max(0.0, v) for k, v in b2s["fragments_end_mean"].items()},
        }

        for prot_saint in PROTECT_SAINT_RANGE:
            psi = f"p{int(prot_indom*100)}"
            pss = f"p{int(prot_saint*100)}"
            key = f"{curve}_{psi}_{cs_name}_{pss}"

            seed = get_seed(curve, psi, cs_name, pss, "simCv10")
            rng = np.random.default_rng(seed)

            hours_l, destr_l, skips_l, saint_l = [], [], [], []
            success = 0
            hit_max = 0
            visits_agg = [0] * 26

            for i in range(N_USERS_C):
                if i % 1000 == 0:
                    print(f"[Sim-C][{key}] {i}/{N_USERS_C}", file=sys.stderr)
                init = {
                    "gold": c_init["gold"],
                    "fragments": dict(c_init["fragments"]),
                }
                r = sim_c_one(cprobs, curve, prot_saint, skip_costs, init, rng, sim_d)
                hours_l.append(r["hours"])
                destr_l.append(r["destructions"])
                skips_l.append(r["skips_used"])
                saint_l.append(r["saint_frags_earned"])
                if r["success"]:
                    success += 1
                if r["hit_max"]:
                    hit_max += 1
                for lv in range(26):
                    visits_agg[lv] += r["visits"][lv]

            visits_mean = [round(v/N_USERS_C, 2) for v in visits_agg]
            scen = {
                "curve": curve,
                "curve_name": CURVES[curve]["name"],
                "protect_indom": prot_indom,
                "cost_set": cs_name,
                "protect_saint": prot_saint,
                "n_users": N_USERS_C,
                "hours": {
                    "mean": float(np.mean(hours_l)),
                    "p50": pct(hours_l, 50),
                    "p75": pct(hours_l, 75),
                    "p90": pct(hours_l, 90),
                },
                "success_rate": success / N_USERS_C,
                "destructions_mean": float(np.mean(destr_l)),
                "skips_mean": float(np.mean(skips_l)),
                "saint_frags_mean": float(np.mean(saint_l)),
                "visits_mean": visits_mean,
                "hit_max_pct": hit_max / N_USERS_C * 100,
                "b2_hours_p50": b2s["hours"]["p50"],
                "b2_key": b2s["_key"],
                "c_initial": c_init,
            }
            results[key] = scen
            print(f"  [{key}] C p50={scen['hours']['p50']:.2f}h "
                  f"success={scen['success_rate']:.1%} "
                  f"total={PHASE_A_HOURS+b2s['hours']['p50']+scen['hours']['p50']:.2f}h",
                  file=sys.stderr)

    output = {
        "sim": "C_v10",
        "description": "+25 여명 달성 (검성 보호, 건너뛰기 ON)",
        "top3_b2_keys": [t["_key"] for t in top3],
        "scenarios": results,
    }
    with open("sim_c_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print("[Sim-C] sim_c_results.json 저장 완료", file=sys.stderr)

    _write_c_report(results)
    return output

def _write_c_report(results):
    lines = []
    lines.append("# Sim-C v10 보고서: +25 여명 달성 (검성 보호)\n\n")
    lines.append(f"- Phase A 고정: **{PHASE_A_HOURS}h**\n")
    lines.append("- 검성 보호율 × 3종 탐색\n\n")

    lines.append("## 전 시나리오 결과\n\n")
    lines.append("| 시나리오 | Phase B | Phase C p50 | p90 | 총계 | 달성률 | 파괴 | 건너뛰기 |\n")
    lines.append("|----------|---------|------------|-----|------|--------|------|----------|\n")

    scored = []
    for key, s in sorted(results.items()):
        b_h = s["b2_hours_p50"]
        c_h = s["hours"]["p50"]
        total = PHASE_A_HOURS + b_h + c_h
        sr = s["success_rate"]
        sc = _total_score(PHASE_A_HOURS, b_h, c_h, sr, s["hours"]["p90"], c_h)
        t_ok = "✅" if 5.0<=total<=7.0 else ("⚠️" if total<=8.5 else "❌")
        sr_ok = "✅" if sr>=0.95 else ("⚠️" if sr>=0.80 else "❌")
        lines.append(f"| {key} | {b_h:.2f}h | {c_h:.2f}h | {s['hours']['p90']:.2f}h "
                     f"| {total:.2f}h{t_ok} | {sr:.1%}{sr_ok} "
                     f"| {s['destructions_mean']:.0f}회 | {s['skips_mean']:.0f}회 |\n")
        scored.append({**s, "key": key, "score": sc, "total": total, "b_h": b_h, "c_h": c_h})

    scored.sort(key=lambda x: -x["score"])

    # Top 5 상세
    lines.append("\n## Top 5 시나리오 상세\n\n")
    lines.append("| 순위 | 시나리오 | 총계 | A% | B% | C% | 달성률 | 점수 |\n")
    lines.append("|------|----------|------|-----|-----|-----|--------|------|\n")
    for i, s in enumerate(scored[:5], 1):
        total = s["total"]
        a_pct = PHASE_A_HOURS/total*100
        b_pct = s["b_h"]/total*100
        c_pct = s["c_h"]/total*100
        mot_ok = "✅" if (0.05<=a_pct/100<=0.15 and 0.15<=b_pct/100<=0.40 and 0.45<=c_pct/100<=0.75) else "⚠️"
        lines.append(f"| {i} | {s['key']} | {total:.2f}h | {a_pct:.0f}%{mot_ok} "
                     f"| {b_pct:.0f}% | {c_pct:.0f}% | {s['success_rate']:.1%} | {s['score']:.1f} |\n")

    # 구간별 체류 (Top 1)
    if scored:
        top = scored[0]
        v = top["visits_mean"]
        tv = sum(v)
        if tv > 0:
            lines.append(f"\n## 구간별 체류 비율: {top['key']}\n\n")
            segs = [
                ("Block 1 (+0~+7)", sum(v[0:8])/tv),
                ("Block 2 (+8~+12)", sum(v[8:13])/tv),
                ("Block 3 (+13~+17)", sum(v[13:18])/tv),
                ("Block 4 (+18~+22)", sum(v[18:23])/tv),
                ("Block 5~6 (+23~+25)", sum(v[23:])/tv),
            ]
            for seg, ratio in segs:
                lines.append(f"- {seg}: {ratio:.1%}\n")

    with open("sim_c_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("[Sim-C] sim_c_report.md 저장 완료", file=sys.stderr)

# =====================================================================
# Total Score
# =====================================================================

def _total_score(pa, pb, pc, achieve_rate, p90, p50):
    total = pa + pb + pc
    score = 0.0

    # 1. 총 플레이타임 (35점) — 5~7h, 6h 최적
    if total <= 7.0:
        dev = abs(total - 6.0) / 6.0
        score += max(0.0, 1.0 - dev) * 35

    # 2. Phase 비율 (25점) — A:5-15%, B:15-40%, C:45-75%
    if total > 0:
        ar, br, cr = pa/total, pb/total, pc/total
        if 0.05<=ar<=0.15 and 0.15<=br<=0.40 and 0.45<=cr<=0.75:
            score += 25
        elif 0.03<=ar<=0.20 and 0.10<=br<=0.45:
            score += 15
        else:
            score += 5

    # 3. 달성률 (15점)
    score += min(achieve_rate/0.95, 1.0) * 15

    # 4. 분산 (15점) — p90/p50 = 1.4~2.5
    if p50 > 0:
        var = p90 / p50
        if 1.4<=var<=2.5:
            score += 15
        elif 1.2<=var<=3.0:
            score += 8

    # 5. 초반 체감 (10점)
    if pa >= 0.3:
        score += 10
    elif pa >= 0.15:
        score += 5

    return round(score, 1)

# =====================================================================
# Final Report
# =====================================================================

def generate_final_report(b2_results, c_results):
    print("[Final] 종합 보고서 생성...", file=sys.stderr)

    all_scored = []
    for key, cs in c_results["scenarios"].items():
        b_h = cs["b2_hours_p50"]
        c_h = cs["hours"]["p50"]
        total = PHASE_A_HOURS + b_h + c_h
        sr = cs["success_rate"]
        sc = _total_score(PHASE_A_HOURS, b_h, c_h, sr, cs["hours"]["p90"], c_h)
        all_scored.append({**cs, "key": key, "score": sc, "total": total, "b_h": b_h, "c_h": c_h})
    all_scored.sort(key=lambda x: -x["score"])

    lines = []
    lines.append("# v10 종합 보고서: 최종 밸런스 판정\n\n")
    lines.append(f"- **Phase A 고정**: {PHASE_A_HOURS}h (25분, ambitious 기준)\n")
    lines.append("- **Phase B**: Sim-B2 (건너뛰기 ON, 불굴 보호)\n")
    lines.append("- **Phase C**: Sim-C (검성 보호, +25 목표)\n")
    lines.append("- **목표**: 총 5~7h (최적 6h), +25 달성률 95%+\n\n")

    # 1. 전 시나리오 결과표
    lines.append("## 1. 전 시나리오 결과표\n\n")
    lines.append("| 시나리오 | A | B | C | 총계 | 달성률 | 점수 |\n")
    lines.append("|----------|---|---|---|------|--------|------|\n")
    for s in sorted(all_scored, key=lambda x: x["key"]):
        total = s["total"]
        t_ok = "✅" if 5.0<=total<=7.0 else ("⚠️" if total<=8.5 else "❌")
        sr_ok = "✅" if s["success_rate"]>=0.95 else "⚠️"
        lines.append(f"| {s['key']} | {PHASE_A_HOURS:.2f}h | {s['b_h']:.2f}h | {s['c_h']:.2f}h "
                     f"| {total:.2f}h{t_ok} | {s['success_rate']:.1%}{sr_ok} | {s['score']:.1f} |\n")

    # 2. Top 5 상세
    lines.append("\n## 2. Top 5 시나리오 상세\n\n")
    for rank, s in enumerate(all_scored[:5], 1):
        total = s["total"]
        a_p = PHASE_A_HOURS/total*100
        b_p = s["b_h"]/total*100
        c_p = s["c_h"]/total*100
        mot = "✅" if (0.05<=a_p/100<=0.15 and 0.15<=b_p/100<=0.40 and 0.45<=c_p/100<=0.75) else "⚠️"
        t_ok = "✅" if 5.0<=total<=7.0 else "⚠️"
        lines.append(f"### #{rank}: {s['key']} (점수 {s['score']:.1f})\n\n")
        lines.append(f"- 총 플레이타임: **{total:.2f}h** {t_ok}\n")
        lines.append(f"- Phase 비율: A={a_p:.0f}% / B={b_p:.0f}% / C={c_p:.0f}% {mot}\n")
        lines.append(f"  - A={PHASE_A_HOURS:.2f}h (운게임) | B={s['b_h']:.2f}h (전략) | C={s['c_h']:.2f}h (스토리)\n")
        lines.append(f"- +25 달성률: **{s['success_rate']:.1%}**\n")
        lines.append(f"- Phase C p90: {s['hours']['p90']:.2f}h (분산비: {s['hours']['p90']/max(s['hours']['p50'],0.01):.2f}x)\n")
        lines.append(f"- 파괴: {s['destructions_mean']:.0f}회 / 검성 건너뛰기: {s['skips_mean']:.0f}회\n\n")

    # 3. Phase 비율 도표
    lines.append("## 3. Phase 비율 도표 (모토 부합도)\n\n")
    lines.append("게임 모토: **초반 운게임(A:5-15%) → 중반 전략(B:15-40%) → 후반 스토리(C:45-75%)**\n\n")
    lines.append("| 순위 | 시나리오 | 총계 | A(운) | B(전략) | C(스토리) | 부합 |\n")
    lines.append("|------|----------|------|-------|---------|-----------|------|\n")
    for i, s in enumerate(all_scored[:9], 1):
        total = s["total"]
        ar, br, cr2 = PHASE_A_HOURS/total, s["b_h"]/total, s["c_h"]/total
        mot = "✅" if (0.05<=ar<=0.15 and 0.15<=br<=0.40 and 0.45<=cr2<=0.75) else "⚠️"
        lines.append(f"| {i} | {s['key']} | {total:.2f}h | {ar:.0%} | {br:.0%} | {cr2:.0%} | {mot} |\n")

    # 4. 최적 config.json
    if all_scored:
        best = all_scored[0]
        lines.append("\n## 4. 최적 config.json\n\n```json\n")
        probs_out = {}
        for i in range(1, 8):
            probs_out[f"+{i-1}→+{i}"] = PROB_COMMON[i]
        for k, v in sorted(CURVES[best["curve"]]["probs"].items()):
            if k < 25:
                probs_out[f"+{k-1}→+{k}"] = v
        config = {
            "version": "v10",
            "probability_curve": best["curve"],
            "probabilities": probs_out,
            "protection": {
                "indomitable": best["protect_indom"],
                "sword_saint": best["protect_saint"],
                "sword_saint_frag_drop_rate": FRAG_DROP_SAINT,
            },
            "skip_costs": {f"+{k}": v for k, v in SKIP_COST_SETS[best["cost_set"]].items()},
            "balance_targets": {
                "phase_a_minutes": 25,
                "phase_b_hours": "1~2h",
                "phase_c_hours": f"{best['c_h']:.1f}h (p50)",
                "total_hours": f"{best['total']:.1f}h",
                "achievement_rate_25": f"{best['success_rate']:.1%}",
            }
        }
        lines.append(json.dumps(config, ensure_ascii=False, indent=2))
        lines.append("\n```\n")

    # 5. 체감 분석
    lines.append("\n## 5. 체감 분석: +20 강화 10회 시도\n\n")
    if all_scored:
        best = all_scored[0]
        p20 = CURVES[best["curve"]]["probs"].get(20, 0.35)
        ps = best["protect_saint"]
        e_s = 10 * p20
        e_f = 10 * (1 - p20)
        e_p = e_f * ps
        e_d = e_f * (1 - ps)
        lines.append(f"설정: 곡선 {best['curve']}, 검성 보호율 {ps:.0%}\n\n")
        lines.append(f"| 결과 | 기댓값 | 설명 |\n")
        lines.append(f"|------|--------|------|\n")
        lines.append(f"| 성공 | {e_s:.1f}회 | +21 달성 |\n")
        lines.append(f"| 실패→보호 | {e_p:.1f}회 | 레벨 유지 |\n")
        lines.append(f"| 실패→파괴 | {e_d:.1f}회 | +0 리셋 |\n\n")
        lines.append(f"→ 10회 시도 중 평균 **{e_d:.1f}회** 파괴 (검성 파편 기대: {e_d*0.5:.1f}개)\n")

    # 6. 기준 달성 여부
    lines.append("\n## 6. 기준 달성 여부\n\n")
    ok_total = sum(1 for s in all_scored if 5.0<=s["total"]<=7.0)
    ok_achieve = sum(1 for s in all_scored if s["success_rate"]>=0.95)
    ok_score = sum(1 for s in all_scored if s["score"]>=70)
    lines.append(f"| 기준 | 달성 | 미달 |\n")
    lines.append(f"|------|------|------|\n")
    lines.append(f"| 총 5~7h | {ok_total}개 | {len(all_scored)-ok_total}개 |\n")
    lines.append(f"| 달성률 95%+ | {ok_achieve}개 | {len(all_scored)-ok_achieve}개 |\n")
    lines.append(f"| 점수 70+ | {ok_score}개 | {len(all_scored)-ok_score}개 |\n\n")

    if ok_score >= 3:
        lines.append("**✅ 성공 기준 달성 — 출시 권장 설정 확정**\n")
    elif ok_score >= 1:
        lines.append("**⚠️ 일부 기준 달성 — 추가 튜닝 권장**\n\n")
        lines.append("수정 제안:\n")
        if ok_total == 0:
            lines.append("- 총 시간 초과: 검성 보호율 0.60 시도, 또는 건너뛰기 비용 low 세트 적용\n")
        if ok_achieve == 0:
            lines.append("- 달성률 미달: Phase C 곡선의 +22~+25 확률 소폭 상향 (+3~5%p) 검토\n")
        lines.append("- Phase 비율: C 비율이 낮으면 Phase B 건너뛰기 비용 상향으로 B 단계 연장\n")
    else:
        lines.append("**❌ 기준 미달 — 확률 곡선 또는 보호율 전면 재검토 필요**\n")

    with open("final_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("[Final] final_report.md 저장 완료", file=sys.stderr)

    # final_balance.json
    best = all_scored[0] if all_scored else None
    if best:
        balance = {
            "version": "v10",
            "best_scenario": best["key"],
            "best_score": best["score"],
            "recommended": {
                "curve": best["curve"],
                "curve_name": best["curve_name"],
                "protect_indom": best["protect_indom"],
                "protect_saint": best["protect_saint"],
                "cost_set": best["cost_set"],
                "skip_costs": {str(k): v for k, v in SKIP_COST_SETS[best["cost_set"]].items()},
            },
            "results_p50": {
                "phase_a_hours": PHASE_A_HOURS,
                "phase_b_hours": best["b_h"],
                "phase_c_hours": best["c_h"],
                "total_hours": best["total"],
                "success_rate_25": best["success_rate"],
                "score": best["score"],
            },
            "all_scenarios": sorted(
                [{"key": s["key"], "score": s["score"], "total_h": round(s["total"],2),
                  "success_rate": s["success_rate"]} for s in all_scored],
                key=lambda x: -x["score"]
            ),
        }
        with open("final_balance.json", "w", encoding="utf-8") as f:
            json.dump(balance, f, ensure_ascii=False, indent=2)
        print("[Final] final_balance.json 저장 완료", file=sys.stderr)

        print("\n" + "="*60, file=sys.stderr)
        print("[DONE] Step 3 완료!", file=sys.stderr)
        print(f"최고 시나리오: {best['key']} (점수 {best['score']:.1f})", file=sys.stderr)
        print(f"총 플레이타임: {best['total']:.2f}h (A={PHASE_A_HOURS:.2f}h + B={best['b_h']:.2f}h + C={best['c_h']:.2f}h)", file=sys.stderr)
        print(f"+25 달성률: {best['success_rate']:.1%}", file=sys.stderr)
        print("="*60, file=sys.stderr)

# =====================================================================
# Main
# =====================================================================

if __name__ == "__main__":
    print("[Step 3] 사전 데이터 로드...", file=sys.stderr)
    with open("sim_d_results.json", "r", encoding="utf-8") as f:
        sim_d = json.load(f)
    with open("sim_b1_results.json", "r", encoding="utf-8") as f:
        b1_data = json.load(f)
    b1_scenarios = b1_data.get("scenarios", {})

    b2_results = run_sim_b2(sim_d, b1_scenarios)
    c_results  = run_sim_c(b2_results, sim_d)
    generate_final_report(b2_results, c_results)

    print("\n출력 파일:", file=sys.stderr)
    for fn in ["sim_b2_results.json","sim_b2_report.md",
               "sim_c_results.json","sim_c_report.md",
               "final_report.md","final_balance.json"]:
        exists = "✓" if os.path.exists(fn) else "✗"
        print(f"  {exists} {fn}", file=sys.stderr)
