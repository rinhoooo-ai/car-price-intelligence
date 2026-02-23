import { useState, useEffect, useRef } from 'react'

// ── ViewBox ───────────────────────────────────────────────────────────────────
const W = 1000
const H = 820

// ── Node definitions ──────────────────────────────────────────────────────────
// Each node: id, label, sublabel, x, y, w, h, color, icon (text/emoji), type
const NODES = [
  {
    id: 'user',
    label: 'User Query',
    sublabel: 'make · model · year · mileage',
    x: 480, y: 28, w: 200, h: 44,
    color: '#64748b', type: 'io',
  },
  {
    id: 'gateway',
    label: 'API Gateway',
    sublabel: 'RATE LIMIT · 60 req/min',
    x: 480, y: 100, w: 220, h: 44,
    color: '#f97316', type: 'infra',
    badge: '429 on breach',
  },
  {
    id: 'orchestrator',
    label: 'Orchestrator Agent',
    sublabel: 'STATE MACHINE · deterministic',
    x: 480, y: 178, w: 210, h: 50,
    color: '#6366f1', type: 'agent',
  },
  {
    id: 'pubsub',
    label: 'Event Bus',
    sublabel: 'PUB/SUB · 3 topics',
    x: 480, y: 262, w: 190, h: 44,
    color: '#a78bfa', type: 'infra',
  },
  {
    id: 'data',
    label: 'DataAgent',
    sublabel: 'PHASE 1 · SEQUENTIAL',
    x: 480, y: 348, w: 180, h: 44,
    color: '#3b82f6', type: 'agent',
  },
  {
    id: 'trend',
    label: 'TrendAgent',
    sublabel: 'Prophet · 30/90-day',
    x: 185, y: 440, w: 155, h: 44,
    color: '#8b5cf6', type: 'agent',
  },
  {
    id: 'forecast',
    label: 'ForecastAgent',
    sublabel: 'XGBoost + LLM blend',
    x: 480, y: 440, w: 175, h: 44,
    color: '#10b981', type: 'agent',
  },
  {
    id: 'risk',
    label: 'RiskAgent',
    sublabel: 'Volatility · uncertainty',
    x: 660, y: 440, w: 155, h: 44,
    color: '#f97316', type: 'agent',
  },
  {
    id: 'decision',
    label: 'DecisionAgent',
    sublabel: 'PHASE 3 · NO LLM · Pure Python',
    x: 480, y: 530, w: 210, h: 44,
    color: '#ec4899', type: 'agent',
  },
  {
    id: 'explain',
    label: 'ExplanationAgent',
    sublabel: 'GPT-4o-mini · 3 sentences',
    x: 300, y: 618, w: 175, h: 44,
    color: '#a78bfa', type: 'agent',
  },
  {
    id: 'ethics',
    label: 'EthicsAgent',
    sublabel: 'Bias audit · transparency',
    x: 660, y: 618, w: 165, h: 44,
    color: '#22c55e', type: 'agent',
  },
  {
    id: 'report',
    label: 'Intel Report',
    sublabel: 'BUY / WAIT / MONITOR',
    x: 480, y: 740, w: 190, h: 40,
    color: '#f59e0b', type: 'io',
  },
]

// ── Infrastructure / sidebar nodes ────────────────────────────────────────────
const INFRA_NODES = [
  {
    id: 'cb',
    label: 'Circuit Breaker',
    sublabel: 'CLOSED → OPEN',
    x: 845, y: 178, w: 140, h: 50,
    color: '#ef4444', icon: '⚡',
  },
  {
    id: 'redis',
    label: 'Redis Cache',
    sublabel: 'TTL 30m · hot data',
    x: 845, y: 262, w: 140, h: 50,
    color: '#dc2626', icon: 'R',
  },
  {
    id: 'mongo',
    label: 'MongoDB Atlas',
    sublabel: '328k docs · listings',
    x: 845, y: 348, w: 140, h: 50,
    color: '#10b981', icon: '🍃',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    sublabel: 'GPT-4o-mini · ext svc',
    x: 845, y: 490, w: 140, h: 44,
    color: '#f59e0b', icon: '✦',
  },
]

// ── Edge definitions ───────────────────────────────────────────────────────────
// type: 'seq' | 'par' | 'infra'
// from/to: node ids, or explicit {x,y} points
const EDGES = [
  { id: 'e0',  from: 'user',         to: 'gateway',    type: 'seq',   phase: 0 },
  { id: 'e1',  from: 'gateway',      to: 'orchestrator', type: 'seq', phase: 1 },
  { id: 'e2',  from: 'orchestrator', to: 'cb',          type: 'infra', phase: 1 },
  { id: 'e3',  from: 'orchestrator', to: 'pubsub',       type: 'seq',  phase: 1 },
  { id: 'e4',  from: 'pubsub',       to: 'redis',        type: 'infra', phase: 2 },
  { id: 'e5',  from: 'pubsub',       to: 'data',         type: 'seq',  phase: 2 },
  { id: 'e6',  from: 'data',         to: 'mongo',        type: 'infra', phase: 2 },
  { id: 'e7',  from: 'data',         to: 'redis',        type: 'infra', phase: 2 },
  { id: 'e8',  from: 'data',         to: 'trend',        type: 'par',  phase: 3 },
  { id: 'e9',  from: 'data',         to: 'forecast',     type: 'par',  phase: 3 },
  { id: 'e10', from: 'data',         to: 'risk',         type: 'par',  phase: 3 },
  { id: 'e11', from: 'forecast',     to: 'openai',       type: 'infra', phase: 3 },
  { id: 'e12', from: 'trend',        to: 'decision',     type: 'seq',  phase: 4 },
  { id: 'e13', from: 'forecast',     to: 'decision',     type: 'seq',  phase: 4 },
  { id: 'e14', from: 'risk',         to: 'decision',     type: 'seq',  phase: 4 },
  { id: 'e15', from: 'decision',     to: 'explain',      type: 'par',  phase: 5 },
  { id: 'e16', from: 'decision',     to: 'ethics',       type: 'par',  phase: 5 },
  { id: 'e17', from: 'explain',      to: 'openai',       type: 'infra', phase: 5 },
  { id: 'e18', from: 'explain',      to: 'report',       type: 'seq',  phase: 6 },
  { id: 'e19', from: 'ethics',       to: 'report',       type: 'seq',  phase: 6 },
]

// ── Phase metadata ─────────────────────────────────────────────────────────────
const PHASES = [
  { id: 0, label: 'User → Gateway',       desc: 'Request ingress with rate limiting',          duration: 1200 },
  { id: 1, label: 'Gateway → Orchestrator', desc: 'Circuit breaker armed, Pub/Sub armed',     duration: 1200 },
  { id: 2, label: 'Phase 1 · Sequential', desc: 'DataAgent fetches from MongoDB via Redis cache', duration: 1800 },
  { id: 3, label: 'Phase 2 · Parallel ×3', desc: 'Trend, Forecast, Risk fire simultaneously', duration: 2000 },
  { id: 4, label: 'Phase 3 · Sequential', desc: 'DecisionAgent aggregates — pure Python, no LLM', duration: 1500 },
  { id: 5, label: 'Phase 4 · Parallel ×2', desc: 'Explanation + Ethics fire simultaneously',  duration: 1800 },
  { id: 6, label: 'Aggregation',           desc: 'Orchestrator collects all results',           duration: 1200 },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function nodeCenter(id) {
  const n = NODES.find(n => n.id === id) || INFRA_NODES.find(n => n.id === id)
  if (!n) return { x: 0, y: 0 }
  return { x: n.x, y: n.y + n.h / 2 }
}

function nodeBorderPoint(id, side = 'auto', targetId = null) {
  const n = NODES.find(n => n.id === id) || INFRA_NODES.find(n => n.id === id)
  if (!n) return { x: 0, y: 0 }
  const cx = n.x, cy = n.y + n.h / 2
  if (side === 'bottom') return { x: cx, y: n.y + n.h }
  if (side === 'top')    return { x: cx, y: n.y }
  if (side === 'right')  return { x: n.x + n.w / 2, y: cy }
  if (side === 'left')   return { x: n.x - n.w / 2, y: cy }
  // auto: determine from target
  if (targetId) {
    const t = NODES.find(n => n.id === targetId) || INFRA_NODES.find(n => n.id === targetId)
    if (t) {
      const tx = t.x, ty = t.y + t.h / 2
      if (Math.abs(tx - cx) > Math.abs(ty - cy)) {
        return tx > cx ? { x: n.x + n.w / 2, y: cy } : { x: n.x - n.w / 2, y: cy }
      }
      return ty > cy ? { x: cx, y: n.y + n.h } : { x: cx, y: n.y }
    }
  }
  return { x: cx, y: n.y + n.h }
}

function edgePoints(edge) {
  const fromN = NODES.find(n => n.id === edge.from) || INFRA_NODES.find(n => n.id === edge.from)
  const toN   = NODES.find(n => n.id === edge.to)   || INFRA_NODES.find(n => n.id === edge.to)
  if (!fromN || !toN) return { x1: 0, y1: 0, x2: 0, y2: 0 }

  const fromCX = fromN.x, fromCY = fromN.y + fromN.h / 2
  const toCX   = toN.x,   toCY   = toN.y   + toN.h  / 2

  const dx = toCX - fromCX
  const dy = toCY - fromCY

  let x1, y1, x2, y2
  if (Math.abs(dx) > Math.abs(dy) * 1.8) {
    x1 = dx > 0 ? fromN.x + fromN.w / 2 : fromN.x - fromN.w / 2
    y1 = fromCY
    x2 = dx > 0 ? toN.x - toN.w / 2 : toN.x + toN.w / 2
    y2 = toCY
  } else {
    x1 = fromCX
    y1 = dy > 0 ? fromN.y + fromN.h : fromN.y
    x2 = toCX
    y2 = dy > 0 ? toN.y : toN.y + toN.h
  }
  return { x1, y1, x2, y2 }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FlowNode({ node, active, pulse }) {
  const { id, label, sublabel, x, y, w, h, color, type, badge } = node
  const isIO = type === 'io'
  const rx = isIO ? 20 : 10

  return (
    <g>
      {/* Glow ring when pulse */}
      {pulse && (
        <rect
          x={x - w / 2 - 6} y={y - 6} width={w + 12} height={h + 12}
          rx={rx + 4} fill="none"
          stroke={color} strokeWidth="2" opacity="0.6"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}>
          <animate attributeName="opacity" values="0.6;0;0.6" dur="0.8s" repeatCount="3" />
        </rect>
      )}

      {/* Active highlight */}
      {active && (
        <rect
          x={x - w / 2 - 3} y={y - 3} width={w + 6} height={h + 6}
          rx={rx + 2} fill={color + '18'} stroke={color + '66'} strokeWidth="1.5"
        />
      )}

      {/* Main box */}
      <rect
        x={x - w / 2} y={y} width={w} height={h}
        rx={rx}
        fill={active ? color + '22' : '#1e293b'}
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        style={{ transition: 'fill 0.4s, stroke-width 0.3s' }}
      />

      {/* Label */}
      <text x={x} y={y + h * 0.38} textAnchor="middle"
        fill={active ? 'white' : '#e2e8f0'}
        fontSize="11" fontWeight="700">
        {label}
      </text>

      {/* Sublabel */}
      <text x={x} y={y + h * 0.72} textAnchor="middle"
        fill={color} fontSize="8" fontWeight="500" opacity="0.85">
        {sublabel}
      </text>

      {/* Badge */}
      {badge && (
        <g>
          <rect x={x + w / 2 - 52} y={y - 10} width={52} height={16} rx={4}
            fill={color + '33'} stroke={color + '55'} strokeWidth="1" />
          <text x={x + w / 2 - 26} y={y} textAnchor="middle"
            fill={color} fontSize="7" fontWeight="600">{badge}</text>
        </g>
      )}
    </g>
  )
}

function InfraBox({ node, active, glow }) {
  const { label, sublabel, x, y, w, h, color, icon } = node
  const cx = x

  return (
    <g>
      {glow && (
        <rect x={cx - w / 2 - 5} y={y - 5} width={w + 10} height={h + 10}
          rx={10} fill="none" stroke={color} strokeWidth="2" opacity="0"
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}>
          <animate attributeName="opacity" values="0;0.9;0" dur="1s" repeatCount="indefinite" />
        </rect>
      )}
      <rect x={cx - w / 2} y={y} width={w} height={h} rx={8}
        fill="#1e293b" stroke={color} strokeWidth={active ? 2.5 : 1.5}
        strokeDasharray={active ? 'none' : '5 3'}
        style={{ transition: 'stroke-width 0.3s' }} />
      {/* Icon circle */}
      <circle cx={cx - w / 2 + 18} cy={y + h / 2} r={12}
        fill={color + '22'} stroke={color + '55'} strokeWidth="1" />
      <text x={cx - w / 2 + 18} y={y + h / 2 + 4}
        textAnchor="middle" fill={color} fontSize="10" fontWeight="700">
        {icon}
      </text>
      <text x={cx - w / 2 + 36} y={y + h * 0.38} textAnchor="start"
        fill="#e2e8f0" fontSize="10" fontWeight="700">{label}</text>
      <text x={cx - w / 2 + 36} y={y + h * 0.72} textAnchor="start"
        fill={color} fontSize="7.5" opacity="0.85">{sublabel}</text>
    </g>
  )
}

function FlowEdge({ edge, active, animated, tick }) {
  const { x1, y1, x2, y2 } = edgePoints(edge)
  const isSeq   = edge.type === 'seq'
  const isInfra = edge.type === 'infra'
  const isPar   = edge.type === 'par'

  const baseColor = isInfra ? '#475569'
    : isPar   ? '#a78bfa'
    : '#64748b'
  const activeColor = (() => {
    const toNode = NODES.find(n => n.id === edge.to) || INFRA_NODES.find(n => n.id === edge.to)
    return toNode ? toNode.color : '#6366f1'
  })()

  const stroke    = active ? activeColor : baseColor
  const dashArray = isSeq ? 'none' : isInfra ? '3 4' : '7 4'
  const sw        = active ? 2 : 1

  // Animated particle on this edge
  const progress = animated ? ((tick % 60) / 60) : null

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={stroke} strokeWidth={sw}
        strokeDasharray={dashArray}
        opacity={active ? 1 : 0.45}
        style={{ transition: 'stroke 0.4s, opacity 0.4s' }}
        markerEnd="url(#arrow)" />
      {animated && progress !== null && (
        <circle
          cx={x1 + (x2 - x1) * progress}
          cy={y1 + (y2 - y1) * progress}
          r={3.5} fill={activeColor}
          style={{ filter: `drop-shadow(0 0 4px ${activeColor})` }}>
          <animate attributeName="opacity" values="0.6;1;0.6" dur="0.8s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  )
}

function PhaseLabel({ label, y, color, visible }) {
  return (
    <g opacity={visible ? 1 : 0.2} style={{ transition: 'opacity 0.5s' }}>
      <rect x={6} y={y} width={110} height={20} rx={4}
        fill={color + '22'} stroke={color + '44'} strokeWidth="1" />
      <text x={61} y={y + 13} textAnchor="middle"
        fill={color} fontSize="8" fontWeight="700" letterSpacing="0.5">
        {label}
      </text>
    </g>
  )
}

// ── Main diagram component ─────────────────────────────────────────────────────
export default function MicroserviceFlowDiagram() {
  const [animPhase, setAnimPhase] = useState(0)
  const [tick, setTick] = useState(0)
  const [pulsing, setPulsing] = useState(new Set())
  const phaseRef = useRef(0)
  const timerRef = useRef(null)

  // Tick for particle movement
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 40)
    return () => clearInterval(id)
  }, [])

  // Phase auto-advance
  useEffect(() => {
    function advance() {
      const next = (phaseRef.current + 1) % PHASES.length
      phaseRef.current = next
      setAnimPhase(next)

      // Pulse the destination nodes of edges in this phase
      const arriving = EDGES.filter(e => e.phase === next).map(e => e.to)
      setPulsing(new Set(arriving))
      setTimeout(() => setPulsing(new Set()), 1200)

      timerRef.current = setTimeout(advance, PHASES[next].duration)
    }
    timerRef.current = setTimeout(advance, PHASES[0].duration)
    return () => clearTimeout(timerRef.current)
  }, [])

  // Which edges are active (current phase or already passed)
  const activeEdges = new Set(EDGES.filter(e => e.phase <= animPhase).map(e => e.id))
  // Which edges have running particles (only current phase)
  const animEdges   = new Set(EDGES.filter(e => e.phase === animPhase).map(e => e.id))
  // Which nodes are active
  const activeNodeIds = new Set(
    EDGES.filter(e => e.phase <= animPhase).flatMap(e => [e.from, e.to])
  )

  const currentPhase = PHASES[animPhase]

  return (
    <div className="flex flex-col gap-4">

      {/* Phase info banner */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: '#6366f1' }} />
          <span className="text-xs font-bold text-white">{currentPhase.label}</span>
        </div>
        <span className="text-xs text-slate-400">{currentPhase.desc}</span>
        <div className="ml-auto flex gap-1">
          {PHASES.map((p, i) => (
            <div key={i}
              className="w-5 h-1.5 rounded-full transition-all duration-300"
              style={{ backgroundColor: i <= animPhase ? '#6366f1' : '#1e293b',
                       border: '1px solid #334155' }} />
          ))}
        </div>
      </div>

      {/* SVG */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 800 }}>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0,6 2,0 4" fill="#475569" />
            </marker>
            <marker id="arrow-active" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
              <polygon points="0 0,6 2,0 4" fill="#6366f1" />
            </marker>
            <filter id="glow-indigo">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Background phase bands */}
          <rect x={130} y={330} width={580} height={68} rx={8} fill="#1e3a5f14" />
          <rect x={130} y={422} width={580} height={68} rx={8} fill="#2d1b6914" />
          <rect x={130} y={512} width={580} height={68} rx={8} fill="#4c1d9514" />
          <rect x={130} y={600} width={580} height={76} rx={8} fill="#14532d14" />

          {/* Phase labels — left sidebar */}
          <PhaseLabel label="PHASE 1 · SEQ"   y={340} color="#3b82f6" visible={animPhase >= 2} />
          <PhaseLabel label="PHASE 2 · PAR ×3" y={432} color="#a78bfa" visible={animPhase >= 3} />
          <PhaseLabel label="PHASE 3 · SEQ"   y={522} color="#ec4899" visible={animPhase >= 4} />
          <PhaseLabel label="PHASE 4 · PAR ×2" y={612} color="#22c55e" visible={animPhase >= 5} />

          {/* Edges (rendered below nodes) */}
          {EDGES.map(edge => (
            <FlowEdge
              key={edge.id}
              edge={edge}
              active={activeEdges.has(edge.id)}
              animated={animEdges.has(edge.id)}
              tick={tick}
            />
          ))}

          {/* Infra nodes (right column) */}
          {INFRA_NODES.map(node => (
            <InfraBox
              key={node.id}
              node={node}
              active={activeNodeIds.has(node.id)}
              glow={pulsing.has(node.id)}
            />
          ))}

          {/* Main flow nodes */}
          {NODES.map(node => (
            <FlowNode
              key={node.id}
              node={node}
              active={activeNodeIds.has(node.id)}
              pulse={pulsing.has(node.id)}
            />
          ))}

          {/* Orchestrator heartbeat ring */}
          {(() => {
            const orc = NODES.find(n => n.id === 'orchestrator')
            if (!orc) return null
            return (
              <circle
                cx={orc.x} cy={orc.y + orc.h / 2} r={orc.w / 2 + 6}
                fill="none" stroke="#6366f144" strokeWidth="1.5">
                <animate attributeName="r"
                  values={`${orc.w / 2 + 4};${orc.w / 2 + 14};${orc.w / 2 + 4}`}
                  dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
              </circle>
            )
          })()}

          {/* Redis CACHE HIT flash */}
          {pulsing.has('redis') && (() => {
            const r = INFRA_NODES.find(n => n.id === 'redis')
            return (
              <text x={r.x + 30} y={r.y - 8} textAnchor="middle"
                fill="#dc2626" fontSize="9" fontWeight="700">
                CACHE HIT
                <animate attributeName="opacity" values="1;0" dur="1.2s" fill="freeze" />
              </text>
            )
          })()}

          {/* Legend */}
          <g transform="translate(16, 800)">
            <line x1={0} y1={6} x2={20} y2={6} stroke="#64748b" strokeWidth="2" />
            <text x={25} y={10} fill="#64748b" fontSize="8">Sequential</text>
            <line x1={92} y1={6} x2={112} y2={6} stroke="#a78bfa" strokeWidth="2" strokeDasharray="6 4" />
            <text x={117} y={10} fill="#a78bfa" fontSize="8">Parallel</text>
            <line x1={178} y1={6} x2={198} y2={6} stroke="#475569" strokeWidth="1.5" strokeDasharray="3 4" />
            <text x={203} y={10} fill="#475569" fontSize="8">Infra link</text>
            <circle cx={272} cy={6} r={4} fill="#ef4444" />
            <text x={280} y={10} fill="#ef4444" fontSize="8">Circuit Breaker</text>
            <circle cx={363} cy={6} r={4} fill="#dc2626" />
            <text x={371} y={10} fill="#dc2626" fontSize="8">Redis Cache</text>
            <circle cx={440} cy={6} r={4} fill="#10b981" />
            <text x={448} y={10} fill="#10b981" fontSize="8">MongoDB</text>
          </g>
        </svg>
      </div>
    </div>
  )
}
