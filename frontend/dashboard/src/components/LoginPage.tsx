import { useState } from 'react'

interface LoginPageProps {
  onLogin: (token: string) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('https://p4oudlfhnd.execute-api.ap-southeast-2.amazonaws.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Invalid credentials.')
        return
      }

      const token = data.token ?? data.accessToken ?? data.idToken ?? data.AuthenticationResult?.IdToken
      if (!token) {
        setError('Login succeeded but no token was returned.')
        return
      }

      localStorage.setItem('sw_token', token)
      onLogin(token)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-900 mb-4">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM19 17H5v-5h14v5z" />
              <circle cx="7.5" cy="14.5" r="1.5" />
              <circle cx="16.5" cy="14.5" r="1.5" />
            </svg>
          </div>
          <h1 className="font-mono text-base font-bold tracking-widest text-gray-900">SCOOTERWATCH</h1>
          <p className="text-xs text-gray-400 mt-1">Fleet Crash Detection System</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-mono text-sm font-semibold text-gray-900 mb-5">Sign in to continue</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-gray-500 uppercase tracking-wider">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="font-mono text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-colors bg-gray-50"
                placeholder="Enter username"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-gray-500 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="font-mono text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 transition-colors bg-gray-50"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <p className="font-mono text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-gray-900 text-white font-mono text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 active:bg-gray-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
