import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface CrewInfo {
  accountName: string
  memberCount: number
  createdAt: string
}

const JoinCrewPage: React.FC = () => {
  const { user, setUser } = useAuth()
  const [joinCode, setJoinCode] = useState('')
  const [crewInfo, setCrewInfo] = useState<CrewInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  const getApiHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
  })

  const searchCrew = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a join code')
      return
    }

    setLoading(true)
    setError('')
    setCrewInfo(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/crew/search/${joinCode.trim().toUpperCase()}`, {
        headers: getApiHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setCrewInfo(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Crew not found')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const joinCrew = async () => {
    setJoining(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/crew/join-request`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(data.message)
        
        // Update user context with new account info
        if (data.user) {
          const updatedUser = {
            ...user,
            accountId: data.user.accountId,
            accountName: data.user.accountName,
            role: data.user.role
          }
          setUser(updatedUser)
          localStorage.setItem('user-data', JSON.stringify(updatedUser))
        }

        // Clear form
        setJoinCode('')
        setCrewInfo(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to join crew')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join a Crew</h1>
          <p className="text-gray-600">
            Enter a join code to request access to an existing crew
          </p>
        </div>

        {/* Join Code Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Join Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CREW-ABC123"
              className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-center"
              maxLength={10}
            />
            <button
              onClick={searchCrew}
              disabled={loading || !joinCode.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Ask your crew leader for the join code
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">{success}</p>
            <p className="text-sm text-green-500 mt-1">
              You can now access your new crew's shared network!
            </p>
          </div>
        )}

        {/* Crew Info Display */}
        {crewInfo && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Crew Found!</h3>
            <div className="space-y-2 text-blue-800">
              <div><strong>Crew Name:</strong> {crewInfo.accountName}</div>
              <div><strong>Members:</strong> {crewInfo.memberCount}</div>
              <div><strong>Founded:</strong> {new Date(crewInfo.createdAt).toLocaleDateString()}</div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={joinCrew}
                disabled={joining}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
              >
                {joining ? 'Joining...' : 'Join This Crew'}
              </button>
              <button
                onClick={() => {
                  setCrewInfo(null)
                  setJoinCode('')
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* How it Works */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-medium mb-3 text-gray-900">How it works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Get a join code from a crew leader or admin</li>
            <li>Enter the code above and click "Search"</li>
            <li>Review the crew information</li>
            <li>Click "Join This Crew" to send your request</li>
            <li>You'll immediately gain access to the crew's shared network</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-100 rounded border border-yellow-300">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Join codes are managed by crew leaders. Contact your crew leader if you need a new code or if the code has expired.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JoinCrewPage