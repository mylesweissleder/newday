import React, { useState, useEffect } from 'react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  company?: string
  position?: string
  email?: string
}

interface PotentialRelationship {
  id: string
  contactId: string
  relatedContactId: string
  relationshipType: string
  confidence: number
  evidence: Array<{
    type: string
    score: number
    details: any
  }>
  source: string
  status: string
  createdAt: string
  contact: Contact
  relatedContact: Contact
}

interface MutualConnection {
  id: string
  firstName: string
  lastName: string
  company?: string
  position?: string
}

interface MutualConnectionsData {
  contact1: { id: string; name: string }
  contact2: { id: string; name: string }
  mutualConnections: MutualConnection[]
  totalMutualConnections: number
}

interface NetworkIntelligenceProps {
  onClose: () => void
}

const NetworkIntelligence: React.FC<NetworkIntelligenceProps> = ({ onClose }) => {
  const [potentialRelationships, setPotentialRelationships] = useState<PotentialRelationship[]>([])
  const [selectedContacts, setSelectedContacts] = useState<[string, string]>(['', ''])
  const [mutualConnections, setMutualConnections] = useState<MutualConnectionsData | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'discoveries' | 'mutual' | 'paths'>('discoveries')

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  useEffect(() => {
    fetchPotentialRelationships()
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts?limit=100&status=ACTIVE`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const fetchPotentialRelationships = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/relationships/potential?limit=20&minConfidence=0.3`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setPotentialRelationships(data.potentialRelationships)
      }
    } catch (error) {
      console.error('Error fetching potential relationships:', error)
    } finally {
      setLoading(false)
    }
  }

  const runBatchDiscovery = async () => {
    try {
      setDiscoveryLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/relationships/discovery/batch`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        alert('Batch discovery started! This may take a few minutes. Refresh the page to see new discoveries.')
        setTimeout(fetchPotentialRelationships, 5000) // Refresh after 5 seconds
      } else {
        throw new Error('Failed to start batch discovery')
      }
    } catch (error) {
      console.error('Error starting batch discovery:', error)
      alert('Failed to start batch discovery')
    } finally {
      setDiscoveryLoading(false)
    }
  }

  const approveRelationship = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/relationships/potential/${id}/approve`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        setPotentialRelationships(prev => 
          prev.filter(rel => rel.id !== id)
        )
      } else {
        throw new Error('Failed to approve relationship')
      }
    } catch (error) {
      console.error('Error approving relationship:', error)
      alert('Failed to approve relationship')
    }
  }

  const rejectRelationship = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/relationships/potential/${id}/reject`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        setPotentialRelationships(prev => 
          prev.filter(rel => rel.id !== id)
        )
      } else {
        throw new Error('Failed to reject relationship')
      }
    } catch (error) {
      console.error('Error rejecting relationship:', error)
      alert('Failed to reject relationship')
    }
  }

  const findMutualConnections = async () => {
    if (!selectedContacts[0] || !selectedContacts[1]) {
      alert('Please select two contacts to find mutual connections')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/api/relationships/mutual/${selectedContacts[0]}/${selectedContacts[1]}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setMutualConnections(data)
      } else {
        throw new Error('Failed to find mutual connections')
      }
    } catch (error) {
      console.error('Error finding mutual connections:', error)
      alert('Failed to find mutual connections')
    } finally {
      setLoading(false)
    }
  }

  const getEvidenceIcon = (type: string) => {
    const icons: Record<string, string> = {
      'same_company': '🏢',
      'same_email_domain': '📧',
      'same_location': '📍',
      'similar_roles': '💼',
      'mutual_connections': '🤝',
      'related_companies': '🔗',
      'both_on_linkedin': '💼'
    }
    return icons[type] || '🔍'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50'
    if (confidence >= 0.4) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white mb-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Network Intelligence</h3>
            <p className="text-sm text-gray-600">Discover connections and analyze your network</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('discoveries')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'discoveries'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Relationship Discoveries ({potentialRelationships.length})
            </button>
            <button
              onClick={() => setActiveTab('mutual')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mutual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mutual Connections
            </button>
            <button
              onClick={() => setActiveTab('paths')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'paths'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Connection Paths
            </button>
          </nav>
        </div>

        {/* Discoveries Tab */}
        {activeTab === 'discoveries' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                AI-discovered potential relationships based on common connections, companies, and other signals
              </p>
              <button
                onClick={runBatchDiscovery}
                disabled={discoveryLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {discoveryLoading ? 'Running Discovery...' : 'Run Discovery'}
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading discoveries...</p>
              </div>
            ) : potentialRelationships.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No discoveries yet</h3>
                <p className="mt-1 text-sm text-gray-500">Run the discovery algorithm to find potential relationships.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {potentialRelationships.map(potential => (
                  <div key={potential.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {potential.contact.firstName} {potential.contact.lastName}
                            <span className="text-gray-500 mx-2">↔</span>
                            {potential.relatedContact.firstName} {potential.relatedContact.lastName}
                          </h4>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {potential.relationshipType.replace('_', ' ').toLowerCase()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(potential.confidence)}`}>
                            {Math.round(potential.confidence * 100)}% confidence
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 mb-3">
                          {potential.contact.company && `${potential.contact.company}`}
                          {potential.relatedContact.company && ` ↔ ${potential.relatedContact.company}`}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {potential.evidence.map((evidence, idx) => (
                            <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                              <span>{getEvidenceIcon(evidence.type)}</span>
                              <span className="text-gray-700">
                                {evidence.type.replace('_', ' ')} ({Math.round(evidence.score * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="text-xs text-gray-500">
                          Discovered: {new Date(potential.createdAt).toLocaleDateString()} via {potential.source.replace('_', ' ')}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => approveRelationship(potential.id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRelationship(potential.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mutual Connections Tab */}
        {activeTab === 'mutual' && (
          <div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Find mutual connections between any two contacts in your network
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Contact</label>
                  <select
                    value={selectedContacts[0]}
                    onChange={(e) => setSelectedContacts([e.target.value, selectedContacts[1]])}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a contact...</option>
                    {contacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName} {contact.company && `(${contact.company})`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Second Contact</label>
                  <select
                    value={selectedContacts[1]}
                    onChange={(e) => setSelectedContacts([selectedContacts[0], e.target.value])}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select a contact...</option>
                    {contacts
                      .filter(contact => contact.id !== selectedContacts[0])
                      .map(contact => (
                        <option key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName} {contact.company && `(${contact.company})`}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={findMutualConnections}
                disabled={loading || !selectedContacts[0] || !selectedContacts[1]}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Finding...' : 'Find Mutual Connections'}
              </button>
            </div>

            {mutualConnections && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Mutual connections between {mutualConnections.contact1.name} and {mutualConnections.contact2.name}
                </h4>
                
                {mutualConnections.mutualConnections.length === 0 ? (
                  <p className="text-gray-500">No mutual connections found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mutualConnections.mutualConnections.map(connection => (
                      <div key={connection.id} className="bg-white p-3 rounded border">
                        <div className="font-medium text-gray-900">
                          {connection.firstName} {connection.lastName}
                        </div>
                        {connection.company && (
                          <div className="text-sm text-gray-600">
                            {connection.position ? `${connection.position} at ` : ''}{connection.company}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Connection Paths Tab */}
        {activeTab === 'paths' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Find the shortest connection path between any two contacts (coming soon)
            </p>
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Path Analysis Coming Soon</h3>
              <p className="mt-1 text-sm text-gray-500">Advanced network path finding features will be available in the next update.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NetworkIntelligence