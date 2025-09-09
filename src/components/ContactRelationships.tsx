import React, { useState, useEffect } from 'react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  company?: string
  position?: string
  email?: string
  linkedinUrl?: string
  city?: string
  state?: string
  country?: string
}

interface Relationship {
  id: string
  contactId: string
  relatedContactId: string
  relationshipType: string
  strength?: number
  confidence?: number
  notes?: string
  source?: string
  isVerified: boolean
  isMutual: boolean
  createdAt: string
  contact?: Contact
  relatedContact?: Contact
}

interface RelationshipsData {
  relationships: Relationship[]
  relatedTo: Relationship[]
  analytics?: {
    totalConnections: number
    directConnections: number
    influenceScore: number
    industryDiversity: number
    geographicSpread: number
  }
  totalRelationships: number
}

interface ContactRelationshipsProps {
  contactId: string
  onAddRelationship: () => void
}

const ContactRelationships: React.FC<ContactRelationshipsProps> = ({
  contactId,
  onAddRelationship
}) => {
  const [relationshipsData, setRelationshipsData] = useState<RelationshipsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  useEffect(() => {
    fetchRelationships()
  }, [contactId])

  const fetchRelationships = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/api/relationships/contact/${contactId}?includeAnalytics=${showAnalytics}`,
        {
          credentials: 'include'
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch relationships')
      }

      const data = await response.json()
      setRelationshipsData(data)
    } catch (error) {
      console.error('Error fetching relationships:', error)
      setError('Failed to load relationships')
    } finally {
      setLoading(false)
    }
  }

  const deleteRelationship = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to delete this relationship?')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/relationships/${relationshipId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete relationship')
      }

      // Refresh relationships
      fetchRelationships()
    } catch (error) {
      console.error('Error deleting relationship:', error)
      alert('Failed to delete relationship')
    }
  }

  const getRelationshipColor = (type: string) => {
    const colors: Record<string, string> = {
      'COLLEAGUE': 'bg-blue-100 text-blue-800',
      'CLIENT': 'bg-green-100 text-green-800',
      'VENDOR': 'bg-purple-100 text-purple-800',
      'PARTNER': 'bg-orange-100 text-orange-800',
      'INVESTOR': 'bg-yellow-100 text-yellow-800',
      'MENTOR': 'bg-indigo-100 text-indigo-800',
      'MENTEE': 'bg-pink-100 text-pink-800',
      'FRIEND': 'bg-red-100 text-red-800',
      'FAMILY': 'bg-red-200 text-red-900',
      'ACQUAINTANCE': 'bg-gray-100 text-gray-800',
      'PROSPECT': 'bg-teal-100 text-teal-800',
      'COMPETITOR': 'bg-red-100 text-red-700'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getStrengthColor = (strength?: number) => {
    if (!strength) return 'bg-gray-200'
    if (strength >= 0.8) return 'bg-green-500'
    if (strength >= 0.6) return 'bg-yellow-500'
    if (strength >= 0.4) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const renderRelationship = (relationship: Relationship, isReverse: boolean = false) => {
    const otherContact = isReverse ? relationship.contact : relationship.relatedContact
    if (!otherContact) return null

    return (
      <div key={relationship.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium text-gray-900">
                {otherContact.firstName} {otherContact.lastName}
              </h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelationshipColor(relationship.relationshipType)}`}>
                {relationship.relationshipType.replace('_', ' ').toLowerCase()}
              </span>
              {relationship.isVerified && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                  ✓ Verified
                </span>
              )}
              {relationship.isMutual && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                  ↔ Mutual
                </span>
              )}
            </div>
            
            {otherContact.company && (
              <p className="text-sm text-gray-600 mb-1">
                {otherContact.position ? `${otherContact.position} at ` : ''}{otherContact.company}
              </p>
            )}
            
            {otherContact.city && otherContact.state && (
              <p className="text-sm text-gray-500 mb-1">
                {otherContact.city}, {otherContact.state}
              </p>
            )}

            {relationship.strength && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-600">Strength:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                  <div 
                    className={`h-2 rounded-full ${getStrengthColor(relationship.strength)}`}
                    style={{ width: `${(relationship.strength || 0) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600">{Math.round((relationship.strength || 0) * 100)}%</span>
              </div>
            )}

            {relationship.notes && (
              <p className="text-sm text-gray-600 mt-2 italic">
                "{relationship.notes}"
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              {relationship.source && (
                <span>Source: {relationship.source.replace('_', ' ')}</span>
              )}
              <span>Added: {new Date(relationship.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {otherContact.email && (
              <a
                href={`mailto:${otherContact.email}`}
                className="text-blue-600 hover:text-blue-800"
                title="Send email"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            )}
            
            {otherContact.linkedinUrl && (
              <a
                href={otherContact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
                title="View LinkedIn profile"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            )}

            <button
              onClick={() => deleteRelationship(relationship.id)}
              className="text-red-600 hover:text-red-800"
              title="Delete relationship"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={fetchRelationships}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!relationshipsData) return null

  const allRelationships = [...relationshipsData.relationships, ...relationshipsData.relatedTo]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Relationships ({relationshipsData.totalRelationships})
          </h3>
          <p className="text-sm text-gray-600">
            Connections and network relationships
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowAnalytics(!showAnalytics)
              fetchRelationships()
            }}
            className={`px-3 py-1 text-sm rounded-md ${showAnalytics ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'} hover:bg-opacity-80`}
          >
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </button>
          <button
            onClick={onAddRelationship}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Add Relationship
          </button>
        </div>
      </div>

      {showAnalytics && relationshipsData.analytics && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-3">Network Analytics</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{relationshipsData.analytics.totalConnections}</div>
              <div className="text-sm text-blue-700">Total Connections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{Math.round(relationshipsData.analytics.influenceScore * 100)}%</div>
              <div className="text-sm text-blue-700">Influence Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{Math.round(relationshipsData.analytics.industryDiversity * 100)}%</div>
              <div className="text-sm text-blue-700">Industry Diversity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{Math.round(relationshipsData.analytics.geographicSpread * 100)}%</div>
              <div className="text-sm text-blue-700">Geographic Spread</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{relationshipsData.analytics.directConnections}</div>
              <div className="text-sm text-blue-700">Direct Connections</div>
            </div>
          </div>
        </div>
      )}

      {allRelationships.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No relationships found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a relationship to this contact.</p>
          <div className="mt-6">
            <button
              onClick={onAddRelationship}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Relationship
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {relationshipsData.relationships.map(relationship => 
            renderRelationship(relationship, false)
          )}
          {relationshipsData.relatedTo.map(relationship => 
            renderRelationship(relationship, true)
          )}
        </div>
      )}
    </div>
  )
}

export default ContactRelationships