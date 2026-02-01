/**
 * Financial Health Scoring System
 * Migrated from financial_score.py
 */

/**
 * Clamp a value between lo and hi
 */
function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
}

/**
 * Calculate diversification score using Herfindahl index
 */
export function herfindahlDiversification(weights) {
    let w = weights.filter((x) => x !== null && x !== undefined).map((x) => parseFloat(x));
    if (w.length === 0) return 0;

    const s = w.reduce((a, b) => a + b, 0);
    if (s <= 0) return 0;

    w = w.map((x) => x / s); // normalize
    const h = w.reduce((sum, x) => sum + x * x, 0); // Herfindahl
    const raw = 1 - h;
    const n = w.length;

    if (n === 1) return 0;
    const maxRaw = 1 - 1 / n;
    return clamp(raw / maxRaw, 0, 1);
}

/**
 * Linear score toward target
 */
function linearTargetScore(value, target) {
    if (target <= 0) return 0;
    return clamp(value / target, 0, 1);
}

/**
 * Calculate financial health score (0-100)
 */
export function calculateFinancialHealthScore({
    annual_income = 0,
    annual_saved_or_invested = 0,
    emergency_fund_cash = 0,
    essential_monthly_expenses = 100,
    tax_advantaged_invest_share = 0,
    diversification_score = null,
    portfolio_weights = null,
    annual_charity = 0,
    weights = null,
    targets = null,
}) {
    // Defaults
    const w = weights || {
        savings_rate: 0.3,
        emergency_fund: 0.25,
        tax_efficiency: 0.15,
        diversification: 0.1,
    };

    const t = targets || {
        savings_rate_target: 0.2,
        emergency_months_target: 6,
        charity_target: 0.05,
    };

    // Validation
    const income = Math.max(0, annual_income);
    if (income <= 0) throw new Error('annual_income must be > 0');

    const saved = Math.max(0, annual_saved_or_invested);
    const savingsRate = saved / income;

    const essentialExp = Math.max(0.01, essential_monthly_expenses);
    const emergencyMonths = Math.max(0, emergency_fund_cash) / essentialExp;

    const taxShare = clamp(tax_advantaged_invest_share, 0, 1);

    // Diversification
    let divScore;
    if (diversification_score !== null) {
        divScore = clamp(diversification_score, 0, 1);
    } else if (portfolio_weights) {
        divScore = herfindahlDiversification(portfolio_weights);
    } else {
        divScore = 0;
    }

    // Subscores (0-1)
    const scoreS = linearTargetScore(savingsRate, t.savings_rate_target);
    const scoreE = linearTargetScore(emergencyMonths, t.emergency_months_target);
    const scoreT = taxShare;
    const scoreA = divScore;

    const subscores = {
        savings_rate: scoreS,
        emergency_fund: scoreE,
        tax_efficiency: scoreT,
        diversification: scoreA,
    };

    // Weighted sum -> 0-100
    let base = 100 * (w.savings_rate * scoreS + w.emergency_fund * scoreE + w.tax_efficiency * scoreT + w.diversification * scoreA);

    // Charity bonus
    const charity = Math.max(0, annual_charity);
    const charityRate = charity / income;
    const charityScore = linearTargetScore(charityRate, t.charity_target);
    const bonus = 5 * charityScore; // max 5 points

    const total = clamp(base + bonus, 0, 100);

    // Recommendations
    const recs = [];
    if (savingsRate < 0.1) {
        recs.push(
            'Consider increasing your savings/investing rate toward 10–20% of income (even small automatic transfers help).'
        );
    } else if (savingsRate < t.savings_rate_target) {
        recs.push('You\'re saving/investing, but pushing toward ~20% can significantly improve long-term outcomes.');
    }

    if (emergencyMonths < 1) {
        recs.push('Build a starter emergency fund (aim for 1 month of essential expenses first).');
    } else if (emergencyMonths < 3) {
        recs.push('Emergency fund is below 3 months—consider building it up for better stability.');
    } else if (emergencyMonths < t.emergency_months_target) {
        recs.push('Emergency fund is solid—consider aiming for ~6 months if your income is volatile.');
    }

    if (taxShare < 0.5) {
        recs.push('If available, consider increasing contributions to tax-advantaged accounts (e.g., TFSA/RRSP) for better tax efficiency.');
    }

    if (divScore < 0.4) {
        recs.push('Your portfolio looks concentrated—broad index funds/ETFs can improve diversification and reduce single-stock risk.');
    }

    if (recs.length === 0) {
        recs.push('Nice—your basics look strong. Consider reviewing once per quarter and adjusting goals as your situation changes.');
    }

    const metrics = {
        savings_rate: savingsRate,
        emergency_months: emergencyMonths,
        charity_rate: charityRate,
    };

    return {
        score_0_100: total,
        subscores,
        metrics,
        recommendations: recs,
    };
}