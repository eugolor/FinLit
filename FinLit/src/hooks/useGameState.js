/**
 * Game state management using useReducer
 * Handles all game state transitions
 */

import { useReducer, useCallback } from 'react';
import { simulateYear, getTier } from '../utils/gameCalculations.js';
import { CHECKPOINTS } from '../utils/gameData.js';

export const GAME_ACTIONS = {
    // Setup
    INITIALIZE_GAME: 'INITIALIZE_GAME',

    // Investing
    INVEST_IN_FUND: 'INVEST_IN_FUND',
    DONATE: 'DONATE',

    // Year progression
    SIMULATE_YEAR: 'SIMULATE_YEAR',
    PREVIEW_YEAR: 'PREVIEW_YEAR',

    // End game
    END_GAME: 'END_GAME',
};

const initialGameState = {
    // Player profile
    name: '',
    age: 0,
    income: 0,
    goals: [],
    starting_money: 0,

    // Game state
    year: 2025,
    cash: 0,
    portfolio: {}, // e.g., { tfsa: 500, rrsp: 1000 }
    total_points: 0,
    checkpoints_earned: [],

    // Events
    events_faced: [],
    current_event: null,

    // Game flow
    is_game_started: false,
    is_game_over: false,
    ending_age: 65,

    // Summary
    summary: null,
};

function gameReducer(state, action) {
    switch (action.type) {
        case GAME_ACTIONS.INITIALIZE_GAME: {
            const { name, age, income, goals, starting_money } = action.payload;
            return {
                ...initialGameState,
                name,
                age,
                income,
                goals,
                starting_money,
                cash: starting_money,
                is_game_started: true,
            };
        }

        case GAME_ACTIONS.INVEST_IN_FUND: {
            const { fund_type, amount } = action.payload;
            const newCash = state.cash - amount;
            if (newCash < 0) {
                throw new Error('Insufficient cash');
            }
            const newPortfolio = { ...state.portfolio };
            newPortfolio[fund_type] = (newPortfolio[fund_type] || 0) + amount;
            return {
                ...state,
                cash: Math.round(newCash * 100) / 100,
                portfolio: newPortfolio,
            };
        }

        case GAME_ACTIONS.DONATE: {
            const { amount, tax_credit } = action.payload;
            const newCash = state.cash - amount;
            if (newCash < 0) {
                throw new Error('Insufficient cash');
            }
            // Social points based on donation relative to income
            const socialPoints = state.income > 0 ? Math.round((amount / state.income) * 1000) : Math.round(amount / 100);
            return {
                ...state,
                cash: Math.round(newCash * 100) / 100,
                total_points: state.total_points + socialPoints,
            };
        }

        case GAME_ACTIONS.SIMULATE_YEAR: {
            const { trigger_event = null, force_no_event = false } = action.payload;

            // Check if game should end
            if (state.age >= state.ending_age) {
                return { ...state, is_game_over: true };
            }

            const result = simulateYear({
                portfolio: state.portfolio,
                cash: state.cash,
                age: state.age,
                income: state.income,
                year: state.year,
                monthly_contribution: state.income * 0.15 / 12, // 15% of income as investment
                trigger_event,
                preview: false,
                force_no_event,
            });

            // Merge new checkpoints
            const uniqueCheckpoints = [...new Set([...state.checkpoints_earned, ...result.earned_checkpoints])];

            // Calculate new points from checkpoints
            let checkpointPoints = 0;
            for (const cpId of result.earned_checkpoints) {
                if (!state.checkpoints_earned.includes(cpId)) {
                    const cp = CHECKPOINTS.find((c) => c.id === cpId);
                    if (cp) checkpointPoints += cp.points;
                }
            }

            const newEvents = [...state.events_faced];
            if (result.event) {
                newEvents.push(result.event.id || 'unknown');
            }

            return {
                ...state,
                portfolio: result.portfolio,
                cash: result.cash,
                age: result.age,
                year: result.year,
                total_points: state.total_points + checkpointPoints,
                checkpoints_earned: uniqueCheckpoints,
                events_faced: newEvents,
                current_event: result.event || null,
            };
        }

        case GAME_ACTIONS.PREVIEW_YEAR: {
            const { trigger_event = null, force_no_event = false } = action.payload;

            const result = simulateYear({
                portfolio: state.portfolio,
                cash: state.cash,
                age: state.age,
                income: state.income,
                year: state.year,
                monthly_contribution: state.income * 0.15 / 12,
                trigger_event,
                preview: true,
                force_no_event,
            });

            // Return a preview state (doesn't advance game, just shows what would happen)
            return {
                ...state,
                current_event: result.event || null,
            };
        }

        case GAME_ACTIONS.END_GAME: {
            return {
                ...state,
                is_game_over: true,
                summary: action.payload,
            };
        }

        default:
            return state;
    }
}

/**
 * Custom hook for game state management
 */
export function useGameState(initialAge = 25, initialIncome = 60000, endingAge = 65) {
    const [state, dispatch] = useReducer(gameReducer, initialGameState);

    const initializeGame = useCallback((name, age, income, goals, starting_money) => {
        dispatch({
            type: GAME_ACTIONS.INITIALIZE_GAME,
            payload: { name, age, income, goals, starting_money },
        });
    }, []);

    const investInFund = useCallback((fund_type, amount) => {
        try {
            dispatch({
                type: GAME_ACTIONS.INVEST_IN_FUND,
                payload: { fund_type, amount },
            });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    const donate = useCallback((amount, tax_credit) => {
        try {
            dispatch({
                type: GAME_ACTIONS.DONATE,
                payload: { amount, tax_credit },
            });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    const simulateGameYear = useCallback((trigger_event = null, force_no_event = false) => {
        try {
            dispatch({
                type: GAME_ACTIONS.SIMULATE_YEAR,
                payload: { trigger_event, force_no_event },
            });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    const previewGameYear = useCallback((trigger_event = null, force_no_event = false) => {
        try {
            dispatch({
                type: GAME_ACTIONS.PREVIEW_YEAR,
                payload: { trigger_event, force_no_event },
            });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    const endGame = useCallback((summary) => {
        dispatch({
            type: GAME_ACTIONS.END_GAME,
            payload: summary,
        });
    }, []);

    return {
        state,
        initializeGame,
        investInFund,
        donate,
        simulateGameYear,
        previewGameYear,
        endGame,
    };
}
