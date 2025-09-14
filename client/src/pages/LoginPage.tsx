import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import RegisterPage from '../components/RegisterPage'
import AboutPage from './AboutPage'

type ViewMode = 'login' | 'register' | 'about'

interface LoginPageProps {
  onBack?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onBack }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const { login } = useAuth()

  // Clear form on mount - no demo credentials
  useEffect(() => {
    setEmail('')
    setPassword('')
    setError('')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔑 LoginPage: Attempting login for:', email)
    
    setError('')
    setLoading(true)

    try {
      const result = await login(email, password)
      
      if (result.success) {
        console.log('✅ LoginPage: Login successful - App.tsx will handle automatic redirect')
        // No manual navigation needed - App.tsx will automatically show the app
      } else {
        console.error('❌ LoginPage: Login failed:', result.error)
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      console.error('🚨 LoginPage: Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle registration view
  if (viewMode === 'register') {
    return <RegisterPage onBack={() => setViewMode('login')} />
  }
  
  if (viewMode === 'about') {
    return <AboutPage onBack={() => setViewMode('login')} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-100 to-yellow-50 text-gray-800">
      {/* Back Button */}
      {onBack && (
        <div className="absolute top-6 left-6 z-10">
          <button
            onClick={onBack}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            ← Back to Home
          </button>
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row">
        {/* Left side - Brief */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-100/80 via-amber-100/80 to-yellow-100/80 backdrop-blur-sm text-gray-800 border-r border-orange-200">
          <div className="flex flex-col justify-center px-12 py-16">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-4xl">🤝</span>
                <h1 className="text-4xl font-bold">TrueCrew</h1>
              </div>
              <p className="text-xl text-gray-700">Your crew's connections unlock career opportunities.</p>
            </div>
            
            {/* MVP Internal Tool Notice */}
            <div className="mb-8 p-4 bg-orange-200/40 rounded-lg border border-orange-300">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-orange-600 text-lg">🚧</span>
                <h4 className="font-semibold text-gray-800">MVP Internal Tool</h4>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                This is an internal sandbox tool for Myles and Chris. We're exploring the possibility of making this a real product — geared towards helping close networks grow, get hired, and find resources.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-orange-500 rounded-full flex items-center justify-center mt-1 text-white text-xs font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">Assemble Your Crew</h3>
                  <p className="text-gray-600 text-sm">Invite 2–5 trusted colleagues, mentors, or peers who know different industries and companies. Share your combined networks securely within your crew.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center mt-1 text-white text-xs font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Connect Your Professional Life</h3>
                  <p className="text-gray-600 text-sm">Upload your contacts and connect Gmail & LinkedIn. We'll map who knows whom—finding warm paths to decision makers through your crew's combined networks.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-yellow-500 rounded-full flex items-center justify-center mt-1 text-white text-xs font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Get Thoughtful Introductions</h3>
                  <p className="text-gray-600 text-sm">When you find an opportunity, we help craft warm, personal introduction requests to your crew members who can make the connection happen.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white/60 rounded-lg border border-orange-200 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-orange-600 text-lg">🎯</span>
                <h4 className="font-semibold text-gray-800">Our Vision</h4>
              </div>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• Help those who need it most — beyond the Silicon Valley bubble</li>
                <li>• Specially priced for wider adoption and accessibility</li>
                <li>• Focus on people struggling to find connection in job searches</li>
                <li>• Turn trusted relationships into career opportunities</li>
              </ul>
              
              <div className="mt-4 pt-4 border-t border-orange-200">
                <button
                  onClick={() => setViewMode('about')}
                  className="text-gray-700 hover:text-gray-900 text-sm underline mb-3 block"
                >
                  About TrueCrew
                </button>
                
                <p className="text-gray-600 text-xs leading-relaxed">
                  👉 Building something meaningful: helping people find work through genuine connections, not cold outreach.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login */}
        <div className="w-full lg:w-1/2 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 min-h-screen bg-white/40 backdrop-blur-sm">
          <div className="max-w-md w-full space-y-6">
            <div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🤝</span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">TrueCrew</h2>
                </div>
                <p className="text-lg text-gray-700 mb-6">
                  Welcome back to your network
                </p>
              </div>
            </div>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="block w-full px-4 py-3 bg-white/80 border border-orange-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent backdrop-blur-sm"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="block w-full px-4 py-3 bg-white/80 border border-orange-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent backdrop-blur-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-100/80 border border-red-300 py-3 px-4 rounded-xl backdrop-blur-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <div className="text-center space-y-4">
            <div className="border-t border-orange-200 pt-6">
              <p className="text-sm text-gray-600 mb-4">
                Don't have an account?
              </p>
              <button
                type="button"
                onClick={() => setViewMode('register')}
                disabled={loading}
                className="w-full bg-white/80 text-gray-800 border border-orange-200 py-3 px-4 rounded-xl hover:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium backdrop-blur-sm transition-all duration-200 disabled:opacity-50"
              >
                Create New Account
              </button>
            </div>
          </div>
        </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8 xl:col-span-1">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🤝</span>
                <span className="text-xl font-bold text-gray-900">TrueCrew</span>
              </div>
              <p className="text-gray-500 text-base">
                Where your crew's connections become career opportunities. Build your trusted network and unlock opportunities together.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Company</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <button onClick={() => setViewMode('about')} className="text-base text-gray-500 hover:text-gray-900">
                        About
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-base text-gray-400">
                &copy; 2025 TrueCrew, Inc. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LoginPage