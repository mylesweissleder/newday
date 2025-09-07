import React, { useState, useEffect } from 'react'
import ContactEditModal from '../components/ContactEditModal'
import BulkContactActions from '../components/BulkContactActions'
import { validateContact } from '../utils/dataValidation'
import { safeFetch, safeContactOperation, getUserFriendlyMessage } from '../utils/errorHandling'
import { LocalBackupManager, performDataIntegrityCheck, exportContactData, downloadBackup } from '../utils/dataBackup'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  phone?: string
  tier: string
  tags?: string[]
  source?: string
  createdAt: string
  updatedAt: string
  _count?: {
    outreach: number
    relationships: number
  }
}

interface ContactsPageProps {
  onBack: () => void
}

const ContactsPage: React.FC<ContactsPageProps> = ({ onBack }) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTier, setSelectedTier] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [systemError, setSystemError] = useState<string | null>(null)
  const [dataIntegrityStatus, setDataIntegrityStatus] = useState<any>(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  useEffect(() => {
    fetchContacts()
  }, [currentPage, searchTerm, selectedTier])

  // Auto-backup when contacts change
  useEffect(() => {
    if (contacts.length > 0 && LocalBackupManager.needsBackup()) {
      LocalBackupManager.createBackup(contacts, 'current-user', 'current-account')
    }
  }, [contacts])

  // Perform data integrity check
  useEffect(() => {
    if (contacts.length > 0) {
      const integrityCheck = performDataIntegrityCheck(contacts)
      setDataIntegrityStatus(integrityCheck)
      
      if (!integrityCheck.isHealthy) {
        console.warn('Data integrity issues detected:', integrityCheck.issues)
      }
    }
  }, [contacts])

  const fetchContacts = async () => {
    const result = await safeContactOperation(async () => {
      const token = localStorage.getItem('auth-token')
      
      if (token === 'demo-token') {
        // Demo data with validation
        const demoContacts = [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@techcorp.com',
            company: 'TechCorp Inc',
            position: 'CEO',
            tier: 'TIER_1',
            tags: ['imported', 'linkedin'],
            source: 'LinkedIn Export',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _count: { outreach: 3, relationships: 2 }
          },
          {
            id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@startupxyz.com',
            company: 'StartupXYZ',
            position: 'CTO',
            tier: 'TIER_1',
            tags: ['imported', 'event'],
            source: 'SFNT Event',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _count: { outreach: 5, relationships: 1 }
          },
          {
            id: '3',
            firstName: 'Mike',
            lastName: 'Johnson',
            email: 'mike.j@consulting.com',
            company: 'Consulting Group',
            position: 'Partner',
            tier: 'TIER_2',
            tags: ['imported'],
            source: 'CSV Import',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _count: { outreach: 1, relationships: 0 }
          }
        ]
        
        setTotalPages(1)
        return demoContacts
      }

      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedTier && { tier: selectedTier })
      })

      const response = await safeFetch(`${API_BASE_URL}/api/contacts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setTotalPages(data.pagination?.totalPages || 1)
      return data.contacts || []

    }, 'fetchContacts', { currentPage, searchTerm, selectedTier })

    if (result.data) {
      setContacts(result.data)
      setSystemError(null)
    } else if (result.error) {
      setSystemError(getUserFriendlyMessage(result.error))
      setContacts([])
    }

    setLoading(false)
  }

  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts)
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId)
    } else {
      newSelected.add(contactId)
    }
    setSelectedContacts(newSelected)
  }

  const selectAllContacts = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)))
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'TIER_1': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'TIER_2': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'TIER_1': return '⭐ Tier 1'
      case 'TIER_2': return '🔸 Tier 2'
      default: return '◯ Tier 3'
    }
  }

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setIsEditModalOpen(true)
  }

  const handleSaveContact = async (updatedContact: Contact) => {
    const token = localStorage.getItem('auth-token')
    
    if (token === 'demo-token') {
      // Update in demo data
      setContacts(prev => prev.map(c => 
        c.id === updatedContact.id ? { ...updatedContact, updatedAt: new Date().toISOString() } : c
      ))
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/${updatedContact.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: updatedContact.firstName,
          lastName: updatedContact.lastName,
          email: updatedContact.email,
          company: updatedContact.company,
          position: updatedContact.position,
          phone: updatedContact.phone,
          tier: updatedContact.tier.toUpperCase(),
          linkedinUrl: updatedContact.linkedinUrl,
          relationshipNotes: updatedContact.relationshipNotes
        })
      })

      if (response.ok) {
        const savedContact = await response.json()
        setContacts(prev => prev.map(c => 
          c.id === updatedContact.id ? savedContact : c
        ))
      } else {
        throw new Error('Failed to save contact')
      }
    } catch (error) {
      console.error('Error saving contact:', error)
      alert('Failed to save contact. Please try again.')
      throw error
    }
  }

  const handleBulkDelete = async (contactIds: string[]) => {
    const token = localStorage.getItem('auth-token')
    
    if (token === 'demo-token') {
      setContacts(prev => prev.filter(c => !contactIds.includes(c.id)))
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/bulk-delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactIds })
      })

      if (response.ok) {
        setContacts(prev => prev.filter(c => !contactIds.includes(c.id)))
      } else {
        throw new Error('Failed to delete contacts')
      }
    } catch (error) {
      console.error('Error deleting contacts:', error)
      alert('Failed to delete contacts. Please try again.')
      throw error
    }
  }

  const handleBulkUpdateTier = async (contactIds: string[], tier: string) => {
    const token = localStorage.getItem('auth-token')
    
    if (token === 'demo-token') {
      setContacts(prev => prev.map(c => 
        contactIds.includes(c.id) ? { ...c, tier, updatedAt: new Date().toISOString() } : c
      ))
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/bulk-update-tier`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactIds, tier })
      })

      if (response.ok) {
        const updatedContacts = await response.json()
        setContacts(prev => prev.map(c => {
          const updated = updatedContacts.find((u: Contact) => u.id === c.id)
          return updated || c
        }))
      } else {
        throw new Error('Failed to update contact tiers')
      }
    } catch (error) {
      console.error('Error updating contact tiers:', error)
      alert('Failed to update contact tiers. Please try again.')
      throw error
    }
  }

  const handleBulkAddTags = async (contactIds: string[], tags: string[]) => {
    const token = localStorage.getItem('auth-token')
    
    if (token === 'demo-token') {
      setContacts(prev => prev.map(c => 
        contactIds.includes(c.id) ? {
          ...c, 
          tags: [...(c.tags || []), ...tags].filter((tag, index, arr) => arr.indexOf(tag) === index),
          updatedAt: new Date().toISOString()
        } : c
      ))
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts/bulk-add-tags`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contactIds, tags })
      })

      if (response.ok) {
        const updatedContacts = await response.json()
        setContacts(prev => prev.map(c => {
          const updated = updatedContacts.find((u: Contact) => u.id === c.id)
          return updated || c
        }))
      } else {
        throw new Error('Failed to add tags to contacts')
      }
    } catch (error) {
      console.error('Error adding tags to contacts:', error)
      alert('Failed to add tags to contacts. Please try again.')
      throw error
    }
  }

  const handleBulkExport = (contactIds: string[]) => {
    const selectedContactsData = contacts.filter(c => contactIds.includes(c.id))
    const csvContent = [
      ['First Name', 'Last Name', 'Email', 'Company', 'Position', 'Phone', 'Tier', 'Tags', 'Source'],
      ...selectedContactsData.map(c => [
        c.firstName,
        c.lastName,
        c.email,
        c.company || '',
        c.position || '',
        c.phone || '',
        c.tier,
        (c.tags || []).join(';'),
        c.source || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `contacts_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleClearSelection = () => {
    setSelectedContacts(new Set())
  }

  // Emergency export functionality
  const handleEmergencyExport = async () => {
    try {
      const exportData = await exportContactData(contacts, {
        includeCustomFields: true,
        includeInteractions: true,
        includeCampaigns: true,
        format: 'json'
      })
      
      const timestamp = new Date().toISOString().split('T')[0]
      downloadBackup(exportData, `contacts_backup_${timestamp}.json`, 'application/json')
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export contacts. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg style={{width: '20px', height: '20px'}} className="mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600">Manage your network and relationships</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">{contacts.length} contacts</span>
          
          {/* System Health Indicators */}
          {dataIntegrityStatus && !dataIntegrityStatus.isHealthy && (
            <div className="flex items-center text-amber-600 text-sm">
              <svg style={{width: '16px', height: '16px'}} className="mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Data Issues
            </div>
          )}
          
          <button
            onClick={handleEmergencyExport}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            title="Export all contacts as backup"
          >
            🔒 Backup
          </button>
        </div>
      </div>

      {/* System Error Alert */}
      {systemError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg style={{width: '20px', height: '20px'}} className="text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-red-800 font-medium">System Error</h4>
              <p className="text-red-700 text-sm">{systemError}</p>
            </div>
            <button
              onClick={() => setSystemError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Data Integrity Warning */}
      {dataIntegrityStatus && !dataIntegrityStatus.isHealthy && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg style={{width: '20px', height: '20px'}} className="text-amber-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-amber-800 font-medium">Data Quality Issues Detected</h4>
              <div className="text-amber-700 text-sm mt-1">
                {dataIntegrityStatus.summary.missingEmails > 0 && (
                  <p>• {dataIntegrityStatus.summary.missingEmails} contacts missing email addresses</p>
                )}
                {dataIntegrityStatus.summary.duplicateEmails > 0 && (
                  <p>• {dataIntegrityStatus.summary.duplicateEmails} duplicate email addresses found</p>
                )}
                {dataIntegrityStatus.summary.incompleteRecords > 0 && (
                  <p>• {dataIntegrityStatus.summary.incompleteRecords} contacts with incomplete information</p>
                )}
              </div>
              <button
                onClick={handleEmergencyExport}
                className="mt-2 text-amber-800 underline text-sm hover:text-amber-900"
              >
                Create backup before fixing issues
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Tiers</option>
              <option value="TIER_1">Tier 1</option>
              <option value="TIER_2">Tier 2</option>
              <option value="TIER_3">Tier 3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                Export
              </button>
              {selectedContacts.size > 0 && (
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                  Delete ({selectedContacts.size})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contacts List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedContacts.size === contacts.length && contacts.length > 0}
                onChange={selectAllContacts}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {selectedContacts.size > 0 ? `${selectedContacts.size} selected` : 'Select all'}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              Showing {contacts.length} contacts
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-4 flex items-center justify-center">
              <svg style={{width: '48px', height: '48px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600">Start by importing your first contacts!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {contacts.map((contact) => (
              <div key={contact.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => toggleContactSelection(contact.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </p>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium border ${getTierColor(contact.tier)}`}>
                              {getTierLabel(contact.tier)}
                            </span>
                          </div>
                          <p className="text-sm text-blue-600">{contact.email}</p>
                          {(contact.company || contact.position) && (
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <span className="mr-1">🏢</span>
                              {contact.company && <span className="font-medium">{contact.company}</span>}
                              {contact.company && contact.position && <span className="mx-2">•</span>}
                              {contact.position && <span>{contact.position}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right text-sm text-gray-500">
                          {contact._count && (
                            <div>
                              {contact._count.outreach > 0 && (
                                <div>{contact._count.outreach} outreach</div>
                              )}
                              {contact._count.relationships > 0 && (
                                <div>{contact._count.relationships} connections</div>
                              )}
                            </div>
                          )}
                          <div className="text-xs">
                            Added {new Date(contact.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button className="p-2 hover:bg-gray-100 rounded-full" title="Send Message">
                            <svg style={{width: '16px', height: '16px'}} className="text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleEditContact(contact)}
                            className="p-2 hover:bg-gray-100 rounded-full" 
                            title="Edit Contact"
                          >
                            <svg style={{width: '16px', height: '16px'}} className="text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contact Edit Modal */}
      <ContactEditModal
        contact={editingContact}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingContact(null)
        }}
        onSave={handleSaveContact}
      />

      {/* Bulk Contact Actions */}
      <BulkContactActions
        selectedContacts={contacts.filter(c => selectedContacts.has(c.id))}
        onDelete={handleBulkDelete}
        onUpdateTier={handleBulkUpdateTier}
        onAddTags={handleBulkAddTags}
        onExport={handleBulkExport}
        onClearSelection={handleClearSelection}
      />
    </div>
  )
}

export default ContactsPage