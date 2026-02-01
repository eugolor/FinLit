import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import FinancialGame from './pages/FinancialGame.jsx'
import TreasurePage from './pages/TreasurePage.jsx'
import StocksPage from './pages/StocksPage.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/game',
    element: <FinancialGame />,
  },
  {
    path: '/game/stocks',
    element: <StocksPage />,
  },
  {
    path: '/treasure',
    element: <TreasurePage />,
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
