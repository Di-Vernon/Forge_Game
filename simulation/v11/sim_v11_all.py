#!/usr/bin/env python3
"""
sim_v11_all.py — Forge Game v11 Full Balancing Simulation
Steps 1→4 sequential.

핵심 변경점 (v10 대비):
  - 검성의 대장장이 보호 발동 시 재료 보존 (mat_preserve_on_protect)
  - +17~+25 확률 상향 탐색 (V11_A=+10%p, V11_B=+15%p, V11_C=C4높은바닥)
  - 불굴 조건 완화 (20→15회, 코드 반영 완료)
  - 잔해의 수집가 100% 드랍 + 수량 ×2 (코드 반영 완료)
  - 건너뛰기 조각 변경 (refined_iron/enchanted_iron/unknown_mineral)
"""
import numpy as np
import json, time, sys, math
from pathlib import Path
from collections import defaultdict

# ================================================================
OUT_DIR = Path("C:/Users/PC/project/Forge_Game/simulation/v11")
OUT_DIR.mkdir(parents=True, exist_ok=True)
MAX_CLICKS      = 500_000
MAX_PHASE_A     = 250_000
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

def pct(arr, p):
    if not arr: return None
    return round(float(np.percentile(arr, p)), 3)

def hrs(c): return round(c / CLICKS_PER_HOUR, 3)

# ================================================================
# GAME DATA  (source: config.json + swords.json, 확정 수치)
# ================================================================
INITIAL_GOLD = 2_000

FORGE_COST = {
    0:5,   1:10,  2:15,  3:22,  4:32,  5:48,  6:72,  7:108,
    8:160, 9:235, 10:340, 11:480, 12:680, 13:960, 14:1350,
    15:1900, 16:2700, 17:3800, 18:5300, 19:7400, 20:10400,
    21:14500, 22:20000, 23:28000, 24:0
}

SELL_PRICE = {
    0:2,    1:12,   2:30,   3:60,   4:120,  5:220,  6:400,  7:700,
    8:1200, 9:2000, 10:3500, 11:6000, 12:10000,
    13:17000, 14:28000, 15:46000, 16:75000,
    17:120000, 18:200000, 19:330000, 20:550000,
    21:900000, 22:1500000, 23:2400000, 24:4000000,
}

# MATERIAL_REQ[n] = [(mat_level, count)]:  강화 FROM n-1 TO n 시 소모
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
    8:[("enchanted_iron",40)],
    9:[("spirit",15)],
    10:[("moonlight",15)],
    11:[("swordmaster",15)],
    12:[("unknown_mineral",40)],
    13:[("moonlight",15),("spirit",15)],
    14:[("unknown_mineral",40),("enchanted_iron",40),("twisted_mana",3)],
    15:[("moonlight",25)],
    16:[("spirit",25)],
    17:[("swordmaster",35)],
    18:[("twisted_mana",35)],
    19:[("spirit",35),("twisted_mana",35)],
    20:[("unknown_mineral",35)],
    21:[("twisted_mana",35)],
    22:[("twisted_mana",35)],
    23:[("rusty_iron",80),("refined_iron",35)],
    24:[("twisted_mana",35)],
}
DROP_BASE    = 0.60
FRAG_SINGLE  = 0.80  # 80%→1개, 20%→2개

# ================================================================
# PROBABILITY CURVES
# key = to_level:  probs[k] = P(level k-1 → k)
# ================================================================
BLOCK1 = {1:.95, 2:.93, 3:.90, 4:.87, 5:.83, 6:.78, 7:.73}

# C1_V10: v10 확정 곡선 (baseline)
C1 = {**BLOCK1,
    8:.73, 9:.67, 10:.60, 11:.53, 12:.46,
    13:.40, 14:.65, 15:.58, 16:.52, 17:.42,
    18:.38, 19:.35, 20:.35, 21:.35, 22:.42,
    23:.50, 24:.57, 25:.60}

# V11_A: C1 + +17~+25 +10%p 상향
V11_A = {**C1, 18:.48, 19:.45, 20:.45, 21:.45, 22:.50,
         23:.58, 24:.65, 25:.66}

# V11_B: C1 + +17~+25 +15%p 상향 (상한 0.85)
V11_B = {**C1, 18:.53, 19:.50, 20:.48, 21:.48, 22:.52,
         23:.60, 24:.66, 25:.68}

# V11_C: C4 (높은바닥 — Block 2-5 전반 상향)
V11_C = {**BLOCK1,
    8:.75, 9:.70, 10:.65, 11:.60, 12:.55,
    13:.50, 14:.68, 15:.63, 16:.58, 17:.52,
    18:.52, 19:.50, 20:.50, 21:.48, 22:.52,
    23:.57, 24:.62, 25:.65}

CURVES = {"V11_A":V11_A, "V11_B":V11_B, "V11_C":V11_C}

PROTECT_SETS = {
    "SetA": {"indom":0.30, "saint":0.55},
    "SetB": {"indom":0.35, "saint":0.60},
}

# ================================================================
# STEP 1: ANALYTICAL — Markov Chain
# ================================================================
def solve_e_farm(probs_dict, protect, target):
    """
    Returns (E_clicks, E_gold) from level 0 to level 'target'.
    probs_dict[k] = prob of forging from level k-1 to level k.
    protect: protection rate at levels > 0 (fail×protect→level stays).
    State 0 is special: fail always stays at 0 (can't go lower).
    """
    n = target
    if n <= 0:
        return 0.0, 0.0

    A   = np.zeros((n, n))
    b_c = np.ones(n)
    b_g = np.array([float(FORGE_COST.get(i, 0)) for i in range(n)])

    # Row 0: state 0 — fail stays at 0 (no protection effect)
    p0 = probs_dict.get(1, 0.95)
    A[0, 0] = p0
    if n > 1:
        A[0, 1] = -p0

    # Rows 1..n-1: fail × protect → stay, fail × (1-protect) → reset to 0
    for i in range(1, n):
        pi = probs_dict.get(i + 1, 0.10)
        fi = 1.0 - pi
        A[i, i]  =  1.0 - fi * protect
        if i + 1 < n:
            A[i, i + 1] = -pi
        A[i, 0] -= fi * (1.0 - protect)

    try:
        Ec = np.linalg.solve(A, b_c)
        Eg = np.linalg.solve(A, b_g)
        if np.any(Ec < -0.1) or np.any(np.isnan(Ec)):
            return None, None
    except Exception:
        return None, None

    return float(Ec[0]), float(Eg[0])


def step1_analytical():
    log("=== STEP 1: Analytical (Markov chain) ===")
    res = {
        "e_farm": {}, "proposed_curves": {},
        "skip_gold_costs": {}, "sell_prices": {},
        "scroll_amounts": {}, "sword_amounts": {},
        "material_farm_lookup": {},
    }

    # ── 1-A: E_farm 전표 ──────────────────────────────────────────
    targets  = [2, 5, 7, 8, 11, 12, 16, 17, 22, 25]
    prot_map = [("p00",0.0),("p30",0.30),("p35",0.35),("p55",0.55),("p60",0.60)]

    for cname, curve in CURVES.items():
        res["e_farm"][cname] = {}
        for pk, pv in prot_map:
            res["e_farm"][cname][pk] = {}
            for t in targets:
                ec, eg = solve_e_farm(curve, pv, t)
                if ec is not None:
                    res["e_farm"][cname][pk][str(t)] = {
                        "clicks": round(ec, 1),
                        "gold":   round(eg, 0),
                        "hours":  round(ec / CLICKS_PER_HOUR, 3),
                    }

    for cname in CURVES:
        d = res["e_farm"][cname]
        log(f"  {cname}: +12(p00)={d['p00'].get('12',{}).get('clicks','?'):.0f}c"
            f"  +17(p55)={d['p55'].get('17',{}).get('clicks','?')}"
            f"  +22(p55)={d['p55'].get('22',{}).get('clicks','?')}"
            f"  +25(p55)={d['p55'].get('25',{}).get('clicks','?')}")

    # ── 1-B: 재료 파밍 룩업 (곡선별, protect=0.55)
    # 재료 파밍은 Phase C 이후(검성 해금 후)에 주로 발생.
    # 플레이어는 재료 파밍 시에도 검성의 대장장이(55% 보호)를 장착 가능.
    # protect=0으로 계산 시 +16 파밍 = 3411c (2.84h) — 비현실적 과다계산.
    # protect=0.55로 계산 시 +16 파밍 = 256c (0.21h) — 현실적.
    MAT_FARM_PROTECT = 0.55
    mat_levels = [2, 11, 12, 16]
    for cname, curve in CURVES.items():
        res["material_farm_lookup"][cname] = {}
        for ml in mat_levels:
            ec, eg = solve_e_farm(curve, MAT_FARM_PROTECT, ml)
            if ec is not None:
                res["material_farm_lookup"][cname][str(ml)] = {
                    "clicks": round(ec, 1), "gold": round(eg, 0)}

    log(f"  V11_A 재료 파밍: " +
        " | ".join(f"+{k}={v['clicks']:.0f}c/{v['gold']:.0f}G"
                   for k,v in res["material_farm_lookup"]["V11_A"].items()))

    # ── 1-C: 건너뛰기 골드 비용 산출 (E_farm_gold × factor) ─────────
    skip_defs = {
        "scavenger":         (5,  "refined_iron",    0.30),
        "indomitable_smith": (7,  "refined_iron",    0.30),
        "sword_saint":       (8,  "enchanted_iron",  0.35),
        "master_smith":      (12, "unknown_mineral", 0.35),
        "refine_peak":       (12, "unknown_mineral", 0.35),
    }
    for tid, (tgt, frag, fac) in skip_defs.items():
        _, eg = solve_e_farm(V11_A, 0.0, tgt)
        if eg:
            res["skip_gold_costs"][tid] = {
                "target": tgt, "frag_id": frag,
                "gold_low":  max(50,  int(eg * 0.20)),
                "gold_mid":  max(100, int(eg * fac)),
                "gold_high": max(200, int(eg * 0.55)),
                "e_farm_gold": round(eg, 0),
            }

    log("  Skip MID: " +
        " | ".join(f"{k[:5]}→+{v['target']}={v['gold_mid']}G"
                   for k, v in res["skip_gold_costs"].items()))

    # ── 1-D: 판매가 재설계 (+11~+24, 누적비용 × 배율) ───────────────
    new_sell = {0: 2}
    cum = 0
    mults = [(range(1,8),1.8),(range(8,13),2.2),(range(13,17),2.9),
             (range(17,23),3.6),(range(23,25),4.3)]
    for lvl in range(1, 25):
        cum += FORGE_COST.get(lvl - 1, 0)
        mult = 1.5
        for rr, m in mults:
            if lvl in rr: mult = m; break
        new_sell[lvl] = max(SELL_PRICE.get(lvl, 0), int(cum * mult))
    res["sell_prices"] = {str(k): v for k, v in new_sell.items()}

    # ── 1-E: 조합소 레시피 수량 ─────────────────────────────────────
    res["scroll_amounts"] = {
        "rusty_iron": 6, "refined_iron": 4, "enchanted_iron": 3,
        "moonlight": 2, "spirit": 2, "twisted_mana": 1,
    }

    ec8,  _ = solve_e_farm(V11_A, 0.0, 8)
    ec12, _ = solve_e_farm(V11_A, 0.0, 12)
    ec15, _ = solve_e_farm(V11_A, 0.0, 15)
    ec16, _ = solve_e_farm(V11_A, 0.0, 16)
    ec18, _ = solve_e_farm(V11_A, 0.0, 18)
    ec19, _ = solve_e_farm(V11_A, 0.0, 19)
    ec20, _ = solve_e_farm(V11_A, 0.0, 20)

    def amt(ec, div): return max(1, int((ec or 0) / div))
    res["sword_amounts"] = {
        "+8_enchanted_iron":      amt(ec8,  12),
        "+12_enchanted_iron":     amt(ec12, 15),
        "+12_unknown_mineral":    amt(ec12, 20),
        "+15_moonlight":          amt(ec15, 14),
        "+16_unknown_mineral":    amt(ec16, 17),
        "+18_twisted_mana":       amt(ec18, 11),
        "+19_twisted_mana":       amt(ec19, 11),
        "+20_twisted_mana":       amt(ec20, 10),
    }

    # ── 곡선 요약 ──────────────────────────────────────────────────
    res["proposed_curves"] = {
        cn: {str(k): round(v,3) for k,v in sorted(cv.items())}
        for cn, cv in CURVES.items()
    }

    save_json("sim_step1_results.json", res)
    log("=== STEP 1 DONE ===")
    return res


# ================================================================
# CORE MC SIMULATION
# ================================================================
def simulate_player(
    curve, prot_indom, prot_saint,
    skip_gold,          # {title_id: gold_cost}  (MID tier)
    mat_lookup,         # {str(mat_level): {"clicks":X,"gold":Y}}
    sell_at, push_chance,
    seed,
    phase_a_only=False,
    max_clicks=MAX_CLICKS,
):
    """
    Returns metrics dict for one player.
    v11 핵심: sword_saint 보호 발동 → 재료 보존 (mat_preserve_on_protect).
    """
    rng = np.random.default_rng(seed)
    RBATCH = 8_000
    _rb = rng.random(RBATCH); _ri = 0
    def rand():
        nonlocal _rb, _ri
        if _ri >= RBATCH:
            _rb = rng.random(RBATCH); _ri = 0
        v = _rb[_ri]; _ri += 1; return v

    # ── 상태 ──────────────────────────────────────────────────────
    level    = 0
    gold     = INITIAL_GOLD
    frags    = defaultdict(int)
    mat_inv  = defaultdict(int)  # {sword_level: count}

    equipped    = None
    unlocked    = set()

    dest_total  = 0
    dest_8plus  = 0
    sales_count = 0
    total_frags = 0
    frag_types  = set()

    MILESTONES      = [12, 17, 22, 25]
    phase_reached   = [False]*4
    phase_end_click = [None]*4

    forge_clicks   = 0   # 실제 강화 시도 수 (루프 카운터)
    mat_clicks     = 0   # 재료 파밍 해석적 클릭 (루프 외 누적)
    mats_consumed  = 0
    mats_preserved = 0
    skip_used      = 0

    # ── 헬퍼 ──────────────────────────────────────────────────────
    def get_p(lvl):
        p = curve.get(lvl + 1, 0.10)
        if equipped == "master_smith":
            p = min(0.99, p + 0.02)
        return p

    def get_prot():
        if equipped == "indomitable_smith": return prot_indom
        if equipped == "sword_saint":       return prot_saint
        return 0.0

    def check_unlock():
        if dest_total >= 1 and "beginners_luck" not in unlocked:
            unlocked.add("beginners_luck")
        if ((len(frag_types) >= 5 or total_frags >= 20)
                and "scavenger" not in unlocked):
            unlocked.add("scavenger")
        if dest_8plus >= 15 and "indomitable_smith" not in unlocked:
            unlocked.add("indomitable_smith")
        if sales_count >= 15 and "bargain_master" not in unlocked:
            unlocked.add("bargain_master")

    def choose_title(lvl):
        """
        라운드 시작 시 최적 칭호 선택.
        검성의 대장장이(55%)가 불굴(30%)보다 항상 우수 → 해금 시 무조건 사용.
        조각 부족 시: 잔해의 수집가로 전환(조각 파밍).
        """
        if "sword_saint" in unlocked:
            # 조각이 매우 부족하고 Phase A/B 구간이면 잔해 우선
            if "scavenger" in unlocked and total_frags < 15 and lvl < 12:
                return "scavenger"
            return "sword_saint"
        if "indomitable_smith" in unlocked:
            if "scavenger" in unlocked and total_frags < 10:
                return "scavenger"
            return "indomitable_smith"
        if "scavenger" in unlocked:
            return "scavenger"
        if "master_smith" in unlocked:
            return "master_smith"
        if "beginners_luck" in unlocked:
            return "beginners_luck"
        return None

    def do_drop(lvl, was_destroy):
        nonlocal total_frags
        table = DROP_TABLE.get(lvl, [])
        if not table: return
        # 드랍 판정
        if equipped not in ("beginners_luck", "scavenger"):
            if rand() >= DROP_BASE: return
        # 조각 선택 (weight)
        wts = [e[1] for e in table]; tw = sum(wts)
        r = rand() * tw; cs = 0; sel = table[-1][0]
        for fid, w in table:
            cs += w
            if r <= cs: sel = fid; break
        qty = 1 if rand() < FRAG_SINGLE else 2
        if equipped == "scavenger": qty *= 2
        frags[sel]   += qty
        total_frags  += qty
        frag_types.add(sel)
        # 검성 추가 검성의 파편 드랍 (파괴 발생 시)
        if equipped == "sword_saint" and was_destroy and rand() < 0.50:
            frags["swordmaster"] += 1
            total_frags  += 1
            frag_types.add("swordmaster")

    def farm_mat(mat_lvl):
        """재료 검 파밍 — 해석적 비용 적용 (루프 카운터에는 미포함)."""
        nonlocal mat_clicks, gold
        info = mat_lookup.get(str(mat_lvl), {"clicks": 300, "gold": 1500})
        mat_clicks += int(info["clicks"])
        gold       -= info["gold"]
        if gold < 0: gold = 0  # 단순화: 음수 골드 방지

    def do_sell(lvl):
        nonlocal gold, level, sales_count
        sp = SELL_PRICE.get(lvl, 0)
        if equipped == "bargain_master": sp = int(sp * 1.5)
        gold += sp; sales_count += 1; level = 0
        check_unlock()

    def try_skip():
        nonlocal level, gold, skip_used
        if level != 0: return False
        priority = [
            ("sword_saint",       8,  "enchanted_iron"),
            ("indomitable_smith", 7,  "refined_iron"),
            ("scavenger",         5,  "refined_iron"),
        ]
        for tid, tgt, fid in priority:
            if tid not in unlocked: continue
            gc = skip_gold.get(tid)
            if gc is None or gold < gc: continue
            if frags[fid] < 1: continue
            gold -= gc; frags[fid] -= 1; level = tgt; skip_used += 1
            return True
        # +12 건너뛰기
        for tid in ("master_smith", "refine_peak"):
            if tid not in unlocked: continue
            gc = skip_gold.get(tid)
            if gc is None or gold < gc: continue
            if frags["unknown_mineral"] < 1: continue
            gold -= gc; frags["unknown_mineral"] -= 1; level = 12; skip_used += 1
            return True
        return False

    # ── 메인 루프 ─────────────────────────────────────────────────
    MAX_FORGE = 80_000  # 강화 시도 최대 (66.7시간 — 실질 타임아웃)
    while forge_clicks < MAX_FORGE:
        # 페이즈 체크
        for i, ms in enumerate(MILESTONES):
            if not phase_reached[i] and level >= ms:
                phase_reached[i] = True
                phase_end_click[i] = forge_clicks + mat_clicks

        if phase_reached[3]: break       # +25 달성
        if phase_a_only and phase_reached[0]: break  # Phase A 완료

        # 라운드 시작(level=0): 칭호 선택 + 건너뛰기
        if level == 0:
            equipped = choose_title(0)
            if try_skip(): continue

        # 골드 부족 → 판매
        next_cost = FORGE_COST.get(level, 0)
        if gold < next_cost:
            if level > 0:
                sp = SELL_PRICE.get(level, 0)
                if sp > 0:
                    do_sell(level)
                else:
                    gold = next_cost  # 비상
            else:
                gold = max(gold, next_cost)
            continue

        # 재료 확인 + 파밍
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
        gold -= next_cost; forge_clicks += 1
        prob = get_p(level); prot = get_prot()

        if rand() < prob:
            # 성공
            level += 1
            if level == 17 and "sword_saint"  not in unlocked: unlocked.add("sword_saint")
            if level == 18 and "master_smith" not in unlocked: unlocked.add("master_smith")
            if level == 25 and "legend_smith" not in unlocked: unlocked.add("legend_smith")
        else:
            # 실패
            protected = rand() < prot
            old_lvl = level

            if protected:
                # ▶ v11 핵심: 검성 보호 시 재료 보존
                if equipped == "sword_saint" and tgt in MATERIAL_REQ:
                    for ml, mc in MATERIAL_REQ[tgt]:
                        mat_inv[ml] += mc
                        mats_consumed  -= mc
                        mats_preserved += mc
                # 불굴: 레벨 유지, 재료 소모됨 (이미 차감)
            else:
                # 파괴
                level = 0; dest_total += 1
                if old_lvl >= 8: dest_8plus += 1
                do_drop(old_lvl, True)
                check_unlock()

        # 자발적 판매 (sell_at 도달 + push_chance 미충족)
        if level == sell_at and level > 0:
            if rand() > push_chance:
                do_sell(level)

        # 골드 매우 부족 시 강제 판매
        elif level > 0:
            nc2 = FORGE_COST.get(level, 0)
            if nc2 > 0 and gold < nc2 * 2:
                do_sell(level)

    # ── 결과 수집 ─────────────────────────────────────────────────
    total_clicks = forge_clicks + mat_clicks
    ph_clicks = []
    prev = 0
    for ec in phase_end_click:
        if ec is not None:
            ph_clicks.append(ec - prev); prev = ec
        else:
            ph_clicks.append(None)

    return {
        "completed":       phase_reached[3],
        "phase_a_done":    phase_reached[0],
        "total_clicks":    total_clicks,
        "total_hours":     hrs(total_clicks),
        "phase_clicks":    ph_clicks,
        "phase_hours":     [hrs(c) if c else None for c in ph_clicks],
        "phase_end":       phase_end_click,
        "final_level":     level,
        "final_gold":      gold,
        "destructions":    dest_total,
        "dest_8plus":      dest_8plus,
        "skip_used":       skip_used,
        "mats_consumed":   mats_consumed,
        "mats_preserved":  mats_preserved,
        "unlocked":        sorted(unlocked),
        "frag_types":      len(frag_types),
        "total_frags":     total_frags,
    }


# ================================================================
# STEP 2: MC — Phase A 검증
# ================================================================
PERSONAS_A = {
    "cautious":  {"sell_at": 7,  "push": 0.15},
    "ambitious": {"sell_at": 10, "push": 0.40},
    "yolo":      {"sell_at": 25, "push": 1.00},
}

def step2_phase_a(step1_res):
    log("=== STEP 2: Phase A MC ===")
    skip_mid = {k: v["gold_mid"] for k, v in step1_res["skip_gold_costs"].items()}
    results  = {}

    total_scenarios = len(CURVES) * len(PERSONAS_A)
    done = 0
    for cname, curve in CURVES.items():
        mat_lk = step1_res["material_farm_lookup"][cname]
        for pname, persona in PERSONAS_A.items():
            sc_key = f"{cname}_{pname}"
            log(f"  [{done+1}/{total_scenarios}] {sc_key}")
            metrics = []
            for i in range(MC_USERS):
                if i % 500 == 0:
                    log(f"    user {i}/{MC_USERS}", )
                seed = hash((cname, pname, i, "v11_phaseA")) % (2**32)
                m = simulate_player(
                    curve=curve,
                    prot_indom=0.30, prot_saint=0.55,
                    skip_gold=skip_mid, mat_lookup=mat_lk,
                    sell_at=persona["sell_at"], push_chance=persona["push"],
                    seed=seed, phase_a_only=True, max_clicks=MAX_PHASE_A,
                )
                metrics.append(m)
            done += 1

            # 집계
            completed  = [m for m in metrics if m["phase_a_done"]]
            all_clicks = [m["phase_clicks"][0] for m in completed if m["phase_clicks"][0]]
            all_hours  = [m["phase_hours"][0]  for m in completed if m["phase_hours"][0]]
            gold_end   = [m["final_gold"]       for m in completed]
            dest_8plus = [m["dest_8plus"]        for m in metrics]

            results[sc_key] = {
                "curve": cname, "persona": pname,
                "n": MC_USERS,
                "completion_rate": round(len(completed)/MC_USERS, 3),
                "phase_a_clicks_p25": pct(all_clicks, 25),
                "phase_a_clicks_p50": pct(all_clicks, 50),
                "phase_a_clicks_p75": pct(all_clicks, 75),
                "phase_a_hours_p25":  pct(all_hours,  25),
                "phase_a_hours_p50":  pct(all_hours,  50),
                "phase_a_hours_p75":  pct(all_hours,  75),
                "gold_end_p50":       pct(gold_end,   50),
                "dest_8plus_p50":     pct(dest_8plus, 50),
                "indom_unlock_rate":  round(sum(
                    1 for m in metrics if "indomitable_smith" in m["unlocked"]
                ) / MC_USERS, 3),
            }
            log(f"    완료 {results[sc_key]['completion_rate']*100:.0f}%  "
                f"p50={results[sc_key]['phase_a_hours_p50']}h")

    save_json("sim_step2_results.json", results)

    # 보고서
    lines = ["# Step 2 — Phase A MC 결과\n\n",
             "목표: Phase A p50 = 20~50분 (0.33~0.83h)\n\n",
             "| 시나리오 | 완료율 | p25(h) | p50(h) | p75(h) | 불굴 해금율 |\n",
             "|----------|--------|--------|--------|--------|------------|\n"]
    for k, v in results.items():
        ok = "✅" if 0.33 <= (v["phase_a_hours_p50"] or 0) <= 0.83 else "⚠️"
        lines.append(f"| {k} | {v['completion_rate']*100:.0f}% "
                     f"| {v['phase_a_hours_p25']} | {v['phase_a_hours_p50']} {ok}"
                     f"| {v['phase_a_hours_p75']} | {v['indom_unlock_rate']*100:.0f}% |\n")
    save_md("sim_step2_report.md", "".join(lines))
    log("=== STEP 2 DONE ===")
    return results


# ================================================================
# STEP 3: MC — 전체 게임
# ================================================================
def step3_full_game(step1_res):
    log("=== STEP 3: Full Game MC ===")
    skip_mid = {k: v["gold_mid"] for k, v in step1_res["skip_gold_costs"].items()}
    results  = {}

    total_scenarios = len(CURVES) * len(PROTECT_SETS)
    done = 0
    for cname, curve in CURVES.items():
        mat_lk = step1_res["material_farm_lookup"][cname]
        for psname, ps in PROTECT_SETS.items():
            sc_key = f"{cname}_{psname}"
            log(f"  [{done+1}/{total_scenarios}] {sc_key}")
            metrics = []
            for i in range(MC_USERS):
                if i % 500 == 0:
                    log(f"    user {i}/{MC_USERS}")
                seed = hash((cname, psname, i, "v11_full")) % (2**32)
                m = simulate_player(
                    curve=curve,
                    prot_indom=ps["indom"], prot_saint=ps["saint"],
                    skip_gold=skip_mid, mat_lookup=mat_lk,
                    sell_at=10, push_chance=0.40,  # "ambitious" 전략
                    seed=seed, phase_a_only=False, max_clicks=MAX_CLICKS,
                )
                metrics.append(m)
            done += 1

            comp  = [m for m in metrics if m["completed"]]
            total = metrics

            def agg(key, idx=None):
                if idx is None:
                    vals = [m[key] for m in comp if m[key] is not None]
                else:
                    vals = [m["phase_hours"][idx] for m in comp
                            if m["phase_hours"][idx] is not None]
                return {
                    "p25": pct(vals, 25), "p50": pct(vals, 50),
                    "p75": pct(vals, 75), "p90": pct(vals, 90),
                }

            total_hours_all = [m["total_hours"] for m in comp]
            ph_a = [m["phase_hours"][0] for m in comp if m["phase_hours"][0]]
            ph_b = [m["phase_hours"][1] for m in comp if m["phase_hours"][1]]
            ph_c = [m["phase_hours"][2] for m in comp if m["phase_hours"][2]]
            ph_d = [m["phase_hours"][3] for m in comp if m["phase_hours"][3]]

            comp_rate   = len(comp) / MC_USERS
            skip_use_p  = pct([m["skip_used"] for m in total], 50)
            mats_cons_p = pct([m["mats_consumed"] for m in comp], 50)
            mats_pres_p = pct([m["mats_preserved"] for m in comp], 50)
            dest_p50    = pct([m["destructions"] for m in comp], 50)

            # Phase 비율 (p50 기준)
            t50 = pct(total_hours_all, 50) or 1
            a50 = pct(ph_a, 50) or 0
            b50 = pct(ph_b, 50) or 0
            c50 = pct(ph_c, 50) or 0
            d50 = pct(ph_d, 50) or 0
            ratio_a = round(a50 / t50 * 100, 1) if t50 > 0 else 0
            ratio_b = round(b50 / t50 * 100, 1) if t50 > 0 else 0
            ratio_c = round(c50 / t50 * 100, 1) if t50 > 0 else 0
            ratio_d = round(d50 / t50 * 100, 1) if t50 > 0 else 0

            # 성공 기준 점수
            score = 0
            if 5.0 <= t50 <= 7.0:      score += 30
            elif 4.0 <= t50 <= 8.0:    score += 15
            if comp_rate >= 0.95:       score += 25
            elif comp_rate >= 0.90:     score += 12
            if 5 <= ratio_a <= 15:      score += 10
            if 15 <= ratio_b <= 35:     score += 10
            if 50 <= ratio_c + ratio_d <= 75: score += 10
            if ratio_a >= 5 and ratio_b >= 10: score += 5

            results[sc_key] = {
                "curve": cname, "protect_set": psname,
                "prot_indom": ps["indom"], "prot_saint": ps["saint"],
                "n": MC_USERS,
                "completion_rate": round(comp_rate, 3),
                "total_hours": agg("total_hours"),
                "phase_a_hours": {"p25": pct(ph_a,25),"p50": pct(ph_a,50),"p75": pct(ph_a,75)},
                "phase_b_hours": {"p25": pct(ph_b,25),"p50": pct(ph_b,50),"p75": pct(ph_b,75)},
                "phase_c_hours": {"p25": pct(ph_c,25),"p50": pct(ph_c,50),"p75": pct(ph_c,75)},
                "phase_d_hours": {"p25": pct(ph_d,25),"p50": pct(ph_d,50),"p75": pct(ph_d,75)},
                "phase_ratios_p50": {
                    "A": ratio_a, "B": ratio_b, "C": ratio_c, "D": ratio_d,
                    "total_hours": round(t50, 2),
                },
                "materials": {
                    "consumed_p50": mats_cons_p,
                    "preserved_p50": mats_pres_p,
                    "preserve_rate": round(mats_pres_p / (mats_cons_p + mats_pres_p), 3)
                                     if mats_cons_p and mats_pres_p else None,
                },
                "skip_used_p50": skip_use_p,
                "destructions_p50": dest_p50,
                "score": score,
            }

            r = results[sc_key]
            log(f"    완료 {comp_rate*100:.0f}%  총{r['phase_ratios_p50']['total_hours']:.2f}h "
                f"A={ratio_a}% B={ratio_b}% C={ratio_c}% D={ratio_d}%  score={score}")

    save_json("sim_step3_results.json", results)

    # 보고서
    lines = [
        "# Step 3 — Full Game MC 결과\n\n",
        "성공 기준: 총 p50=5~7h, 달성률≥95%, A=5~15%, B=15~35%, C+D=50~75%\n\n",
        "| 시나리오 | 완료율 | 총(p50) | A | B | C | D | 점수 |\n",
        "|----------|--------|---------|---|---|---|---|------|\n",
    ]
    for k, v in sorted(results.items(), key=lambda x: -x[1]["score"]):
        r = v["phase_ratios_p50"]
        cr = v["completion_rate"] * 100
        ok_total = "✅" if 5 <= r["total_hours"] <= 7 else "⚠️"
        ok_comp  = "✅" if v["completion_rate"] >= 0.95 else "⚠️"
        lines.append(
            f"| {k} | {cr:.0f}%{ok_comp} | {r['total_hours']:.2f}h{ok_total} "
            f"| {r['A']}% | {r['B']}% | {r['C']}% | {r['D']}% | {v['score']} |\n"
        )
    save_md("sim_step3_report.md", "".join(lines))
    log("=== STEP 3 DONE ===")
    return results


# ================================================================
# STEP 4: FINALIZE — 최적 시나리오 선택 + config 출력
# ================================================================
def step4_finalize(step1_res, step2_res, step3_res):
    log("=== STEP 4: Finalize ===")

    # 최고 점수 시나리오 선택
    best_key = max(step3_res, key=lambda k: step3_res[k]["score"])
    best = step3_res[best_key]
    best_curve_name = best["curve"]
    best_curve = CURVES[best_curve_name]
    best_ps    = PROTECT_SETS[best["protect_set"]]

    log(f"  최적 시나리오: {best_key}  score={best['score']}")

    # 성공 기준 달성 여부
    r     = best["phase_ratios_p50"]
    t50   = r["total_hours"]
    comp  = best["completion_rate"]
    ra, rb, rc, rd = r["A"], r["B"], r["C"], r["D"]

    criteria = {
        "총_플레이타임_5~7h":    5.0 <= t50 <= 7.0,
        "달성률_95%+":           comp >= 0.95,
        "Phase_A_5~15%":        5  <= ra <= 15,
        "Phase_B_15~35%":       15 <= rb <= 35,
        "Phase_CD_50~75%":      50 <= rc + rd <= 75,
        "Phase_A_최소10%":      ra >= 5,
    }
    all_passed = all(criteria.values())

    # 확정 수치 출력 (final_config_update.json)
    skip_costs_out = {}
    skip_mids = {k: v["gold_mid"] for k, v in step1_res["skip_gold_costs"].items()}
    skip_frags = {
        "scavenger":         ("refined_iron",    1, 5),
        "indomitable_smith": ("refined_iron",    1, 7),
        "sword_saint":       ("enchanted_iron",  1, 8),
        "master_smith":      ("unknown_mineral", 1, 12),
        "refine_peak":       ("unknown_mineral", 1, 12),
        "legend_smith":      (None, 0, 25),
    }
    for tid, (fid, fcnt, tgt) in skip_frags.items():
        skip_costs_out[tid] = {
            "targetLevel": tgt,
            "gold": skip_mids.get(tid, 0),
            "fragmentId": fid,
            "fragmentCount": fcnt,
        }

    # upgradeSuccessRates (from best curve)
    upgrade_rates = []
    for frm in range(25):
        to = frm + 1
        rate = best_curve.get(to, 0.10)
        upgrade_rates.append({
            "from": frm, "to": to,
            "rate": round(rate, 3),
            "nearMiss": frm >= 15,
        })

    # scrollPrices
    scroll_x1 = 150
    scroll_x5  = int(scroll_x1 * 5 * 0.85)
    scroll_x10 = int(scroll_x1 * 10 * 0.75)

    # 조합소 레시피 수량 확정
    sa = step1_res["sword_amounts"]
    scroll_recipes = [
        {"fragmentId": k, "amount": v, "yield": 1}
        for k, v in step1_res["scroll_amounts"].items()
    ]
    sword_recipes_out = {
        "+8_enchanted":  sa["+8_enchanted_iron"],
        "+12_enchanted": sa["+12_enchanted_iron"],
        "+12_mineral":   sa["+12_unknown_mineral"],
        "+15_moonlight": sa["+15_moonlight"],
        "+16_mineral":   sa["+16_unknown_mineral"],
        "+18_twisted":   sa["+18_twisted_mana"],
        "+19_twisted":   sa["+19_twisted_mana"],
        "+20_twisted":   sa["+20_twisted_mana"],
    }

    final_config = {
        "_comment": f"v11 확정 수치 — 최적 시나리오: {best_key} (score={best['score']})",
        "_generated": time.strftime("%Y-%m-%d %H:%M"),
        "upgradeSuccessRates": upgrade_rates,
        "titleProtection": {
            "indomitable_smith": {"chance": best_ps["indom"]},
            "sword_saint": {
                "chance": best_ps["saint"],
                "fragmentDropChance": 0.50,
                "materialPreserveOnProtect": True,
            },
        },
        "skipCosts": skip_costs_out,
        "shop": {
            "scrollPrices": {
                "x1":  {"count": 1,  "price": scroll_x1},
                "x5":  {"count": 5,  "price": scroll_x5},
                "x10": {"count": 10, "price": scroll_x10},
            }
        },
        "crafting_scroll_amounts": scroll_recipes,
        "crafting_sword_amounts":  sword_recipes_out,
        "dropBaseChance": DROP_BASE,
        "fragmentQuantityChance": {"single": FRAG_SINGLE, "double": 1 - FRAG_SINGLE},
    }

    save_json("final_config_update.json", final_config)

    # ── 종합 보고서 ───────────────────────────────────────────────
    def checkmark(b): return "✅" if b else "❌"
    def na(v): return str(v) if v is not None else "N/A"

    # Step 2 요약
    step2_summary = []
    for k, v in step2_res.items():
        ok = "✅" if 0.33 <= (v["phase_a_hours_p50"] or 0) <= 0.83 else "⚠️"
        step2_summary.append(f"| {k} | {v['completion_rate']*100:.0f}% "
                             f"| {v['phase_a_hours_p50']}h {ok} "
                             f"| 불굴 {v['indom_unlock_rate']*100:.0f}% |\n")

    # Step 3 요약
    step3_summary = []
    for k, v in sorted(step3_res.items(), key=lambda x: -x[1]["score"]):
        r2 = v["phase_ratios_p50"]
        step3_summary.append(
            f"| {k} | {v['completion_rate']*100:.0f}% | {r2['total_hours']:.2f}h "
            f"| {r2['A']}% | {r2['B']}% | {r2['C']}% | {r2['D']}% | {v['score']} |\n"
        )

    # 미달 시 조정 제안
    suggestions = []
    if t50 > 7.0:
        suggestions.append(f"- 총 플레이타임 {t50:.2f}h > 7h -> 확률 곡선 추가 상향 또는 보호율 증가")
    if t50 < 5.0:
        suggestions.append(f"- 총 플레이타임 {t50:.2f}h < 5h -> 확률 곡선 하향 또는 재료 요구 강화")
    if comp < 0.95:
        suggestions.append(f"- 달성률 {comp*100:.1f}% < 95% -> 검성 보호율 상향 또는 확률 곡선 상향")
    if ra < 5:
        suggestions.append(f"- Phase A {ra}% < 5% -> Phase A가 너무 짧음. 불굴 조건 강화 필요")
    if rb < 15:
        suggestions.append(f"- Phase B {rb}% < 15% -> Phase B가 너무 짧음. 건너뛰기 비용 확인")
    if rc + rd > 75:
        suggestions.append(f"- Phase C+D {rc+rd}% > 75% -> 후반이 너무 무거움. +17~+25 확률 추가 상향")

    # f-string 내 백슬래시 금지(Python 3.11) → 테이블 문자열 사전 계산
    _nl = "\n"
    step2_table  = "".join(step2_summary)
    step3_table  = "".join(step3_summary)
    suggest_text = "\n".join(suggestions) if suggestions else "- 없음 (모든 기준 달성)"
    skip_table   = "".join(
        f"| {k} | +{v['targetLevel']} | {v['fragmentId'] or '없음'} | {v['gold']}G |\n"
        for k, v in skip_costs_out.items()
    )
    scroll_table = "".join(
        f"| {r['fragmentId']} | {r['amount']} |\n"
        for r in scroll_recipes
    )
    curve_json   = json.dumps(
        {f"+{fr}to+{fr+1}": round(best_curve.get(fr+1, 0.10), 3) for fr in range(25)},
        indent=2
    )
    verdict      = "ALL CRITERIA MET" if all_passed else "PARTIAL"
    verdict_kr   = "모든 기준 달성" if all_passed else "일부 기준 미달"

    report = f"""# v11 종합 보고서

생성일: {time.strftime("%Y-%m-%d %H:%M")}
최적 시나리오: **{best_key}** (score={best['score']})

---

## 1. 성공 기준 달성 여부

| 기준 | 목표 | 결과 | 달성 |
|------|------|------|------|
| 총 플레이타임 p50 | 5~7h | {t50:.2f}h | {checkmark(criteria['총_플레이타임_5~7h'])} |
| +25 달성률 | ≥95% | {comp*100:.1f}% | {checkmark(criteria['달성률_95%+'])} |
| Phase A 비율 | 5~15% | {ra}% | {checkmark(criteria['Phase_A_5~15%'])} |
| Phase B 비율 | 15~35% | {rb}% | {checkmark(criteria['Phase_B_15~35%'])} |
| Phase C+D 비율 | 50~75% | {rc+rd}% | {checkmark(criteria['Phase_CD_50~75%'])} |
| Phase A 최소 | ≥5% | {ra}% | {checkmark(criteria['Phase_A_최소10%'])} |

**종합 판정: ✅/⚠️ {verdict_kr}**

---

## 2. 최적 시나리오 상세 ({best_key})

| 항목 | 수치 |
|------|------|
| 확률 곡선 | {best_curve_name} |
| 불굴 보호율 | {best_ps['indom']*100:.0f}% |
| 검성 보호율 | {best_ps['saint']*100:.0f}% |
| 총 플레이타임 p50 | {t50:.2f}h |
| 총 플레이타임 p90 | {best['total_hours']['p90']}h |
| Phase A p50 | {best['phase_a_hours']['p50']}h ({ra}%) |
| Phase B p50 | {best['phase_b_hours']['p50']}h ({rb}%) |
| Phase C p50 | {best['phase_c_hours']['p50']}h ({rc}%) |
| Phase D p50 | {best['phase_d_hours']['p50']}h ({rd}%) |
| +25 달성률 | {comp*100:.1f}% |
| 파괴 횟수 p50 | {best['destructions_p50']} |
| 건너뛰기 사용 p50 | {best['skip_used_p50']} |
| 재료 소모 p50 | {best['materials']['consumed_p50']} |
| 재료 보존 p50 | {best['materials']['preserved_p50']} |
| 재료 보존률 | {best['materials']['preserve_rate']} |

### 확률 곡선 ({best_curve_name})

| +1~+7 | +8~+12 | +13~+17 | +18~+22 | +23~+25 |
|-------|--------|---------|---------|---------|
| 95~73% | {int(best_curve.get(8,0)*100)}~{int(best_curve.get(12,0)*100)}% | {int(best_curve.get(13,0)*100)}~{int(best_curve.get(17,0)*100)}% | {int(best_curve.get(18,0)*100)}~{int(best_curve.get(22,0)*100)}% | {int(best_curve.get(23,0)*100)}~{int(best_curve.get(25,0)*100)}% |

---

## 3. Step 2 — Phase A 결과 요약

| 시나리오 | 완료율 | p50(h) | 불굴 해금율 |
|----------|--------|--------|------------|
{step2_table}

---

## 4. Step 3 — 전체 게임 결과 요약

| 시나리오 | 완료율 | 총(p50) | A | B | C | D | 점수 |
|----------|--------|---------|---|---|---|---|------|
{step3_table}

---

## 5. 조정 제안

{suggest_text}

---

## 6. 확정 수치 요약

### 확률 곡선 ({best_curve_name})
```json
{curve_json}
```

### 건너뛰기 골드 비용 (MID tier)
| 칭호 | 목표 | 조각 | 골드 |
|------|------|------|------|
{skip_table}

### 조합소 스크롤 레시피
| 조각 | 필요 수량 |
|------|----------|
{scroll_table}

### 상점 스크롤 가격
- x1: {scroll_x1}G  x5: {scroll_x5}G  x10: {scroll_x10}G

---

*v11 시뮬레이션 완료. final_config_update.json을 config.json에 머지하면 확정됨.*
"""

    save_md("v11_final_report.md", report)
    log(f"=== STEP 4 DONE — {verdict} ===")
    return final_config


# ================================================================
# MAIN
# ================================================================
def main():
    log("Forge Game v11 Simulation START")
    log(f"설정: {MC_USERS}명/시나리오, MAX={MAX_CLICKS}클릭")

    s1 = step1_analytical()
    s2 = step2_phase_a(s1)
    s3 = step3_full_game(s1)
    s4 = step4_finalize(s1, s2, s3)

    elapsed = time.time() - T0
    log(f"DONE — 총 소요 {elapsed:.1f}s ({elapsed/60:.1f}분)")

if __name__ == "__main__":
    main()
