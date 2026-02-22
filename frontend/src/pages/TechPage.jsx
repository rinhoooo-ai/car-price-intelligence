import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import {
  MessageSquare, Bot, Database, TrendingUp, Cpu,
  BarChart2, Scale, CheckCircle2, ArrowRight,
  Layers, Zap, AlertTriangle, BookOpen,
} from 'lucide-react'
import { getShapImportance } from '../api'

const PIPELINE = [
  { Icon: MessageSquare, label: 'User Query',     desc: 'Natural language car question',   color: '#64748b' },
  { Icon: Bot,           label: 'GPT-4o-mini',    desc: 'Orchestrates tool calls',          color: '#6366f1' },
  { Icon: Database,      label: 'Price History',  desc: 'MongoDB price_snapshots',          color: '#3b82f6' },
  { Icon: TrendingUp,    label: 'Forecast',       desc: 'Prophet 30/90-day prediction',     color: '#8b5cf6' },
  { Icon: Cpu,           label: 'ML Prediction',  desc: 'XGBoost + SHAP explanation',       color: '#10b981' },
  { Icon: BarChart2,     label: 'Market Context', desc: 'Inventory & regional pricing',     color: '#f97316' },
  { Icon: Scale,         label: 'Synthesis',      desc: 'Rule-based BUY/WAIT/NEUTRAL',      color: '#ec4899' },
  { Icon: CheckCircle2,  label: 'Answer',         desc: '3-sentence AI explanation',        color: '#22c55e' },
]

const MODEL_ROWS = [
  { label: 'Algorithm',      value: 'XGBoost Regressor' },
  { label: 'Target',         value: 'log1p(price) → expm1 at inference' },
  { label: 'Training data',  value: '~262k listings (80% chronological split)' },
  { label: 'Test data',      value: '~66k listings (most recent 20% by date)' },
  { label: 'Split method',   value: 'Chronological — zero data leakage' },
  { label: 'Features',       value: '19 total (car_age, log_odometer, make, model…)' },
]

const DATA_SOURCES = [
  { color: '#3b82f6', label: 'Craigslist Dataset',  detail: 'Kaggle · ~426k listings · 26 columns',               tag: 'Primary'   },
  { color: '#10b981', label: 'Cleaning Pipeline',   detail: 'Colab T4 · 5-step clean → 328k rows',                tag: 'Processed' },
  { color: '#8b5cf6', label: 'MongoDB Atlas',       detail: 'carmarket DB · listings + price_snapshots · 175 MB', tag: 'Storage'   },
  { color: '#f59e0b', label: 'OpenAI GPT-4o-mini',  detail: 'Tool orchestration + plain-English explanation',      tag: 'LLM'       },
  { color: '#ec4899', label: 'Facebook Prophet',    detail: '30/90-day price forecasting with yearly seasonality', tag: 'Forecast'  },
  { color: '#64748b', label: 'Dataset Snapshot',    detail: 'Jan 2024 · Static for demo · update on demand',       tag: 'Freshness' },
]

export default function TechPage() {
  const [shap,    setShap]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getShapImportance()
      .then(r => setShap(r.data.features ?? []))
      .finally(() => setLoading(false))
  }, [])

  const chartTooltipStyle = {
    contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 },
    labelStyle:   { color: '#e2e8f0' },
  }

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-extrabold text-white mb-2">
            How It <span className="text-blue-400">Works</span>
          </h1>
          <p className="text-slate-400 text-base max-w-2xl">
            A multi-step AI agent pipeline combining GPT-4o-mini tool-calling,
            XGBoost machine learning, and Prophet time-series forecasting.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8 pb-12">

        {/* ── Agent Pipeline ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={18} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">Agent Pipeline</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Each query flows through GPT-4o-mini, which decides which tools to call and in what order.
            Steps 3–6 are often parallel tool calls; step 7 is rule-based logic, not an LLM call.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {PIPELINE.map((step, i) => {
              const { Icon } = step
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col items-center bg-slate-900/60 border border-slate-700 hover:border-slate-500
                    rounded-xl p-3 min-w-[88px] text-center transition-colors cursor-default group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-opacity"
                      style={{ backgroundColor: step.color + '22' }}>
                      <Icon size={15} style={{ color: step.color }} />
                    </div>
                    <p className="text-white text-xs font-semibold leading-tight">{step.label}</p>
                    <p className="text-slate-600 text-xs mt-0.5 leading-tight">{step.desc}</p>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight size={14} className="text-slate-600 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SHAP + Model Card side by side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* SHAP importance */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={18} className="text-blue-400" />
              <h2 className="text-xl font-bold text-white">What Drives Car Prices?</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Global SHAP importance from 500 held-out test listings.&nbsp;
              <span className="text-emerald-400">Green</span> = increases price ·&nbsp;
              <span className="text-blue-400">Blue</span> = decreases price
            </p>

            {loading ? (
              <div className="animate-pulse h-52 bg-slate-700 rounded-xl" />
            ) : shap.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={shap} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => v.toFixed(3)} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="feature" width={130}
                    tickFormatter={v => v.replace(/_/g, ' ')} tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                  <Tooltip {...chartTooltipStyle}
                    formatter={(v, _, p) => [
                      v.toFixed(4),
                      p.payload.direction === 'positive' ? 'Increases price' : 'Decreases price',
                    ]}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {shap.map((f, i) => (
                      <Cell key={i} fill={f.direction === 'positive' ? '#10b981' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
                SHAP data unavailable — ensure shap_data.pkl is in models/
              </div>
            )}
          </div>

          {/* Model Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-blue-400" />
              <h2 className="text-xl font-bold text-white">Model Card</h2>
            </div>

            <div className="space-y-3 mb-6">
              {MODEL_ROWS.map(r => (
                <div key={r.label} className="flex gap-3 text-sm border-b border-slate-700/40 pb-3 last:border-0 last:pb-0">
                  <span className="text-slate-500 w-36 flex-shrink-0 font-medium">{r.label}</span>
                  <span className="text-slate-200">{r.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={13} className="text-emerald-400" />
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Predicts well</p>
                </div>
                <ul className="text-xs text-emerald-300/80 space-y-1">
                  <li>· Common makes (toyota, ford, honda, chevrolet…)</li>
                  <li>· Cars with complete odometer + year data</li>
                  <li>· Price ranges $1k – $50k</li>
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={13} className="text-amber-400" />
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Limitations</p>
                </div>
                <ul className="text-xs text-amber-300/80 space-y-1">
                  <li>· Rare/luxury vehicles — limited training samples</li>
                  <li>· Condition is self-reported by sellers</li>
                  <li>· Static snapshot — real prices drift over time</li>
                  <li>· No accident history or trim-level detail</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ── Data Sources ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">Data Sources &amp; Stack</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DATA_SOURCES.map(s => (
              <div key={s.label}
                className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex items-start gap-3 hover:border-slate-600 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-semibold">{s.label}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-medium">{s.tag}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
