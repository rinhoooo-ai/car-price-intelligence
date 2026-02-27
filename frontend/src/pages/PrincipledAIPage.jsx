import { useState, useEffect } from 'react'
import {
  Shield, Eye, Scale, Lock, CheckCircle, AlertCircle,
  User, Bot, ArrowRight, RefreshCw, ThumbsUp, ThumbsDown,
  FileText, Zap, BarChart2, Activity,
} from 'lucide-react'

// ── Human-in-the-Loop flow steps ─────────────────────────────────────────────
const HITL_STEPS = [
  {
    id: 1, Icon: Bot, color: '#6366f1',
    title: 'AI Generates Recommendation',
    desc: '7-agent pipeline runs XGBoost + Prophet + GPT-4o-mini to produce a BUY NOW / WAIT / MONITOR signal with confidence score, risk assessment, and reasoning.',
    badge: 'Automated',
    badgeColor: 'bg-amber-500/15 text-amber-600',
  },
  {
    id: 2, Icon: Eye, color: '#3b82f6',
    title: 'Transparency Layer',
    desc: 'Every recommendation includes confidence %, volatility level, uncertainty range, forecast method label, and 3-bullet reasoning — so humans can evaluate the evidence.',
    badge: 'Transparent',
    badgeColor: 'bg-orange-500/10 text-orange-500',
  },
  {
    id: 3, Icon: User, color: '#f59e0b',
    title: 'Human Reviews Evidence',
    desc: 'The buyer sees the full agent reasoning log, SHAP factors, bias statement, and scenario simulations. They can run what-if analyses before deciding.',
    badge: 'Human Review',
    badgeColor: 'bg-amber-500/15 text-amber-400',
  },
  {
    id: 4, Icon: CheckCircle, color: '#10b981',
    title: 'Human Makes Final Decision',
    desc: 'AI output is advisory only. The human decides whether to act, modify the search, or seek a second opinion. No autonomous purchasing or commitment.',
    badge: 'Human Decision',
    badgeColor: 'bg-emerald-500/15 text-emerald-400',
  },
  {
    id: 5, Icon: RefreshCw, color: '#8b5cf6',
    title: 'Feedback Loop',
    desc: 'Users can flag incorrect recommendations. This feedback improves future model calibration and helps identify regional data gaps or systematic biases.',
    badge: 'Continuous Learning',
    badgeColor: 'bg-purple-500/15 text-purple-400',
  },
]

// ── Principled AI pillars ────────────────────────────────────────────────────
const PILLARS = [
  {
    Icon: Eye, color: '#3b82f6', title: 'Transparency',
    items: [
      'Confidence score displayed for every recommendation (0–100%)',
      'Uncertainty range shown as price band (±4–14% depending on volatility)',
      'Forecast method labeled: Prophet / XGBoost / LLM-Blended / Industry Estimate',
      'Full agent reasoning log visible to every user',
      'SHAP factors explain what drives each price prediction',
    ],
  },
  {
    Icon: Scale, color: '#f59e0b', title: 'Accountability',
    items: [
      '"AI recommendation is advisory only — not financial advice" on every result',
      'DecisionAgent uses auditable rule-based logic — no black-box LLM routing',
      'Every recommendation traces back to exact numerical thresholds',
      'EthicsAgent generates per-vehicle bias disclosure statements',
      'Agent reasoning log provides a complete audit trail',
    ],
  },
  {
    Icon: Shield, color: '#10b981', title: 'Fairness',
    items: [
      'Model uses only: make, model, year, mileage, condition, region',
      'No income, credit score, demographic, or personal data collected',
      'Price intelligence available equally to all users — no paywalled tiers',
      'Regional data coverage across 50+ US states and markets',
      'Bias statement flags when training data underrepresents a vehicle segment',
    ],
  },
  {
    Icon: Lock, color: '#8b5cf6', title: 'Privacy',
    items: [
      'No user accounts, login, or personal data required',
      'Search queries not stored or linked to individuals',
      'Vehicle queries processed in-memory and not retained',
      'No third-party tracking or advertising data collection',
      'MongoDB stores only market price data — zero user PII',
    ],
  },
]

// ── Fairness feature comparison ───────────────────────────────────────────────
const FAIRNESS_ROWS = [
  { feature: 'User income / net worth',      used: false, reason: 'Not relevant to market price' },
  { feature: 'Credit score',                 used: false, reason: 'Financing is separate from market value' },
  { feature: 'Race / ethnicity',             used: false, reason: 'Protected attribute — never collected' },
  { feature: 'Age / gender',                 used: false, reason: 'Protected attribute — never collected' },
  { feature: 'ZIP code / neighborhood',      used: false, reason: 'Only broad region used (state-level)' },
  { feature: 'Car make / model / year',      used: true,  reason: 'Core vehicle identity' },
  { feature: 'Mileage (odometer)',           used: true,  reason: 'Primary depreciation factor (SHAP #1)' },
  { feature: 'Vehicle condition',            used: true,  reason: 'Market price determinant' },
  { feature: 'Region (state-level)',         used: true,  reason: 'Regional supply/demand signal' },
  { feature: 'Historical market prices',     used: true,  reason: 'Time-series trend data from MongoDB' },
]

// ── Interactive AI review component ──────────────────────────────────────────
const DEMO_RESULT = {
  vehicle: '2021 Honda Civic',
  recommendation: 'BUY NOW',
  confidence: 79,
  change: '+2.4%',
  volatility: 'Low',
  risk: 22,
  reasoning: [
    'Civic prices rising 2.4% over 90 days with low market volatility.',
    'Limited compact sedan inventory driving upward price pressure nationally.',
    '79% confidence signal from blended XGBoost + Prophet + LLM analysis.',
  ],
  transparency: 'XGBoost + GPT-4o-mini blended forecast using 8 months of price history.',
  bias: 'Honda Civic is well-represented in training data — below-average model uncertainty.',
}

export default function PrincipledAIPage() {
  const [activeStep,    setActiveStep]    = useState(1)
  const [reviewDecision, setReviewDecision] = useState(null)
  const [showFeedback,   setShowFeedback]   = useState(false)

  // Auto-advance HITL steps
  useEffect(() => {
    const t = setTimeout(() => {
      setActiveStep(s => s < HITL_STEPS.length ? s + 1 : 1)
    }, 3000)
    return () => clearTimeout(t)
  }, [activeStep])

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-b from-slate-100 to-[#F5F0E8] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <Shield size={12} />
            Principled AI · Responsible AI Spark Challenge
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
            Responsible <span className="text-emerald-400">AI Design</span>
          </h1>
          <p className="text-slate-600 text-base max-w-2xl">
            Vroomly is built on four pillars of responsible AI: Transparency, Accountability, Fairness, and Privacy.
            Humans remain in the decision loop — AI provides evidence, not commands.
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Protected Attributes Used', value: '0', color: 'text-emerald-400', icon: Shield },
              { label: 'Confidence Score Displayed', value: '100%', color: 'text-orange-500', icon: Eye },
              { label: 'Audit Trail Steps', value: '9', color: 'text-purple-400', icon: FileText },
              { label: 'Advisory Only', value: '✓', color: 'text-amber-400', icon: Scale },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-white/80 border border-slate-200 rounded-2xl p-4 text-center">
                <Icon size={18} className={`${color} mx-auto mb-2`} />
                <p className={`text-3xl font-black ${color}`}>{value}</p>
                <p className="text-slate-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Human-in-the-Loop animated flow ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <User size={18} className="text-amber-400" />
            <h2 className="text-xl font-bold text-slate-900">Human-in-the-Loop Architecture</h2>
          </div>
          <p className="text-slate-600 text-sm mb-6">
            AI generates evidence — humans make decisions. Click any step to explore.
          </p>

          {/* Step progress */}
          <div className="flex flex-wrap gap-3 mb-6">
            {HITL_STEPS.map(step => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-300 ${
                  activeStep === step.id
                    ? 'bg-slate-100 border-orange-500/50 text-slate-900 shadow-lg'
                    : 'bg-[#F5F0E8]/60 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: activeStep === step.id ? step.color + '33' : '#1e293b' }}>
                  <span style={{ color: activeStep === step.id ? step.color : '#64748b' }}>{step.id}</span>
                </div>
                {step.title.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>

          {/* Active step detail */}
          {HITL_STEPS.map(step => step.id === activeStep && (
            <div key={step.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#F5F0E8]/60 border border-slate-200 rounded-2xl p-6 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: step.color + '22' }}>
                    <step.Icon size={24} style={{ color: step.color }} />
                  </div>
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${step.badgeColor}`}>
                      {step.badge}
                    </span>
                    <h3 className="text-slate-900 font-bold text-lg mt-0.5">{step.title}</h3>
                  </div>
                </div>
                <p className="text-slate-600 leading-relaxed">{step.desc}</p>
              </div>

              {/* Flow arrows visualization */}
              <div className="flex items-center justify-center">
                <div className="space-y-3 w-full max-w-xs">
                  {HITL_STEPS.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        s.id <= activeStep ? 'opacity-100' : 'opacity-30'
                      }`} style={{ background: s.color + (s.id <= activeStep ? '33' : '11') }}>
                        <s.Icon size={14} style={{ color: s.id <= activeStep ? s.color : '#475569' }} />
                      </div>
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-1.5 rounded-full transition-all duration-700"
                            style={{
                              width: s.id < activeStep ? '100%' : s.id === activeStep ? '60%' : '0%',
                              background: s.color,
                            }} />
                        </div>
                      </div>
                      {i < HITL_STEPS.length - 1 && (
                        <ArrowRight size={10} className="text-slate-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Interactive AI Review Demo ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-amber-400" />
            <h2 className="text-xl font-bold text-slate-900">Interactive: Review an AI Decision</h2>
          </div>
          <p className="text-slate-600 text-sm mb-6">
            This is how Vroomly presents AI analysis for human review.
            The human has full context before deciding.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* AI Output */}
            <div className="lg:col-span-2 bg-[#F5F0E8]/60 border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bot size={16} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-600">AI Agent Output</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">Advisory Only</span>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-slate-600 text-xs">Vehicle</p>
                  <p className="text-slate-900 font-bold text-lg">{DEMO_RESULT.vehicle}</p>
                </div>
                <div className="bg-emerald-500 text-slate-900 font-black text-xl px-4 py-2 rounded-xl">
                  {DEMO_RESULT.recommendation}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Confidence', value: `${DEMO_RESULT.confidence}%`, color: 'text-orange-500' },
                  { label: '90-Day Change', value: DEMO_RESULT.change, color: 'text-emerald-400' },
                  { label: 'Risk Score', value: DEMO_RESULT.risk + '/100', color: 'text-emerald-400' },
                ].map(m => (
                  <div key={m.label} className="bg-white rounded-lg p-3 text-center">
                    <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-4">
                {DEMO_RESULT.reasoning.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <p className="text-slate-600 text-sm">{r}</p>
                  </div>
                ))}
              </div>

              <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg p-3">
                <p className="text-amber-300/80 text-xs">
                  <span className="font-semibold text-amber-400">Bias note: </span>
                  {DEMO_RESULT.bias}
                </p>
              </div>
            </div>

            {/* Human Decision Panel */}
            <div className="bg-[#F5F0E8]/60 border border-amber-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Your Decision</span>
              </div>

              <p className="text-slate-600 text-xs mb-4">
                The AI recommends BUY NOW. You've reviewed the evidence.
                What do you decide?
              </p>

              <div className="space-y-2 mb-4">
                {[
                  { label: 'Accept AI recommendation', key: 'accept', color: 'emerald' },
                  { label: 'Need more information', key: 'more',   color: 'blue' },
                  { label: 'Override — will wait',    key: 'wait',  color: 'amber' },
                  { label: 'Reject — different car',  key: 'reject', color: 'red' },
                ].map(opt => (
                  <button key={opt.key}
                    onClick={() => { setReviewDecision(opt.key); setShowFeedback(false) }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                      reviewDecision === opt.key
                        ? `bg-${opt.color}-500/15 border-${opt.color}-500/40 text-${opt.color}-300`
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {reviewDecision && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-300">
                  {reviewDecision === 'accept' && 'You accepted the AI recommendation. Remember: this is your decision, not the AI\'s.'}
                  {reviewDecision === 'more' && 'Good choice. Explore the scenario simulator or compare regional prices before deciding.'}
                  {reviewDecision === 'wait' && 'You\'ve overridden the AI. Human judgment prevails — the AI was advisory only.'}
                  {reviewDecision === 'reject' && 'Perfectly valid. AI recommendations are one input among many.'}
                </div>
              )}

              {reviewDecision && !showFeedback && (
                <button onClick={() => setShowFeedback(true)}
                  className="mt-3 text-xs text-slate-500 hover:text-slate-600 underline w-full text-center">
                  Was this AI prediction helpful? Give feedback
                </button>
              )}

              {showFeedback && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-500">Rate the AI recommendation quality:</p>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs hover:bg-emerald-500/25 transition-colors">
                      <ThumbsUp size={12} /> Helpful
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-red-500/15 text-red-400 text-xs hover:bg-red-500/25 transition-colors">
                      <ThumbsDown size={12} /> Not helpful
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-600 text-center">Feedback improves future recommendations</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Four Pillars ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {PILLARS.map(pillar => (
            <div key={pillar.title} className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: pillar.color + '22' }}>
                  <pillar.Icon size={20} style={{ color: pillar.color }} />
                </div>
                <h3 className="text-slate-900 font-bold text-lg">{pillar.title}</h3>
              </div>
              <ul className="space-y-2.5">
                {pillar.items.map((item, i) => (
                  <li key={i} className="flex gap-2.5">
                    <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: pillar.color }} />
                    <span className="text-slate-600 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Fairness: What We Don't Use ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Scale size={18} className="text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900">Fairness: Feature Audit</h2>
          </div>
          <p className="text-slate-600 text-sm mb-5">
            Vroomly makes no decisions based on who you are — only on market data about the vehicle.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2.5 text-slate-600 font-medium">Feature</th>
                  <th className="text-center py-2.5 text-slate-600 font-medium">Used in Model</th>
                  <th className="text-left py-2.5 text-slate-600 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {FAIRNESS_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-slate-200/80 hover:bg-slate-100/20 transition-colors">
                    <td className="py-2.5 text-slate-700">{row.feature}</td>
                    <td className="py-2.5 text-center">
                      {row.used
                        ? <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold"><CheckCircle size={12} /> Yes</span>
                        : <span className="inline-flex items-center gap-1 text-red-400 text-xs font-semibold"><AlertCircle size={12} /> No</span>
                      }
                    </td>
                    <td className="py-2.5 text-slate-500 text-xs">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Ethics disclaimer banner ── */}
        <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border border-emerald-500/20 rounded-2xl p-6 text-center">
          <Shield size={24} className="text-emerald-400 mx-auto mb-3" />
          <h3 className="text-slate-900 font-bold text-lg mb-2">AI Recommendations Are Advisory Only</h3>
          <p className="text-slate-600 text-sm max-w-2xl mx-auto">
            Vroomly provides data-driven price intelligence for informational purposes only.
            Recommendations are generated by machine learning models and AI analysis — not human financial advice.
            Always verify with a licensed dealer or independent inspection before purchasing any vehicle.
          </p>
        </div>

      </div>
    </div>
  )
}
