import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, DollarSign, Users, Globe, Zap,
  BarChart2, ArrowUp, ArrowDown, Car, Activity,
} from 'lucide-react'

// ── Fabricated economic data ──────────────────────────────────────────────────
const INFORMATION_ASYMMETRY = [
  { year: '2019', overprice_pct: 12.4, market_efficiency: 68 },
  { year: '2020', overprice_pct: 18.1, market_efficiency: 54 },  // COVID disruption
  { year: '2021', overprice_pct: 22.6, market_efficiency: 41 },  // Supply shortage peak
  { year: '2022', overprice_pct: 16.3, market_efficiency: 59 },
  { year: '2023', overprice_pct: 11.8, market_efficiency: 71 },
  { year: '2024', overprice_pct: 9.4,  market_efficiency: 78 },
  { year: '2025E', overprice_pct: 7.1, market_efficiency: 84, projected: true },
  { year: '2026E', overprice_pct: 5.2, market_efficiency: 89, projected: true },
]

const CONSUMER_SAVINGS = [
  { group: 'First-time buyers', avg_overpay: 3200, with_ai: 580,  savings: 2620 },
  { group: 'Rural buyers',      avg_overpay: 2800, with_ai: 620,  savings: 2180 },
  { group: 'Low-income buyers', avg_overpay: 2400, with_ai: 540,  savings: 1860 },
  { group: 'Elderly buyers',    avg_overpay: 3600, with_ai: 700,  savings: 2900 },
  { group: 'Average buyer',     avg_overpay: 1900, with_ai: 490,  savings: 1410 },
]

const MARKET_SEGMENTS = [
  { segment: 'Sedans',   total_market: 142, efficiency_gain: 12.4, color: '#3b82f6' },
  { segment: 'SUVs',     total_market: 218, efficiency_gain: 9.8,  color: '#10b981' },
  { segment: 'Trucks',   total_market: 196, efficiency_gain: 8.2,  color: '#f59e0b' },
  { segment: 'EVs',      total_market: 67,  efficiency_gain: 18.6, color: '#8b5cf6' },
  { segment: 'Compact',  total_market: 98,  efficiency_gain: 14.1, color: '#ec4899' },
  { segment: 'Luxury',   total_market: 84,  efficiency_gain: 6.3,  color: '#f97316' },
]

const EV_TRANSITION = [
  { year: '2020', ev_share: 2.1,  avg_ev_price: 42000, avg_ice_price: 18200 },
  { year: '2021', ev_share: 3.4,  avg_ev_price: 39500, avg_ice_price: 24100 },
  { year: '2022', ev_share: 5.8,  avg_ev_price: 37800, avg_ice_price: 22600 },
  { year: '2023', ev_share: 8.2,  avg_ev_price: 34200, avg_ice_price: 21000 },
  { year: '2024', ev_share: 11.3, avg_ev_price: 31600, avg_ice_price: 19600 },
  { year: '2025E', ev_share: 14.8, avg_ev_price: 28900, avg_ice_price: 18800 },
]

const REGIONAL_IMPACT = [
  { region: 'Rural Midwest',    price_disparity: 8.4, buyers_impacted: 2.1, color: '#f97316' },
  { region: 'Southeast',        price_disparity: 6.2, buyers_impacted: 3.4, color: '#ec4899' },
  { region: 'Southwest',        price_disparity: 5.8, buyers_impacted: 2.8, color: '#8b5cf6' },
  { region: 'Pacific Northwest', price_disparity: 4.1, buyers_impacted: 1.6, color: '#3b82f6' },
  { region: 'Northeast',        price_disparity: 3.7, buyers_impacted: 4.2, color: '#10b981' },
  { region: 'West Coast',       price_disparity: 2.9, buyers_impacted: 5.1, color: '#22c55e' },
]

const MULTIPLIER_SCENARIOS = [
  { label: '1,000 users/month',   annual_savings: '1.41M',  gdp_effect: '4.2M'  },
  { label: '10,000 users/month',  annual_savings: '14.1M',  gdp_effect: '42.3M' },
  { label: '100,000 users/month', annual_savings: '141M',   gdp_effect: '423M'  },
  { label: '1M users/month',      annual_savings: '1.41B',  gdp_effect: '4.23B' },
]

const chartStyle = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 },
  labelStyle:   { color: '#e2e8f0' },
}

export default function EconomicImpactPage() {
  const [activeSegment, setActiveSegment] = useState(null)
  const [scaleTier,     setScaleTier]     = useState(1)

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-b from-slate-100 to-[#F5F0E8] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold uppercase tracking-widest mb-3">
            <Globe size={12} />
            Economic Impact · Principled AI Spark Challenge
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
            Economic <span className="text-amber-700">Impact</span>
          </h1>
          <p className="text-slate-600 text-base max-w-2xl">
            Vroomly reduces information asymmetry in the $841 billion US used car market —
            saving consumers money, improving market efficiency, and accelerating the EV transition.
          </p>

          {/* Hero stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Avg buyer overpay (without AI)', value: '$1,900', sub: 'per transaction', color: 'text-red-700', icon: ArrowUp },
              { label: 'Avg savings with Vroomly',      value: '$1,410', sub: 'per transaction', color: 'text-emerald-700', icon: ArrowDown },
              { label: 'US used car market size',        value: '$841B',  sub: 'annual market', color: 'text-orange-500',    icon: BarChart2 },
              { label: 'Price efficiency improvement',   value: '+16%',   sub: 'vs no-AI baseline', color: 'text-purple-700', icon: TrendingUp },
            ].map(({ label, value, sub, color, icon: Icon }) => (
              <div key={label} className="bg-white/80 border border-slate-200 rounded-2xl p-4">
                <Icon size={18} className={`${color} mb-2`} />
                <p className={`text-3xl font-black ${color}`}>{value}</p>
                <p className="text-slate-600 text-xs font-medium mt-0.5">{sub}</p>
                <p className="text-slate-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Information Asymmetry Chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-slate-900 font-bold text-lg mb-1">Market Efficiency Over Time</h2>
            <p className="text-slate-600 text-sm mb-4">
              Used car market efficiency score (100 = perfect price discovery).
              COVID-era supply shortages caused a sharp decline.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={INFORMATION_ASYMMETRY} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis domain={[30, 100]} tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip {...chartStyle} formatter={v => [`${v}`, 'Efficiency Score']} />
                <Area type="monotone" dataKey="market_efficiency" stroke="#10b981"
                  fill="url(#effGrad)" strokeWidth={2}
                  strokeDasharray="5 5" name="Projected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-slate-900 font-bold text-lg mb-1">Buyer Overpayment Rate</h2>
            <p className="text-slate-600 text-sm mb-4">
              Average % buyers paid above fair market value — highest during supply crunch.
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={INFORMATION_ASYMMETRY} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={v => `${v}%`} />
                <Tooltip {...chartStyle} formatter={v => [`${v}%`, 'Overpayment Rate']} />
                <Bar dataKey="overprice_pct" radius={[4, 4, 0, 0]}>
                  {INFORMATION_ASYMMETRY.map((d, i) => (
                    <Cell key={i} fill={d.projected ? '#8b5cf6' : '#ef4444'} opacity={d.projected ? 0.7 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Consumer Savings by Group ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-slate-900 font-bold text-lg mb-1">Consumer Savings by Buyer Group</h2>
          <p className="text-slate-600 text-sm mb-5">
            Vulnerable buyers benefit most — first-time buyers and rural consumers face the highest information asymmetry.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {CONSUMER_SAVINGS.map(row => (
              <div key={row.group} className="bg-[#F5F0E8]/60 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-slate-600 text-xs font-medium mb-3">{row.group}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-red-700 text-xs text-slate-600">Without AI</p>
                    <p className="text-red-700 font-bold">${row.avg_overpay.toLocaleString()}</p>
                    <p className="text-slate-600 text-[10px]">avg overpay</p>
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <p className="text-emerald-700 text-xs">With Vroomly</p>
                    <p className="text-emerald-700 font-bold">${row.with_ai.toLocaleString()}</p>
                    <p className="text-slate-600 text-[10px]">avg overpay</p>
                  </div>
                  <div className="bg-emerald-600 rounded-lg p-2">
                    <p className="text-emerald-700 font-black">-${row.savings.toLocaleString()}</p>
                    <p className="text-emerald-600 text-[10px]">savings/transaction</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Market Impact + EV Transition ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-slate-900 font-bold text-lg mb-1">Market Segment Efficiency Gains</h2>
            <p className="text-slate-600 text-sm mb-4">
              Click a segment to explore. EVs show the largest potential gain due to sparse historical data.
            </p>
            <div className="space-y-3">
              {MARKET_SEGMENTS.map(seg => (
                <button key={seg.segment}
                  onClick={() => setActiveSegment(activeSegment === seg.segment ? null : seg.segment)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    activeSegment === seg.segment
                      ? 'bg-slate-100 border-slate-500'
                      : 'bg-[#F5F0E8]/60 border-slate-200 hover:border-slate-300'
                  }`}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                  <span className="text-slate-900 text-sm font-medium flex-1">{seg.segment}</span>
                  <span className="text-slate-600 text-xs">${seg.total_market}B market</span>
                  <span className="font-bold text-sm" style={{ color: seg.color }}>+{seg.efficiency_gain}%</span>
                </button>
              ))}
            </div>
            {activeSegment && (
              <div className="mt-4 bg-[#F5F0E8]/60 border border-slate-200 rounded-xl p-4">
                {(() => {
                  const s = MARKET_SEGMENTS.find(x => x.segment === activeSegment)
                  return (
                    <div>
                      <p className="text-slate-900 font-semibold mb-1">{s.segment} Segment</p>
                      <p className="text-slate-600 text-xs">
                        ${s.total_market}B annual market · AI price intelligence could improve pricing efficiency by {s.efficiency_gain}%,
                        representing <span className="text-emerald-700 font-bold">${(s.total_market * s.efficiency_gain / 100).toFixed(1)}B</span> in
                        annual consumer surplus recovery.
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-slate-900 font-bold text-lg mb-1">EV Transition Impact</h2>
            <p className="text-slate-600 text-sm mb-4">
              As EV market share grows, AI price intelligence becomes critical — historical
              data is sparse and prices are volatile.
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={EV_TRANSITION} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip {...chartStyle} formatter={v => [`$${v.toLocaleString()}`, '']} />
                <Line type="monotone" dataKey="avg_ev_price" stroke="#8b5cf6" strokeWidth={2} dot={false} name="EV avg price" />
                <Line type="monotone" dataKey="avg_ice_price" stroke="#3b82f6" strokeWidth={2} dot={false} name="ICE avg price" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-purple-500" /><span className="text-xs text-slate-500">EV avg price</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-orange-600" /><span className="text-xs text-slate-500">ICE avg price</span></div>
            </div>
          </div>
        </div>

        {/* ── Scale Calculator ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-amber-700" />
            <h2 className="text-slate-900 font-bold text-lg">Scale Impact Calculator</h2>
          </div>
          <p className="text-slate-600 text-sm mb-5">
            Select adoption scale to see aggregate economic impact.
            Assumes avg $1,410 savings per transaction.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {MULTIPLIER_SCENARIOS.map((s, i) => (
              <button key={i} onClick={() => setScaleTier(i)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  scaleTier === i
                    ? 'bg-amber-500 border-amber-500/40 text-white'
                    : 'bg-[#F5F0E8]/60 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                <p className="text-xs font-medium mb-1">{s.label}</p>
                <p className="text-slate-900 font-bold">${s.annual_savings}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">annual savings</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Annual Consumer Savings', value: `$${MULTIPLIER_SCENARIOS[scaleTier].annual_savings}`, color: 'text-emerald-700', desc: 'Direct buyer savings from better price discovery' },
              { label: 'GDP Efficiency Effect', value: `$${MULTIPLIER_SCENARIOS[scaleTier].gdp_effect}`, color: 'text-orange-500', desc: 'Multiplier effect from reduced transaction friction (3x)' },
              { label: 'Market Segments Impacted', value: '6', color: 'text-purple-700', desc: 'Sedans, SUVs, Trucks, EVs, Compact, Luxury' },
            ].map(m => (
              <div key={m.label} className="bg-[#F5F0E8]/60 border border-slate-200 rounded-xl p-4">
                <p className="text-slate-500 text-xs mb-1">{m.label}</p>
                <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                <p className="text-slate-600 text-xs mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Regional Impact ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-slate-900 font-bold text-lg mb-1">Regional Price Disparity Reduction</h2>
          <p className="text-slate-600 text-sm mb-5">
            Rural and Southeast buyers face the highest price disparity vs urban markets.
            AI price intelligence levels the playing field.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={REGIONAL_IMPACT} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#475569' }} />
              <YAxis type="category" dataKey="region" width={130} tick={{ fontSize: 11, fill: '#cbd5e1' }} />
              <Tooltip {...chartStyle} formatter={v => [`${v}%`, 'Price disparity']} />
              <Bar dataKey="price_disparity" radius={[0, 4, 4, 0]} name="Price disparity">
                {REGIONAL_IMPACT.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}
