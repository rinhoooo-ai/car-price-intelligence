import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar              from './components/Navbar'
import AnalyzePage         from './pages/AnalyzePage'
import MarketPage          from './pages/MarketPage'
import TechPage            from './pages/TechPage'
import MarketTrendsPage    from './pages/MarketTrendsPage'
import PrincipledAIPage    from './pages/PrincipledAIPage'
import EconomicImpactPage  from './pages/EconomicImpactPage'
import DecisionReportPage      from './pages/DecisionReportPage'
import NegotiationHelperPage  from './pages/NegotiationHelperPage'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 flex flex-col text-white">
        <Navbar />
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/"        element={<AnalyzePage />}        />
            <Route path="/market"  element={<MarketPage />}         />
            <Route path="/trends"  element={<MarketTrendsPage />}   />
            <Route path="/ethics"  element={<PrincipledAIPage />}   />
            <Route path="/impact"  element={<EconomicImpactPage />} />
            <Route path="/report"  element={<DecisionReportPage />} />
            <Route path="/tech"    element={<TechPage />}           />
            <Route path="/negotiate" element={<NegotiationHelperPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
