"""
종합 보고서: Sim-A + B + C + D 결과 합산
총 플레이타임 산정, 점수 산정, Top 5 추천
"""
import json, sys, os
import numpy as np

def total_score(a_hours, b_hours, c_hours, achievement_rate, p50_hours, p90_hours):
    total_hours = a_hours + b_hours + c_hours
    score = 0.0

    # 1. 총 플레이타임 (35점) — 5~7시간, 6시간 최적
    if total_hours <= 14.0:  # 합리적 범위
        if 5.0 <= total_hours <= 7.0:
            dev = abs(total_hours - 6.0) / 6.0
            score += (1 - dev) * 35
        elif 4.0 <= total_hours < 5.0:
            score += 15
        elif 7.0 < total_hours <= 9.0:
            score += 20

    # 2. Phase 비율 (25점)
    if total_hours > 0:
        a_ratio = a_hours / total_hours
        b_ratio = b_hours / total_hours
        c_ratio = c_hours / total_hours
        if 0.15 <= a_ratio <= 0.45 and 0.20 <= b_ratio <= 0.45 and 0.20 <= c_ratio <= 0.50:
            score += 25
        elif 0.10 <= a_ratio <= 0.50 and 0.15 <= b_ratio <= 0.50:
            score += 15

    # 3. 달성률 (15점)
    score += min(achievement_rate / 0.95, 1.0) * 15

    # 4. 분산 적절성 (15점)
    if p50_hours > 0:
        var = p90_hours / p50_hours
        if 1.4 <= var <= 2.5:
            score += 15
        elif 1.2 <= var <= 3.0:
            score += 8

    # 5. 초반 파괴 체감 (10점)
    if a_hours >= 1.0:
        score += 10
    elif a_hours >= 0.5:
        score += 5

    return round(score, 1)

def run_final():
    # 데이터 로드
    files = {
        "a": "sim_a_results.json",
        "b": "sim_b_results.json",
        "c": "sim_c_results.json",
        "d": "sim_d_results.json",
    }
    data = {}
    for k, fname in files.items():
        if os.path.exists(fname):
            with open(fname, "r", encoding="utf-8") as f:
                data[k] = json.load(f)
        else:
            print(f"WARNING: {fname} not found", file=sys.stderr)
            data[k] = None

    if not all(data[k] for k in ("a", "b", "c")):
        print("ERROR: A/B/C 결과가 없습니다.", file=sys.stderr)
        sys.exit(1)

    # ── 시나리오별 총합 산정 ───────────────────────────────────
    # A: 곡선별/전 페르소나 평균
    a_curve = {}
    for key, scen in data["a"]["scenarios"].items():
        cid = scen["curve"]
        if cid not in a_curve:
            a_curve[cid] = []
        a_curve[cid].append(scen["hours"]["mean"])
    a_hours_by_curve = {cid: sum(v)/len(v) for cid, v in a_curve.items()}

    # B: 곡선 × 불굴보호율
    b_by_key = {}
    for key, scen in data["b"]["scenarios"].items():
        cid = scen["curve"]
        protect_i = scen["protect_indom"]
        bkey = f"{cid}_pi{int(protect_i*100)}"
        b_by_key[bkey] = scen["hours"]["mean"]

    # C: 곡선 × 검성보호율
    c_by_key = {}
    for key, scen in data["c"]["scenarios"].items():
        cid = scen["curve"]
        protect_s = scen["protect_saint"]
        ckey = f"{cid}_ps{int(protect_s*100)}"
        c_by_key[ckey] = {
            "hours_mean": scen["hours"]["mean"],
            "hours_p50": scen["hours"]["p50"],
            "hours_p90": scen["hours"]["p90"],
            "achievement_rate": scen["achievement_rate"],
        }

    # ── 전체 조합 시나리오 산정 ───────────────────────────────────
    # 각 곡선 × 불굴보호율 × 검성보호율 조합
    all_combos = []
    b_indom_rates = [0.20, 0.25, 0.30, 0.35, 0.40]
    c_saint_rates = [0.50, 0.55, 0.60]

    for cid in ["C1","C2","C3","C4","C5","C6"]:
        a_h = a_hours_by_curve.get(cid, 0)
        for pi in b_indom_rates:
            b_k = f"{cid}_pi{int(pi*100)}"
            b_h = b_by_key.get(b_k, 0)
            for ps in c_saint_rates:
                c_k = f"{cid}_ps{int(ps*100)}"
                c_info = c_by_key.get(c_k, {})
                c_h = c_info.get("hours_mean", 0)
                ach = c_info.get("achievement_rate", 0)
                p50 = c_info.get("hours_p50", 0)
                p90 = c_info.get("hours_p90", 0)

                total_h = a_h + b_h + c_h
                sc = total_score(a_h, b_h, c_h, ach, p50, p90)

                all_combos.append({
                    "curve": cid,
                    "curve_name": {"C1":"깊은골짜기","C2":"완만학습","C3":"극적반전","C4":"높은바닥","C5":"이중골짜기","C6":"후반관대"}[cid],
                    "protect_indom": pi,
                    "protect_saint": ps,
                    "phase_a_hours": round(a_h, 3),
                    "phase_b_hours": round(b_h, 3),
                    "phase_c_hours": round(c_h, 3),
                    "total_hours": round(total_h, 3),
                    "achievement_rate": round(ach, 3),
                    "p50_hours": round(p50, 3),
                    "p90_hours": round(p90, 3),
                    "score": sc,
                    "in_target_range": 5.0 <= total_h <= 7.0,
                })

    # 점수순 정렬
    all_combos.sort(key=lambda x: -x["score"])

    # ── 성공 기준 체크 ────────────────────────────────────────
    in_range = [c for c in all_combos if c["in_target_range"]]
    high_achieve = [c for c in all_combos if c["achievement_rate"] >= 0.95]
    top_score = all_combos[0]["score"] if all_combos else 0
    criteria_met = {
        "total_in_range_count": len(in_range),
        "high_achievement_count": len(high_achieve),
        "top_score": top_score,
        "criteria_pass": len(in_range) >= 3 and len(high_achieve) >= 1 and top_score >= 60,
    }

    # ── Top 10 저장 ──────────────────────────────────────────
    top10 = all_combos[:10]

    # ── 최적 조합 확정 ────────────────────────────────────────
    best = all_combos[0]

    # config.json 형태 출력
    best_curve_id = best["curve"]
    best_probs_raw = {
        "C1": {8:0.73,9:0.67,10:0.60,11:0.53,12:0.46,13:0.40,14:0.65,15:0.58,16:0.52,17:0.42,18:0.38,19:0.35,20:0.35,21:0.35,22:0.42,23:0.50,24:0.57,25:0.63},
        "C2": {8:0.75,9:0.70,10:0.65,11:0.60,12:0.55,13:0.48,14:0.65,15:0.60,16:0.55,17:0.45,18:0.42,19:0.40,20:0.38,21:0.38,22:0.45,23:0.52,24:0.58,25:0.63},
        "C3": {8:0.73,9:0.67,10:0.60,11:0.53,12:0.45,13:0.38,14:0.70,15:0.65,16:0.58,17:0.48,18:0.43,19:0.40,20:0.38,21:0.38,22:0.45,23:0.52,24:0.60,25:0.65},
        "C4": {8:0.75,9:0.70,10:0.65,11:0.60,12:0.55,13:0.50,14:0.68,15:0.63,16:0.58,17:0.52,18:0.48,19:0.46,20:0.45,21:0.45,22:0.50,23:0.55,24:0.60,25:0.65},
        "C5": {8:0.73,9:0.67,10:0.60,11:0.53,12:0.46,13:0.40,14:0.65,15:0.60,16:0.58,17:0.50,18:0.45,19:0.40,20:0.35,21:0.35,22:0.42,23:0.50,24:0.58,25:0.65},
        "C6": {8:0.75,9:0.70,10:0.65,11:0.58,12:0.50,13:0.43,14:0.65,15:0.60,16:0.55,17:0.45,18:0.40,19:0.37,20:0.35,21:0.35,22:0.48,23:0.58,24:0.65,25:0.72},
    }
    common_probs = {1:0.95, 2:0.93, 3:0.90, 4:0.87, 5:0.83, 6:0.78, 7:0.73}
    final_probs = {**common_probs, **best_probs_raw[best_curve_id]}

    final_balance = {
        "version": "v9",
        "selected_curve": best_curve_id,
        "curve_name": best["curve_name"],
        "protect_indom": best["protect_indom"],
        "protect_saint": best["protect_saint"],
        "frag_drop_saint": 0.50,
        "expected_total_hours": best["total_hours"],
        "expected_achievement_rate": best["achievement_rate"],
        "score": best["score"],
        "success_rates": {str(k): round(v, 4) for k, v in final_probs.items()},
    }

    # ── 저장 ────────────────────────────────────────────────
    with open("final_balance.json", "w", encoding="utf-8") as f:
        json.dump(final_balance, f, ensure_ascii=False, indent=2)

    final_output = {
        "criteria_met": criteria_met,
        "top10": top10,
        "best": best,
        "all_combos_count": len(all_combos),
    }
    with open("final_report_data.json", "w", encoding="utf-8") as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)

    # ── 최종 보고서 ─────────────────────────────────────────
    lines = ["# 최종 종합 보고서 — v9 밸런싱\n\n"]

    lines.append("## 성공 기준 달성 여부\n\n")
    crit = criteria_met
    lines.append(f"- 5~7시간 시나리오: **{crit['total_in_range_count']}개** (기준: 3개 이상)\n")
    lines.append(f"- 달성률 95%+ 시나리오: **{crit['high_achievement_count']}개**\n")
    lines.append(f"- 최고 점수: **{crit['top_score']}점** (기준: 60점 이상)\n")
    lines.append(f"- **{'✅ 성공 기준 달성' if crit['criteria_pass'] else '❌ 기준 미달 — 하단 제안 참고'}**\n\n")

    lines.append("## Top 10 시나리오\n\n")
    lines.append("| 순위 | 곡선 | 불굴 | 검성 | 총시간 | PhaseA | PhaseB | PhaseC | 달성률 | 점수 |\n")
    lines.append("|------|------|------|------|--------|--------|--------|--------|--------|------|\n")
    for i, combo in enumerate(top10, 1):
        lines.append(f"| {i} | {combo['curve']}({combo['curve_name']}) | {combo['protect_indom']:.0%} | {combo['protect_saint']:.0%} | {combo['total_hours']:.2f}h | {combo['phase_a_hours']:.2f}h | {combo['phase_b_hours']:.2f}h | {combo['phase_c_hours']:.2f}h | {combo['achievement_rate']:.1%} | {combo['score']} |\n")

    lines.append("\n## 최우수 조합 (1위)\n\n")
    lines.append(f"- **곡선**: {best['curve']} — {best['curve_name']}\n")
    lines.append(f"- **불굴의 대장장이 보호율**: {best['protect_indom']:.0%}\n")
    lines.append(f"- **검성의 대장장이 보호율**: {best['protect_saint']:.0%}\n")
    lines.append(f"- **총 플레이타임**: {best['total_hours']:.2f}시간 (Phase A: {best['phase_a_hours']:.2f}h / B: {best['phase_b_hours']:.2f}h / C: {best['phase_c_hours']:.2f}h)\n")
    lines.append(f"- **+25 달성률**: {best['achievement_rate']:.1%}\n")
    lines.append(f"- **종합 점수**: {best['score']}/100\n\n")

    lines.append("## config.json 반영 데이터\n\n")
    lines.append("```json\n")
    lines.append(json.dumps(final_balance, ensure_ascii=False, indent=2))
    lines.append("\n```\n\n")

    if not crit["criteria_pass"]:
        lines.append("## 기준 미달 — 수정 제안\n\n")
        lines.append("현재 파라미터로 기준 달성이 어렵습니다. 다음 방향을 검토하세요:\n\n")
        if crit["total_in_range_count"] == 0:
            # 총 시간이 너무 긴지 짧은지 확인
            avg_time = sum(c["total_hours"] for c in all_combos) / len(all_combos) if all_combos else 0
            if avg_time > 7:
                lines.append("1. **확률 상향** — 전반적으로 성공률이 낮아 시간이 너무 깁니다\n")
                lines.append("   - C2(완만학습) 또는 C4(높은바닥) 기반으로 +8~+13 구간 5~10%p 상향 시도\n")
            else:
                lines.append("1. **확률 하향** — 시간이 너무 짧습니다. +17~+21 구간 5%p 하향 시도\n")
        if crit["high_achievement_count"] == 0:
            lines.append("2. **보호율 상향** — 검성 보호율 65~70%로 상향 테스트 필요\n")
        lines.append("3. **건너뛰기 비용 하향** — 조각 요구량 50% 감소로 Phase B~C 단축\n")

    # D 결과 요약
    if data["d"]:
        lines.append("\n## D-1: 핵심 E_farm 값 요약 (보호 없음, +0→목표)\n\n")
        d1 = data["d"].get("D1_efarm", {})
        lines.append("| 곡선 | +7 | +12 | +16 |\n")
        lines.append("|------|-----|------|------|\n")
        for cid in ["C1","C2","C3","C4","C5","C6"]:
            row = d1.get(cid, {}).get("no_protect", {})
            lines.append(f"| {cid} | {row.get('+7','?'):.1f} | {row.get('+12','?'):.1f} | {row.get('+16','?'):.1f} |\n")

        lines.append("\n## D-2: 건너뛰기 절약 (곡선 평균, 검성→+8)\n\n")
        d2 = data["d"].get("D2_skip_effect", {})
        saved_pcts = []
        for cid in ["C1","C2","C3","C4","C5","C6"]:
            sc = d2.get(cid, {}).get("scenarios", {}).get("sword_saint", {})
            sp = sc.get("saved_pct", 0)
            saved_pcts.append(sp)
        if saved_pcts:
            lines.append(f"- 검성(+8 건너뛰기) 절약률 평균: **{sum(saved_pcts)/len(saved_pcts):.1f}%**\n")

    with open("final_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("종합 보고서 완료: final_report.md, final_balance.json")
    print(f"기준 달성: {'YES' if crit['criteria_pass'] else 'NO'}")
    print(f"최고 점수: {top_score}점 (1위: {best['curve']} 불굴{best['protect_indom']:.0%}/검성{best['protect_saint']:.0%})")
    return final_output

if __name__ == "__main__":
    run_final()
