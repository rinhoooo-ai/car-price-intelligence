import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import AnalyzePage from './pages/AnalyzePage'
import MarketPage  from './pages/MarketPage'
import TechPage    from './pages/TechPage'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 flex flex-col text-white">
        <Navbar />
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/"       element={<AnalyzePage />} />
            <Route path="/market" element={<MarketPage />}  />
            <Route path="/tech"   element={<TechPage />}   />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
