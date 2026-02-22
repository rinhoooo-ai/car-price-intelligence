import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Cell, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Target,
  Thermometer, ArrowRight, AlertCircle, RefreshCw,
  Sparkles, Database, MapPin, BarChart2, Info,
} from 'lucide-react'
import { getMarketOverview, seedMarket } from '../api'
import { US_STATE_DATA } from '../data/usMapData'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ── Manufacturer color palette ────────────────────────────────────────────────
const MAKE_COLORS = {
  ford:       '#3b82f6',  // blue
  chevrolet:  '#ef4444',  // red
  toyota:     '#10b981',  // emerald
  honda:      '#f97316',  // orange
  gmc:        '#eab308',  // yellow
  ram:        '#8b5cf6',  // purple
  nissan:     '#06b6d4',  // cyan
  jeep:       '#f59e0b',  // amber
  subaru:     '#6366f1',  // indigo
  hyundai:    '#ec4899',  // pink
  dodge:      '#84cc16',  // lime
  kia:        '#14b8a6',  // teal
  bmw:        '#a78bfa',  // violet
  default:    '#64748b',  // slate
}
const makeColor = (make) => MAKE_COLORS[(make || '').toLowerCase()] || MAKE_COLORS.default

// TopoJSON state name → our 2-letter abbr
const nameToAbbr = Object.entries(US_STATE_DATA).reduce((acc, [abbr, d]) => {
  acc[d.name] = abbr
  return acc
}, {})

// All makes that appear as top_make in any state (for legend)
const TOP_MAKES = [...new Set(Object.values(US_STATE_DATA).map(d => d.top_make))].sort()

// ── Helper sub-components ────────────────────────────────────────────────────
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

// ── US Map Component ──────────────────────────────────────────────────────────
function USManufacturerMap({ onStateSelect, selectedState }) {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, abbr: null })

  const handleMouseEnter = useCallback((geo, evt) => {
    const abbr = nameToAbbr[geo.properties.name]
    if (!abbr) return
    setTooltip({ visible: true, x: evt.clientX, y: evt.clientY, abbr })
  }, [])

  const handleMouseMove = useCallback((evt) => {
    setTooltip(t => ({ ...t, x: evt.clientX, y: evt.clientY }))
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }))
  }, [])

  const handleClick = useCallback((geo) => {
    const abbr = nameToAbbr[geo.properties.name]
    if (abbr) onStateSelect(abbr === selectedState ? null : abbr)
  }, [onStateSelect, selectedState])

  const ttData = tooltip.abbr ? US_STATE_DATA[tooltip.abbr] : null

  return (
    <div className="relative select-none">
      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography="/states-10m.json">
          {({ geographies }) =>
            geographies.map(geo => {
              const abbr    = nameToAbbr[geo.properties.name]
              const stData  = abbr ? US_STATE_DATA[abbr] : null
              const topMake = stData?.top_make
              const color   = topMake ? makeColor(topMake) : '#1e293b'
              const isSelected = abbr === selectedState

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isSelected ? '#ffffff' : color}
                  fillOpacity={isSelected ? 1 : 0.75}
                  stroke={isSelected ? '#ffffff' : '#0f172a'}
                  strokeWidth={isSelected ? 2 : 0.5}
                  style={{
                    default:  { outline: 'none', cursor: 'pointer' },
                    hover:    { outline: 'none', fillOpacity: 1, strokeWidth: 1.5, stroke: '#e2e8f0' },
                    pressed:  { outline: 'none' },
                  }}
                  onMouseEnter={e => handleMouseEnter(geo, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleClick(geo)}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Floating tooltip */}
      {tooltip.visible && ttData && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900 border border-slate-600 rounded-xl shadow-2xl p-3 text-xs min-w-44"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10, transform: 'translateY(-100%)' }}
        >
          <p className="font-bold text-white text-sm mb-1">{ttData.name}</p>
          <p className="text-slate-400 mb-2">
            Avg price: <span className="text-blue-400 font-semibold">${ttData.avg_price.toLocaleString()}</span>
            <span className="text-slate-600 ml-2">·</span>
            <span className="text-slate-400 ml-2">{ttData.total_listings.toLocaleString()} listings</span>
          </p>
          <p className="text-slate-500 text-[10px] uppercase font-semibold tracking-wide mb-1">Top Manufacturers</p>
          {ttData.top3.map((m, i) => (
            <div key={i} className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: makeColor(m.make) }} />
              <span className="capitalize text-slate-300 flex-1">{m.make}</span>
              <span className="text-slate-500">{m.count.toLocaleString()}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">${m.avg_price.toLocaleString()}</span>
            </div>
          ))}
          <p className="text-slate-600 text-[10px] mt-2">Click to explore in playground ↓</p>
        </div>
      )}

      {/* Color legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {TOP_MAKES.map(make => (
          <div key={make} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: makeColor(make) }} />
            <span className="text-xs text-slate-400 capitalize">{make}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── State Playground Component ────────────────────────────────────────────────
function StatePlayground({ initialState }) {
  const [selState, setSelState]  = useState(initialState || '')
  const [selMake,  setSelMake]   = useState('')

  // Sync if parent passes a new state via map click
  useEffect(() => {
    if (initialState) {
      setSelState(initialState)
      setSelMake('')
    }
  }, [initialState])

  const sortedStates = Object.entries(US_STATE_DATA)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))

  const stateData  = selState ? US_STATE_DATA[selState] : null
  const top3       = stateData?.top3 || []
  const makes      = top3.map(m => m.make)

  // Chart data
  const priceData = top3.map(m => ({
    name: m.make.charAt(0).toUpperCase() + m.make.slice(1),
    avg_price: m.avg_price,
    listings:  m.count,
    fill:      makeColor(m.make),
  }))

  const filteredMake = selMake ? top3.find(m => m.make === selMake) : null

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
            <MapPin size={10} className="inline mr-1" />State
          </label>
          <select
            value={selState}
            onChange={e => { setSelState(e.target.value); setSelMake('') }}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select a state…</option>
            {sortedStates.map(([abbr, d]) => (
              <option key={abbr} value={abbr}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-44">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">
            <BarChart2 size={10} className="inline mr-1" />Manufacturer (optional filter)
          </label>
          <select
            value={selMake}
            onChange={e => setSelMake(e.target.value)}
            disabled={!selState}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-40"
          >
            <option value="">All top 3</option>
            {makes.map(m => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {!stateData && (
        <div className="flex flex-col items-center justify-center h-52 text-slate-600 gap-3">
          <MapPin size={36} className="opacity-20" />
          <p className="text-sm">Select a state or click the map to explore</p>
        </div>
      )}

      {/* State data */}
      {stateData && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'State', value: stateData.name, sub: selState.toUpperCase() },
              { label: 'Avg Price', value: `$${stateData.avg_price.toLocaleString()}`, sub: 'All makes avg' },
              { label: 'Total Listings', value: stateData.total_listings.toLocaleString(), sub: 'Active inventory' },
              { label: 'Top Manufacturer', value: stateData.top_make.charAt(0).toUpperCase() + stateData.top_make.slice(1), sub: 'Most listings' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-bold text-white mt-0.5">{value}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Average Price by Make */}
            <div>
              <p className="text-sm font-semibold text-white mb-3">
                Avg Price by Manufacturer
                {filteredMake && (
                  <span className="ml-2 text-xs text-slate-400">· highlighting {filteredMake.make}</span>
                )}
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priceData} margin={{ left: 8, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <ReTooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
                    labelStyle={{ color: '#e2e8f0' }}
                    formatter={v => [`$${Number(v).toLocaleString()}`, 'Avg Price']}
                  />
                  <Bar dataKey="avg_price" radius={[5, 5, 0, 0]}>
                    {priceData.map((d, i) => (
                      <Cell key={i}
                        fill={d.fill}
                        fillOpacity={!selMake || d.name.toLowerCase() === selMake ? 1 : 0.25}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Listing Count by Make */}
            <div>
              <p className="text-sm font-semibold text-white mb-3">Listing Count by Manufacturer</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priceData} margin={{ left: 8, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <ReTooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
                    labelStyle={{ color: '#e2e8f0' }}
                    formatter={v => [Number(v).toLocaleString(), 'Listings']}
                  />
                  <Bar dataKey="listings" radius={[5, 5, 0, 0]}>
                    {priceData.map((d, i) => (
                      <Cell key={i}
                        fill={d.fill}
                        fillOpacity={!selMake || d.name.toLowerCase() === selMake ? 0.8 : 0.2}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top-3 make breakdown cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {top3.map((m, i) => {
              const pct = stateData.total_listings > 0
                ? Math.round((m.count / stateData.total_listings) * 100)
                : 0
              const isFiltered = selMake && m.make !== selMake
              return (
                <div key={m.make}
                  className={`rounded-xl border p-4 transition-all cursor-pointer
                    ${selMake === m.make ? 'border-blue-500/50 bg-blue-500/8' : 'border-slate-700/40 bg-slate-900/40'}
                    ${isFiltered ? 'opacity-30' : ''}`}
                  onClick={() => setSelMake(selMake === m.make ? '' : m.make)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: makeColor(m.make) }} />
                    <span className="text-sm font-bold text-white capitalize">#{i+1} {m.make}</span>
                  </div>
                  <p className="text-xl font-extrabold text-white">${m.avg_price.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.count.toLocaleString()} listings · {pct}% of state</p>
                  <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: makeColor(m.make) }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MarketPage() {
  const [data,          setData]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [seeding,       setSeeding]       = useState(false)
  const [selectedState, setSelectedState] = useState(null)
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
  // Clamp MoM to ±15% before computing heat score to prevent extreme values
  const momClamped = Math.max(-15, Math.min(15, data.mom_change_pct ?? 0))
  const heatScore  = Math.min(100, Math.max(0, Math.round(50 + momClamped * 3)))
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
                {data.price_source === 'predictions' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium ml-1">
                    Live
                  </span>
                )}
                {data.price_source === 'industry' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600/40 text-slate-400 border border-slate-600/40 font-medium ml-1">
                    Baseline
                  </span>
                )}
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

        {/* ── US Map: Top Manufacturer by State ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin size={18} className="text-blue-400" />
                Top Manufacturer by State
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                State colored by most-listed manufacturer · Hover for details · Click to explore in playground
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-700/40 px-3 py-1.5 rounded-lg">
              <Info size={11} />
              {Object.keys(US_STATE_DATA).length} states · 328k+ listings
            </div>
          </div>

          <div className="mt-4">
            <USManufacturerMap
              onStateSelect={setSelectedState}
              selectedState={selectedState}
            />
          </div>
        </div>

        {/* ── State Playground ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-5">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart2 size={18} className="text-emerald-400" />
                State Market Playground
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Select a state (or click the map above) to explore top manufacturers, prices, and inventory
              </p>
            </div>
          </div>
          <StatePlayground initialState={selectedState} />
        </div>

        {/* ── Seasonality chart (compact) ── */}
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
            Average listing price by calendar month ·&nbsp;
            <span className="text-blue-400">Blue</span> = cheapest &nbsp;·&nbsp;
            <span className="text-red-400">Red</span> = most expensive
          </p>

          {data.seasonality_data?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.seasonality_data.map(s => ({ ...s, name: MONTH_NAMES[s.month] ?? s.month }))}
                margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <ReTooltip
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
