import { Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import AboutPage from '@/pages/AboutPage'
import BudgetPage from '@/pages/BudgetPage'
import SpendingPage from '@/pages/SpendingPage'
import IncomePage from '@/pages/IncomePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/budget" element={<BudgetPage />} />
      <Route path="/spending" element={<SpendingPage />} />
      <Route path="/income" element={<IncomePage />} />
    </Routes>
  )
}

export default App
