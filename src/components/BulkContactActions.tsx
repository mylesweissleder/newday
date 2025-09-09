import React, { useState } from 'react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  tier: string
  tags?: string[]
}

interface BulkContactActionsProps {
  selectedContacts: Contact[]
  onDelete: (contactIds: string[]) => Promise<void>
  onUpdateTier: (contactIds: string[], tier: string) => Promise<void>
  onAddTags: (contactIds: string[], tags: string[]) => Promise<void>
  onExport: (contactIds: string[]) => void
  onClearSelection: () => void
}

const BulkContactActions: React.FC<BulkContactActionsProps> = ({
  selectedContacts,
  onDelete,
  onUpdateTier,
  onAddTags,
  onExport,
  onClearSelection
}) => {
  const [showActions, setShowActions] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTierUpdate, setShowTierUpdate] = useState(false)
  const [showTagUpdate, setShowTagUpdate] = useState(false)
  const [newTier, setNewTier] = useState<'TIER_1' | 'TIER_2' | 'TIER_3'>('TIER_2')
  const [newTags, setNewTags] = useState('')
  const [processing, setProcessing] = useState(false)

  if (selectedContacts.length === 0) return null

  const handleDelete = async () => {
    setProcessing(true)
    try {
      await onDelete(selectedContacts.map(c => c.id))
      setShowDeleteConfirm(false)
      onClearSelection()
    } catch (error) {
      console.error('Bulk delete failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleTierUpdate = async () => {
    setProcessing(true)
    try {
      await onUpdateTier(selectedContacts.map(c => c.id), newTier)
      setShowTierUpdate(false)
      onClearSelection()
    } catch (error) {
      console.error('Tier update failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleAddTags = async () => {
    if (!newTags.trim()) return
    
    const tags = newTags.split(',').map(tag => tag.trim()).filter(Boolean)
    if (tags.length === 0) return

    setProcessing(true)
    try {
      await onAddTags(selectedContacts.map(c => c.id), tags)
      setShowTagUpdate(false)
      setNewTags('')
      onClearSelection()
    } catch (error) {
      console.error('Tag update failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleExport = () => {
    onExport(selectedContacts.map(c => c.id))
  }

  return (
    <>
      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 rounded-full p-2">
                <svg style={{width: '16px', height: '16px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium text-gray-900">
                {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Update Tier */}
              <button
                onClick={() => setShowTierUpdate(true)}
                className="px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 flex items-center"
              >
                <svg style={{width: '16px', height: '16px'}} className="mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Tier
              </button>

              {/* Add Tags */}
              <button
                onClick={() => setShowTagUpdate(true)}
                className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center"
              >
                <svg style={{width: '16px', height: '16px'}} className="mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Tag
              </button>

              {/* Export */}
              <button
                onClick={handleExport}
                className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center"
              >
                <svg style={{width: '16px', height: '16px'}} className="mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>

              {/* Delete */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center"
              >
                <svg style={{width: '16px', height: '16px'}} className="mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>

              {/* Clear Selection */}
              <button
                onClick={onClearSelection}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg style={{width: '24px', height: '24px'}} className="text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Delete {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''}?
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    This action cannot be undone. All interaction history and notes will be permanently deleted.
                  </p>
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded max-h-20 overflow-y-auto">
                    {selectedContacts.map(contact => (
                      <div key={contact.id}>
                        {contact.firstName} {contact.lastName} ({contact.email})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center"
              >
                {processing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {processing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Update Modal */}
      {showTierUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Update Tier</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Update tier for {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="TIER_1"
                    checked={newTier === 'TIER_1'}
                    onChange={(e) => setNewTier(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="text-green-700">⭐ Tier 1 - High Priority</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="TIER_2"
                    checked={newTier === 'TIER_2'}
                    onChange={(e) => setNewTier(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="text-yellow-700">🔸 Tier 2 - Medium Priority</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="TIER_3"
                    checked={newTier === 'TIER_3'}
                    onChange={(e) => setNewTier(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">◯ Tier 3 - General Network</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowTierUpdate(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleTierUpdate}
                disabled={processing}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 flex items-center"
              >
                {processing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {processing ? 'Updating...' : 'Update Tier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Update Modal */}
      {showTagUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add Tags</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Add tags to {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''}
              </p>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="partner, prospect, conference-2024 (comma-separated)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Separate multiple tags with commas
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowTagUpdate(false)
                  setNewTags('')
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTags}
                disabled={processing || !newTags.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center"
              >
                {processing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {processing ? 'Adding...' : 'Add Tags'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default BulkContactActions