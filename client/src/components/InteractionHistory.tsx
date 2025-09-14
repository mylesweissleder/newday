import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'

interface Interaction {
  id: string
  type: 'email' | 'phone' | 'meeting' | 'linkedin' | 'other'
  subject?: string
  notes: string
  date: string
  createdAt: string
}

interface InteractionHistoryProps {
  contactId: string
  contactName: string
}

const InteractionHistory: React.FC<InteractionHistoryProps> = ({ contactId, contactName }) => {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newInteraction, setNewInteraction] = useState({
    type: 'email' as const,
    subject: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadInteractions()
  }, [contactId])

  const loadInteractions = async () => {
    try {
      const response = await api.get(`/api/contacts/${contactId}/interactions`)

      if (response.ok) {
        const data = await response.json()
        setInteractions(data.interactions || [])
      } else {
        // Fallback to demo data if API fails
        setInteractions([])
      }
    } catch (error) {
      console.error('Failed to load interactions:', error)
      setInteractions([])
    } finally {
      setLoading(false)
    }
  }

  const addInteraction = async () => {
    if (!newInteraction.notes.trim()) return

    try {
      const interaction = {
        ...newInteraction,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }

      const response = await api.post(`/api/contacts/${contactId}/interactions`, interaction)

      if (response.ok) {
        const savedInteraction = await response.json()
        setInteractions(prev => [savedInteraction, ...prev])
      } else {
        throw new Error('Failed to save interaction')
      }

      setShowAddForm(false)
      setNewInteraction({
        type: 'email',
        subject: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Failed to add interaction:', error)
      // Still add to local state as fallback
      const interaction = {
        ...newInteraction,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      }
      setInteractions(prev => [interaction, ...prev])
      setShowAddForm(false)
    }
  }

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'email':
        return (
          <svg style={{width: '16px', height: '16px'}} className="text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'phone':
        return (
          <svg style={{width: '16px', height: '16px'}} className="text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        )
      case 'meeting':
        return (
          <svg style={{width: '16px', height: '16px'}} className="text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      case 'linkedin':
        return (
          <svg style={{width: '16px', height: '16px'}} className="text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )
      default:
        return (
          <svg style={{width: '16px', height: '16px'}} className="text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        )
    }
  }

  const formatInteractionType = (type: string) => {
    switch (type) {
      case 'email': return 'Email'
      case 'phone': return 'Phone Call'
      case 'meeting': return 'Meeting'
      case 'linkedin': return 'LinkedIn'
      default: return 'Other'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Interaction History</h3>
          <p className="text-sm text-gray-600">Track your conversations and meetings with {contactName}</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center"
        >
          <svg style={{width: '16px', height: '16px'}} className="mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Interaction
        </button>
      </div>

      {/* Add interaction form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interaction Type
              </label>
              <select
                value={newInteraction.type}
                onChange={(e) => setNewInteraction(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="email">Email</option>
                <option value="phone">Phone Call</option>
                <option value="meeting">Meeting</option>
                <option value="linkedin">LinkedIn</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={newInteraction.date}
                onChange={(e) => setNewInteraction(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject (optional)
            </label>
            <input
              type="text"
              value={newInteraction.subject}
              onChange={(e) => setNewInteraction(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Brief subject or title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes *
            </label>
            <textarea
              value={newInteraction.notes}
              onChange={(e) => setNewInteraction(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="What was discussed? Key takeaways, next steps, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewInteraction({
                  type: 'email',
                  subject: '',
                  notes: '',
                  date: new Date().toISOString().split('T')[0]
                })
              }}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={addInteraction}
              disabled={!newInteraction.notes.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Save Interaction
            </button>
          </div>
        </div>
      )}

      {/* Interactions list */}
      <div className="space-y-3">
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-4 flex items-center justify-center">
              <svg style={{width: '32px', height: '32px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p>No interactions recorded yet</p>
            <p className="text-sm text-gray-400 mt-1">Start tracking your conversations and meetings</p>
          </div>
        ) : (
          interactions.map((interaction) => (
            <div key={interaction.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getInteractionIcon(interaction.type)}
                  <span className="font-medium text-gray-900">
                    {formatInteractionType(interaction.type)}
                  </span>
                  {interaction.subject && (
                    <span className="text-gray-600">• {interaction.subject}</span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(interaction.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                {interaction.notes}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default InteractionHistory