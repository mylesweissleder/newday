import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose }) => {
  const { inviteUser } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{invitationUrl: string} | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')
    
    const result = await inviteUser(email, role)
    
    if (result.success) {
      setSuccess({ invitationUrl: result.invitationUrl || '' })
      setEmail('')
    } else {
      setError(result.error || 'Failed to send invitation')
    }
    
    setLoading(false)
  }

  const copyInviteLink = () => {
    if (success?.invitationUrl) {
      navigator.clipboard.writeText(success.invitationUrl)
    }
  }

  const reset = () => {
    setEmail('')
    setRole('USER')
    setError('')
    setSuccess(null)
    setLoading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg style={{width: '24px', height: '24px'}} className="text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Invitation Sent!
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  An invitation has been sent to <strong>{email}</strong>. They can use the link below to create their account and join your workspace.
                </p>
              </div>

              {success.invitationUrl && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Invitation Link:</p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={success.invitationUrl}
                      readOnly
                      className="flex-1 text-xs bg-white border border-gray-300 rounded px-2 py-1"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'USER' | 'ADMIN')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="USER">User - Can view and manage contacts</option>
                  <option value="ADMIN">Admin - Can invite users and manage settings</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default InviteUserModal