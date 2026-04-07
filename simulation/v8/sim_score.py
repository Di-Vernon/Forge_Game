"""
v8 Agent 4 - 점수 산정 & 체감 분석
phase_a/b/c_results.json 읽어 24 시나리오 점수 계산
기준 미달 시 확률 곡선 수정 제안 포함
"""
import json, sys
from pathlib import Path

BASE = Path(__file__).parent

def load(name):
    with open(BASE / name, encoding="utf-8") as f:
        return json.load(f)

pa = load("phase_a_results.json")
pb = load("phase_b_results.json")
pc = load("phase_c_results.json")

def calculate_score(pa_h, pb_h, pc_h, ach_rate, sec_ratios, p90_h, p50_h):
    total = pa_h + pb_h + pc_h
    score = 0.0

    # 1. 총 플레이타임 (35점) — 5.5~6.5h 최적, 최대 7h
    if total <= 7.0:
        dev = abs(total - 6.0) / 6.0
        score += max(0.0, 1.0 - dev) * 35

    # 2. 페이즈 비율 (25점)
    a_r = pa_h / max(total, 0.01)
    b_r = pb_h / max(total, 0.01)
    if 0.20 <= a_r <= 0.50 and 0.35 <= b_r <= 0.65:
        score += 25
    elif 0.15 <= a_r <= 0.55 and 0.30 <= b_r <= 0.70:
        score += 15
    else:
        score += 5

    # 3. 달성 가능성 (15점)
    score += min(ach_rate / 0.95, 1.0) * 15

    # 4. 구간 분포 균형 (15점)
    if sec_ratios:
        max_sec = max(sec_ratios.values())
        score += max(0.0, 1.0 - (max_sec - 0.35) / 0.65) * 15

    # 5. 분산 (10점) — p90/p50 = 1.4~2.5
    if p50_h > 0:
        vr = p90_h / p50_h
        if 1.4 <= vr <= 2.5:
            score += 10
        elif 1.2 <= vr <= 3.0:
            score += 5

    return round(score, 1)

rows = []
for key, bdata in pb.items():
    ck   = bdata["curve"]
    pct  = bdata["protect_pct"]
    cname = bdata["curve_name"]

    pa_h = pa[ck]["hours_p50"]
    pb_h = bdata["analytical_e0_hours"]  # 해석적 E0 사용
    pc_h = pc[key]["total_mat_hours"]
    total_h = pa_h + pb_h + pc_h

    ach  = bdata["mc_achievement_rate"]
    p50  = bdata["mc_hours_p50"]
    p90  = bdata["mc_hours_p90"]
    sec  = bdata["mc_section_ratios"]

    sc = calculate_score(pa_h, pb_h, pc_h, ach, sec, p90, p50)

    a_ratio = pa_h / max(total_h, 0.01)
    b_ratio = pb_h / max(total_h, 0.01)
    c_ratio = pc_h / max(total_h, 0.01)

    rows.append({
        "key": key, "curve": ck, "curve_name": cname, "protect_pct": pct,
        "phase_a_hours": round(pa_h, 2),
        "phase_b_hours": round(pb_h, 2),
        "phase_c_hours": round(pc_h, 2),
        "total_hours":   round(total_h, 2),
        "phase_ratios":  {"A": round(a_ratio, 3), "B": round(b_ratio, 3), "C": round(c_ratio, 3)},
        "achievement_rate": round(ach, 4),
        "mc_p50_hours": round(p50, 2),
        "mc_p90_hours": round(p90, 2),
        "var_ratio":    round(p90 / max(p50, 0.01), 2),
        "section_ratios": {k: round(v, 3) for k, v in sec.items()},
        "score": sc,
        "in_target": 5.0 <= total_h <= 7.0,
    })

rows.sort(key=lambda r: -r["score"])

out_path = BASE / "scoring_results.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

# ── 리포트 작성 ──────────────────────────────────────────────
lines = ["# v8 점수 산정 리포트\n"]
lines.append("## 24 시나리오 결과 요약\n")
lines.append(f"| 순위 | 시나리오 | 총시간 | A | B | C | 달성률 | 점수 |\n")
lines.append(f"|------|---------|-------|---|---|---|-------|------|\n")

for i, r in enumerate(rows, 1):
    flag = " **OK**" if r["in_target"] else ""
    lines.append(
        f"| {i} | {r['curve']}({r['curve_name']}) p={r['protect_pct']:.2f} | "
        f"{r['total_hours']:.1f}h{flag} | {r['phase_a_hours']:.1f}h | "
        f"{r['phase_b_hours']:.1f}h | {r['phase_c_hours']:.1f}h | "
        f"{r['achievement_rate']:.1%} | {r['score']} |\n"
    )

# 성공 기준 평가
ok_count = sum(1 for r in rows if r["in_target"])
top_score = rows[0]["score"] if rows else 0

lines.append(f"\n## 성공 기준 평가\n")
lines.append(f"- 5~7시간 범위 시나리오 수: **{ok_count}/24**\n")
lines.append(f"- 최고 점수: **{top_score}점** (기준: 60점 이상)\n")
lines.append(f"- 최저 총 시간: **{min(r['total_hours'] for r in rows):.1f}h**\n")

if ok_count < 5 or top_score < 60:
    lines.append("\n## 수정 제안 (성공 기준 미달)\n")
    lines.append("""
### 분석: 왜 모든 시나리오가 목표 초과하는가?

Phase C(재료 파밍) 비용이 Phase B(순수 강화)를 초과하는 현상:
- visits[16] (state 16, +17 시도 횟수) = 약 30~83회
- 매 시도마다 재료 소모 → 총 재료 클릭 >> 총 강화 클릭

핵심 원인: `보호 여부 무관하게 항상 소모` 규칙 + 높은 visits 누적.

### 수정 옵션

**옵션 A: 보호 성공 시 재료 보존 (설계 변경)**
- 보호 발동 시 재료 소모 안 함 → Phase C 40~60% 감소
- "보호 = 재료도 보호" 직관적 해석 가능

**옵션 B: 재료 요구사항 단순화**
- +25에만 재료 요구 (현재 17~25 전 구간)
- 또는 +20, +23, +25에만 재료 적용

**옵션 C: 보호율 0.70~0.80으로 상향**
- visits 감소 → Phase C 자연 감소
- Phase B도 감소 → 전체 단축

**최소 변경 권장안 (C4 + 옵션 C + 옵션 B):**
```
protect_pct = 0.75
재료 요구: +25에만 [(16, 1), (12, 1)] 적용
예상 총 시간: ~4-6시간 (별도 시뮬 필요)
```
""")

rpt_path = BASE / "scoring_report.md"
with open(rpt_path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"AGENT4_DONE -> {out_path}, {rpt_path}", file=sys.stderr)
print("AGENT4_DONE")
