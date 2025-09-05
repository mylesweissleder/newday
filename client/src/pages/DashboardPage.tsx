import React, { useState, useEffect } from 'react'

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalContacts: 0,
    tier1Contacts: 0,
    recentUploads: 0,
    pendingOutreach: 0
  })
  const [recentContacts, setRecentContacts] = useState([])
  const [loading, setLoading] = useState(true)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      
      // If demo token, use demo data
      if (token === 'demo-token') {
        const demoContacts = [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@techcorp.com',
            company: 'TechCorp Inc',
            position: 'CEO',
            tier: 'TIER_1',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
          },
          {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@startupxyz.com',
            company: 'StartupXYZ',
            position: 'CTO',
            tier: 'TIER_1',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
          },
          {
            firstName: 'Mike',
            lastName: 'Johnson',
            email: 'mike.j@consulting.com',
            company: 'Consulting Group',
            position: 'Partner',
            tier: 'TIER_2',
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
          }
        ]
        
        setStats({
          totalContacts: 247,
          tier1Contacts: 38,
          recentUploads: 15,
          pendingOutreach: 142
        })
        
        setRecentContacts(demoContacts)
        setLoading(false)
        return
      }
      
      // For production, try API call
      const contactsResponse = await fetch(`${API_BASE_URL}/api/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (contactsResponse.ok) {
        const contacts = await contactsResponse.json()
        
        setStats({
          totalContacts: contacts.length,
          tier1Contacts: contacts.filter((c: any) => c.tier === 'TIER_1').length,
          recentUploads: contacts.filter((c: any) => {
            const uploadDate = new Date(c.createdAt)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            return uploadDate > weekAgo
          }).length,
          pendingOutreach: contacts.filter((c: any) => c.status === 'ACTIVE').length
        })
        
        // Get recent contacts
        setRecentContacts(contacts.slice(0, 5))
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      
      // Fallback to demo data on error
      setStats({
        totalContacts: 247,
        tier1Contacts: 38,
        recentUploads: 15,
        pendingOutreach: 142
      })
      
      setRecentContacts([
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@techcorp.com',
          company: 'TechCorp Inc',
          position: 'CEO',
          tier: 'TIER_1',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your network and activities</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Contacts</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalContacts}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Tier 1 Contacts</p>
              <p className="text-3xl font-bold text-green-600">{stats.tier1Contacts}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Recent Imports</p>
              <p className="text-3xl font-bold text-purple-600">{stats.recentUploads}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Active Contacts</p>
              <p className="text-3xl font-bold text-orange-600">{stats.pendingOutreach}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Contacts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Contacts</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentContacts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No contacts yet. Start by importing some contacts!
            </div>
          ) : (
            recentContacts.map((contact: any, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{contact.email}</p>
                    <p className="text-sm text-gray-500">
                      {contact.company} • {contact.position}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      contact.tier === 'TIER_1' ? 'bg-green-100 text-green-800' :
                      contact.tier === 'TIER_2' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {contact.tier}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-gray-900">Import Contacts</p>
                <p className="text-xs text-gray-500">Upload CSV files</p>
              </div>
            </button>

            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm font-medium text-gray-900">AI Analysis</p>
                <p className="text-xs text-gray-500">Network insights</p>
              </div>
            </button>

            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <p className="text-sm font-medium text-gray-900">Create Campaign</p>
                <p className="text-xs text-gray-500">Outreach campaigns</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage