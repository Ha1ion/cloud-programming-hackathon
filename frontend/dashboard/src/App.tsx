import { useState } from 'react'
import LoginPage from './components/LoginPage'
import ScooterDashboard from './components/ScooterDashboard'

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sw_token'))

  const handleLogout = () => {
    localStorage.removeItem('sw_token')
    setToken(null)
  }

  if (!token) {
    return <LoginPage onLogin={setToken} />
  }

  return <ScooterDashboard onLogout={handleLogout} />
}
