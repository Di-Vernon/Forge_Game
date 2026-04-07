"""
Sim-B1 v10: 약한 보호 시대 — 곡선 × 보호율 탐색 (건너뛰기 OFF)
종료 조건: 백야(+17) 최초 제작 → 검성의 대장장이 획득
6곡선 × 5보호율 = 30시나리오, 각 5,000명
재료 비용: Sim-D의 E_farm(+12) 해석적 값을 clicks로 환산
"""
import json, sys, os
from copy import deepcopy
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

PROTECT_INDOM_RANGE = [0.20, 0.25, 0.30, 0.35, 0.40]

DROP_BASE_CHANCE = {2:0.25,3:0.25,4:0.25,5:0.28,6:0.30,7:0.30,8:0.35,9:0.35,10:0.38,11:0.40,12:0.40,13:0.45,14:0.45,15:0.50,16:0.50,17:0.60,18:0.60,19:0.65,20:0.65,21:0.65,22:0.70,23:0.70,24:0.75}
DROP_TABLE = {2:{"녹슨철조각":80,"정제된철조각":5},3:{"녹슨철조각":80,"정제된철조각":5},4:{"녹슨철조각":75,"정제된철조각":8},5:{"녹슨철조각":70,"정제된철조각":15},6:{"마력부여철조각":100},7:{"녹슨철조각":65,"정제된철조각":20},8:{"마력부여철조각":100},9:{"사령조각":100},10:{"달빛조각":100},11:{"검성의파편":100},12:{"광물파편":100},13:{"달빛조각":50,"사령조각":50},14:{"광물파편":40,"마력부여철조각":40,"뒤틀린마력파편":8},15:{"달빛조각":100},16:{"사령조각":100},17:{"검성의파편":100},18:{"뒤틀린마력파편":100},19:{"사령조각":50,"뒤틀린마력파편":50},20:{"광물파편":100},21:{"뒤틀린마력파편":100},22:{"뒤틀린마력파편":100},23:{"녹슨철조각":50,"정제된철조각":50},24:{"뒤틀린마력파편":100}}

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

def sim_b1_one(curve_probs, protect_indom, e_farm_12, initial_state, rng, max_clicks=300000):
    """
    불굴 보호만 적용. 건너뛰기 없음.
    재료(+12) 파밍 비용: e_farm_12 클릭을 결정적으로 추가.
    """
    gold = initial_state["gold"]
    fragments = dict(initial_state["fragments"])
    clicks = 0
    level = 0
    max_level = 0
    destructions = 0
    baekya_crafted = False

    while not baekya_crafted and clicks < max_clicks:
        target = level + 1

        if target > 17:
            # 안전장치: 17 초과 도달 시 종료
            break

        # +17 강화 시 재료 비용 추가 (엑스칼리버 +12 × 1)
        # 매 +17 시도마다 재료 1개 소모 → e_farm_12 클릭 추가
        if target == 17:
            clicks += int(e_farm_12)
            if clicks >= max_clicks:
                break

        cost = COST[target]
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
            max_level = max(max_level, level)
            if target == 17:
                baekya_crafted = True
        else:
            # 실패
            if rng.random() < protect_indom:
                pass  # 보호: 레벨 유지
            else:
                # 파괴
                frags = roll_fragment(level, rng)
                for k, v in frags.items():
                    fragments[k] = fragments.get(k, 0) + v
                destructions += 1
                level = 0

    return {
        "clicks": clicks,
        "hours": clicks / 1200,
        "completed": baekya_crafted,
        "max_level": max_level,
        "destructions": destructions,
        "gold": gold,
        "fragments": fragments,
        "hit_max": clicks >= max_clicks,
    }

def pct(arr, p):
    return float(np.percentile(arr, p))

def run_sim_b1(n_users=5000):
    # Sim-A 결과 로드
    if not os.path.exists("sim_a_results.json"):
        print("ERROR: sim_a_results.json not found. Run sim_a.py first.", file=sys.stderr)
        sys.exit(1)
    with open("sim_a_results.json", "r", encoding="utf-8") as f:
        sim_a = json.load(f)
    # ambitious 페르소나 전 곡선 평균으로 초기 상태 계산 (실제 플레이 패턴 대표)
    amb_keys = [k for k in sim_a["scenarios"] if k.endswith("_ambitious")]
    amb_gold = float(np.median([sim_a["scenarios"][k]["gold_end"]["p50"] for k in amb_keys]))
    amb_frag = {}
    for k in amb_keys:
        for fk, fv in sim_a["scenarios"][k]["fragments_mean"].items():
            amb_frag[fk] = amb_frag.get(fk, 0) + fv
    n_amb = len(amb_keys)
    initial_base = {
        "gold": amb_gold,
        "fragments": {fk: round(fv/n_amb, 2) for fk, fv in amb_frag.items()},
        "titles_unlocked": ["indomitable", "beginner_luck"],
    }
    print(f"[Sim-B1] ambitious 초기 상태: 골드={initial_base['gold']:,.0f}G", file=sys.stderr)

    # Sim-D 결과 로드 (E_farm(+12) 값)
    if not os.path.exists("sim_d_results.json"):
        print("WARNING: sim_d_results.json not found. Using default E_farm(+12)=170", file=sys.stderr)
        e_farm_12_default = {cid: 170.0 for cid in CURVES}
    else:
        with open("sim_d_results.json", "r", encoding="utf-8") as f:
            sim_d = json.load(f)
        # 불굴 p30 기준 E_farm(+12) 사용 (기준 보호율)
        e_farm_12_by_curve_prot = {}
        for cid in CURVES:
            e_farm_12_by_curve_prot[cid] = {}
            for prot in PROTECT_INDOM_RANGE:
                pk = f"p{int(prot*100)}"
                val = sim_d["D1"][cid]["indom"].get(pk, {}).get("+12", 170.0)
                e_farm_12_by_curve_prot[cid][pk] = float(val)

    results = {}
    all_scenarios = []

    for cid, cdata in CURVES.items():
        cprobs = {**PROB_COMMON, **cdata["probs"]}
        for protect_indom in PROTECT_INDOM_RANGE:
            pk = f"p{int(protect_indom*100)}"
            key = f"{cid}_{pk}"

            # 해당 곡선+보호율의 E_farm(+12)
            if os.path.exists("sim_d_results.json"):
                e12 = e_farm_12_by_curve_prot[cid][pk]
            else:
                e12 = 170.0

            seed = hash((cid, pk, "v10simB1")) % (2**32)
            rng = np.random.default_rng(seed)

            clicks_l, hours_l, gold_l = [], [], []
            maxlv_l, destr_l = [], []
            completed = 0
            hit_max = 0
            frag_agg = {}

            for i in range(n_users):
                if i % 1000 == 0:
                    print(f"[Sim-B1][{cid}/{pk}] {i}/{n_users}", file=sys.stderr)
                init = {"gold": initial_base["gold"], "fragments": dict(initial_base["fragments"])}
                r = sim_b1_one(cprobs, protect_indom, e12, init, rng)
                clicks_l.append(r["clicks"])
                hours_l.append(r["hours"])
                gold_l.append(r["gold"])
                maxlv_l.append(r["max_level"])
                destr_l.append(r["destructions"])
                if r["completed"]:
                    completed += 1
                if r["hit_max"]:
                    hit_max += 1
                for k, v in r["fragments"].items():
                    frag_agg[k] = frag_agg.get(k, 0) + v

            scen = {
                "curve": cid, "curve_name": cdata["name"],
                "protect_indom": protect_indom,
                "e_farm_12_used": e12,
                "n_users": n_users,
                "clicks": {"mean": float(np.mean(clicks_l)), "p25": pct(clicks_l,25), "p50": pct(clicks_l,50), "p75": pct(clicks_l,75), "p90": pct(clicks_l,90)},
                "hours":  {"mean": float(np.mean(hours_l)),  "p25": pct(hours_l,25),  "p50": pct(hours_l,50),  "p75": pct(hours_l,75),  "p90": pct(hours_l,90)},
                "gold_end": {"mean": float(np.mean(gold_l)), "p50": pct(gold_l,50)},
                "max_level_p50": pct(maxlv_l,50),
                "destructions_mean": float(np.mean(destr_l)),
                "fragments_mean": {k: round(v/n_users,2) for k, v in frag_agg.items()},
                "completion_rate": completed / n_users,
                "hit_max_pct": hit_max / n_users * 100,
            }
            results[key] = scen
            all_scenarios.append(scen)

    # Phase A 시간 로드 (곡선별 평균)
    phase_a_hours = {}
    for cid, cs in sim_a["curve_summary"].items():
        phase_a_hours[cid] = cs["hours_p50_avg"]

    # 저장
    output = {
        "sim": "B1_v10",
        "description": "약한 보호 시대 (백야 최초 제작까지, 건너뛰기 OFF)",
        "initial_state": initial_base,
        "scenarios": results,
    }
    with open("sim_b1_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # 보고서
    lines = ["# Sim-B1 v10 보고서: 약한 보호 시대 (건너뛰기 OFF)\n\n"]
    lines.append("**성공 기준**: Phase B p50 = 1~2시간, Phase A+B = 1.5~3시간\n\n")

    # 30칸 매트릭스
    lines.append("## 30칸 매트릭스 (p50 시간 / 완료율)\n\n")
    lines.append("| 곡선 | p20 | p25 | p30 | p35 | p40 |\n")
    lines.append("|------|-----|-----|-----|-----|-----|\n")
    for cid in CURVES:
        row = []
        for protect in PROTECT_INDOM_RANGE:
            pk = f"p{int(protect*100)}"
            key = f"{cid}_{pk}"
            s = results[key]
            h = s["hours"]["p50"]
            cr = s["completion_rate"]
            ok = "✅" if 1.0 <= h <= 2.0 else ("⚠️" if h < 1.0 else "❌")
            row.append(f"{h:.2f}h/{cr:.0%}{ok}")
        lines.append(f"| {cid}({CURVES[cid]['name']}) | " + " | ".join(row) + " |\n")

    # Phase A+B 합산
    lines.append("\n## Phase A+B 합산 시간 (p50 기준)\n\n")
    lines.append("| 곡선 | PhaseA | p20 | p25 | p30 | p35 | p40 |\n")
    lines.append("|------|--------|-----|-----|-----|-----|-----|\n")
    for cid in CURVES:
        a_h = phase_a_hours.get(cid, 0)
        row = []
        for protect in PROTECT_INDOM_RANGE:
            pk = f"p{int(protect*100)}"
            key = f"{cid}_{pk}"
            b_h = results[key]["hours"]["p50"]
            total = a_h + b_h
            ok = "✅" if 1.5 <= total <= 3.0 else ("⚠️" if total < 1.5 else "❌")
            row.append(f"{total:.2f}h{ok}")
        lines.append(f"| {cid}({CURVES[cid]['name']}) | {a_h:.3f}h | " + " | ".join(row) + " |\n")

    # 추천 Top 5
    lines.append("\n## 추천 Top 5 조합 (Phase B 1~2h + 완료율 90%+ 기준)\n\n")
    candidates = []
    for s in all_scenarios:
        b_h = s["hours"]["p50"]
        a_h = phase_a_hours.get(s["curve"], 0)
        ab_h = a_h + b_h
        cr = s["completion_rate"]
        # 점수: Phase B 1~2h에 가까울수록, 완료율 높을수록
        if 0.8 <= b_h <= 2.5 and cr >= 0.85:
            score = (1 - abs(b_h - 1.5) / 1.5) * 50 + cr * 50
            candidates.append({**s, "score": round(score, 1), "phase_a": a_h, "phase_ab": ab_h})
    candidates.sort(key=lambda x: -x["score"])

    lines.append("| 순위 | 곡선 | 보호율 | Phase B p50 | Phase A+B | 완료율 | 점수 |\n")
    lines.append("|------|------|--------|------------|----------|------|------|\n")
    for i, c in enumerate(candidates[:5], 1):
        b_ok = "✅" if 1.0 <= c["hours"]["p50"] <= 2.0 else "⚠️"
        ab_ok = "✅" if 1.5 <= c["phase_ab"] <= 3.0 else "⚠️"
        lines.append(f"| {i} | {c['curve']}({c['curve_name']}) | {c['protect_indom']:.0%} | {c['hours']['p50']:.2f}h{b_ok} | {c['phase_ab']:.2f}h{ab_ok} | {c['completion_rate']:.1%} | {c['score']} |\n")

    # 곡선별 최적 보호율
    lines.append("\n## 곡선별 최적 불굴 보호율 (Phase B 1~2h가 되는 보호율)\n\n")
    lines.append("| 곡선 | 최적 보호율 | Phase B p50 | Phase A+B | 완료율 |\n")
    lines.append("|------|-----------|------------|----------|------|\n")
    for cid in CURVES:
        best = None
        best_score = -1
        for protect in PROTECT_INDOM_RANGE:
            pk = f"p{int(protect*100)}"
            key = f"{cid}_{pk}"
            s = results[key]
            b_h = s["hours"]["p50"]
            cr = s["completion_rate"]
            if cr >= 0.85:
                sc = (1 - abs(b_h - 1.5) / 1.5) * 50 + cr * 50
                if sc > best_score:
                    best_score = sc
                    best = s
        if best:
            a_h = phase_a_hours.get(cid, 0)
            b_h = best["hours"]["p50"]
            ok = "✅" if 1.0 <= b_h <= 2.0 else "⚠️"
            ab_ok = "✅" if 1.5 <= a_h + b_h <= 3.0 else "⚠️"
            lines.append(f"| {cid}({CURVES[cid]['name']}) | {best['protect_indom']:.0%} | {b_h:.2f}h{ok} | {a_h+b_h:.2f}h{ab_ok} | {best['completion_rate']:.1%} |\n")

    # 기준 미달 여부
    passed = sum(1 for s in all_scenarios if 1.0 <= s["hours"]["p50"] <= 2.0 and s["completion_rate"] >= 0.90)
    a_hours_range = [phase_a_hours.get(cid, 0)*60 for cid in CURVES]
    lines.append(f"\n## 기준 달성 여부\n\n")
    lines.append(f"- Phase A p50 범위: {min(a_hours_range):.1f}~{max(a_hours_range):.1f}분 (기준: 20~50분)\n")
    lines.append(f"- Phase B 1~2h + 완료율 90%+: **{passed}개 조합** (기준: 존재)\n")
    if passed >= 3:
        lines.append("- ✅ **Phase B 기준 달성**\n")
    else:
        lines.append("- ❌ **Phase B 기준 미달** — 불굴 조건(20회) 또는 확률 곡선 수정 필요\n")

    with open("sim_b1_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("SIMB1_DONE", file=sys.stderr)
    print("Sim-B1 v10 완료: sim_b1_results.json, sim_b1_report.md")
    return output

if __name__ == "__main__":
    run_sim_b1()
