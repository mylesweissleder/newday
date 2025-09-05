import React, { useState, useEffect } from 'react'
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface SiteAccessGateProps {
  children: React.ReactNode
}

const SiteAccessGate: React.FC<SiteAccessGateProps> = ({ children }) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if already authenticated
    const savedToken = localStorage.getItem('site-access-token')
    if (savedToken) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/site-access/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('site-access-token', data.token)
        localStorage.setItem('site-password', password) // Store for API requests
        setIsAuthenticated(true)
      } else {
        setError(data.error || 'Invalid password')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center">
            <LockClosedIcon className="h-10 w-10 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Network CRM
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            AI-Powered Contact Management & Network Mining
          </p>
          <p className="mt-4 text-sm text-gray-500">
            This application requires access credentials
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">
              Access Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter access password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
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
              disabled={loading || !password.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Access Application'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-gray-500">
          <p>Secure access to network management tools</p>
        </div>
      </div>
    </div>
  )
}

export default SiteAccessGate