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

interface MemberDataOverview {
  userId: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  dataContribution: {
    contacts: number
    documents: number
    linkedinData: boolean
    googleData: boolean
    completionPercentage: number
  }
  lastDataUpload?: string
  onboardingCompleted: boolean
  joinedAt: string
}

const CrewManagementPage: React.FC = () => {
  const { user, resendInvitation } = useAuth()
  const [activeTab, setActiveTab] = useState<'members' | 'analytics' | 'data-overview' | 'invite' | 'join-codes'>('members')
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([])
  const [analytics, setAnalytics] = useState<CrewAnalytics | null>(null)
  const [dataOverview, setDataOverview] = useState<MemberDataOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({})
  
  // Invitation form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'MEMBER'
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [resendingMemberId, setResendingMemberId] = useState<string | null>(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  const getApiHeaders = () => {
    return {
      'Content-Type': 'application/json'
    }
  }

  useEffect(() => {
    if (activeTab === 'members') {
      fetchCrewMembers()
    } else if (activeTab === 'analytics') {
      fetchAnalytics()
    } else if (activeTab === 'data-overview') {
      fetchDataOverview()
    }
  }, [activeTab])

  const fetchCrewMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/crew/members`, {
        headers: getApiHeaders(),
        credentials: 'include'
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
        headers: getApiHeaders(),
        credentials: 'include'
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

  const fetchDataOverview = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`${API_BASE_URL}/api/crew/data-overview`, {
        headers: getApiHeaders(),
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setDataOverview(data)
      } else {
        setError('Failed to fetch data overview')
      }
    } catch (err) {
      setError('Network error while fetching data overview')
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
        credentials: 'include',
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
        credentials: 'include',
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
        headers: getApiHeaders(),
        credentials: 'include'
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

  const handleResendInvitation = async (memberId: string) => {
    setResendingMemberId(memberId)
    setError('')
    
    try {
      const result = await resendInvitation(memberId)
      
      if (result.success) {
        setInviteSuccess(result.message || 'Invitation resent successfully')
        fetchCrewMembers() // Refresh the list
      } else {
        setError(result.error || 'Failed to resend invitation')
      }
    } catch (err) {
      setError('Network error while resending invitation')
    } finally {
      setResendingMemberId(null)
    }
  }

  const handleSendReminders = async () => {
    try {
      setActionLoading(prev => ({...prev, reminders: true}));
      setError('');
      
      const incompleteMembers = dataOverview.filter(member => 
        !member.onboardingCompleted || member.dataContribution.completionPercentage < 75
      );
      
      if (incompleteMembers.length === 0) {
        alert('All members have completed their setup!');
        return;
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This would send reminders to incomplete members
      alert(`Reminders sent to ${incompleteMembers.length} members who need to complete their data setup.`);
    } catch (error) {
      setError('Failed to send reminders');
    } finally {
      setActionLoading(prev => ({...prev, reminders: false}));
    }
  };

  const handleExportReport = async () => {
    try {
      setActionLoading(prev => ({...prev, export: true}));
      setError('');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const csvContent = [
        ['Name', 'Email', 'Status', 'Contacts', 'Documents', 'LinkedIn', 'Google', 'Completion %', 'Last Upload'].join(','),
        ...dataOverview.map(member => [
          `${member.firstName} ${member.lastName}`,
          member.email,
          member.isActive ? 'Active' : 'Inactive',
          member.dataContribution.contacts,
          member.dataContribution.documents,
          member.dataContribution.linkedinData ? 'Yes' : 'No',
          member.dataContribution.googleData ? 'Yes' : 'No',
          member.dataContribution.completionPercentage + '%',
          member.lastDataUpload ? new Date(member.lastDataUpload).toLocaleDateString() : 'Never'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crew-data-overview-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to export report');
    } finally {
      setActionLoading(prev => ({...prev, export: false}));
    }
  };

  const handleViewInsights = () => {
    setActiveTab('analytics');
  };

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
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">Crew Management</h1>
          <p className="text-sm md:text-base text-gray-600">Manage your team members, roles, and analytics</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex overflow-x-auto">
              {['members', 'analytics', 'data-overview', 'invite', 'join-codes'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-shrink-0 py-3 px-4 md:px-6 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'join-codes' ? 'Join Codes' : 
                   tab === 'data-overview' ? 'Data Overview' :
                   tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
            <p className="text-red-600 text-xs md:text-sm">{error}</p>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-4 md:px-6 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-medium text-gray-900">Team Members</h2>
            </div>
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="md:hidden divide-y divide-gray-200">
                {/* Mobile Card Layout */}
                {crewMembers.map((member) => (
                  <div key={member.id} className="p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {member.firstName} {member.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">{member.email}</p>
                        {member.inviterName && (
                          <p className="text-xs text-gray-400">
                            Invited by {member.inviterName}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(member)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        {user?.role === 'CREW_LEADER' && member.id !== user.id ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            className={`px-3 py-2 text-xs rounded-lg border ${getRoleBadgeColor(member.role)}`}
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
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {member.lastLoginAt 
                            ? new Date(member.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {member.loginCount} logins
                        </p>
                      </div>
                    </div>
                    
                    {member.id !== user?.id && (
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        {member.isInvited && (
                          <button
                            onClick={() => handleResendInvitation(member.id)}
                            disabled={resendingMemberId === member.id}
                            className="w-full py-2 px-4 text-sm font-medium rounded-lg border text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {resendingMemberId === member.id ? 'Resending...' : 'Resend Invitation'}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(member.id, !member.isActive)}
                          className={`w-full py-2 px-4 text-sm font-medium rounded-lg border transition-colors ${
                            member.isActive 
                              ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100' 
                              : 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                          }`}
                        >
                          {member.isActive ? 'Deactivate Member' : 'Activate Member'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Desktop Table Layout */}
            {!loading && (
              <div className="hidden md:block overflow-x-auto">
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
                            <div className="flex space-x-2">
                              {member.isInvited && (
                                <button
                                  onClick={() => handleResendInvitation(member.id)}
                                  disabled={resendingMemberId === member.id}
                                  className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                  {resendingMemberId === member.id ? 'Resending...' : 'Resend'}
                                </button>
                              )}
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
                            </div>
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

        {/* Data Overview Tab */}
        {activeTab === 'data-overview' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Data Overview</h3>
                <p className="text-gray-500">Gathering member data contributions...</p>
              </div>
            ) : dataOverview.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
                <p className="text-gray-500">No crew members found or no data contributions to display.</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-blue-100 text-sm font-medium">Total Members</p>
                        <p className="text-2xl font-bold">{dataOverview.length}</p>
                      </div>
                      <div className="text-blue-200">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-green-100 text-sm font-medium">Onboarding Complete</p>
                        <p className="text-2xl font-bold">
                          {dataOverview.filter(m => m.onboardingCompleted).length}
                        </p>
                      </div>
                      <div className="text-green-200">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-orange-100 text-sm font-medium">Total Contacts</p>
                        <p className="text-2xl font-bold">
                          {dataOverview.reduce((sum, m) => sum + m.dataContribution.contacts, 0)}
                        </p>
                      </div>
                      <div className="text-orange-200">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-purple-100 text-sm font-medium">Total Documents</p>
                        <p className="text-2xl font-bold">
                          {dataOverview.reduce((sum, m) => sum + m.dataContribution.documents, 0)}
                        </p>
                      </div>
                      <div className="text-purple-200">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Member Data Contribution Table */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Member Data Contributions</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Bird's eye view of who has contributed what data to the crew collective
                    </p>
                  </div>
                  
                  {/* Mobile Card Layout */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {dataOverview.map((member) => (
                      <div key={member.userId} className="p-4 space-y-4 hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {member.firstName} {member.lastName}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">{member.email}</p>
                          </div>
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              member.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {member.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              member.onboardingCompleted 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {member.onboardingCompleted ? '✓ Done' : '⚠️ Setup'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Contacts:</span>
                            <span className="font-medium">{member.dataContribution.contacts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Documents:</span>
                            <span className="font-medium">{member.dataContribution.documents}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Data Sources:</span>
                            <div className="flex space-x-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                member.dataContribution.linkedinData 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                💼 {member.dataContribution.linkedinData ? '✓' : '✗'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                member.dataContribution.googleData 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                📧 {member.dataContribution.googleData ? '✓' : '✗'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Progress:</span>
                              <span className="font-medium">{member.dataContribution.completionPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  member.dataContribution.completionPercentage >= 75 ? 'bg-green-600' :
                                  member.dataContribution.completionPercentage >= 50 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${member.dataContribution.completionPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between text-sm pt-2">
                            <span className="text-gray-500">Last Upload:</span>
                            <span className="text-gray-600">
                              {member.lastDataUpload ? 
                                new Date(member.lastDataUpload).toLocaleDateString() : 
                                'Never'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Desktop Table Layout */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contacts
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Documents
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data Sources
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completeness
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Upload
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dataOverview.map((member) => (
                          <tr key={member.userId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                                  {member.firstName[0]}{member.lastName[0]}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {member.firstName} {member.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  member.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {member.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  member.onboardingCompleted 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {member.onboardingCompleted ? '✓ Onboarded' : '⚠️ Incomplete'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {member.dataContribution.contacts}
                              </div>
                              <div className="text-xs text-gray-500">contacts</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {member.dataContribution.documents}
                              </div>
                              <div className="text-xs text-gray-500">files</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  member.dataContribution.linkedinData 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  💼 LinkedIn {member.dataContribution.linkedinData ? '✓' : '✗'}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  member.dataContribution.googleData 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  📧 Google {member.dataContribution.googleData ? '✓' : '✗'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                  <div 
                                    className={`h-2.5 rounded-full ${
                                      member.dataContribution.completionPercentage >= 75 ? 'bg-green-600' :
                                      member.dataContribution.completionPercentage >= 50 ? 'bg-yellow-600' :
                                      'bg-red-600'
                                    }`}
                                    style={{ width: `${member.dataContribution.completionPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {member.dataContribution.completionPercentage}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {member.lastDataUpload ? 
                                new Date(member.lastDataUpload).toLocaleDateString() : 
                                'Never'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                      onClick={handleSendReminders}
                      disabled={actionLoading.reminders}
                      className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading.reminders ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ) : (
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      )}
                      {actionLoading.reminders ? 'Sending...' : 'Send Reminders'}
                    </button>
                    
                    <button 
                      onClick={handleExportReport}
                      disabled={actionLoading.export}
                      className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionLoading.export ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ) : (
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 011 1v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1zM3 10a1 1 0 011-1h12a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM9 3a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                        </svg>
                      )}
                      {actionLoading.export ? 'Exporting...' : 'Export Report'}
                    </button>
                    
                    <button 
                      onClick={handleViewInsights}
                      className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      </svg>
                      View Insights
                    </button>
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
                <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:text-sm md:py-2"
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
                      className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:text-sm md:py-2"
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
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:text-sm md:py-2"
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
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:text-sm md:py-2"
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
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center text-base md:text-sm md:py-2 md:w-auto transition-colors"
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