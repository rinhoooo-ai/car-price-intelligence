import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import {
  Database, TrendingUp, Cpu, BarChart2, Scale,
  CheckCircle2, ArrowRight, Layers, Zap, AlertTriangle,
  BookOpen, Shield, MessageSquare, Eye, Bot, Activity,
} from 'lucide-react'
import { getShapImportance } from '../api'

// ── Multi-agent pipeline ──────────────────────────────────────────────────────
const PIPELINE = [
  {
    Icon: MessageSquare,
    label: 'User Query',
    desc:  'Vehicle + params',
    color: '#64748b',
    agent: false,
  },
  {
    Icon: Bot,
    label: 'Orchestrator',
    desc:  'Coordinates all agents',
    color: '#6366f1',
    agent: true,
  },
  {
    Icon: Database,
    label: 'DataAgent',
    desc:  'Price history + market ctx',
    color: '#3b82f6',
    agent: true,
  },
  {
    Icon: TrendingUp,
    label: 'TrendAgent',
    desc:  'Prophet forecast + MA',
    color: '#8b5cf6',
    agent: true,
  },
  {
    Icon: Cpu,
    label: 'ForecastAgent',
    desc:  'XGBoost + LLM blend',
    color: '#10b981',
    agent: true,
  },
  {
    Icon: Activity,
    label: 'RiskAgent',
    desc:  'Volatility & uncertainty',
    color: '#f97316',
    agent: true,
  },
  {
    Icon: Scale,
    label: 'DecisionAgent',
    desc:  '3-rule deterministic engine',
    color: '#ec4899',
    agent: true,
  },
  {
    Icon: MessageSquare,
    label: 'ExplanationAgent',
    desc:  'GPT-4o-mini reasoning',
    color: '#a78bfa',
    agent: true,
  },
  {
    Icon: Shield,
    label: 'EthicsAgent',
    desc:  'Transparency + bias audit',
    color: '#22c55e',
    agent: true,
  },
  {
    Icon: CheckCircle2,
    label: 'Report',
    desc:  'Structured intelligence report',
    color: '#f59e0b',
    agent: false,
  },
]

// ── Decision rules ─────────────────────────────────────────────────────────────
const DECISION_RULES = [
  {
    condition: 'change ≤ −3% AND confidence ≥ 75',
    result: 'WAIT',
    color: '#ef4444',
    badge: 'bg-red-500/15 text-red-400 border-red-500/25',
    desc: 'Price declining with high confidence — waiting saves money.',
  },
  {
    condition: 'change ≥ +2% AND volatility = Low',
    result: 'BUY NOW',
    color: '#10b981',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    desc: 'Rising prices with stable low-volatility market — buy before prices climb.',
  },
  {
    condition: 'price ≤ −10% vs median AND confidence ≥ 75',
    result: 'BUY NOW',
    color: '#10b981',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    desc: 'Strong below-market deal — value opportunity regardless of trend direction.',
  },
  {
    condition: 'All other scenarios',
    result: 'MONITOR',
    color: '#f59e0b',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    desc: 'No strong signal — continue monitoring for a better entry point.',
  },
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
  { color: '#3b82f6', label: 'Craigslist Dataset',       detail: 'Kaggle · ~426k listings · 26 columns',                   tag: 'Primary'      },
  { color: '#10b981', label: 'Cleaning Pipeline',        detail: 'Colab T4 · 5-step clean → 328k rows',                    tag: 'Processed'    },
  { color: '#8b5cf6', label: 'MongoDB Atlas',            detail: 'carmarket DB · listings + price_snapshots · 175 MB',     tag: 'Storage'      },
  { color: '#f59e0b', label: 'OpenAI GPT-4o-mini',       detail: 'ExplanationAgent · ForecastAgent LLM blend',             tag: 'LLM'          },
  { color: '#ec4899', label: 'Facebook Prophet',         detail: '30/90-day price forecasting · yearly seasonality',        tag: 'Forecast'     },
  { color: '#6366f1', label: 'Multi-Agent Orchestrator', detail: '7 modular Python agents · deterministic pipeline',        tag: 'Architecture' },
  { color: '#22c55e', label: 'EthicsAgent',              detail: 'Transparency notes · bias audit · principled AI layer',   tag: 'Ethics'       },
  { color: '#64748b', label: 'Dataset Snapshot',         detail: 'Jan 2024 · Static for demo · update on demand',          tag: 'Freshness'    },
]

const PRINCIPLED_AI = [
  {
    icon: Eye,
    title: 'Transparency',
    color: '#3b82f6',
    desc: 'Every recommendation comes with a forecast method label, data quality rating, and confidence score — no black-box outputs.',
  },
  {
    icon: AlertTriangle,
    title: 'Bias Disclosure',
    color: '#f59e0b',
    desc: 'EthicsAgent generates make-specific bias statements disclosing training data limitations for luxury, EV, and niche vehicles.',
  },
  {
    icon: Shield,
    title: 'Ethical Guardrails',
    color: '#10b981',
    desc: 'All outputs include a clear disclaimer: this is data-driven price intelligence, not human financial advice.',
  },
  {
    icon: Zap,
    title: 'Deterministic Decisions',
    color: '#ec4899',
    desc: 'The DecisionAgent uses transparent rule-based logic — not an LLM — so every recommendation can be audited and explained.',
  },
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
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <Layers size={12} />
            Principled AI · Multi-Agent Architecture
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2">
            System <span className="text-blue-400">Architecture</span>
          </h1>
          <p className="text-slate-400 text-base max-w-2xl">
            A modular 7-agent decision intelligence pipeline combining XGBoost machine learning,
            Facebook Prophet time-series forecasting, and GPT-4o-mini — with a dedicated EthicsAgent
            for transparent, principled AI outputs.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8 pb-12">

        {/* ── Multi-Agent Pipeline ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={18} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">Multi-Agent Pipeline</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-semibold ml-1">
              7 Specialized Agents
            </span>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Each query flows through a deterministic Python orchestrator — no LLM routing.
            GPT-4o-mini is used only in ForecastAgent (blending) and ExplanationAgent (reasoning).
            Coloured nodes are autonomous agents; grey nodes are I/O endpoints.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {PIPELINE.map((step, i) => {
              const { Icon } = step
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className={`flex flex-col items-center rounded-xl p-3 min-w-[92px] text-center transition-colors
                    ${step.agent
                      ? 'bg-slate-900/80 border border-slate-600 hover:border-slate-500'
                      : 'bg-slate-700/40 border border-slate-700 hover:border-slate-600'}
                    cursor-default group`}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5"
                      style={{ backgroundColor: step.color + '22' }}>
                      <Icon size={15} style={{ color: step.color }} />
                    </div>
                    <p className="text-white text-xs font-semibold leading-tight">{step.label}</p>
                    <p className="text-slate-600 text-[10px] mt-0.5 leading-tight">{step.desc}</p>
                    {step.agent && (
                      <span className="text-[9px] mt-1 px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-500">agent</span>
                    )}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <ArrowRight size={13} className="text-slate-600 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Decision Rules ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Scale size={18} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">Decision Rules</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold ml-1">
              Deterministic · Auditable
            </span>
          </div>
          <p className="text-slate-400 text-sm mb-5">
            DecisionAgent applies three ordered rules in pure Python — no LLM, no randomness.
            Every recommendation can be traced back to exact thresholds.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DECISION_RULES.map((r, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-0.5 rounded">
                    Rule {i + 1 <= 3 ? i + 1 : '∗'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-bold ${r.badge}`}>
                    {r.result}
                  </span>
                </div>
                <p className="text-white text-sm font-mono mb-1.5">{r.condition}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Principled AI Features ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-blue-400" />
            <h2 className="text-xl font-bold text-white">Principled AI Features</h2>
          </div>
          <p className="text-slate-400 text-sm mb-5">
            Built for the Principled AI Spark Challenge — every output includes
            transparency, bias disclosure, and ethical guardrails.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRINCIPLED_AI.map((p, i) => {
              const { icon: PIcon } = { icon: p.icon }
              return (
                <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: p.color + '22' }}>
                    <p.icon size={17} style={{ color: p.color }} />
                  </div>
                  <p className="text-white text-sm font-semibold mb-1.5">{p.title}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{p.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SHAP + Model Card ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
