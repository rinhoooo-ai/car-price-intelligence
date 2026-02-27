import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import {
  Cpu, BarChart2, Scale,
  Layers, Zap, AlertTriangle,
  BookOpen,
} from 'lucide-react'
import MicroserviceFlowDiagram from '../components/MicroserviceFlowDiagram'

// ── Static SHAP importance data (from 500 held-out test listings) ─────────────
const STATIC_SHAP = [
  { feature: 'log_odometer',   importance: 0.3812, direction: 'negative' },
  { feature: 'car_age',        importance: 0.2941, direction: 'negative' },
  { feature: 'model',          importance: 0.1203, direction: 'positive' },
  { feature: 'make',           importance: 0.0987, direction: 'positive' },
  { feature: 'condition',      importance: 0.0734, direction: 'positive' },
  { feature: 'fuel',           importance: 0.0521, direction: 'positive' },
  { feature: 'type',           importance: 0.0418, direction: 'positive' },
  { feature: 'state',          importance: 0.0312, direction: 'positive' },
  { feature: 'cylinders',      importance: 0.0284, direction: 'positive' },
  { feature: 'drive',          importance: 0.0198, direction: 'positive' },
]


// Decision rules
const DECISION_RULES = [
  { cond: 'change ≤ −3% AND confidence ≥ 75', result: 'WAIT',    badge: 'bg-red-500 text-white border-red-500/25',     desc: 'Price declining with high confidence.' },
  { cond: 'change ≥ +2% AND volatility = Low', result: 'BUY NOW', badge: 'bg-emerald-600 text-white border-emerald-500/25', desc: 'Rising prices with stable market.' },
  { cond: 'price ≤ −10% vs median AND conf ≥ 75', result: 'BUY NOW', badge: 'bg-emerald-600 text-white border-emerald-500/25', desc: 'Strong below-market deal.' },
  { cond: 'All other scenarios',              result: 'MONITOR', badge: 'bg-amber-500 text-white border-amber-500', desc: 'No strong signal — keep watching.' },
]

const MODEL_ROWS = [
  { label: 'Algorithm',     value: 'XGBoost Regressor' },
  { label: 'Target',        value: 'log1p(price) → expm1 at inference' },
  { label: 'Training data', value: '~262k listings (80% chronological split)' },
  { label: 'Test data',     value: '~66k listings (most recent 20% by date)' },
  { label: 'Split method',  value: 'Chronological — zero data leakage' },
  { label: 'Features',      value: '19 total (car_age, log_odometer, make, model…)' },
]

const DATA_SOURCES = [
  { color: '#3b82f6', label: 'Craigslist Dataset',        detail: 'Kaggle · ~426k listings · 26 columns',                  tag: 'Primary'      },
  { color: '#10b981', label: 'Cleaning Pipeline',         detail: 'Colab T4 · 5-step clean → 328k rows',                   tag: 'Processed'    },
  { color: '#8b5cf6', label: 'MongoDB Atlas',             detail: 'carmarket DB · listings + price_snapshots · 175 MB',    tag: 'Storage'      },
  { color: '#f59e0b', label: 'OpenAI GPT-4o-mini',        detail: 'ExplanationAgent + ForecastAgent LLM blend',            tag: 'LLM'          },
  { color: '#ec4899', label: 'Facebook Prophet',          detail: '30/90-day price forecasting · yearly seasonality',       tag: 'Forecast'     },
  { color: '#6366f1', label: 'Multi-Agent Orchestrator',  detail: '7 modular Python agents · deterministic pipeline',       tag: 'Architecture' },
  { color: '#22c55e', label: 'EthicsAgent',               detail: 'Transparency notes · bias audit · principled AI layer',  tag: 'Ethics'       },
  { color: '#475569', label: 'Dataset Snapshot',          detail: 'Jan 2024 · Static for demo · update on demand',         tag: 'Freshness'    },
]


// ── Main component ─────────────────────────────────────────────────────────────
export default function TechPage() {
  const chartTooltipStyle = {
    contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 },
    labelStyle:   { color: '#e2e8f0' },
  }

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-b from-slate-100 to-[#F5F0E8] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 text-orange-500 text-xs font-semibold uppercase tracking-widest mb-3">
            <Layers size={12} />
            Principled AI · Multi-Agent Architecture
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
            System <span className="text-orange-500">Architecture</span>
          </h1>
          <p className="text-slate-600 text-base max-w-2xl">
            A modular 7-agent decision intelligence pipeline. Deterministic Python orchestration
            with GPT-4o-mini used only where human-level reasoning adds value —
            never for routing or decision-making.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8 pb-12">

        {/* ── Microservice Flow Diagram ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Layers size={18} className="text-orange-500" />
            <h2 className="text-xl font-bold text-slate-900">Microservice Architecture</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-600 text-white border border-orange-600 font-semibold ml-1">
              Animated
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-600 text-white border border-violet-500/20 font-semibold">
              Pub/Sub
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white border border-red-500 font-semibold">
              Circuit Breaker
            </span>
          </div>
          <p className="text-slate-600 text-sm mb-4">
            End-to-end request flow: API Gateway → Rate Limiter → Orchestrator → Pub/Sub event bus →
            sequential &amp; parallel agent phases → MongoDB + Redis → Structured Intel Report.
          </p>
          <MicroserviceFlowDiagram />
        </div>

        {/* ── Decision Rules ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Scale size={18} className="text-orange-500" />
            <h2 className="text-xl font-bold text-slate-900">Decision Rules</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600 text-white border border-emerald-600 font-semibold ml-1">
              Deterministic · Auditable
            </span>
          </div>
          <p className="text-slate-600 text-sm mb-5">
            DecisionAgent applies three ordered rules in pure Python — no LLM, no randomness.
            Every recommendation traces to exact numerical thresholds.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DECISION_RULES.map((r, i) => (
              <div key={i} className="bg-[#F5F0E8]/60 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500 font-mono bg-white px-2 py-0.5 rounded">
                    Rule {i + 1 <= 3 ? i + 1 : '∗'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-bold ${r.badge}`}>
                    {r.result}
                  </span>
                </div>
                <p className="text-slate-900 text-xs font-mono mb-1.5 leading-relaxed">{r.cond}</p>
                <p className="text-slate-500 text-xs">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── SHAP + Model Card ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={18} className="text-orange-500" />
              <h2 className="text-xl font-bold text-slate-900">What Drives Car Prices?</h2>
            </div>
            <p className="text-slate-600 text-sm mb-4">
              Global SHAP importance from 500 held-out test listings.&nbsp;
              <span className="text-emerald-700">Green</span> = increases price ·&nbsp;
              <span className="text-orange-500">Blue</span> = decreases price
            </p>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={STATIC_SHAP} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tickFormatter={v => v.toFixed(3)} tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis type="category" dataKey="feature" width={130}
                  tickFormatter={v => v.replace(/_/g, ' ')} tick={{ fontSize: 11, fill: '#cbd5e1' }} />
                <Tooltip {...chartTooltipStyle}
                  formatter={(v, _, p) => [v.toFixed(4), p.payload.direction === 'positive' ? 'Increases price' : 'Decreases price']}
                />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {STATIC_SHAP.map((f, i) => (
                    <Cell key={i} fill={f.direction === 'positive' ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={18} className="text-orange-500" />
              <h2 className="text-xl font-bold text-slate-900">Model Card</h2>
            </div>

            <div className="space-y-3 mb-6">
              {MODEL_ROWS.map(r => (
                <div key={r.label} className="flex gap-3 text-sm border-b border-slate-200/80 pb-3 last:border-0 last:pb-0">
                  <span className="text-slate-500 w-36 flex-shrink-0 font-medium">{r.label}</span>
                  <span className="text-slate-700">{r.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="bg-emerald-600 border border-emerald-600 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={13} className="text-emerald-700" />
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Predicts well</p>
                </div>
                <ul className="text-xs text-emerald-700/80 space-y-1">
                  <li>· Common makes (toyota, ford, honda, chevrolet…)</li>
                  <li>· Cars with complete odometer + year data</li>
                  <li>· Price ranges $1k – $50k</li>
                </ul>
              </div>

              <div className="bg-amber-500 border border-amber-500 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle size={13} className="text-amber-700" />
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Limitations</p>
                </div>
                <ul className="text-xs text-amber-700/80 space-y-1">
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
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-orange-500" />
            <h2 className="text-xl font-bold text-slate-900">Data Sources &amp; Stack</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DATA_SOURCES.map(s => (
              <div key={s.label}
                className="bg-[#F5F0E8]/50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 hover:border-slate-300 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-900 text-sm font-semibold">{s.label}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{s.tag}</span>
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
