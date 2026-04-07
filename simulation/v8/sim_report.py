"""
v8 Agent 5 - 종합 보고서
모든 결과를 읽어 final_report.md + final_balance.json 작성
"""
import json, sys
from pathlib import Path

BASE = Path(__file__).parent

def load(name):
    with open(BASE / name, encoding="utf-8") as f:
        return json.load(f)

pa  = load("phase_a_results.json")
pb  = load("phase_b_results.json")
pc  = load("phase_c_results.json")
sc  = load("scoring_results.json")

rows = sc  # 점수 정렬됨
top3 = rows[:3]
best = rows[0]

MATERIAL_REQ = {17:[(12,1)],18:[(12,1)],19:[(12,2)],20:[(16,1)],21:[(11,1)],22:[(16,1)],23:[(2,1)],24:[(16,1)],25:[(16,2),(12,1)]}

lines = ["# v8 최종 종합 보고서\n\n"]
lines.append(f"생성: 2026-04-05  시나리오: 6 곡선 × 4 보호율 = 24\n\n")

# ── 1. 요약 표 ──────────────────────────────────────────────
lines.append("## 1. 전체 시나리오 결과 요약\n\n")
lines.append("| 순위 | 시나리오 | 총시간 | A시간 | B시간 | C시간 | 달성률 | B구간분포(0-7/8-13/14-16/17-21/22-25) | 점수 |\n")
lines.append("|------|---------|-------|------|------|------|-------|--------------------------------------|------|\n")
for i, r in enumerate(rows, 1):
    key  = r["key"]
    sr   = r.get("section_ratios", {})
    dist = "/".join(f"{sr.get(s,0):.0%}" for s in ["0-7","8-13","14-16","17-21","22-25"])
    flag = " OK" if r["in_target"] else ""
    lines.append(
        f"| {i} | {r['curve']}({r['curve_name']}) p={r['protect_pct']:.2f} | "
        f"{r['total_hours']:.1f}h{flag} | {r['phase_a_hours']:.1f} | "
        f"{r['phase_b_hours']:.1f} | {r['phase_c_hours']:.1f} | "
        f"{r['achievement_rate']:.1%} | {dist} | {r['score']} |\n"
    )

# ── 2. Phase A 결과 ─────────────────────────────────────────
lines.append("\n## 2. Phase A — 칭호 획득 소요 시간\n\n")
lines.append("| 곡선 | p25 | p50(중앙값) | p90 | 타임아웃률 |\n")
lines.append("|------|-----|-----------|-----|----------|\n")
for ck, ad in pa.items():
    lines.append(
        f"| {ck}({ad['curve_name']}) | {ad['clicks_p25']/1200:.1f}h | "
        f"**{ad['hours_p50']:.1f}h** | {ad['clicks_p90']/1200:.1f}h | "
        f"{ad['timeout_rate']:.1%} |\n"
    )

# ── 3. Top 3 시나리오 상세 ───────────────────────────────────
lines.append("\n## 3. 상위 3 시나리오 상세 분석\n")
for rank, r in enumerate(top3, 1):
    key  = r["key"]
    bbd  = pb[key]
    pcd  = pc[key]
    lines.append(f"\n### {rank}위: {r['curve']}({r['curve_name']}) protect={r['protect_pct']:.2f}\n\n")
    lines.append(f"**총 시간: {r['total_hours']:.1f}h** (A:{r['phase_a_hours']:.1f}h + B:{r['phase_b_hours']:.1f}h + C:{r['phase_c_hours']:.1f}h)\n\n")
    lines.append(f"- 달성률: {r['achievement_rate']:.1%}\n")
    lines.append(f"- 해석적 E0(Phase B): {bbd['analytical_e0']:,.0f} clicks\n")
    lines.append(f"- MC p50: {r['mc_p50_hours']:.2f}h / p90: {r['mc_p90_hours']:.2f}h\n")
    lines.append(f"- 분산 비율(p90/p50): {r['var_ratio']:.2f}x\n")
    lines.append(f"- 점수: {r['score']}/100\n\n")

    lines.append("**Phase B 구간 분포:**\n")
    for s, v in r.get("section_ratios", {}).items():
        lines.append(f"  - {s}: {v:.1%}\n")

    lines.append("\n**Phase C 재료 소모:**\n")
    for bk, bv in pcd["breakdown"].items():
        lines.append(f"  - {bk}: visits={bv['visits_n']:.1f} × {bv['count']} × E_farm={bv['e_farm']:.1f} = {bv['mat_clicks']:.0f} clicks\n")

# ── 4. 유저 여정 타임라인 ────────────────────────────────────
lines.append("\n## 4. 유저 여정 타임라인 (1위 시나리오)\n\n")
r1 = top3[0]
lines.append(f"| 시간대 | 구간 | 경험 |\n")
lines.append(f"|--------|------|------|\n")
lines.append(f"| 0~{r1['phase_a_hours']:.1f}h | Phase A | 잿불 칭호 획득 (보호 없음, +0 리셋 반복) |\n")
lines.append(f"| {r1['phase_a_hours']:.1f}~{r1['phase_a_hours']+r1['phase_b_hours']:.1f}h | Phase B | 보호 적용 +0→+25 도전 |\n")
lines.append(f"| (병행) | Phase C | 재료 파밍 (총 {r1['phase_c_hours']:.1f}h) |\n")
lines.append(f"| {r1['total_hours']:.1f}h | 완료 | +25 여명 달성 |\n")

# ── 5. 10회 시도 체험표 ──────────────────────────────────────
lines.append("\n## 5. 체감 분석 — +20 강화 10회 시도 예시\n\n")
r1  = top3[0]
key = r1["key"]
bbd = pb[key]
p20 = bbd["analytical_visits"][19] if len(bbd.get("analytical_visits", [])) > 19 else "?"
p_s = bbd["protect_pct"]
pr_20 = 0.0
if r1["curve"] in ["C1","C5"]: pr_20 = 0.35
elif r1["curve"] == "C3": pr_20 = 0.40
elif r1["curve"] in ["C2","C6"]: pr_20 = 0.40
elif r1["curve"] == "C4": pr_20 = 0.46

succ_per_10 = pr_20 * 10
prot_per_10 = (1-pr_20)*p_s*10
fail_per_10 = (1-pr_20)*(1-p_s)*10
lines.append(f"곡선 {r1['curve']}, protect={p_s:.2f}, +20→+21 시도 확률={pr_20:.0%}\n\n")
lines.append(f"| 결과 | 기대 횟수/10회 |\n")
lines.append(f"|------|---------------|\n")
lines.append(f"| 성공 (+21) | {succ_per_10:.1f}회 |\n")
lines.append(f"| 보호 (머무름) | {prot_per_10:.1f}회 |\n")
lines.append(f"| 파괴 (+0 리셋) | {fail_per_10:.1f}회 |\n")

# ── 6. 재료 체인 확정안 ──────────────────────────────────────
lines.append("\n## 6. 재료 체인 확정안\n\n")
lines.append("```python\nMATERIAL_REQ = {\n")
for t, reqs in MATERIAL_REQ.items():
    r_str = ", ".join(f"({r},{c})" for r,c in reqs)
    lines.append(f"    {t}: [{r_str}],\n")
lines.append("}\n```\n")

# ── 7. 잿불 칭호 확정 스펙 ──────────────────────────────────
lines.append("\n## 7. 잿불의 대장장이 칭호 확정 스펙\n\n")
lines.append("- **획득 조건**: +13 이상에서 5회 파괴 경험\n")
lines.append("- **효과**: 실패 시 `PROTECT_PCT` 확률로 현재 레벨 유지, 나머지는 +0 리셋\n")
lines.append("- **재료 소모**: 보호 발동 시에도 재료 소모 (현행 스펙)\n")
lines.append(f"- **권장 PROTECT_PCT**: {best['protect_pct']:.2f} (최고 점수 시나리오)\n")

# ── 8. 성공 기준 평가 & 변경 권고 ───────────────────────────
ok_count = sum(1 for r in rows if r["in_target"])
lines.append(f"\n## 8. 성공 기준 평가 & 변경 권고\n\n")
lines.append(f"- 5~7시간 범위 시나리오: **{ok_count}/24** (기준: 최소 5개)\n")
lines.append(f"- 최고 점수: **{rows[0]['score']}점** (기준: 60점 이상)\n")
lines.append(f"- 최저 총 시간: **{min(r['total_hours'] for r in rows):.1f}h**\n\n")

if ok_count < 5:
    lines.append("### 기준 미달 원인 분석\n\n")
    lines.append("""Phase C(재료 파밍) 비용이 Phase B 이상으로 누적됨.

핵심 메커니즘:
1. 보호 발동 시에도 재료 소모 → visits[n] 누적 × E_farm = 큰 Phase C
2. 리셋 후 재등반 → visits 재누적
3. 특히 state 16(+17 시도)에서 visits=30~83, E_farm(12)=30~54 → 1,000~4,500 clicks/state

### 권장 변경 사항

**단기 수정 (v8.1)**: 보호 발동 시 재료 보존
- 보호 성공 → 재료 소모 안 함 (재료 재사용)
- Phase C 약 50~60% 감소 예상
- 별도 시뮬 검증 필요

**중기 수정 (v9)**: 재료 요구 구간 축소
- +17~+22 재료 제거, +23/+24/+25에만 적용
- 또는 +25에만 단일 재료 요구

**장기 수정**: 보호율 0.70~0.80 상향 + C4 곡선 조합
- 예상 최적: C4 + protect=0.75 + 재료 보존 규칙
""")

rpt_path = BASE / "final_report.md"
with open(rpt_path, "w", encoding="utf-8") as f:
    f.writelines(lines)

# final_balance.json
best_key = rows[0]["key"]
CURVES_PROBS = {
  "C1": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.46,0.40, 0.65,0.58,0.52, 0.42,0.38,0.35,0.35,0.35, 0.42,0.50,0.57,0.63],
  "C2": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.60,0.55,0.48, 0.65,0.60,0.55, 0.45,0.42,0.40,0.38,0.38, 0.45,0.52,0.58,0.63],
  "C3": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.45,0.38, 0.70,0.65,0.58, 0.48,0.43,0.40,0.38,0.38, 0.45,0.52,0.60,0.65],
  "C4": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.60,0.55,0.50, 0.68,0.63,0.58, 0.52,0.48,0.46,0.45,0.45, 0.50,0.55,0.60,0.65],
  "C5": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.73,0.67,0.60,0.53,0.46,0.40, 0.65,0.60,0.58, 0.50,0.45,0.40,0.35,0.35, 0.42,0.50,0.58,0.65],
  "C6": [0, 0.95,0.93,0.91,0.89,0.86,0.82,0.78, 0.75,0.70,0.65,0.58,0.50,0.43, 0.65,0.60,0.55, 0.45,0.40,0.37,0.35,0.35, 0.48,0.58,0.65,0.72],
}
balance = {
    "best_scenario": best_key,
    "best_score": rows[0]["score"],
    "best_total_hours": rows[0]["total_hours"],
    "success_count": ok_count,
    "best_curve_probs": CURVES_PROBS[rows[0]["curve"]],
    "best_protect_pct": rows[0]["protect_pct"],
    "material_req": {str(k): v for k, v in MATERIAL_REQ.items()},
    "recommendation": "v8_material_preserve_on_protect",
}
bal_path = BASE / "final_balance.json"
with open(bal_path, "w", encoding="utf-8") as f:
    json.dump(balance, f, ensure_ascii=False, indent=2)

print(f"AGENT5_DONE -> {rpt_path}, {bal_path}", file=sys.stderr)
print("AGENT5_DONE")
