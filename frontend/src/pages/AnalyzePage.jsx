import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend, ReferenceLine,
} from 'recharts'
import {
  Search, TrendingUp, TrendingDown, Minus, DollarSign,
  Package, Activity, Cpu, CheckCircle, AlertCircle,
  Sparkles, Car, Database, Scale, BarChart2,
} from 'lucide-react'
import { getCars, getPrediction } from '../api'

// ─── Constants ──────────────────────────────────────────────────────────────
const CONDITIONS = ['excellent', 'good', 'fair', 'salvage']
const REGIONS    = ['california', 'texas', 'florida', 'new york', 'illinois', 'ohio', 'georgia']

const SIG_CFG = {
  BUY:     { grad: 'from-emerald-500 to-green-600',  shadow: 'shadow-emerald-500/25', Icon: TrendingUp,   label: 'Strong Buy Signal' },
  WAIT:    { grad: 'from-red-500    to-rose-600',     shadow: 'shadow-red-500/25',    Icon: TrendingDown, label: 'Wait — Price Falling' },
  NEUTRAL: { grad: 'from-amber-500  to-yellow-600',   shadow: 'shadow-amber-500/25',  Icon: Minus,        label: 'Balanced Market' },
}

const TOOL_META = {
  get_price_history:         { Icon: Database,      label: 'Price History',      desc: 'MongoDB time series' },
  run_forecast:              { Icon: TrendingUp,    label: 'Market Forecast',    desc: 'Prophet 30/90-day' },
  run_price_prediction:      { Icon: Cpu,           label: 'ML Prediction',      desc: 'XGBoost + SHAP' },
  get_market_context:        { Icon: Package,       label: 'Market Context',     desc: 'Inventory & range' },
  run_llm_price_analysis:    { Icon: Sparkles,      label: 'AI Price Analysis',  desc: 'GPT-4o-mini enhanced forecast' },
  synthesize_recommendation: { Icon: CheckCircle,   label: 'Recommendation',     desc: 'Blended signal' },
}

const ANALYSIS_STAGES = [
  'Fetching price history…',
  'Running 90-day forecast…',
  'Predicting fair market value…',
  'Analyzing market context…',
  'Running AI price analysis…',
  'Synthesizing recommendation…',
]

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

function AgentTimeline({ toolOutputs }) {
  const steps = Object.entries(toolOutputs || {})
  return (
    <div className="space-y-0">
      {steps.map(([tool, output], idx) => {
        const meta    = TOOL_META[tool] || { Icon: Activity, label: tool, desc: '' }
        const { Icon } = meta
        const hasErr  = !!output?.error
        const isLast  = idx === steps.length - 1

        return (
          <div key={tool} className="flex gap-3">
            {/* Timeline spine */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center mt-1
                ${hasErr ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                <Icon size={13} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-slate-700/60 my-1" />}
            </div>

            {/* Content */}
            <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-4'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">{meta.label}</span>
                <span className="text-xs text-slate-600">{meta.desc}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                  ${hasErr ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {hasErr ? 'error' : 'ok'}
                </span>
              </div>

              {/* Inline key outputs */}
              {!hasErr && tool === 'run_forecast' && output.forecast_30d && (
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                  <span>30d: <span className={output.trend_pct_change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    ${output.forecast_30d?.toLocaleString()}
                  </span></span>
                  <span>90d: <span className={output.trend_pct_change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    ${output.forecast_90d?.toLocaleString()}
                  </span></span>
                  <span className="capitalize">{output.trend_direction} <span className={output.trend_pct_change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {output.trend_pct_change > 0 ? '+' : ''}{output.trend_pct_change}%
                  </span></span>
                </div>
              )}
              {!hasErr && tool === 'run_price_prediction' && output.predicted_price && (
                <p className="text-xs text-slate-500 mt-1">
                  Fair value: <span className="text-blue-400">${output.predicted_price?.toLocaleString()}</span>
                </p>
              )}
              {!hasErr && tool === 'run_llm_price_analysis' && output.forecast_30d && (
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                  <span>30d: <span className="text-purple-400">${output.forecast_30d?.toLocaleString()}</span></span>
                  <span>90d: <span className="text-purple-400">${output.forecast_90d?.toLocaleString()}</span></span>
                  <span className="capitalize text-purple-400">{output.trend_direction}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    output.best_time_to_buy === 'now' ? 'bg-emerald-500/15 text-emerald-400' :
                    output.best_time_to_buy === 'wait' ? 'bg-red-500/15 text-red-400' :
                    'bg-slate-600/40 text-slate-400'
                  }`}>{output.best_time_to_buy?.replace('_', ' ')}</span>
                </div>
              )}
              {!hasErr && tool === 'get_market_context' && output.current_inventory_count !== undefined && (
                <div className="flex gap-3 mt-1 text-xs text-slate-500">
                  <span>Listings: <span className="text-white">{output.current_inventory_count}</span></span>
                  <span>vs median: <span className={output.price_vs_median_pct < 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {output.price_vs_median_pct > 0 ? '+' : ''}{output.price_vs_median_pct}%
                  </span></span>
                </div>
              )}
              {hasErr && <p className="text-xs text-red-400/80 mt-0.5 italic">{output.error}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AnalyzePage() {
  const [searchParams] = useSearchParams()

  const [cars,    setCars]    = useState([])
  const [form,    setForm]    = useState({
    make: '', model: '', year: '', mileage: 50000, condition: 'good', region: 'california',
  })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [stage,   setStage]   = useState(0)

  // Load car catalogue
  useEffect(() => { getCars().then(r => setCars(r.data)).catch(() => {}) }, [])

  // Pre-fill from URL params (Market page click-through)
  useEffect(() => {
    const make = searchParams.get('make')
    const model = searchParams.get('model')
    const year  = searchParams.get('year')
    if (make && model && year) {
      setForm(f => ({ ...f, make, model, year: +year }))
    }
  }, [searchParams])

  const makes  = useMemo(() => [...new Set(cars.map(c => c.make))].sort(), [cars])
  const models = useMemo(() =>
    [...new Set(cars.filter(c => c.make === form.make).map(c => c.model))].sort()
  , [cars, form.make])
  const years  = useMemo(() =>
    [...new Set(cars.filter(c => c.make === form.make && c.model === form.model).map(c => c.year))]
      .sort((a, b) => b - a)
  , [cars, form.make, form.model])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function analyze() {
    if (!form.make || !form.model || !form.year) return
    setLoading(true); setError(null); setResult(null); setStage(0)
    const timer = setInterval(() => setStage(s => Math.min(s + 1, ANALYSIS_STAGES.length - 1)), 2500)
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

  // Build chart data — prefer blended AI forecast over raw statistical
  const chartData = useMemo(() => {
    const hist = Array.isArray(result?.tool_outputs?.get_price_history)
      ? result.tool_outputs.get_price_history
      : []
    const fc = result?.tool_outputs?.run_forecast || {}
    // Use blended forecast from synthesize_recommendation when available
    const forecast30 = result?.forecast_30d || fc.forecast_30d
    const forecast90 = result?.forecast_90d || fc.forecast_90d
    const pts = hist.map(h => ({ date: h.date, historical: h.avg_price, forecast: null }))
    if (fc.last_known_price && (forecast30 || forecast90)) {
      if (pts.length) pts[pts.length - 1].forecast = pts[pts.length - 1].historical
      pts.push({ date: 'Now',  historical: null, forecast: fc.last_known_price })
      pts.push({ date: '+30d', historical: null, forecast: forecast30 })
      pts.push({ date: '+90d', historical: null, forecast: forecast90 })
    }
    return pts
  }, [result])

  const rec         = result?.recommendation
  const conf        = result?.confidence
  const shap        = result?.tool_outputs?.run_price_prediction?.shap_factors || []
  const mktCtx      = result?.tool_outputs?.get_market_context
  const fc          = result?.tool_outputs?.run_forecast
  const llmAnalysis = result?.tool_outputs?.run_llm_price_analysis
  const forecastMethod = result?.forecast_method || fc?.method
  const sigCfg = SIG_CFG[rec] || SIG_CFG.NEUTRAL
  const SigIcon = sigCfg.Icon

  const shapChartData = shap
    .map(f => ({ name: f.feature.replace(/_/g, ' '), impact: Math.abs(f.impact), dir: f.direction }))
    .sort((a, b) => b.impact - a.impact)

  const confPct = conf === 'HIGH' ? 90 : conf === 'MODERATE' ? 60 : 30

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
            GPT-4o-mini · XGBoost · Prophet · AI-Blended Forecast
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-1">
            AI Car Price <span className="text-blue-400">Intelligence</span>
          </h1>
          <p className="text-slate-400 text-base mb-8 max-w-2xl">
            Data-driven BUY / WAIT signals backed by real market data,
            machine-learning price predictions, and transparent AI reasoning.
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

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-xl animate-fade-in">
            <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Analysis Failed</p>
              <p className="text-red-300/80 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-8 space-y-4 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-44 bg-slate-800 rounded-2xl" />
              <div className="col-span-2 grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-800 rounded-2xl" />)}
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

            {/* Row 1: Signal + 4 stat cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Signal */}
              <div className={`bg-gradient-to-br ${sigCfg.grad} rounded-2xl p-6 text-white shadow-2xl ${sigCfg.shadow}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/65 text-xs font-semibold uppercase tracking-widest">AI Recommendation</p>
                    <p className="text-6xl font-black mt-2 tracking-tight leading-none">{rec}</p>
                    <p className="text-white/80 text-sm mt-2">{sigCfg.label}</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <SigIcon size={26} />
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-white/65 mb-1.5">
                    <span>Confidence</span>
                    <span className="font-bold text-white">{conf}</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-2 bg-white rounded-full transition-all duration-1000" style={{ width: `${confPct}%` }} />
                  </div>
                </div>
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
                    icon: TrendingUp, label: '30-Day Forecast', color: fc && !fc.error
                      ? (fc.trend_pct_change >= 0 ? 'text-emerald-400' : 'text-red-400')
                      : 'text-slate-500',
                    value: fc && !fc.error
                      ? <>{fc.trend_pct_change > 0 ? '+' : ''}{fc.trend_pct_change}%</>
                      : 'N/A',
                    sub: fc && !fc.error
                      ? `${fc.trend_direction} · ${
                          fc.method === 'prophet'     ? 'Prophet model' :
                          fc.method === 'linear'      ? 'Linear extrapolation' :
                          fc.method === 'market_avg'  ? 'Market-wide trend' :
                          'Estimated'
                        }`
                      : 'Insufficient data',
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

            {/* Row 2: Chart + AI Explanation */}
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
                      {forecastMethod === 'llm_blended'      ? '✦ AI-Enhanced Forecast' :
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
                  <ResponsiveContainer width="100%" height={260}>
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
                  <div className="flex flex-col items-center justify-center h-52 text-slate-600 gap-3">
                    <Activity size={36} className="opacity-30" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-500">No model-specific price history</p>
                      <p className="text-xs mt-1 text-slate-600">Forecast based on market-wide trend · XGBoost prediction is still accurate</p>
                    </div>
                  </div>
                )}

                {fc?.seasonality_note && (
                  <p className="text-xs text-slate-600 mt-3 italic">{fc.seasonality_note}</p>
                )}
              </div>

              {/* AI Explanation */}
              <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={17} className="text-blue-400" />
                  <h3 className="text-white font-semibold">AI Analyst Reasoning</h3>
                  {forecastMethod === 'llm_blended' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 font-semibold">AI Enhanced</span>
                  )}
                </div>

                <div className="bg-slate-900/60 border-l-2 border-blue-500 pl-4 py-3 rounded-r-lg mb-3 flex-1">
                  <p className="text-slate-300 text-sm leading-relaxed italic">{result.explanation}</p>
                </div>

                {/* LLM key insight */}
                {llmAnalysis?.key_insight && !llmAnalysis?.error && (
                  <div className="bg-purple-500/8 border border-purple-500/20 rounded-lg px-4 py-2.5 mb-4 flex gap-2 items-start">
                    <Sparkles size={11} className="text-purple-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-purple-300/90 leading-relaxed">
                      <span className="font-semibold text-purple-400">AI Insight: </span>
                      {llmAnalysis.key_insight}
                    </p>
                  </div>
                )}

                {/* Forecast comparison row */}
                {result.forecast_30d > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">30-Day Forecast</p>
                      <p className="text-lg font-bold text-emerald-400">${Number(result.forecast_30d).toLocaleString()}</p>
                      {forecastMethod === 'llm_blended' && <p className="text-[9px] text-purple-400 mt-0.5">AI Blended</p>}
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">90-Day Forecast</p>
                      <p className="text-lg font-bold text-emerald-300">${Number(result.forecast_90d).toLocaleString()}</p>
                      {forecastMethod === 'llm_blended' && <p className="text-[9px] text-purple-400 mt-0.5">AI Blended</p>}
                    </div>
                  </div>
                )}

                {shap.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      Top Price Factors (SHAP)
                    </p>
                    <div className="space-y-2.5">
                      {shap.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0
                            ${f.direction === 'increases price' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span className="text-xs text-slate-400 flex-1 capitalize">
                            {f.feature.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-xs font-bold
                            ${f.direction === 'increases price' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {f.direction === 'increases price' ? '+' : '-'}{Math.abs(f.impact).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: SHAP bar chart + Agent timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* SHAP bar chart */}
              {shapChartData.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-1">ML Price Factor Breakdown</h3>
                  <p className="text-slate-500 text-xs mb-4">
                    SHAP values — how each feature shifts the price prediction
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

              {/* Agent execution trace */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-5">Agent Execution Trace</h3>
                <AgentTimeline toolOutputs={result.tool_outputs} />
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
              AI analysis takes ~10 seconds and returns a BUY / WAIT / NEUTRAL signal with detailed reasoning
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
