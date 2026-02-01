/**
 * Core financial game logic
 */

import {
  CANADIAN_FUNDS,
  TAX_BRACKETS,
  BASIC_PERSONAL_AMOUNT,
  BPA_CREDIT_RATE,
  LIFE_EVENTS,
  TIERS,
} from "./gameData.js";

/* ================= TAX ================= */

export function calculateTax(income) {
  let tax = 0;
  let prev = 0;

  for (const [ceiling, rate] of TAX_BRACKETS) {
    if (income <= prev) break;
    const taxable = Math.min(income, ceiling) - prev;
    tax += taxable * rate;
    prev = ceiling;
  }

  tax -= BASIC_PERSONAL_AMOUNT * BPA_CREDIT_RATE;
  tax = Math.max(0, tax);

  return {
    gross_income: income,
    total_tax: Math.round(tax * 100) / 100,
    effective_rate: income > 0 ? +(tax / income * 100).toFixed(2) : 0,
    take_home: Math.round((income - tax) * 100) / 100,
  };
}

/* ================= ALLOCATION ENGINE ================= */

export function getAllocationByAge(age, income, goals = []) {
  let base;

  if (age < 18) {
    base = { tfsa: 60, gic: 40 };
  } else if (age < 30) {
    base = goals.includes("home")
      ? { tfsa: 35, fhsa: 65 }
      : { tfsa: 60, rrsp: 40 };
  } else if (age < 45) {
    base = goals.includes("home")
      ? { tfsa: 40, rrsp: 30, fhsa: 30 }
      : { tfsa: 50, rrsp: 50 };
  } else {
    base = { tfsa: 35, rrsp: 25, gic: 40 };
  }

  // High income boost RRSP
  if (income > 100000 && base.rrsp) {
    base.rrsp = Math.min(base.rrsp + 10, 50);
    if (base.tfsa) base.tfsa -= 10;
  }

  // Normalize to 100%
  const total = Object.values(base).reduce((a, b) => a + b, 0);
  const normalized = {};
  for (const k in base) normalized[k] = Math.round((base[k] / total) * 100);

  const taxInfo = calculateTax(income);

  return {
    allocation: normalized,
    monthly_invest_recommended: Math.round((taxInfo.take_home * 0.15) / 12),
    tax_info: taxInfo,
  };
}

export function calculateDonationCredit(donationAmount, taxableIncome) {
        const FED_FIRST_200 = 0.15;
        const FED_OVER_200 = 0.29;
        const FED_TOP_RATE_THRESHOLD = 235675;
        const FED_TOP_RATE = 0.33;
        const ONT_FIRST_200 = 0.0505;
        const ONT_OVER_200 = 0.1116;

        const amt = Math.max(0, donationAmount);
        const fedOver = taxableIncome <= FED_TOP_RATE_THRESHOLD ? FED_OVER_200 : FED_TOP_RATE;

        let fed, ont;
        if (amt <= 200) {
            fed = amt * FED_FIRST_200;
            ont = amt * ONT_FIRST_200;
        } else {
            fed = 200 * FED_FIRST_200 + (amt - 200) * fedOver;
            ont = 200 * ONT_FIRST_200 + (amt - 200) * ONT_OVER_200;
        }

        const total = fed + ont;
        return {
            donation: round2(amt),
            federal_credit: round2(fed),
            provincial_credit: round2(ont),
            total_credit: round2(total),
        };
    }

/* ================= YEAR SIMULATION ================= */

export function simulateYear({
  portfolio = {},
  cash = 0,
  age = 25,
  income = 60000,
  year = 2025,
  monthly_contribution = 500,
  trigger_event = null,
  force_no_event = false,
}) {
  const inflation = 0.025;

  // Pick event
  let event = null;
  if (trigger_event) {
    event = LIFE_EVENTS.find((e) => e.id === trigger_event);
  } else if (!force_no_event && Math.random() < 0.25) {
    event = LIFE_EVENTS[Math.floor(Math.random() * LIFE_EVENTS.length)];
  }

  // Cash growth
  let newCash = cash + monthly_contribution * 12;

  // Grow portfolio
  const newPortfolio = {};
  for (const [asset, bal] of Object.entries(portfolio)) {
    const r = CANADIAN_FUNDS[asset]?.annual_return ?? 0.05;
    newPortfolio[asset] = Math.round(bal * (1 + r));
  }

  // Apply event
  let eventApplied = null;
  if (event) {
    eventApplied = { ...event };

    // Market effect
    if (event.market_effect) {
      for (const a of ["stock", "etf", "mutual_fund"]) {
        if (newPortfolio[a]) {
          newPortfolio[a] = Math.round(newPortfolio[a] * (1 + event.market_effect));
        }
      }
    }

    // Cost or gain
    if (event.cost > 0) {
      let remaining = event.cost;
      if (newCash >= remaining) {
        newCash -= remaining;
        remaining = 0;
      } else {
        remaining -= newCash;
        newCash = 0;
      }

      const withdrawOrder = ["gic", "tfsa", "etf", "mutual_fund", "stock", "rrsp", "fhsa"];
      for (const a of withdrawOrder) {
        if (remaining <= 0 || !newPortfolio[a]) continue;
        const w = Math.min(newPortfolio[a], remaining);
        newPortfolio[a] -= w;
        remaining -= w;
      }

      eventApplied.actual_cost = event.cost;
    }

    if (event.cost < 0) {
      newCash += Math.abs(event.cost);
      eventApplied.actual_gain = Math.abs(event.cost);
    }
  }

  const netWorth =
    newCash + Object.values(newPortfolio).reduce((a, b) => a + b, 0);

  // Checkpoints
  const checkpoints = [];
  if (newPortfolio.tfsa > 0) checkpoints.push("open_tfsa");
  if (newPortfolio.rrsp > 0) checkpoints.push("open_rrsp");
  if (newPortfolio.fhsa > 0) checkpoints.push("open_fhsa");
  if (newCash >= monthly_contribution * 3) checkpoints.push("emergency_fund");
  if (event?.market_effect < 0) checkpoints.push("survived_crash");
  if (netWorth >= 10000) checkpoints.push("net_worth_10k");
  if (netWorth >= 50000) checkpoints.push("net_worth_50k");
  if (Object.values(newPortfolio).filter((v) => v > 0).length >= 3)
    checkpoints.push("diversified");

  return {
    portfolio: newPortfolio,
    cash: Math.round(newCash),
    age: age + 1,
    year: year + 1,
    net_worth: Math.round(netWorth),
    event: eventApplied,
    earned_checkpoints: checkpoints,
    inflation_rate: inflation,
  };
}

/* ================= TIERS ================= */

export function getTier(points) {
  return TIERS.reduce((acc, t) => (points >= t.min_points ? t : acc), TIERS[0]);
}

/* ================= END GAME SUMMARY ================= */

export function generateGameSummary({
  starting_age = 25,
  ending_age = 65,
  starting_income = 60000,
  final_portfolio = {},
  final_cash = 0,
  checkpoints_earned = [],
  total_points = 0,
}) {
  const netWorth =
    final_cash + Object.values(final_portfolio).reduce((a, b) => a + b, 0);
  const years = ending_age - starting_age;

  const gicPct = (final_portfolio.gic || 0) / Math.max(netWorth, 1) * 100;
  const cashPct = final_cash / Math.max(netWorth, 1) * 100;

  const personality =
    gicPct > 40 || cashPct > 40 ? "Ultra Conservative" : "Balanced Strategist";

  let literacy = Math.min(checkpoints_earned.length * 10, 100);

  return {
    net_worth: Math.round(netWorth),
    personality,
    literacy_score: literacy,
    tier: getTier(total_points),
    total_points,
    years_played: years,
  };
}
