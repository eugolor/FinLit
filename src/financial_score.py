@dataclass
class financial_score:
    Emergency_fund_status:
    Diversification:
    Intentionality:
    Weights: #beginner level
        
    
    def diversification(self):
        #based on percentage of income invested in stocks, mutual funds, etc,


"""
Financial Health Score (0–100) based on financial behaviors.

What it uses (all inputs are user-provided, simple + hackathon-friendly):
- Savings rate (saved/invested as % of income)
- Emergency fund months (cash / essential monthly expenses)
- High-interest debt burden (high-interest debt payments as % of income)
- Tax-advantaged investing share (0–1)
- Diversification score (0–1) OR compute from portfolio weights
- Optional charity rate (as % of income)

Outputs:
- total score (0–100)
- subscores (0–1 each)
- plain-language recommendations
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence
import math


# ----------------------------
# Helpers
# ----------------------------

def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def herfindahl_diversification(weights: Sequence[float]) -> float:
    """
    Convert portfolio weights into a 0–1 diversification score.

    Uses 1 - sum(w_i^2) (the complement of the Herfindahl index),
    then rescales so that:
      - concentrated portfolio -> near 0
      - many equal weights -> approaches 1

    Note: The raw 1 - sum(w^2) already lies in (0, 1 - 1/N].
    We'll rescale by dividing by (1 - 1/N) so max becomes ~1.
    """
    w = [float(x) for x in weights if x is not None]
    if not w:
        return 0.0
    s = sum(w)
    if s <= 0:
        return 0.0
    w = [x / s for x in w]  # normalize
    h = sum(x * x for x in w)               # Herfindahl concentration
    raw = 1.0 - h                           # diversification complement
    n = len(w)
    if n == 1:
        return 0.0
    max_raw = 1.0 - (1.0 / n)               # achieved by equal weights
    return clamp(raw / max_raw, 0.0, 1.0)

# def exp_debt_score(debt_payment_rate: float, k: float = 4.0) -> float:
#     """
#     Smooth penalty for high-interest debt burden.
#     debt_payment_rate = (monthly high-interest debt payments) / (monthly income)
#     or as fraction of income. Example: 0.10 means 10% of income.

#     Score = exp(-k * debt_payment_rate)
#     """
#     d = max(0.0, float(debt_payment_rate))
#     return clamp(math.exp(-k * d), 0.0, 1.0)

def linear_target_score(value: float, target: float) -> float:
    """
    Score rises linearly to 1 at `target`, then caps at 1.
    """
    if target <= 0:
        return 0.0
    return clamp(float(value) / float(target), 0.0, 1.0)


# ----------------------------
# Inputs / Outputs
# ----------------------------

@dataclass
class FinancialProfile:
    # Core inputs
    annual_income: float                          # gross or net is fine, just be consistent
    annual_saved_or_invested: float               # total saved/invested per year
    emergency_fund_cash: float                    # liquid cash for emergencies
    essential_monthly_expenses: float             # "needs" spend per month

    # Debt: focus on high-interest debt (credit cards, payday loans, etc.)
    #annual_high_interest_debt_payments: float = 0.0  # total annual payments toward high-interest debt
    # Alternatively you could use total debt balance; payments are more behavior-linked.

    # Investing quality
    tax_advantaged_invest_share: float = 0.0      # fraction of investments in TFSA/RRSP/401k/etc. (0–1)

    # Diversification: either provide directly OR provide weights
    diversification_score: Optional[float] = None # 0–1 (1 is very diversified)
    portfolio_weights: Optional[Sequence[float]] = None

    # Optional: charity giving (as behavior bonus, lightly weighted)
    annual_charity: float = 0.0


@dataclass
class FinancialHealthResult:
    score_0_100: float
    subscores: Dict[str, float]
    metrics: Dict[str, float]
    recommendations: List[str]


# ----------------------------
# Scoring
# ----------------------------

def financial_health_score(
    profile: FinancialProfile,
    *,
    weights: Dict[str, float] | None = None,
    targets: Dict[str, float] | None = None,
    debt_k: float = 4.0,
    charity_bonus_max: float = 5.0
) -> FinancialHealthResult:
    """
    Compute a 0–100 Financial Health Score.

    Default weights sum to 1.0:
      - savings_rate: 0.30
      - emergency_fund: 0.25
      - debt: 0.20
      - tax_efficiency: 0.15
      - diversification: 0.10

    Targets (defaults):
      - savings_rate_target: 0.20 (20% of income)
      - emergency_months_target: 6 months
      - charity_target: 0.05 (5% of income) for max bonus

    Returns a result with subscores and human recommendations.
    """
    # Defaults
    w = weights or {
        "savings_rate": 0.30,
        "emergency_fund": 0.25,
        #"debt": 0.20,
        "tax_efficiency": 0.15,
        "diversification": 0.10,
    }
    t = targets or {
        "savings_rate_target": 0.20,
        "emergency_months_target": 6.0,
        "charity_target": 0.05,
    }

    # Basic validation / safety
    income = max(0.0, float(profile.annual_income))
    if income <= 0:
        raise ValueError("annual_income must be > 0")

    saved = max(0.0, float(profile.annual_saved_or_invested))
    savings_rate = saved / income

    essential_exp = max(0.01, float(profile.essential_monthly_expenses))  # avoid divide-by-zero
    emergency_months = max(0.0, float(profile.emergency_fund_cash)) / essential_exp

    #debt_payments = max(0.0, float(profile.annual_high_interest_debt_payments))
    #debt_payment_rate = debt_payments / income

    tax_share = clamp(float(profile.tax_advantaged_invest_share), 0.0, 1.0)

    # Diversification
    if profile.diversification_score is not None:
        div_score = clamp(float(profile.diversification_score), 0.0, 1.0)
    elif profile.portfolio_weights is not None:
        div_score = herfindahl_diversification(profile.portfolio_weights)
    else:
        div_score = 0.0  # unknown -> conservative

    # Subscores (0–1)
    score_s = linear_target_score(savings_rate, t["savings_rate_target"])
    score_e = linear_target_score(emergency_months, t["emergency_months_target"])
    #score_d = exp_debt_score(debt_payment_rate, k=debt_k)
    score_t = tax_share
    score_a = div_score

    subscores = {
        "savings_rate": score_s,
        "emergency_fund": score_e,
        #"debt": score_d,
        "tax_efficiency": score_t,
        "diversification": score_a,
    }

    # Weighted sum -> 0–100
    base = 100.0 * sum(w[k] * subscores[k] for k in subscores)

    # Optional charity bonus (0 to charity_bonus_max)
    charity = max(0.0, float(profile.annual_charity))
    charity_rate = charity / income
    charity_score = linear_target_score(charity_rate, t["charity_target"])
    bonus = charity_bonus_max * charity_score

    total = clamp(base + bonus, 0.0, 100.0)

    # Recommendations (simple rules)
    recs: List[str] = []
    if savings_rate < 0.10:
        recs.append("Consider increasing your savings/investing rate toward 10–20% of income (even small automatic transfers help).")
    elif savings_rate < t["savings_rate_target"]:
        recs.append("You’re saving/investing, but pushing toward ~20% can significantly improve long-term outcomes.")

    if emergency_months < 1.0:
        recs.append("Build a starter emergency fund (aim for 1 month of essential expenses first).")
    elif emergency_months < 3.0:
        recs.append("Emergency fund is below 3 months—consider building it up for better stability.")
    elif emergency_months < t["emergency_months_target"]:
        recs.append("Emergency fund is solid—consider aiming for ~6 months if your income is volatile.")

    #if debt_payment_rate > 0.10:
    #    recs.append("High-interest debt payments are heavy—prioritize paying down high-interest debt (it often beats investing returns).")
    #elif debt_payment_rate > 0.03:
    #    recs.append("If any high-interest debt remains, paying it down faster can improve your score and reduce risk.")

    if tax_share < 0.5:
        recs.append("If available, consider increasing contributions to tax-advantaged accounts (e.g., TFSA/RRSP) for better tax efficiency.")

    if div_score < 0.4:
        recs.append("Your portfolio looks concentrated—broad index funds/ETFs can improve diversification and reduce single-stock risk.")

    # If nothing triggered:
    if not recs:
        recs.append("Nice—your basics look strong. Consider reviewing once per quarter and adjusting goals as your situation changes.")

    metrics = {
        "savings_rate": float(savings_rate),
        "emergency_months": float(emergency_months),
        #"debt_payment_rate": float(debt_payment_rate),
        "charity_rate": float(charity_rate),
    }

    return FinancialHealthResult(
        score_0_100=total,
        subscores=subscores,
        metrics=metrics,
        recommendations=recs,
    )


# ----------------------------
# Example
# ----------------------------

if __name__ == "__main__":
    prof = FinancialProfile(
        annual_income=85000,
        annual_saved_or_invested=14000,
        emergency_fund_cash=12000,
        essential_monthly_expenses=3200,
        #annual_high_interest_debt_payments=3000,
        tax_advantaged_invest_share=0.7,
        portfolio_weights=[0.25, 0.25, 0.25, 0.25],  # diversified-ish
        annual_charity=1000
    )

    res = financial_health_score(prof)

    print("Financial Health Score:", round(res.score_0_100, 1))
    print("Subscores:", {k: round(v, 2) for k, v in res.subscores.items()})
    print("Metrics:", {k: round(v, 3) for k, v in res.metrics.items()})
    print("Recommendations:")
    for r in res.recommendations:
        print(" -", r)



#Optiona: AI attachment that gets JSON file to interpret decision making