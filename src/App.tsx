import { Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import AboutPage from '@/pages/AboutPage'
import BudgetPage from '@/pages/BudgetPage'
import SpendingPage from '@/pages/SpendingPage'
import IncomePage from '@/pages/IncomePage'
import SignInPage from '@/pages/SignInPage'
import { RequireAuth } from '@/components/auth/RequireAuth'

function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/spending" element={<SpendingPage />} />
        <Route path="/income" element={<IncomePage />} />
      </Route>
    </Routes>
  )
}

export default App
