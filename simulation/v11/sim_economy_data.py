#!/usr/bin/env python3
"""
sim_economy_data.py — Forge Game Economy Data Collection
V11_C_SetB 시나리오 3,000명 시뮬레이션.
Effort 기반 경제 모델 구축에 필요한 레벨별·조각별·Phase별 세부 데이터 수집.

sim_v11_all.py의 simulate_player를 복사·확장. 기존 상수 그대로 사용.
"""
import numpy as np
import json, time, sys
from pathlib import Path
from collections import defaultdict

# ================================================================
# 안전장치
# ================================================================
WALL_START = time.time()
MAX_WALL   = 300  # 5분

def check_wall():
    if time.time() - WALL_START > MAX_WALL:
        raise TimeoutError(f"벽시계 {MAX_WALL}초 초과 — 결과 부분 저장됨")

OUT_DIR         = Path("C:/Users/PC/project/Forge_Game/simulation/v11")
OUT_DIR.mkdir(parents=True, exist_ok=True)
MC_USERS        = 3_000
CLICKS_PER_HOUR = 1_200
T0 = time.time()

def log(msg):
    print(f"[{time.time()-T0:6.1f}s] {msg}", file=sys.stderr, flush=True)

def save_json(fn, data):
    (OUT_DIR / fn).write_text(
        json.dumps(data, indent=2, ensure_ascii=False, default=str), encoding='utf-8')
    log(f"  → {fn}")

def save_md(fn, text):
    (OUT_DIR / fn).write_text(text, encoding='utf-8')
    log(f"  → {fn}")

def hrs(c): return round(c / CLICKS_PER_HOUR, 3) if c else None
def pct(arr, p):
    if not arr: return None
    return round(float(np.percentile(arr, p)), 3)

# ================================================================
# GAME DATA (sim_v11_all.py에서 그대로 복사)
# ================================================================
INITIAL_GOLD = 2_000

FORGE_COST = {
    0:5,   1:10,  2:15,  3:22,  4:32,  5:48,  6:72,  7:108,
    8:160, 9:235, 10:340, 11:480, 12:680, 13:960, 14:1350,
    15:1900, 16:2700, 17:3800, 18:5300, 19:7400, 20:10400,
    21:14500, 22:20000, 23:28000, 24:0,
}

SELL_PRICE = {
    0:2,    1:12,   2:30,   3:60,   4:120,  5:220,  6:400,  7:700,
    8:1200, 9:2000, 10:3500, 11:6000, 12:10000,
    13:17000, 14:28000, 15:46000, 16:75000,
    17:120000, 18:200000, 19:330000, 20:550000,
    21:900000, 22:1500000, 23:2400000, 24:4000000,
}

MATERIAL_REQ = {
    17:[(12,1)], 18:[(12,1)], 19:[(12,2)],
    20:[(16,1)], 21:[(11,1)], 22:[(16,1)],
    23:[(2,1)],  24:[(16,1)], 25:[(16,2),(12,1)],
}

DROP_TABLE = {
    2:[("rusty_iron",80),("refined_iron",5)],
    3:[("rusty_iron",80),("refined_iron",5)],
    4:[("rusty_iron",80),("refined_iron",5)],
    5:[("rusty_iron",80),("refined_iron",15)],
    6:[("enchanted_iron",40)],
    7:[("rusty_iron",80),("refined_iron",15)],
    8:[("enchanted_iron",40),("unknown_mineral",5)],
    9:[("spirit",15)],
    10:[("moonlight",15)],
    11:[("swordmaster",15)],
    12:[("unknown_mineral",40)],
    13:[("moonlight",15),("spirit",15)],
    14:[("unknown_mineral",40),("enchanted_iron",40),("twisted_mana",3)],
    15:[("moonlight",25)],
    16:[("spirit",25),("unknown_mineral",15)],
    17:[("swordmaster",35)],
    18:[("twisted_mana",35)],
    19:[("spirit",35),("twisted_mana",35)],
    20:[("unknown_mineral",35)],
    21:[("twisted_mana",35)],
    22:[("twisted_mana",35)],
    23:[("rusty_iron",80),("refined_iron",35)],
    24:[("twisted_mana",35)],
}
DROP_BASE   = 0.60
FRAG_SINGLE = 0.80

# V11_C 확률 곡선 (C4 높은바닥, v11 확정)
V11_C = {
    1:.95, 2:.93, 3:.90, 4:.87, 5:.83, 6:.78, 7:.73,
    8:.75, 9:.70, 10:.65, 11:.60, 12:.55,
    13:.50, 14:.68, 15:.63, 16:.58, 17:.52,
    18:.52, 19:.50, 20:.50, 21:.48, 22:.52,
    23:.57, 24:.62, 25:.65,
}

# V11_C_SetB 파라미터
PROT_INDOM = 0.35
PROT_SAINT = 0.60

# 재료 파밍 룩업 (V11_C, protect=0.55 — sim_step1_results.json에서)
MAT_LOOKUP = {
    "2":  {"clicks": 2.2,   "gold": 16.0},
    "11": {"clicks": 33.5,  "gold": 2368.0},
    "12": {"clicks": 47.7,  "gold": 4112.0},
    "16": {"clicks": 150.9, "gold": 23358.0},
}

# 건너뛰기 골드 (MID tier, v11 확정)
SKIP_GOLD = {
    "scavenger":         100,
    "indomitable_smith": 116,
    "sword_saint":       238,
    "master_smith":      4418,
    "refine_peak":       4418,
}

SELL_AT     = 12
PUSH_CHANCE = 0.25

ALL_FRAGS = [
    "rusty_iron", "refined_iron", "enchanted_iron",
    "moonlight", "unknown_mineral", "spirit",
    "swordmaster", "twisted_mana",
]

# ================================================================
# 경제 시뮬레이션 — 1명
# ================================================================
def simulate_player_econ(seed):
    """
    V11_C_SetB 1인 시뮬. sim_v11_all.py의 simulate_player + 7종 추적 데이터.
    """
    rng = np.random.default_rng(seed)
    RBATCH = 8_000
    _rb = rng.random(RBATCH); _ri = 0
    def rand():
        nonlocal _rb, _ri
        if _ri >= RBATCH:
            _rb = rng.random(RBATCH); _ri = 0
        v = _rb[_ri]; _ri += 1; return v

    # ── 기본 상태 ──────────────────────────────────────────────────
    level        = 0
    gold         = INITIAL_GOLD
    frags        = defaultdict(int)
    mat_inv      = defaultdict(int)
    equipped     = None
    unlocked     = set()
    dest_total   = 0
    dest_8plus   = 0
    sales_count  = 0
    total_frags  = 0
    frag_types   = set()

    MILESTONES      = [12, 17, 22, 25]
    phase_reached   = [False] * 4
    phase_end_click = [None] * 4
    forge_clicks    = 0
    mat_clicks      = 0
    mats_consumed   = 0
    mats_preserved  = 0
    skip_used       = 0

    # ── 신규 7종 추적 ──────────────────────────────────────────────
    visits              = defaultdict(int)    # 레벨 도달 횟수
    destroy_at          = defaultdict(int)    # 레벨별 파괴 횟수
    frag_earned_by_type = defaultdict(int)    # 조각 종류별 획득량
    frag_spent_by_type  = defaultdict(int)    # 조각 종류별 소비량 (건너뛰기)
    frag_earned_by_phase = {p: defaultdict(int) for p in "ABCD"}
    gold_flow = {
        p: {"income": 0, "forge_expense": 0, "skip_expense": 0, "mat_expense": 0}
        for p in "ABCD"
    }
    title_equip_clicks  = defaultdict(int)    # 칭호별 강화 시도 수

    # Phase 추적
    # A: 불굴 미해금, B: 불굴 해금 ~ +17 미달, C: +17 달성 ~ +22 미달, D: +22 달성 ~
    current_phase = ["A"]  # list로 nonlocal 우회

    def update_phase():
        p = current_phase[0]
        if p == "A" and "indomitable_smith" in unlocked:
            current_phase[0] = "B"; p = "B"
        if p == "B" and phase_reached[1]:
            current_phase[0] = "C"; p = "C"
        if p == "C" and phase_reached[2]:
            current_phase[0] = "D"

    # 초기 라운드 시작
    visits[0] += 1

    # ── 헬퍼 ───────────────────────────────────────────────────────
    def get_p(lvl):
        p = V11_C.get(lvl + 1, 0.10)
        if equipped == "master_smith":
            p = min(0.99, p + 0.02)
        return p

    def get_prot():
        if equipped == "indomitable_smith": return PROT_INDOM
        if equipped == "sword_saint":       return PROT_SAINT
        return 0.0

    def check_unlock():
        if dest_total >= 1 and "beginners_luck" not in unlocked:
            unlocked.add("beginners_luck")
        if (len(frag_types) >= 5 or total_frags >= 20) and "scavenger" not in unlocked:
            unlocked.add("scavenger")
        if dest_8plus >= 15 and "indomitable_smith" not in unlocked:
            unlocked.add("indomitable_smith")
        if sales_count >= 15 and "bargain_master" not in unlocked:
            unlocked.add("bargain_master")

    def choose_title():
        if "sword_saint" in unlocked:
            if "scavenger" in unlocked and total_frags < 15 and level < 12:
                return "scavenger"
            return "sword_saint"
        if "indomitable_smith" in unlocked:
            if "scavenger" in unlocked and total_frags < 10:
                return "scavenger"
            return "indomitable_smith"
        if "scavenger"   in unlocked: return "scavenger"
        if "master_smith" in unlocked: return "master_smith"
        if "beginners_luck" in unlocked: return "beginners_luck"
        return None

    def do_drop(lvl, was_destroy):
        nonlocal total_frags
        ph = current_phase[0]
        table = DROP_TABLE.get(lvl, [])
        if not table: return
        if equipped not in ("beginners_luck", "scavenger"):
            if rand() >= DROP_BASE: return
        wts = [e[1] for e in table]; tw = sum(wts)
        r = rand() * tw; cs = 0; sel = table[-1][0]
        for fid, w in table:
            cs += w
            if r <= cs: sel = fid; break
        qty = 1 if rand() < FRAG_SINGLE else 2
        if equipped == "scavenger": qty *= 2
        frags[sel]             += qty
        total_frags            += qty
        frag_types.add(sel)
        frag_earned_by_type[sel]        += qty
        frag_earned_by_phase[ph][sel]   += qty
        # 검성 추가 드랍 (파괴 시)
        if equipped == "sword_saint" and was_destroy and rand() < 0.50:
            frags["swordmaster"]                    += 1
            total_frags                             += 1
            frag_types.add("swordmaster")
            frag_earned_by_type["swordmaster"]      += 1
            frag_earned_by_phase[ph]["swordmaster"] += 1

    def farm_mat(mat_lvl):
        nonlocal mat_clicks, gold
        ph  = current_phase[0]
        info = MAT_LOOKUP.get(str(mat_lvl), {"clicks": 300, "gold": 1500})
        c, g = int(info["clicks"]), int(info["gold"])
        mat_clicks += c
        gold       -= g
        if gold < 0: gold = 0
        gold_flow[ph]["mat_expense"] += g

    def do_sell(lvl):
        nonlocal gold, level, sales_count
        ph = current_phase[0]
        sp = SELL_PRICE.get(lvl, 0)
        if equipped == "bargain_master": sp = int(sp * 1.5)
        gold += sp
        gold_flow[ph]["income"] += sp
        sales_count += 1
        level = 0
        visits[0] += 1
        check_unlock()
        update_phase()

    def try_skip():
        nonlocal level, gold, skip_used
        if level != 0: return False
        ph = current_phase[0]
        priority = [
            ("sword_saint",       8,  "enchanted_iron"),
            ("indomitable_smith", 7,  "refined_iron"),
            ("scavenger",         5,  "refined_iron"),
        ]
        for tid, tgt, fid in priority:
            if tid not in unlocked: continue
            gc = SKIP_GOLD.get(tid, 0)
            if gold < gc: continue
            if frags[fid] < 1: continue
            gold -= gc
            frags[fid] -= 1
            level = tgt
            skip_used += 1
            gold_flow[ph]["skip_expense"]  += gc
            frag_spent_by_type[fid]        += 1
            visits[tgt]                    += 1
            return True
        for tid in ("master_smith", "refine_peak"):
            if tid not in unlocked: continue
            gc = SKIP_GOLD.get(tid, 0)
            if gold < gc: continue
            if frags["unknown_mineral"] < 1: continue
            gold -= gc
            frags["unknown_mineral"] -= 1
            level = 12
            skip_used += 1
            gold_flow[ph]["skip_expense"]         += gc
            frag_spent_by_type["unknown_mineral"] += 1
            visits[12]                            += 1
            return True
        return False

    # ── 메인 루프 ─────────────────────────────────────────────────
    MAX_FORGE = 80_000
    while forge_clicks < MAX_FORGE:

        # 벽시계 체크 (100회마다)
        if forge_clicks % 100 == 0:
            check_wall()

        # 마일스톤 체크 + Phase 전환
        for i, ms in enumerate(MILESTONES):
            if not phase_reached[i] and level >= ms:
                phase_reached[i] = True
                phase_end_click[i] = forge_clicks + mat_clicks
                update_phase()

        if phase_reached[3]: break  # +25 달성

        # 라운드 시작 (level=0): 칭호 선택 + 건너뛰기
        if level == 0:
            equipped = choose_title()
            if try_skip():
                continue

        # 골드 부족 → 판매 또는 비상 처리
        next_cost = FORGE_COST.get(level, 0)
        if gold < next_cost:
            if level > 0:
                sp = SELL_PRICE.get(level, 0)
                if sp > 0:
                    do_sell(level)
                else:
                    gold = next_cost
            else:
                gold = max(gold, next_cost)
            continue

        # 재료 파밍 (부족 시)
        tgt = level + 1
        if tgt in MATERIAL_REQ:
            for ml, mc in MATERIAL_REQ[tgt]:
                if mat_inv[ml] < mc:
                    for _ in range(mc - mat_inv[ml]):
                        farm_mat(ml); mat_inv[ml] += 1

        # 재료 차감
        if tgt in MATERIAL_REQ:
            for ml, mc in MATERIAL_REQ[tgt]:
                mat_inv[ml] -= mc; mats_consumed += mc

        # 강화 시도
        ph  = current_phase[0]
        gold -= next_cost
        gold_flow[ph]["forge_expense"] += next_cost
        title_equip_clicks[equipped if equipped else "none"] += 1
        forge_clicks += 1

        prob = get_p(level); prot = get_prot()

        if rand() < prob:
            # 성공
            level += 1
            visits[level] += 1
            if level == 17 and "sword_saint"  not in unlocked:
                unlocked.add("sword_saint")
            if level == 18 and "master_smith" not in unlocked:
                unlocked.add("master_smith")
            if level == 25 and "legend_smith" not in unlocked:
                unlocked.add("legend_smith")
        else:
            # 실패
            protected = rand() < prot
            old_lvl   = level

            if protected:
                # v11 핵심: 검성 보호 시 재료 보존
                if equipped == "sword_saint" and tgt in MATERIAL_REQ:
                    for ml, mc in MATERIAL_REQ[tgt]:
                        mat_inv[ml]    += mc
                        mats_consumed  -= mc
                        mats_preserved += mc
                # 불굴: 레벨 유지, 재료 소모됨
            else:
                # 파괴
                destroy_at[old_lvl] += 1
                level = 0
                dest_total += 1
                if old_lvl >= 8: dest_8plus += 1
                do_drop(old_lvl, True)
                check_unlock()
                update_phase()
                visits[0] += 1

        # 자발적 판매 (sell_at 도달 + push_chance 미충족)
        if level == SELL_AT and level > 0:
            if rand() > PUSH_CHANCE:
                do_sell(level)
        elif level > 0:
            nc2 = FORGE_COST.get(level, 0)
            if nc2 > 0 and gold < nc2 * 2:
                do_sell(level)

    # ── 결과 수집 ────────────────────────────────────────────────────
    total_clicks = forge_clicks + mat_clicks
    ph_clicks = []
    prev = 0
    for ec in phase_end_click:
        if ec is not None:
            ph_clicks.append(ec - prev); prev = ec
        else:
            ph_clicks.append(None)

    # gold_flow expense 합산
    for p in "ABCD":
        gf = gold_flow[p]
        gf["expense"] = gf["forge_expense"] + gf["skip_expense"] + gf["mat_expense"]

    return {
        # 기존 필드
        "completed":           phase_reached[3],
        "total_clicks":        total_clicks,
        "total_hours":         hrs(total_clicks),
        "forge_clicks":        forge_clicks,
        "mat_clicks":          mat_clicks,
        "phase_clicks":        ph_clicks,
        "phase_hours":         [hrs(c) if c else None for c in ph_clicks],
        "destructions":        dest_total,
        "dest_8plus":          dest_8plus,
        "skip_used":           skip_used,
        "mats_consumed":       mats_consumed,
        "mats_preserved":      mats_preserved,
        "final_gold":          gold,
        # 신규 7종
        "visits":              dict(visits),
        "destroy_at":          dict(destroy_at),
        "frag_earned_by_type": dict(frag_earned_by_type),
        "frag_spent_by_type":  dict(frag_spent_by_type),
        "frag_earned_by_phase":{p: dict(v) for p, v in frag_earned_by_phase.items()},
        "gold_flow_by_phase":  {p: dict(v) for p, v in gold_flow.items()},
        "title_equip_clicks":  dict(title_equip_clicks),
    }


# ================================================================
# 집계 헬퍼
# ================================================================
def aggregate_dicts(list_of_dicts, keys=None):
    """딕셔너리 리스트의 키별 평균. keys 지정 시 해당 키만."""
    merged = defaultdict(list)
    for d in list_of_dicts:
        for k, v in d.items():
            merged[k].append(v)
    if keys:
        merged = {k: merged[k] for k in keys if k in merged}
    return {k: round(float(np.mean(v)), 2) for k, v in merged.items()}

def merge_nested(list_of_phase_dicts):
    """frag_earned_by_phase 등 이중 dict 집계."""
    result = {}
    for phase in "ABCD":
        inner = [d.get(phase, {}) for d in list_of_phase_dicts]
        result[phase] = aggregate_dicts(inner)
    return result

def merge_gold_flow(list_of_flows):
    result = {}
    for phase in "ABCD":
        fields = ["income","forge_expense","skip_expense","mat_expense","expense"]
        merged = defaultdict(list)
        for flow in list_of_flows:
            gf = flow.get(phase, {})
            for f in fields:
                merged[f].append(gf.get(f, 0))
        result[phase] = {f: round(float(np.mean(merged[f])), 0) for f in fields}
    return result


# ================================================================
# 메인 실행
# ================================================================
def main():
    log("=== Economy Data Sim: V11_C_SetB ===")
    log(f"Users={MC_USERS}, sell_at={SELL_AT}, push={PUSH_CHANCE}")

    results = []
    for i in range(MC_USERS):
        if i % 500 == 0:
            log(f"[EconSim] {i}/{MC_USERS} ({time.time()-WALL_START:.0f}s elapsed)")
        check_wall()
        seed = hash(("econ_v11c_setb", i)) % (2**32)
        r = simulate_player_econ(seed)
        results.append(r)

    log(f"[EconSim] {MC_USERS}/{MC_USERS} done. Aggregating...")

    comp  = [r for r in results if r["completed"]]
    n_comp = len(comp)
    comp_rate = n_comp / MC_USERS
    log(f"  완료율: {comp_rate*100:.1f}% ({n_comp}/{MC_USERS})")

    # ── 기본 통계 ─────────────────────────────────────────────────
    total_hours_list = [r["total_hours"] for r in comp]
    total_clicks_list = [r["total_clicks"] for r in comp]
    total_clicks_mean = float(np.mean(total_clicks_list)) if total_clicks_list else 0

    summary = {
        "completion_rate":  round(comp_rate, 4),
        "n_completed":      n_comp,
        "total_hours":      {
            "p25": pct(total_hours_list, 25),
            "p50": pct(total_hours_list, 50),
            "p75": pct(total_hours_list, 75),
            "p90": pct(total_hours_list, 90),
            "mean": round(float(np.mean(total_hours_list)), 3) if total_hours_list else None,
        },
        "destructions_p50":  pct([r["destructions"] for r in comp], 50),
        "skip_used_p50":     pct([r["skip_used"]    for r in comp], 50),
        "mats_consumed_p50": pct([r["mats_consumed"] for r in comp], 50),
        "mats_preserved_p50":pct([r["mats_preserved"] for r in comp], 50),
        "total_clicks_mean": round(total_clicks_mean, 1),
    }

    # Phase별 클릭 평균 (완료자 기준)
    phase_labels = ["A","B","C","D"]
    phase_clicks_mean = {}
    for idx, ph in enumerate(phase_labels):
        vals = [r["phase_clicks"][idx] for r in comp if r["phase_clicks"][idx] is not None]
        phase_clicks_mean[ph] = round(float(np.mean(vals)), 1) if vals else 0

    # ── 7종 집계 ─────────────────────────────────────────────────
    # 1. visits_mean (레벨 0~25)
    visits_mean = aggregate_dicts([r["visits"] for r in comp])
    visits_mean_sorted = {str(k): v for k, v in
                          sorted(visits_mean.items(), key=lambda x: int(x[0]))}

    # 2. destroy_at_mean
    destroy_mean = aggregate_dicts([r["destroy_at"] for r in comp])
    destroy_mean_sorted = {str(k): v for k, v in
                           sorted(destroy_mean.items(), key=lambda x: int(x[0]))}

    # 3. destroy_rate (destroy_at[n] / visits[n])
    destroy_rate = {}
    for lvl in range(26):
        v = visits_mean.get(str(lvl), visits_mean.get(lvl, 0))
        d = destroy_mean.get(str(lvl), destroy_mean.get(lvl, 0))
        if v > 0:
            destroy_rate[str(lvl)] = round(d / v, 4)

    # 4. frag_earned_mean
    frag_earned_mean = aggregate_dicts([r["frag_earned_by_type"] for r in comp], ALL_FRAGS)

    # 5. frag_spent_mean
    frag_spent_mean = aggregate_dicts([r["frag_spent_by_type"] for r in comp])

    # 6. frag_net_mean (earned - spent)
    frag_net_mean = {}
    for fid in ALL_FRAGS:
        e = frag_earned_mean.get(fid, 0)
        s = frag_spent_mean.get(fid, 0)
        frag_net_mean[fid] = round(e - s, 2)

    # 7. frag_by_phase_mean
    frag_by_phase_mean = merge_nested([r["frag_earned_by_phase"] for r in comp])

    # 8. gold_flow_mean
    gold_flow_mean = merge_gold_flow([r["gold_flow_by_phase"] for r in comp])

    # 골드 유입/지출 합산
    total_income   = sum(gold_flow_mean[p]["income"]  for p in "ABCD")
    total_expense  = sum(gold_flow_mean[p]["expense"] for p in "ABCD")

    # 9. title_equip_mean
    title_equip_mean = aggregate_dicts([r["title_equip_clicks"] for r in comp])

    # ── Effort per Frag 계산 ─────────────────────────────────────
    effort_per_frag = {}
    for fid in ALL_FRAGS:
        earned = frag_earned_mean.get(fid, 0)
        if earned > 0:
            effort_per_frag[fid] = round(total_clicks_mean / earned, 1)

    effort_per_frag_by_phase = {}
    for ph in "ABCD":
        effort_per_frag_by_phase[ph] = {}
        phase_c = phase_clicks_mean.get(ph, 0)
        for fid in ALL_FRAGS:
            earned = frag_by_phase_mean[ph].get(fid, 0)
            if earned > 0 and phase_c > 0:
                effort_per_frag_by_phase[ph][fid] = round(phase_c / earned, 1)

    # Phase별 Gold/Effort 비율
    gold_per_effort = {}
    for ph in "ABCD":
        pc = phase_clicks_mean.get(ph, 0)
        inc = gold_flow_mean[ph]["income"]
        exp = gold_flow_mean[ph]["expense"]
        if pc > 0:
            gold_per_effort[ph] = {
                "income_per_effort":  round(inc / pc, 2),
                "expense_per_effort": round(exp / pc, 2),
                "net_per_effort":     round((inc - exp) / pc, 2),
            }

    # ── E_farm Analytical (step1_results.json에서 V11_C 데이터) ──
    step1_path = OUT_DIR / "sim_step1_results.json"
    e_farm_analytical = {}
    if step1_path.exists():
        try:
            s1 = json.loads(step1_path.read_text(encoding="utf-8"))
            vc = s1.get("e_farm", {}).get("V11_C", {})
            for pk in ["p00","p30","p35","p55","p60"]:
                if pk in vc:
                    e_farm_analytical[pk] = vc[pk]
        except Exception as e:
            e_farm_analytical["_error"] = str(e)

    # ── economy_data.json 저장 ────────────────────────────────────
    economy_data = {
        "scenario": "V11_C_SetB",
        "n_users":  MC_USERS,
        "n_completed": n_comp,
        "curve":    "V11_C",
        "protect":  {"indom": PROT_INDOM, "saint": PROT_SAINT},
        "sell_at":  SELL_AT,
        "push_chance": PUSH_CHANCE,
        "summary":  summary,
        "phase_clicks_mean":    phase_clicks_mean,
        "visits_mean":          visits_mean_sorted,
        "destroy_at_mean":      destroy_mean_sorted,
        "destroy_rate":         destroy_rate,
        "frag_earned_mean":     frag_earned_mean,
        "frag_spent_mean":      frag_spent_mean,
        "frag_net_mean":        frag_net_mean,
        "frag_by_phase_mean":   frag_by_phase_mean,
        "gold_flow_mean":       gold_flow_mean,
        "gold_totals_mean":     {"income": round(total_income, 0), "expense": round(total_expense, 0)},
        "title_equip_mean":     title_equip_mean,
        "effort_per_frag":      effort_per_frag,
        "effort_per_frag_by_phase": effort_per_frag_by_phase,
        "gold_per_effort":      gold_per_effort,
        "e_farm_analytical":    e_farm_analytical,
    }
    save_json("economy_data_v2.json", economy_data)

    # ── economy_report.md 생성 ────────────────────────────────────
    _make_report(economy_data)

    elapsed = time.time() - WALL_START
    log(f"=== DONE — {elapsed:.1f}s ({elapsed/60:.1f}분) ===")


def _make_report(d):
    """economy_report.md 생성."""
    visits  = d["visits_mean"]
    destroy = d["destroy_at_mean"]
    drate   = d["destroy_rate"]
    frag_e  = d["frag_earned_mean"]
    frag_s  = d["frag_spent_mean"]
    frag_n  = d["frag_net_mean"]
    frag_ph = d["frag_by_phase_mean"]
    gflow   = d["gold_flow_mean"]
    tec     = d["title_equip_mean"]
    epf     = d["effort_per_frag"]
    epfph   = d["effort_per_frag_by_phase"]
    gpe     = d["gold_per_effort"]
    summ    = d["summary"]
    pclicks = d["phase_clicks_mean"]
    total_clicks = summ["total_clicks_mean"]

    FRAG_KO = {
        "rusty_iron":     "녹슨 철조각",
        "refined_iron":   "정제된 철조각",
        "enchanted_iron": "마력이 부여된 철조각",
        "moonlight":      "달빛 조각",
        "unknown_mineral":"알 수 없는 광물 파편",
        "spirit":         "사령 조각",
        "swordmaster":    "검성의 파편",
        "twisted_mana":   "뒤틀린 마력파편",
    }

    lines = []
    a = lines.append

    a("# 경제 데이터 수집 보고서\n")
    a(f"> V11_C_SetB, {d['n_users']}명 (완료 {d['n_completed']}명, {summ['completion_rate']*100:.1f}%)\n")
    a(f"> 총 플레이타임 p50={summ['total_hours']['p50']}h, 총 클릭 평균={total_clicks:.0f}\n")
    a("\n---\n")

    # ── 1. 레벨별 방문/파괴 분포 ─────────────────────────────────
    a("## 1. 레벨별 방문·파괴 분포\n")

    # 파괴율 높은 레벨 Top 10
    drate_items = sorted(
        [(int(k), float(v)) for k, v in drate.items() if int(k) >= 2],
        key=lambda x: -x[1]
    )[:10]
    a("### 파괴율 Top 10 (destroy_at[n] / visits[n])\n")
    a("| 레벨 | 방문 | 파괴 | 파괴율 | 검 이름 |\n")
    a("|------|------|------|--------|--------|\n")
    SWORD_NAME = {
        2:"투박한 철검", 3:"쇼트 소드", 4:"바스타드 소드", 5:"클레이모어",
        6:"플랑베르주", 7:"카타나", 8:"인챈티드 소드", 9:"귀검", 10:"태백검",
        11:"무형검", 12:"엑스칼리버", 13:"사월도", 14:"드래곤소드",
        15:"암월의 대검", 16:"블러디 쇼텔", 17:"백야", 18:"하운드 기사의 검",
        19:"억겁의 사선", 20:"마지막 희망", 21:"잊혀진 대검",
        22:"아크라이트", 23:"격노의 검", 24:"태초의 획",
    }
    for lvl, dr in drate_items:
        v = float(visits.get(str(lvl), 0))
        de = float(destroy.get(str(lvl), 0))
        name = SWORD_NAME.get(lvl, f"+{lvl}")
        a(f"| +{lvl} | {v:.1f} | {de:.1f} | {dr*100:.1f}% | {name} |\n")

    a("\n### 레벨별 방문/파괴 전체 테이블\n")
    a("| 레벨 | 방문(평균) | 파괴(평균) | 파괴율 |\n")
    a("|------|-----------|-----------|-------|\n")
    for lvl in range(26):
        v  = float(visits.get(str(lvl), 0))
        de = float(destroy.get(str(lvl), 0))
        dr = float(drate.get(str(lvl), 0))
        a(f"| +{lvl} | {v:.1f} | {de:.1f} | {dr*100:.1f}% |\n")

    a("\n---\n")

    # ── 2. 조각 종류별 수급 분석 ─────────────────────────────────
    a("## 2. 조각 종류별 수급 분석\n")
    a("| 조각 | 획득 | 소비(건너뛰기) | 순 축적 | 주 Phase | 1개당 Effort |\n")
    a("|------|------|--------------|--------|---------|-------------|\n")

    for fid in ALL_FRAGS:
        earned = frag_e.get(fid, 0)
        spent  = frag_s.get(fid, 0)
        net    = frag_n.get(fid, 0)
        eff    = epf.get(fid, "—")

        # 주 Phase: 가장 많이 획득하는 Phase
        best_phase = max("ABCD", key=lambda p: frag_ph[p].get(fid, 0))
        best_amt   = frag_ph[best_phase].get(fid, 0)
        if best_amt == 0: best_phase = "—"

        ko = FRAG_KO.get(fid, fid)
        a(f"| {ko} | {earned:.1f} | {spent:.1f} | {net:.1f} | {best_phase} | {eff} |\n")

    a("\n### Phase별 조각 획득량\n")
    a(f"| 조각 | Phase A | Phase B | Phase C | Phase D | 합계 |\n")
    a(f"|------|---------|---------|---------|---------|------|\n")
    for fid in ALL_FRAGS:
        pa = frag_ph["A"].get(fid, 0)
        pb = frag_ph["B"].get(fid, 0)
        pc = frag_ph["C"].get(fid, 0)
        pd = frag_ph["D"].get(fid, 0)
        total = frag_e.get(fid, 0)
        ko = FRAG_KO.get(fid, fid)
        a(f"| {ko} | {pa:.1f} | {pb:.1f} | {pc:.1f} | {pd:.1f} | {total:.1f} |\n")

    a("\n### Phase별 조각 1개당 Effort\n")
    a(f"| 조각 | Phase A | Phase B | Phase C | Phase D | 전체 |\n")
    a(f"|------|---------|---------|---------|---------|------|\n")
    for fid in ALL_FRAGS:
        ko = FRAG_KO.get(fid, fid)
        vals = [
            str(epfph.get(p, {}).get(fid, "—")) for p in "ABCD"
        ] + [str(epf.get(fid, "—"))]
        a(f"| {ko} | {' | '.join(vals)} |\n")

    a("\n---\n")

    # ── 3. Phase별 골드 흐름 ─────────────────────────────────────
    a("## 3. Phase별 골드 흐름\n")
    a("| Phase | 클릭(평균) | 골드 유입 | 강화 지출 | 건너뛰기 | 재료 파밍 | 합계 지출 | 순 흐름 | G/클릭 |\n")
    a("|-------|-----------|---------|---------|---------|---------|---------|---------|--------|\n")
    for ph in "ABCD":
        pc  = pclicks.get(ph, 0)
        gf  = gflow[ph]
        inc = gf["income"]
        fge = gf["forge_expense"]
        ske = gf["skip_expense"]
        mae = gf["mat_expense"]
        exp = gf["expense"]
        net = inc - exp
        gpe_val = gpe.get(ph, {}).get("income_per_effort", 0)
        a(f"| {ph} | {pc:.0f} | {inc:,.0f} | {fge:,.0f} | {ske:,.0f} | {mae:,.0f} | {exp:,.0f} | {net:+,.0f} | {gpe_val:.1f} |\n")

    total_inc = d["gold_totals_mean"]["income"]
    total_exp = d["gold_totals_mean"]["expense"]
    a(f"\n전체 골드 유입: {total_inc:,.0f}G | 전체 골드 지출: {total_exp:,.0f}G | 순 흐름: {total_inc-total_exp:+,.0f}G\n")

    a("\n---\n")

    # ── 4. 칭호 장착 분포 ─────────────────────────────────────────
    a("## 4. 칭호 장착 분포\n")
    total_equip = sum(tec.values())
    TITLE_KO = {
        "none":              "(없음)",
        "beginners_luck":    "초심자의 행운",
        "scavenger":         "잔해의 수집가",
        "indomitable_smith": "불굴의 대장장이",
        "bargain_master":    "흥정의 달인",
        "master_smith":      "달인 대장장이",
        "refine_peak":       "재련의 정점",
        "sword_saint":       "검성의 대장장이",
        "legend_smith":      "전설의 대장장이",
    }
    tec_sorted = sorted(tec.items(), key=lambda x: -x[1])
    a("| 칭호 | 클릭 수(평균) | 비율 |\n")
    a("|------|-------------|------|\n")
    for tid, cnt in tec_sorted:
        pct_val = cnt / total_equip * 100 if total_equip > 0 else 0
        ko = TITLE_KO.get(tid, tid)
        a(f"| {ko} | {cnt:.1f} | {pct_val:.1f}% |\n")
    a(f"\n총 강화 시도(평균): {total_equip:.1f}회\n")

    a("\n---\n")

    # ── 5. 경제 모델 입력용 핵심 수치 ────────────────────────────
    a("## 5. 경제 모델 입력용 핵심 수치\n")
    a("### 5-1. 조각 Effort (전체 게임 기준)\n")
    a("> 조각 1개를 얻기 위해 필요한 평균 클릭 수 = total_clicks / frag_earned\n\n")
    a("| 조각 | 1개당 Effort | 1개당 시간(h) |\n")
    a("|------|------------|-------------|\n")
    for fid in ALL_FRAGS:
        eff = epf.get(fid)
        if eff:
            h = round(eff / CLICKS_PER_HOUR, 3)
            ko = FRAG_KO.get(fid, fid)
            a(f"| {ko} | {eff} | {h} |\n")

    a("\n### 5-2. Phase별 G/Effort 비율\n")
    a("> 각 Phase에서 클릭 1회당 골드 유입/지출량\n\n")
    a("| Phase | 유입(G/E) | 강화지출(G/E) | 순흐름(G/E) |\n")
    a("|-------|----------|-------------|------------|\n")
    for ph in "ABCD":
        gv = gpe.get(ph, {})
        a(f"| {ph} | {gv.get('income_per_effort',0):.2f} | "
          f"{gv.get('expense_per_effort',0):.2f} | "
          f"{gv.get('net_per_effort',0):.2f} |\n")

    a("\n### 5-3. E_farm 해석적 테이블 (V11_C)\n")
    a("> Markov chain DP로 계산한 강화 기대 클릭 수\n\n")
    e_farm_vc = d.get("e_farm_analytical", {})
    p55 = e_farm_vc.get("p55", {})
    p60 = e_farm_vc.get("p60", {})
    p00 = e_farm_vc.get("p00", {})
    p35 = e_farm_vc.get("p35", {})
    a("| 레벨 | protect=0% | protect=35%(불굴) | protect=60%(검성) |\n")
    a("|------|-----------|------------------|------------------|\n")
    for lvl_str in ["2","5","7","8","11","12","16","17","22","25"]:
        c0  = p00.get(lvl_str, {}).get("clicks", "—")
        c35 = p35.get(lvl_str, {}).get("clicks", "—")
        c60 = p60.get(lvl_str, {}).get("clicks", "—")
        a(f"| +{lvl_str} | {c0} | {c35} | {c60} |\n")

    a("\n---\n")
    a("*economy_data.json에 전체 원본 데이터 수록.*\n")

    save_md("economy_report_v2.md", "".join(lines))


if __name__ == "__main__":
    main()
