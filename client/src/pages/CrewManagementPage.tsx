import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import JoinCodeManager from '../components/JoinCodeManager'

interface CrewMember {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  createdAt: string
  invitedAt?: string
  acceptedAt?: string
  lastLoginAt?: string
  loginCount: number
  inviterName?: string
  isInvited: boolean
  isPending: boolean
}

interface CrewAnalytics {
  summary: {
    totalUsers: number
    activeUsers: number
    inactiveUsers: number
    totalContacts: number
    activeCampaigns: number
  }
  recentActivity: Array<{
    id: string
    firstName: string
    lastName: string
    lastLoginAt: string
    loginCount: number
  }>
  contactsByUser: Array<{
    userId: string
    userName: string
    contactsCreated: number
  }>
  periodDays: number
}

const CrewManagementPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'members' | 'analytics' | 'invite' | 'join-codes'>('members')
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])
  const [analytics, setAnalytics] = useState<CrewAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  
  // Invitation form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'MEMBER'
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  const getApiHeaders = () => {
    const token = localStorage.getItem('auth-token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  useEffect(() => {
    if (activeTab === 'members') {
      fetchCrewMembers()
    } else if (activeTab === 'analytics') {
      fetchAnalytics()
    }
  }, [activeTab])

  const fetchCrewMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/crew/members`, {
        headers: getApiHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setCrewMembers(data)
      } else {
        setError('Failed to fetch crew members')
      }
    } catch (err) {
      setError('Network error while fetching crew members')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/crew/analytics`, {
        headers: getApiHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        setError('Failed to fetch analytics')
      }
    } catch (err) {
      setError('Network error while fetching analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setError('')
    setInviteSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/crew/invite`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(inviteForm)
      })

      const data = await response.json()

      if (response.ok) {
        setInviteSuccess(`Invitation sent to ${inviteForm.email}`)
        setInviteForm({ email: '', firstName: '', lastName: '', role: 'MEMBER' })
        // Refresh members list
        if (activeTab === 'members') {
          fetchCrewMembers()
        }
      } else {
        setError(data.error || 'Failed to send invitation')
      }
    } catch (err) {
      setError('Network error while sending invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crew/members/${memberId}/role`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        fetchCrewMembers() // Refresh the list
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update member role')
      }
    } catch (err) {
      setError('Network error while updating member role')
    }
  }

  const handleToggleActive = async (memberId: string, isActive: boolean) => {
    try {
      const endpoint = isActive ? 'reactivate' : 'deactivate'
      const response = await fetch(`${API_BASE_URL}/api/crew/members/${memberId}/${endpoint}`, {
        method: 'PUT',
        headers: getApiHeaders()
      })

      if (response.ok) {
        fetchCrewMembers() // Refresh the list
      } else {
        const data = await response.json()
        setError(data.error || `Failed to ${endpoint} member`)
      }
    } catch (err) {
      setError(`Network error while ${isActive ? 'reactivating' : 'deactivating'} member`)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'CREW_LEADER': return 'bg-purple-100 text-purple-800'
      case 'ADMIN': return 'bg-red-100 text-red-800'
      case 'MEMBER': return 'bg-blue-100 text-blue-800'
      case 'VIEWER': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadge = (member: CrewMember) => {
    if (!member.isActive) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactive</span>
    }
    if (member.isPending) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>
    }
    if (member.isInvited) {
      return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">Invited</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
  }

  // Check if current user has crew management permissions
  const hasCrewPermissions = user?.role === 'CREW_LEADER' || user?.role === 'ADMIN'

  if (!hasCrewPermissions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need crew leadership permissions to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crew Management</h1>
          <p className="text-gray-600">Manage your team members, roles, and analytics</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['members', 'analytics', 'invite', 'join-codes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'join-codes' ? 'Join Codes' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
            </div>
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {crewMembers.map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                            {member.inviterName && (
                              <div className="text-xs text-gray-400">
                                Invited by {member.inviterName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user?.role === 'CREW_LEADER' && member.id !== user.id ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                              className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(member.role)}`}
                            >
                              <option value="CREW_LEADER">Crew Leader</option>
                              <option value="ADMIN">Admin</option>
                              <option value="MEMBER">Member</option>
                              <option value="VIEWER">Viewer</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(member.role)}`}>
                              {member.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(member)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.lastLoginAt 
                            ? new Date(member.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                          <div className="text-xs text-gray-400">
                            {member.loginCount} logins
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {member.id !== user?.id && (
                            <button
                              onClick={() => handleToggleActive(member.id, !member.isActive)}
                              className={`${
                                member.isActive 
                                  ? 'text-red-600 hover:text-red-900' 
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {member.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : analytics && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-sm font-medium text-gray-500">Total Users</div>
                    <div className="text-2xl font-bold text-gray-900">{analytics.summary.totalUsers}</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-sm font-medium text-gray-500">Active Users</div>
                    <div className="text-2xl font-bold text-green-600">{analytics.summary.activeUsers}</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-sm font-medium text-gray-500">Total Contacts</div>
                    <div className="text-2xl font-bold text-blue-600">{analytics.summary.totalContacts}</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-sm font-medium text-gray-500">Active Campaigns</div>
                    <div className="text-2xl font-bold text-purple-600">{analytics.summary.activeCampaigns}</div>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-sm font-medium text-gray-500">Inactive Users</div>
                    <div className="text-2xl font-bold text-red-600">{analytics.summary.inactiveUsers}</div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Recent Activity (Last {analytics.periodDays} days)</h3>
                  </div>
                  <div className="p-6">
                    {analytics.recentActivity.length === 0 ? (
                      <p className="text-gray-500 text-center">No recent activity</p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.recentActivity.map((activity) => (
                          <div key={activity.id} className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{activity.firstName} {activity.lastName}</div>
                              <div className="text-sm text-gray-500">
                                Last login: {new Date(activity.lastLoginAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {activity.loginCount} total logins
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Creation by User */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Contacts Created (Last {analytics.periodDays} days)</h3>
                  </div>
                  <div className="p-6">
                    {analytics.contactsByUser.length === 0 ? (
                      <p className="text-gray-500 text-center">No contacts created recently</p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.contactsByUser.map((stat) => (
                          <div key={stat.userId} className="flex justify-between items-center">
                            <div className="font-medium">{stat.userName}</div>
                            <div className="text-sm text-gray-500">
                              {stat.contactsCreated} contacts
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Join Codes Tab */}
        {activeTab === 'join-codes' && (
          <JoinCodeManager />
        )}

        {/* Invite Tab */}
        {activeTab === 'invite' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Invite New Member</h2>
            </div>
            <div className="p-6">
              {inviteSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-600 text-sm">{inviteSuccess}</p>
                </div>
              )}
              
              <form onSubmit={handleInviteMember} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={inviteLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={inviteLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={inviteLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={inviteLoading}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                    <option value="VIEWER">Viewer</option>
                    {user?.role === 'CREW_LEADER' && <option value="CREW_LEADER">Crew Leader</option>}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full md:w-auto bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                >
                  {inviteLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {inviteLoading ? 'Sending Invitation...' : 'Send Invitation'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CrewManagementPage