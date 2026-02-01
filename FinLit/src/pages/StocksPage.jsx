import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './StocksPage.css'

const GAME_BALANCES_KEY = 'finlit-game-balances'
const API_BASE = ''

/** 10 sample stocks with company names and sample values (used when API has no data or to pad table). */
const SAMPLE_STOCKS = [
  { ticker: 'AAPL', name: 'Apple Inc.', current_price: 225.50, estimated_yearly_growth: 0.12, risk_annual_volatility: 0.22 },
  { ticker: 'MSFT', name: 'Microsoft', current_price: 378.90, estimated_yearly_growth: 0.15, risk_annual_volatility: 0.20 },
  { ticker: 'GOOGL', name: 'Alphabet (Google)', current_price: 175.25, estimated_yearly_growth: 0.18, risk_annual_volatility: 0.24 },
  { ticker: 'AMZN', name: 'Amazon.com', current_price: 198.40, estimated_yearly_growth: 0.14, risk_annual_volatility: 0.26 },
  { ticker: 'TSLA', name: 'Tesla', current_price: 248.60, estimated_yearly_growth: 0.22, risk_annual_volatility: 0.38 },
  { ticker: 'NVDA', name: 'NVIDIA', current_price: 495.20, estimated_yearly_growth: 0.28, risk_annual_volatility: 0.32 },
  { ticker: 'META', name: 'Meta Platforms', current_price: 585.30, estimated_yearly_growth: 0.20, risk_annual_volatility: 0.28 },
  { ticker: 'SPY', name: 'S&P 500 ETF', current_price: 595.00, estimated_yearly_growth: 0.10, risk_annual_volatility: 0.15 },
  { ticker: 'JPM', name: 'JPMorgan Chase', current_price: 245.80, estimated_yearly_growth: 0.11, risk_annual_volatility: 0.21 },
  { ticker: 'V', name: 'Visa', current_price: 318.50, estimated_yearly_growth: 0.13, risk_annual_volatility: 0.18 },
]

const DEFAULT_TICKERS = SAMPLE_STOCKS.map((s) => s.ticker)

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100
}

/** Price for a ticker at given year (from API row or sample). */
function getPriceForYear(row, sample, year) {
  if (row?.predicted_price != null) return row.predicted_price
  if (row?.current_price != null && year <= 1) return row.current_price
  if (sample) return sample.current_price * Math.pow(1 + sample.estimated_yearly_growth, year - 1)
  return 0
}

/** Parse JSON from response; avoid "Unexpected end of JSON input" when body is empty. */
async function parseJsonResponse(res) {
  const text = await res.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(res.ok ? 'Invalid JSON from server' : `Request failed: ${res.status}`)
  }
}

function StocksPage() {
  const [tickers, setTickers] = useState([])
  const [portfolio, setPortfolio] = useState({ stocks: [], total_value: 0 })
  const [cash, setCash] = useState(0)
  const [stockHoldings, setStockHoldings] = useState({})
  const [gameYear, setGameYear] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tradeMessage, setTradeMessage] = useState('')
  const [rowAmounts, setRowAmounts] = useState({})

  const loadBalances = () => {
    try {
      const raw = sessionStorage.getItem(GAME_BALANCES_KEY)
      const b = raw ? JSON.parse(raw) : {}
      setCash(Number(b.cash) || 0)
      setStockHoldings(b.stockHoldings && typeof b.stockHoldings === 'object' ? b.stockHoldings : {})
      setGameYear(Math.max(1, parseInt(b.gameYear, 10) || 1))
    } catch (_) {}
  }

  const saveBalances = (newCash, newHoldings, newYear) => {
    try {
      const raw = sessionStorage.getItem(GAME_BALANCES_KEY)
      const b = raw ? JSON.parse(raw) : {}
      const updated = {
        ...b,
        cash: newCash != null ? newCash : cash,
        stockHoldings: newHoldings != null ? newHoldings : stockHoldings,
        gameYear: newYear != null ? newYear : gameYear,
      }
      sessionStorage.setItem(GAME_BALANCES_KEY, JSON.stringify(updated))
    } catch (_) {}
  }

  useEffect(() => {
    loadBalances()
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchTickers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/available-tickers`)
        const data = await parseJsonResponse(res)
        if (!res.ok) throw new Error(data.error || 'Failed to load tickers')
        if (!cancelled) setTickers((data.tickers && data.tickers.length > 0) ? data.tickers : DEFAULT_TICKERS)
      } catch (e) {
        if (!cancelled) {
          setTickers(DEFAULT_TICKERS)
          setError(e.message || 'Using sample data')
        }
      }
    }
    fetchTickers()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (tickers.length === 0) return
    let cancelled = false
    setLoading(true)
    const payload = {
      stocks: tickers.map((t) => ({ ticker: t, shares: stockHoldings[t] || 0 })),
      year: gameYear,
      percentile: 'p50',
    }
    fetch(`${API_BASE}/api/stock-portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => parseJsonResponse(res))
      .then((data) => {
        if (!cancelled) {
          setPortfolio({ stocks: data.stocks || [], total_value: data.total_value || 0 })
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled) {
          const sampleStocks = DEFAULT_TICKERS.map((ticker) => {
            const sample = SAMPLE_STOCKS.find((s) => s.ticker === ticker)
            const shares = stockHoldings[ticker] || 0
            const price = sample ? sample.current_price * Math.pow(1 + sample.estimated_yearly_growth, gameYear - 1) : 0
            return {
              ticker,
              shares,
              current_price: sample?.current_price ?? 0,
              predicted_price: price,
              estimated_yearly_growth: sample?.estimated_yearly_growth ?? 0,
              risk_annual_volatility: sample?.risk_annual_volatility ?? 0,
              total_value: Math.round(shares * price * 100) / 100,
            }
          })
          const total = sampleStocks.reduce((sum, r) => sum + (r.total_value || 0), 0)
          setPortfolio({ stocks: sampleStocks, total_value: Math.round(total * 100) / 100 })
          setError('Using sample data (backend unavailable)')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [tickers.join(','), gameYear, JSON.stringify(stockHoldings)])

  /** Run client-side trade for sample tickers (when backend has no data or is unreachable). */
  const runClientSideTrade = (action, ticker, numShares, currentCash, holdings) => {
    const sample = SAMPLE_STOCKS.find((s) => s.ticker === ticker)
    const price = sample ? sample.current_price * Math.pow(1 + sample.estimated_yearly_growth, gameYear - 1) : 0
    const executionPrice = roundMoney(price)
    const tradeValue = roundMoney(numShares * executionPrice)
    const currentShares = roundMoney(holdings[ticker] || 0)
    let newCash = currentCash
    const newHoldings = { ...holdings }
    if (action === 'buy') {
      if (currentCash < tradeValue) {
        setTradeMessage(`Not enough cash. Need $${tradeValue.toFixed(2)}, have $${currentCash.toFixed(2)}.`)
        return false
      }
      newCash = roundMoney(currentCash - tradeValue)
      newHoldings[ticker] = roundMoney(currentShares + numShares)
    } else {
      if (currentShares < numShares) {
        setTradeMessage(`Not enough shares. Have ${currentShares}, want to sell ${numShares}.`)
        return false
      }
      newCash = roundMoney(currentCash + tradeValue)
      const remaining = roundMoney(currentShares - numShares)
      if (remaining <= 0) delete newHoldings[ticker]
      else newHoldings[ticker] = remaining
    }
    setCash(newCash)
    setStockHoldings(newHoldings)
    saveBalances(newCash, newHoldings, undefined)
    setTradeMessage(action === 'buy' ? `Bought ${numShares} shares of ${ticker} at $${executionPrice.toFixed(2)}` : `Sold ${numShares} shares of ${ticker} at $${executionPrice.toFixed(2)}`)
    setRowAmounts((prev) => ({ ...prev, [ticker]: '' }))
    return true
  }

  const handleTrade = async (e, action, ticker, sharesStr) => {
    e.preventDefault()
    setTradeMessage('')
    const numShares = roundMoney(sharesStr)
    if (!ticker || !Number.isFinite(numShares) || numShares <= 0) {
      setTradeMessage('Enter a valid ticker and share amount.')
      return
    }
    const currentCash = roundMoney(cash)
    const holdings = { ...stockHoldings }
    for (const k of Object.keys(holdings)) holdings[k] = roundMoney(holdings[k])

    const isSampleTicker = SAMPLE_STOCKS.some((s) => s.ticker === ticker)

    try {
      const res = await fetch(`${API_BASE}/api/stock-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ticker,
          shares: numShares,
          cash: currentCash,
          current_holdings: holdings,
          year: gameYear,
          percentile: 'p50',
        }),
      })
      const data = await parseJsonResponse(res)
      if (res.ok) {
        setCash(roundMoney(data.new_cash))
        setStockHoldings(data.new_holdings || {})
        saveBalances(roundMoney(data.new_cash), data.new_holdings, undefined)
        setTradeMessage(data.message || (action === 'buy' ? 'Buy successful' : 'Sell successful'))
        setRowAmounts((prev) => ({ ...prev, [ticker]: '' }))
        return
      }
      const notAvailable = data.error && (data.error.includes('not precomputed') || data.error.includes('not found'))
      if (notAvailable && isSampleTicker) {
        runClientSideTrade(action, ticker, numShares, currentCash, holdings)
        return
      }
      const validationError = data.error && (
        data.error.includes('Not enough cash') ||
        data.error.includes('Not enough shares') ||
        data.error.includes('ticker and positive shares') ||
        data.error.includes('action must be')
      )
      if (validationError) {
        setTradeMessage(data.error)
        return
      }
      if (isSampleTicker) {
        runClientSideTrade(action, ticker, numShares, currentCash, holdings)
        return
      }
      setTradeMessage(data.error || 'Trade failed')
    } catch (_err) {
      if (isSampleTicker) {
        runClientSideTrade(action, ticker, numShares, currentCash, holdings)
        return
      }
      setTradeMessage(_err?.message || 'Trade failed. Is the backend running on port 5000?')
    }
  }

  const updateYear = (delta) => {
    const y = Math.max(1, Math.min(50, gameYear + delta))
    setGameYear(y)
    saveBalances(undefined, undefined, y)
  }

  /** Table rows: always use current stockHoldings for shares and recompute value = shares × price so display is accurate. */
  const displayStocks = DEFAULT_TICKERS.map((ticker) => {
    const apiRow = portfolio.stocks.find((r) => r.ticker === ticker)
    const sample = SAMPLE_STOCKS.find((s) => s.ticker === ticker)
    const name = sample?.name ?? ticker
    const shares = roundMoney(stockHoldings[ticker] || 0)
    const price = getPriceForYear(apiRow, sample, gameYear)
    const total_value = roundMoney(shares * price)
    return {
      ticker,
      name,
      shares,
      current_price: apiRow?.current_price ?? sample?.current_price ?? 0,
      predicted_price: price,
      estimated_yearly_growth: apiRow?.estimated_yearly_growth ?? sample?.estimated_yearly_growth ?? 0,
      risk_annual_volatility: apiRow?.risk_annual_volatility ?? sample?.risk_annual_volatility ?? 0,
      total_value,
    }
  })

  return (
    <div className="stocks-page">
      <Link to="/game" className="stocks-back-link" aria-label="Back to game">
        ← Back to game
      </Link>
      <div className="stocks-header">
        <h1 className="stocks-title">Stock market</h1>
        <p className="stocks-cash">Cash (chequing): <strong>${roundMoney(cash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
        <div className="stocks-year-row">
          <span className="stocks-year-label">Year:</span>
          <button type="button" className="stocks-year-btn" onClick={() => updateYear(-1)} aria-label="Previous year">−</button>
          <span className="stocks-year-value">{gameYear}</span>
          <button type="button" className="stocks-year-btn" onClick={() => updateYear(1)} aria-label="Next year">+</button>
        </div>
        <p className="stocks-hint">Stock prices depend on the selected year.</p>
      </div>

      {error && <p className="stocks-error" role="alert">{error}</p>}
      {tradeMessage && <p className="stocks-trade-msg" role="status">{tradeMessage}</p>}

      {loading ? (
        <p className="stocks-loading">Loading stocks…</p>
      ) : (
        <div className="stocks-table-wrap">
          <table className="stocks-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th>Price (year {gameYear})</th>
                <th>Est. growth</th>
                <th>Risk (vol)</th>
                <th>Your shares</th>
                <th>Value</th>
                <th>Trade</th>
              </tr>
            </thead>
            <tbody>
              {displayStocks.map((row) => (
                <tr key={row.ticker}>
                  <td><strong>{row.ticker}</strong></td>
                  <td>{row.name ?? row.ticker}</td>
                  <td>${(row.predicted_price ?? row.current_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{row.estimated_yearly_growth != null ? `${(row.estimated_yearly_growth * 100).toFixed(1)}%` : '—'}</td>
                  <td>{row.risk_annual_volatility != null ? `${(row.risk_annual_volatility * 100).toFixed(1)}%` : '—'}</td>
                  <td>{(row.shares ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td>${(row.total_value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="stocks-trade-cell">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Shares"
                      value={rowAmounts[row.ticker] ?? ''}
                      onChange={(e) => setRowAmounts((prev) => ({ ...prev, [row.ticker]: e.target.value }))}
                      className="stocks-row-shares-input"
                      aria-label={`Shares to trade for ${row.ticker}`}
                    />
                    <div className="stocks-row-btns">
                      <button
                        type="button"
                        className="stocks-btn stocks-btn-buy"
                        onClick={(e) => handleTrade(e, 'buy', row.ticker, rowAmounts[row.ticker] ?? '')}
                      >
                        Buy
                      </button>
                      <button
                        type="button"
                        className="stocks-btn stocks-btn-sell"
                        onClick={(e) => handleTrade(e, 'sell', row.ticker, rowAmounts[row.ticker] ?? '')}
                      >
                        Sell
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="stocks-total">
            Total stock value: <strong>${roundMoney(displayStocks.reduce((sum, r) => sum + (r.total_value ?? 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </p>
        </div>
      )}
    </div>
  )
}

export default StocksPage
