# FinLit — Financial Literacy Game

## Running the app (intro + game with backend)

1. **Start the backend (Flask API)** — in one terminal:
   ```bash
   cd src/pages && python app.py
   ```
   The API runs at http://localhost:5000.

2. **Start the frontend (Vite)** — in another terminal:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173. Click **Start Game** to play; the game’s API calls are proxied from Vite to the Flask backend.

**Alternative (game only, no React intro):** Run only the backend and open http://localhost:5000 — the Flask app serves `index.html` (the game) at `/`.

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
