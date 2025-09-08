import React, { useState, useEffect } from 'react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  company?: string
  position?: string
  email?: string
}

interface RelationshipModalProps {
  isOpen: boolean
  onClose: () => void
  contactId: string
  onRelationshipAdded: () => void
}

const RELATIONSHIP_TYPES = [
  { value: 'COLLEAGUE', label: 'Colleague' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'INVESTOR', label: 'Investor' },
  { value: 'MENTOR', label: 'Mentor' },
  { value: 'MENTEE', label: 'Mentee' },
  { value: 'FRIEND', label: 'Friend' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'ACQUAINTANCE', label: 'Acquaintance' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'COMPETITOR', label: 'Competitor' }
]

const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  contactId,
  onRelationshipAdded
}) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [relationshipType, setRelationshipType] = useState('ACQUAINTANCE')
  const [strength, setStrength] = useState(0.5)
  const [notes, setNotes] = useState('')
  const [isMutual, setIsMutual] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  useEffect(() => {
    if (isOpen) {
      fetchContacts()
    }
  }, [isOpen, contactId])

  useEffect(() => {
    if (searchTerm) {
      const filtered = contacts.filter(contact =>
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredContacts(filtered)
    } else {
      setFilteredContacts(contacts)
    }
  }, [searchTerm, contacts])

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true)
      const response = await fetch(
        `${API_BASE_URL}/api/contacts?limit=100&status=ACTIVE`,
        {
          credentials: 'include'
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch contacts')
      }

      const data = await response.json()
      // Exclude the current contact from the list
      const otherContacts = data.contacts.filter((contact: Contact) => contact.id !== contactId)
      setContacts(otherContacts)
      setFilteredContacts(otherContacts)
    } catch (error) {
      console.error('Error fetching contacts:', error)
      setError('Failed to load contacts')
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedContactId) {
      setError('Please select a contact')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          contactId,
          relatedContactId: selectedContactId,
          relationshipType,
          strength,
          notes: notes || undefined,
          isMutual,
          isVerified: true,
          source: 'manual'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create relationship')
      }

      onRelationshipAdded()
      handleClose()
    } catch (error) {
      console.error('Error creating relationship:', error)
      setError(error instanceof Error ? error.message : 'Failed to create relationship')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedContactId('')
    setRelationshipType('ACQUAINTANCE')
    setStrength(0.5)
    setNotes('')
    setIsMutual(false)
    setSearchTerm('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const selectedContact = contacts.find(c => c.id === selectedContactId)

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Add Relationship
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Contact *
            </label>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {loadingContacts ? (
              <div className="mt-2 p-3 text-center text-gray-500">Loading contacts...</div>
            ) : (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                {filteredContacts.length === 0 ? (
                  <div className="p-3 text-center text-gray-500">
                    {searchTerm ? 'No contacts found' : 'No contacts available'}
                  </div>
                ) : (
                  filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContactId(contact.id)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        selectedContactId === contact.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </div>
                          {contact.company && (
                            <div className="text-sm text-gray-600">
                              {contact.position ? `${contact.position} at ` : ''}{contact.company}
                            </div>
                          )}
                          {contact.email && (
                            <div className="text-sm text-gray-500">{contact.email}</div>
                          )}
                        </div>
                        {selectedContactId === contact.id && (
                          <div className="text-blue-600">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedContact && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-700">Selected Contact:</div>
              <div className="text-gray-900">
                {selectedContact.firstName} {selectedContact.lastName}
                {selectedContact.company && ` - ${selectedContact.company}`}
              </div>
            </div>
          )}

          {/* Relationship Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship Type *
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {RELATIONSHIP_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Relationship Strength */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship Strength: {Math.round(strength * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={strength}
              onChange={(e) => setStrength(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Weak</span>
              <span>Strong</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this relationship..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Mutual Relationship */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isMutual"
              checked={isMutual}
              onChange={(e) => setIsMutual(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isMutual" className="ml-2 block text-sm text-gray-700">
              This is a mutual relationship (both contacts know each other)
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedContactId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Add Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RelationshipModal