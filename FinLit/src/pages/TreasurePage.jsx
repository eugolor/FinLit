import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './TreasurePage.css'
import treasurePageBg from '../assets/TreasureBackground.png'
import img1 from '../assets/1.png'
import img2 from '../assets/2.png'
import img3 from '../assets/3.png'
import img4 from '../assets/4.png'
import img5 from '../assets/5.png'
import img6 from '../assets/6.png'
import img7 from '../assets/7.png'
import img8 from '../assets/8.png'
import img9 from '../assets/9.png'
import img10 from '../assets/10..png'
import img11 from '../assets/11.png'
import img12 from '../assets/12..png'

const GAME_BALANCES_KEY = 'finlit-game-balances'
const INVENTORY_UNLOCKED_KEY = 'finlit-inventory-unlocked'
const UNLOCK_COST = 50

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100
}

const SPARKLE_COUNT = 24

const INVENTORY_IMGS = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10, img11, img12]

const PLACEHOLDER_ITEMS = [
  { id: 1, name: 'Compound Name' },
  { id: 2, name: 'Futureproof Jacket' },
  { id: 3, name: 'Safety Net Bracelet' },
  { id: 4, name: 'Golden Hour Watch' },
  { id: 5, name: 'Rainy Day Hoodie' },
  { id: 6, name: 'Momentum Sneakers' },
  { id: 7, name: 'Balance Pendant' },
  { id: 8, name: 'Evergreen Satchel' },
  { id: 9, name: 'Stability Specs' },
  { id: 10, name: 'North Star Pin' },
  { id: 11, name: 'Quiet Luxury Scarf' },
  { id: 12, name: 'Foundations Desk Plant' },
]

const LockIcon = () => (
  <svg className="treasure-inventory-lock-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </svg>
)

function TreasurePage() {
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [cash, setCash] = useState(0)
  const [unlockedIds, setUnlockedIds] = useState(() => new Set())
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [unlockMessage, setUnlockMessage] = useState('')

  const loadBalances = () => {
    try {
      const raw = sessionStorage.getItem(GAME_BALANCES_KEY)
      const b = raw ? JSON.parse(raw) : {}
      setCash(roundMoney(Number(b.cash) || 0))
    } catch (_) {}
  }

  const loadUnlocked = () => {
    try {
      const raw = sessionStorage.getItem(INVENTORY_UNLOCKED_KEY)
      const ids = raw ? JSON.parse(raw) : []
      setUnlockedIds(new Set(Array.isArray(ids) ? ids : []))
    } catch (_) {}
  }

  useEffect(() => {
    if (showInventoryModal) {
      loadBalances()
      loadUnlocked()
      setSelectedIds(new Set())
      setUnlockMessage('')
    }
  }, [showInventoryModal])

  const toggleSelect = (id) => {
    if (unlockedIds.has(id)) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setUnlockMessage('')
  }

  const unlockSelected = () => {
    const toUnlock = [...selectedIds].filter((id) => !unlockedIds.has(id))
    if (toUnlock.length === 0) {
      setUnlockMessage('Select one or more locked items first.')
      return
    }
    const totalCost = toUnlock.length * UNLOCK_COST
    const currentCash = roundMoney(cash)
    if (currentCash < totalCost) {
      setUnlockMessage(`Need $${totalCost.toFixed(2)} for ${toUnlock.length} item(s). You have $${currentCash.toFixed(2)}.`)
      return
    }
    setUnlockMessage('')
    const newCash = roundMoney(currentCash - totalCost)
    setCash(newCash)
    setSelectedIds(new Set())
    setUnlockedIds((prev) => {
      const next = new Set(prev)
      toUnlock.forEach((id) => next.add(id))
      try {
        sessionStorage.setItem(INVENTORY_UNLOCKED_KEY, JSON.stringify([...next]))
      } catch (_) {}
      return next
    })
    try {
      const raw = sessionStorage.getItem(GAME_BALANCES_KEY)
      const b = raw ? JSON.parse(raw) : {}
      sessionStorage.setItem(GAME_BALANCES_KEY, JSON.stringify({
        ...b,
        cash: newCash,
      }))
    } catch (_) {}
  }

  const sparkles = useMemo(
    () =>
      [...Array(SPARKLE_COUNT)].map((_, i) => ({
        id: i,
        left: 5 + ((i * 17 + 31) % 90),
        top: 5 + ((i * 13 + 7) % 85),
        delay: (i * 0.2) % 2.5,
        size: 4 + (i % 3) * 2,
      })),
    []
  )

  return (
    <div
      className="treasure-page"
      style={{ backgroundImage: `url(${treasurePageBg})` }}
    >
      <div className="treasure-sparkles" aria-hidden="true">
        {sparkles.map(({ id, left, top, delay, size }) => (
          <div
            key={id}
            className="treasure-sparkle"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${delay}s`,
              width: size,
              height: size,
            }}
          />
        ))}
      </div>
      <Link to="/game" className="treasure-back-link" aria-label="Back to game">
        ←
      </Link>
      <div className="treasure-page-content">
        <button
          type="button"
          className="treasure-open-btn"
          onClick={() => setShowInventoryModal(true)}
        >
          Open
        </button>
      </div>

      {showInventoryModal && (
        <div
          className="treasure-inventory-overlay"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowInventoryModal(false)}
        >
          <div
            className="treasure-inventory-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="treasure-inventory-title">Inventory</h2>
            <p className="treasure-inventory-cash" aria-live="polite">
              Current cash: <strong>${roundMoney(cash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              {' '}(each unlock ${UNLOCK_COST})
            </p>
            {selectedIds.size > 0 && (
              <p className="treasure-inventory-selected" aria-live="polite">
                {selectedIds.size} selected — total: ${(selectedIds.size * UNLOCK_COST).toFixed(2)}
              </p>
            )}
            {unlockMessage && (
              <p className="treasure-inventory-unlock-msg" role="alert">
                {unlockMessage}
              </p>
            )}
            <ul className="treasure-inventory-grid">
              {PLACEHOLDER_ITEMS.map((item) => {
                const unlocked = unlockedIds.has(item.id)
                const selected = selectedIds.has(item.id)
                return (
                  <li
                    key={item.id}
                    className={`treasure-inventory-item ${unlocked ? 'treasure-inventory-item--unlocked' : ''} ${selected ? 'treasure-inventory-item--selected' : ''}`}
                  >
                    <button
                      type="button"
                      className="treasure-inventory-item-slot"
                      onClick={() => toggleSelect(item.id)}
                      disabled={unlocked}
                      aria-pressed={unlocked ? undefined : selected}
                      aria-label={unlocked ? item.name : (selected ? `Deselect ${item.name}` : `Select ${item.name} to unlock`)}
                    >
                      <img
                        src={INVENTORY_IMGS[item.id - 1]}
                        alt=""
                        className="treasure-inventory-img"
                      />
                      {!unlocked && (
                        <>
                          <span className="treasure-inventory-item-overlay" aria-hidden="true" />
                          <span className="treasure-inventory-item-lock">
                            <LockIcon />
                          </span>
                        </>
                      )}
                    </button>
                    <span className="treasure-inventory-name">{item.name}</span>
                  </li>
                )
              })}
            </ul>
            <div className="treasure-inventory-actions">
              <button
                type="button"
                className="treasure-inventory-unlock-btn"
                onClick={unlockSelected}
                aria-label="Unlock selected items"
              >
                Unlock Items
              </button>
              <button
                type="button"
                className="treasure-inventory-close"
                onClick={() => setShowInventoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TreasurePage
