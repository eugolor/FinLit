/**
 * Enhanced Financial Game Component - FRONTEND ONLY
 * Consolidated all backend logic into React component
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import './FinancialGame.css'
import { useGameState } from '../hooks/useGameState.js'
import { CANADIAN_FUNDS, CHECKPOINTS, TIERS } from '../utils/gameData.js'
import {
  calculateTax,
  getAllocationByAge,
  calculateDonationCredit,
  generateGameSummary,
  getTier,
} from '../utils/gameCalculations.js'

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
  END_GAME: 'end_game',
}

function FinancialGame() {
  const { state, initializeGame, investInFund, donate, simulateGameYear, endGame } = useGameState()

  // UI state
  const [currentScreen, setCurrentScreen] = useState(GAME_SCREENS.SETUP)
  const [showFundModal, setShowFundModal] = useState(null)
  const [showCharityModal, setShowCharityModal] = useState(false)
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

  const handleAdvanceYear = async () => {
    const result = simulateGameYear()

    if (result.success) {
      // Check if game is over
      if (state.age + 1 >= state.ending_age) {
        const summary = generateGameSummary({
          starting_age: parseInt(formData.age),
          ending_age: state.ending_age,
          starting_income: state.income,
          final_portfolio: state.portfolio,
          final_cash: state.cash,
          checkpoints_earned: state.checkpoints_earned,
          total_points: state.total_points,
          events_faced: state.events_faced,
        })

        endGame(summary)
        setCurrentScreen(GAME_SCREENS.END_GAME)
      }
    }
  }

  // ─── Helper Functions ───

  const getNetWorth = () => {
    const portfolioValue = Object.values(state.portfolio).reduce((sum, val) => sum + val, 0)
    return state.cash + portfolioValue
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
        <Link to="/" className="game-back-link">
          ← Back to Intro
        </Link>

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
                  step="1000"
                  value={formData.income}
                  onChange={handleFormChange}
                  className="game-modal-input"
                  placeholder="e.g. 60000"
                  required
                />
              </label>

              <label className="game-modal-label">
                Starting Money
                <input
                  type="number"
                  name="starting_money"
                  min="0"
                  step="100"
                  value={formData.starting_money}
                  onChange={handleFormChange}
                  className="game-modal-input"
                  placeholder="e.g. 5000"
                  required
                />
              </label>

              <fieldset className="game-modal-fieldset">
                <legend>Financial Goals (Optional)</legend>
                <label className="game-modal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.goals.includes('home')}
                    onChange={() => handleGoalToggle('home')}
                  />
                  Save for a home
                </label>
                <label className="game-modal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.goals.includes('emergency')}
                    onChange={() => handleGoalToggle('emergency')}
                  />
                  Build emergency fund
                </label>
                <label className="game-modal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.goals.includes('retirement')}
                    onChange={() => handleGoalToggle('retirement')}
                  />
                  Early retirement
                </label>
                <label className="game-modal-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.goals.includes('travel')}
                    onChange={() => handleGoalToggle('travel')}
                  />
                  Travel & experiences
                </label>
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
        <Link to="/" className="game-back-link">
          ← Back to Intro
        </Link>

        {/* Game HUD */}
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
              <span className="game-hud-value">
                {tier.emoji} {tier.name}
              </span>
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
              <span className="game-hud-label">Cash:</span>
              <span className="game-hud-value">${state.cash.toFixed(2)}</span>
            </div>
            <div className="game-hud-item">
              <span className="game-hud-label">Portfolio Value:</span>
              <span className="game-hud-value">${(getNetWorth() - state.cash).toFixed(2)}</span>
            </div>
            <div className="game-hud-item">
              <span className="game-hud-label">Net Worth:</span>
              <span className="game-hud-value" style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                ${getNetWorth().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Main Game Content */}
        <div className="game-page-content">
          {/* Cash Stash */}
          <div
            className="game-cashstash-wrap game-cashstash-wrap--clickable"
            role="button"
            tabIndex={0}
            onClick={() => setCurrentScreen(GAME_SCREENS.INVESTMENT_CHOICE)}
            onKeyDown={(e) => e.key === 'Enter' && setCurrentScreen(GAME_SCREENS.INVESTMENT_CHOICE)}
            aria-label="View your cash and investment options"
          >
            <img src={cashStashImg} alt="Your Cash" className="game-cashstash-img" />
            <p className="game-money-display">${state.cash.toFixed(2)}</p>
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
        <Link to="/" className="game-back-link">
          ← Back to Intro
        </Link>

        <div className="game-modal-overlay" onClick={() => setCurrentScreen(GAME_SCREENS.MAIN_GAME)}>
          <div className="game-modal game-modal--large" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="game-modal-close-btn"
              onClick={() => setCurrentScreen(GAME_SCREENS.MAIN_GAME)}
              aria-label="Close"
            >
              ×
            </button>

            <h2 className="game-modal-title">Choose Your Investment</h2>
            <p className="game-modal-subtitle">Your cash: ${state.cash.toFixed(2)}</p>

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

            {/* Investment Options */}
            <div className="game-investment-grid">
              {Object.entries(CANADIAN_FUNDS).map(([assetKey, assetInfo]) => (
                <div key={assetKey} className="game-investment-card" style={{ borderColor: assetInfo.color }}>
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
                  </div>

                  <button
                    type="button"
                    className="game-investment-btn"
                    onClick={() => handleInvestClick(assetKey)}
                  >
                    Invest in {assetInfo.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Investment Modal */}
            {showFundModal && (
              <div className="game-modal-overlay game-modal-overlay--nested" onClick={() => setShowFundModal(null)}>
                <div className="game-modal" onClick={(e) => e.stopPropagation()}>
                  <h3 className="game-modal-title">Invest in {CANADIAN_FUNDS[showFundModal]?.name}</h3>

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

                    <p className="game-modal-hint">Available: ${state.cash.toFixed(2)}</p>

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
            )}

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
