import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'

interface AcceptInvitationPageProps {
  token: string
  onComplete: () => void
}

const AcceptInvitationPage: React.FC<AcceptInvitationPageProps> = ({ token, onComplete }) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post('/api/crew/accept-invitation', {
        token,
        password
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          window.location.reload() // Force refresh to login with new account
        }, 2000)
      } else {
        setError(data.error || 'Failed to accept invitation')
      }
    } catch (err) {
      console.error('Invitation acceptance error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TrueCrew!</h1>
            <p className="text-gray-600">
              Your account has been activated successfully. You'll be redirected to the login page in a moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <span className="text-3xl">🤝</span>
            <h1 className="text-2xl font-bold text-gray-900">TrueCrew</h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Accept Your Invitation</h2>
          <p className="text-gray-600">
            Set up your password to join your crew
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Create Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password (min 8 characters)"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm your password"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Setting up your account...' : 'Accept Invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AcceptInvitationPage