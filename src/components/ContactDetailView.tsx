import React, { useState, useEffect } from 'react'
import ContactRelationships from './ContactRelationships'
import RelationshipModal from './RelationshipModal'
import NetworkIntelligence from './NetworkIntelligence'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  position?: string
  linkedinUrl?: string
  twitterUrl?: string
  website?: string
  tier?: string
  tags?: string[]
  source?: string
  status: string
  connectionDate?: string
  lastContactDate?: string
  relationshipType?: string
  relationshipNotes?: string
  city?: string
  state?: string
  country?: string
  timezone?: string
  createdAt: string
  updatedAt: string
  createdBy?: {
    firstName: string
    lastName: string
    email: string
  }
  _count?: {
    outreach: number
    relationships: number
    relatedTo: number
  }
}

interface ContactDetailViewProps {
  contact: Contact
  onClose: () => void
  onEdit: () => void
  onRefresh: () => void
  onViewInNetwork?: () => void
}

const ContactDetailView: React.FC<ContactDetailViewProps> = ({
  contact,
  onClose,
  onEdit,
  onRefresh,
  onViewInNetwork
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'activity' | 'network'>('overview')
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false)
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false)
  const [potentialRelationships, setPotentialRelationships] = useState<any[]>([])
  const [discoveryLoading, setDiscoveryLoading] = useState(false)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  useEffect(() => {
    if (activeTab === 'network') {
      fetchPotentialRelationships()
    }
  }, [activeTab, contact.id])

  const fetchPotentialRelationships = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/relationships/potential?limit=5&minConfidence=0.5`,
        { credentials: 'include' }
      )
      if (response.ok) {
        const data = await response.json()
        // Filter for relationships involving this contact
        const relevant = data.potentialRelationships.filter((rel: any) => 
          rel.contactId === contact.id || rel.relatedContactId === contact.id
        )
        setPotentialRelationships(relevant)
      }
    } catch (error) {
      console.error('Error fetching potential relationships:', error)
    }
  }

  const discoverRelationships = async () => {
    try {
      setDiscoveryLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/api/relationships/discover/${contact.id}`,
        { method: 'POST', credentials: 'include' }
      )
      if (response.ok) {
        const data = await response.json()
        setPotentialRelationships(data.discoveries.slice(0, 5))
      }
    } catch (error) {
      console.error('Error discovering relationships:', error)
    } finally {
      setDiscoveryLoading(false)
    }
  }

  const getTierColor = (tier?: string) => {
    const colors: Record<string, string> = {
      'TIER_1': 'bg-green-100 text-green-800',
      'TIER_2': 'bg-blue-100 text-blue-800',
      'TIER_3': 'bg-yellow-100 text-yellow-800',
      'TIER_4': 'bg-gray-100 text-gray-800'
    }
    return colors[tier || 'TIER_4'] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const totalRelationships = (contact._count?.relationships || 0) + (contact._count?.relatedTo || 0)

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-full max-w-5xl shadow-lg rounded-md bg-white mb-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {contact.firstName} {contact.lastName}
              </h2>
              {contact.tier && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(contact.tier)}`}>
                  {contact.tier.replace('_', ' ')}
                </span>
              )}
              {contact.status && (
                <span className={`px-2 py-1 rounded-full text-xs ${
                  contact.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {contact.status}
                </span>
              )}
            </div>
            
            {contact.position && contact.company && (
              <p className="text-lg text-gray-600 mb-1">
                {contact.position} at {contact.company}
              </p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {contact.email && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800">
                    {contact.email}
                  </a>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800">
                    {contact.phone}
                  </a>
                </div>
              )}
              
              {contact.city && contact.state && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {contact.city}, {contact.state}
                  {contact.country && contact.country !== 'US' && `, ${contact.country}`}
                </div>
              )}
            </div>

            {/* Social Links */}
            <div className="flex gap-3 mt-3">
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                  title="LinkedIn Profile"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
              
              {contact.twitterUrl && (
                <a
                  href={contact.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-600"
                  title="Twitter Profile"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              )}
              
              {contact.website && (
                <a
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-800"
                  title="Website"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsNetworkModalOpen(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700"
            >
              Network Intel
            </button>
            {onViewInNetwork && (
              <button
                onClick={onViewInNetwork}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
              >
                View in Network
              </button>
            )}
            <button
              onClick={onEdit}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Edit Contact
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalRelationships}</div>
            <div className="text-sm text-gray-600">Relationships</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{contact._count?.outreach || 0}</div>
            <div className="text-sm text-gray-600">Outreach</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{potentialRelationships.length}</div>
            <div className="text-sm text-gray-600">Discoveries</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {contact.lastContactDate ? 
                Math.floor((new Date().getTime() - new Date(contact.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
                : '∞'}
            </div>
            <div className="text-sm text-gray-600">Days Since Contact</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('relationships')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'relationships'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Relationships ({totalRelationships})
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'network'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Network Intelligence
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activity
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="max-h-96 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Source:</span>
                    <span className="ml-2 text-gray-900">{contact.source || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Connection Date:</span>
                    <span className="ml-2 text-gray-900">{formatDate(contact.connectionDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Contact:</span>
                    <span className="ml-2 text-gray-900">{formatDate(contact.lastContactDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Added:</span>
                    <span className="ml-2 text-gray-900">{formatDate(contact.createdAt)}</span>
                  </div>
                  {contact.timezone && (
                    <div>
                      <span className="text-gray-500">Timezone:</span>
                      <span className="ml-2 text-gray-900">{contact.timezone}</span>
                    </div>
                  )}
                  {contact.createdBy && (
                    <div>
                      <span className="text-gray-500">Added by:</span>
                      <span className="ml-2 text-gray-900">
                        {contact.createdBy.firstName} {contact.createdBy.lastName}
                      </span>
                    </div>
                  )}
                </div>

                {contact.tags && contact.tags.length > 0 && (
                  <div className="mt-4">
                    <span className="text-gray-500 text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {contact.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {contact.relationshipNotes && (
                  <div className="mt-4">
                    <span className="text-gray-500 text-sm">Notes:</span>
                    <p className="mt-1 text-gray-900 text-sm italic">"{contact.relationshipNotes}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'relationships' && (
            <ContactRelationships
              contactId={contact.id}
              onAddRelationship={() => setIsRelationshipModalOpen(true)}
            />
          )}

          {activeTab === 'network' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-900">Potential Relationships</h4>
                  <p className="text-sm text-gray-600">AI-discovered potential connections</p>
                </div>
                <button
                  onClick={discoverRelationships}
                  disabled={discoveryLoading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {discoveryLoading ? 'Discovering...' : 'Run Discovery'}
                </button>
              </div>

              {potentialRelationships.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No discoveries yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Run the discovery algorithm to find potential relationships.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {potentialRelationships.map(potential => (
                    <div key={potential.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">
                              {potential.relatedContact.firstName} {potential.relatedContact.lastName}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {potential.relationshipType.replace('_', ' ').toLowerCase()}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {Math.round(potential.confidence * 100)}% confident
                            </span>
                          </div>
                          {potential.relatedContact.company && (
                            <p className="text-sm text-gray-600">{potential.relatedContact.company}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200">
                            Approve
                          </button>
                          <button className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200">
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

          {activeTab === 'activity' && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Activity Timeline</h3>
              <p className="mt-1 text-sm text-gray-500">Contact activity and interaction history will be shown here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RelationshipModal
        isOpen={isRelationshipModalOpen}
        onClose={() => setIsRelationshipModalOpen(false)}
        contactId={contact.id}
        onRelationshipAdded={() => {
          setIsRelationshipModalOpen(false)
          onRefresh()
        }}
      />

      {isNetworkModalOpen && (
        <NetworkIntelligence
          onClose={() => setIsNetworkModalOpen(false)}
        />
      )}
    </div>
  )
}

export default ContactDetailView