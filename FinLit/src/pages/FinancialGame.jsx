import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './FinancialGame.css'
import gamePageBg from '../assets/GamePageBackground.png'
import cashStashImg from '../assets/CashStash.png'
import charityImg from '../assets/Charity.png'
import savingsImg from '../assets/Savings.png'
import stocksImg from '../assets/Stocks.png'

const GAME_PROFILE_KEY = 'finlit-game-profile'
const GAME_BALANCES_KEY = 'finlit-game-balances'
const GAME_PROFILE_DONE_KEY = 'finlit-game-profile-done'

/** Round money to 2 decimal places to avoid float drift. */
function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100
}

/** Format money for display (2 decimals). */
function formatMoney(value) {
  return roundMoney(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TFSA_INFO = {
  name: 'TFSA',
  full_name: 'Tax-Free Savings Account',
  icon: '🛡️',
  color: '#22c55e',
  annual_return: 0.07,
  description: 'Any Canadian 18+ can open one. All growth and withdrawals are completely tax-free. You can withdraw anytime without penalty — the most flexible registered account in Canada.',
  why_important: 'The single best place to put money you might need before retirement. Tax-free growth with zero strings attached.',
  best_for_ages: '18–65',
  contribution_limit_2024: 7000,
  resource_url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tfsa.html',
  risk: 'Low–Medium',
}

const STOCKS_INFO = {
  name: 'Stocks',
  full_name: 'Stock Market Investing',
  icon: '📈',
  color: '#3b82f6',
  annual_return_range: '5–10% (historical average)',
  description: 'Stocks represent ownership in companies. When you buy shares, you own a small piece of that business. Over the long term, the stock market has historically grown faster than savings accounts — but values go up and down along the way.',
  why_important: 'One of the best ways to grow wealth over decades. Suited for money you can leave invested for 5+ years so you can ride out short-term dips.',
  best_for: 'Long-term investors (5+ year horizon)',
  time_horizon: '5+ years recommended',
  risk: 'Medium–High',
  resource_url: 'https://www.investopedia.com/terms/s/stock.asp',
}

const CHARITY_INFO = {
  name: 'Charity',
  full_name: 'Giving Back',
  icon: '❤️',
  color: '#e11d48',
  description: 'Donating to charity supports causes you care about — from local food banks to global health and education. Even small amounts add up and can make a real difference in your community and beyond.',
  why_important: 'Giving can improve your well-being and connect you to something bigger. Many Canadians also get a tax credit for donations to registered charities.',
  resource_url: 'https://www.canada.ca/en/revenue-agency/services/charities-giving.html',
}

function FinancialGame() {
  const [showModal, setShowModal] = useState(null)
  const [showSavingsModal, setShowSavingsModal] = useState(false)
  const [showStocksModal, setShowStocksModal] = useState(false)
  const [showCashStashModal, setShowCashStashModal] = useState(false)
  const [showCharityModal, setShowCharityModal] = useState(false)
  const [donationAmount, setDonationAmount] = useState('')
  const [savingsTransferAmount, setSavingsTransferAmount] = useState('')
  const [stocksTransferAmount, setStocksTransferAmount] = useState('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [startingMoney, setStartingMoney] = useState('')
  const [financialGoals, setFinancialGoals] = useState('')
  const [cash, setCash] = useState(0)
  const [savings, setSavings] = useState(0)
  const [stocks, setStocks] = useState(0)
  const [charity, setCharity] = useState(0)
  const [stockHoldings, setStockHoldings] = useState({})
  const [gameYear, setGameYear] = useState(1)
  const [transferError, setTransferError] = useState('')

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return
    try {
      const profileJson = sessionStorage.getItem(GAME_PROFILE_KEY)
      const profile = profileJson ? JSON.parse(profileJson) : null
      if (profile) {
        setName(profile.name ?? '')
        setAge(profile.age ?? '')
        setStartingMoney(profile.startingMoney ?? '')
        setFinancialGoals(profile.financialGoals ?? '')
      }
      setShowModal(profile ? false : true)
      const balancesJson = sessionStorage.getItem(GAME_BALANCES_KEY)
      const balances = balancesJson ? JSON.parse(balancesJson) : null
      if (balances) {
        setCash(roundMoney(balances.cash ?? 0))
        setSavings(roundMoney(balances.savings ?? 0))
        setStocks(roundMoney(balances.stocks ?? 0))
        setCharity(roundMoney(balances.charity ?? 0))
        setStockHoldings(balances.stockHoldings && typeof balances.stockHoldings === 'object' ? balances.stockHoldings : {})
        setGameYear(Math.max(1, parseInt(balances.gameYear, 10) || 1))
      } else if (profile && profile.startingMoney !== undefined && profile.startingMoney !== '') {
        const initialCash = roundMoney(profile.startingMoney) || 0
        setCash(initialCash)
        setSavings(0)
        setStocks(0)
        setCharity(0)
        setStockHoldings({})
        setGameYear(1)
        sessionStorage.setItem(GAME_BALANCES_KEY, JSON.stringify({
          cash: initialCash,
          savings: 0,
          stocks: 0,
          charity: 0,
          stockHoldings: {},
          gameYear: 1,
        }))
      }
    } catch (_) {}
  }, [])

  const saveBalances = (c, s, st, ch, sh, gy) => {
    try {
      const raw = sessionStorage.getItem(GAME_BALANCES_KEY)
      const prev = raw ? JSON.parse(raw) : {}
      sessionStorage.setItem(GAME_BALANCES_KEY, JSON.stringify({
        cash: roundMoney(c ?? prev.cash ?? cash),
        savings: roundMoney(s ?? prev.savings ?? savings),
        stocks: roundMoney(st ?? prev.stocks ?? stocks),
        charity: roundMoney(ch ?? prev.charity ?? charity),
        stockHoldings: sh ?? prev.stockHoldings ?? stockHoldings,
        gameYear: gy ?? prev.gameYear ?? gameYear,
      }))
    } catch (_) {}
  }

  const handleStartJourney = (e) => {
    e.preventDefault()
    const initialCash = roundMoney(startingMoney) || 0
    setCash(initialCash)
    setSavings(0)
    setStocks(0)
    setCharity(0)
    setStockHoldings({})
    setGameYear(1)
    try {
      sessionStorage.setItem(GAME_PROFILE_DONE_KEY, 'true')
      sessionStorage.setItem(GAME_PROFILE_KEY, JSON.stringify({
        name,
        age,
        startingMoney,
        financialGoals,
      }))
      saveBalances(initialCash, roundMoney(0), roundMoney(0), roundMoney(0), {}, 1)
    } catch (_) {}
    setShowModal(false)
  }

  const handleTransferToSavings = () => {
    setTransferError('')
    const amount = roundMoney(savingsTransferAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setTransferError('Please enter a valid amount greater than 0.')
      return
    }
    const currentCash = roundMoney(cash)
    if (amount > currentCash) {
      setTransferError(`You only have $${formatMoney(currentCash)} in cash.`)
      return
    }
    const newCash = roundMoney(currentCash - amount)
    const newSavings = roundMoney(savings + amount)
    setCash(newCash)
    setSavings(newSavings)
    setSavingsTransferAmount('')
    setTransferError('')
    saveBalances(newCash, newSavings, stocks, charity)
  }

  const handleTransferToStocks = () => {
    setTransferError('')
    const amount = roundMoney(stocksTransferAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setTransferError('Please enter a valid amount greater than 0.')
      return
    }
    const currentCash = roundMoney(cash)
    if (amount > currentCash) {
      setTransferError(`You only have $${formatMoney(currentCash)} in cash.`)
      return
    }
    const newCash = roundMoney(currentCash - amount)
    const newStocks = roundMoney(stocks + amount)
    setCash(newCash)
    setStocks(newStocks)
    setStocksTransferAmount('')
    setTransferError('')
    saveBalances(newCash, savings, newStocks, charity)
  }

  const handleDonateToCharity = () => {
    setTransferError('')
    const amount = roundMoney(donationAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setTransferError('Please enter a valid amount greater than 0.')
      return
    }
    const currentCash = roundMoney(cash)
    if (amount > currentCash) {
      setTransferError(`You only have $${formatMoney(currentCash)} in cash.`)
      return
    }
    const newCash = roundMoney(currentCash - amount)
    const newCharity = roundMoney(charity + amount)
    setCash(newCash)
    setCharity(newCharity)
    setDonationAmount('')
    setTransferError('')
    saveBalances(newCash, savings, stocks, newCharity)
  }

  return (
    <div
      className="game-page"
      style={{ backgroundImage: `url(${gamePageBg})` }}
    >
      <Link to="/" className="game-back-link" aria-label="Back to intro">
        ←
      </Link>
      <Link to="/treasure" className="game-forward-link" aria-label="Go to Treasure">
        →
      </Link>

      {showModal === true && (
        <div className="game-modal-overlay" aria-modal="true" role="dialog">
          <div className="game-modal">
            <h2 className="game-modal-title">Begin Your Journey</h2>
            <p className="game-modal-subtitle">Tell us a bit about yourself</p>
            <form onSubmit={handleStartJourney} className="game-modal-form">
              <label className="game-modal-label">
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="game-modal-input"
                  placeholder="Your name"
                  required
                />
              </label>
              <label className="game-modal-label">
                Age
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="game-modal-input"
                  placeholder="Your age"
                  required
                />
              </label>
              <label className="game-modal-label">
                Starting money
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={startingMoney}
                  onChange={(e) => setStartingMoney(e.target.value)}
                  className="game-modal-input"
                  placeholder="e.g. 1000"
                  required
                />
              </label>
              <label className="game-modal-label">
                Financial goals
                <textarea
                  value={financialGoals}
                  onChange={(e) => setFinancialGoals(e.target.value)}
                  className="game-modal-input game-modal-textarea"
                  placeholder="e.g. Save for a house, pay off debt, build emergency fund"
                  rows={3}
                />
              </label>
              <button type="submit" className="game-modal-btn">
                Start Journey
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="game-page-content">
        {showModal === false && (
          <div
            className="game-cashstash-wrap game-cashstash-wrap--clickable"
            role="button"
            tabIndex={0}
            onClick={() => setShowCashStashModal(true)}
            onKeyDown={(e) => e.key === 'Enter' && setShowCashStashModal(true)}
            aria-label="View your cash and ways to use it"
          >
            <img
              src={cashStashImg}
              alt=""
              className="game-cashstash-img"
            />
            <p className="game-money-display">{formatMoney(cash)}</p>
          </div>
        )}
      </div>

      {showCashStashModal && (
        <div
          className="game-modal-overlay game-info-modal-overlay"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowCashStashModal(false)}
        >
          <div
            className="game-info-modal game-cashstash-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="game-info-modal-close-x"
              onClick={() => setShowCashStashModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="game-cashstash-modal-header">
              <h2 className="game-info-modal-title">Your cash</h2>
              <p className="game-cashstash-modal-value">{formatMoney(cash)}</p>
              <p className="game-cashstash-modal-summary">
                Total: ${formatMoney(cash + savings + stocks + charity)} (Cash + Savings + Stocks + Charity)
              </p>
            </div>
            <div className="game-info-modal-body">
              <p className="game-cashstash-modal-subtitle">Transfer from your total cash into:</p>
              <ul className="game-cashstash-options">
                <li className="game-cashstash-option">
                  <img src={savingsImg} alt="" className="game-cashstash-option-icon" />
                  <div className="game-cashstash-option-text">
                    <strong>Savings</strong>
                    <span>Grow your money tax-free in a TFSA</span>
                  </div>
                </li>
                <li className="game-cashstash-option">
                  <img src={stocksImg} alt="" className="game-cashstash-option-icon" />
                  <div className="game-cashstash-option-text">
                    <strong>Stocks</strong>
                    <span>Invest for the long term and build wealth</span>
                  </div>
                </li>
                <li className="game-cashstash-option">
                  <img src={charityImg} alt="" className="game-cashstash-option-icon" />
                  <div className="game-cashstash-option-text">
                    <strong>Charity</strong>
                    <span>Give back and support causes you care about</span>
                  </div>
                </li>
              </ul>
            </div>
            <button
              type="button"
              className="game-modal-btn game-info-modal-close"
              onClick={() => setShowCashStashModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showSavingsModal && (
        <div
          className="game-modal-overlay game-info-modal-overlay"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowSavingsModal(false)}
        >
          <div
            className="game-info-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="game-info-modal-close-x"
              onClick={() => setShowSavingsModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="game-info-modal-header" style={{ borderColor: TFSA_INFO.color }}>
              <span className="game-info-modal-icon">{TFSA_INFO.icon}</span>
              <h2 className="game-info-modal-title">{TFSA_INFO.full_name}</h2>
              <p className="game-info-modal-subtitle">{TFSA_INFO.name}</p>
            </div>
            <div className="game-info-modal-body">
              <p className="game-info-modal-desc">{TFSA_INFO.description}</p>
              <p className="game-info-modal-why">
                <strong>Why it matters:</strong> {TFSA_INFO.why_important}
              </p>
              <dl className="game-info-modal-dl">
                <dt>Best for ages</dt>
                <dd>{TFSA_INFO.best_for_ages}</dd>
                <dt>Contribution limit (2024)</dt>
                <dd>${TFSA_INFO.contribution_limit_2024.toLocaleString()}</dd>
                <dt>Typical annual return</dt>
                <dd>{(TFSA_INFO.annual_return * 100).toFixed(1)}%</dd>
                <dt>Risk</dt>
                <dd>{TFSA_INFO.risk}</dd>
              </dl>
              <a
                href={TFSA_INFO.resource_url}
                target="_blank"
                rel="noopener noreferrer"
                className="game-info-modal-link"
              >
                Official TFSA info (Government of Canada) →
              </a>
              <div className="game-transfer-section">
                <p className="game-transfer-balance">Your savings: <strong>${formatMoney(savings)}</strong></p>
                <p className="game-transfer-hint">Cash available: ${formatMoney(cash)}</p>
                <label className="game-transfer-label">
                  Amount to transfer
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={savingsTransferAmount}
                    onChange={(e) => setSavingsTransferAmount(e.target.value)}
                    className="game-modal-input game-transfer-input"
                    placeholder="e.g. 100"
                  />
                </label>
                {transferError && showSavingsModal && <p className="game-transfer-error" role="alert">{transferError}</p>}
                <button
                  type="button"
                  className="game-modal-btn game-transfer-btn"
                  onClick={handleTransferToSavings}
                >
                  Transfer to Savings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStocksModal && (
        <div
          className="game-modal-overlay game-info-modal-overlay"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowStocksModal(false)}
        >
          <div
            className="game-info-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="game-info-modal-close-x"
              onClick={() => setShowStocksModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="game-info-modal-header" style={{ borderColor: STOCKS_INFO.color }}>
              <span className="game-info-modal-icon">{STOCKS_INFO.icon}</span>
              <h2 className="game-info-modal-title">{STOCKS_INFO.full_name}</h2>
              <p className="game-info-modal-subtitle">{STOCKS_INFO.name}</p>
            </div>
            <div className="game-info-modal-body">
              <p className="game-info-modal-desc">{STOCKS_INFO.description}</p>
              <p className="game-info-modal-why">
                <strong>Why it matters:</strong> {STOCKS_INFO.why_important}
              </p>
              <dl className="game-info-modal-dl">
                <dt>Best for</dt>
                <dd>{STOCKS_INFO.best_for}</dd>
                <dt>Time horizon</dt>
                <dd>{STOCKS_INFO.time_horizon}</dd>
                <dt>Typical return (historical)</dt>
                <dd>{STOCKS_INFO.annual_return_range}</dd>
                <dt>Risk</dt>
                <dd>{STOCKS_INFO.risk}</dd>
              </dl>
              <a
                href={STOCKS_INFO.resource_url}
                target="_blank"
                rel="noopener noreferrer"
                className="game-info-modal-link game-info-modal-link--blue"
              >
                Learn more about stocks →
              </a>
              <div className="game-transfer-section">
                <p className="game-transfer-balance">Your stocks: <strong>${formatMoney(stocks)}</strong></p>
                <p className="game-transfer-hint">Cash available: ${formatMoney(cash)}</p>
                <label className="game-transfer-label">
                  Amount to transfer
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stocksTransferAmount}
                    onChange={(e) => setStocksTransferAmount(e.target.value)}
                    className="game-modal-input game-transfer-input"
                    placeholder="e.g. 100"
                  />
                </label>
                {transferError && showStocksModal && <p className="game-transfer-error" role="alert">{transferError}</p>}
                <button
                  type="button"
                  className="game-modal-btn game-transfer-btn"
                  onClick={handleTransferToStocks}
                >
                  Transfer to Stocks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal === false && (
        <div className="game-bottom-icons">
          <div
            className="game-bottom-icon-wrap game-bottom-icon-wrap--clickable"
            role="button"
            tabIndex={0}
            onClick={() => { setTransferError(''); setShowSavingsModal(true) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setTransferError(''); setShowSavingsModal(true) } }}
            aria-label="Open Savings (TFSA) info"
          >
            <img src={savingsImg} alt="Savings" className="game-bottom-icon" />
          </div>
          <Link
            to="/game/stocks"
            className="game-bottom-icon-wrap game-bottom-icon-wrap--clickable"
            aria-label="Stock market – view and trade stocks"
          >
            <img src={stocksImg} alt="Stocks" className="game-bottom-icon" />
          </Link>
          <div
            className="game-bottom-icon-wrap game-bottom-icon-wrap--clickable"
            role="button"
            tabIndex={0}
            onClick={() => { setTransferError(''); setShowCharityModal(true) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setTransferError(''); setShowCharityModal(true) } }}
            aria-label="Open Charity / donation info"
          >
            <img src={charityImg} alt="Charity" className="game-bottom-icon" />
          </div>
        </div>
      )}

      {showCharityModal && (
        <div
          className="game-modal-overlay game-info-modal-overlay"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowCharityModal(false)}
        >
          <div
            className="game-info-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="game-info-modal-close-x"
              onClick={() => setShowCharityModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="game-info-modal-header" style={{ borderColor: CHARITY_INFO.color }}>
              <span className="game-info-modal-icon">{CHARITY_INFO.icon}</span>
              <h2 className="game-info-modal-title">{CHARITY_INFO.full_name}</h2>
              <p className="game-info-modal-subtitle">{CHARITY_INFO.name}</p>
            </div>
            <div className="game-info-modal-body">
              <p className="game-info-modal-desc">{CHARITY_INFO.description}</p>
              <p className="game-info-modal-why">
                <strong>Why it matters:</strong> {CHARITY_INFO.why_important}
              </p>
              <a
                href={CHARITY_INFO.resource_url}
                target="_blank"
                rel="noopener noreferrer"
                className="game-info-modal-link game-info-modal-link--charity"
              >
                About charitable giving (Canada) →
              </a>
              <p className="game-transfer-balance">Total donated: <strong>${formatMoney(charity)}</strong></p>
              <p className="game-transfer-hint">Cash available: ${formatMoney(cash)}</p>
              <label className="game-transfer-label">
                Amount to donate
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="game-modal-input game-transfer-input"
                  placeholder="e.g. 50"
                />
              </label>
              {transferError && showCharityModal && <p className="game-transfer-error" role="alert">{transferError}</p>}
              <button
                type="button"
                className="game-modal-btn game-transfer-btn game-transfer-btn--full"
                onClick={handleDonateToCharity}
              >
                Donate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialGame
