import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './FinancialGame.css'
import { useGameState } from '../hooks/useGameState.js'
import { CANADIAN_FUNDS, CHECKPOINTS, TIERS } from '../utils/gameData.js'
import {
  calculateTax,
  getAllocationByAge,
  calculateDonationCredit,
  getTier,
} from '../utils/gameCalculations.js'
import { EXAMPLE_STOCKS, fetchStockQuote } from '../utils/stockAPI.js'

// Import images
import gamePageBg from '../assets/GamePageBackground.png'
import cashStashImg from '../assets/CashStash.png'
import charityImg from '../assets/Charity.png'
import savingsImg from '../assets/Savings.png'
import stocksImg from '../assets/Stocks.png'

const GAME_SCREENS = {
  SETUP: 'setup',
  MAIN_GAME: 'main_game',
  INVESTMENT_CHOICE: 'investment_choice',
  STOCKS: 'stocks',
  END_GAME: 'end_game',
}

function FinancialGame() {
  const { state, initializeGame, investInFund, donate, buyStock, sellStock, setStockPrices, simulateGameYear, endGame } = useGameState()

  // UI state
  const [currentScreen, setCurrentScreen] = useState(GAME_SCREENS.SETUP)
  const [showFundModal, setShowFundModal] = useState(null)
  const [showCharityModal, setShowCharityModal] = useState(false)
  const [showTierModal, setShowTierModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    income: '',
    starting_money: '',
    goals: [],
  })

  const [investAmount, setInvestAmount] = useState('')
  const [donationAmount, setDonationAmount] = useState('')
  const [stockQuotes, setStockQuotes] = useState({})
  const [stockBuySell, setStockBuySell] = useState({ ticker: null, shares: '', mode: 'buy' })
  const [stocksLoading, setStocksLoading] = useState(false)

  // ─── Setup Phase ───

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleGoalToggle = (goal) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }))
  }

  const handleStartGame = (e) => {
    e.preventDefault()
    const { name, age, income, starting_money, goals } = formData

    if (!name || !age || !income || !starting_money) {
      alert('Please fill in all required fields')
      return
    }

    initializeGame(name, parseInt(age), parseFloat(income), goals, parseFloat(starting_money))
    setCurrentScreen(GAME_SCREENS.MAIN_GAME)
  }

  // ─── Investment Phase ───

  const handleInvestClick = (fundType) => {
    setSelectedAsset(fundType)
    setShowFundModal(fundType)
    setInvestAmount('')
  }

  const handleConfirmInvestment = () => {
    const amount = parseFloat(investAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (amount > state.cash) {
      alert('Insufficient cash')
      return
    }

    const result = investInFund(selectedAsset, amount)
    if (result.success) {
      setShowFundModal(null)
      setInvestAmount('')
      setSelectedAsset(null)
    } else {
      alert(result.error)
    }
  }

  const handleDonate = () => {
    const amount = parseFloat(donationAmount)
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (amount > state.cash) {
      alert('Insufficient cash')
      return
    }

    const credit = calculateDonationCredit(amount, state.income)
    const result = donate(amount, credit)
    if (result.success) {
      setShowCharityModal(false)
      setDonationAmount('')
      alert(`Thank you! Your donation generated a $${credit.total_credit.toFixed(2)} tax credit.`)
    } else {
      alert(result.error)
    }
  }

  // ─── Year Progression ───

  const handleAdvanceYear = () => {
    simulateGameYear()
  }

  // When reducer sets is_game_over and summary, switch to end screen
  useEffect(() => {
    if (state.is_game_over && state.summary) {
      setCurrentScreen(GAME_SCREENS.END_GAME)
    }
  }, [state.is_game_over, state.summary])

  // ─── Helper Functions ───

  // Net worth = checking (cash at hand) + portfolio (TFSA, RRSP, etc.) + total stock value
  const getPortfolioValue = () => {
    return Object.values(state.portfolio).reduce((sum, val) => sum + val, 0)
  }

  const getTotalStockValue = () => {
    let total = 0
    for (const [ticker, holding] of Object.entries(state.stock_holdings || {})) {
      const price = state.stock_prices?.[ticker] ?? stockQuotes[ticker]?.price ?? 0
      total += (holding.shares || 0) * price
    }
    return total
  }

  const getNetWorth = () => {
    return state.cash + getPortfolioValue() + getTotalStockValue()
  }

  const getCurrentTier = () => {
    return getTier(state.total_points)
  }

  const getDiversificationScore = () => {
    const weights = Object.values(state.portfolio)
    if (weights.length === 0) return 0
    const total = weights.reduce((a, b) => a + b, 0)
    if (total === 0) return 0
    const normalized = weights.map((w) => w / total)
    const hIndex = normalized.reduce((sum, w) => sum + w * w, 0)
    return Math.round((1 - hIndex) * 100)
  }

  const getTaxInfo = () => calculateTax(state.income)

  // ─── Render: SETUP ───

  if (currentScreen === GAME_SCREENS.SETUP) {
    return (
      <div className="game-page" style={{ backgroundImage: `url(${gamePageBg})` }}>
        <div className="game-top-bar">
          <Link to="/" className="game-back-link">
            ← Back to Intro
          </Link>
        </div>

        <div className="game-modal-overlay" aria-modal="true" role="dialog">
          <div className="game-modal">
            <h2 className="game-modal-title">Begin Your Financial Journey</h2>
            <p className="game-modal-subtitle">Tell us about yourself and your goals</p>

            <form onSubmit={handleStartGame} className="game-modal-form">
              <label className="game-modal-label">
                Name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="game-modal-input"
                  placeholder="Your name"
                  required
                />
              </label>

              <label className="game-modal-label">
                Age
                <input
                  type="number"
                  name="age"
                  min="18"
                  max="120"
                  value={formData.age}
                  onChange={handleFormChange}
                  className="game-modal-input"
                  placeholder="Your age"
                  required
                />
              </label>

              <label className="game-modal-label">
                Annual Income
                <input
                  type="number"
                  name="income"
                  min="0"
                  step="1"
                  value={formData.income}
                  onChange={handleFormChange}
                  className="game-modal-input"
                  placeholder="e.g. 34567 or 60000"
                  required
                />
              </label>

              <label className="game-modal-label">
                Starting Money
                <input
                  type="number"
                  name="starting_money"
                  min="0"
                  step="1"
                  value={formData.starting_money}
                  onChange={handleFormChange}
                  className="game-modal-input"
                  placeholder="e.g. 28910 or 5000"
                  required
                />
              </label>

              <fieldset className="game-modal-fieldset game-modal-fieldset--goals">
                <legend className="game-modal-fieldset-legend">Financial Goals (Optional)</legend>
                <div className="game-modal-goals-grid">
                  <label className="game-modal-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.goals.includes('home')}
                      onChange={() => handleGoalToggle('home')}
                    />
                    <span className="game-modal-checkbox-text">🏠 Save for a home</span>
                  </label>
                  <label className="game-modal-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.goals.includes('emergency')}
                      onChange={() => handleGoalToggle('emergency')}
                    />
                    <span className="game-modal-checkbox-text">🛡️ Build emergency fund</span>
                  </label>
                  <label className="game-modal-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.goals.includes('retirement')}
                      onChange={() => handleGoalToggle('retirement')}
                    />
                    <span className="game-modal-checkbox-text">🏖️ Early retirement</span>
                  </label>
                  <label className="game-modal-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.goals.includes('travel')}
                      onChange={() => handleGoalToggle('travel')}
                    />
                    <span className="game-modal-checkbox-text">✈️ Travel & experiences</span>
                  </label>
                </div>
              </fieldset>

              <button type="submit" className="game-modal-btn">
                Start Game
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: MAIN_GAME ───

  if (currentScreen === GAME_SCREENS.MAIN_GAME) {
    const taxInfo = getTaxInfo()
    const tier = getCurrentTier()

    return (
      <div className="game-page" style={{ backgroundImage: `url(${gamePageBg})` }}>
        {/* Game HUD - Back to Intro is inside HUD so it never blocks profile */}
        <div className="game-hud">
          <div className="game-hud-section">
            <div className="game-hud-item">
              <span className="game-hud-label">Name:</span>
              <span className="game-hud-value">{state.name}</span>
            </div>
            <div className="game-hud-item">
              <span className="game-hud-label">Age:</span>
              <span className="game-hud-value">{state.age}</span>
            </div>
            <div className="game-hud-item">
              <span className="game-hud-label">Year:</span>
              <span className="game-hud-value">{state.year}</span>
            </div>
          </div>

          <div className="game-hud-section">
            <div className="game-hud-item">
              <span className="game-hud-label">Tier:</span>
              <button
                type="button"
                className="game-hud-tier-btn"
                onClick={() => setShowTierModal(true)}
                title="View all tiers"
              >
                {tier.emoji} {tier.name} ▼
              </button>
            </div>
            <div className="game-hud-item">
              <span className="game-hud-label">Points:</span>
              <span className="game-hud-value">{state.total_points}</span>
            </div>
            <div className="game-hud-item">
              <span className="game-hud-label">Diversification:</span>
              <span className="game-hud-value">{getDiversificationScore()}%</span>
            </div>
          </div>

          <div className="game-hud-section">
            <div className="game-hud-item">
              <span className="game-hud-label">Checking:</span>
              <span className="game-hud-value">${state.cash.toFixed(2)}</span>
            </div>
            <div className="game-hud-item">
              <span className="game-hud-label">Portfolio:</span>
              <span className="game-hud-value">${getPortfolioValue().toFixed(2)}</span>
            </div>
            <div className="game-hud-item">
              <span className="game-hud-label">Stocks:</span>
              <span className="game-hud-value">${getTotalStockValue().toFixed(2)}</span>
            </div>
            <div className="game-hud-item">
              <span className="game-hud-label">Net Worth:</span>
              <span className="game-hud-value" style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                ${getNetWorth().toFixed(2)}
              </span>
            </div>
          </div>

          <div className="game-hud-section game-hud-section--back">
            <Link to="/" className="game-back-link game-back-link--in-hud">
              ← Back to Intro
            </Link>
          </div>
        </div>

        {/* Main Game Content */}
        <div className="game-page-content">
          {/* Checking (money bag = actual cash at hand) */}
          <div
            className="game-cashstash-wrap game-cashstash-wrap--clickable"
            role="button"
            tabIndex={0}
            onClick={() => setCurrentScreen(GAME_SCREENS.INVESTMENT_CHOICE)}
            onKeyDown={(e) => e.key === 'Enter' && setCurrentScreen(GAME_SCREENS.INVESTMENT_CHOICE)}
            aria-label="Checking — view investment options"
          >
            <img src={cashStashImg} alt="Checking" className="game-cashstash-img" />
            <p className="game-cashstash-label">Checking</p>
            <p className="game-money-display">${state.cash.toFixed(2)}</p>
          </div>

          {/* Stocks button */}
          <div className="game-stocks-entry">
            <button
              type="button"
              className="game-action-btn game-action-btn--stocks"
              onClick={() => {
                setCurrentScreen(GAME_SCREENS.STOCKS)
                setStocksLoading(true)
                const tickers = [...new Set([...EXAMPLE_STOCKS.map((s) => s.ticker), ...Object.keys(state.stock_holdings || {})])]
                Promise.all(tickers.map((t) => fetchStockQuote(t))).then((results) => {
                  const quotes = {}
                  const prices = {}
                  results.forEach((q, i) => {
                    if (q && q.price > 0 && tickers[i]) {
                      quotes[tickers[i]] = q
                      prices[tickers[i]] = q.price
                    }
                  })
                  setStockQuotes(quotes)
                  setStockPrices(prices)
                  setStocksLoading(false)
                }).catch(() => setStocksLoading(false))
              }}
            >
              📈 Stocks — Buy & Sell
            </button>
          </div>

          {/* Portfolio Display */}
          <div className="game-portfolio-section">
            <h3>Your Portfolio</h3>
            {Object.entries(state.portfolio).length > 0 ? (
              <div className="game-portfolio-grid">
                {Object.entries(state.portfolio).map(([asset, amount]) => (
                  <div key={asset} className="game-portfolio-item">
                    <span className="game-portfolio-icon">{CANADIAN_FUNDS[asset]?.icon || '💰'}</span>
                    <div className="game-portfolio-text">
                      <strong>{CANADIAN_FUNDS[asset]?.name || asset}</strong>
                      <span>${amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="game-portfolio-empty">No investments yet. Click your cash to start investing!</p>
            )}
          </div>

          {/* Year breakdown (how net worth changed) */}
          {state.last_year_breakdown && (
            <div className="game-year-breakdown">
              <h4>Last year&apos;s change</h4>
              <p className="game-year-breakdown-line">
                <span>+${state.last_year_breakdown.income_saved.toFixed(2)}</span> from savings (15% of take-home)
              </p>
              <p className="game-year-breakdown-line">
                <span className={state.last_year_breakdown.portfolio_growth >= 0 ? '' : 'game-year-breakdown--negative'}>
                  {state.last_year_breakdown.portfolio_growth >= 0 ? '+' : ''}${state.last_year_breakdown.portfolio_growth.toFixed(2)}
                </span> from investment growth
              </p>
              {state.last_year_breakdown.event_impact !== 0 && (
                <p className="game-year-breakdown-line">
                  <span className={state.last_year_breakdown.event_impact >= 0 ? '' : 'game-year-breakdown--negative'}>
                    {state.last_year_breakdown.event_impact >= 0 ? '+' : ''}${state.last_year_breakdown.event_impact.toFixed(2)}
                  </span> from life event
                </p>
              )}
              {state.current_event && (
                <p className="game-year-breakdown-event">
                  {state.current_event.emoji} {state.current_event.title}: {state.current_event.description}
                </p>
              )}
            </div>
          )}

          {/* Tax Info */}
          <div className="game-tax-info">
            <p>
              <strong>Income Tax:</strong> ${taxInfo.total_tax.toFixed(2)} (
              {taxInfo.effective_rate.toFixed(1)}% effective rate)
            </p>
            <p>
              <strong>Take-Home:</strong> ${taxInfo.take_home.toFixed(2)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="game-action-buttons">
            <button
              type="button"
              className="game-action-btn game-action-btn--primary"
              onClick={handleAdvanceYear}
            >
              Advance One Year ➜
            </button>
            <button
              type="button"
              className="game-action-btn game-action-btn--secondary"
              onClick={() => setShowCharityModal(true)}
            >
              💝 Donate
            </button>
          </div>

          {/* Checkpoints */}
          {state.checkpoints_earned.length > 0 && (
            <div className="game-checkpoints-section">
              <h4>Achievements Unlocked</h4>
              <div className="game-checkpoints-list">
                {state.checkpoints_earned.map((cpId) => {
                  const cp = CHECKPOINTS.find((c) => c.id === cpId)
                  return (
                    <div key={cpId} className="game-checkpoint-badge">
                      <span>{cp?.emoji}</span>
                      <span>{cp?.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tier Modal */}
        {showTierModal && (
          <div
            className="game-modal-overlay"
            onClick={() => setShowTierModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="game-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="game-modal-title">🏆 Tiers & Points</h2>
              <p className="game-modal-subtitle">
                Your points: <strong>{state.total_points}</strong>
                {' · '}
                {(() => {
                  const nextTier = TIERS.find((t) => t.min_points > state.total_points)
                  if (!nextTier) return 'Max tier reached!'
                  const pointsToNext = nextTier.min_points - state.total_points
                  return `${pointsToNext} points to ${nextTier.emoji} ${nextTier.name}`
                })()}
              </p>
              <div className="game-tier-list">
                {TIERS.map((t) => {
                  const isCurrent = getTier(state.total_points).name === t.name
                  const isUnlocked = state.total_points >= t.min_points
                  return (
                    <div
                      key={t.name}
                      className={`game-tier-item ${isCurrent ? 'game-tier-item--current' : ''} ${isUnlocked ? 'game-tier-item--unlocked' : ''}`}
                    >
                      <span className="game-tier-emoji">{t.emoji}</span>
                      <span className="game-tier-name">{t.name}</span>
                      <span className="game-tier-points">{t.min_points} pts</span>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                className="game-modal-btn"
                onClick={() => setShowTierModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Charity Modal */}
        {showCharityModal && (
          <div
            className="game-modal-overlay"
            onClick={() => setShowCharityModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="game-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="game-modal-title">💝 Donate to Charity</h2>
              <p className="game-modal-subtitle">Give back and get a tax credit</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleDonate()
                }}
                className="game-modal-form"
              >
                <label className="game-modal-label">
                  Donation Amount
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    className="game-modal-input"
                    placeholder="e.g. 100"
                    required
                  />
                </label>
                <p className="game-modal-hint">Your tax credit will be calculated based on your income.</p>
                <button type="submit" className="game-modal-btn">
                  Donate
                </button>
              </form>

              <button
                type="button"
                className="game-modal-btn game-modal-btn--secondary"
                onClick={() => setShowCharityModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Render: INVESTMENT_CHOICE ───

  if (currentScreen === GAME_SCREENS.INVESTMENT_CHOICE) {
    const allocationRecommendation = getAllocationByAge(state.age, state.income, state.goals)

    return (
      <div className="game-page" style={{ backgroundImage: `url(${gamePageBg})` }}>
        <div className="game-top-bar">
          <Link to="/" className="game-back-link">
            ← Back to Intro
          </Link>
        </div>

        <div className="game-modal-overlay game-modal-overlay--investment" onClick={() => setCurrentScreen(GAME_SCREENS.MAIN_GAME)}>
          <div className="game-modal game-modal--large game-modal--investment" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="game-modal-close-btn"
              onClick={() => setCurrentScreen(GAME_SCREENS.MAIN_GAME)}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="game-modal-title">Choose Your Investment</h2>
            <p className="game-modal-subtitle">Checking: ${state.cash.toFixed(2)}</p>

            {/* Recommended Allocation */}
            <div className="game-investment-recommendation">
              <h3>Recommended Allocation for You</h3>
              <div className="game-allocation-bars">
                {Object.entries(allocationRecommendation.allocation).map(([asset, percentage]) => (
                  <div key={asset} className="game-allocation-bar">
                    <div
                      className="game-allocation-bar-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: CANADIAN_FUNDS[asset]?.color || '#999',
                      }}
                    />
                    <span className="game-allocation-bar-label">
                      {CANADIAN_FUNDS[asset]?.name} {percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Options - cards and buttons are fully clickable */}
            <div className="game-investment-grid">
              {Object.entries(CANADIAN_FUNDS).map(([assetKey, assetInfo]) => (
                <div
                  key={assetKey}
                  role="button"
                  tabIndex={0}
                  className="game-investment-card game-investment-card--clickable"
                  style={{ borderColor: assetInfo.color }}
                  onClick={() => handleInvestClick(assetKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleInvestClick(assetKey)
                    }
                  }}
                  aria-label={`Invest in ${assetInfo.name}`}
                >
                  <div className="game-investment-card-header" style={{ backgroundColor: assetInfo.color }}>
                    <span className="game-investment-card-icon">{assetInfo.icon}</span>
                    <h3>{assetInfo.name}</h3>
                  </div>

                  <div className="game-investment-card-body">
                    <p className="game-investment-card-desc">{assetInfo.description}</p>

                    <dl className="game-investment-card-stats">
                      <dt>Annual Return</dt>
                      <dd>{(assetInfo.annual_return * 100).toFixed(1)}%</dd>

                      <dt>Risk Level</dt>
                      <dd>{assetInfo.risk}</dd>

                      {assetInfo.contribution_limit_2024 && (
                        <>
                          <dt>2024 Limit</dt>
                          <dd>${assetInfo.contribution_limit_2024.toLocaleString()}</dd>
                        </>
                      )}
                    </dl>
                    <p className="game-investment-estimate">
                      Est. after 1 year: +{(assetInfo.annual_return * 100).toFixed(1)}% growth
                    </p>
                  </div>

                  <div className="game-investment-card-footer">
                    <span className="game-investment-btn">Invest in {assetInfo.name}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Investment Modal */}
            {showFundModal && (() => {
              const fund = CANADIAN_FUNDS[showFundModal]
              const amount = parseFloat(investAmount) || 0
              const estimatedGrowth = amount > 0 && fund ? (amount * (1 + fund.annual_return)).toFixed(2) : null
              return (
                <div className="game-modal-overlay game-modal-overlay--nested" onClick={() => setShowFundModal(null)}>
                  <div className="game-modal" onClick={(e) => e.stopPropagation()}>
                    <h3 className="game-modal-title">Invest in {fund?.name}</h3>
                    <p className="game-modal-subtitle">
                      {fund?.name} holds ETF/Mutual Fund/Stock options. Est. return: {(fund?.annual_return * 100).toFixed(1)}%/year.
                    </p>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleConfirmInvestment()
                      }}
                      className="game-modal-form"
                    >
                      <label className="game-modal-label">
                        Amount to Invest
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={investAmount}
                          onChange={(e) => setInvestAmount(e.target.value)}
                          className="game-modal-input"
                          placeholder="e.g. 500"
                          required
                        />
                      </label>

                      <p className="game-modal-hint">Available (Checking): ${state.cash.toFixed(2)}</p>
                      {estimatedGrowth && (
                        <p className="game-modal-hint game-modal-hint--highlight">
                          Estimated value after 1 year: ~${estimatedGrowth} (at {(fund?.annual_return * 100).toFixed(1)}% growth)
                        </p>
                      )}

                      <button type="submit" className="game-modal-btn">
                        Confirm Investment
                      </button>
                    </form>

                    <button
                      type="button"
                      className="game-modal-btn game-modal-btn--secondary"
                      onClick={() => setShowFundModal(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            })()}

            <button
              type="button"
              className="game-modal-btn game-modal-btn--secondary"
              onClick={() => setCurrentScreen(GAME_SCREENS.MAIN_GAME)}
            >
              Back to Game
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: STOCKS ───

  const handleStockBuySell = (ticker, mode) => {
    const price = state.stock_prices?.[ticker] ?? stockQuotes[ticker]?.price ?? 0
    if (price <= 0) {
      alert('Price not available. Try refreshing.')
      return
    }
    const shares = parseInt(stockBuySell.shares, 10)
    if (!shares || shares <= 0) {
      alert('Enter a valid number of shares')
      return
    }
    if (mode === 'buy') {
      const cost = shares * price
      if (cost > state.cash) {
        alert('Insufficient cash in Checking')
        return
      }
      const result = buyStock(ticker, shares, price)
      if (result.success) {
        setStockBuySell({ ticker: null, shares: '', mode: 'buy' })
      } else {
        alert(result.error)
      }
    } else {
      const holding = state.stock_holdings?.[ticker]
      if (!holding || holding.shares < shares) {
        alert('Insufficient shares to sell')
        return
      }
      const result = sellStock(ticker, shares, price)
      if (result.success) {
        setStockBuySell({ ticker: null, shares: '', mode: 'sell' })
      } else {
        alert(result.error)
      }
    }
  }

  if (currentScreen === GAME_SCREENS.STOCKS) {
    return (
      <div className="game-page" style={{ backgroundImage: `url(${gamePageBg})` }}>
        <div className="game-hud game-hud--stocks">
          <div className="game-hud-section">
            <span className="game-hud-label">Checking:</span>
            <span className="game-hud-value">${state.cash.toFixed(2)}</span>
          </div>
          <div className="game-hud-section game-hud-section--back">
            <button
              type="button"
              className="game-back-link game-back-link--in-hud"
              onClick={() => setCurrentScreen(GAME_SCREENS.MAIN_GAME)}
            >
              ← Back to Game
            </button>
          </div>
        </div>

        <div className="game-page-content game-stocks-content">
          <h2 className="game-stocks-title">📈 Stocks — Buy & Sell</h2>
          <p className="game-stocks-subtitle">
            Real tickers from Yahoo Finance. Prices update when you open this page.
          </p>

          {stocksLoading ? (
            <p className="game-stocks-loading">Loading prices…</p>
          ) : (
            <div className="game-stocks-table-wrap">
              <table className="game-stocks-table">
                <thead>
                  <tr>
                    <th>Company name</th>
                    <th>Current price</th>
                    <th>Est. growth / risk</th>
                    <th>Shares you have</th>
                    <th>Total value</th>
                    <th>Buy / Sell</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_STOCKS.map((stock) => {
                    const price = state.stock_prices?.[stock.ticker] ?? stockQuotes[stock.ticker]?.price ?? 0
                    const holding = state.stock_holdings?.[stock.ticker]
                    const shares = holding?.shares ?? 0
                    const totalValue = Math.round(shares * price * 100) / 100
                    const isActive = stockBuySell.ticker === stock.ticker
                    return (
                      <tr key={stock.ticker} className="game-stocks-row">
                        <td>{stock.name}</td>
                        <td>${price > 0 ? price.toFixed(2) : '—'}</td>
                        <td>{stock.estGrowth} / {stock.risk}</td>
                        <td>{shares}</td>
                        <td>${totalValue.toFixed(2)}</td>
                        <td>
                          <div className="game-stocks-actions">
                            {!isActive ? (
                              <>
                                <button
                                  type="button"
                                  className="game-stocks-btn game-stocks-btn--buy"
                                  onClick={() => setStockBuySell({ ticker: stock.ticker, shares: '', mode: 'buy' })}
                                >
                                  Buy
                                </button>
                                <button
                                  type="button"
                                  className="game-stocks-btn game-stocks-btn--sell"
                                  onClick={() => setStockBuySell({ ticker: stock.ticker, shares: String(shares), mode: 'sell' })}
                                  disabled={shares <= 0}
                                >
                                  Sell
                                </button>
                              </>
                            ) : (
                              <div className="game-stocks-inline-form">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={stockBuySell.shares}
                                  onChange={(e) => setStockBuySell((p) => ({ ...p, shares: e.target.value }))}
                                  className="game-stocks-shares-input"
                                  placeholder="Shares"
                                />
                                <button
                                  type="button"
                                  className="game-stocks-btn game-stocks-btn--confirm"
                                  onClick={() => handleStockBuySell(stock.ticker, stockBuySell.mode)}
                                >
                                  {stockBuySell.mode === 'buy' ? 'Buy' : 'Sell'}
                                </button>
                                <button
                                  type="button"
                                  className="game-stocks-btn game-stocks-btn--cancel"
                                  onClick={() => setStockBuySell({ ticker: null, shares: '', mode: 'buy' })}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <button
            type="button"
            className="game-modal-btn"
            onClick={() => setCurrentScreen(GAME_SCREENS.MAIN_GAME)}
          >
            Back to Game
          </button>
        </div>
      </div>
    )
  }

  // ─── Render: END_GAME ───

  if (currentScreen === GAME_SCREENS.END_GAME && state.summary) {
    const summary = state.summary

    return (
      <div className="game-page" style={{ backgroundImage: `url(${gamePageBg})` }}>
        <div className="game-modal-overlay">
          <div className="game-modal game-modal--summary">
            <h2 className="game-modal-title">Game Over! 🎮</h2>

            <div className="game-summary-content">
              <div className="game-summary-section">
                <h3>Your Financial Story</h3>
                <p>
                  <strong>{state.name}</strong>, age {formData.age} to {state.ending_age}
                </p>
                <p>
                  <strong>Years Played:</strong> {summary.years_played}
                </p>
                <p>
                  <strong>Events Faced:</strong> {summary.events_faced_count}
                </p>
              </div>

              <div className="game-summary-section">
                <h3>Financial Results</h3>
                <p>
                  <strong>Final Net Worth:</strong> $
                  {summary.net_worth.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
                <p>
                  <strong>Financial Personality:</strong> {summary.personality}
                </p>
                <p className="game-summary-personality-desc">{summary.personality_desc}</p>
              </div>

              <div className="game-summary-section">
                <h3>Your Achievements</h3>
                <div className="game-summary-tier">
                  <p>
                    <strong>Tier:</strong> {summary.tier.emoji} {summary.tier.name}
                  </p>
                  <p>
                    <strong>Total Points:</strong> {summary.total_points}
                  </p>
                  <p>
                    <strong>Financial Literacy Score:</strong> {summary.literacy_score}/100
                  </p>
                </div>
              </div>

              <div className="game-summary-section">
                <h3>Feedback</h3>
                {summary.feedback.map((msg, idx) => (
                  <p key={idx} className="game-summary-feedback-item">
                    {msg}
                  </p>
                ))}
              </div>
            </div>

            <div className="game-summary-buttons">
              <Link to="/" className="game-modal-btn">
                Back to Home
              </Link>
              <button
                type="button"
                className="game-modal-btn game-modal-btn--secondary"
                onClick={() => window.location.reload()}
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default FinancialGame
