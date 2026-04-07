"""
Sim-A: 보호 없는 시대 (+0 → 불굴의 대장장이 획득)
6곡선 × 5페르소나 = 30 시나리오, 각 10,000명
"""
import json, sys, math
from copy import deepcopy
import numpy as np

# ── 게임 데이터 ──────────────────────────────────────────────

PROB_COMMON = {1:0.95, 2:0.93, 3:0.90, 4:0.87, 5:0.83, 6:0.78, 7:0.73}

CURVES = {
    "C1": {"name":"깊은골짜기","probs":{8:0.73,9:0.67,10:0.60,11:0.53,12:0.46,13:0.40,14:0.65,15:0.58,16:0.52,17:0.42,18:0.38,19:0.35,20:0.35,21:0.35,22:0.42,23:0.50,24:0.57,25:0.63}},
    "C2": {"name":"완만학습","probs":{8:0.75,9:0.70,10:0.65,11:0.60,12:0.55,13:0.48,14:0.65,15:0.60,16:0.55,17:0.45,18:0.42,19:0.40,20:0.38,21:0.38,22:0.45,23:0.52,24:0.58,25:0.63}},
    "C3": {"name":"극적반전","probs":{8:0.73,9:0.67,10:0.60,11:0.53,12:0.45,13:0.38,14:0.70,15:0.65,16:0.58,17:0.48,18:0.43,19:0.40,20:0.38,21:0.38,22:0.45,23:0.52,24:0.60,25:0.65}},
    "C4": {"name":"높은바닥","probs":{8:0.75,9:0.70,10:0.65,11:0.60,12:0.55,13:0.50,14:0.68,15:0.63,16:0.58,17:0.52,18:0.48,19:0.46,20:0.45,21:0.45,22:0.50,23:0.55,24:0.60,25:0.65}},
    "C5": {"name":"이중골짜기","probs":{8:0.73,9:0.67,10:0.60,11:0.53,12:0.46,13:0.40,14:0.65,15:0.60,16:0.58,17:0.50,18:0.45,19:0.40,20:0.35,21:0.35,22:0.42,23:0.50,24:0.58,25:0.65}},
    "C6": {"name":"후반관대","probs":{8:0.75,9:0.70,10:0.65,11:0.58,12:0.50,13:0.43,14:0.65,15:0.60,16:0.55,17:0.45,18:0.40,19:0.37,20:0.35,21:0.35,22:0.48,23:0.58,24:0.65,25:0.72}},
}

COST = {1:5,2:10,3:15,4:22,5:32,6:48,7:72,8:108,9:160,10:235,11:340,12:480,13:680,14:960,15:1350,16:1900,17:2700,18:3800,19:5300,20:7400,21:10400,22:14500,23:20000,24:28000,25:0}
SELL = {0:2,1:15,2:38,3:78,4:155,5:300,6:550,7:950,8:1600,9:2700,10:4500,11:10000,12:28000,13:75000,14:200000,15:550000,16:2500000,17:5000000,18:10000000,19:20000000,20:40000000,21:80000000,22:160000000,23:300000000,24:600000000,25:0}

DROP_BASE_CHANCE = {2:0.25,3:0.25,4:0.25,5:0.28,6:0.30,7:0.30,8:0.35,9:0.35,10:0.38,11:0.40,12:0.40,13:0.45,14:0.45,15:0.50,16:0.50,17:0.60,18:0.60,19:0.65,20:0.65,21:0.65,22:0.70,23:0.70,24:0.75}
DROP_TABLE = {2:{"녹슨철조각":80,"정제된철조각":5},3:{"녹슨철조각":80,"정제된철조각":5},4:{"녹슨철조각":75,"정제된철조각":8},5:{"녹슨철조각":70,"정제된철조각":15},6:{"마력부여철조각":100},7:{"녹슨철조각":65,"정제된철조각":20},8:{"마력부여철조각":100},9:{"사령조각":100},10:{"달빛조각":100},11:{"검성의파편":100},12:{"광물파편":100},13:{"달빛조각":50,"사령조각":50},14:{"광물파편":40,"마력부여철조각":40,"뒤틀린마력파편":8},15:{"달빛조각":100},16:{"사령조각":100},17:{"검성의파편":100},18:{"뒤틀린마력파편":100},19:{"사령조각":50,"뒤틀린마력파편":50},20:{"광물파편":100},21:{"뒤틀린마력파편":100},22:{"뒤틀린마력파편":100},23:{"녹슨철조각":50,"정제된철조각":50},24:{"뒤틀린마력파편":100}}

PERSONAS = {
    "cautious":   {"desc":"조심스러운 초보. +7에서 판매","sell_at":7,"push_chance":0.15,"title_pref":"beginner_luck"},
    "farmer":     {"desc":"안정형 파머. +8에서 판매","sell_at":8,"push_chance":0.10,"title_pref":"haggler"},
    "ambitious":  {"desc":"야심찬 중수. +10 목표","sell_at":10,"push_chance":0.30,"title_pref":"beginner_luck"},
    "yolo":       {"desc":"욜로 도박꾼. 계속 올림","sell_at":99,"push_chance":1.0,"title_pref":"beginner_luck"},
    "crafter":    {"desc":"전략적 조합러. +8 판매, 조각 집중","sell_at":8,"push_chance":0.20,"title_pref":"scavenger"},
}

def get_prob(probs_map, level):
    if level <= 7:
        return PROB_COMMON.get(level, 0)
    return probs_map.get(level, 0)

def roll_fragment(level, title, rng):
    """조각 드랍 판정. {frag_name: qty} or {} 반환"""
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

def sim_a_one_user(probs_map, persona, rng, max_clicks=50000):
    gold = 2000
    fragments = {}
    level = 0
    clicks = 0
    destructions = 0
    sales = 0
    max_level_reached = 0
    titles_unlocked = set()
    active_title = None
    craft_count = 0
    total_frags_obtained = 0

    while destructions < 15 and clicks < max_clicks:
        # 칭호 해금 체크
        if destructions >= 1 and "beginner_luck" not in titles_unlocked:
            titles_unlocked.add("beginner_luck")
        if sales >= 15 and "haggler" not in titles_unlocked:
            titles_unlocked.add("haggler")
        frag_types = sum(1 for v in fragments.values() if v > 0)
        if (frag_types >= 5 or total_frags_obtained >= 20) and "scavenger" not in titles_unlocked:
            titles_unlocked.add("scavenger")

        # 칭호 장착 (선호 칭호 우선, 없으면 보유 중 아무거나)
        pref = persona["title_pref"]
        if pref in titles_unlocked:
            active_title = pref
        elif "beginner_luck" in titles_unlocked:
            active_title = "beginner_luck"
        elif "haggler" in titles_unlocked:
            active_title = "haggler"
        else:
            active_title = None

        # 행동 결정: 판매 vs 계속 강화
        if level > 0 and level >= persona["sell_at"] and rng.random() > persona["push_chance"]:
            price = SELL[level]
            if active_title == "haggler":
                price = int(price * 1.5)
            gold += price
            sales += 1
            level = 0
            continue

        # 강화 시도
        if level >= 25:
            # 25강 도달 불가 (Sim-A는 불굴 획득 전 단계)
            price = SELL[level]
            gold += price
            sales += 1
            level = 0
            continue

        target = level + 1
        cost = COST[target]
        if gold < cost:
            # 골드 부족 → 판매
            price = SELL[level]
            if active_title == "haggler":
                price = int(price * 1.5)
            gold += price
            sales += 1
            level = 0
            continue

        gold -= cost
        clicks += 1

        if rng.random() < get_prob(probs_map, target):
            level = target
            max_level_reached = max(max_level_reached, level)
            craft_count += 1
        else:
            # 실패 → 파괴 (보호 없음)
            frags = roll_fragment(level, active_title, rng)
            for k, v in frags.items():
                fragments[k] = fragments.get(k, 0) + v
                total_frags_obtained += v
            destructions += 1
            level = 0

    return {
        "clicks": clicks,
        "destructions": destructions,
        "sales": sales,
        "gold": gold,
        "fragments": dict(fragments),
        "total_frags_obtained": total_frags_obtained,
        "max_level": max_level_reached,
        "titles_unlocked": sorted(list(titles_unlocked)),
        "craft_count": craft_count,
        "hit_max_clicks": clicks >= max_clicks,
    }

def percentile(arr, p):
    return float(np.percentile(arr, p))

def run_sim_a(n_users=10000):
    results = {}
    all_scenarios = []

    for curve_id, curve_data in CURVES.items():
        probs_map = {**PROB_COMMON, **curve_data["probs"]}
        for persona_id, persona in PERSONAS.items():
            seed = hash((curve_id, persona_id, "simA")) % (2**32)
            rng = np.random.default_rng(seed)

            clicks_list, hours_list, gold_list = [], [], []
            frag_totals = {}
            max_levels = []
            hit_max = 0
            all_titles = []

            for i in range(n_users):
                if i % 2000 == 0:
                    print(f"[Sim-A][{curve_id}/{persona_id}] {i}/{n_users}", file=sys.stderr)
                r = sim_a_one_user(probs_map, persona, rng)
                clicks_list.append(r["clicks"])
                hours_list.append(r["clicks"] / 1200)
                gold_list.append(r["gold"])
                max_levels.append(r["max_level"])
                if r["hit_max_clicks"]:
                    hit_max += 1
                for k, v in r["fragments"].items():
                    frag_totals[k] = frag_totals.get(k, 0) + v
                all_titles.append(r["titles_unlocked"])

            key = f"{curve_id}_{persona_id}"
            scenario = {
                "curve": curve_id,
                "curve_name": curve_data["name"],
                "persona": persona_id,
                "persona_desc": persona["desc"],
                "n_users": n_users,
                "clicks": {
                    "mean": float(np.mean(clicks_list)),
                    "p50": percentile(clicks_list, 50),
                    "p90": percentile(clicks_list, 90),
                    "p10": percentile(clicks_list, 10),
                },
                "hours": {
                    "mean": float(np.mean(hours_list)),
                    "p50": percentile(hours_list, 50),
                    "p90": percentile(hours_list, 90),
                    "p10": percentile(hours_list, 10),
                },
                "gold_at_end": {
                    "mean": float(np.mean(gold_list)),
                    "p50": percentile(gold_list, 50),
                },
                "fragments_mean": {k: round(v/n_users, 2) for k, v in frag_totals.items()},
                "max_level_mean": float(np.mean(max_levels)),
                "max_level_p50": percentile(max_levels, 50),
                "hit_max_clicks_pct": hit_max / n_users * 100,
            }
            results[key] = scenario
            all_scenarios.append(scenario)

    # 곡선별 평균 집계 (전 페르소나 평균)
    curve_summary = {}
    for curve_id in CURVES:
        scens = [s for s in all_scenarios if s["curve"] == curve_id]
        curve_summary[curve_id] = {
            "curve_name": CURVES[curve_id]["name"],
            "hours_mean_avg": round(sum(s["hours"]["mean"] for s in scens) / len(scens), 3),
            "hours_p50_avg": round(sum(s["hours"]["p50"] for s in scens) / len(scens), 3),
            "gold_mean_avg": round(sum(s["gold_at_end"]["mean"] for s in scens) / len(scens), 1),
        }

    output = {
        "sim": "A",
        "description": "보호 없는 시대 (불굴 획득까지)",
        "n_users_per_scenario": n_users,
        "scenarios": results,
        "curve_summary": curve_summary,
    }

    with open("sim_a_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # 보고서 생성
    lines = ["# Sim-A 보고서: 보호 없는 시대\n"]
    lines.append("## 곡선별 요약 (전 페르소나 평균)\n")
    lines.append("| 곡선 | 이름 | 평균 시간(mean) | 평균 시간(p50) | 종료 골드 |\n")
    lines.append("|------|------|--------------|-------------|----------|\n")
    for cid, cs in curve_summary.items():
        lines.append(f"| {cid} | {cs['curve_name']} | {cs['hours_mean_avg']:.3f}h | {cs['hours_p50_avg']:.3f}h | {cs['gold_mean_avg']:,.0f}G |\n")

    lines.append("\n## 시나리오별 상세\n")
    lines.append("| 곡선 | 페르소나 | 시간(mean) | 시간(p50) | 시간(p90) | 종료골드(p50) | 최고레벨(p50) |\n")
    lines.append("|------|---------|-----------|----------|----------|-------------|------------|\n")
    for key, s in results.items():
        lines.append(f"| {s['curve']} | {s['persona']} | {s['hours']['mean']:.3f}h | {s['hours']['p50']:.3f}h | {s['hours']['p90']:.3f}h | {s['gold_at_end']['p50']:,.0f}G | +{s['max_level_p50']:.0f} |\n")

    lines.append("\n## 중앙값 축적물 (Sim-B 초기 상태 참고)\n")
    # 전 시나리오의 중앙값 골드와 조각 집계 (모든 곡선/페르소나 평균)
    all_gold = [s["gold_at_end"]["p50"] for s in all_scenarios]
    lines.append(f"- 골드 p50 범위: {min(all_gold):,.0f}G ~ {max(all_gold):,.0f}G\n")

    # 대표 조각 집계 (모든 시나리오 평균)
    frag_agg = {}
    for s in all_scenarios:
        for k, v in s["fragments_mean"].items():
            frag_agg[k] = frag_agg.get(k, 0) + v
    n_scen = len(all_scenarios)
    lines.append("- 평균 조각 보유량:\n")
    for k, v in sorted(frag_agg.items(), key=lambda x: -x[1]):
        lines.append(f"  - {k}: {v/n_scen:.2f}개\n")

    with open("sim_a_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("SIMA_DONE", file=sys.stderr)
    print("Sim-A 완료: sim_a_results.json, sim_a_report.md")
    return output

if __name__ == "__main__":
    run_sim_a()
