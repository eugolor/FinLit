from flask import Flask, request, jsonify, send_file
import os, random, math

app = Flask(__name__)

@app.route('/')
def serve_frontend():
    return send_file(os.path.join(os.path.dirname(__file__), 'index.html'))

@app.after_request
def cors(r):
    r.headers['Access-Control-Allow-Origin'] = '*'
    r.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    r.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return r

#  CANADIAN FINANCE DATA

CANADIAN_FUNDS = {
    'tfsa': {
        'name': 'TFSA', 'full_name': 'Tax-Free Savings Account', 'icon': '🛡️', 'color': '#22c55e',
        'annual_return': 0.07,
        'description': 'Any Canadian 18+ can open one. All growth and withdrawals are completely tax-free. You can withdraw anytime without penalty — the most flexible registered account in Canada.',
        'why_important': 'The single best place to put money you might need before retirement. Tax-free growth with zero strings attached.',
        'best_for_ages': '18–65', 'contribution_limit_2024': 7000,
        'resource_url': 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tfsa.html', 'risk': 'Low–Medium'
    },
    'rrsp': {
        'name': 'RRSP', 'full_name': 'Registered Retirement Savings Plan', 'icon': '🏖️', 'color': '#f59e0b',
        'annual_return': 0.07,
        'description': 'Contributions are tax-deductible — you get money back on your tax return. Growth is tax-sheltered until you withdraw in retirement, when it\'s taxed as income.',
        'why_important': 'Best for people in higher tax brackets now who expect a lower bracket in retirement. A powerful way to reduce your tax bill today.',
        'best_for_ages': '25–65', 'contribution_limit_2024': 31560,
        'resource_url': 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/rrsp.html', 'risk': 'Low–Medium'
    },
    'fhsa': {
        'name': 'FHSA', 'full_name': 'First Home Savings Account', 'icon': '🏠', 'color': '#3b82f6',
        'annual_return': 0.06,
        'description': 'Launched 2023 for first-time buyers. Contributions are tax-deductible AND withdrawals for a qualifying home purchase are tax-free. Best of both worlds.',
        'why_important': 'If you\'re a renter dreaming of a first home, this is literally free money from the government.',
        'best_for_ages': '18–40', 'contribution_limit_2024': 8000,
        'resource_url': 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/fhsa.html', 'risk': 'Low–Medium'
    },
    'gic': {
        'name': 'GIC', 'full_name': 'Guaranteed Investment Certificate', 'icon': '🔒', 'color': '#14b8a6',
        'annual_return': 0.045,
        'description': 'You lend money to a bank for a fixed term and they pay a guaranteed rate. Zero risk of losing your principal.',
        'why_important': 'Perfect for money you can\'t afford to lose. A safe parking spot while you figure out your next move.',
        'best_for_ages': '18–70', 'contribution_limit_2024': None,
        'resource_url': 'https://www.canada.ca/en/financial-consumer-agency/services/saving-investing/gics.html', 'risk': 'Very Low'
    },
    'resp': {
        'name': 'RESP', 'full_name': 'Registered Education Savings Plan', 'icon': '🎓', 'color': '#6366f1',
        'annual_return': 0.06,
        'description': 'Savings for a child\'s education. The government adds a grant of up to 20% on the first $2,500/year (the CESG). Growth is tax-sheltered.',
        'why_important': 'Free money from the government for your kid\'s education. The CESG alone is worth thousands over 18 years.',
        'best_for_ages': 'Parents of children 0–17', 'contribution_limit_2024': 2500,
        'resource_url': 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/resp.html', 'risk': 'Low–Medium'
    }
}

#  2024 Canadian Federal + Ontario combined brackets 
# 2026 Federal + Ontario combined marginal brackets (approx)
TAX_BRACKETS = [
    (53891, 0.19),      # 0–53,891
    (58523, 0.23),      # 53,891–58,523
    (107785, 0.297),    # 58,523–107,785
    (117045, 0.312),    # 107,785–117,045
    (150000, 0.372),    # 117,045–150,000
    (181440, 0.412),    # 150,000–181,440
    (220000, 0.44),     # 181,440–220,000
    (258482, 0.46),     # 220,000–258,482
    (float("inf"), 0.48) # 258,482+
]

# 2026 combined Basic Personal Amount (federal + Ontario)
BASIC_PERSONAL_AMOUNT = 16452 + 12989  # ≈ 29,441
BPA_CREDIT_RATE = 0.14  # federal lowest bracket (simplified)


def calculate_tax(income):
    tax, prev = 0.0, 0.0

    for ceiling, rate in TAX_BRACKETS:
        if income <= prev:
            break
        taxable = min(income, ceiling) - prev
        tax += taxable * rate
        prev = ceiling

    # Basic personal amount credit
    tax -= BASIC_PERSONAL_AMOUNT * BPA_CREDIT_RATE
    tax = max(0, tax)

    eff = tax / income if income > 0 else 0
    return {
        "gross_income": round(income, 2),
        "total_tax": round(tax, 2),
        "effective_rate": round(eff * 100, 2),
        "take_home": round(income - tax, 2)
    }

#  Allocation by age 
def get_allocation_by_age(age, income, goals):
    if age < 18:
        base = {'tfsa':60,'gic':40}
    elif age < 30:
        base = ({'tfsa':35,'fhsa':65} if 'home' in goals
                else {'tfsa':60,'rrsp':40})
    elif age < 45:
        base = ({'tfsa':40,'rrsp':30,'fhsa':30} if 'home' in goals
                else {'tfsa':50,'rrsp':50})
    elif age < 60:
        base = {'tfsa':40,'rrsp':40,'gic':20}
    else:
        base = {'tfsa':35,'rrsp':25,'gic':40}
    if income > 100000 and 'rrsp' in base:
        base['rrsp'] = min(base.get('rrsp',0)+10, 50)
        if 'tfsa' in base: base['tfsa'] = max(base['tfsa']-10, 15)
    total = sum(base.values())
    base = {k: round(v/total*100) for k,v in base.items()}
    diff = 100 - sum(base.values())
    base[list(base.keys())[0]] += diff
    tax_info = calculate_tax(income)
    return {'allocation': base, 'monthly_invest_recommended': round(tax_info['take_home']*0.15/12,2), 'tax_info': tax_info}

# ─── Life Events ───
LIFE_EVENTS = [
    {'id':'car_repair','title':'Car Repair','description':'Your car broke down. Repair cost: $2,800.','cost':2800,'category':'emergency','emoji':'🚗'},
    {'id':'medical_bill','title':'Medical Bill','description':'Unexpected dental visit. Bill: $1,200.','cost':1200,'category':'emergency','emoji':'🏥'},
    {'id':'market_crash','title':'Market Crash','description':'The stock market dropped 30%. Stocks & ETFs plummet.','cost':0,'category':'market','emoji':'📉','market_effect':-0.30},
    {'id':'job_loss','title':'Job Loss','description':'You lost your job. No income for 3 months. Need $5,000 from savings.','cost':5000,'category':'emergency','emoji':'💼'},
    {'id':'bonus','title':'Year-End Bonus','description':'Great year at work! You got a $3,000 bonus.','cost':-3000,'category':'windfall','emoji':'🎉'},
    {'id':'inheritance','title':'Small Inheritance','description':'A distant relative left you $5,000.','cost':-5000,'category':'windfall','emoji':'💌'},
    {'id':'wedding','title':"Friend's Wedding",'description':'Flights + outfit for a wedding: $1,500.','cost':1500,'category':'social','emoji':'💒'},
    {'id':'vacation','title':'Family Vacation','description':'A family trip you can\'t say no to. Cost: $2,200.','cost':2200,'category':'lifestyle','emoji':'✈️'},
    {'id':'rent_increase','title':'Rent Increase','description':'Landlord raised rent. Extra $200 this month.','cost':200,'category':'lifestyle','emoji':'🏢'},
    {'id':'market_boom','title':'Market Boom','description':'Bull market! Stocks and ETFs surge 25%.','cost':0,'category':'market','emoji':'📈','market_effect':0.25},
    {'id':'freelance_gig','title':'Freelance Gig','description':'A side project paid you $1,800.','cost':-1800,'category':'windfall','emoji':'💻'},
    {'id':'phone_repair','title':'Phone Repair','description':'Cracked screen repair: $400.','cost':400,'category':'emergency','emoji':'📱'},
]

CHECKPOINTS = [
    {'id':'open_tfsa','title':'Opened a TFSA','points':100,'emoji':'🛡️'},
    {'id':'open_rrsp','title':'Opened an RRSP','points':100,'emoji':'🏖️'},
    {'id':'open_fhsa','title':'Opened an FHSA','points':100,'emoji':'🏠'},
    {'id':'emergency_fund','title':'Built 3-month emergency fund','points':200,'emoji':'🏦'},
    {'id':'survived_crash','title':'Survived a market crash','points':250,'emoji':'💪'},
    {'id':'net_worth_10k','title':'Net worth: $10,000','points':200,'emoji':'💰'},
    {'id':'net_worth_50k','title':'Net worth: $50,000','points':300,'emoji':'💎'},
    {'id':'diversified','title':'Invested in 3+ asset types','points':200,'emoji':'🎯'},
]

TIERS = [
    {'name':'Surviving','min_points':0,'emoji':'🌱'},
    {'name':'Budget Builder','min_points':200,'emoji':'🧱'},
    {'name':'Saver','min_points':500,'emoji':'🏦'},
    {'name':'Investor','min_points':800,'emoji':'📈'},
    {'name':'Wealth Grower','min_points':1200,'emoji':'🌳'},
    {'name':'Financial Architect','min_points':1800,'emoji':'🏛️'},
]

def get_tier(points):
    tier = TIERS[0]
    for t in TIERS:
        if points >= t['min_points']: tier = t
    return tier

# Donation credit calculation (federal + Ontario)
# NOTE: federal/prov rates are implemented as common/current rules:
# - Federal: 15% on first $200, higher rate on amount over $200 (29% normally, 33% for top bracket)
# - Ontario: 5.05% on first $200, higher provincial rate on remainder (11.16%)
# These constants should be updated if/when official 2026 rates differ; code handles the top federal
# rate for very high incomes by bumping the federal over-200 rate to 33% when income exceeds 235675.
FED_FIRST_200 = 0.15
FED_OVER_200 = 0.29
FED_TOP_RATE_THRESHOLD = 235675
FED_TOP_RATE = 0.33
ONT_FIRST_200 = 0.0505
ONT_OVER_200 = 0.1116

def calculate_donation_credit(donation_amount, taxable_income):
    """Return donation tax credit breakdown (federal, provincial, total) for Ontario.

    This approximates the standard Canadian donation credit approach:
    - 15% federal on first $200, higher federal rate on amount over $200 (29% or 33% if top bracket)
    - 5.05% provincial on first $200, higher Ontario rate on remainder (11.16%)

    The function returns a dict with float values (rounded to 2 decimals).
    """
    amt = float(max(0, donation_amount))
    fed_over = FED_OVER_200 if taxable_income <= FED_TOP_RATE_THRESHOLD else FED_TOP_RATE

    if amt <= 200:
        fed = amt * FED_FIRST_200
        ont = amt * ONT_FIRST_200
    else:
        fed = 200 * FED_FIRST_200 + (amt - 200) * fed_over
        ont = 200 * ONT_FIRST_200 + (amt - 200) * ONT_OVER_200

    total = fed + ont
    return {'donation': round(amt,2), 'federal_credit': round(fed,2), 'provincial_credit': round(ont,2), 'total_credit': round(total,2)}


@app.route('/api/donate', methods=['POST','OPTIONS'])
def donate_ep():
    if request.method == 'OPTIONS':
        return '', 200
    d = request.get_json() or {}
    amount = float(d.get('amount', 0))
    income = float(d.get('income', 0))
    cash = float(d.get('cash', 0))

    if amount <= 0:
        return jsonify({'error': 'Invalid donation amount'}), 400
    if amount > cash:
        return jsonify({'error': 'Not enough cash to donate'}), 400

    # compute tax credit (federal + provincial)
    credit = calculate_donation_credit(amount, income)

    # realistic social good score increment scales with donation relative to income
    # Points = round((donation / income) * 1000) — donating 1% of income ≈ 10 points (income=100k)
    pts = 0
    if income > 0:
        pts = int(round((amount / income) * 1000))
    else:
        pts = int(round(amount / 100))

    new_cash = round(cash - amount, 2)

    return jsonify({'donation': round(amount,2), 'cash_after': new_cash,
                    'tax_credit': credit, 'social_points': pts})

#  API ENDPOINTS

@app.route('/api/funds')
def get_funds():
    return jsonify(CANADIAN_FUNDS)

@app.route('/api/tax', methods=['POST','OPTIONS'])
def tax_ep():
    if request.method=='OPTIONS': return '',200
    return jsonify(calculate_tax(float(request.get_json().get('income',60000))))

@app.route('/api/profile', methods=['POST','OPTIONS'])
def profile_ep():
    if request.method=='OPTIONS': return '',200
    d = request.get_json()
    r = get_allocation_by_age(int(d.get('age',25)), float(d.get('income',60000)), d.get('goals',[]))
    r.update({'age':int(d.get('age',25)),'income':float(d.get('income',60000)),'goals':d.get('goals',[])})
    return jsonify(r)

@app.route('/api/simulate-year', methods=['POST','OPTIONS'])
def simulate_year():
    if request.method=='OPTIONS': return '',200
    d = request.get_json()
    portfolio = d.get('portfolio',{})
    cash = float(d.get('cash',0))
    age = int(d.get('age',25))
    income = float(d.get('income',60000))
    year = int(d.get('year',2025))
    monthly = float(d.get('monthly_contribution',500))
    trigger = d.get('trigger_event', None)
    inflation = 0.025

    # Life event (check first before processing)
    preview = bool(d.get('preview', False))
    force_no_event = bool(d.get('force_no_event', False))

    event = None
    if trigger:
        event = next((e for e in LIFE_EVENTS if e['id']==trigger), None)
    elif not force_no_event and random.random() < 0.25:
        event = random.choice(LIFE_EVENTS)

    # If preview mode and event exists, return event without processing year advancement
    if preview and event:
        return jsonify({'preview': True, 'portfolio': portfolio, 'cash': cash, 'age': age, 'year': year,
                        'net_worth': cash + sum(portfolio.values()), 'event': event, 'earned_checkpoints': [], 'inflation_rate': inflation})

    # Now process the actual year advancement
    cash += monthly * 12  # annual contributions land in cash

    # Grow portfolio
    new_p = {}
    for asset, bal in portfolio.items():
        rate = CANADIAN_FUNDS.get(asset,{}).get('annual_return',0.05)
        new_p[asset] = round(bal * (1 + rate), 2)

    event_applied = None
    # Process the event if it exists
    if event:
        event_applied = dict(event)
        if event.get('market_effect'):
            eff = event['market_effect']
            for a in ['stock','etf','mutual_fund']:
                if a in new_p: new_p[a] = round(new_p[a]*(1+eff),2)
        if event['cost'] > 0:
            rem = event['cost']
            if cash >= rem: cash -= rem; rem = 0
            else: rem -= cash; cash = 0
            for a in ['gic','tfsa','etf','mutual_fund','stock','rrsp','fhsa','resp']:
                if a in new_p and rem > 0:
                    w = min(new_p[a], rem); new_p[a] -= w; rem -= w
            event_applied['actual_cost'] = event['cost']
        elif event['cost'] < 0:
            cash += abs(event['cost'])
            event_applied['actual_gain'] = abs(event['cost'])


    net_worth = cash + sum(new_p.values())

    # Checkpoints
    cp = []
    if new_p.get('tfsa',0)>0: cp.append('open_tfsa')
    if new_p.get('rrsp',0)>0: cp.append('open_rrsp')
    if new_p.get('fhsa',0)>0: cp.append('open_fhsa')
    if cash >= monthly*3: cp.append('emergency_fund')
    if event and event.get('market_effect',0)<0: cp.append('survived_crash')
    if net_worth>=10000: cp.append('net_worth_10k')
    if net_worth>=50000: cp.append('net_worth_50k')
    if len([a for a in new_p if new_p[a]>0])>=3: cp.append('diversified')

    # If preview, include a flag and do not mark checkpoints that depend on event outcomes
    if preview:
        return jsonify({'preview': True, 'portfolio': new_p, 'cash': round(cash,2), 'age': age+1, 'year': year+1,
                        'net_worth': round(net_worth,2), 'event': event_applied, 'earned_checkpoints': cp, 'inflation_rate': inflation})

    return jsonify({'portfolio':new_p,'cash':round(cash,2),'age':age+1,'year':year+1,
                    'net_worth':round(net_worth,2),'event':event_applied,
                    'earned_checkpoints':cp,'inflation_rate':inflation})

@app.route('/api/life-events')
def get_life_events():
    return jsonify(LIFE_EVENTS)

@app.route('/api/checkpoints')
def get_checkpoints():
    return jsonify({'checkpoints':CHECKPOINTS,'tiers':TIERS})

@app.route('/api/summary', methods=['POST','OPTIONS'])
def game_summary():
    if request.method=='OPTIONS': return '',200
    d = request.get_json()
    start_age = int(d.get('starting_age',25))
    end_age = int(d.get('ending_age',65))
    income = float(d.get('starting_income',60000))
    fp = d.get('final_portfolio',{})
    fc = float(d.get('final_cash',0))
    cp_earned = d.get('checkpoints_earned',[])
    total_pts = int(d.get('total_points',0))

    nw = fc + sum(fp.values())
    years = end_age - start_age
    total_income = income * years

    gic_pct = fp.get('gic',0)/max(nw,1)*100
    cash_pct = fc/max(nw,1)*100

    if gic_pct > 40 or cash_pct > 40:
        personality, pdesc = 'Ultra Conservative', 'You played it safe. Secure, but inflation may have quietly eroded your wealth.'
    else:
        personality, pdesc = 'Balanced Strategist', 'You diversified well — steady, resilient, and smart. Most advisors would approve.'

    literacy = min(len(set(cp_earned))*10, 50)
    literacy += min(len([a for a in fp if fp[a]>0])*8, 24)
    literacy += 10 if nw > total_income*0.3 else 5
    literacy += 10 if 'survived_crash' in cp_earned else 0
    literacy = min(literacy, 100)

    feedback = []
    if nw > 100000: feedback.append(f"🎉 You built a net worth of ${nw:,.0f} — impressive over {years} years.")
    elif nw > 50000: feedback.append(f"📈 Net worth of ${nw:,.0f} shows solid progress.")
    else: feedback.append(f"📉 Final net worth: ${nw:,.0f}. Small consistent investments compound — keep going.")
    if 'diversified' in cp_earned: feedback.append("✅ You diversified — one of the smartest investing moves.")
    else: feedback.append("💡 Next time, spread money across different asset types to reduce risk.")
    if 'survived_crash' in cp_earned: feedback.append("💪 You kept cool during a market crash. That's where most people lose big.")
    emg_months = fc/(income/12) if income>0 else 0
    if emg_months>=3: feedback.append(f"🏦 {emg_months:.1f} months of cash reserves — a solid emergency fund.")
    else: feedback.append("⚠️ Cash reserves are thin. Aim for 3–6 months of expenses in accessible savings.")

    return jsonify({'net_worth':round(nw,2),'personality':personality,'personality_desc':pdesc,
                    'literacy_score':literacy,'tier':get_tier(total_pts),'total_points':total_pts,
                    'feedback':feedback,'years_played':years,'events_faced_count':len(d.get('events_faced',[]))})

@app.route('/health')
def health():
    return jsonify({'status':'healthy'})

if __name__ == '__main__':
    print('\n' + '='*52)
    print('  FinLit is starting...')
    print('='*52)
    print('\n  Open this URL in your browser:\n')
    print('      http://localhost:5000\n')
    print('  That is it. Nothing else to do.')
    print('='*52 + '\n')
    app.run(debug=True, port=5000)