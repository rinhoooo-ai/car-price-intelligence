import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Target,
  Thermometer, ArrowRight, AlertCircle, RefreshCw,
  Sparkles, Database,
} from 'lucide-react'
import { getMarketOverview, seedMarket } from '../api'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function AnimatedCounter({ end, prefix = '', suffix = '', duration = 1500 }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!end) return
    let cur = 0
    const step = end / (duration / 16)
    const t = setInterval(() => {
      cur += step
      if (cur >= end) { setCount(end); clearInterval(t) }
      else setCount(Math.floor(cur))
    }, 16)
    return () => clearInterval(t)
  }, [end, duration])
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>
}

function seasonColor(value, min, max) {
  const ratio = max === min ? 0.5 : (value - min) / (max - min)
  const r = Math.round(59  + ratio * (239 - 59))
  const g = Math.round(130 + ratio * (68  - 130))
  const b = Math.round(246 + ratio * (68  - 246))
  return `rgb(${r},${g},${b})`
}

function ForecastBadge({ method }) {
  if (!method) return null
  const cfg = {
    llm_blended:      { label: 'AI Enhanced', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
    statistical:      { label: 'Statistical',  cls: 'bg-blue-500/15   text-blue-400   border-blue-500/20'   },
    prophet:          { label: 'Prophet',      cls: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' },
    linear:           { label: 'Extrapolated', cls: 'bg-amber-500/15  text-amber-400  border-amber-500/20'  },
    market_avg:       { label: 'Market Avg',   cls: 'bg-cyan-500/15   text-cyan-400   border-cyan-500/20'   },
    industry_default: { label: 'Industry Est', cls: 'bg-slate-500/15  text-slate-400  border-slate-500/20'  },
  }
  const { label, cls } = cfg[method] || { label: method, cls: 'bg-slate-500/15 text-slate-400 border-slate-500/20' }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls}`}>{label}</span>
  )
}

export default function MarketPage() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [seeding,    setSeeding]    = useState(false)
  const navigate = useNavigate()

  function loadMarket() {
    setLoading(true); setError(null)
    getMarketOverview()
      .then(r => setData(r.data))
      .catch(e => {
        const msg = e.response?.data?.error || e.response?.data?.detail || e.message
        setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
      })
      .finally(() => setLoading(false))
  }

  useEffect(loadMarket, [])

  async function handleReseed() {
    setSeeding(true)
    try {
      await seedMarket()
      await loadMarket()
    } catch (e) {
      console.error('Seed failed', e)
    } finally {
      setSeeding(false)
    }
  }

  if (loading) return (
    <div className="pt-8 max-w-7xl mx-auto px-6 animate-pulse space-y-6">
      <div className="h-52 bg-slate-800 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-36 bg-slate-800 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-slate-800 rounded-2xl" />
    </div>
  )

  if (error) return (
    <div className="pt-8 max-w-7xl mx-auto px-6">
      <div className="flex items-start gap-3 p-5 bg-red-500/10 border border-red-500/25 rounded-2xl">
        <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-red-400 font-semibold">Failed to load market data</p>
          <p className="text-red-300/70 text-sm mt-1">{error}</p>
        </div>
      </div>
    </div>
  )

  if (!data) return null

  const seasonMin  = Math.min(...(data.seasonality_data?.map(s => s.avg_price) ?? [0]))
  const seasonMax  = Math.max(...(data.seasonality_data?.map(s => s.avg_price) ?? [1]))
  const heatScore  = Math.min(100, Math.max(0, Math.round(50 + (data.mom_change_pct ?? 0) * 5)))
  const isHot      = heatScore > 65
  const isCool     = heatScore < 35
  const heatColor  = isHot ? 'text-red-400' : isCool ? 'text-blue-400' : 'text-amber-400'
  const heatBarClr = isHot ? 'bg-red-500'   : isCool ? 'bg-blue-500'   : 'bg-amber-500'
  const heatLabel  = isHot ? "Hot — seller's market" : isCool ? "Cool — buyer's market" : "Balanced market"
  const hasSeedData = data.top_buys?.some(b => b.is_seed)

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-extrabold text-white mb-2">
            Market <span className="text-blue-400">Overview</span>
          </h1>
          <p className="text-slate-400 text-base mb-8 max-w-2xl">
            Real-time car market signals · Craigslist listing snapshot · Updated {data.updated_at}
          </p>

          {/* Hero stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Avg Price */}
            <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-6">
              <p className="text-slate-400 text-sm mb-1 flex items-center gap-1.5">
                <DollarSign size={13} /> Avg Market Price
              </p>
              <p className="text-4xl font-extrabold text-white">
                $<AnimatedCounter end={Math.round(data.avg_price_this_month || 0)} />
              </p>
              <p className={`text-sm font-semibold mt-1.5 flex items-center gap-1
                ${data.mom_change_pct > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {data.mom_change_pct > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {data.mom_change_pct > 0 ? '+' : ''}{data.mom_change_pct}% vs last month
              </p>
            </div>

            {/* Heat score */}
            <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-6">
              <p className="text-slate-400 text-sm mb-1 flex items-center gap-1.5">
                <Thermometer size={13} /> Market Heat Score
              </p>
              <p className={`text-4xl font-extrabold ${heatColor}`}>
                <AnimatedCounter end={heatScore} suffix="/100" />
              </p>
              <div className="mt-2.5 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-2 rounded-full ${heatBarClr} transition-all duration-1000`}
                  style={{ width: `${heatScore}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1">{heatLabel}</p>
            </div>

            {/* Buy opportunities */}
            <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-6">
              <p className="text-slate-400 text-sm mb-1 flex items-center gap-1.5">
                <Target size={13} /> Buy Opportunities
              </p>
              <p className="text-4xl font-extrabold text-emerald-400">
                <AnimatedCounter end={data.top_buys?.length ?? 0} />
              </p>
              <p className="text-slate-500 text-xs mt-1.5">vehicles with active BUY signal</p>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8 pb-12">

        {/* ── Best Buys table ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/60 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-white">Best Buy Opportunities</h2>
              <p className="text-slate-400 text-sm mt-0.5">
                Click any row to run a full AI analysis · Sorted by lowest predicted price
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasSeedData && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-700/50 px-3 py-1.5 rounded-lg">
                  <Database size={11} />
                  Includes pre-seeded data · Run analyses to add real results
                </div>
              )}
              <button
                onClick={handleReseed}
                disabled={seeding}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={11} className={seeding ? 'animate-spin' : ''} />
                {seeding ? 'Seeding…' : 'Refresh Seeds'}
              </button>
            </div>
          </div>

          {data.top_buys?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/40">
                  {['Make', 'Model', 'Year', 'Predicted', '30d Forecast', '90d Forecast', 'Method', 'Signal', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {data.top_buys.map((row, i) => (
                  <tr
                    key={i}
                    onClick={() => navigate(`/?make=${row.make}&model=${row.model}&year=${row.year}`)}
                    className="hover:bg-slate-700/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-4 font-semibold text-white capitalize">{row.make}</td>
                    <td className="px-4 py-4 text-slate-300 capitalize">{row.model}</td>
                    <td className="px-4 py-4 text-slate-300">{row.year}</td>
                    <td className="px-4 py-4 font-bold text-blue-400">
                      {row.predicted_price ? `$${Number(row.predicted_price).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-emerald-400 font-medium">
                      {row.forecast_30d ? `$${Number(row.forecast_30d).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-emerald-300 font-medium">
                      {row.forecast_90d ? `$${Number(row.forecast_90d).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <ForecastBadge method={row.forecast_method} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                        BUY
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <ArrowRight size={15} className="text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-14 text-center text-slate-500 text-sm">
              <Target size={32} className="mx-auto mb-3 opacity-20" />
              <p>No BUY signals found.</p>
              <button
                onClick={handleReseed}
                disabled={seeding}
                className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Sparkles size={12} />
                {seeding ? 'Seeding…' : 'Populate with Pre-computed Signals'}
              </button>
            </div>
          )}
        </div>

        {/* ── AI Key Insights strip ── */}
        {data.top_buys?.some(b => b.llm_key_insight) && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-purple-400" />
              <h2 className="text-lg font-bold text-white">AI Market Insights</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20 font-semibold">GPT-4o-mini</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.top_buys.filter(b => b.llm_key_insight).slice(0, 4).map((b, i) => (
                <div key={i} className="flex gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/40">
                  <div className="w-1.5 rounded-full bg-purple-500/60 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white capitalize mb-0.5">
                      {b.year} {b.make} {b.model}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">{b.llm_key_insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Seasonality chart ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">Best Months to Buy</h2>
            {data.seasonality_source === 'industry' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-600/40 text-slate-400 border border-slate-600/40 font-medium">
                Industry averages · No DB data yet
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Average listing price by calendar month across all vehicles ·&nbsp;
            <span className="text-blue-400">Blue</span> = cheapest &nbsp;·&nbsp;
            <span className="text-red-400">Red</span> = most expensive
          </p>

          {data.seasonality_data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data.seasonality_data.map(s => ({ ...s, name: MONTH_NAMES[s.month] ?? s.month }))}
                margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={v => [`$${Number(v).toLocaleString()}`, 'Avg Price']}
                />
                <Bar dataKey="avg_price" radius={[5, 5, 0, 0]}>
                  {data.seasonality_data.map((s, i) => (
                    <Cell key={i} fill={seasonColor(s.avg_price, seasonMin, seasonMax)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
              No seasonality data available
            </div>
          )}

          <p className="text-xs text-slate-600 mt-4 border-t border-slate-700/40 pt-3">
            {data.seasonality_source === 'industry'
              ? 'Source: US used-car market industry averages — populate DB with listings for real data'
              : `Source: Craigslist listings snapshot · ${data.updated_at}`
            }
          </p>
        </div>

      </div>
    </div>
  )
}
