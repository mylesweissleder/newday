import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const AddCrewMemberPage: React.FC = () => {
  const { user } = useAuth()
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const API_BASE_URL = 'https://network-crm-api.onrender.com'
  
  const getApiHeaders = () => ({
    'Content-Type': 'application/json'
  })
  
  const handleSearch = async () => {
    if (!searchEmail) return
    
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/crew/search?email=${encodeURIComponent(searchEmail)}`, {
        credentials: 'include',
        headers: getApiHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data)
        if (data.length === 0) {
          setMessage('No users found with that email')
        }
      } else {
        setMessage('Search failed')
      }
    } catch (error) {
      setMessage('Network error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddToCrew = async (userId: string) => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/crew/add-member`, {
        method: 'POST',
        credentials: 'include',
        headers: getApiHeaders(),
        body: JSON.stringify({ userId })
      })
      
      if (response.ok) {
        setMessage('User added to crew successfully!')
        setSearchResults([])
        setSearchEmail('')
      } else {
        const data = await response.json()
        setMessage(data.error || 'Failed to add user')
      }
    } catch (error) {
      setMessage('Network error')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add Crew Member</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Search for Registered Users</h2>
        
        <div className="flex gap-2 mb-4">
          <input
            type="email"
            placeholder="Enter email address"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchEmail}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            Search
          </button>
        </div>
        
        {message && (
          <div className={`p-3 rounded-lg mb-4 ${
            message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {message}
          </div>
        )}
        
        {searchResults.map((result) => (
          <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
            <div>
              <div className="font-medium">{result.firstName} {result.lastName}</div>
              <div className="text-sm text-gray-600">{result.email}</div>
              {result.accountId === user?.accountId && (
                <div className="text-sm text-green-600">Already in your crew</div>
              )}
            </div>
            {result.accountId !== user?.accountId && (
              <button
                onClick={() => handleAddToCrew(result.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={loading}
              >
                Add to Crew
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-medium mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Ask your colleague to register at the login page</li>
          <li>Once they've registered, search for them by email</li>
          <li>Click "Add to Crew" to add them to your team</li>
          <li>They'll have access to your shared network</li>
        </ol>
      </div>
    </div>
  )
}

export default AddCrewMemberPage