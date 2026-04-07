"""
Sim-B: 약한 보호 시대 (불굴 획득 → 검성의 대장장이 획득)
6곡선 × 5보호율 = 30 시나리오, 각 5,000명
Sim-A 결과를 이어받아 초기 상태 설정
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

PROTECT_INDOM_RANGE = [0.20, 0.25, 0.30, 0.35, 0.40]

SKIP_COST = {
    5:  {"gold": 200,  "녹슨철조각": 3},
    7:  {"gold": 600,  "녹슨철조각": 5, "정제된철조각": 2},
    8:  {"gold": 1000, "마력부여철조각": 2},
    12: {"gold": 5000, "마력부여철조각": 3, "광물파편": 2},
}

def get_prob(curve_probs, level, title=None):
    base = PROB_COMMON.get(level, curve_probs.get(level, 0))
    if level > 7:
        base = curve_probs.get(level, 0)
    if title == "master":
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

def choose_title_b(state, level, titles_unlocked):
    """현 상황에 맞는 최적 칭호 선택"""
    # +15 이상 도전 중: 불굴 보호 우선
    if level >= 13 and "indomitable" in titles_unlocked:
        return "indomitable"
    # +11 이상: 달인(확률 보정) 있으면 사용
    if level >= 11 and "master" in titles_unlocked:
        return "master"
    # 재련의 정점: +17 이상 재료 필요할 때
    if level >= 16 and "refine_peak" in titles_unlocked:
        return "refine_peak"
    # 파밍 중: 흥정의 달인
    if "haggler" in titles_unlocked and level <= 8:
        return "haggler"
    # 기본: 불굴
    if "indomitable" in titles_unlocked:
        return "indomitable"
    if "beginner_luck" in titles_unlocked:
        return "beginner_luck"
    return None

def get_sell_price(level, title):
    base = SELL[level]
    if title == "haggler":
        return int(base * 1.5)
    return base

def sim_b_one_user(curve_probs, protect_indom, initial_state, rng, max_clicks=100000):
    state = {
        "gold": initial_state["gold"],
        "fragments": dict(initial_state["fragments"]),
        "titles_unlocked": set(initial_state["titles_unlocked"]),
        "craft_count": initial_state.get("craft_count", 0),
        "sales": initial_state.get("sales", 0),
        "clicks": 0,
        "skip_count": 0,
    }
    state["titles_unlocked"].add("indomitable")

    mugyeom_crafts = 0
    baekya_crafted = False
    sword_saint_unlocked = False
    destructions_b = 0

    level = 0

    while not sword_saint_unlocked and state["clicks"] < max_clicks:
        title = choose_title_b(state, level, state["titles_unlocked"])

        # 건너뛰기 (검 없을 때만, 라운드 첫 시작)
        if level == 0:
            if title == "indomitable" and can_afford_skip(state, 7):
                use_skip(state, 7)
                level = 7
            elif title in ("master", "refine_peak") and can_afford_skip(state, 12):
                use_skip(state, 12)
                level = 12

        # 강화 대상 결정
        target = level + 1
        if target > 17:
            # 17 초과는 이 시뮬 범위 밖 (파는 것 처리)
            state["gold"] += get_sell_price(level, title)
            state["sales"] += 1
            level = 0
            continue

        title = choose_title_b(state, level, state["titles_unlocked"])
        cost = COST[target]

        # 골드 부족 처리
        if state["gold"] < cost:
            if level > 0:
                state["gold"] += get_sell_price(level, title)
                state["sales"] += 1
                level = 0
            else:
                # level=0 + gold < 5G: 탈출 불가 → 강제 종료 (파산)
                break
            continue

        state["gold"] -= cost
        state["clicks"] += 1

        p = get_prob(curve_probs, target, title)
        if rng.random() < p:
            level = target
            state["craft_count"] += 1

            if target == 11:
                mugyeom_crafts += 1
                if mugyeom_crafts >= 3:
                    sword_saint_unlocked = True
                    break
            if target >= 18 and "master" not in state["titles_unlocked"]:
                state["titles_unlocked"].add("master")
            if "refine_peak" not in state["titles_unlocked"] and state["craft_count"] % 10 == 0:
                state["titles_unlocked"].add("refine_peak")
            if target == 17:
                baekya_crafted = True
                sword_saint_unlocked = True
                break
        else:
            protected = False
            if title == "indomitable" and rng.random() < protect_indom:
                protected = True

            if not protected:
                frags = roll_fragment(level, title, rng)
                for k, v in frags.items():
                    state["fragments"][k] = state["fragments"].get(k, 0) + v
                destructions_b += 1
                level = 0

    route = "baekya" if baekya_crafted else ("mugyeom_x3" if mugyeom_crafts >= 3 else "incomplete")

    return {
        "clicks": state["clicks"],
        "hours": state["clicks"] / 1200,
        "gold": state["gold"],
        "fragments": state["fragments"],
        "titles_unlocked": sorted(list(state["titles_unlocked"])),
        "craft_count": state["craft_count"],
        "sales": state["sales"],
        "skip_count": state.get("skip_count", 0),
        "destructions_b": destructions_b,
        "sword_saint_route": route,
        "mugyeom_crafts": mugyeom_crafts,
        "completed": sword_saint_unlocked,
        "hit_max_clicks": state["clicks"] >= max_clicks,
    }

def percentile(arr, p):
    return float(np.percentile(arr, p))

def run_sim_b(n_users=5000):
    # Sim-A 결과 로드
    if not os.path.exists("sim_a_results.json"):
        print("ERROR: sim_a_results.json not found. Run sim_a.py first.", file=sys.stderr)
        sys.exit(1)

    with open("sim_a_results.json", "r", encoding="utf-8") as f:
        sim_a = json.load(f)

    # Sim-A 전 시나리오 중앙값으로 초기 상태 계산
    all_scens = list(sim_a["scenarios"].values())
    gold_p50 = float(np.median([s["gold_at_end"]["p50"] for s in all_scens]))
    # 조각 중앙값
    frag_agg = {}
    for s in all_scens:
        for k, v in s["fragments_mean"].items():
            frag_agg[k] = frag_agg.get(k, 0) + v
    n_s = len(all_scens)
    frag_mean = {k: v/n_s for k, v in frag_agg.items()}
    craft_mean = float(np.mean([s.get("craft_count", 0) for s in all_scens if "craft_count" in s] or [0]))
    sales_mean = float(np.mean([s.get("sales", 0) for s in all_scens if "sales" in s] or [0]))

    initial_base = {
        "gold": gold_p50,
        "fragments": frag_mean,
        "titles_unlocked": ["indomitable", "beginner_luck"],
        "craft_count": craft_mean,
        "sales": sales_mean,
    }

    results = {}
    all_scenarios = []

    for curve_id, curve_probs_raw in CURVES.items():
        curve_probs = {**PROB_COMMON, **curve_probs_raw}
        for protect_idx, protect_indom in enumerate(PROTECT_INDOM_RANGE):
            protect_key = f"p{int(protect_indom*100)}"
            key = f"{curve_id}_{protect_key}"

            seed = hash((curve_id, protect_key, "simB")) % (2**32)
            rng = np.random.default_rng(seed)

            clicks_list, hours_list, gold_list = [], [], []
            route_counts = {"baekya": 0, "mugyeom_x3": 0, "incomplete": 0}
            skip_counts = []
            completed = 0
            hit_max = 0

            for i in range(n_users):
                if i % 1000 == 0:
                    print(f"[Sim-B][{curve_id}/{protect_key}] {i}/{n_users}", file=sys.stderr)
                init = deepcopy(initial_base)
                r = sim_b_one_user(curve_probs, protect_indom, init, rng)
                clicks_list.append(r["clicks"])
                hours_list.append(r["hours"])
                gold_list.append(r["gold"])
                skip_counts.append(r["skip_count"])
                route_counts[r["sword_saint_route"]] = route_counts.get(r["sword_saint_route"], 0) + 1
                if r["completed"]:
                    completed += 1
                if r["hit_max_clicks"]:
                    hit_max += 1

            scenario = {
                "curve": curve_id,
                "curve_name": CURVES[curve_id] if isinstance(CURVES[curve_id], str) else CURVE_NAMES[curve_id],
                "protect_indom": protect_indom,
                "n_users": n_users,
                "clicks": {
                    "mean": float(np.mean(clicks_list)),
                    "p50": percentile(clicks_list, 50),
                    "p90": percentile(clicks_list, 90),
                },
                "hours": {
                    "mean": float(np.mean(hours_list)),
                    "p50": percentile(hours_list, 50),
                    "p90": percentile(hours_list, 90),
                },
                "gold_at_end": {
                    "mean": float(np.mean(gold_list)),
                    "p50": percentile(gold_list, 50),
                },
                "completion_rate": completed / n_users,
                "route_distribution": {k: round(v/n_users, 3) for k, v in route_counts.items()},
                "skip_mean": float(np.mean(skip_counts)),
                "hit_max_clicks_pct": hit_max / n_users * 100,
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
            "completion_rate_avg": round(sum(s["completion_rate"] for s in scens) / len(scens), 3),
        }

    output = {
        "sim": "B",
        "description": "약한 보호 시대 (검성 획득까지)",
        "initial_state_from_sim_a": {
            "gold_p50": gold_p50,
            "fragments_mean": frag_mean,
        },
        "scenarios": results,
        "curve_summary": curve_summary,
    }

    with open("sim_b_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # 보고서
    lines = ["# Sim-B 보고서: 약한 보호 시대\n\n"]
    lines.append(f"초기 상태 (Sim-A p50): 골드={gold_p50:,.0f}G\n\n")

    lines.append("## 곡선별 요약\n\n")
    lines.append("| 곡선 | 이름 | 평균 시간 | 완료율 |\n")
    lines.append("|------|------|---------|------|\n")
    for cid, cs in curve_summary.items():
        lines.append(f"| {cid} | {cs['curve_name']} | {cs['hours_mean_avg']:.3f}h | {cs['completion_rate_avg']:.1%} |\n")

    lines.append("\n## 시나리오별 상세\n\n")
    lines.append("| 곡선 | 불굴보호율 | 시간(mean) | 시간(p50) | 시간(p90) | 완료율 | 백야루트 | 무형검루트 |\n")
    lines.append("|------|---------|-----------|----------|----------|------|---------|----------|\n")
    for key, s in results.items():
        rd = s["route_distribution"]
        lines.append(f"| {s['curve']} | {s['protect_indom']:.0%} | {s['hours']['mean']:.3f}h | {s['hours']['p50']:.3f}h | {s['hours']['p90']:.3f}h | {s['completion_rate']:.1%} | {rd.get('baekya',0):.1%} | {rd.get('mugyeom_x3',0):.1%} |\n")

    with open("sim_b_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("SIMB_DONE", file=sys.stderr)
    print("Sim-B 완료: sim_b_results.json, sim_b_report.md")
    return output

if __name__ == "__main__":
    run_sim_b()
