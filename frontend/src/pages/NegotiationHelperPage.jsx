import { Handshake, DollarSign, AlertTriangle, MessageSquare, Clock, Sparkles, ChevronRight } from 'lucide-react'

const FEATURES = [
  {
    Icon: DollarSign,
    color: '#10b981',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'AI-Calculated Offer Price',
    desc: 'Get a data-backed opening offer based on market comps, listing age, regional demand, and depreciation curves — not gut feeling.',
  },
  {
    Icon: AlertTriangle,
    color: '#f59e0b',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Walk-Away Threshold',
    desc: 'Know your hard limit before you walk in. Our model calculates the maximum fair price so you never overpay under pressure.',
  },
  {
    Icon: MessageSquare,
    color: '#6366f1',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    title: 'Negotiation Talking Points',
    desc: 'AI-generated, vehicle-specific arguments: comparable listings, days on market, seasonal trends, and known depreciation factors.',
  },
  {
    Icon: Sparkles,
    color: '#3b82f6',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Counter-Offer Simulator',
    desc: 'Run through likely dealer responses and practice your counter strategy before stepping into the dealership.',
  },
]

const STEPS = [
  { step: '01', label: 'Enter vehicle details' },
  { step: '02', label: 'AI analyses market comps' },
  { step: '03', label: 'Get your negotiation playbook' },
]

export default function NegotiationHelperPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
            <Clock size={13} />
            Coming Soon
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Handshake size={24} className="text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">Negotiation Helper</h1>
          </div>

          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Get AI-calculated offer prices, walk-away thresholds, and negotiation
            talking points specific to your vehicle — so you walk in confident and
            walk out with the best deal.
          </p>
        </div>

        {/* How it works */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {STEPS.map(({ step, label }, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                  {step}
                </span>
                <span className="text-slate-300 text-sm font-medium whitespace-nowrap">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {FEATURES.map(({ Icon, color, bg, title, desc }) => (
            <div
              key={title}
              className={`rounded-xl border p-5 ${bg} flex gap-4`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18` }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder CTA */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-8 text-center">
          <p className="text-slate-400 text-sm mb-1">
            This feature is currently in development.
          </p>
          <p className="text-slate-500 text-xs">
            In the meantime, use the{' '}
            <a href="/" className="text-blue-400 hover:underline">
              Analyze
            </a>{' '}
            tab to get price predictions and buy/wait recommendations.
          </p>
        </div>

      </div>
    </div>
  )
}
