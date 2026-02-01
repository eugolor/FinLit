/**
 * Stock API Integration Guide
 * Yahoo Finance (yfinance equivalent) + Alpha Vantage fallback
 */

/** Example tickers for the game (real symbols from Yahoo Finance) */
export const EXAMPLE_STOCKS = [
    { ticker: 'AAPL', name: 'Apple Inc.', estGrowth: 'High', risk: 'Medium' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', estGrowth: 'High', risk: 'Medium' },
    { ticker: 'GOOGL', name: 'Alphabet (Google)', estGrowth: 'High', risk: 'Medium' },
    { ticker: 'AMZN', name: 'Amazon.com Inc.', estGrowth: 'High', risk: 'Medium' },
    { ticker: 'TSLA', name: 'Tesla Inc.', estGrowth: 'Very High', risk: 'High' },
];

/**
 * Yahoo Finance chart API (same data source as Python yfinance)
 * Uses public chart endpoint; may require CORS proxy in some environments.
 */
export async function fetchYahooQuote(ticker) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    try {
        const res = await fetch(proxyUrl);
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) return null;

        const meta = result.meta || {};
        const quote = result.indicators?.quote?.[0];
        const price = meta.regularMarketPrice ?? (quote?.close?.[quote.close.length - 1]) ?? meta.previousClose ?? 0;
        const prevClose = meta.previousClose ?? price;
        const change = price - prevClose;
        const changePercent = prevClose ? (change / prevClose) * 100 : 0;

        return {
            symbol: meta.symbol || ticker,
            price: typeof price === 'number' ? Math.round(price * 100) / 100 : 0,
            change,
            changePercent,
            timestamp: new Date().toISOString(),
        };
    } catch (err) {
        console.warn('Yahoo fetch failed for', ticker, err);
        return null;
    }
}

/**
 * Fetch quote: try Yahoo first (yfinance equivalent), then Alpha Vantage if key set
 */
export async function fetchStockQuote(ticker) {
    const yahoo = await fetchYahooQuote(ticker);
    if (yahoo && yahoo.price > 0) return yahoo;
    const av = await fetchStockPrice(ticker);
    if (av && av.price > 0) return { symbol: av.symbol, price: av.price, change: av.change, changePercent: av.change, timestamp: av.timestamp };
    return null;
}

/**
 * OPTION 1: Alpha Vantage (Free with API Key)
 * - Free tier: 5 requests/minute, 500/day
 * - Get API: https://www.alphavantage.co
 */

export async function fetchStockPrice(ticker) {
    const API_KEY = import.meta.env.VITE_ALPHAVANTAGE_KEY
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${API_KEY}`

    try {
        const res = await fetch(url)
        const data = await res.json()
        return {
            symbol: data['Global Quote']['01. symbol'],
            price: parseFloat(data['Global Quote']['05. price']),
            change: parseFloat(data['Global Quote']['09. change']),
            changePercent: parseFloat(data['Global Quote']['10. change percent']),
            timestamp: new Date().toISOString(),
        }
    } catch (err) {
        console.error('Stock fetch error:', err)
        return null
    }
}

export async function fetchHistoricalPrices(ticker, monthsBack = 12) {
    const API_KEY = import.meta.env.VITE_ALPHAVANTAGE_KEY
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${ticker}&apikey=${API_KEY}`

    try {
        const res = await fetch(url)
        const data = await res.json()
        const timeSeries = data['Monthly Time Series']

        // Extract last N months and calculate returns
        const dates = Object.keys(timeSeries).sort().reverse().slice(0, monthsBack)
        const prices = dates.map((d) => ({
            date: d,
            close: parseFloat(timeSeries[d]['4. close']),
        }))

        return prices
    } catch (err) {
        console.error('Historical price error:', err)
        return []
    }
}

/**
 * OPTION 2: IEX Cloud (Better data, free tier)
 * - Free tier: Unlimited calls, but limited endpoints
 * - Get API: https://iexcloud.io
 */

export async function fetchStockPriceIEX(ticker) {
    const API_KEY = import.meta.env.VITE_IEXCLOUD_KEY
    const url = `https://cloud.iexapis.com/stable/stock/${ticker}/quote?token=${API_KEY}`

    try {
        const res = await fetch(url)
        const data = await res.json()
        return {
            symbol: data.symbol,
            price: data.latestPrice,
            change: data.change,
            changePercent: data.changePercent,
            timestamp: new Date(data.latestUpdate).toISOString(),
        }
    } catch (err) {
        console.error('IEX fetch error:', err)
        return null
    }
}

/**
 * OPTION 3: FINNHUB (Good for predictions)
 * - Free tier: 60 calls/minute
 * - Get API: https://finnhub.io
 */

export async function fetchStockForecast(ticker) {
    const API_KEY = import.meta.env.VITE_FINNHUB_KEY
    const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${ticker}&token=${API_KEY}`

    try {
        const res = await fetch(url)
        const data = await res.json()
        if (data.length === 0) return null

        const latest = data[0]
        return {
            symbol: ticker,
            buy: latest.buy,
            hold: latest.hold,
            sell: latest.sell,
            strongBuy: latest.strongBuy,
            strongSell: latest.strongSell,
            recommendation: getRecommendation(latest),
            targetPrice: latest.targetPrice || null,
        }
    } catch (err) {
        console.error('Forecast error:', err)
        return null
    }
}

function getRecommendation(data) {
    const { buy, strongBuy, hold, sell, strongSell } = data
    const votes = [
        { label: 'Strong Buy', votes: strongBuy },
        { label: 'Buy', votes: buy },
        { label: 'Hold', votes: hold },
        { label: 'Sell', votes: sell },
        { label: 'Strong Sell', votes: strongSell },
    ]
    return votes.reduce((a, b) => (a.votes > b.votes ? a : b)).label
}

/**
 * Calculate projection based on historical returns
 * Used for game predictions (simplified HMM from Python)
 */
export function projectStockReturns(historicalPrices, yearsAhead = 5) {
    if (historicalPrices.length < 2) return null

    // Calculate monthly log returns
    const returns = []
    for (let i = 1; i < historicalPrices.length; i++) {
        const ret = Math.log(historicalPrices[i].close / historicalPrices[i - 1].close)
        returns.push(ret)
    }

    // Calculate mean and std dev
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length
    const stdDev = Math.sqrt(variance)

    // Annualize (multiply monthly by 12)
    const annualMean = mean * 12
    const annualStdDev = stdDev * Math.sqrt(12)

    // 3-year projection with percentiles
    const years = 3
    const sims = 10000

    const futureMultipliers = []
    for (let s = 0; s < sims; s++) {
        let cumRet = 0
        for (let y = 0; y < years; y++) {
            // Random normal return
            const z = standardNormal()
            const monthlyReturn = annualMean / 12 + (annualStdDev / Math.sqrt(12)) * z
            cumRet += monthlyReturn
        }
        futureMultipliers.push(Math.exp(cumRet))
    }

    futureMultipliers.sort((a, b) => a - b)

    return {
        p10: futureMultipliers[Math.floor(sims * 0.1)],
        p50: futureMultipliers[Math.floor(sims * 0.5)],
        p90: futureMultipliers[Math.floor(sims * 0.9)],
        expectedAnnualReturn: Math.exp(annualMean) - 1,
        annualVolatility: annualStdDev,
    }
}

/**
 * Generate standard normal random variable (Box-Muller)
 */
function standardNormal() {
    const u1 = Math.random()
    const u2 = Math.random()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Usage in FinancialGame.jsx:
 *
 * import { fetchStockPrice, fetchHistoricalPrices, projectStockReturns } from '../utils/stockAPI.js'
 *
 * // In useEffect on game start:
 * useEffect(() => {
 *   (async () => {
 *     const price = await fetchStockPrice('AAPL')
 *     const history = await fetchHistoricalPrices('AAPL', 24)
 *     const projection = projectStockReturns(history, 5)
 *     
 *     setStockData({ price, history, projection })
 *   })()
 * }, [])
 *
 * // Display in investment modal:
 * {stockData?.projection && (
 *   <div className="stock-projection">
 *     <p>Expected 3-year return: {(stockData.projection.p50 * 100 - 100).toFixed(1)}%</p>
 *     <p>10th percentile: {(stockData.projection.p10 * 100 - 100).toFixed(1)}%</p>
 *     <p>90th percentile: {(stockData.projection.p90 * 100 - 100).toFixed(1)}%</p>
 *   </div>
 * )}
 */

/**
 * Setup Instructions:
 *
 * 1. Create .env.local file in FinLit/ root:
 *    VITE_ALPHAVANTAGE_KEY=your_key_here
 *    VITE_IEXCLOUD_KEY=your_key_here
 *    VITE_FINNHUB_KEY=your_key_here
 *
 * 2. Access in code:
 *    const key = import.meta.env.VITE_ALPHAVANTAGE_KEY
 *
 * 3. Don't commit .env.local to Git
 *    Add to .gitignore: .env.local
 */