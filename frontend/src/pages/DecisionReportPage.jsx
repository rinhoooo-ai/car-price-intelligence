import { useState, useRef } from 'react'
import {
  Download, Printer, ChevronRight, Shield, Eye, Activity,
  TrendingUp, TrendingDown, Minus, DollarSign, AlertCircle,
  CheckCircle, Zap, BarChart2, Cpu, Database, Scale, Bot,
} from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

// ── Demo vehicles for report generation ──────────────────────────────────────
const DEMO_VEHICLES = [
  {
    id: 'tesla_model3', label: 'Tesla Model 3 (2021)',
    rec: 'WAIT', recColor: 'text-red-400', recGrad: 'from-red-500 to-rose-600',
    confidence: 82, volatility: 'Moderate', risk: 58, change: -4.2,
    current_price: 35200, projected_price: 33722,
    unc_low: 30924, unc_high: 36420,
    reasoning: [
      'The 2021 Tesla Model 3 shows a projected 4.2% price decline over 90 days driven by EV market saturation.',
      'With a confidence score of 82% and moderate volatility, the downward signal is reliable but not extreme.',
      'Waiting 30–90 days is likely to yield a better entry price as new EV inventory normalises.',
    ],
    agent_log: [
      { agent: 'DataAgent',           status: 'ok',       message: 'Retrieved 12 months of price history. 312 active listings.' },
      { agent: 'TrendAnalysisAgent',  status: 'ok',       message: 'Prophet: falling trend (−4.2% / 90d). Momentum: 37.4/100.' },
      { agent: 'ForecastAgent',       status: 'ok',       message: 'XGBoost: $35,200. LLM-blended 90d: $33,722.' },
      { agent: 'RiskAssessmentAgent', status: 'ok',       message: 'Volatility: Moderate. Risk: 58/100. Uncertainty: ±8%.' },
      { agent: 'DecisionAgent',       status: 'ok',       message: 'WAIT — change ≤ −3% AND confidence ≥ 75. Rule 1 triggered.' },
      { agent: 'ExplanationAgent',    status: 'ok',       message: 'Generated 3-sentence reasoning via GPT-4o-mini.' },
      { agent: 'EthicsAgent',         status: 'ok',       message: 'EV-specific bias noted. Transparency note generated.' },
    ],
    radar: [
      { axis: 'Value',       score: 62 },
      { axis: 'Stability',   score: 44 },
      { axis: 'Demand',      score: 55 },
      { axis: 'Supply',      score: 68 },
      { axis: 'Outlook',     score: 38 },
    ],
    transparency: 'Forecast uses XGBoost + GPT-4o-mini blended model with 12 months of EV price history.',
    bias: 'EV market data is sparse pre-2020; federal subsidy policy changes can shift residual values significantly.',
    scenarios: [
      { name: 'EV Subsidy', delta: -2.5, result: 'Strengthens WAIT signal' },
      { name: 'Rate Hike',  delta: -1.8, result: 'Deepens decline to −6.0%' },
      { name: 'Supply Crunch', delta: +3.2, result: 'Narrows decline to −1.0%' },
    ],
  },
  {
    id: 'honda_civic', label: 'Honda Civic (2020)',
    rec: 'BUY NOW', recColor: 'text-emerald-400', recGrad: 'from-emerald-500 to-green-600',
    confidence: 79, volatility: 'Low', risk: 22, change: +2.4,
    current_price: 22400, projected_price: 22938,
    unc_low: 22020, unc_high: 23856,
    reasoning: [
      'The Honda Civic is forecast to rise 2.4% over 90 days with low volatility — an ideal buy window.',
      'Strong fuel efficiency demand and limited compact sedan inventory are driving upward price pressure.',
      'At 79% confidence with Low volatility, this represents a high-quality BUY NOW signal.',
    ],
    agent_log: [
      { agent: 'DataAgent',           status: 'ok', message: 'Retrieved 8 months of price history. 1,983 active listings.' },
      { agent: 'TrendAnalysisAgent',  status: 'ok', message: 'Prophet: rising trend (+2.4% / 90d). Momentum: 57.2/100.' },
      { agent: 'ForecastAgent',       status: 'ok', message: 'XGBoost: $22,400. LLM-blended 90d: $22,938.' },
      { agent: 'RiskAssessmentAgent', status: 'ok', message: 'Volatility: Low. Risk: 22/100. Uncertainty: ±4%.' },
      { agent: 'DecisionAgent',       status: 'ok', message: 'BUY NOW — change ≥ +2% AND volatility = Low. Rule 2 triggered.' },
      { agent: 'ExplanationAgent',    status: 'ok', message: 'Generated 3-sentence reasoning via GPT-4o-mini.' },
      { agent: 'EthicsAgent',         status: 'ok', message: 'Mass-market vehicle — below-average bias. Fairness check passed.' },
    ],
    radar: [
      { axis: 'Value',       score: 78 },
      { axis: 'Stability',   score: 85 },
      { axis: 'Demand',      score: 82 },
      { axis: 'Supply',      score: 58 },
      { axis: 'Outlook',     score: 76 },
    ],
    transparency: 'Blended XGBoost + LLM forecast using 8 months of Civic price history. Spring demand factored.',
    bias: 'Honda Civic is well-represented in training data — below-average model uncertainty for this vehicle.',
    scenarios: [
      { name: 'Rate Hike',     delta: -2.5, result: 'Weakens to +0% (MONITOR)' },
      { name: 'Fuel Spike',    delta: -1.8, result: 'Slightly reduces to +0.6%' },
      { name: 'Supply Crunch', delta: +3.2, result: 'Strengthens to +5.6%' },
    ],
  },
  {
    id: 'jeep_wrangler', label: 'Jeep Wrangler (2020)',
    rec: 'BUY NOW', recColor: 'text-emerald-400', recGrad: 'from-emerald-500 to-green-600',
    confidence: 84, volatility: 'Low', risk: 18, change: +3.1,
    current_price: 38600, projected_price: 39797,
    unc_low: 38205, unc_high: 41389,
    reasoning: [
      'The Jeep Wrangler is rising 3.1% in 90 days — strong off-road demand and tight dealer inventory drive prices up.',
      'With 84% confidence and low volatility, this is one of the strongest BUY NOW signals in the current market.',
      'Wranglers hold value exceptionally well — buy now before spring off-road season drives prices higher.',
    ],
    agent_log: [
      { agent: 'DataAgent',           status: 'ok', message: 'Retrieved 14 months of price history. 892 active listings.' },
      { agent: 'TrendAnalysisAgent',  status: 'ok', message: 'Prophet: rising trend (+3.1% / 90d). Momentum: 59.3/100.' },
      { agent: 'ForecastAgent',       status: 'ok', message: 'XGBoost: $38,600. LLM-blended 90d: $39,797.' },
      { agent: 'RiskAssessmentAgent', status: 'ok', message: 'Volatility: Low. Risk: 18/100. Uncertainty: ±4%.' },
      { agent: 'DecisionAgent',       status: 'ok', message: 'BUY NOW — change ≥ +2% AND volatility = Low. Rule 2 triggered.' },
      { agent: 'ExplanationAgent',    status: 'ok', message: 'Generated 3-sentence reasoning via GPT-4o-mini.' },
      { agent: 'EthicsAgent',         status: 'ok', message: 'Regional variance noted. Fairness check passed.' },
    ],
    radar: [
      { axis: 'Value',       score: 72 },
      { axis: 'Stability',   score: 82 },
      { axis: 'Demand',      score: 88 },
      { axis: 'Supply',      score: 42 },
      { axis: 'Outlook',     score: 84 },
    ],
    transparency: 'Prophet model with 14 months of Wrangler-specific price history. Spring seasonality factored.',
    bias: 'Off-road segments show high regional variance. National averages may understate your local market value.',
    scenarios: [
      { name: 'Fuel Spike',    delta: -1.8, result: 'Moderate reduction to +1.3%' },
      { name: 'Supply Crunch', delta: +3.2, result: 'Accelerates to +6.3%' },
      { name: 'Rate Hike',     delta: -2.5, result: 'Reduces to +0.6% (MONITOR)' },
    ],
  },
  {
    id: 'bmw_3series', label: 'BMW 3 Series (2019)',
    rec: 'WAIT', recColor: 'text-red-400', recGrad: 'from-red-500 to-rose-600',
    confidence: 78, volatility: 'High', risk: 72, change: -5.6,
    current_price: 41200, projected_price: 38896,
    unc_low: 33450, unc_high: 44342,
    reasoning: [
      'The BMW 3 Series faces a steep 5.6% price decline as luxury segment buyers shift toward EVs and newer models.',
      'High volatility (risk score 72/100) reflects maintenance cost uncertainty and financing rate sensitivity.',
      'Strong WAIT signal: waiting 90 days could save $2,000–$3,000 on this purchase.',
    ],
    agent_log: [
      { agent: 'DataAgent',           status: 'fallback', message: 'Limited price history (4 months). Inventory: 274 listings.' },
      { agent: 'TrendAnalysisAgent',  status: 'ok',       message: 'Linear extrapolation: falling trend (−5.6% / 90d).' },
      { agent: 'ForecastAgent',       status: 'ok',       message: 'XGBoost: $41,200. LLM-blended 90d: $38,896.' },
      { agent: 'RiskAssessmentAgent', status: 'ok',       message: 'Volatility: High. Risk: 72/100. Uncertainty: ±14%.' },
      { agent: 'DecisionAgent',       status: 'ok',       message: 'WAIT — change ≤ −3% AND confidence ≥ 75. Rule 1 triggered.' },
      { agent: 'ExplanationAgent',    status: 'ok',       message: 'Generated 3-sentence reasoning via GPT-4o-mini.' },
      { agent: 'EthicsAgent',         status: 'ok',       message: 'Luxury vehicle — underrepresented in training data. Bias noted.' },
    ],
    radar: [
      { axis: 'Value',       score: 42 },
      { axis: 'Stability',   score: 28 },
      { axis: 'Demand',      score: 35 },
      { axis: 'Supply',      score: 72 },
      { axis: 'Outlook',     score: 30 },
    ],
    transparency: 'Limited luxury vehicle data — only 4 months of BMW 3 Series price history available in dataset.',
    bias: 'Luxury vehicle maintenance costs, out-of-warranty risk, and financing sensitivity are not factored into pricing.',
    scenarios: [
      { name: 'Rate Hike',     delta: -2.5, result: 'Deepens to −8.1%' },
      { name: 'EV Subsidy',    delta: +1.5, result: 'Partially offsets to −4.1%' },
      { name: 'Supply Crunch', delta: +3.2, result: 'Narrows to −2.4% (MONITOR)' },
    ],
  },
]

const AGENT_ICONS = {
  DataAgent: Database, TrendAnalysisAgent: TrendingUp, ForecastAgent: Cpu,
  RiskAssessmentAgent: Activity, DecisionAgent: Scale, ExplanationAgent: Bot, EthicsAgent: Shield,
}

const chartStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 },
  labelStyle:   { color: '#e2e8f0' },
}

export default function DecisionReportPage() {
  const [selectedId, setSelectedId] = useState('honda_civic')
  const reportRef = useRef(null)

  const vehicle = DEMO_VEHICLES.find(v => v.id === selectedId)
  const {
    rec, recColor, recGrad, confidence, volatility, risk, change,
    current_price, projected_price, unc_low, unc_high,
    reasoning, agent_log, radar, transparency, bias, scenarios, label,
  } = vehicle

  const sigIcon = rec === 'BUY NOW' ? TrendingUp : rec === 'WAIT' ? TrendingDown : Minus
  const SigIcon = sigIcon
  const confColor = confidence >= 75 ? '#10b981' : confidence >= 55 ? '#f59e0b' : '#ef4444'
  const volColor  = { Low: '#10b981', Moderate: '#f59e0b', High: '#ef4444' }[volatility]

  function handlePrint() {
    window.print()
  }

  return (
    <div className="min-h-screen">

      {/* ── Hero / Vehicle selector ── */}
      <div className="bg-gradient-to-b from-slate-100 to-[#F5F0E8] border-b border-slate-200/80 no-print">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <BarChart2 size={12} />
            AI Decision Report · Full Intelligence Brief
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
            AI Decision <span className="text-blue-400">Report</span>
          </h1>
          <p className="text-slate-600 text-sm mb-6 max-w-2xl">
            Select a vehicle to generate a full AI intelligence brief. Download as PDF for offline review.
          </p>

          <div className="flex flex-wrap gap-3 mb-4">
            {DEMO_VEHICLES.map(v => (
              <button key={v.id} onClick={() => setSelectedId(v.id)}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  selectedId === v.id
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                {v.label}
                <span className={`ml-2 text-xs font-bold ${v.recColor}`}>{v.rec}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-900 font-semibold text-sm transition-all shadow-lg shadow-blue-500/20">
              <Download size={15} />
              Download PDF Report
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-600 text-slate-600 font-semibold text-sm transition-all">
              <Printer size={15} />
              Print Report
            </button>
          </div>
        </div>
      </div>

      {/* ── Report Body ── */}
      <div ref={reportRef} className="max-w-7xl mx-auto px-6 py-8 space-y-6 print-area">

        {/* Report header */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-widest">CarIntel AI Decision Report</p>
            <h2 className="text-2xl font-black text-slate-900 mt-0.5">{label}</h2>
            <p className="text-slate-500 text-xs mt-1">Generated: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className={`bg-gradient-to-br ${recGrad} px-6 py-3 rounded-2xl text-slate-900 font-black text-2xl shadow-lg`}>
            {rec}
          </div>
        </div>

        {/* Row 1: Signal summary + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Summary metrics */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Current Fair Value',    value: `$${current_price.toLocaleString()}`,    color: 'text-slate-900' },
              { label: '90-Day Forecast',       value: `$${projected_price.toLocaleString()}`,  color: change >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Projected Change',      value: `${change > 0 ? '+' : ''}${change}%`,   color: change >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Confidence Score',      value: `${confidence}%`, color: 'text-blue-400' },
              { label: 'Volatility',            value: volatility,       color: volColor ? '' : '' },
              { label: 'Risk Score',            value: `${risk}/100`,    color: risk < 40 ? 'text-emerald-400' : risk < 65 ? 'text-amber-400' : 'text-red-400' },
              { label: 'Uncertainty Low',       value: `$${unc_low.toLocaleString()}`,          color: 'text-slate-600' },
              { label: 'Uncertainty High',      value: `$${unc_high.toLocaleString()}`,         color: 'text-slate-600' },
            ].map(m => (
              <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-3">
                <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-1">{m.label}</p>
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Radar chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-slate-900 font-semibold text-sm mb-3">Market Position Radar</h3>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radar} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Tooltip {...chartStyle} formatter={v => [`${v}/100`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Reasoning + Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* AI Reasoning */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
              <Bot size={16} className="text-blue-400" />
              AI Analyst Reasoning
            </h3>
            <div className="space-y-3">
              {reasoning.map((r, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{r}</p>
                </div>
              ))}
            </div>

            {/* Uncertainty range bar */}
            <div className="mt-5 bg-[#F5F0E8]/60 rounded-xl p-4">
              <p className="text-slate-500 text-xs mb-2">90-Day Price Range ({volatility} volatility)</p>
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs font-bold">${unc_low.toLocaleString()}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full"
                    style={{ background: `linear-gradient(to right, #ef4444, #10b981)`, width: '100%' }} />
                </div>
                <span className="text-emerald-400 text-xs font-bold">${unc_high.toLocaleString()}</span>
              </div>
              <p className="text-center text-slate-500 text-[10px] mt-1">Projected: ${projected_price.toLocaleString()}</p>
            </div>
          </div>

          {/* Scenario Impact */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              Scenario Impact Analysis
            </h3>
            <div className="space-y-3">
              {scenarios.map((s, i) => (
                <div key={i} className="bg-[#F5F0E8]/60 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-900 font-medium text-sm">{s.name}</span>
                    <span className={`text-xs font-bold ${s.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {s.delta > 0 ? '+' : ''}{s.delta}% adjustment
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs">{s.result}</p>
                  <div className="mt-2 text-xs font-bold" style={{ color: (change + s.delta) >= 0 ? '#10b981' : '#ef4444' }}>
                    Adjusted forecast: {(change + s.delta > 0 ? '+' : '')}{(change + s.delta).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Reasoning Log */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-slate-900 font-semibold mb-5 flex items-center gap-2">
            <Cpu size={16} className="text-blue-400" />
            Agent Reasoning Chain
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-semibold">
              {agent_log.length} agents
            </span>
          </h3>
          <div className="space-y-0">
            {agent_log.map((entry, idx) => {
              const IconComp = AGENT_ICONS[entry.agent] || Activity
              const isLast   = idx === agent_log.length - 1
              const scColor  = entry.status === 'ok' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
              return (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${scColor}`}>
                      <IconComp size={12} />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-slate-100/60 my-1" />}
                  </div>
                  <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-3'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">{entry.agent}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        entry.status === 'ok' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>{entry.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{entry.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Transparency + Ethics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={14} className="text-blue-400" />
              <h4 className="text-slate-900 font-semibold text-sm">Transparency Note</h4>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">{transparency}</p>
          </div>
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-400" />
              <h4 className="text-amber-300 font-semibold text-sm">Bias Statement</h4>
            </div>
            <p className="text-amber-200/70 text-xs leading-relaxed">{bias}</p>
          </div>
        </div>

        {/* Ethics footer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">
          <Shield size={18} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-slate-500 text-xs max-w-2xl mx-auto">
            <span className="text-slate-600 font-semibold">Advisory Only: </span>
            CarIntel provides data-driven price intelligence for informational purposes only.
            This report is generated by AI models — not human financial advice.
            Always verify with a licensed dealer or independent inspection before purchasing.
          </p>
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-area { padding: 0 !important; }
          .bg-white, .bg-[#F5F0E8] { background: #f8fafc !important; }
          .text-slate-900 { color: #1e293b !important; }
          .text-slate-600 { color: #475569 !important; }
          .border-slate-200 { border-color: #e2e8f0 !important; }
        }
      `}</style>
    </div>
  )
}
