import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './FinancialGame.css'
import gamePageBg from '../assets/GamePageBackground.png'
import cashStashImg from '../assets/CashStash.png'
import charityImg from '../assets/Charity.png'
import savingsImg from '../assets/Savings.png'
import stocksImg from '../assets/Stocks.png'

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

const GAME_PROFILE_DONE_KEY = 'finlit-game-profile-done'

function FinancialGame() {
  const location = useLocation()
  const cameFromIntro = location.state?.fromIntro === true
  const alreadyCompletedProfile = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(GAME_PROFILE_DONE_KEY) === 'true'
  const [showModal, setShowModal] = useState(cameFromIntro && !alreadyCompletedProfile)
  const [showSavingsModal, setShowSavingsModal] = useState(false)
  const [showStocksModal, setShowStocksModal] = useState(false)
  const [showCashStashModal, setShowCashStashModal] = useState(false)
  const [showCharityModal, setShowCharityModal] = useState(false)
  const [donationAmount, setDonationAmount] = useState('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [startingMoney, setStartingMoney] = useState('')
  const [financialGoals, setFinancialGoals] = useState('')

  const handleStartJourney = (e) => {
    e.preventDefault()
    try {
      sessionStorage.setItem(GAME_PROFILE_DONE_KEY, 'true')
    } catch (_) {}
    setShowModal(false)
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

      {showModal && (
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
        {!showModal && (
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
            <p className="game-money-display">{startingMoney}</p>
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
            <div className="game-cashstash-modal-header">
              <h2 className="game-info-modal-title">Your cash</h2>
              <p className="game-cashstash-modal-value">{startingMoney}</p>
            </div>
            <div className="game-info-modal-body">
              <p className="game-cashstash-modal-subtitle">Ways to use your cash</p>
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
            </div>
            <button
              type="button"
              className="game-modal-btn game-info-modal-close"
              onClick={() => setShowSavingsModal(false)}
            >
              Close
            </button>
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
            </div>
            <button
              type="button"
              className="game-modal-btn game-info-modal-close"
              onClick={() => setShowStocksModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {!showModal && (
        <div className="game-bottom-icons">
          <div
            className="game-bottom-icon-wrap game-bottom-icon-wrap--clickable"
            role="button"
            tabIndex={0}
            onClick={() => setShowSavingsModal(true)}
            onKeyDown={(e) => e.key === 'Enter' && setShowSavingsModal(true)}
            aria-label="Open Savings (TFSA) info"
          >
            <img src={savingsImg} alt="Savings" className="game-bottom-icon" />
          </div>
          <div
            className="game-bottom-icon-wrap game-bottom-icon-wrap--clickable"
            role="button"
            tabIndex={0}
            onClick={() => setShowStocksModal(true)}
            onKeyDown={(e) => e.key === 'Enter' && setShowStocksModal(true)}
            aria-label="Open Stocks info"
          >
            <img src={stocksImg} alt="Stocks" className="game-bottom-icon" />
          </div>
          <div
            className="game-bottom-icon-wrap game-bottom-icon-wrap--clickable"
            role="button"
            tabIndex={0}
            onClick={() => setShowCharityModal(true)}
            onKeyDown={(e) => e.key === 'Enter' && setShowCharityModal(true)}
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
              <label className="game-charity-donation-label">
                Donation amount
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="game-modal-input game-charity-donation-input"
                  placeholder="e.g. 50"
                />
              </label>
              <a
                href={CHARITY_INFO.resource_url}
                target="_blank"
                rel="noopener noreferrer"
                className="game-info-modal-link game-info-modal-link--charity"
              >
                About charitable giving (Canada) →
              </a>
            </div>
            <button
              type="button"
              className="game-modal-btn game-info-modal-close"
              onClick={() => setShowCharityModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialGame
