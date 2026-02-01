"""
Precompute regime-switching (HMM-style) Monte Carlo projections for many tickers.

What this script does:
1) Download price history with yfinance
2) Convert to monthly log returns
3) Fit a 2-state Gaussian HMM (Baum–Welch / EM)
4) Simulate many future return multipliers (NOT prices) out to N years
5) Save per-year multiplier percentiles (p10/p50/p90) + growth/risk + model params to JSON

Why multipliers?
- They stay valid even when today's price changes.
- At request time you do: future_price = current_price * multiplier_percentile

Hackathon notes:
- Uses only numpy/pandas/yfinance (no hmmlearn).
- For speed, precompute yearly multipliers (not full monthly paths).
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, List, Tuple, Sequence, Optional

import numpy as np
import pandas as pd


# ---------------------------
# Data
# ---------------------------

def fetch_prices(ticker: str, start: str = "2010-01-01", end: str | None = None) -> pd.Series:
    import yfinance as yf
    df = yf.download(ticker, start=start, end=end, auto_adjust=True, progress=False)
    if df.empty:
        raise ValueError(f"No data returned for {ticker}")
    col = "Close" if "Close" in df.columns else df.columns[0]
    px = df[col].dropna()
    px.name = ticker.upper()
    return px

def monthly_log_returns(px: pd.Series) -> pd.Series:
    m = px.resample("M").last().dropna()
    r = np.log(m / m.shift(1)).dropna()
    r.name = px.name + "_logret_m"
    return r


# ---------------------------
# 2-state Gaussian HMM (Baum–Welch / EM)
# ---------------------------

def _logsumexp(a: np.ndarray, axis=None, keepdims=False) -> np.ndarray:
    a_max = np.max(a, axis=axis, keepdims=True)
    out = a_max + np.log(np.sum(np.exp(a - a_max), axis=axis, keepdims=True))
    if not keepdims:
        out = np.squeeze(out, axis=axis)
    return out

def _log_norm_pdf(x: np.ndarray, mu: np.ndarray, sigma: np.ndarray) -> np.ndarray:
    """
    x: (T,)
    mu, sigma: (K,)
    returns log p(x_t | state=k): (T, K)
    """
    T = x.shape[0]
    K = mu.shape[0]
    x_ = x.reshape(T, 1)
    mu_ = mu.reshape(1, K)
    sig_ = np.maximum(sigma.reshape(1, K), 1e-8)
    return -0.5*np.log(2*np.pi) - np.log(sig_) - 0.5*((x_ - mu_) / sig_)**2

def fit_gaussian_hmm_2state(
    returns: pd.Series,
    n_iter: int = 75,
    tol: float = 1e-6,
    seed: int = 0,
    init_persist: float = 0.90
) -> dict:
    """
    Fit a 2-state Gaussian HMM to 1D monthly log returns.
    Returns dict with: mu_m, sigma_m, A, pi, gamma, loglik_history
    """
    rng = np.random.default_rng(seed)
    x = returns.values.astype(float)
    T = x.shape[0]
    K = 2

    # Init by median split
    med = np.median(x)
    s0 = x[x <= med]
    s1 = x[x > med]
    if len(s0) < 5 or len(s1) < 5:
        idx = rng.permutation(T)
        cut = T // 2
        s0, s1 = x[idx[:cut]], x[idx[cut:]]

    mu = np.array([np.mean(s0), np.mean(s1)], dtype=float)
    sigma = np.maximum(np.array([np.std(s0, ddof=1), np.std(s1, ddof=1)], dtype=float), 1e-4)

    A = np.array([[init_persist, 1-init_persist],
                  [1-init_persist, init_persist]], dtype=float)
    pi = np.array([0.5, 0.5], dtype=float)

    loglik_history: List[float] = []
    gamma_last = None

    for it in range(n_iter):
        logB = _log_norm_pdf(x, mu, sigma)          # (T,K)
        logA = np.log(np.maximum(A, 1e-16))
        logpi = np.log(np.maximum(pi, 1e-16))

        # Forward
        log_alpha = np.zeros((T, K), dtype=float)
        log_alpha[0] = logpi + logB[0]
        for t in range(1, T):
            log_alpha[t] = logB[t] + _logsumexp(log_alpha[t-1].reshape(K, 1) + logA, axis=0)

        loglik = float(_logsumexp(log_alpha[-1], axis=0))
        loglik_history.append(loglik)

        # Backward
        log_beta = np.zeros((T, K), dtype=float)
        log_beta[-1] = 0.0
        for t in range(T-2, -1, -1):
            log_beta[t] = _logsumexp(logA + (logB[t+1] + log_beta[t+1]).reshape(1, K), axis=1)

        # Gamma
        log_gamma = log_alpha + log_beta
        log_gamma -= _logsumexp(log_gamma, axis=1, keepdims=True)
        gamma = np.exp(log_gamma)

        # Xi
        log_xi = np.zeros((T-1, K, K), dtype=float)
        for t in range(T-1):
            log_xi[t] = (
                log_alpha[t].reshape(K, 1) +
                logA +
                logB[t+1].reshape(1, K) +
                log_beta[t+1].reshape(1, K)
            )
            log_xi[t] -= _logsumexp(log_xi[t], axis=(0, 1), keepdims=True)
        xi = np.exp(log_xi)

        # M-step
        pi = gamma[0].copy()
        A = xi.sum(axis=0)
        A = A / np.maximum(A.sum(axis=1, keepdims=True), 1e-16)

        w = gamma.sum(axis=0)
        mu_new = (gamma * x.reshape(T, 1)).sum(axis=0) / np.maximum(w, 1e-16)
        var_new = (gamma * (x.reshape(T, 1) - mu_new.reshape(1, K))**2).sum(axis=0) / np.maximum(w, 1e-16)
        sigma_new = np.sqrt(np.maximum(var_new, 1e-10))

        # Keep regimes ordered by mean (state 0 = lower mean)
        order = np.argsort(mu_new)
        mu_new = mu_new[order]
        sigma_new = sigma_new[order]
        A = A[np.ix_(order, order)]
        pi = pi[order]
        pi = pi / pi.sum()

        mu, sigma = mu_new, sigma_new
        gamma_last = gamma

        if it > 5 and abs(loglik_history[-1] - loglik_history[-2]) < tol:
            break

    return {
        "mu_m": mu,                      # monthly mean log return per regime
        "sigma_m": sigma,                # monthly std dev log return per regime
        "A": A,                          # transition matrix
        "pi": pi,                        # initial regime prob (filtered)
        "gamma": gamma_last,             # posterior probabilities over history
        "loglik_history": loglik_history
    }


def stationary_dist(A: np.ndarray) -> np.ndarray:
    """Compute stationary distribution w s.t. w = wA."""
    evals, evecs = np.linalg.eig(A.T)
    idx = int(np.argmin(np.abs(evals - 1.0)))
    w = np.real(evecs[:, idx])
    w = np.maximum(w, 0)
    w = w / w.sum()
    return w


# ---------------------------
# Simulation (multipliers, not prices)
# ---------------------------

def simulate_multipliers_by_year(
    years: int,
    mu_m: np.ndarray,
    sigma_m: np.ndarray,
    A: np.ndarray,
    init_state_probs: np.ndarray,
    n_sims: int = 20000,
    seed: int = 0
) -> Dict[int, np.ndarray]:
    """
    Simulate monthly log-returns using a 2-regime Markov chain, and return
    multipliers at the END of each year.

    Returns dict: year -> multipliers array of shape (n_sims,)
      multiplier = exp(sum_{months} r)
    """
    rng = np.random.default_rng(seed)
    K = 2
    steps = years * 12

    # initial regimes
    s = rng.choice(K, size=n_sims, p=init_state_probs)

    cum_log = np.zeros(n_sims, dtype=float)
    out: Dict[int, np.ndarray] = {}

    for t in range(1, steps + 1):
        r = rng.normal(loc=mu_m[s], scale=sigma_m[s])
        cum_log += r

        # transition to next month
        u = rng.random(n_sims)
        s0 = (s == 0)
        s1 = ~s0
        s[s0] = (u[s0] > A[0, 0]).astype(int)  # 0->1 else 0
        s[s1] = (u[s1] > A[1, 1]).astype(int)  # 1->0 else 1

        if t % 12 == 0:
            yr = t // 12
            out[yr] = np.exp(cum_log).copy()

    return out


def summarize_percentiles(multipliers: np.ndarray) -> Dict[str, float]:
    p10, p50, p90 = np.percentile(multipliers, [10, 50, 90])
    return {"p10": float(p10), "p50": float(p50), "p90": float(p90)}


def long_run_growth_and_risk(mu_m: np.ndarray, sigma_m: np.ndarray, A: np.ndarray) -> Tuple[float, float]:
    """
    Compute long-run expected annual growth (geometric) and annualized volatility (log-return space)
    from stationary regime mixture.

    Returns:
      growth_annual (as fraction, e.g., 0.08 = 8%)
      vol_annual (as fraction, e.g., 0.22 = 22%)
    """
    w = stationary_dist(A)
    mu_bar = float(np.sum(w * mu_m))
    # mixture variance: E[sigma^2 + (mu - E[mu])^2]
    var_m = float(np.sum(w * (sigma_m**2 + (mu_m - mu_bar)**2)))

    mu_ann_log = 12.0 * mu_bar
    sigma_ann_log = float(np.sqrt(12.0 * var_m))

    growth_annual = float(np.exp(mu_ann_log) - 1.0)  # geometric expectation
    vol_annual = sigma_ann_log
    return growth_annual, vol_annual


# ---------------------------
# Precompute pipeline
# ---------------------------

def precompute_ticker(
    ticker: str,
    out_dir: str = "data/precomputed",
    start: str = "2010-01-01",
    years: int = 50,
    n_sims: int = 20000,
    seed: int = 0
) -> str:
    """
    Fit HMM + simulate multipliers + save JSON.
    Returns output filepath.
    """
    ticker = ticker.upper()
    px = fetch_prices(ticker='AAPL')
    asof = str(px.index[-1].date())
    original_value = float(px.iloc[-1][0])
    rets_m = monthly_log_returns(px)
    if len(rets_m) < 60:
        raise ValueError(f"{ticker}: not enough monthly data ({len(rets_m)} months). Need ~60+.")

    hmm = fit_gaussian_hmm_2state(rets_m, seed=seed)
    mu_m = hmm["mu_m"]
    sigma_m = hmm["sigma_m"]
    A = hmm["A"]

    # Use stationary regime weights for long-run forecasts (stable for long horizons)
    w0 = stationary_dist(A)

    growth_annual, risk_annual = long_run_growth_and_risk(mu_m, sigma_m, A)

    multipliers_by_year = simulate_multipliers_by_year(
        years=years,
        mu_m=mu_m,
        sigma_m=sigma_m,
        A=A,
        init_state_probs=w0,
        n_sims=n_sims,
        seed=seed
    )

    multipliers_summary = {str(yr): summarize_percentiles(m) for yr, m in multipliers_by_year.items()}

    payload = {
        "ticker": ticker,
        "asof": asof,
        "lookback_start": start,
        "starting_price":original_value,
        "horizon_years": years,
        "n_sims": n_sims,
        "estimated_yearly_growth": growth_annual,
        "risk_annual_volatility": risk_annual,
        "model": {
            "type": "2-state Gaussian HMM on monthly log returns",
            "mu_monthly_log": mu_m.tolist(),
            "sigma_monthly_log": sigma_m.tolist(),
            "transition_matrix": A.tolist(),
            "stationary_weights": w0.tolist(),
        },
        # Store multipliers (not prices):
        # future_price_percentile = current_price * multiplier_percentile
        "multipliers_by_year": multipliers_summary,
    }

    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    fp = out_path / f"{ticker}.json"
    fp.write_text(json.dumps(payload, indent=2))
    return str(fp)


def precompute_many(
    tickers: Sequence[str],
    out_dir: str = "data/precomputed",
    start: str = "2010-01-01",
    years: int = 50,
    n_sims: int = 20000,
    seed: int = 0,
    continue_on_error: bool = True
) -> Dict[str, str]:
    """
    Precompute multiple tickers; returns mapping ticker->filepath (or error message).
    """
    results: Dict[str, str] = {}
    for t in tickers:
        t = t.upper().strip()
        if not t:
            continue
        try:
            fp = precompute_ticker(
                ticker=t,
                out_dir=out_dir,
                start=start,
                years=years,
                n_sims=n_sims,
                seed=seed
            )
            results[t] = fp
            print(f"[OK] {t} -> {fp}")
        except Exception as e:
            msg = f"[ERR] {t}: {e}"
            results[t] = msg
            print(msg)
            if not continue_on_error:
                raise
    return results


# ---------------------------
# Run
# ---------------------------

if __name__ == "__main__":
    # Example: choose a small universe for hackathon
    universe = ["AAPL", "MSFT", "TSLA", "NVDA", "SPY"]

    precompute_many(
        tickers=universe,
        out_dir="/home/ledenise/ellehacks2026/data/precomputed",
        start="2010-01-01",
        years=50,         
        n_sims=20000,     # 5k–20k is usually enough for smooth percentiles
        seed=42
    )
