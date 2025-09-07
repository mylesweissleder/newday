import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import RegisterPage from '../components/RegisterPage'

type ViewMode = 'login' | 'register'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('demo@networkcrm.com')
  const [password, setPassword] = useState('demo123456')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(email, password)
      console.log('Login result:', result)
      
      if (!result?.success) {
        setError(result?.error || 'Login failed')
      }
      // If successful, the user state will update and component will re-render
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle registration view
  if (viewMode === 'register') {
    return <RegisterPage onBack={() => setViewMode('login')} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row">
        {/* Left side - Brief */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
          <div className="flex flex-col justify-center px-12 py-16">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-4xl">🐺</span>
                <h1 className="text-4xl font-bold">SmartPack</h1>
              </div>
              <p className="text-xl text-blue-100">Referrals beat cold outreach.</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-400 rounded-full flex items-center justify-center mt-1 text-white text-xs font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Form Your Pack</h3>
                  <p className="text-blue-100 text-sm">Invite 2–5 trusted peers — other job seekers, consultants, or project-hunters who share your hustle.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-green-400 rounded-full flex items-center justify-center mt-1 text-white text-xs font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Referral Radar</h3>
                  <p className="text-blue-100 text-sm">Instantly see who in your pack can open a door. Map warm connections to hiring managers, founders, and budget owners.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-purple-400 rounded-full flex items-center justify-center mt-1 text-white text-xs font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Smart Messaging</h3>
                  <p className="text-blue-100 text-sm">AI helps draft intros and proposals that sound natural and on-point. No more cold outreach — just warm connections.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-yellow-400 text-lg">⭐</span>
                <h4 className="font-semibold">Expected Outcomes</h4>
              </div>
              <ul className="text-sm text-blue-100 space-y-1">
                <li>• Land faster through referrals</li>
                <li>• Access your pack's combined network</li>
                <li>• Get warm intros to decision makers</li>
                <li>• Community over cold outreach</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right side - Login */}
        <div className="w-full lg:w-1/2 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
          <div className="max-w-md w-full space-y-6">
        <div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-2xl">🐺</span>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">SmartPack</h2>
            </div>
            <p className="text-sm text-gray-600">
              Join your pack — referrals beat cold outreach
            </p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 py-2 px-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </div>

          <div className="text-center space-y-4">
            <div className="text-sm text-gray-500 space-y-1">
              <p className="font-medium">Demo Credentials:</p>
              <p>Email: demo@smartpack.com</p>
              <p>Password: demo123456</p>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 mb-2">
                Don't have an account?
              </p>
              <button
                type="button"
                onClick={() => setViewMode('register')}
                className="w-full bg-white text-blue-600 border border-blue-600 py-2 px-4 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm font-medium"
              >
                Create New Account
              </button>
            </div>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage