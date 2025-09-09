import React, { useState, useEffect } from 'react'
import ContactEditModal from '../components/ContactEditModal'
import ContactDetailView from '../components/ContactDetailView'
import NetworkIntelligence from '../components/NetworkIntelligence'
import BulkContactActions from '../components/BulkContactActions'
import AIScoringBadge from '../components/AIScoringBadge'
import OpportunityFlags from '../components/OpportunityFlags'
import AIDashboard from '../components/AIDashboard'
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
  priorityScore?: number
  opportunityScore?: number
  strategicValue?: number
  opportunityFlags?: string[]
  lastScoringUpdate?: string
  _count?: {
    outreach: number
    relationships: number
    relatedTo: number
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
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showAIDashboard, setShowAIDashboard] = useState(false)
  const [aiFilters, setAiFilters] = useState({
    minPriority: '',
    minOpportunity: '',
    minStrategic: '',
    hasOpportunityFlags: false
  })
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [viewingContact, setViewingContact] = useState<Contact | null>(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false)
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false)
  const [systemError, setSystemError] = useState<string | null>(null)
  const [dataIntegrityStatus, setDataIntegrityStatus] = useState<any>(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  useEffect(() => {
    fetchContacts()
  }, [currentPage, searchTerm, selectedTier, sortBy, sortOrder, aiFilters])

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
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedTier && { tier: selectedTier }),
        ...(aiFilters.minPriority && { minPriority: aiFilters.minPriority }),
        ...(aiFilters.minOpportunity && { minOpportunity: aiFilters.minOpportunity }),
        ...(aiFilters.minStrategic && { minStrategic: aiFilters.minStrategic }),
        ...(aiFilters.hasOpportunityFlags && { hasOpportunityFlags: 'true' })
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
      const response = await fetch(`${API_BASE_URL}/api/contacts/bulk/delete`, {
        method: 'POST',
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
      const response = await fetch(`${API_BASE_URL}/api/contacts/bulk/update-tier`, {
        method: 'POST',
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
      const response = await fetch(`${API_BASE_URL}/api/contacts/bulk/add-tags`, {
        method: 'POST',
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
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2 p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg style={{width: '20px', height: '20px'}} className="mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm md:text-base">Back to Dashboard</span>
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm md:text-base text-gray-600">Manage your network and relationships</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <span className="text-xs md:text-sm text-gray-500 px-2 py-1 bg-gray-100 rounded-full">{contacts.length} contacts</span>
          
          <button
            onClick={() => setIsNetworkModalOpen(true)}
            className="flex items-center text-purple-600 hover:text-purple-800 text-xs md:text-sm font-medium bg-purple-50 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Network Intel
          </button>
          
          {/* System Health Indicators */}
          {dataIntegrityStatus && !dataIntegrityStatus.isHealthy && (
            <div className="flex items-center text-amber-600 text-xs md:text-sm bg-amber-50 px-2 py-1 rounded-full">
              <svg style={{width: '14px', height: '14px'}} className="mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Data Issues
            </div>
          )}
          
          <button
            onClick={handleEmergencyExport}
            className="flex items-center text-blue-600 hover:text-blue-800 text-xs md:text-sm font-medium bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
            title="Export all contacts as backup"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Backup
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
      <div className="bg-white rounded-lg shadow border p-4 md:p-6">
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:text-sm md:py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Tier</label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:text-sm md:py-2"
            >
              <option value="">All Tiers</option>
              <option value="TIER_1">Tier 1</option>
              <option value="TIER_2">Tier 2</option>
              <option value="TIER_3">Tier 3</option>
            </select>
          </div>
        </div>
        
        {/* Mobile Actions */}
        {selectedContacts.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <button 
                onClick={() => handleBulkExport(Array.from(selectedContacts))}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export ({selectedContacts.size})
              </button>
              <button 
                onClick={() => handleBulkDelete(Array.from(selectedContacts))}
                className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete ({selectedContacts.size})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contacts List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-4 py-4 md:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedContacts.size === contacts.length && contacts.length > 0}
                onChange={selectAllContacts}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm md:text-base text-gray-700">
                {selectedContacts.size > 0 ? `${selectedContacts.size} selected` : 'Select all'}
              </span>
            </div>
            <span className="text-xs md:text-sm text-gray-500">
              Showing {contacts.length} contacts
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 md:py-12 px-4">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-4 flex items-center justify-center">
              <svg style={{width: '48px', height: '48px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-sm md:text-base text-gray-600">Start by importing your first contacts!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {contacts.map((contact) => {
              const isShared = contact.tags?.includes('shared');
              const hasPhone = contact.phone && contact.phone.trim() !== '';
              const lastContactDays = contact.lastContactDate 
                ? Math.floor((Date.now() - new Date(contact.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              
              return (
              <div key={contact.id} className={`p-4 md:px-6 md:py-4 hover:bg-gray-50 transition-colors ${isShared ? 'border-l-4 border-purple-400' : ''}`}>
                <div className="flex items-start md:items-center">
                  <div className="flex-shrink-0 pt-1 md:pt-0">
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.id)}
                      onChange={() => toggleContactSelection(contact.id)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="ml-3 md:ml-4 flex-1 min-w-0">
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      {/* Header with Avatar and Basic Info */}
                      <div className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 h-12 w-12 ${isShared ? 'bg-gradient-to-r from-purple-500 to-pink-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'} rounded-full flex items-center justify-center text-white font-semibold relative`}>
                          {contact.firstName[0]}{contact.lastName[0]}
                          {isShared && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-purple-500 rounded-full flex items-center justify-center" title="Shared Contact">
                              <span className="text-xs text-white">👥</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-base font-semibold text-gray-900 truncate">
                              {contact.firstName} {contact.lastName}
                            </h3>
                            <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full font-medium border ${getTierColor(contact.tier)}`}>
                              {getTierLabel(contact.tier).replace(/[⭐🔸◯] /, '')}
                            </span>
                          </div>
                          <p className="text-sm text-blue-600 truncate">{contact.email}</p>
                        </div>
                      </div>
                      
                      {/* Company and Position */}
                      {(contact.company || contact.position) && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="truncate">
                            {contact.company && <span className="font-medium">{contact.company}</span>}
                            {contact.company && contact.position && <span className="mx-1">•</span>}
                            {contact.position && <span>{contact.position}</span>}
                          </span>
                        </div>
                      )}
                      
                      {/* Tags */}
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.filter(tag => !['shared'].includes(tag)).slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {contact.tags.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                              +{contact.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Network stats */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {contact._count && (contact._count.relationships + contact._count.relatedTo) > 0 && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-purple-600 font-medium">
                              {contact._count.relationships + contact._count.relatedTo} connections
                            </span>
                          </div>
                        )}
                        {contact._count && contact._count.outreach > 0 && (
                          <div className="flex items-center">
                            <span className="text-blue-600">
                              {contact._count.outreach} interactions
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Bottom row with date and actions */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          {hasPhone && <span className="text-green-600" title={contact.phone}>📱</span>}
                          {lastContactDays !== null && lastContactDays < 7 && (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                          )}
                          <span>Added {new Date(contact.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => {
                              setViewingContact(contact)
                              setIsDetailViewOpen(true)
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors" 
                            title="View Details"
                          >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button 
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors" 
                            title="Send Message"
                          >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleEditContact(contact)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors" 
                            title="Edit Contact"
                          >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout - Hidden on Mobile */}
                    <div className="hidden md:block">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`h-12 w-12 ${isShared ? 'bg-gradient-to-r from-purple-500 to-pink-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'} rounded-full flex items-center justify-center text-white font-semibold relative`}>
                            {contact.firstName[0]}{contact.lastName[0]}
                            {isShared && (
                              <div className="absolute -top-1 -right-1 h-4 w-4 bg-purple-500 rounded-full flex items-center justify-center" title="Shared Contact">
                                <span className="text-xs text-white">👥</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {contact.firstName} {contact.lastName}
                              </p>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium border ${getTierColor(contact.tier)}`}>
                                {getTierLabel(contact.tier)}
                              </span>
                              {hasPhone && (
                                <span className="text-green-600 text-xs" title={contact.phone}>📱</span>
                              )}
                              {lastContactDays !== null && lastContactDays < 7 && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                  Active
                                </span>
                              )}
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
                            {contact.source && (
                              <div className="flex items-center text-xs text-gray-400 mt-1">
                                <span className="mr-1">📂</span>
                                <span>{contact.source}</span>
                              </div>
                            )}
                            {contact.relationshipNotes && (
                              <div className="text-xs text-gray-500 mt-1 italic">
                                <span className="mr-1">📝</span>
                                <span className="line-clamp-2">{contact.relationshipNotes}</span>
                              </div>
                            )}
                            {contact.tags && contact.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {contact.tags.filter(tag => !['shared'].includes(tag)).slice(0, 5).map((tag, idx) => (
                                  <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                    {tag}
                                  </span>
                                ))}
                                {contact.tags.length > 5 && (
                                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                                    +{contact.tags.length - 5}
                                  </span>
                                )}
                              </div>
                            )}
                            {(contact.linkedinUrl || contact.twitterUrl || contact.website) && (
                              <div className="flex items-center space-x-3 mt-2">
                                {contact.linkedinUrl && (
                                  <a 
                                    href={contact.linkedinUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 flex items-center text-xs"
                                    title="View LinkedIn Profile"
                                  >
                                    <span className="mr-1">💼</span>
                                    LinkedIn
                                  </a>
                                )}
                                {contact.twitterUrl && (
                                  <a 
                                    href={contact.twitterUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-600 flex items-center text-xs"
                                    title="View Twitter Profile"
                                  >
                                    <span className="mr-1">🐦</span>
                                    Twitter
                                  </a>
                                )}
                                {contact.website && (
                                  <a 
                                    href={contact.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-gray-800 flex items-center text-xs"
                                    title="Visit Website"
                                  >
                                    <span className="mr-1">🌐</span>
                                    Website
                                  </a>
                                )}
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
              </div>
            );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 md:px-6 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="text-xs md:text-sm text-gray-700 text-center sm:text-left">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden xs:inline">Previous</span>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden xs:inline">Next</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
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

      {/* Contact Detail View */}
      {isDetailViewOpen && viewingContact && (
        <ContactDetailView
          contact={viewingContact}
          onClose={() => {
            setIsDetailViewOpen(false)
            setViewingContact(null)
          }}
          onEdit={() => {
            setEditingContact(viewingContact)
            setIsEditModalOpen(true)
            setIsDetailViewOpen(false)
          }}
          onRefresh={fetchContacts}
        />
      )}

      {/* Network Intelligence Modal */}
      {isNetworkModalOpen && (
        <NetworkIntelligence
          onClose={() => setIsNetworkModalOpen(false)}
        />
      )}

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