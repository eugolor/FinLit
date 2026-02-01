const API_BASE = 'http://localhost:5000';

export const gameApi = {
  getProfile: async (age, income, goals) => {
    const response = await fetch(`${API_BASE}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age, income, goals })
    });
    return response.json();
  },

  simulateYear: async (gameState, income, monthlyContribution) => {
    const response = await fetch(`${API_BASE}/api/simulate-year`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio: gameState.portfolio,
        cash: gameState.cash,
        stocks: gameState.stocks,
        age: gameState.age,
        income,
        year: gameState.year,
        monthly_contribution: monthlyContribution
      })
    });
    return response.json();
  },

  buyStock: async (ticker, shares, gameState) => {
    const response = await fetch(`${API_BASE}/api/stock-trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'buy',
        ticker,
        shares,
        cash: gameState.cash,
        current_holdings: gameState.stocks,
        year: gameState.year
      })
    });
    return response.json();
  },

  processDonation: async (amount, income, cash) => {
    const response = await fetch(`${API_BASE}/api/donate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, income, cash })
    });
    return response.json();
  },

  getFinancialHealth: async (gameState, income) => {
    const response = await fetch(`${API_BASE}/api/financial-health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolio: gameState.portfolio,
        cash: gameState.cash,
        income,
        monthly_contribution: 500,
        age: gameState.age
      })
    });
    return response.json();
  }
};