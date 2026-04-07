"""
Sim-D v10: 해석적 E_farm + 건너뛰기 분석
D-1: 보호 없음/불굴/검성별 E_farm (Markov chain)
D-2: 건너뛰기 절약 효과
D-3: Phase B 예상 시간 (+0→+17, 불굴 보호율별)
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

MATERIAL_REQ = {17:[(12,1)],18:[(12,1)],19:[(12,2)],20:[(16,1)],21:[(11,1)],22:[(16,1)],23:[(2,1)],24:[(16,1)],25:[(16,2),(12,1)]}

def get_prob(curve_probs, target):
    return PROB_COMMON.get(target, curve_probs.get(target, 0))

def solve_e_farm(probs_full, protect, target_level):
    """
    +0 → target_level 기대 클릭 (Markov chain).
    실패 시: protect 확률로 레벨 유지, 1-protect 확률로 +0 리셋.
    """
    n = target_level
    if n <= 0:
        return 0.0
    A = np.zeros((n, n))
    b = np.ones(n)

    for i in range(n):
        target = i + 1
        p = get_prob(probs_full, target)
        fail = 1.0 - p
        stay = fail * protect
        reset = fail * (1.0 - protect)

        A[i][i] = 1.0 - stay
        if target < n:
            A[i][target] = -p
        A[i][0] -= reset

    try:
        E = np.linalg.solve(A, b)
        return float(E[0])
    except np.linalg.LinAlgError:
        return float('inf')

def solve_visits_per_level(probs_full, protect, target_level):
    """
    +0 → target_level 달성 시 각 레벨에서의 평균 시도 횟수 계산.
    level i에서 시도 횟수 = E[i] 의 분해.
    단순화: E_farm 값의 레벨별 기여분 추정.
    Returns: {level: expected_visits} for 0..target_level-1
    """
    n = target_level
    if n <= 0:
        return {}
    # 해석적으로 각 상태의 방문 횟수를 구함
    # E[i] = 총 방문 횟수가 아니라 기대 클릭 기여분
    # 간이 계산: V[i] = 1/p[i+1] × (1 + (1-p[i+1])*(1-protect) * V[0])
    # 이는 복잡하므로, 재귀적으로 계산
    # 간이 방법: E_farm(i→i+1) / p[i+1] ≈ 1/p[i+1]이 각 레벨 방문당 시도
    # 최종 결과만 사용하므로 E_farm 전체만 반환
    return {i: 1.0 / get_prob(probs_full, i+1) for i in range(n)}

def run_sim_d():
    results = {}

    # ── D-1: E_farm ─────────────────────────────────────────
    print("[Sim-D] D-1: E_farm 계산...", file=sys.stderr)
    d1 = {}
    no_protect_targets = [2, 7, 8, 11, 12, 16, 17]

    for cid, cprobs_raw in CURVES.items():
        cprobs = {**PROB_COMMON, **cprobs_raw}
        d1[cid] = {"name": CURVE_NAMES[cid], "no_protect": {}, "indom": {}, "saint": {}}

        # 보호 없음
        for t in no_protect_targets:
            e = solve_e_farm(cprobs, 0.0, t)
            d1[cid]["no_protect"][f"+{t}"] = round(e, 2)

        # 불굴 보호율별 → +12, +16, +17
        for prot in PROTECT_INDOM_RANGE:
            pk = f"p{int(prot*100)}"
            d1[cid]["indom"][pk] = {}
            for t in [12, 16, 17]:
                e = solve_e_farm(cprobs, prot, t)
                d1[cid]["indom"][pk][f"+{t}"] = round(e, 2)

        # 검성 보호율별 → +12, +16
        for prot in PROTECT_SAINT_RANGE:
            pk = f"p{int(prot*100)}"
            d1[cid]["saint"][pk] = {}
            for t in [12, 16]:
                e = solve_e_farm(cprobs, prot, t)
                d1[cid]["saint"][pk][f"+{t}"] = round(e, 2)

    results["D1"] = d1

    # ── D-2: 건너뛰기 절약 효과 ──────────────────────────────
    print("[Sim-D] D-2: 건너뛰기 절약...", file=sys.stderr)
    d2 = {}
    # 건너뛰기 목표: +5, +7, +8, +12
    skip_targets = [5, 7, 8, 12]

    for cid, cprobs_raw in CURVES.items():
        cprobs = {**PROB_COMMON, **cprobs_raw}
        d2[cid] = {"name": CURVE_NAMES[cid], "skip_savings": {}}
        e_zero_to_target = {}
        for t in skip_targets:
            e_full = solve_e_farm(cprobs, 0.0, t)
            e_zero_to_target[t] = e_full
            d2[cid]["skip_savings"][f"+{t}"] = {
                "e_full": round(e_full, 2),
                "e_after_skip": 0.0,
                "saved": round(e_full, 2),
                "saved_pct": 100.0,
            }
        # 불굴 보호 적용 시 +12 건너뛰기 절약
        for prot in PROTECT_INDOM_RANGE:
            pk = f"p{int(prot*100)}"
            e_full_12 = solve_e_farm(cprobs, prot, 12)
            d2[cid][f"skip+12_indom_{pk}"] = round(e_full_12, 2)

    results["D2"] = d2

    # ── D-3: Phase B 예상 시간 (+0 → +17, 불굴 보호율별) ──────
    print("[Sim-D] D-3: Phase B 예상 시간...", file=sys.stderr)
    d3 = {}

    for cid, cprobs_raw in CURVES.items():
        cprobs = {**PROB_COMMON, **cprobs_raw}
        d3[cid] = {"name": CURVE_NAMES[cid], "e_push_17": {}, "e_total_17_with_material": {}}

        for prot in PROTECT_INDOM_RANGE:
            pk = f"p{int(prot*100)}"
            # E_push(+17): +0→+17 기대 클릭 (불굴 보호 적용)
            e_push = solve_e_farm(cprobs, prot, 17)
            d3[cid]["e_push_17"][pk] = round(e_push, 2)

            # 재료 비용: +17 강화 시 엑스칼리버(+12) 1개 필요
            # 각 +16→+17 시도마다 성공 전까지 재료 소모
            # 재료 방문 횟수 = E_farm(+16 → +17 시도 횟수) = E_push(+17) - E_push(+16)
            # 단순 계산: +16에서의 평균 시도 수 = 1/(p17) + 실패 시 재료 재조달
            # 재료 총 비용 = (평균 +17 시도 횟수) × E_farm(+12)
            e_push_16 = solve_e_farm(cprobs, prot, 16)
            p17 = get_prob(cprobs, 17)
            fail_p17 = 1.0 - p17
            # 불굴 보호 시 +17에서의 평균 시도 = 1/(p17 + fail*protect) ... 복잡
            # 간이: +16에서 +17까지 평균 강화 시도 횟수
            # = E_farm(17) - E_farm(16) 근사 (단, Markov 체인 비선형성 있음)
            # 실제로는: E[level=16] = 1 + p17*0 + fail*(protect*E[16] + reset*E[0])
            # 단순화: avg_tries_at_16 ≈ 1/(p17*(1-fail*(1-protect))) ...
            # 여기서는 간이 추정: 재료 소모 횟수 ≈ (E_push17 - E_push16) / (1/(1-fail*(1-protect)))
            # 가장 단순한 근사: 재료 방문 횟수 = 1/p17 (보호 있어도 소모)
            # 보호율 protect에서: 평균 시도 = 1/(p17) (성공 전 시도 횟수는 1/p17와 유사)
            # 단, 보호 발동 시에도 재료 소모됨
            avg_mat_uses = 1.0 / p17 if p17 > 0 else float('inf')
            e_mat_12 = solve_e_farm(cprobs, 0.0, 12)  # 재료 파밍은 보호 없이
            e_total = e_push + avg_mat_uses * e_mat_12
            d3[cid]["e_total_17_with_material"][pk] = {
                "e_push": round(e_push, 2),
                "avg_mat_uses": round(avg_mat_uses, 2),
                "e_mat_12": round(e_mat_12, 2),
                "e_total": round(e_total, 2),
                "hours_p50_est": round(e_push / 1200, 3),
                "hours_total_est": round(e_total / 1200, 3),
            }

    results["D3"] = d3

    # ── 저장 ────────────────────────────────────────────────
    with open("sim_d_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # 보고서
    lines = ["# Sim-D v10 보고서: 해석적 E_farm\n\n"]

    lines.append("## D-1: E_farm 요약 (보호 없음)\n\n")
    lines.append("| 곡선 | +7 | +8 | +12 | +16 | +17 |\n")
    lines.append("|------|-----|-----|------|------|------|\n")
    for cid in CURVES:
        row = d1[cid]["no_protect"]
        lines.append(f"| {cid}({CURVE_NAMES[cid]}) | {row.get('+7','?'):.1f} | {row.get('+8','?'):.1f} | {row.get('+12','?'):.1f} | {row.get('+16','?'):.1f} | {row.get('+17','?'):.1f} |\n")

    lines.append("\n## D-1: 불굴 보호율별 E_farm(+12)\n\n")
    lines.append("| 곡선 | p20 | p25 | p30 | p35 | p40 |\n")
    lines.append("|------|-----|-----|-----|-----|-----|\n")
    for cid in CURVES:
        vals = [d1[cid]["indom"].get(f"p{int(p*100)}", {}).get("+12", "?") for p in PROTECT_INDOM_RANGE]
        lines.append(f"| {cid} | " + " | ".join(f"{v:.1f}" if isinstance(v,float) else str(v) for v in vals) + " |\n")

    lines.append("\n## D-3: Phase B 예상 시간 (push + 재료, 불굴 보호율별)\n\n")
    for cid in CURVES:
        lines.append(f"### {cid} ({CURVE_NAMES[cid]})\n")
        lines.append("| 보호율 | push(+0→+17) | 재료횟수 | 재료클릭 | 총계 | 시간(push) | 시간(총계) |\n")
        lines.append("|--------|------------|--------|--------|------|-----------|----------|\n")
        for prot in PROTECT_INDOM_RANGE:
            pk = f"p{int(prot*100)}"
            info = d3[cid]["e_total_17_with_material"].get(pk, {})
            lines.append(f"| {prot:.0%} | {info.get('e_push','?'):.0f} | {info.get('avg_mat_uses','?'):.2f} | {info.get('e_mat_12','?'):.0f} | {info.get('e_total','?'):.0f} | {info.get('hours_p50_est','?'):.2f}h | {info.get('hours_total_est','?'):.2f}h |\n")
        lines.append("\n")

    lines.append("## D-3 요약: Phase B p50 예상 (총계 기준, 시간)\n\n")
    lines.append("| 곡선 | p20 | p25 | p30 | p35 | p40 | 목표1~2h |\n")
    lines.append("|------|-----|-----|-----|-----|-----|--------|\n")
    for cid in CURVES:
        vals = []
        for prot in PROTECT_INDOM_RANGE:
            pk = f"p{int(prot*100)}"
            h = d3[cid]["e_total_17_with_material"].get(pk, {}).get("hours_total_est", 0)
            ok = "✅" if 1.0 <= h <= 2.0 else ("⚠️" if h < 1.0 else "❌")
            vals.append(f"{h:.2f}h{ok}")
        in_range = sum(1 for p in PROTECT_INDOM_RANGE if 1.0 <= d3[cid]["e_total_17_with_material"].get(f"p{int(p*100)}", {}).get("hours_total_est", 0) <= 2.0)
        lines.append(f"| {cid}({CURVE_NAMES[cid]}) | " + " | ".join(vals) + f" | {in_range}/5 |\n")

    with open("sim_d_report.md", "w", encoding="utf-8") as f:
        f.writelines(lines)

    print("SIMD_DONE", file=sys.stderr)
    print("Sim-D v10 완료: sim_d_results.json, sim_d_report.md")
    return results

if __name__ == "__main__":
    run_sim_d()
