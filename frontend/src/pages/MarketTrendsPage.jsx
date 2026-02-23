import { useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Activity, Globe } from 'lucide-react'

// ── Fabricated but realistic market data ──────────────────────────────────────

const MONTHLY_PRICES = [
  { month: 'Jan 20', used: 17800, newCar: 38100 },
  { month: 'Feb 20', used: 18100, newCar: 38400 },
  { month: 'Mar 20', used: 17200, newCar: 37800 }, // COVID drop
  { month: 'Apr 20', used: 16400, newCar: 36900 },
  { month: 'May 20', used: 17100, newCar: 37600 },
  { month: 'Jun 20', used: 18400, newCar: 38500 },
  { month: 'Jul 20', used: 19200, newCar: 39100 },
  { month: 'Aug 20', used: 20100, newCar: 39800 },
  { month: 'Sep 20', used: 20800, newCar: 40100 },
  { month: 'Oct 20', used: 21400, newCar: 40600 },
  { month: 'Nov 20', used: 22100, newCar: 41200 },
  { month: 'Dec 20', used: 22800, newCar: 41800 },
  { month: 'Jan 21', used: 23600, newCar: 42400 }, // Supply crunch begins
  { month: 'Feb 21', used: 24400, newCar: 43100 },
  { month: 'Mar 21', used: 25100, newCar: 43800 },
  { month: 'Apr 21', used: 26200, newCar: 44600 },
  { month: 'May 21', used: 27100, newCar: 45400 }, // Near peak
  { month: 'Jun 21', used: 27800, newCar: 46100 },
  { month: 'Jul 21', used: 28200, newCar: 46800 }, // Peak
  { month: 'Aug 21', used: 27900, newCar: 47100 },
  { month: 'Sep 21', used: 27400, newCar: 47400 },
  { month: 'Oct 21', used: 26800, newCar: 47800 },
  { month: 'Nov 21', used: 26100, newCar: 48100 },
  { month: 'Dec 21', used: 25600, newCar: 48400 },
  { month: 'Jan 22', used: 25100, newCar: 48700 },
  { month: 'Feb 22', used: 24600, newCar: 48900 },
  { month: 'Mar 22', used: 24100, newCar: 49100 },
  { month: 'Jun 22', used: 23200, newCar: 49400 },
  { month: 'Sep 22', used: 22400, newCar: 49200 },
  { month: 'Dec 22', used: 21800, newCar: 48800 },
  { month: 'Mar 23', used: 21200, newCar: 48400 },
  { month: 'Jun 23', used: 20800, newCar: 47900 },
  { month: 'Sep 23', used: 20400, newCar: 47400 },
  { month: 'Dec 23', used: 20100, newCar: 46800 },
  { month: 'Mar 24', used: 19800, newCar: 46200 },
  { month: 'Jun 24', used: 19644, newCar: 45800 },
  { month: 'Sep 24', used: 19500, newCar: 45400 },
  { month: 'Dec 24', used: 19350, newCar: 45000 },
]

const REGIONAL_PRICES = [
  { region: 'California',     avg: 23500, change: +2.1, listings: 48200, color: '#6366f1' },
  { region: 'New York',       avg: 22100, change: +1.4, listings: 31400, color: '#8b5cf6' },
  { region: 'Florida',        avg: 21200, change: +1.8, listings: 42600, color: '#3b82f6' },
  { region: 'Texas',          avg: 20800, change: +0.6, listings: 56800, color: '#10b981' },
  { region: 'Washington',     avg: 21800, change: +1.2, listings: 18900, color: '#22c55e' },
  { region: 'Illinois',       avg: 19900, change: -0.4, listings: 24100, color: '#f59e0b' },
  { region: 'Georgia',        avg: 19100, change: -0.8, listings: 21300, color: '#f97316' },
  { region: 'Ohio',           avg: 18400, change: -1.1, listings: 19800, color: '#ec4899' },
  { region: 'Michigan',       avg: 17900, change: -0.6, listings: 17400, color: '#ef4444' },
  { region: 'Missouri',       avg: 17200, change: -1.4, listings: 14200, color: '#dc2626' },
]

const TOP_MAKES = [
  { make: 'Ford',       share: 18.2, avg_price: 24600, change: -1.2, color: '#3b82f6' },
  { make: 'Toyota',     share: 16.4, avg_price: 22800, change: +0.8, color: '#10b981' },
  { make: 'Chevrolet',  share: 13.8, avg_price: 21900, change: -0.4, color: '#f97316' },
  { make: 'Honda',      share: 11.6, avg_price: 19400, change: +1.4, color: '#ec4899' },
  { make: 'Nissan',     share:  8.2, avg_price: 17600, change: -0.6, color: '#8b5cf6' },
  { make: 'Jeep',       share:  6.1, avg_price: 26800, change: +2.1, color: '#f59e0b' },
  { make: 'GMC',        share:  5.4, avg_price: 27400, change: -0.8, color: '#22c55e' },
  { make: 'Hyundai',    share:  4.8, avg_price: 18100, change: +1.8, color: '#a78bfa' },
  { make: 'Ram',        share:  4.2, avg_price: 28200, change: -1.6, color: '#6366f1' },
  { make: 'Other',      share: 11.3, avg_price: 19800, change: +0.2, color: '#64748b' },
]

const SEGMENTS = [
  { segment: 'Trucks',     avg: 27500, share: 24, change: -1.8, color: '#f97316' },
  { segment: 'SUVs',       avg: 22800, share: 32, change: +0.6, color: '#3b82f6' },
  { segment: 'Sedans',     avg: 17200, share: 18, change: -0.9, color: '#10b981' },
  { segment: 'Compact',    avg: 15400, share: 14, change: +1.2, color: '#8b5cf6' },
  { segment: 'Luxury',     avg: 38600, share:  7, change: -2.4, color: '#f59e0b' },
  { segment: 'EVs',        avg: 31600, share:  5, change: -4.1, color: '#22c55e' },
]

const MAKE_TRENDS_12M = [
  { month: 'Jan', ford: 24100, toyota: 22200, honda: 18800, jeep: 25900 },
  { month: 'Feb', ford: 24200, toyota: 22400, honda: 18900, jeep: 26100 },
  { month: 'Mar', ford: 24300, toyota: 22600, honda: 19100, jeep: 26400 },
  { month: 'Apr', ford: 24400, toyota: 22700, honda: 19200, jeep: 26600 },
  { month: 'May', ford: 24500, toyota: 22750, honda: 19350, jeep: 26800 },
  { month: 'Jun', ford: 24550, toyota: 22800, honda: 19400, jeep: 26900 },
  { month: 'Jul', ford: 24580, toyota: 22820, honda: 19420, jeep: 26950 },
  { month: 'Aug', ford: 24600, toyota: 22850, honda: 19380, jeep: 26880 },
  { month: 'Sep', ford: 24580, toyota: 22830, honda: 19360, jeep: 26820 },
  { month: 'Oct', ford: 24560, toyota: 22810, honda: 19340, jeep: 26780 },
  { month: 'Nov', ford: 24540, toyota: 22800, honda: 19320, jeep: 26750 },
  { month: 'Dec', ford: 24600, toyota: 22800, honda: 19400, jeep: 26800 },
]

const chartStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 },
  labelStyle:   { color: '#e2e8f0' },
}

export default function MarketTrendsPage() {
  const [chartView, setChartView] = useState('both')

  const filteredMonthly = MONTHLY_PRICES.filter(d => {
    if (chartView === 'used')   return true
    if (chartView === 'new')    return true
    return true
  })

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <BarChart2 size={12} />
            Market Intelligence · 2020 – 2024 Analysis
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-1">
            Market <span className="text-blue-400">Trends</span>
          </h1>
          <p className="text-slate-400 text-base max-w-2xl">
            US used car market dynamics from COVID disruption through normalization.
            Regional breakdowns, segment analysis, and make-by-make trends.
          </p>

          {/* Hero metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Avg Used Car Price (2024)', value: '$19,644', sub: '↓ 30% from 2021 peak', color: 'text-blue-400' },
              { label: 'MoM Change (Dec 24)',        value: '-0.8%',   sub: 'Softening demand',    color: 'text-red-400'   },
              { label: 'Total Active Listings',      value: '4.2M',   sub: 'Nationwide inventory', color: 'text-emerald-400' },
              { label: 'Used vs New Spread',         value: '$25.4k', sub: 'New avg: $45,000',     color: 'text-purple-400' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-slate-300 text-xs font-medium mt-0.5">{sub}</p>
                <p className="text-slate-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Used vs New Price Chart ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="text-white font-bold text-lg">Used vs New Car Price Index (2020–2024)</h2>
              <p className="text-slate-400 text-sm">COVID supply crunch drove used prices to within $19k of new — historically unprecedented</p>
            </div>
            <div className="flex gap-2">
              {[
                { key: 'both', label: 'Both' },
                { key: 'used', label: 'Used Only' },
                { key: 'new',  label: 'New Only' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setChartView(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    chartView === opt.key
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={filteredMonthly} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="usedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} interval={3} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip {...chartStyle} formatter={v => [`$${Number(v).toLocaleString()}`, '']} />
              <ReferenceLine x="Jul 21" stroke="#ef4444" strokeDasharray="4 4"
                label={{ value: 'Peak', fontSize: 9, fill: '#ef4444', position: 'top' }} />
              {chartView !== 'new' && (
                <Area type="monotone" dataKey="used" stroke="#3b82f6" fill="url(#usedGrad)"
                  strokeWidth={2} name="Used car avg" dot={false} />
              )}
              {chartView !== 'used' && (
                <Area type="monotone" dataKey="newCar" stroke="#f97316" fill="url(#newGrad)"
                  strokeWidth={2} name="New car avg" dot={false} />
              )}
              <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Make Trends + Segments ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 12-month make trends */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-1">12-Month Price Trend by Make</h2>
            <p className="text-slate-400 text-sm mb-4">Jeep leads appreciation; Honda steady; Ford/Toyota stable</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={MAKE_TRENDS_12M} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} />
                <Tooltip {...chartStyle} formatter={v => [`$${Number(v).toLocaleString()}`, '']} />
                <Line type="monotone" dataKey="ford"   stroke="#3b82f6" strokeWidth={2} dot={false} name="Ford" />
                <Line type="monotone" dataKey="toyota" stroke="#10b981" strokeWidth={2} dot={false} name="Toyota" />
                <Line type="monotone" dataKey="honda"  stroke="#ec4899" strokeWidth={2} dot={false} name="Honda" />
                <Line type="monotone" dataKey="jeep"   stroke="#f59e0b" strokeWidth={2} dot={false} name="Jeep" />
                <Legend wrapperStyle={{ color: '#64748b', fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Segment prices */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-1">Price by Segment (Dec 2024)</h2>
            <p className="text-slate-400 text-sm mb-4">EVs still premium-priced; trucks remain highest ICE segment</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={SEGMENTS} layout="vertical" margin={{ left: 10, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis type="category" dataKey="segment" width={70} tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                <Tooltip {...chartStyle} formatter={v => [`$${Number(v).toLocaleString()}`, 'Avg price']} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {SEGMENTS.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Regional Market Heat ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={18} className="text-blue-400" />
            <h2 className="text-white font-bold text-lg">Regional Price Heat Map (Dec 2024)</h2>
          </div>
          <p className="text-slate-400 text-sm mb-5">
            California commands a $6,300 premium over Missouri — regional demand, regulations, and income levels drive disparity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ResponsiveContainer width="100%" height={480}>
              <BarChart data={REGIONAL_PRICES} layout="vertical" margin={{ left: 10, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#64748b' }} domain={[12000, 'auto']} />
                <YAxis type="category" dataKey="region" width={110} tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                <Tooltip {...chartStyle} formatter={v => [`$${Number(v).toLocaleString()}`, 'Avg price']} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {REGIONAL_PRICES.map((r, i) => <Cell key={i} fill={r.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="space-y-2 overflow-y-auto" style={{maxHeight: '480px'}}>
              {REGIONAL_PRICES.map(r => (
                <div key={r.region} className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span className="text-white text-sm flex-1">{r.region}</span>
                  <span className="text-slate-300 font-bold">${r.avg.toLocaleString()}</span>
                  <span className={`text-xs font-semibold w-12 text-right ${r.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {r.change > 0 ? '+' : ''}{r.change}%
                  </span>
                  <span className="text-slate-600 text-xs">{(r.listings/1000).toFixed(1)}k</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Top Makes Market Share ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-1">Market Share by Make (Dec 2024)</h2>
          <p className="text-slate-400 text-sm mb-5">Ford leads with 18.2% of all used car listings; Toyota second at 16.4%</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {TOP_MAKES.slice(0, 10).map(m => (
              <div key={m.make} className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-center hover:border-slate-500 transition-colors">
                <div className="w-2 h-2 rounded-full mx-auto mb-2" style={{ background: m.color }} />
                <p className="text-white font-bold">{m.make}</p>
                <p className="text-2xl font-black mt-1" style={{ color: m.color }}>{m.share}%</p>
                <p className="text-slate-400 text-xs mt-1">${m.avg_price.toLocaleString()}</p>
                <p className={`text-xs font-semibold mt-0.5 ${m.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {m.change > 0 ? '+' : ''}{m.change}% MoM
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
