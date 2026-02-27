import { NavLink } from 'react-router-dom'
import { Car, BarChart3, Cpu, TrendingUp, Shield, Globe, FileText, BarChart2, Handshake } from 'lucide-react'

const links = [
  { to: '/',           label: 'Analyze',      icon: TrendingUp, end: true  },
  { to: '/market',     label: 'Market',       icon: BarChart3,  end: false },
  { to: '/trends',     label: 'Trends',       icon: BarChart2,  end: false },
  { to: '/negotiate',  label: 'Negotiate',    icon: Handshake,  end: false },
  { to: '/ethics',     label: 'Ethical AI',   icon: Shield,     end: false },
  { to: '/impact',     label: 'Impact',       icon: Globe,      end: false },
  { to: '/report',     label: 'AI Report',    icon: FileText,   end: false },
  { to: '/tech',       label: 'Architecture', icon: Cpu,        end: false },
]

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-orange-700 flex items-center justify-center shadow-lg shadow-orange-700/30 group-hover:bg-orange-600 transition-colors">
              <Car size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Vroom<span className="text-orange-400">ly</span>
            </span>
          </NavLink>

          {/* Nav links — scrollable on small screens */}
          <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar ml-4">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={13} />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
