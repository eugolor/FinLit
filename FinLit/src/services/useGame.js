import { useState, useCallback } from 'react';
import { gameApi } from '../services/gameApi';

export const useGame = () => {
  const [gameState, setGameState] = useState({
    portfolio: {},
    cash: 0,
    stocks: {},
    age: 0,
    year: 1,
    income: 0,
    totalPoints: 0,
    checkpointsEarned: []
  });
  const [currentEvent, setCurrentEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startGame = useCallback(async (age, startingMoney, goals) => {
    setLoading(true);
    try {
      const profile = await gameApi.getProfile(age, startingMoney * 12, goals);
      setGameState(prev => ({
        ...prev,
        age,
        income: startingMoney * 12,
        cash: startingMoney,
        portfolio: {}
      }));
      setError(null);
    } catch (err) {
      setError('Failed to start game: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const advanceYear = useCallback(async (monthlyContribution = 500) => {
    setLoading(true);
    try {
      const result = await gameApi.simulateYear(gameState, gameState.income, monthlyContribution);
      setGameState(prev => ({
        ...prev,
        portfolio: result.portfolio,
        cash: result.cash,
        age: result.age,
        year: result.year,
        checkpointsEarned: [...prev.checkpointsEarned, ...result.earned_checkpoints]
      }));
      if (result.event) {
        setCurrentEvent(result.event);
      }
      setError(null);
    } catch (err) {
      setError('Failed to advance year: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const buyStock = useCallback(async (ticker, shares) => {
    setLoading(true);
    try {
      const result = await gameApi.buyStock(ticker, shares, gameState);
      if (result.success) {
        setGameState(prev => ({
          ...prev,
          stocks: result.new_holdings,
          cash: result.new_cash
        }));
        setError(null);
        return { success: true, message: result.message };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('Buy failed: ' + err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const donate = useCallback(async (amount) => {
    setLoading(true);
    try {
      const result = await gameApi.processDonation(amount, gameState.income, gameState.cash);
      if (result.donation) {
        setGameState(prev => ({ ...prev, cash: result.cash_after }));
        setError(null);
        return { success: true, result };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('Donation failed: ' + err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  return {
    gameState,
    currentEvent,
    loading,
    error,
    startGame,
    advanceYear,
    buyStock,
    donate
  };
};