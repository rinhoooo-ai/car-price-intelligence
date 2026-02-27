import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { getMarketOverview } from '../api'
import { useApp } from '../App'

const MONTH_NAMES = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function MetricCard({ title, value, sub, trend, icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
          {sub && <p className={`text-sm mt-1 font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-500'}`}>{sub}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

// Heatmap color: low price = blue, high price = red
function seasonColor(value, min, max) {
  const ratio = max === min ? 0.5 : (value - min) / (max - min)
  const r = Math.round(59  + ratio * (239 - 59))
  const g = Math.round(130 + ratio * (68  - 130))
  const b = Math.round(246 + ratio * (68  - 246))
  return `rgb(${r},${g},${b})`
}

export default function MarketOverview() {
  const { setPendingCar, setActiveTab } = useApp()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    getMarketOverview()
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleRowClick(buy) {
    setPendingCar({
      make:      buy.make || '',
      model:     buy.model || '',
      year:      buy.year || '',
      mileage:   50000,
      condition: 'good',
      region:    'california',
    })
    setActiveTab(0)
  }

  if (loading) return (
    <div className="animate-pulse space-y-4">
      {[20, 48, 64].map(h => <div key={h} className={`h-${h} bg-slate-200 rounded-xl`} />)}
    </div>
  )
  if (error) return <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4">{error}</div>
  if (!data)  return null

  const seasonMin = Math.min(...(data.seasonality_data?.map(s => s.avg_price) ?? [0]))
  const seasonMax = Math.max(...(data.seasonality_data?.map(s => s.avg_price) ?? [1]))
  const heatScore = Math.min(100, Math.max(0, Math.round(50 + (data.mom_change_pct ?? 0) * 5)))
  const heatColor = heatScore > 65 ? 'text-red-500' : heatScore < 35 ? 'text-blue-500' : 'text-amber-500'

  return (
    <div className="space-y-6">

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Avg Market Price"
          value={`$${data.avg_price_this_month?.toLocaleString()}`}
          sub={`${data.mom_change_pct > 0 ? '▲' : '▼'} ${Math.abs(data.mom_change_pct)}% vs last month`}
          trend={data.mom_change_pct > 0 ? 'up' : 'down'}
          icon="💰"
        />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Market Heat Score</p>
          <p className={`text-3xl font-bold mt-1 ${heatColor}`}>{heatScore}<span className="text-lg">/100</span></p>
          <div className="mt-2 bg-slate-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${heatScore > 65 ? 'bg-red-500' : heatScore < 35 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${heatScore}%` }} />
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {heatScore > 65 ? 'Hot — seller\'s market' : heatScore < 35 ? 'Cool — buyer\'s market' : 'Balanced market'}
          </p>
        </div>
        <MetricCard
          title="Best Buy Opportunities"
          value={data.top_buys?.length ?? 0}
          sub="vehicles with BUY signal"
          icon="🎯"
        />
      </div>

      {/* Best Buys table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Best Buys Right Now</h2>
          <p className="text-xs text-slate-500 mt-0.5">Click a row to analyze in the Analyze tab</p>
        </div>
        {data.top_buys?.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                {['Make','Model','Year','Predicted Price','Signal'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.top_buys.map((row, i) => (
                <tr key={i} onClick={() => handleRowClick(row)}
                  className="hover:bg-indigo-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 capitalize">{row.make}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{row.model}</td>
                  <td className="px-4 py-3 text-slate-600">{row.year}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {row.predicted_price ? `$${Number(row.predicted_price).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">BUY</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-10 text-center text-slate-600 text-sm">
            No BUY signals cached yet. Run some analyses in the Analyze tab first.
          </div>
        )}
      </div>

      {/* Seasonality chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800">Historically Cheapest Months to Buy</h2>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">Average listing price by month across all vehicles · Blue = cheapest, Red = most expensive</p>
        {data.seasonality_data?.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.seasonality_data.map(s => ({ ...s, name: MONTH_NAMES[s.month] ?? s.month }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, 'Avg Price']} />
              <Bar dataKey="avg_price" radius={[4,4,0,0]}>
                {data.seasonality_data.map((s, i) => (
                  <Cell key={i} fill={seasonColor(s.avg_price, seasonMin, seasonMax)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-slate-600 text-sm">No seasonality data available</div>
        )}
        <p className="text-xs text-slate-600 mt-3">Data as of: {data.updated_at} &nbsp;·&nbsp; Source: Craigslist listings snapshot</p>
      </div>

    </div>
  )
}
