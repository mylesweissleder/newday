import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('demo@networkcrm.com')
  const [password, setPassword] = useState('demo123456')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Left side - Brief */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
          <div className="flex flex-col justify-center px-12 py-16">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">Network CRM</h1>
              <p className="text-xl text-blue-100">AI-Powered Contact Management & Network Mining</p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-400 rounded-full flex items-center justify-center mt-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Smart Contact Management</h3>
                  <p className="text-blue-100 text-sm">Bulk import from LinkedIn, Gmail, CRM. AI automatically categorizes and tiers your contacts by value and relationship strength.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-green-400 rounded-full flex items-center justify-center mt-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Network Analysis</h3>
                  <p className="text-blue-100 text-sm">Discover hidden connections, identify influencers, find warm introduction paths, and map relationships for strategic networking.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 bg-purple-400 rounded-full flex items-center justify-center mt-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Automated Outreach</h3>
                  <p className="text-blue-100 text-sm">GPT-4 generates personalized messages for each contact. Launch campaigns across email and LinkedIn with 25% higher response rates.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-3">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <h4 className="font-semibold">Expected Outcomes</h4>
              </div>
              <ul className="text-sm text-blue-100 space-y-1">
                <li>• 10x faster contact organization</li>
                <li>• 25% higher outreach response rates</li>
                <li>• 3-5x more warm introductions</li>
                <li>• Network-driven revenue opportunities</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right side - Login */}
        <div className="w-full lg:w-1/2 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Network CRM Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-Powered Contact Management
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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

          <div className="text-center text-sm text-gray-500 space-y-1">
            <p className="font-medium">Demo Credentials:</p>
            <p>Email: demo@networkcrm.com</p>
            <p>Password: demo123456</p>
            <button 
              type="button" 
              onClick={() => handleSubmit(new Event('submit') as any)}
              className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
            >
              🔧 Test Login Function
            </button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage