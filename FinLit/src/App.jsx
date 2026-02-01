import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

const SPARKLE_COUNT = 24

function App() {
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
    <div className="intro-page">
      <div className="clouds" aria-hidden="true">
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="cloud cloud-4" />
        <div className="cloud cloud-5" />
      </div>
      <div className="sparkles" aria-hidden="true">
        {sparkles.map(({ id, left, top, delay, size }) => (
          <div
            key={id}
            className="sparkle"
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
      <div className="intro-content">
        <div className="intro-buttons">
          <button type="button" className="intro-btn intro-btn-tutorial">
            Tutorial
          </button>
          <Link
            to="/game"
            state={{ fromIntro: true }}
            className="intro-btn intro-btn-start"
          >
            Start Game
          </Link>
        </div>
      </div>
    </div>
  )
}

export default App