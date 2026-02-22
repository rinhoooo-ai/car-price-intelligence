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
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [stage,   setStage]   = useState(0)

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

  async function analyze() {
    if (!form.make || !form.model || !form.year) return
    setLoading(true); setError(null); setResult(null); setStage(0)
    const timer = setInterval(() => setStage(s => Math.min(s + 1, ANALYSIS_STAGES.length - 1)), 2200)
    try {
      const { data } = await getPrediction({ ...form, year: +form.year })
      setResult(data)
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.error || e.message
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      clearInterval(timer)
      setLoading(false)
    }
  }

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

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="mt-20 text-center animate-fade-in">
            <div className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Search size={32} className="text-slate-600" />
            </div>
            <h3 className="text-slate-400 font-semibold text-xl">Select a vehicle to get started</h3>
            <p className="text-slate-600 text-sm mt-2 max-w-sm mx-auto">
              The 8-agent pipeline returns BUY NOW / WAIT / MONITOR with confidence gauge,
              volatility meter, and ethical AI guardrails.
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
              {['Tesla Model 3', 'Toyota Camry', 'Honda Civic', 'Ford F-150'].map(v => (
                <span key={v} className="text-xs text-slate-600 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                  {v} →
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
