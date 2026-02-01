import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './TreasurePage.css'
import treasurePageBg from '../assets/TreasureBackground.png'

const SPARKLE_COUNT = 24

const PLACEHOLDER_ITEMS = [
  { id: 1, name: 'Item 1', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=1' },
  { id: 2, name: 'Item 2', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=2' },
  { id: 3, name: 'Item 3', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=3' },
  { id: 4, name: 'Item 4', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=4' },
  { id: 5, name: 'Item 5', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=5' },
  { id: 6, name: 'Item 6', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=6' },
  { id: 7, name: 'Item 7', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=7' },
  { id: 8, name: 'Item 8', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=8' },
  { id: 9, name: 'Item 9', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=9' },
  { id: 10, name: 'Item 10', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=10' },
  { id: 11, name: 'Item 11', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=11' },
  { id: 12, name: 'Item 12', img: 'https://placehold.co/80x80/e8e0d5/5c3d2e?text=12' },
]

function TreasurePage() {
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [showAddItemInput, setShowAddItemInput] = useState(false)
  const [newItemName, setNewItemName] = useState('')

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
            <ul className="treasure-inventory-grid">
              {PLACEHOLDER_ITEMS.map((item) => (
                <li key={item.id} className="treasure-inventory-item">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="treasure-inventory-img"
                  />
                  <span className="treasure-inventory-name">{item.name}</span>
                </li>
              ))}
            </ul>
            <div className="treasure-inventory-actions">
              <button
                type="button"
                className="treasure-inventory-add"
                onClick={() => setShowAddItemInput(true)}
              >
                Add new item
              </button>
              {showAddItemInput && (
                <div className="treasure-inventory-input-row">
                  <input
                    type="text"
                    className="treasure-inventory-new-item-input"
                    placeholder="What would you like to add to your inventory?"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="treasure-inventory-send-btn"
                    onClick={() => {}}
                  >
                    Send
                  </button>
                </div>
              )}
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
