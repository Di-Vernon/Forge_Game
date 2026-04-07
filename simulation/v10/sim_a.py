"""
Sim-A v10: 보호 없는 시대
종료 조건: +8 이상에서 20회 파괴 → 불굴의 대장장이 획득
6곡선 × 5페르소나 = 30시나리오, 각 10,000명
"""
import json, sys
import numpy as np

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

INITIAL_GOLD = 2000
INDOM_HIGH_DESTROY = 20  # +8 이상 파괴 횟수 (v10)

PERSONAS = {
    "cautious":  {"desc":"조심스러운 초보","sell_at":7, "push_chance":0.15,"title_pref":"beginner_luck"},
    "farmer":    {"desc":"안정형 파머",    "sell_at":8, "push_chance":0.10,"title_pref":"haggler"},
    "ambitious": {"desc":"야심찬 중수",    "sell_at":10,"push_chance":0.30,"title_pref":"beginner_luck"},
    "yolo":      {"desc":"욜로 도박꾼",   "sell_at":99,"push_chance":1.0, "title_pref":"beginner_luck"},
    "crafter":   {"desc":"전략적 조합러", "sell_at":8, "push_chance":0.20,"title_pref":"scavenger"},
}

def get_prob(curve_probs, target):
    return PROB_COMMON.get(target, curve_probs.get(target, 0))

def roll_fragment(level, title, rng):
    if level < 2 or level > 24:
        return {}
    base = DROP_BASE_CHANCE.get(level, 0)
    if title == "beginner_luck":
        base = 1.0
    if rng.random() >= base:
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
    qty = 2 if title == "scavenger" and rng.random() < 0.60 else 1
    return {chosen: qty}

def sim_a_one(curve_probs, persona, rng, max_clicks=200000):
    gold = INITIAL_GOLD
    fragments = {}
    total_frag = 0
    level = 0
    clicks = 0
    destructions_high = 0  # +8 이상 파괴 횟수 (불굴 조건)
    destructions_total = 0
    sales = 0
    max_level = 0
    title = None
    titles_unlocked = set()

    while destructions_high < INDOM_HIGH_DESTROY and clicks < max_clicks:
        # 칭호 해금
        if destructions_total >= 1 and "beginner_luck" not in titles_unlocked:
            titles_unlocked.add("beginner_luck")
        if sales >= 15 and "haggler" not in titles_unlocked:
            titles_unlocked.add("haggler")
        frag_types = sum(1 for v in fragments.values() if v > 0)
        if (frag_types >= 5 or total_frag >= 20) and "scavenger" not in titles_unlocked:
            titles_unlocked.add("scavenger")

        # 칭호 장착
        pref = persona["title_pref"]
        if pref in titles_unlocked:
            title = pref
        elif "beginner_luck" in titles_unlocked:
            title = "beginner_luck"
        elif "haggler" in titles_unlocked:
            title = "haggler"
        else:
            title = None

        # 판매 결정
        if level > 0 and level >= persona["sell_at"] and rng.random() > persona["push_chance"]:
            price = SELL[level]
            if title == "haggler":
                price = int(price * 1.5)
            gold += price
            sales += 1
            level = 0
            continue

        # 강화 시도
        target = level + 1
        if target > 25:
            gold += SELL[level]
            sales += 1
            level = 0
            continue

        cost = COST[target]
        if gold < cost:
            if level > 0:
                price = SELL[level]
                if title == "haggler":
                    price = int(price * 1.5)
                gold += price
                sales += 1
                level = 0
            else:
                break  # 파산
            continue

        gold -= cost
        clicks += 1

        if rng.random() < get_prob(curve_probs, target):
            level = target
            max_level = max(max_level, level)
        else:
            # 파괴
            if level >= 8:
                destructions_high += 1  # ← v10 핵심
            frags = roll_fragment(level, title, rng)
            for k, v in frags.items():
                fragments[k] = fragments.get(k, 0) + v
                total_frag += v
            destructions_total += 1
            level = 0

    return {
        "clicks": clicks,
        "destructions_high": destructions_high,
        "destructions_total": destructions_total,
        "sales": sales,
        "gold": gold,
        "fragments": dict(fragments),
        "total_frag": total_frag,
        "max_level": max_level,
        "titles_unlocked": sorted(list(titles_unlocked)),
        "completed": destructions_high >= INDOM_HIGH_DESTROY,
        "hit_max": clicks >= max_clicks,
    }

def pct(arr, p):
    return float(np.percentile(arr, p))

def run_sim_a(n_users=10000):
    results = {}
    all_scenarios = []

    for cid, cdata in CURVES.items():
        cprobs = {**PROB_COMMON, **cdata["probs"]}
        for pid, persona in PERSONAS.items():
            seed = hash((cid, pid, "v10simA")) % (2**32)
            rng = np.random.default_rng(seed)

            clicks_l, gold_l = [], []
            frag_agg = {}
            maxlv_l = []
            destr_high_l, destr_total_l, sales_l = [], [], []
            completed = 0
            hit_max = 0

            for i in range(n_users):
                if i % 2000 == 0:
                    print(f"[Sim-A][{cid}/{pid}] {i}/{n_users}", file=sys.stderr)
                r = sim_a_one(cprobs, persona, rng)
                clicks_l.append(r["clicks"])
                gold_l.append(r["gold"])
                maxlv_l.append(r["max_level"])
                destr_high_l.append(r["destructions_high"])
                destr_total_l.append(r["destructions_total"])
                sales_l.append(r["sales"])
                for k, v in r["fragments"].items():
                    frag_agg[k] = frag_agg.get(k, 0) + v
                if r["completed"]:
                    completed += 1
                if r["hit_max"]:
                    hit_max += 1

            hours_l = [c / 1200 for c in clicks_l]
            key = f"{cid}_{pid}"
            scen = {
                "curve": cid, "curve_name": cdata["name"],
                "persona": pid, "persona_desc": persona["desc"],
                "n_users": n_users,
                "clicks":  {"mean": float(np.mean(clicks_l)), "p25": pct(clicks_l,25), "p50": pct(clicks_l,50), "p75": pct(clicks_l,75), "p90": pct(clicks_l,90)},
                "hours":   {"mean": float(np.mean(hours_l)),  "p25": pct(hours_l,25),  "p50": pct(hours_l,50),  "p75": pct(hours_l,75),  "p90": pct(hours_l,90)},
                "gold_end":{"mean": float(np.mean(gold_l)),   "p50": pct(gold_l,50)},
                "max_level_p50": pct(maxlv_l,50),
                "destructions_high_mean": float(np.mean(destr_high_l)),
                "destructions_total_mean": float(np.mean(destr_total_l)),
                "sales_mean": float(np.mean(sales_l)),
                "fragments_mean": {k: round(v/n_users,2) for k, v in frag_agg.items()},
                "completion_rate": completed / n_users,
                "hit_max_pct": hit_max / n_users * 100,
            }
            results[key] = scen
            all_scenarios.append(scen)

    # 곡선별 집계 (전 페르소나 평균)
    curve_agg = {}
    for cid in CURVES:
        sc = [s for s in all_scenarios if s["curve"] == cid]
        curve_agg[cid] = {
            "name": CURVES[cid]["name"],
            "hours_p50_avg": round(sum(s["hours"]["p50"] for s in sc)/len(sc), 3),
            "hours_p90_avg": round(sum(s["hours"]["p90"] for s in sc)/len(sc), 3),
            "gold_p50_avg":  round(sum(s["gold_end"]["p50"] for s in sc)/len(sc), 0),
            "completion_avg": round(sum(s["completion_rate"] for s in sc)/len(sc), 3),
        }
        # 전체 평균 조각
        frag_total = {}
        for s in sc:
            for k, v in s["fragments_mean"].items():
                frag_total[k] = frag_total.get(k, 0) + v
        curve_agg[cid]["fragments_mean"] = {k: round(v/len(sc), 2) for k, v in frag_total.items()}

    # 전 시나리오 평균 축적물 (Sim-B1 초기 상태용)
    all_gold_p50 = [s["gold_end"]["p50"] for s in all_scenarios]
    frag_grand = {}
    for s in all_scenarios:
        for k, v in s["fragments_mean"].items():
            frag_grand[k] = frag_grand.get(k, 0) + v
    n_sc = len(all_scenarios)
    median_state = {
        "gold": float(np.median(all_gold_p50)),
        "fragments": {k: round(v/n_sc, 2) for k, v in frag_grand.items()},
        "titles_unlocked": ["indomitable", "beginner_luck"],
    }

    output = {
        "sim": "A_v10",
        "description": "보호 없는 시대 (+8 이상 20회 파괴 → 불굴 획득)",
        "scenarios": results,
        "curve_summary": curve_agg,
        "median_state_for_b1": median_state,
    }

    with open("sim_a_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # 보고서
    lines = ["# Sim-A v10 보고서: 보호 없는 시대\n\n"]
    lines.append("## 성공 기준: Phase A p50 = 20~50분\n\n")
    lines.append("## 곡선별 요약 (전 페르소나 평균)\n\n")
    lines.append("| 곡선 | 이름 | p50 시간 | p90 시간 | 종료 골드(p50) | 완료율 |\n")
    lines.append("|------|------|---------|---------|-------------|------|\n")
    for cid, cs in curve_agg.items():
        p50_min = round(cs["hours_p50_avg"]*60, 1)
        p90_min = round(cs["hours_p90_avg"]*60, 1)
        ok = "✅" if 20 <= p50_min <= 50 else ("⚠️ 짧음" if p50_min < 20 else "⚠️ 긺")
        lines.append(f"| {cid} | {cs['name']} | {cs['hours_p50_avg']:.3f}h ({p50_min}분) {ok} | {cs['hours_p90_avg']:.3f}h ({p90_min}분) | {cs['gold_p50_avg']:,.0f}G | {cs['completion_avg']:.1%} |\n")

    lines.append("\n## 시나리오별 상세\n\n")
    lines.append("| 곡선 | 페르소나 | p50시간 | p90시간 | 골드(p50) | 최고레벨(p50) | 완료율 |\n")
    lines.append("|------|---------|--------|--------|---------|------------|------|\n")
    for key, s in results.items():
        lines.append(f"| {s['curve']} | {s['persona']} | {s['hours']['p50']:.3f}h({s['hours']['p50']*60:.0f}분) | {s['hours']['p90']:.3f}h | {s['gold_end']['p50']:,.0f}G | +{s['max_level_p50']:.0f} | {s['completion_rate']:.1%} |\n")

    lines.append("\n## Sim-B1 초기 상태 (전 시나리오 중앙값)\n\n")
    lines.append(f"- 골드: {median_state['gold']:,.0f}G\n")
    lines.append("- 조각:\n")
    for k, v in sorted(median_state["fragments"].items(), key=lambda x: -x[1]):
        lines.append(f"  - {k}: {v:.2f}개\n")

    with open("sim_a_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("SIMA_DONE", file=sys.stderr)
    print("Sim-A v10 완료: sim_a_results.json, sim_a_report.md")
    return output

if __name__ == "__main__":
    run_sim_a()
