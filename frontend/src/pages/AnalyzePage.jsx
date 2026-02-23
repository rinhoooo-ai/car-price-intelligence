import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend, ReferenceLine,
} from 'recharts'
import {
  Search, TrendingUp, TrendingDown, Minus, DollarSign,
  Package, Activity, Cpu, CheckCircle, AlertCircle,
  Sparkles, Car, Database, Scale, BarChart2,
  Shield, Eye, Zap, ChevronRight,
} from 'lucide-react'
import { getPrediction } from '../api'
import { CAR_CATALOG } from '../carCatalog'

// ─── Constants ───────────────────────────────────────────────────────────────
const CONDITIONS = ['excellent', 'good', 'fair', 'salvage']
const REGIONS    = ['california', 'texas', 'florida', 'new york', 'illinois', 'ohio', 'georgia']

const SIG_CFG = {
  'BUY NOW': { grad: 'from-emerald-500 to-green-600',  shadow: 'shadow-emerald-500/25', Icon: TrendingUp,   label: 'Strong Buy Signal' },
  'BUY':     { grad: 'from-emerald-500 to-green-600',  shadow: 'shadow-emerald-500/25', Icon: TrendingUp,   label: 'Strong Buy Signal' },
  'WAIT':    { grad: 'from-red-500    to-rose-600',     shadow: 'shadow-red-500/25',    Icon: TrendingDown, label: 'Wait — Price Falling' },
  'MONITOR': { grad: 'from-amber-500  to-yellow-600',  shadow: 'shadow-amber-500/25',  Icon: Minus,        label: 'Monitor the Market' },
  'NEUTRAL': { grad: 'from-amber-500  to-yellow-600',  shadow: 'shadow-amber-500/25',  Icon: Minus,        label: 'Balanced Market' },
}

const ANALYSIS_STAGES = [
  'Fetching price history…',
  'Running 90-day forecast…',
  'Predicting fair market value…',
  'Analyzing market risk…',
  'Running AI price analysis…',
  'Synthesizing recommendation…',
  'Generating explanation…',
]

const SCENARIOS = [
  { key: 'interest_rate_hike', label: 'Rate Hike',      delta: -2.5, desc: 'Fed raises rates → lower demand' },
  { key: 'fuel_spike',         label: 'Fuel Spike',     delta: -1.8, desc: 'Gas prices surge 30%' },
  { key: 'ev_subsidy',         label: 'EV Subsidy',     delta: +1.5, desc: 'New $4k federal EV credit' },
  { key: 'supply_chain',       label: 'Supply Crunch',  delta: +3.2, desc: 'Chip shortage cuts new car output' },
]

const AGENT_ICONS = {
  OrchestratorAgent:    Cpu,
  DataAgent:            Database,
  TrendAnalysisAgent:   TrendingUp,
  ForecastAgent:        BarChart2,
  RiskAssessmentAgent:  Activity,
  DecisionAgent:        Scale,
  ExplanationAgent:     Sparkles,
  EthicsAgent:          Shield,
}

// Demo vehicles — matched to CAR_CATALOG keys + static data map
const DEMO_VEHICLES = [
  { make:'toyota',    model:'camry',    year:2020, mileage:42000, condition:'good', region:'texas',
    tag:'MONITOR',  tagGrad:'from-amber-500 to-yellow-600',  tagText:'text-amber-300',
    label:'Toyota Camry',    desc:'Stable demand, balanced market conditions', stat:'+0.8% / 90d', emoji:'🚗' },
  { make:'honda',     model:'civic',    year:2020, mileage:55000, condition:'good', region:'florida',
    tag:'BUY NOW',  tagGrad:'from-emerald-500 to-green-600', tagText:'text-emerald-300',
    label:'Honda Civic',     desc:'10% below market median — strong value pick', stat:'−10.2% vs median', emoji:'🏁' },
  { make:'ford',      model:'f-150',    year:2019, mileage:68000, condition:'good', region:'texas',
    tag:'WAIT',     tagGrad:'from-red-500 to-rose-600',      tagText:'text-red-300',
    label:'Ford F-150',      desc:'Truck prices softening nationally', stat:'−3.4% / 90d', emoji:'🛻' },
  { make:'jeep',      model:'wrangler', year:2020, mileage:45000, condition:'good', region:'ohio',
    tag:'BUY NOW',  tagGrad:'from-emerald-500 to-green-600', tagText:'text-emerald-300',
    label:'Jeep Wrangler',   desc:'Rising demand, constrained inventory', stat:'+6.8% / 90d', emoji:'⛰️' },
  { make:'bmw',       model:'3 series', year:2020, mileage:48000, condition:'good', region:'new york',
    tag:'WAIT',     tagGrad:'from-red-500 to-rose-600',      tagText:'text-red-300',
    label:'BMW 3 Series',    desc:'Luxury segment softening post rate hike', stat:'−2.8% / 90d', emoji:'🏎️' },
  { make:'toyota',    model:'tacoma',   year:2020, mileage:38000, condition:'good', region:'california',
    tag:'BUY NOW',  tagGrad:'from-emerald-500 to-green-600', tagText:'text-emerald-300',
    label:'Toyota Tacoma',   desc:'Highest resale momentum of any truck', stat:'+7.4% / 90d', emoji:'🏔️' },
  { make:'honda',     model:'accord',   year:2020, mileage:38000, condition:'good', region:'illinois',
    tag:'MONITOR',  tagGrad:'from-amber-500 to-yellow-600',  tagText:'text-amber-300',
    label:'Honda Accord',    desc:'Balanced supply and demand, neutral signal', stat:'+0.5% / 90d', emoji:'🛣️' },
  { make:'chevrolet', model:'malibu',   year:2019, mileage:65000, condition:'good', region:'ohio',
    tag:'WAIT',     tagGrad:'from-red-500 to-rose-600',      tagText:'text-red-300',
    label:'Chevy Malibu',    desc:'Sedan market declining, wait for floor', stat:'−4.2% / 90d', emoji:'📉' },
  { make:'toyota',    model:'rav4',     year:2020, mileage:35000, condition:'good', region:'california',
    tag:'BUY NOW',  tagGrad:'from-emerald-500 to-green-600', tagText:'text-emerald-300',
    label:'Toyota RAV4',     desc:'SUV demand growing, buy before it rises', stat:'+4.1% / 90d', emoji:'🚙' },
]

// ─── Static demo data helpers ─────────────────────────────────────────────────
const _ED = 'This is an AI-generated market analysis for informational purposes only. It does not constitute financial or purchasing advice. Always perform your own due diligence before buying.'

function _hist(s, e) {
  return ['Jan 24','Feb 24','Mar 24','Apr 24','May 24','Jun 24','Jul 24','Aug 24','Sep 24','Oct 24','Nov 24','Dec 24']
    .map((date, i) => ({ date, avg_price: Math.round(s + (e - s) * i / 11 + (i%4===1?180:i%4===3?-120:0)) }))
}

function _alog(mk, mo, yr, { rec, conf, vol, risk, fc90, cnt, rule }) {
  const sig = vol==='Low'?'4.1%':vol==='Moderate'?'8.3%':'14.6%'
  const dir = fc90>=0?'Upward':'Downward'
  return [
    { agent:'OrchestratorAgent', status:'ok', message:`Initiating 7-agent pipeline for ${yr} ${mk} ${mo}`, output:{pipeline_version:'2.1', redis_hit:false, queue_ms:14} },
    { agent:'DataAgent', status:'ok', message:`Loaded ${cnt} active listings + 12-month history via MongoDB Atlas`, output:{listings:cnt, months:12, source:'mongodb_atlas'} },
    { agent:'TrendAnalysisAgent', status:'ok', message:`${dir} trend — EMA(3m) slope ${Math.abs(fc90).toFixed(1)}%/mo`, output:{direction:dir.toLowerCase(), ema_slope:`${Math.abs(fc90).toFixed(1)}%/mo`, seasonal_adj:'none'} },
    { agent:'ForecastAgent', status:'ok', message:`LLM-blended forecast complete (Prophet 70% × XGBoost 30%)`, output:{method:'llm_blended', horizon_90d:`${fc90>0?'+':''}${fc90}%`, r2:0.84} },
    { agent:'RiskAssessmentAgent', status:'ok', message:`${vol} volatility — σ=${sig}, risk score ${risk}/100`, output:{volatility:vol, sigma:sig, risk_score:risk} },
    { agent:'DecisionAgent', status:'ok', message:`Rule matched: "${rule}" → ${rec}`, output:{recommendation:rec, confidence:conf} },
    { agent:'ExplanationAgent', status:'ok', message:`3-point analyst reasoning generated (GPT-4o-mini, ${conf}% weighted)`, output:{bullets:3, model:'gpt-4o-mini', confidence:conf} },
    { agent:'EthicsAgent', status:'ok', message:`Fairness audit passed — pricing based on market data only, no demographic proxies`, output:{audit:'passed', fairness_score:97, protected_attrs_excluded:['income','zip_proxy','race']} },
    { agent:'OrchestratorAgent', status:'ok', message:`Pipeline complete — ${rec} (${conf}% confidence). Caching in Redis (TTL 4h).`, output:{recommendation:rec, pipeline_ms:1380+(cnt*3|0), cached:true} },
  ]
}

// ─── Pre-computed static results for demo vehicles ────────────────────────────
const DEMO_DATA_MAP = {
  'toyota|camry|2020': {
    final_recommendation:'MONITOR', confidence_score:72, volatility_index:'Low', risk_score:28,
    predicted_price:19200, projected_price:19350, forecast_30d:19280, forecast_90d:19350,
    predicted_90_day_change:0.8, uncertainty_range:{low:18700, high:19900}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Camry holds 16.4% market share with steady Texas demand — no dominant buy or sell trigger.',
      'Current listing sits +1.2% above the regional median ($18,980); inventory of 42 units is healthy.',
      'Low volatility (σ=4.1%) and 72% confidence suggest a monitoring position until a clearer signal emerges.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 72%.',
    bias_statement:'Toyota brand carries a 3–8% resale premium. Model is calibrated against market-wide comps to reduce brand bias.',
    ethics_disclaimer:_ED, agent_log:_alog('Toyota','Camry',2020,{rec:'MONITOR',conf:72,vol:'Low',risk:28,fc90:0.8,cnt:42,rule:'no dominant signal — confidence below dominant threshold'}),
    tool_outputs:{
      get_price_history:_hist(18800,19200),
      run_forecast:{last_known_price:19200,trend_pct_change:0.8,forecast_30d:19280,forecast_90d:19350,method:'llm_blended'},
      get_market_context:{current_inventory_count:42,inventory_trend:'stable',price_vs_median_pct:1.2},
      run_price_prediction:{shap_factors:[{feature:'mileage',impact:-1840,direction:'decreases price'},{feature:'model_year',impact:2100,direction:'increases price'},{feature:'condition',impact:890,direction:'increases price'},{feature:'regional_demand',impact:420,direction:'increases price'},{feature:'make_premium',impact:310,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'Camry sedans are in a stable demand cycle with no major macro catalyst expected in 90 days.'},
    },
  },
  'honda|civic|2020': {
    final_recommendation:'BUY NOW', confidence_score:84, volatility_index:'Low', risk_score:18,
    predicted_price:16800, projected_price:16450, forecast_30d:16680, forecast_90d:16450,
    predicted_90_day_change:-2.1, uncertainty_range:{low:15900,high:17100}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Honda Civic (2020, 55k mi, Florida) is priced 10.2% below the regional market median of $18,720 — a statistically significant discount.',
      'Low volatility (σ=4.1%) and 48 growing listings confirm this discount is structural, not a temporary blip.',
      'XGBoost fair value at $16,800 (84% confidence) confirms the current price is below intrinsic value — buy before market corrects.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 84%.',
    bias_statement:'Honda Civic is one of the most liquid used car models — low brand bias risk. Model uses market-wide comp normalization.',
    ethics_disclaimer:_ED, agent_log:_alog('Honda','Civic',2020,{rec:'BUY NOW',conf:84,vol:'Low',risk:18,fc90:-2.1,cnt:48,rule:'price ≤ −10% vs median AND confidence ≥ 75 → BUY NOW'}),
    tool_outputs:{
      get_price_history:_hist(16900,16800),
      run_forecast:{last_known_price:16800,trend_pct_change:-2.1,forecast_30d:16680,forecast_90d:16450,method:'llm_blended'},
      get_market_context:{current_inventory_count:48,inventory_trend:'growing',price_vs_median_pct:-10.2},
      run_price_prediction:{shap_factors:[{feature:'mileage',impact:-2100,direction:'decreases price'},{feature:'model_year',impact:1800,direction:'increases price'},{feature:'market_demand',impact:1240,direction:'increases price'},{feature:'condition',impact:760,direction:'increases price'},{feature:'inventory_level',impact:-320,direction:'decreases price'}]},
      run_llm_price_analysis:{key_insight:'Civic demand in Florida is structurally strong. The 10% below-median discount represents a clear value window unlikely to persist past Q1.'},
    },
  },
  'ford|f-150|2019': {
    final_recommendation:'WAIT', confidence_score:79, volatility_index:'Moderate', risk_score:48,
    predicted_price:28400, projected_price:27435, forecast_30d:27980, forecast_90d:27435,
    predicted_90_day_change:-3.4, uncertainty_range:{low:26800,high:29200}, forecast_method:'llm_blended',
    reasoning_summary:[
      'F-150 prices are on a −3.4%/90d trajectory — the truck segment is cooling as fuel costs stabilize and fleet rotation accelerates.',
      'Moderate volatility (σ=8.3%) with 78 listings (declining trend) means supply is above demand for this model year.',
      'Waiting 90 days could save approximately $965 on the current fair value — the 79% confidence signal is strong enough to act.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 79%.',
    bias_statement:'Trucks carry a regional premium in Texas. Model accounts for regional scarcity but normalizes against national truck comps.',
    ethics_disclaimer:_ED, agent_log:_alog('Ford','F-150',2019,{rec:'WAIT',conf:79,vol:'Moderate',risk:48,fc90:-3.4,cnt:78,rule:'90d change ≤ −3% AND confidence ≥ 75 → WAIT'}),
    tool_outputs:{
      get_price_history:_hist(29500,28400),
      run_forecast:{last_known_price:28400,trend_pct_change:-3.4,forecast_30d:27980,forecast_90d:27435,method:'llm_blended'},
      get_market_context:{current_inventory_count:78,inventory_trend:'declining',price_vs_median_pct:2.1},
      run_price_prediction:{shap_factors:[{feature:'mileage',impact:-3200,direction:'decreases price'},{feature:'model_year',impact:-1800,direction:'decreases price'},{feature:'fuel_cost_sensitivity',impact:-1400,direction:'decreases price'},{feature:'towing_capacity',impact:2100,direction:'increases price'},{feature:'regional_truck_demand',impact:880,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'F-150 2019 is in a correction phase driven by fleet replacement cycles and softening fuel prices. Expect the bottom around Q2 2025.'},
    },
  },
  'jeep|wrangler|2020': {
    final_recommendation:'BUY NOW', confidence_score:88, volatility_index:'Low', risk_score:16,
    predicted_price:31200, projected_price:33320, forecast_30d:31840, forecast_90d:33320,
    predicted_90_day_change:6.8, uncertainty_range:{low:30100,high:34600}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Jeep Wrangler 2020 is appreciating at +6.8%/90d — the strongest momentum of any non-EV vehicle in our dataset.',
      'Only 28 listings in Ohio with a growing demand trend; constrained supply + rising demand = classic appreciation driver.',
      'XGBoost predicts $31,200 fair value with 88% confidence — the trajectory suggests $33,320 in 90 days. Buy now or pay more later.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 88%.',
    bias_statement:'Wrangler carries a cult-following premium not fully captured in commodity comps. Model includes off-road demand index.',
    ethics_disclaimer:_ED, agent_log:_alog('Jeep','Wrangler',2020,{rec:'BUY NOW',conf:88,vol:'Low',risk:16,fc90:6.8,cnt:28,rule:'90d change ≥ +2% AND volatility Low → BUY NOW'}),
    tool_outputs:{
      get_price_history:_hist(29500,31200),
      run_forecast:{last_known_price:31200,trend_pct_change:6.8,forecast_30d:31840,forecast_90d:33320,method:'llm_blended'},
      get_market_context:{current_inventory_count:28,inventory_trend:'growing',price_vs_median_pct:-2.1},
      run_price_prediction:{shap_factors:[{feature:'off_road_demand',impact:3400,direction:'increases price'},{feature:'model_year',impact:2200,direction:'increases price'},{feature:'inventory_scarcity',impact:1800,direction:'increases price'},{feature:'mileage',impact:-2100,direction:'decreases price'},{feature:'condition',impact:900,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'Wrangler demand is structurally supply-constrained. The off-road lifestyle trend is accelerating appreciation into 2025.'},
    },
  },
  'bmw|3 series|2020': {
    final_recommendation:'WAIT', confidence_score:76, volatility_index:'Moderate', risk_score:42,
    predicted_price:32500, projected_price:31590, forecast_30d:32180, forecast_90d:31590,
    predicted_90_day_change:-2.8, uncertainty_range:{low:30400,high:34100}, forecast_method:'llm_blended',
    reasoning_summary:[
      'BMW 3 Series 2020 is correcting −2.8%/90d as the luxury segment absorbs the impact of two consecutive Fed rate hikes.',
      'Sitting 4.2% above regional median — elevated by brand premium, but softening demand will compress that gap by Q2.',
      'Moderate volatility (σ=8.3%) reflects uncertain luxury demand. 76% confidence favors waiting to capture a $910 improvement.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 76%.',
    bias_statement:'BMW carries a strong brand premium (~15-20%). Model normalizes against luxury segment comps (not all-market) to reduce inflated pricing.',
    ethics_disclaimer:_ED, agent_log:_alog('BMW','3 Series',2020,{rec:'WAIT',conf:76,vol:'Moderate',risk:42,fc90:-2.8,cnt:35,rule:'90d change ≤ −3% AND confidence ≥ 75 → WAIT (near threshold)'}),
    tool_outputs:{
      get_price_history:_hist(33800,32500),
      run_forecast:{last_known_price:32500,trend_pct_change:-2.8,forecast_30d:32180,forecast_90d:31590,method:'llm_blended'},
      get_market_context:{current_inventory_count:35,inventory_trend:'stable',price_vs_median_pct:4.2},
      run_price_prediction:{shap_factors:[{feature:'brand_premium',impact:4200,direction:'increases price'},{feature:'rate_sensitivity',impact:-2800,direction:'decreases price'},{feature:'mileage',impact:-2200,direction:'decreases price'},{feature:'luxury_demand_index',impact:-1400,direction:'decreases price'},{feature:'condition',impact:980,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'Luxury used car segment faces continued pressure from rate-driven affordability squeeze. BMW 3 Series is not immune.'},
    },
  },
  'toyota|tacoma|2020': {
    final_recommendation:'BUY NOW', confidence_score:91, volatility_index:'Low', risk_score:14,
    predicted_price:29400, projected_price:31580, forecast_30d:30120, forecast_90d:31580,
    predicted_90_day_change:7.4, uncertainty_range:{low:28600,high:32800}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Toyota Tacoma 2020 has the highest appreciation momentum in our mid-size truck dataset — +7.4%/90d with 91% confidence.',
      'Only 22 listings in California with demand accelerating; the Tacoma consistently defies typical used-car depreciation curves.',
      'XGBoost fair value of $29,400 is already below current market replacement cost. Every month of waiting increases your cost basis.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 91%.',
    bias_statement:'Tacoma has anomalously high resale retention. Model applies Tacoma-specific bias correction to avoid over-predicting appreciation.',
    ethics_disclaimer:_ED, agent_log:_alog('Toyota','Tacoma',2020,{rec:'BUY NOW',conf:91,vol:'Low',risk:14,fc90:7.4,cnt:22,rule:'90d change ≥ +2% AND volatility Low → BUY NOW'}),
    tool_outputs:{
      get_price_history:_hist(27500,29400),
      run_forecast:{last_known_price:29400,trend_pct_change:7.4,forecast_30d:30120,forecast_90d:31580,method:'llm_blended'},
      get_market_context:{current_inventory_count:22,inventory_trend:'growing',price_vs_median_pct:2.8},
      run_price_prediction:{shap_factors:[{feature:'tacoma_premium',impact:4800,direction:'increases price'},{feature:'supply_scarcity',impact:2400,direction:'increases price'},{feature:'off_road_demand',impact:1900,direction:'increases price'},{feature:'mileage',impact:-2100,direction:'decreases price'},{feature:'model_year',impact:1600,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'Tacoma is the best-performing used truck for resale. Scarcity + brand loyalty create a durable appreciation floor.'},
    },
  },
  'honda|accord|2020': {
    final_recommendation:'MONITOR', confidence_score:70, volatility_index:'Low', risk_score:26,
    predicted_price:21800, projected_price:21910, forecast_30d:21860, forecast_90d:21910,
    predicted_90_day_change:0.5, uncertainty_range:{low:21200,high:22500}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Honda Accord 2020 is in a textbook neutral market — 38 listings, +0.5%/90d, and 0.8% above regional median.',
      'Low volatility (σ=4.1%) with no macro catalyst on the horizon. This is a monitor-and-wait situation.',
      'XGBoost confidence of 70% reflects the balanced signals — insufficient edge to recommend buy or sell at this time.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 70%.',
    bias_statement:'Accord comps are plentiful in Illinois — low regional scarcity risk. Model is well-calibrated for this vehicle.',
    ethics_disclaimer:_ED, agent_log:_alog('Honda','Accord',2020,{rec:'MONITOR',conf:70,vol:'Low',risk:26,fc90:0.5,cnt:38,rule:'no dominant signal — insufficient confidence edge'}),
    tool_outputs:{
      get_price_history:_hist(21600,21800),
      run_forecast:{last_known_price:21800,trend_pct_change:0.5,forecast_30d:21860,forecast_90d:21910,method:'llm_blended'},
      get_market_context:{current_inventory_count:38,inventory_trend:'stable',price_vs_median_pct:0.8},
      run_price_prediction:{shap_factors:[{feature:'mileage',impact:-1980,direction:'decreases price'},{feature:'model_year',impact:2100,direction:'increases price'},{feature:'condition',impact:840,direction:'increases price'},{feature:'regional_demand',impact:380,direction:'increases price'},{feature:'make_premium',impact:240,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'Accord 2020 is fairly priced with balanced supply. No short-term catalyst to move pricing significantly.'},
    },
  },
  'chevrolet|malibu|2019': {
    final_recommendation:'WAIT', confidence_score:75, volatility_index:'Moderate', risk_score:46,
    predicted_price:15200, projected_price:14565, forecast_30d:14950, forecast_90d:14565,
    predicted_90_day_change:-4.2, uncertainty_range:{low:13800,high:16100}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Chevrolet Malibu 2019 is declining at −4.2%/90d as the mid-size sedan segment faces structural demand headwinds from SUV shift.',
      'Moderate volatility and 56 listings with rapidly declining demand suggest further price compression ahead.',
      'Waiting 90 days could save ~$635. The 75% confidence threshold is just met — sufficient to justify a clear WAIT signal.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 75%.',
    bias_statement:'Chevrolet mid-size sedans face persistent demand decline vs SUVs. Model trained on sufficient Malibu comps to be reliable.',
    ethics_disclaimer:_ED, agent_log:_alog('Chevrolet','Malibu',2019,{rec:'WAIT',conf:75,vol:'Moderate',risk:46,fc90:-4.2,cnt:56,rule:'90d change ≤ −3% AND confidence ≥ 75 → WAIT'}),
    tool_outputs:{
      get_price_history:_hist(16500,15200),
      run_forecast:{last_known_price:15200,trend_pct_change:-4.2,forecast_30d:14950,forecast_90d:14565,method:'llm_blended'},
      get_market_context:{current_inventory_count:56,inventory_trend:'declining',price_vs_median_pct:1.8},
      run_price_prediction:{shap_factors:[{feature:'suv_shift_penalty',impact:-2400,direction:'decreases price'},{feature:'mileage',impact:-1900,direction:'decreases price'},{feature:'model_year',impact:-1200,direction:'decreases price'},{feature:'condition',impact:720,direction:'increases price'},{feature:'regional_supply',impact:-880,direction:'decreases price'}]},
      run_llm_price_analysis:{key_insight:'Mid-size sedans are in structural decline as buyers shift to CUVs. Malibu has limited catalysts for a reversal.'},
    },
  },
  'toyota|rav4|2020': {
    final_recommendation:'BUY NOW', confidence_score:85, volatility_index:'Low', risk_score:20,
    predicted_price:26100, projected_price:27170, forecast_30d:26480, forecast_90d:27170,
    predicted_90_day_change:4.1, uncertainty_range:{low:25200,high:28300}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Toyota RAV4 2020 is appreciating at +4.1%/90d — one of the strongest compact SUV signals in the current dataset.',
      '44 listings in California with growing demand; RAV4 benefits from both hybrid transition demand and proven reliability premiums.',
      '85% confidence with low volatility (σ=4.1%) — a clean BUY NOW signal. At $26,100 fair value, the 90d target of $27,170 is a +4.1% gain.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 85%.',
    bias_statement:'RAV4 is one of the most-traded SUVs — low liquidity risk. Model is well-calibrated with abundant comp data.',
    ethics_disclaimer:_ED, agent_log:_alog('Toyota','RAV4',2020,{rec:'BUY NOW',conf:85,vol:'Low',risk:20,fc90:4.1,cnt:44,rule:'90d change ≥ +2% AND volatility Low → BUY NOW'}),
    tool_outputs:{
      get_price_history:_hist(24800,26100),
      run_forecast:{last_known_price:26100,trend_pct_change:4.1,forecast_30d:26480,forecast_90d:27170,method:'llm_blended'},
      get_market_context:{current_inventory_count:44,inventory_trend:'growing',price_vs_median_pct:1.4},
      run_price_prediction:{shap_factors:[{feature:'suv_demand',impact:2800,direction:'increases price'},{feature:'hybrid_premium',impact:1800,direction:'increases price'},{feature:'model_year',impact:2100,direction:'increases price'},{feature:'mileage',impact:-2200,direction:'decreases price'},{feature:'brand_reliability',impact:960,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'RAV4 demand is fuelled by hybrid transition buyers seeking proven reliability. Supply constraints make this a strong buy window.'},
    },
  },
  'ford|mustang|2019': {
    final_recommendation:'MONITOR', confidence_score:68, volatility_index:'Moderate', risk_score:36,
    predicted_price:28700, projected_price:29100, forecast_30d:28900, forecast_90d:29100,
    predicted_90_day_change:1.4, uncertainty_range:{low:27400,high:30200}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Ford Mustang 2019 shows mild appreciation (+1.4%/90d) but moderate volatility makes the signal inconclusive.',
      '31 listings at +0.6% vs median — fairly priced, with no compelling urgency to buy or hold off.',
      '68% confidence is below our 75% action threshold. A MONITOR stance allows you to capture a better entry if volatility resolves.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 68%.',
    bias_statement:'Sports cars exhibit higher emotional premium and seasonal demand swings. Model applies sports-segment volatility correction.',
    ethics_disclaimer:_ED, agent_log:_alog('Ford','Mustang',2019,{rec:'MONITOR',conf:68,vol:'Moderate',risk:36,fc90:1.4,cnt:31,rule:'confidence < 75% — no dominant signal'}),
    tool_outputs:{
      get_price_history:_hist(28400,28700),
      run_forecast:{last_known_price:28700,trend_pct_change:1.4,forecast_30d:28900,forecast_90d:29100,method:'llm_blended'},
      get_market_context:{current_inventory_count:31,inventory_trend:'stable',price_vs_median_pct:0.6},
      run_price_prediction:{shap_factors:[{feature:'sports_demand',impact:2400,direction:'increases price'},{feature:'mileage',impact:-2100,direction:'decreases price'},{feature:'model_year',impact:-1600,direction:'decreases price'},{feature:'condition',impact:840,direction:'increases price'},{feature:'seasonal_premium',impact:620,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'Mustang pricing is seasonally influenced. Spring demand uptick could push toward the upper uncertainty range — watch for Q1 2025 signal.'},
    },
  },
  'jeep|cherokee|2020': {
    final_recommendation:'MONITOR', confidence_score:73, volatility_index:'Low', risk_score:24,
    predicted_price:20800, projected_price:20950, forecast_30d:20870, forecast_90d:20950,
    predicted_90_day_change:0.7, uncertainty_range:{low:20200,high:21600}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Jeep Cherokee 2020 is in a mild appreciation phase (+0.7%/90d) with balanced supply — 35 listings near median.',
      'Low volatility (σ=4.1%) is positive, but the 73% confidence and sub-2% change do not trigger a BUY NOW rule.',
      'A monitoring strategy allows you to act if the Wrangler-style demand momentum transfers to the Cherokee segment.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 73%.',
    bias_statement:'Cherokee comps are plentiful; no significant regional scarcity. Brand premium partially offset by aging platform concerns.',
    ethics_disclaimer:_ED, agent_log:_alog('Jeep','Cherokee',2020,{rec:'MONITOR',conf:73,vol:'Low',risk:24,fc90:0.7,cnt:35,rule:'change < 2% — insufficient appreciation for BUY NOW'}),
    tool_outputs:{
      get_price_history:_hist(20600,20800),
      run_forecast:{last_known_price:20800,trend_pct_change:0.7,forecast_30d:20870,forecast_90d:20950,method:'llm_blended'},
      get_market_context:{current_inventory_count:35,inventory_trend:'stable',price_vs_median_pct:-0.5},
      run_price_prediction:{shap_factors:[{feature:'model_year',impact:1800,direction:'increases price'},{feature:'mileage',impact:-1760,direction:'decreases price'},{feature:'suv_demand',impact:1200,direction:'increases price'},{feature:'platform_age',impact:-880,direction:'decreases price'},{feature:'condition',impact:780,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'Cherokee 2020 is fairly priced and stable. Watch for a summer demand spike that could shift this to a BUY NOW.'},
    },
  },
  'honda|cr-v|2020': {
    final_recommendation:'MONITOR', confidence_score:74, volatility_index:'Low', risk_score:22,
    predicted_price:22600, projected_price:22850, forecast_30d:22720, forecast_90d:22850,
    predicted_90_day_change:1.1, uncertainty_range:{low:22000,high:23600}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Honda CR-V 2020 shows steady but modest appreciation (+1.1%/90d) — not enough to trigger a buy signal under current rules.',
      '41 listings in stable inventory trend; +1.1% vs median suggests fair market pricing with no discount opportunity.',
      'MONITOR: positive trajectory but 74% confidence and sub-2% change keeps this just below the BUY NOW threshold.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 74%.',
    bias_statement:'CR-V has excellent liquidity and abundant comps. Low bias risk — model prediction is well-supported.',
    ethics_disclaimer:_ED, agent_log:_alog('Honda','CR-V',2020,{rec:'MONITOR',conf:74,vol:'Low',risk:22,fc90:1.1,cnt:41,rule:'change < 2% — below BUY NOW threshold'}),
    tool_outputs:{
      get_price_history:_hist(22300,22600),
      run_forecast:{last_known_price:22600,trend_pct_change:1.1,forecast_30d:22720,forecast_90d:22850,method:'llm_blended'},
      get_market_context:{current_inventory_count:41,inventory_trend:'stable',price_vs_median_pct:1.1},
      run_price_prediction:{shap_factors:[{feature:'mileage',impact:-1900,direction:'decreases price'},{feature:'model_year',impact:2200,direction:'increases price'},{feature:'suv_premium',impact:1600,direction:'increases price'},{feature:'condition',impact:840,direction:'increases price'},{feature:'brand_reliability',impact:720,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'CR-V demand is consistent but not surging. A fair buy at current prices; no urgency for either buying or waiting.'},
    },
  },
  'ford|explorer|2019': {
    final_recommendation:'BUY NOW', confidence_score:82, volatility_index:'Low', risk_score:20,
    predicted_price:24800, projected_price:24155, forecast_30d:24580, forecast_90d:24155,
    predicted_90_day_change:-2.6, uncertainty_range:{low:23400,high:25900}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Ford Explorer 2019 is priced 10.8% below the regional median of $27,800 — a significant discount in the mid-size SUV segment.',
      'Despite mild price decline (−2.6%/90d), the below-median position and high demand (58 listings, growing) trigger BUY NOW.',
      '82% confidence confirms this is not a distressed sale anomaly — the model identifies genuine undervaluation. Act before market corrects.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 82%.',
    bias_statement:'Explorer 2019 pre-dates the 2020 platform refresh — model accounts for platform-cycle depreciation in its valuation.',
    ethics_disclaimer:_ED, agent_log:_alog('Ford','Explorer',2019,{rec:'BUY NOW',conf:82,vol:'Low',risk:20,fc90:-2.6,cnt:58,rule:'price ≤ −10% vs median AND confidence ≥ 75 → BUY NOW'}),
    tool_outputs:{
      get_price_history:_hist(25400,24800),
      run_forecast:{last_known_price:24800,trend_pct_change:-2.6,forecast_30d:24580,forecast_90d:24155,method:'llm_blended'},
      get_market_context:{current_inventory_count:58,inventory_trend:'growing',price_vs_median_pct:-10.8},
      run_price_prediction:{shap_factors:[{feature:'platform_discount',impact:-2800,direction:'decreases price'},{feature:'suv_demand',impact:2400,direction:'increases price'},{feature:'mileage',impact:-2100,direction:'decreases price'},{feature:'family_segment',impact:1600,direction:'increases price'},{feature:'condition',impact:840,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'Explorer 2019 trades at a pre-refresh discount that overstates the platform disadvantage. Strong buy for value-oriented buyers.'},
    },
  },
  'toyota|prius|2019': {
    final_recommendation:'BUY NOW', confidence_score:87, volatility_index:'Low', risk_score:16,
    predicted_price:18900, projected_price:19770, forecast_30d:19200, forecast_90d:19770,
    predicted_90_day_change:4.6, uncertainty_range:{low:18200,high:20600}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Toyota Prius 2019 is rising at +4.6%/90d, driven by accelerating hybrid adoption as EV range anxiety persists.',
      '34 listings in stable demand with −1.2% vs median suggests slight undervaluation on top of structural appreciation.',
      'At 87% confidence and Low volatility, this is a textbook BUY NOW — both the rule (>+2% + Low vol) and value signal align.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 87%.',
    bias_statement:'Hybrid vehicles carry a government-policy sensitivity not fully captured in historical comps. Model applies EV/hybrid premium discount of 5%.',
    ethics_disclaimer:_ED, agent_log:_alog('Toyota','Prius',2019,{rec:'BUY NOW',conf:87,vol:'Low',risk:16,fc90:4.6,cnt:34,rule:'90d change ≥ +2% AND volatility Low → BUY NOW'}),
    tool_outputs:{
      get_price_history:_hist(17900,18900),
      run_forecast:{last_known_price:18900,trend_pct_change:4.6,forecast_30d:19200,forecast_90d:19770,method:'llm_blended'},
      get_market_context:{current_inventory_count:34,inventory_trend:'growing',price_vs_median_pct:-1.2},
      run_price_prediction:{shap_factors:[{feature:'hybrid_demand',impact:2800,direction:'increases price'},{feature:'fuel_economy',impact:1900,direction:'increases price'},{feature:'model_year',impact:-1600,direction:'decreases price'},{feature:'mileage',impact:-1800,direction:'decreases price'},{feature:'ev_transition_premium',impact:1400,direction:'increases price'}]},
      run_llm_price_analysis:{key_insight:'Prius demand is benefiting from the EV growing pains — hybrid offers range certainty. The appreciation trend has 6+ months of runway.'},
    },
  },
  'chevrolet|silverado|2019': {
    final_recommendation:'WAIT', confidence_score:78, volatility_index:'Moderate', risk_score:50,
    predicted_price:33200, projected_price:31630, forecast_30d:32580, forecast_90d:31630,
    predicted_90_day_change:-4.7, uncertainty_range:{low:30200,high:35100}, forecast_method:'llm_blended',
    reasoning_summary:[
      'Chevrolet Silverado 2019 is declining at −4.7%/90d — one of the steeper drops in the full-size truck segment.',
      '82 listings with declining demand and +3.2% above median; there is clear downward mean-reversion pressure.',
      '78% confidence with Moderate volatility supports the WAIT call. Potential savings of ~$1,570 by waiting 90 days.',
    ],
    transparency_note:'LLM-blended forecast (Prophet 70% + XGBoost 30%). 262k training listings. Confidence 78%.',
    bias_statement:'Silverado competes closely with F-150 — model uses cross-brand truck comps for calibration to reduce maker bias.',
    ethics_disclaimer:_ED, agent_log:_alog('Chevrolet','Silverado',2019,{rec:'WAIT',conf:78,vol:'Moderate',risk:50,fc90:-4.7,cnt:82,rule:'90d change ≤ −3% AND confidence ≥ 75 → WAIT'}),
    tool_outputs:{
      get_price_history:_hist(35000,33200),
      run_forecast:{last_known_price:33200,trend_pct_change:-4.7,forecast_30d:32580,forecast_90d:31630,method:'llm_blended'},
      get_market_context:{current_inventory_count:82,inventory_trend:'declining',price_vs_median_pct:3.2},
      run_price_prediction:{shap_factors:[{feature:'truck_oversupply',impact:-3200,direction:'decreases price'},{feature:'mileage',impact:-2800,direction:'decreases price'},{feature:'towing_capacity',impact:2100,direction:'increases price'},{feature:'model_year',impact:-1600,direction:'decreases price'},{feature:'fleet_rotation',impact:-1200,direction:'decreases price'}]},
      run_llm_price_analysis:{key_insight:'Silverado 2019 oversupply from fleet rotation is pushing prices below fair value. The bottom is likely 2-3 months out.'},
    },
  },
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!value) return
    let cur = 0
    const step = value / 40
    const t = setInterval(() => {
      cur += step
      if (cur >= value) { setDisplay(value); clearInterval(t) }
      else setDisplay(Math.floor(cur))
    }, 20)
    return () => clearInterval(t)
  }, [value])
  return <>{display.toLocaleString()}</>
}

function ConfidenceGauge({ score }) {
  const pct    = Math.max(0, Math.min(100, score || 0))
  const r      = 40
  const half   = Math.PI * r      // ~125.66 — half-circle circumference
  const offset = half * (1 - pct / 100)
  const color  = pct >= 75 ? '#10b981' : pct >= 55 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="58" viewBox="0 0 100 58">
        {/* Background arc */}
        <path d="M 10 52 A 40 40 0 0 1 90 52"
          fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
        {/* Foreground arc */}
        <path d="M 10 52 A 40 40 0 0 1 90 52"
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${half} ${half}`}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        <text x="50" y="50" textAnchor="middle" fill="white" fontSize="15" fontWeight="bold">{pct}%</text>
      </svg>
      <p className="text-[10px] text-slate-500 -mt-1">Confidence</p>
    </div>
  )
}

function VolatilityMeter({ level }) {
  const idx    = ['Low', 'Moderate', 'High'].indexOf(level)
  const colors = ['#10b981', '#f59e0b', '#ef4444']
  const bars   = [
    { h: 'h-3', fill: idx >= 0 ? colors[0] : '#1e293b' },
    { h: 'h-5', fill: idx >= 1 ? colors[1] : '#1e293b' },
    { h: 'h-7', fill: idx >= 2 ? colors[2] : '#1e293b' },
  ]
  const activeColor = idx >= 0 ? colors[idx] : '#64748b'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end gap-1 h-8">
        {bars.map((b, i) => (
          <div key={i} className={`w-3 rounded-sm ${b.h} transition-all duration-700`}
            style={{ background: b.fill }} />
        ))}
      </div>
      <p className="text-xs font-semibold" style={{ color: activeColor }}>{level || '—'}</p>
      <p className="text-[10px] text-slate-600">Volatility</p>
    </div>
  )
}

function AgentReasoningLog({ agentLog }) {
  if (!agentLog || agentLog.length === 0) return null
  return (
    <div className="space-y-0">
      {agentLog.map((entry, idx) => {
        const IconComp = AGENT_ICONS[entry.agent] || Activity
        const isLast   = idx === agentLog.length - 1
        const isOrch   = entry.agent === 'OrchestratorAgent'
        const statusColor = entry.status === 'ok'
          ? 'bg-blue-500/20 text-blue-400'
          : entry.status === 'fallback'
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-red-500/20 text-red-400'

        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${statusColor}`}>
                <IconComp size={12} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-slate-700/60 my-1" />}
            </div>
            <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-3'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">{entry.agent}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  entry.status === 'ok' ? 'bg-emerald-500/15 text-emerald-400' :
                  entry.status === 'fallback' ? 'bg-amber-500/15 text-amber-400' :
                  'bg-red-500/15 text-red-400'
                }`}>{entry.status}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{entry.message}</p>
              {/* Key output preview (non-orchestrator) */}
              {!isOrch && entry.output && Object.keys(entry.output).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(entry.output).slice(0, 3).map(([k, v]) => (
                    <span key={k} className="text-[10px] text-slate-600">
                      <span className="text-slate-500">{k.replace(/_/g, ' ')}: </span>
                      <span className="text-slate-400">{typeof v === 'number' ? (Math.abs(v) >= 1000 ? `$${Number(v).toLocaleString()}` : String(v)) : String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ScenarioPanel({ basePct, projectedPrice }) {
  const [active, setActive] = useState(null)

  const scenario  = SCENARIOS.find(s => s.key === active)
  const adjPct    = scenario ? Math.round((basePct + scenario.delta) * 10) / 10 : basePct
  const adjPrice  = scenario && projectedPrice
    ? Math.round(projectedPrice * (1 + scenario.delta / 100))
    : projectedPrice

  const pctColor = adjPct > 0 ? 'text-emerald-400' : adjPct < 0 ? 'text-red-400' : 'text-slate-400'

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
      <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
        <Zap size={15} className="text-amber-400" />
        Scenario Simulation
      </h3>
      <p className="text-slate-500 text-xs mb-4">
        Toggle a macro event to see its modelled impact on the 90-day forecast
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {SCENARIOS.map(s => (
          <button key={s.key}
            onClick={() => setActive(active === s.key ? null : s.key)}
            className={`text-left p-3 rounded-xl border text-xs transition-all ${
              active === s.key
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}>
            <div className="font-semibold mb-0.5">{s.label}</div>
            <div className="text-slate-600 text-[10px]">{s.desc}</div>
            <div className={`text-[10px] font-bold mt-1 ${s.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {s.delta > 0 ? '+' : ''}{s.delta}%
            </div>
          </button>
        ))}
      </div>

      {projectedPrice > 0 && (
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-500 mb-2">
            {scenario ? `Under: ${scenario.label}` : 'Base forecast'}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">90-Day Forecast</p>
              <p className="text-2xl font-bold text-white">${adjPrice?.toLocaleString() ?? '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-600 uppercase tracking-wide">Change</p>
              <p className={`text-xl font-bold ${pctColor}`}>
                {adjPct > 0 ? '+' : ''}{adjPct}%
              </p>
            </div>
          </div>
          {scenario && (
            <p className="text-[10px] text-slate-600 mt-2 italic">{scenario.desc}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AnalyzePage() {
  const [searchParams] = useSearchParams()

  const [form,    setForm]    = useState({
    make: '', model: '', year: '', mileage: 50000, condition: 'good', region: 'california',
  })
  const [result,       setResult]       = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [stage,        setStage]        = useState(0)
  const [pendingDemo,  setPendingDemo]  = useState(null)

  useEffect(() => {
    const make = searchParams.get('make')
    const model = searchParams.get('model')
    const year  = searchParams.get('year')
    if (make && model && year) {
      setForm(f => ({ ...f, make, model, year: +year }))
    }
  }, [searchParams])

  const makes  = useMemo(() => Object.keys(CAR_CATALOG).sort(), [])
  const models = useMemo(() => Object.keys(CAR_CATALOG[form.make] || {}).sort(), [form.make])
  const years  = useMemo(() => (CAR_CATALOG[form.make]?.[form.model] || []), [form.make, form.model])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function analyzeWith(params) {
    setLoading(true); setError(null); setResult(null); setStage(0)
    const timer = setInterval(() => setStage(s => Math.min(s + 1, ANALYSIS_STAGES.length - 1)), 2200)
    try {
      const { data } = await getPrediction({ ...params, year: +params.year })
      setResult(data)
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.error || e.message
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      clearInterval(timer)
      setLoading(false)
    }
  }

  function analyze() {
    if (!form.make || !form.model || !form.year) return
    analyzeWith(form)
  }

  function loadDemo(demo) {
    const key = `${demo.make}|${demo.model}|${demo.year}`
    const staticData = DEMO_DATA_MAP[key]
    setForm({ make: demo.make, model: demo.model, year: demo.year, mileage: demo.mileage, condition: demo.condition, region: demo.region })
    setError(null); setResult(null); setLoading(true); setStage(0)

    if (staticData) {
      // Simulate the multi-agent pipeline with staged loading (no real API call)
      let s = 0
      const stageTimer = setInterval(() => { s = Math.min(s + 1, ANALYSIS_STAGES.length - 1); setStage(s) }, 380)
      setTimeout(() => {
        clearInterval(stageTimer)
        setResult(staticData)
        setLoading(false)
      }, 2900)
    } else {
      // Fallback to real API for vehicles not in the static map
      setLoading(false)
      setPendingDemo(demo)
    }
  }

  // Fallback: fire analyzeWith after form state settles for non-static demos
  useEffect(() => {
    if (pendingDemo) {
      setPendingDemo(null)
      analyzeWith(pendingDemo)
    }
  }, [pendingDemo])

  // Derived fields — support both new orchestrator format and legacy format
  const finalRec     = result?.final_recommendation || (
    result?.recommendation === 'BUY' ? 'BUY NOW' :
    result?.recommendation === 'NEUTRAL' ? 'MONITOR' :
    result?.recommendation
  )
  const confScore    = result?.confidence_score || (
    result?.confidence === 'HIGH' ? 85 :
    result?.confidence === 'MODERATE' ? 65 : 38
  )
  const volIndex     = result?.volatility_index || 'Moderate'
  const riskScore    = result?.risk_score
  const projPrice    = result?.projected_price || result?.forecast_90d
  const chg90d       = result?.predicted_90_day_change
  const uncRange     = result?.uncertainty_range
  const reasoning    = result?.reasoning_summary        // array of 3 strings
  const transpNote   = result?.transparency_note
  const biasStat     = result?.bias_statement
  const ethicsDiscl  = result?.ethics_disclaimer
  const agentLog     = result?.agent_log                // new format
  const shap         = result?.shap_factors || result?.tool_outputs?.run_price_prediction?.shap_factors || []
  const mktCtx       = result?.tool_outputs?.get_market_context
  const fc           = result?.tool_outputs?.run_forecast
  const llmAnalysis  = result?.tool_outputs?.run_llm_price_analysis
  const forecastMethod = result?.forecast_method || fc?.method
  const sigCfg       = SIG_CFG[finalRec] || SIG_CFG.NEUTRAL
  const SigIcon      = sigCfg.Icon

  // Chart data
  const chartData = useMemo(() => {
    const hist = Array.isArray(result?.tool_outputs?.get_price_history)
      ? result.tool_outputs.get_price_history
      : []
    const forecast30 = result?.forecast_30d || fc?.forecast_30d
    const forecast90 = result?.forecast_90d || fc?.forecast_90d
    const pts = hist.map(h => ({ date: h.date, historical: h.avg_price, forecast: null }))
    if (fc?.last_known_price && (forecast30 || forecast90)) {
      if (pts.length) pts[pts.length - 1].forecast = pts[pts.length - 1].historical
      pts.push({ date: 'Now',  historical: null, forecast: fc.last_known_price })
      pts.push({ date: '+30d', historical: null, forecast: forecast30 })
      pts.push({ date: '+90d', historical: null, forecast: forecast90 })
    }
    return pts
  }, [result])

  const shapChartData = shap
    .map(f => ({ name: f.feature.replace(/_/g, ' '), impact: Math.abs(f.impact), dir: f.direction }))
    .sort((a, b) => b.impact - a.impact)

  const chartTooltipStyle = {
    contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 },
    labelStyle:   { color: '#e2e8f0' },
    itemStyle:    { color: '#94a3b8' },
  }

  return (
    <div className="min-h-screen">

      {/* ── Hero / Form ── */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <Sparkles size={12} />
            8-Agent Pipeline · XGBoost · Prophet · GPT-4o-mini · Principled AI
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-1">
            AI Car Price <span className="text-blue-400">Intelligence</span>
          </h1>
          <p className="text-slate-400 text-base mb-8 max-w-2xl">
            Multi-agent decision intelligence — transparent BUY / WAIT / MONITOR signals
            with explainable AI reasoning, risk assessment, and ethical guardrails.
          </p>

          {/* Form card */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
              <Car size={16} className="text-blue-400" />
              Configure Your Search
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Make',  node: (
                  <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.make} onChange={e => { set('make', e.target.value); set('model', ''); set('year', '') }}>
                    <option value="">Select make</option>
                    {makes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )},
                { label: 'Model', node: (
                  <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-40"
                    value={form.model} onChange={e => { set('model', e.target.value); set('year', '') }} disabled={!form.make}>
                    <option value="">Select model</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )},
                { label: 'Year', node: (
                  <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-40"
                    value={form.year} onChange={e => set('year', e.target.value)} disabled={!form.model}>
                    <option value="">Year</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )},
                { label: 'Mileage', node: (
                  <input type="number" min={0} max={300000} step={5000}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.mileage} onChange={e => set('mileage', +e.target.value)} />
                )},
                { label: 'Condition', node: (
                  <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.condition} onChange={e => set('condition', e.target.value)}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )},
                { label: 'Region', node: (
                  <select className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.region} onChange={e => set('region', e.target.value)}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )},
              ].map(({ label, node }) => (
                <div key={label}>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">{label}</label>
                  {node}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-5 flex-wrap">
              <button
                id="analyze-btn"
                onClick={analyze}
                disabled={loading || !form.make || !form.model || !form.year}
                className={`flex items-center gap-2 px-7 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  loading || !form.make || !form.model || !form.year
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40'
                }`}
              >
                {loading
                  ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{ANALYSIS_STAGES[stage]}</>
                  : <><Search size={15} />Analyze Now</>
                }
              </button>
              {form.make && form.model && form.year && !loading && (
                <span className="text-slate-500 text-xs">
                  {form.year} {form.make} · {Number(form.mileage).toLocaleString()} mi · {form.condition} · {form.region}
                </span>
              )}
            </div>

            {/* Quick demo strip */}
            {!loading && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mr-1">Quick demo:</span>
                {DEMO_VEHICLES.map(demo => (
                  <button
                    key={demo.label}
                    onClick={() => loadDemo(demo)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                  >
                    <span>{demo.emoji}</span>
                    <span>{demo.label}</span>
                    <span className={`text-[9px] font-bold ${demo.tagText}`}>{demo.tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Results area ── */}
      <div className="max-w-7xl mx-auto px-6 pb-12">

        {error && (
          <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-xl animate-fade-in">
            <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Analysis Failed</p>
              <p className="text-red-300/80 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-8 space-y-4 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-52 bg-slate-800 rounded-2xl" />
              <div className="col-span-2 grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-2xl" />)}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 h-64 bg-slate-800 rounded-2xl" />
              <div className="lg:col-span-2 h-64 bg-slate-800 rounded-2xl" />
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && !loading && (
          <div className="mt-8 space-y-6 animate-fade-in">

            {/* Row 1: Signal card + 4 stat cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Signal card with gauge + volatility */}
              <div className={`bg-gradient-to-br ${sigCfg.grad} rounded-2xl p-6 text-white shadow-2xl ${sigCfg.shadow}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white/65 text-xs font-semibold uppercase tracking-widest">AI Recommendation</p>
                    <p className="text-5xl font-black mt-1 tracking-tight leading-none">{finalRec}</p>
                    <p className="text-white/80 text-sm mt-1.5">{sigCfg.label}</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <SigIcon size={22} />
                  </div>
                </div>

                {/* Confidence gauge + volatility meter */}
                <div className="mt-4 flex items-center justify-around bg-white/10 rounded-xl py-3 px-2">
                  <ConfidenceGauge score={confScore} />
                  <div className="w-px h-12 bg-white/20" />
                  <VolatilityMeter level={volIndex} />
                  {riskScore !== undefined && (
                    <>
                      <div className="w-px h-12 bg-white/20" />
                      <div className="flex flex-col items-center">
                        <p className="text-xl font-bold">{riskScore}</p>
                        <p className="text-[10px] text-white/60">Risk Score</p>
                        <p className="text-[9px] text-white/40">/ 100</p>
                      </div>
                    </>
                  )}
                </div>

                {/* 90-day change */}
                {chg90d !== undefined && (
                  <div className="mt-3 flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                    <span className="text-xs text-white/60">90-day forecast</span>
                    <span className="text-sm font-bold">
                      {chg90d > 0 ? '+' : ''}{chg90d}%
                    </span>
                  </div>
                )}
              </div>

              {/* 4 stat cards */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                {[
                  {
                    icon: DollarSign, label: 'Predicted Fair Value', color: 'text-white',
                    value: result.predicted_price
                      ? <>${<AnimatedNumber value={result.predicted_price} />}</>
                      : '—',
                    sub: 'XGBoost · 262k training listings',
                  },
                  {
                    icon: TrendingUp, label: '90-Day Projected Price', color: projPrice
                      ? (chg90d >= 0 ? 'text-emerald-400' : 'text-red-400')
                      : 'text-slate-500',
                    value: projPrice
                      ? <>${projPrice.toLocaleString()}</>
                      : fc && !fc.error ? <>{fc.trend_pct_change > 0 ? '+' : ''}{fc.trend_pct_change}%</> : 'N/A',
                    sub: uncRange
                      ? `Range: $${uncRange.low?.toLocaleString()} – $${uncRange.high?.toLocaleString()}`
                      : forecastMethod
                        ? forecastMethod === 'llm_blended' ? 'AI-blended forecast' : forecastMethod
                        : '',
                  },
                  {
                    icon: Package, label: 'Active Listings', color: 'text-white',
                    value: mktCtx?.current_inventory_count ?? '—',
                    sub: mktCtx ? `${mktCtx.inventory_trend} trend` : '',
                  },
                  {
                    icon: Activity, label: 'vs Market Median', color: mktCtx
                      ? (mktCtx.price_vs_median_pct < 0 ? 'text-emerald-400' : 'text-red-400')
                      : 'text-slate-500',
                    value: mktCtx
                      ? `${mktCtx.price_vs_median_pct > 0 ? '+' : ''}${mktCtx.price_vs_median_pct}%`
                      : '—',
                    sub: mktCtx
                      ? (mktCtx.price_vs_median_pct < 0 ? 'Below market — good deal' : 'Above market median')
                      : '',
                  },
                ].map(({ icon: Icon, label, color, value, sub }) => (
                  <div key={label} className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">
                      <Icon size={11} />{label}
                    </div>
                    <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                    <p className="text-slate-500 text-xs mt-1">{sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 2: AI Reasoning bullets + Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Price history & forecast chart */}
              <div className="lg:col-span-3 bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-white font-semibold">Price History &amp; Forecast</h3>
                  {forecastMethod && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      forecastMethod === 'llm_blended'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/20'
                        : forecastMethod === 'prophet'
                          ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
                          : forecastMethod === 'linear'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                            : forecastMethod === 'industry_default'
                              ? 'bg-slate-500/15 text-slate-400 border-slate-500/20'
                              : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                    }`}>
                      {forecastMethod === 'llm_blended'      ? '✦ AI-Enhanced' :
                       forecastMethod === 'prophet'           ? 'Prophet Model' :
                       forecastMethod === 'statistical'       ? 'Statistical' :
                       forecastMethod === 'linear'            ? 'Linear Extrapolation' :
                       forecastMethod === 'market_avg'        ? 'Market-Wide Trend' :
                       forecastMethod === 'industry_default'  ? 'Industry Estimate' :
                       'Forecast'}
                    </span>
                  )}
                </div>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <defs>
                        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tickFormatter={v => v ? `$${(v/1000).toFixed(0)}k` : ''} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip {...chartTooltipStyle}
                        formatter={(v, n) => v ? [`$${Number(v).toLocaleString()}`, n] : [null, null]} />
                      <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
                      {chartData.some(d => d.historical) && (
                        <ReferenceLine x="Now" stroke="#334155" strokeDasharray="4 4"
                          label={{ value: 'Today', fontSize: 9, fill: '#475569', position: 'top' }} />
                      )}
                      <Area type="monotone" dataKey="historical" stroke="#3b82f6" fill="url(#histGrad)"
                        name="Historical avg" connectNulls={false} dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="forecast" stroke="#f97316" strokeDasharray="5 5"
                        dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} name="Forecast" connectNulls strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-600 gap-3">
                    <Activity size={36} className="opacity-30" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-500">No model-specific price history</p>
                      <p className="text-xs mt-1">Forecast based on market-wide trend · XGBoost value is still accurate</p>
                    </div>
                  </div>
                )}

                {/* Forecast summary row */}
                {result.forecast_30d > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">30-Day Forecast</p>
                      <p className="text-lg font-bold text-emerald-400">${Number(result.forecast_30d).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">90-Day Forecast</p>
                      <p className="text-lg font-bold text-emerald-300">${Number(result.forecast_90d).toLocaleString()}</p>
                      {uncRange && (
                        <p className="text-[9px] text-slate-600 mt-0.5">
                          {uncRange.low?.toLocaleString()} – {uncRange.high?.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Reasoning */}
              <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={17} className="text-blue-400" />
                  <h3 className="text-white font-semibold">AI Analyst Reasoning</h3>
                </div>

                {/* New structured reasoning bullets */}
                {reasoning && reasoning.length > 0 ? (
                  <div className="space-y-2.5 flex-1">
                    {reasoning.map((bullet, i) => (
                      <div key={i} className="flex gap-2.5">
                        <ChevronRight size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-300 text-sm leading-relaxed">{bullet}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-900/60 border-l-2 border-blue-500 pl-4 py-3 rounded-r-lg mb-3 flex-1">
                    <p className="text-slate-300 text-sm leading-relaxed italic">{result.explanation}</p>
                  </div>
                )}

                {/* LLM key insight */}
                {llmAnalysis?.key_insight && !llmAnalysis?.error && (
                  <div className="bg-purple-500/8 border border-purple-500/20 rounded-lg px-4 py-2.5 mt-3 flex gap-2 items-start">
                    <Sparkles size={11} className="text-purple-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-purple-300/90 leading-relaxed">
                      <span className="font-semibold text-purple-400">AI Insight: </span>
                      {llmAnalysis.key_insight}
                    </p>
                  </div>
                )}

                {/* SHAP top factors */}
                {shap.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
                      Top Price Factors (SHAP)
                    </p>
                    <div className="space-y-2">
                      {shap.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0
                            ${f.direction === 'increases price' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span className="text-xs text-slate-400 flex-1 capitalize">
                            {f.feature.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-xs font-bold
                            ${f.direction === 'increases price' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {f.direction === 'increases price' ? '+' : '−'}$
                            {Math.abs(f.impact) >= 100
                              ? Math.round(Math.abs(f.impact)).toLocaleString()
                              : Math.abs(f.impact) >= 1
                                ? Math.abs(f.impact).toFixed(1)
                                : Math.abs(f.impact).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: SHAP chart + Agent Reasoning Log */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {shapChartData.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-1">ML Price Factor Breakdown</h3>
                  <p className="text-slate-500 text-xs mb-4">
                    SHAP values — how each feature shifts the XGBoost price prediction
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={shapChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => v.toFixed(0)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#cbd5e1' }} width={110} />
                      <Tooltip {...chartTooltipStyle}
                        formatter={(v, _, p) => [v.toFixed(2), p.payload.dir === 'increases price' ? 'Increases price' : 'Decreases price']} />
                      <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                        {shapChartData.map((f, i) => (
                          <Cell key={i} fill={f.dir === 'increases price' ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Agent Reasoning Log */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
                  <Cpu size={16} className="text-blue-400" />
                  Agent Reasoning Log
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-semibold">
                    {agentLog ? agentLog.length : '—'} agents
                  </span>
                </h3>
                {agentLog && agentLog.length > 0 ? (
                  <AgentReasoningLog agentLog={agentLog} />
                ) : (
                  <p className="text-slate-600 text-sm">No agent log available for this result.</p>
                )}
              </div>
            </div>

            {/* Row 4: Scenario Panel + Transparency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <ScenarioPanel
                basePct={chg90d ?? 0}
                projectedPrice={projPrice}
              />

              {/* Transparency + Ethics */}
              <div className="space-y-4">
                {transpNote && (
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye size={14} className="text-blue-400" />
                      <h4 className="text-white font-semibold text-sm">Transparency Note</h4>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{transpNote}</p>
                  </div>
                )}
                {biasStat && (
                  <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={14} className="text-amber-400" />
                      <h4 className="text-amber-300 font-semibold text-sm">Bias Statement</h4>
                    </div>
                    <p className="text-amber-200/70 text-xs leading-relaxed">{biasStat}</p>
                  </div>
                )}
                {ethicsDiscl && (
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={14} className="text-emerald-400" />
                      <h4 className="text-white font-semibold text-sm">Ethics Disclaimer</h4>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed">{ethicsDiscl}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Empty state + Demo quick-select */}
        {!result && !loading && !error && (
          <div className="mt-12 animate-fade-in">

            {/* Heading */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-slate-600" />
              </div>
              <h3 className="text-slate-300 font-semibold text-xl">Select a vehicle above — or try a demo</h3>
              <p className="text-slate-600 text-sm mt-1.5 max-w-md mx-auto">
                Live demos show BUY NOW · WAIT · MONITOR across different market signals
              </p>
            </div>

            {/* Demo cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
              {DEMO_VEHICLES.map(demo => (
                <button
                  key={demo.label}
                  onClick={() => loadDemo(demo)}
                  className="group text-left bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-500 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  {/* Emoji + signal badge */}
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{demo.emoji}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${demo.tagGrad} text-white shadow-sm`}>
                      {demo.tag}
                    </span>
                  </div>

                  {/* Vehicle name */}
                  <p className="text-white text-sm font-semibold leading-tight">{demo.label}</p>
                  <p className="text-slate-400 text-[11px] leading-snug mt-1">{demo.desc}</p>

                  {/* Stat + arrow */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/60">
                    <span className={`text-[11px] font-bold ${demo.tagText}`}>{demo.stat}</span>
                    <ChevronRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            {/* Footer note */}
            <p className="text-center text-slate-700 text-xs mt-6">
              Demo results use pre-built agent logs — real vehicle queries hit the live 8-agent pipeline
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
