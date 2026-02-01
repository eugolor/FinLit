/**
 * Core game constants and data definitions
 * Migrated from app.py
 */

export const CANADIAN_FUNDS = {
    tfsa: {
        name: 'TFSA',
        full_name: 'Tax-Free Savings Account',
        icon: '🛡️',
        color: '#22c55e',
        annual_return: 0.07,
        description: 'Any Canadian 18+ can open one. All growth and withdrawals are completely tax-free. You can withdraw anytime without penalty — the most flexible registered account in Canada.',
        why_important: 'The single best place to put money you might need before retirement. Tax-free growth with zero strings attached.',
        best_for_ages: '18–65',
        contribution_limit_2024: 7000,
        resource_url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tfsa.html',
        risk: 'Low–Medium',
    },
    rrsp: {
        name: 'RRSP',
        full_name: 'Registered Retirement Savings Plan',
        icon: '🏖️',
        color: '#f59e0b',
        annual_return: 0.07,
        description: 'Contributions are tax-deductible — you get money back on your tax return. Growth is tax-sheltered until you withdraw in retirement, when it\'s taxed as income.',
        why_important: 'Best for people in higher tax brackets now who expect a lower bracket in retirement. A powerful way to reduce your tax bill today.',
        best_for_ages: '25–65',
        contribution_limit_2024: 31560,
        resource_url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/rrsp.html',
        risk: 'Low–Medium',
    },
    fhsa: {
        name: 'FHSA',
        full_name: 'First Home Savings Account',
        icon: '🏠',
        color: '#3b82f6',
        annual_return: 0.06,
        description: 'Launched 2023 for first-time buyers. Contributions are tax-deductible AND withdrawals for a qualifying home purchase are tax-free. Best of both worlds.',
        why_important: 'If you\'re a renter dreaming of a first home, this is literally free money from the government.',
        best_for_ages: '18–40',
        contribution_limit_2024: 8000,
        resource_url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/fhsa.html',
        risk: 'Low–Medium',
    },
    gic: {
        name: 'GIC',
        full_name: 'Guaranteed Investment Certificate',
        icon: '🔒',
        color: '#14b8a6',
        annual_return: 0.045,
        description: 'You lend money to a bank for a fixed term and they pay a guaranteed rate. Zero risk of losing your principal.',
        why_important: 'Perfect for money you can\'t afford to lose. A safe parking spot while you figure out your next move.',
        best_for_ages: '18–70',
        contribution_limit_2024: null,
        resource_url: 'https://www.canada.ca/en/financial-consumer-agency/services/saving-investing/gics.html',
        risk: 'Very Low',
    },
    resp: {
        name: 'RESP',
        full_name: 'Registered Education Savings Plan',
        icon: '🎓',
        color: '#6366f1',
        annual_return: 0.06,
        description: 'Savings for a child\'s education. The government adds a grant of up to 20% on the first $2,500/year (the CESG). Growth is tax-sheltered.',
        why_important: 'Free money from the government for your kid\'s education. The CESG alone is worth thousands over 18 years.',
        best_for_ages: 'Parents of children 0–17',
        contribution_limit_2024: 2500,
        resource_url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/resp.html',
        risk: 'Low–Medium',
    },
    etf: {
        name: 'ETF',
        full_name: 'Exchange-Traded Fund',
        icon: '📈',
        color: '#8b5cf6',
        annual_return: 0.09,
        description: 'A basket of stocks or bonds that trades like a single stock. Extremely low fees. An S&P 500 ETF owns a tiny piece of the 500 biggest US companies.',
        why_important: 'The simplest way to diversify. Index ETFs historically beat most actively managed funds over 10+ years.',
        best_for_ages: '18–65',
        contribution_limit_2024: null,
        resource_url: 'https://www.investopedia.com/terms/e/etf.asp',
        risk: 'Medium',
    },
    mutual_fund: {
        name: 'Mutual Fund',
        full_name: 'Mutual Fund',
        icon: '📊',
        color: '#ec4899',
        annual_return: 0.06,
        description: 'A pool of money managed by a professional fund manager. Fees (MERs) are higher than ETFs — typically 1.5–2.5% per year in Canada.',
        why_important: 'Some prefer a human making decisions. But most mutual funds underperform index ETFs over 10+ years after fees.',
        best_for_ages: '25–60',
        contribution_limit_2024: null,
        resource_url: 'https://www.securities.gov.on.ca/en/investors/mutual-funds',
        risk: 'Medium',
    },
    stock: {
        name: 'Stocks',
        full_name: 'Individual Stocks',
        icon: '🚀',
        color: '#f97316',
        annual_return: 0.10,
        description: 'Buying ownership in a single company. If the company does well, your stock goes up. High reward, but also the most volatile.',
        why_important: 'Can produce the highest returns over long periods. Best as part of a diversified portfolio, not your only investment.',
        best_for_ages: '18–50',
        contribution_limit_2024: null,
        resource_url: 'https://www.investopedia.com/terms/s/stock.asp',
        risk: 'High',
    },
};

export const TAX_BRACKETS = [
    [53891, 0.19], // 0–53,891
    [58523, 0.23], // 53,891–58,523
    [107785, 0.297], // 58,523–107,785
    [117045, 0.312], // 107,785–117,045
    [150000, 0.372], // 117,045–150,000
    [181440, 0.412], // 150,000–181,440
    [220000, 0.44], // 181,440–220,000
    [258482, 0.46], // 220,000–258,482
    [Infinity, 0.48], // 258,482+
];

export const BASIC_PERSONAL_AMOUNT = 16452 + 12989; // ≈ 29,441
export const BPA_CREDIT_RATE = 0.14; // federal lowest bracket

export const LIFE_EVENTS = [
    {
        id: 'car_repair',
        title: 'Car Repair',
        description: 'Your car broke down. Repair cost: $2,800.',
        cost: 2800,
        category: 'emergency',
        emoji: '🚗',
    },
    {
        id: 'medical_bill',
        title: 'Medical Bill',
        description: 'Unexpected dental visit. Bill: $1,200.',
        cost: 1200,
        category: 'emergency',
        emoji: '🏥',
    },
    {
        id: 'market_crash',
        title: 'Market Crash',
        description: 'The stock market dropped 30%. Stocks & ETFs plummet.',
        cost: 0,
        category: 'market',
        emoji: '📉',
        market_effect: -0.3,
    },
    {
        id: 'job_loss',
        title: 'Job Loss',
        description: 'You lost your job. No income for 3 months. Need $5,000 from savings.',
        cost: 5000,
        category: 'emergency',
        emoji: '💼',
    },
    {
        id: 'bonus',
        title: 'Year-End Bonus',
        description: 'Great year at work! You got a $3,000 bonus.',
        cost: -3000,
        category: 'windfall',
        emoji: '🎉',
    },
    {
        id: 'inheritance',
        title: 'Small Inheritance',
        description: 'A distant relative left you $5,000.',
        cost: -5000,
        category: 'windfall',
        emoji: '💌',
    },
    {
        id: 'wedding',
        title: "Friend's Wedding",
        description: 'Flights + outfit for a wedding: $1,500.',
        cost: 1500,
        category: 'social',
        emoji: '💒',
    },
    {
        id: 'vacation',
        title: 'Family Vacation',
        description: 'A family trip you can\'t say no to. Cost: $2,200.',
        cost: 2200,
        category: 'lifestyle',
        emoji: '✈️',
    },
    {
        id: 'rent_increase',
        title: 'Rent Increase',
        description: 'Landlord raised rent. Extra $200 this month.',
        cost: 200,
        category: 'lifestyle',
        emoji: '🏢',
    },
    {
        id: 'market_boom',
        title: 'Market Boom',
        description: 'Bull market! Stocks and ETFs surge 25%.',
        cost: 0,
        category: 'market',
        emoji: '📈',
        market_effect: 0.25,
    },
    {
        id: 'freelance_gig',
        title: 'Freelance Gig',
        description: 'A side project paid you $1,800.',
        cost: -1800,
        category: 'windfall',
        emoji: '💻',
    },
    {
        id: 'phone_repair',
        title: 'Phone Repair',
        description: 'Cracked screen repair: $400.',
        cost: 400,
        category: 'emergency',
        emoji: '📱',
    },
];

export const CHECKPOINTS = [
    { id: 'open_tfsa', title: 'Opened a TFSA', points: 100, emoji: '🛡️' },
    { id: 'open_rrsp', title: 'Opened an RRSP', points: 100, emoji: '🏖️' },
    { id: 'open_fhsa', title: 'Opened an FHSA', points: 100, emoji: '🏠' },
    { id: 'emergency_fund', title: 'Built 3-month emergency fund', points: 200, emoji: '🏦' },
    { id: 'survived_crash', title: 'Survived a market crash', points: 250, emoji: '💪' },
    { id: 'net_worth_10k', title: 'Net worth: $10,000', points: 200, emoji: '💰' },
    { id: 'net_worth_50k', title: 'Net worth: $50,000', points: 300, emoji: '💎' },
    { id: 'diversified', title: 'Invested in 3+ asset types', points: 200, emoji: '🎯' },
];

export const TIERS = [
    { name: 'Surviving', min_points: 0, emoji: '🌱' },
    { name: 'Budget Builder', min_points: 200, emoji: '🧱' },
    { name: 'Saver', min_points: 500, emoji: '🏦' },
    { name: 'Investor', min_points: 800, emoji: '📈' },
    { name: 'Wealth Grower', min_points: 1200, emoji: '🌳' },
    { name: 'Financial Architect', min_points: 1800, emoji: '🏛️' },
];