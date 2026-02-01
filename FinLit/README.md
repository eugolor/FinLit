# FinLit — Financial Literacy Game

## How to run

You need **two terminals**: one for the backend (Flask), one for the frontend (Vite/React).

### 1. Backend (Flask API)

From the **project root** (`FinLit/`):

```bash
python src/App.py
```

Or from inside `src`:

```bash
cd src && python App.py
```

- API runs at **http://localhost:5000**
- Uses precomputed stock data in `src/data/precomputed/` (AAPL, MSFT, TSLA, NVDA, SPY)

**Python deps:** `flask`, `flask-cors`. Install with:

```bash
pip install flask flask-cors
```

### 2. Frontend (React + Vite)

In a **second terminal**, from the project root:

```bash
npm install
npm run dev
```

- App runs at **http://localhost:5173**
- Vite proxies `/api` to the Flask backend (see `vite.config.js`)

Open **http://localhost:5173** in your browser. Use **Start Game** to play; the Stocks icon opens the stock trading page (buy/sell uses the backend and year-based prices).

### Optional: Regenerate stock data

To recompute stock predictions (writes to `src/data/precomputed/`):

```bash
pip install numpy pandas yfinance
python src/precompute_stock_prediction.py
```

---

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
