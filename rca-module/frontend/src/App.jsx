import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import NewInvestigation from './pages/NewInvestigation'
import InvestigationsList from './pages/InvestigationsList'
import InvestigationDetail from './pages/InvestigationDetail'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/"                         element={<Home />} />
            <Route path="/new"                      element={<NewInvestigation />} />
            <Route path="/investigations"           element={<InvestigationsList />} />
            <Route path="/investigations/:id"       element={<InvestigationDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
