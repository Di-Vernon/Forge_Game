"""
Sim-C: 강한 보호 시대 (검성 획득 → +25 여명 달성)
6곡선 × 3검성보호율 = 18 시나리오, 각 5,000명
Sim-B 결과를 이어받아 초기 상태 설정
"""
import json, sys, os
from copy import deepcopy
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

COST = {1:5,2:10,3:15,4:22,5:32,6:48,7:72,8:108,9:160,10:235,11:340,12:480,13:680,14:960,15:1350,16:1900,17:2700,18:3800,19:5300,20:7400,21:10400,22:14500,23:20000,24:28000,25:0}
SELL = {0:2,1:15,2:38,3:78,4:155,5:300,6:550,7:950,8:1600,9:2700,10:4500,11:10000,12:28000,13:75000,14:200000,15:550000,16:2500000,17:5000000,18:10000000,19:20000000,20:40000000,21:80000000,22:160000000,23:300000000,24:600000000,25:0}

MATERIAL_REQ = {17:[(12,1)],18:[(12,1)],19:[(12,2)],20:[(16,1)],21:[(11,1)],22:[(16,1)],23:[(2,1)],24:[(16,1)],25:[(16,2),(12,1)]}

DROP_BASE_CHANCE = {2:0.25,3:0.25,4:0.25,5:0.28,6:0.30,7:0.30,8:0.35,9:0.35,10:0.38,11:0.40,12:0.40,13:0.45,14:0.45,15:0.50,16:0.50,17:0.60,18:0.60,19:0.65,20:0.65,21:0.65,22:0.70,23:0.70,24:0.75}
DROP_TABLE = {2:{"녹슨철조각":80,"정제된철조각":5},3:{"녹슨철조각":80,"정제된철조각":5},4:{"녹슨철조각":75,"정제된철조각":8},5:{"녹슨철조각":70,"정제된철조각":15},6:{"마력부여철조각":100},7:{"녹슨철조각":65,"정제된철조각":20},8:{"마력부여철조각":100},9:{"사령조각":100},10:{"달빛조각":100},11:{"검성의파편":100},12:{"광물파편":100},13:{"달빛조각":50,"사령조각":50},14:{"광물파편":40,"마력부여철조각":40,"뒤틀린마력파편":8},15:{"달빛조각":100},16:{"사령조각":100},17:{"검성의파편":100},18:{"뒤틀린마력파편":100},19:{"사령조각":50,"뒤틀린마력파편":50},20:{"광물파편":100},21:{"뒤틀린마력파편":100},22:{"뒤틀린마력파편":100},23:{"녹슨철조각":50,"정제된철조각":50},24:{"뒤틀린마력파편":100}}

PROTECT_SAINT_RANGE = [0.50, 0.55, 0.60]
FRAG_DROP_SAINT = 0.50

SKIP_COST = {
    8:  {"gold": 1000, "마력부여철조각": 2},
    12: {"gold": 5000, "마력부여철조각": 3, "광물파편": 2},
}

def get_prob(curve_probs, level, has_master=False):
    if level <= 7:
        base = PROB_COMMON.get(level, 0)
    else:
        base = curve_probs.get(level, 0)
    if has_master:
        base = min(1.0, base + 0.02)
    return base

def roll_fragment(level, title, rng):
    if level not in DROP_BASE_CHANCE:
        return {}
    base = DROP_BASE_CHANCE[level]
    if title == "beginner_luck":
        base = 1.0
    if rng.random() > base:
        return {}
    table = DROP_TABLE.get(level, {})
    if not table:
        return {}
    names = list(table.keys())
    weights = list(table.values())
    total = sum(weights)
    r = rng.random() * total
    cum = 0
    chosen = names[-1]
    for n, w in zip(names, weights):
        cum += w
        if r < cum:
            chosen = n
            break
    qty = 1
    if title == "scavenger" and rng.random() < 0.60:
        qty = 2
    return {chosen: qty}

def can_afford_skip(state, target_level):
    cost = SKIP_COST.get(target_level)
    if not cost:
        return False
    if state["gold"] < cost["gold"]:
        return False
    for item, needed in cost.items():
        if item == "gold":
            continue
        if state["fragments"].get(item, 0) < needed:
            return False
    return True

def use_skip(state, target_level):
    cost = SKIP_COST[target_level]
    state["gold"] -= cost["gold"]
    for item, needed in cost.items():
        if item == "gold":
            continue
        state["fragments"][item] = state["fragments"].get(item, 0) - needed
    state["skip_count"] = state.get("skip_count", 0) + 1

def farm_material(curve_probs, mat_level, protect_saint, state, rng, max_farm_clicks=10000):
    """재료 검 파밍 서브루틴. state의 gold/clicks를 소모."""
    level = 0
    farm_clicks = 0
    # 검성 건너뛰기 가능하면 사용
    if can_afford_skip(state, 8) and mat_level > 8:
        use_skip(state, 8)
        level = 8
    elif can_afford_skip(state, 12) and mat_level > 12:
        use_skip(state, 12)
        level = 12

    while level < mat_level and farm_clicks < max_farm_clicks:
        target = level + 1
        cost = COST[target]
        if state["gold"] < cost:
            if level > 0:
                state["gold"] += SELL[level]
                level = 0
                if can_afford_skip(state, 8) and mat_level > 8:
                    use_skip(state, 8)
                    level = 8
            else:
                # level=0 + gold < 5G: 파산 → 파밍 중단
                break
            continue

        state["gold"] -= cost
        farm_clicks += 1
        p = get_prob(curve_probs, target, "master" in state["titles_unlocked"])
        if rng.random() < p:
            level = target
        else:
            # 파괴
            if rng.random() < protect_saint:
                pass  # 보호 (재료 파밍 중엔 검성 칭호 미장착, 단순화)
            else:
                frags = roll_fragment(level, "sword_saint", rng)
                for k, v in frags.items():
                    state["fragments"][k] = state["fragments"].get(k, 0) + v
                level = 0
                # 건너뛰기 재시도
                if can_afford_skip(state, 8) and mat_level > 8:
                    use_skip(state, 8)
                    level = 8

    state["clicks"] += farm_clicks
    return level >= mat_level  # 성공 여부

def has_materials(state, target_level):
    """target_level 강화에 필요한 재료 보유 여부"""
    if target_level not in MATERIAL_REQ:
        return True
    for mat_level, qty in MATERIAL_REQ[target_level]:
        mat_key = f"mat_{mat_level}"
        if state.get("material_swords", {}).get(mat_key, 0) < qty:
            return False
    return True

def prepare_materials(curve_probs, target_level, protect_saint, state, rng):
    """target_level 강화를 위한 재료 준비. 파밍으로 획득."""
    if target_level not in MATERIAL_REQ:
        return True
    for mat_level, qty in MATERIAL_REQ[target_level]:
        mat_key = f"mat_{mat_level}"
        current = state.setdefault("material_swords", {}).get(mat_key, 0)
        needed = qty - current
        for _ in range(needed):
            success = farm_material(curve_probs, mat_level, protect_saint, state, rng)
            if success:
                state["material_swords"][mat_key] = state["material_swords"].get(mat_key, 0) + 1
    return True

def consume_materials(state, target_level, refine_peak_active=False, protected=False):
    """재료 소모"""
    if target_level not in MATERIAL_REQ:
        return
    for mat_level, qty in MATERIAL_REQ[target_level]:
        mat_key = f"mat_{mat_level}"
        # 재련의 정점: 보호 발동 시 재료 보존 (단, Sim-C에서는 검성 장착 = 재련의 정점과 별개)
        if not (refine_peak_active and protected):
            state["material_swords"][mat_key] = max(0, state["material_swords"].get(mat_key, 0) - qty)

def sim_c_one_user(curve_probs, protect_saint, initial_state, rng, max_clicks=500000):
    state = {
        "gold": initial_state["gold"],
        "fragments": dict(initial_state.get("fragments", {})),
        "titles_unlocked": set(initial_state.get("titles_unlocked", ["sword_saint", "indomitable"])),
        "craft_count": initial_state.get("craft_count", 0),
        "clicks": 0,
        "skip_count": 0,
        "material_swords": {},
    }
    state["titles_unlocked"].add("sword_saint")

    visits = [0] * 26
    level = 0
    round_skip_used = False
    has_master = "master" in state["titles_unlocked"]

    # 검성 건너뛰기: +8에서 시작
    if can_afford_skip(state, 8):
        use_skip(state, 8)
        level = 8

    while level < 25 and state["clicks"] < max_clicks:
        visits[level] += 1
        target = level + 1

        # 재료 준비 (+17 이상)
        if target >= 17:
            prepare_materials(curve_probs, target, protect_saint, state, rng)

        # 강화 비용
        cost = COST[target]
        if state["gold"] < cost:
            if level > 0:
                state["gold"] += SELL[level]
                level = 0
                round_skip_used = False
                if can_afford_skip(state, 8):
                    use_skip(state, 8)
                    level = 8
            else:
                # level=0 + gold < 5G: 파산 → 종료
                break
            continue

        state["gold"] -= cost
        state["clicks"] += 1

        p = get_prob(curve_probs, target, has_master)
        if rng.random() < p:
            level = target
            state["craft_count"] += 1
            if target >= 18 and not has_master and "master" in state["titles_unlocked"]:
                has_master = True
        else:
            # 실패
            consume_materials(state, target)
            if rng.random() < protect_saint:
                pass  # 보호: 레벨 유지, 재료 소모됨
            else:
                # 파괴
                if rng.random() < FRAG_DROP_SAINT:
                    state["fragments"]["검성의파편"] = state["fragments"].get("검성의파편", 0) + 1
                frags = roll_fragment(level, "sword_saint", rng)
                for k, v in frags.items():
                    state["fragments"][k] = state["fragments"].get(k, 0) + v
                level = 0
                round_skip_used = False
                if can_afford_skip(state, 8):
                    use_skip(state, 8)
                    level = 8

    success = level >= 25

    return {
        "clicks": state["clicks"],
        "hours": state["clicks"] / 1200,
        "success": success,
        "visits": visits,
        "gold": state["gold"],
        "fragments": state["fragments"],
        "skip_count": state.get("skip_count", 0),
        "hit_max_clicks": state["clicks"] >= max_clicks,
    }

def percentile(arr, p):
    return float(np.percentile(arr, p))

def run_sim_c(n_users=5000):
    # Sim-B 결과 로드
    if not os.path.exists("sim_b_results.json"):
        print("ERROR: sim_b_results.json not found. Run sim_b.py first.", file=sys.stderr)
        sys.exit(1)

    with open("sim_b_results.json", "r", encoding="utf-8") as f:
        sim_b = json.load(f)

    # Sim-B 전 시나리오 중앙값으로 초기 상태
    all_scens_b = list(sim_b["scenarios"].values())
    gold_p50 = float(np.median([s["gold_at_end"]["p50"] for s in all_scens_b]))
    frag_agg = {}
    for s in all_scens_b:
        for k, v in s.get("fragments_mean", {}).items():
            frag_agg[k] = frag_agg.get(k, 0) + v
    n_s = len(all_scens_b)
    frag_mean = {k: v/n_s for k, v in frag_agg.items()}
    craft_mean = float(np.mean([s.get("craft_count_mean", 0) for s in all_scens_b if "craft_count_mean" in s] or [50]))

    initial_base = {
        "gold": gold_p50,
        "fragments": frag_mean,
        "titles_unlocked": ["sword_saint", "indomitable", "master", "beginner_luck"],
        "craft_count": craft_mean,
    }

    results = {}
    all_scenarios = []

    for curve_id, curve_probs_raw in CURVES.items():
        curve_probs = {**PROB_COMMON, **curve_probs_raw}
        for protect_saint in PROTECT_SAINT_RANGE:
            protect_key = f"p{int(protect_saint*100)}"
            key = f"{curve_id}_{protect_key}"

            # 느린 시나리오 (낮은 확률 + 낮은 보호) 처리
            # C1/C5 + p50은 느릴 수 있음 → 2000명으로 축소
            n = n_users
            if curve_id in ("C1", "C5") and protect_saint == 0.50:
                n = 2000

            seed = hash((curve_id, protect_key, "simC")) % (2**32)
            rng = np.random.default_rng(seed)

            clicks_list, hours_list = [], []
            success_count = 0
            visits_sum = [0] * 26
            hit_max = 0

            for i in range(n):
                if i % 500 == 0:
                    print(f"[Sim-C][{curve_id}/{protect_key}] {i}/{n}", file=sys.stderr)
                init = deepcopy(initial_base)
                r = sim_c_one_user(curve_probs, protect_saint, init, rng)
                if r["success"]:
                    clicks_list.append(r["clicks"])
                    hours_list.append(r["hours"])
                    success_count += 1
                else:
                    clicks_list.append(r["clicks"])
                    hours_list.append(r["hours"])
                if r["hit_max_clicks"]:
                    hit_max += 1
                for j, v in enumerate(r["visits"]):
                    visits_sum[j] += v

            scenario = {
                "curve": curve_id,
                "curve_name": CURVE_NAMES[curve_id],
                "protect_saint": protect_saint,
                "n_users": n,
                "clicks": {
                    "mean": float(np.mean(clicks_list)) if clicks_list else 0,
                    "p50": percentile(clicks_list, 50) if clicks_list else 0,
                    "p90": percentile(clicks_list, 90) if clicks_list else 0,
                },
                "hours": {
                    "mean": float(np.mean(hours_list)) if hours_list else 0,
                    "p50": percentile(hours_list, 50) if hours_list else 0,
                    "p90": percentile(hours_list, 90) if hours_list else 0,
                },
                "achievement_rate": success_count / n,
                "visits_mean": {str(j): round(v/n, 2) for j, v in enumerate(visits_sum)},
                "hit_max_clicks_pct": hit_max / n * 100,
            }
            results[key] = scenario
            all_scenarios.append(scenario)

    # 곡선별 요약
    curve_summary = {}
    for cid in CURVES:
        scens = [s for s in all_scenarios if s["curve"] == cid]
        curve_summary[cid] = {
            "curve_name": CURVE_NAMES[cid],
            "hours_mean_avg": round(sum(s["hours"]["mean"] for s in scens) / len(scens), 3),
            "achievement_rate_avg": round(sum(s["achievement_rate"] for s in scens) / len(scens), 3),
        }

    output = {
        "sim": "C",
        "description": "강한 보호 시대 (+25 여명 달성)",
        "initial_state_from_sim_b": {"gold_p50": gold_p50},
        "scenarios": results,
        "curve_summary": curve_summary,
    }

    with open("sim_c_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # 보고서
    lines = ["# Sim-C 보고서: 강한 보호 시대 (+25 달성)\n\n"]
    lines.append("## 곡선별 요약\n\n")
    lines.append("| 곡선 | 이름 | 평균 시간 | 달성률 |\n")
    lines.append("|------|------|---------|------|\n")
    for cid, cs in curve_summary.items():
        lines.append(f"| {cid} | {cs['curve_name']} | {cs['hours_mean_avg']:.3f}h | {cs['achievement_rate_avg']:.1%} |\n")

    lines.append("\n## 시나리오별 상세\n\n")
    lines.append("| 곡선 | 검성보호율 | 시간(mean) | 시간(p50) | 시간(p90) | 달성률 |\n")
    lines.append("|------|---------|-----------|----------|----------|------|\n")
    for key, s in results.items():
        lines.append(f"| {s['curve']} | {s['protect_saint']:.0%} | {s['hours']['mean']:.3f}h | {s['hours']['p50']:.3f}h | {s['hours']['p90']:.3f}h | {s['achievement_rate']:.1%} |\n")

    with open("sim_c_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("SIMC_DONE", file=sys.stderr)
    print("Sim-C 완료: sim_c_results.json, sim_c_report.md")
    return output

if __name__ == "__main__":
    run_sim_c()
