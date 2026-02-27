import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { getShapImportance } from '../api'

const PIPELINE = [
  { icon: '💬', label: 'User Query',      desc: 'Natural language car question',   color: 'slate'  },
  { icon: '🤖', label: 'GPT-4o-mini',     desc: 'Orchestrates tool calls',          color: 'indigo' },
  { icon: '📊', label: 'Price History',   desc: 'MongoDB price_snapshots',          color: 'blue'   },
  { icon: '📈', label: 'Forecast',        desc: 'Prophet 30/90-day prediction',     color: 'purple' },
  { icon: '🎯', label: 'ML Prediction',   desc: 'XGBoost + SHAP explanation',       color: 'green'  },
  { icon: '🏪', label: 'Market Context',  desc: 'Inventory & regional pricing',     color: 'orange' },
  { icon: '⚖️', label: 'Synthesis',       desc: 'Rule-based BUY/WAIT/NEUTRAL',      color: 'rose'   },
  { icon: '✅', label: 'Recommendation',  desc: '3-sentence plain English output',  color: 'emerald'},
]

const TILE_COLORS = {
  slate: 'bg-slate-100 border-slate-300 text-slate-700',
  indigo:'bg-indigo-100 border-indigo-300 text-indigo-700',
  blue:  'bg-blue-100 border-blue-300 text-blue-700',
  purple:'bg-purple-100 border-purple-300 text-purple-700',
  green: 'bg-green-100 border-green-300 text-green-700',
  orange:'bg-orange-100 border-orange-300 text-orange-700',
  rose:  'bg-rose-100 border-rose-300 text-rose-700',
  emerald:'bg-emerald-100 border-emerald-300 text-emerald-700',
}

export default function HowItWorks() {
  const [shap,    setShap]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getShapImportance()
      .then(r => setShap(r.data.features ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── 1. Agent Pipeline ── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Agent Pipeline</h2>
        <p className="text-sm text-slate-500 mb-6">Each user query flows through GPT-4o-mini, which orchestrates 4 data tools before synthesising a recommendation.</p>

        {/* Flow diagram */}
        <div className="flex flex-wrap items-center gap-2">
          {PIPELINE.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`border rounded-xl px-3 py-2 text-center min-w-[100px] ${TILE_COLORS[step.color]}`}>
                <div className="text-xl mb-0.5">{step.icon}</div>
                <div className="text-xs font-bold">{step.label}</div>
                <div className="text-xs opacity-70 leading-tight">{step.desc}</div>
              </div>
              {i < PIPELINE.length - 1 && (
                <span className="text-slate-600 font-bold text-lg flex-shrink-0">→</span>
              )}
            </div>
          ))}
        </div>

        {/* Tools row label */}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="px-2">Steps 3–6 are parallel tool calls; Step 7 is rule-based logic, not an LLM call</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
      </section>

      {/* ── 2. SHAP Feature Importance ── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1">What Drives Car Prices Most?</h2>
        <p className="text-sm text-slate-500 mb-4">
          Global SHAP feature importance from 500 held-out test listings.
          Green = tends to <strong>increase</strong> price on average; Blue = tends to <strong>decrease</strong>.
        </p>
        {loading ? (
          <div className="animate-pulse h-48 bg-slate-100 rounded-xl" />
        ) : shap.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={shap} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => v.toFixed(3)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="feature" width={130}
                tickFormatter={v => v.replace(/_/g,' ')} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, _, p) => [v.toFixed(4), p.payload.direction === 'positive' ? 'Increases price' : 'Decreases price']} />
              <Bar dataKey="importance" radius={[0,4,4,0]}>
                {shap.map((f, i) => (
                  <Cell key={i} fill={f.direction === 'positive' ? '#10b981' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-600 text-sm">
            SHAP data unavailable — ensure shap_data.pkl is in models/
          </div>
        )}
      </section>

      {/* ── 3. Model Card ── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Model Card</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {[
              { label: 'Algorithm',      value: 'XGBoost Regressor' },
              { label: 'Target',         value: 'log1p(price) → expm1 at inference' },
              { label: 'Training data',  value: '~262k listings (80% time-split)' },
              { label: 'Test data',      value: '~66k listings (most recent 20% by date)' },
              { label: 'Split method',   value: 'Chronological (no data leakage)' },
              { label: 'Features',       value: '19 (car_age, log_odometer, make, model…)' },
            ].map(r => (
              <div key={r.label} className="flex gap-3 text-sm">
                <span className="font-semibold text-slate-600 w-36 flex-shrink-0">{r.label}</span>
                <span className="text-slate-700">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">Predicts well</p>
              <ul className="text-sm text-emerald-800 space-y-1 list-disc list-inside">
                <li>Common makes/models (toyota, ford, honda)</li>
                <li>Cars with complete odometer + year data</li>
                <li>Price ranges $1k – $50k</li>
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Limitations</p>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Rare/luxury vehicles — limited training data</li>
                <li>Condition quality is self-reported by sellers</li>
                <li>Dataset snapshot — prices drift over time</li>
                <li>No accident history or trim level detail</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Data Sources ── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Data Sources</h2>
        <div className="space-y-3">
          {[
            { icon: '📦', title: 'Craigslist Used Cars Dataset', detail: 'Kaggle · ~426k listings · 26 columns', tag: 'Primary' },
            { icon: '🧹', title: 'Cleaning Pipeline',            detail: 'Colab T4 · 5-step clean → 328k rows', tag: 'Processed' },
            { icon: '🍃', title: 'MongoDB Atlas',                detail: 'carmarket DB · listings + price_snapshots · 175 MB', tag: 'Storage' },
            { icon: '🤖', title: 'OpenAI GPT-4o-mini',          detail: 'Tool orchestration + plain-English explanation', tag: 'LLM' },
            { icon: '📅', title: 'Dataset Snapshot',             detail: 'Jan 2024 · Static for demo · Update frequency: on demand', tag: 'Freshness' },
          ].map(s => (
            <div key={s.title} className="flex items-start gap-4">
              <span className="text-2xl flex-shrink-0">{s.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 text-sm">{s.title}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{s.tag}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
