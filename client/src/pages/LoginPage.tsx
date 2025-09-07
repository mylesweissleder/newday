import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import RegisterPage from '../components/RegisterPage'
import AboutPage from './AboutPage'

type ViewMode = 'login' | 'register' | 'about'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('demo@truecrew.com')
  const [password, setPassword] = useState('demo123456')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('LoginPage: Form submitted with email:', email)
    setError('')
    setLoading(true)

    try {
      console.log('LoginPage: Calling login function...')
      const result = await login(email, password)
      console.log('LoginPage: Login result:', result)
      
      if (!result?.success) {
        console.error('LoginPage: Login failed with error:', result?.error)
        setError(result?.error || 'Login failed')
      } else {
        console.log('LoginPage: Login successful, should redirect to dashboard')
      }
      // If successful, the user state will update and component will re-render
    } catch (err) {
      console.error('LoginPage: Login error caught:', err)
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
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row">
        {/* Left side - Brief */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
          <div className="flex flex-col justify-center px-12 py-16">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-4xl">🤝</span>
                <h1 className="text-4xl font-bold">TrueCrew</h1>
              </div>
              <p className="text-xl text-blue-100">Your crew's connections unlock career opportunities.</p>
            </div>
            
            {/* MVP Internal Tool Notice */}
            <div className="mb-8 p-4 bg-yellow-400 bg-opacity-20 rounded-lg border border-yellow-400 border-opacity-30">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-yellow-300 text-lg">🚧</span>
                <h4 className="font-semibold text-yellow-100">MVP Internal Tool</h4>
              </div>
              <p className="text-yellow-100 text-sm leading-relaxed">
                This is an internal sandbox tool for Myles and Chris. We're exploring the possibility of making this a real product — geared towards helping close networks grow, get hired, and find resources. Built in a weekend, it's showing promising potential for MRR.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-400 rounded-full flex items-center justify-center mt-1 text-white text-xs font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Assemble Your Crew</h3>
                  <p className="text-blue-100 text-sm">Invite 2–5 trusted colleagues, mentors, or peers who know different industries and companies. Share your combined networks securely within your crew.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-green-400 rounded-full flex items-center justify-center mt-1 text-white text-xs font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Connect Your Professional Life</h3>
                  <p className="text-blue-100 text-sm">Upload your contacts and connect Gmail & LinkedIn. We'll map who knows whom—finding warm paths to decision makers through your crew's combined networks.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-purple-400 rounded-full flex items-center justify-center mt-1 text-white text-xs font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Get Thoughtful Introductions</h3>
                  <p className="text-blue-100 text-sm">When you find an opportunity, we help craft warm, personal introduction requests to your crew members who can make the connection happen.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-yellow-400 text-lg">🎯</span>
                <h4 className="font-semibold">Our Vision</h4>
              </div>
              <ul className="text-sm text-blue-100 space-y-2">
                <li>• Help those who need it most — beyond the Silicon Valley bubble</li>
                <li>• Specially priced for wider adoption and accessibility</li>
                <li>• Focus on people struggling to find connection in job searches</li>
                <li>• Turn trusted relationships into career opportunities</li>
              </ul>
              
              <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                <button
                  onClick={() => setViewMode('about')}
                  className="text-blue-100 hover:text-white text-sm underline mb-3 block"
                >
                  About TrueCrew
                </button>
                
                <p className="text-blue-100 text-xs leading-relaxed">
                  👉 Building something meaningful: helping people find work through genuine connections, not cold outreach.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login */}
        <div className="w-full lg:w-1/2 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
          <div className="max-w-md w-full space-y-6">
        <div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-2xl">🤝</span>
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">TrueCrew</h2>
            </div>
            <p className="text-sm text-gray-600">
              Where your crew's connections become career opportunities
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
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-gray-500">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-500">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
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
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Careers
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Contact
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Affiliate Network
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Support</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Help Center
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Documentation
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Status
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Legal</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Privacy Policy
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Terms of Service
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Cookie Policy
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        GDPR Compliance
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Product</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Features
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        Pricing
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-500 hover:text-gray-900">
                        API
                      </a>
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
              <div className="mt-4 md:mt-0 flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-gray-500 text-sm">
                  Security
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-500 text-sm">
                  Accessibility
                </a>
                <span className="text-gray-300">|</span>
                <a href="#" className="text-gray-400 hover:text-gray-500 text-sm">
                  Join Affiliate Network
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LoginPage