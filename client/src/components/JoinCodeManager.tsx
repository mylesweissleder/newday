import React, { useState, useEffect } from 'react'

interface JoinCodeData {
  joinCode: string | null
  enabled: boolean
  accountName: string
}

const JoinCodeManager: React.FC = () => {
  const [joinCodeData, setJoinCodeData] = useState<JoinCodeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  const getApiHeaders = () => ({
    'Content-Type': 'application/json'
  })

  useEffect(() => {
    fetchJoinCode()
  }, [])

  const fetchJoinCode = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/crew/join-code`, {
        headers: getApiHeaders(),
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setJoinCodeData(data)
      } else {
        setError('Failed to fetch join code')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const generateJoinCode = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/crew/join-code/generate`, {
        method: 'POST',
        headers: getApiHeaders(),
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setJoinCodeData({
          joinCode: data.joinCode,
          enabled: data.enabled,
          accountName: data.accountName
        })
        setSuccess('Join code generated successfully!')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to generate join code')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setGenerating(false)
    }
  }

  const toggleJoinCode = async (enabled: boolean) => {
    setToggling(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/crew/join-code/toggle`, {
        method: 'PUT',
        headers: getApiHeaders(),
        credentials: 'include',
        body: JSON.stringify({ enabled })
      })

      if (response.ok) {
        const data = await response.json()
        setJoinCodeData(prev => prev ? { ...prev, enabled: data.enabled } : null)
        setSuccess(`Join code ${enabled ? 'enabled' : 'disabled'} successfully!`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update join code')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setToggling(false)
    }
  }

  const copyToClipboard = async () => {
    if (joinCodeData?.joinCode) {
      try {
        await navigator.clipboard.writeText(joinCodeData.joinCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = joinCodeData.joinCode
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Crew Join Code</h2>
        <p className="text-gray-600">
          Allow members to join your crew using a shareable code
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Current Join Code */}
        {joinCodeData?.joinCode ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-blue-900">Current Join Code</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  joinCodeData.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {joinCodeData.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <code className="text-2xl font-mono bg-white px-4 py-2 rounded border font-bold text-blue-900">
                {joinCodeData.joinCode}
              </code>
              <button
                onClick={copyToClipboard}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => toggleJoinCode(!joinCodeData.enabled)}
                disabled={toggling}
                className={`px-4 py-2 rounded font-medium ${
                  joinCodeData.enabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } disabled:bg-gray-400`}
              >
                {toggling ? 'Updating...' : joinCodeData.enabled ? 'Disable' : 'Enable'}
              </button>
              
              <button
                onClick={generateJoinCode}
                disabled={generating}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium disabled:bg-gray-400"
              >
                {generating ? 'Generating...' : 'Generate New Code'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Join Code Generated</h3>
            <p className="text-gray-600 mb-4">Create a join code to allow members to request access to your crew</p>
            <button
              onClick={generateJoinCode}
              disabled={generating}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400"
            >
              {generating ? 'Generating...' : 'Generate Join Code'}
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">How to use Join Codes:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Share the join code with people you want to invite to your crew</li>
            <li>• Members can use the code to instantly join your crew</li>
            <li>• You can enable/disable the code anytime to control access</li>
            <li>• Generate a new code if you need to revoke the current one</li>
            <li>• Only active codes can be used to join crews</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default JoinCodeManager