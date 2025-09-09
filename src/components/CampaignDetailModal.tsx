import React, { useState, useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface Campaign {
  id: string
  name: string
  description?: string
  objective?: string
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
  startDate?: string
  endDate?: string
  isActive: boolean
  emailTemplate?: string
  linkedinTemplate?: string
  emailSubject?: string
  totalSent: number
  totalOpened: number
  totalResponded: number
  createdAt: string
  updatedAt: string
  contacts?: CampaignContact[]
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  email?: string
  company?: string
  position?: string
  tier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4'
}

interface CampaignContact {
  id: string
  status: 'PENDING' | 'CONTACTED' | 'RESPONDED' | 'INTERESTED' | 'NOT_INTERESTED' | 'CONVERTED' | 'BOUNCED'
  personalizedNote?: string
  lastContacted?: string
  createdAt: string
  contact: Contact
}

interface CampaignDetailModalProps {
  campaign: Campaign
  onClose: () => void
  onUpdate?: () => void
}

const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({ campaign: initialCampaign, onClose, onUpdate }) => {
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign)
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'templates'>('overview')
  const [loading, setLoading] = useState(false)
  const [showAddContacts, setShowAddContacts] = useState(false)
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)

  useEffect(() => {
    fetchCampaignDetails()
  }, [])

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setCampaign(data)
      }
    } catch (error) {
      console.error('Failed to fetch campaign details:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableContacts = async () => {
    try {
      setContactsLoading(true)
      const response = await fetch('/api/contacts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        // Filter out contacts already in campaign
        const assignedContactIds = new Set(campaign.contacts?.map(cc => cc.contact.id) || [])
        const available = data.contacts.filter((contact: Contact) => !assignedContactIds.has(contact.id))
        setAvailableContacts(available)
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setContactsLoading(false)
    }
  }

  const addContactsToCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ contactIds: selectedContacts })
      })

      if (response.ok) {
        setShowAddContacts(false)
        setSelectedContacts([])
        fetchCampaignDetails()
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add contacts to campaign:', error)
    }
  }

  const updateContactStatus = async (contactId: string, status: string, personalizedNote?: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status, personalizedNote })
      })

      if (response.ok) {
        fetchCampaignDetails()
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to update contact status:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      PENDING: 'bg-gray-100 text-gray-800',
      CONTACTED: 'bg-blue-100 text-blue-800',
      RESPONDED: 'bg-purple-100 text-purple-800',
      INTERESTED: 'bg-green-100 text-green-800',
      NOT_INTERESTED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-emerald-100 text-emerald-800',
      BOUNCED: 'bg-orange-100 text-orange-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  const getCampaignStatusBadge = (status: string) => {
    const statusColors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      ACTIVE: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      ARCHIVED: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
        {status}
      </span>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{campaign.name}</h2>
              {getCampaignStatusBadge(campaign.status)}
            </div>
            {campaign.description && (
              <p className="text-gray-600">{campaign.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'contacts', label: 'Contacts', icon: '👥' },
              { id: 'templates', label: 'Templates', icon: '📝' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.id === 'contacts' && campaign.contacts && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-xs rounded-full">
                    {campaign.contacts.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Campaign Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{campaign.contacts?.length || 0}</div>
                  <div className="text-sm text-blue-800">Total Contacts</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{campaign.totalSent}</div>
                  <div className="text-sm text-green-800">Messages Sent</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{campaign.totalOpened}</div>
                  <div className="text-sm text-purple-800">Opens</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{campaign.totalResponded}</div>
                  <div className="text-sm text-orange-800">Responses</div>
                </div>
              </div>

              {/* Campaign Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Campaign Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Objective</label>
                      <p className="text-sm text-gray-900">{campaign.objective || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <p className="text-sm text-gray-900">{formatDate(campaign.startDate)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <p className="text-sm text-gray-900">{formatDate(campaign.endDate)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Performance Metrics</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Open Rate</label>
                      <p className="text-sm text-gray-900">
                        {campaign.totalSent > 0 ? `${Math.round((campaign.totalOpened / campaign.totalSent) * 100)}%` : '0%'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Response Rate</label>
                      <p className="text-sm text-gray-900">
                        {campaign.totalSent > 0 ? `${Math.round((campaign.totalResponded / campaign.totalSent) * 100)}%` : '0%'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created</label>
                      <p className="text-sm text-gray-900">{formatDate(campaign.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Campaign Contacts</h3>
                <button
                  onClick={() => {
                    setShowAddContacts(true)
                    fetchAvailableContacts()
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Contacts
                </button>
              </div>

              {campaign.contacts && campaign.contacts.length > 0 ? (
                <div className="space-y-3">
                  {campaign.contacts.map((campaignContact) => (
                    <div key={campaignContact.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-gray-900">
                              {campaignContact.contact.firstName} {campaignContact.contact.lastName}
                            </h4>
                            {getStatusBadge(campaignContact.status)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {campaignContact.contact.position && campaignContact.contact.company && (
                              <span>{campaignContact.contact.position} at {campaignContact.contact.company}</span>
                            )}
                            {campaignContact.contact.email && (
                              <span className="ml-2">{campaignContact.contact.email}</span>
                            )}
                          </div>
                          {campaignContact.personalizedNote && (
                            <div className="text-sm text-gray-700 mt-2 bg-blue-50 p-2 rounded">
                              <strong>Note:</strong> {campaignContact.personalizedNote}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <select
                            value={campaignContact.status}
                            onChange={(e) => updateContactStatus(campaignContact.contact.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="RESPONDED">Responded</option>
                            <option value="INTERESTED">Interested</option>
                            <option value="NOT_INTERESTED">Not Interested</option>
                            <option value="CONVERTED">Converted</option>
                            <option value="BOUNCED">Bounced</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts assigned</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add contacts to start your outreach campaign.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Email Template</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border">
                      {campaign.emailSubject || 'No subject set'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Content</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                      {campaign.emailTemplate || 'No email template set'}
                    </div>
                  </div>
                </div>
              </div>

              {campaign.linkedinTemplate && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">LinkedIn Template</h3>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                    {campaign.linkedinTemplate}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Contacts Modal */}
        {showAddContacts && (
          <div className="absolute inset-0 bg-white z-10">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add Contacts to Campaign</h3>
              <button
                onClick={() => setShowAddContacts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Select contacts to add to this campaign ({availableContacts.length} available)
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
                    {availableContacts.map((contact) => (
                      <label key={contact.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts(prev => [...prev, contact.id])
                            } else {
                              setSelectedContacts(prev => prev.filter(id => id !== contact.id))
                            }
                          }}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {contact.position && contact.company && (
                              <span>{contact.position} at {contact.company}</span>
                            )}
                            {contact.email && (
                              <span className="ml-2">{contact.email}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowAddContacts(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addContactsToCampaign}
                      disabled={selectedContacts.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CampaignDetailModal