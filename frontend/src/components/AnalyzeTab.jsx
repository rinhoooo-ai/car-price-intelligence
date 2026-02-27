import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { getCars, getPrediction } from '../api'
import { useApp } from '../App'

const BADGE = { BUY: 'bg-emerald-500', WAIT: 'bg-red-500', NEUTRAL: 'bg-amber-500' }
const CONF_VAL = { HIGH: 90, MODERATE: 60, LOW: 30 }
const TOOL_META = {
  get_price_history:        { icon: '📊', label: 'Price History' },
  run_forecast:             { icon: '📈', label: 'Market Forecast' },
  run_price_prediction:     { icon: '🎯', label: 'ML Prediction' },
  get_market_context:       { icon: '🏪', label: 'Market Context' },
  synthesize_recommendation:{ icon: '⚖️', label: 'Recommendation' },
}
const CONDITIONS = ['excellent', 'good', 'fair', 'salvage']
const REGIONS    = ['california', 'texas', 'florida', 'new york', 'illinois', 'ohio', 'georgia']

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 mt-6">
      {[32, 48, 64].map(h => (
        <div key={h} className={`h-${h} bg-slate-200 rounded-xl`} />
      ))}
    </div>
  )
}

export default function AnalyzeTab() {
  const { pendingCar, setPendingCar } = useApp()

  const [cars,    setCars]    = useState([])
  const [form,    setForm]    = useState({ make:'', model:'', year:'', mileage:50000, condition:'good', region:'california' })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [expanded,setExpanded]= useState({})

  // Load car catalogue once
  useEffect(() => { getCars().then(r => setCars(r.data)) }, [])

  // Pre-populate from MarketOverview click
  useEffect(() => {
    if (!pendingCar) return
    setForm(f => ({ ...f, ...pendingCar }))
    setPendingCar(null)
    setTimeout(() => document.getElementById('analyze-btn')?.click(), 100)
  }, [pendingCar, setPendingCar])

  const makes  = useMemo(() => [...new Set(cars.map(c => c.make))].sort(), [cars])
  const models = useMemo(() =>
    [...new Set(cars.filter(c => c.make === form.make).map(c => c.model))].sort()
  , [cars, form.make])
  const years  = useMemo(() =>
    [...new Set(cars.filter(c => c.make === form.make && c.model === form.model).map(c => c.year))]
      .sort((a,b) => b - a)
  , [cars, form.make, form.model])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function analyze() {
    if (!form.make || !form.model || !form.year) return
    setLoading(true); setError(null); setResult(null)
    try {
      const { data } = await getPrediction({ ...form, year: +form.year })
      setResult(data)
    } catch(e) {
      setError(e.response?.data?.detail || e.message)
    } finally { setLoading(false) }
  }

  // Build chart data from tool outputs
  const chartData = useMemo(() => {
    const hist = result?.tool_outputs?.get_price_history || []
    const fc   = result?.tool_outputs?.run_forecast || {}
    const data = hist.map(h => ({ date: h.date, historical: h.avg_price, forecast: null }))
    if (!fc.error && fc.last_known_price) {
      if (data.length) data[data.length-1].forecast = data[data.length-1].historical
      data.push({ date: 'Now',  historical: null, forecast: fc.last_known_price })
      data.push({ date: '+30d', historical: null, forecast: fc.forecast_30d })
      data.push({ date: '+90d', historical: null, forecast: fc.forecast_90d })
    }
    return data
  }, [result])

  const rec   = result?.recommendation
  const conf  = result?.confidence
  const shap  = result?.tool_outputs?.run_price_prediction?.shap_factors || []
  const mktCtx= result?.tool_outputs?.get_market_context
  const fc    = result?.tool_outputs?.run_forecast

  return (
    <div>
      {/* ── Form ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-4 text-lg">Analyze a Vehicle</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Make */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Make</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={form.make} onChange={e => { set('make', e.target.value); set('model',''); set('year','') }}>
              <option value="">Select make</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {/* Model */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Model</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={form.model} onChange={e => { set('model', e.target.value); set('year','') }} disabled={!form.make}>
              <option value="">Select model</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {/* Year */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Year</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={form.year} onChange={e => set('year', e.target.value)} disabled={!form.model}>
              <option value="">Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* Mileage */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Mileage</label>
            <input type="number" min={0} max={300000} step={1000}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={form.mileage} onChange={e => set('mileage', +e.target.value)} />
          </div>
          {/* Condition */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Condition</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={form.condition} onChange={e => set('condition', e.target.value)}>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* Region */}
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Region</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={form.region} onChange={e => set('region', e.target.value)}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <button id="analyze-btn" onClick={analyze} disabled={loading || !form.make || !form.model || !form.year}
          className="mt-4 px-8 py-2.5 bg-indigo-600 text-slate-900 rounded-lg font-semibold text-sm
            hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {loading ? 'Analyzing…' : 'Analyze Now'}
        </button>
      </div>

      {error && <div className="mt-4 bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 text-sm">{error}</div>}
      {loading && <Skeleton />}

      {/* ── Results ── */}
      {result && !loading && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Recommendation + stats */}
          <div className="lg:col-span-2 space-y-4">
            {/* Badge */}
            <div className={`${BADGE[rec] ?? 'bg-slate-500'} rounded-2xl p-6 text-slate-900 text-center shadow-lg`}>
              <div className="text-5xl font-black tracking-wider">{rec}</div>
              <div className="text-slate-900/80 text-sm mt-1 font-medium">{conf} confidence</div>
              {/* Confidence bar */}
              <div className="mt-3 bg-white/20 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all"
                  style={{ width: `${CONF_VAL[conf] ?? 50}%` }} />
              </div>
            </div>

            {/* Forecast grid */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-700 text-sm mb-3">Price Snapshot</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Predicted Price', value: `$${result.predicted_price?.toLocaleString()}`, sub: 'XGBoost model', color: 'text-indigo-600' },
                  { label: 'Inventory',       value: mktCtx?.current_inventory_count ?? '—', sub: `${mktCtx?.inventory_trend ?? ''} trend`, color: 'text-slate-700' },
                  { label: '30d Forecast',    value: fc?.error ? 'N/A' : `$${fc?.forecast_30d?.toLocaleString() ?? '—'}`, sub: fc?.trend_direction ?? '', color: fc?.trend_pct_change > 0 ? 'text-emerald-600' : 'text-red-500' },
                  { label: 'vs Market',       value: mktCtx ? `${mktCtx.price_vs_median_pct > 0 ? '+' : ''}${mktCtx.price_vs_median_pct}%` : '—', sub: 'vs median', color: mktCtx?.price_vs_median_pct < 0 ? 'text-emerald-600' : 'text-red-500' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-3">
                    <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                    <div className="text-xs text-slate-600">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why + SHAP */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-700 text-sm mb-2">Why?</h3>
              <p className="text-slate-600 text-sm italic leading-relaxed">{result.explanation}</p>
              {shap.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {shap.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${f.direction === 'increases price' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                      <span className="text-slate-700">
                        <strong>{f.feature.replace(/_/g,' ')}</strong>
                        {' '}<span className={`text-xs font-medium ${f.direction === 'increases price' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {f.direction}
                        </span>
                        {' '}<span className="text-slate-600">(impact {f.impact})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right: Chart + Agent Steps */}
          <div className="lg:col-span-3 space-y-4">
            {/* Price chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-700 text-sm mb-3">Price History & Forecast</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => v ? `$${(v/1000).toFixed(0)}k` : ''} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n) => v ? [`$${Number(v).toLocaleString()}`, n] : [null, null]} />
                    <Legend />
                    {chartData.some(d => d.historical) && (
                      <ReferenceLine x="Now" stroke="#94a3b8" strokeDasharray="4 4" label={{ value:'Today', fontSize:10 }} />
                    )}
                    <Area type="monotone" dataKey="historical" stroke="#3b82f6" fill="#bfdbfe" fillOpacity={0.4} name="Historical avg" connectNulls={false} dot={false} />
                    <Line type="monotone" dataKey="forecast" stroke="#f97316" strokeDasharray="5 5" dot={{ r:4 }} name="Forecast" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-600 text-sm">No historical data for this vehicle</div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {fc?.method && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fc.method === 'prophet' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                    {fc.method === 'prophet' ? '📈 Prophet forecast' : '📐 Linear extrapolation'}
                  </span>
                )}
                {fc?.seasonality_note && (
                  <p className="text-xs text-slate-600 italic">{fc.seasonality_note}</p>
                )}
              </div>
            </div>

            {/* Agent Reasoning Steps */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-700 text-sm mb-3">Agent Reasoning Steps</h3>
              <div className="space-y-2">
                {Object.entries(result.tool_outputs || {}).map(([tool, output]) => {
                  const meta  = TOOL_META[tool] || { icon: '🔧', label: tool }
                  const isErr = output?.error
                  const open  = expanded[tool]
                  return (
                    <div key={tool} className="border border-slate-200 rounded-lg overflow-hidden">
                      <button onClick={() => setExpanded(e => ({ ...e, [tool]: !e[tool] }))}
                        className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                        <span className="text-base">{meta.icon}</span>
                        <span className="flex-1 text-sm font-medium text-slate-700">{meta.label}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isErr ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isErr ? 'error' : 'ok'}
                        </span>
                        <span className="text-slate-600 text-xs">{open ? '▲' : '▼'}</span>
                      </button>
                      {open && (
                        <pre className="px-4 py-3 bg-[#F5F0E8] text-slate-700 text-xs overflow-x-auto max-h-48 leading-relaxed">
                          {JSON.stringify(output, null, 2)}
                        </pre>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
