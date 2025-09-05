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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Recent Contacts</h2>
              <p className="text-sm text-gray-500 mt-1">Latest additions to your network</p>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {recentContacts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 text-sm">No contacts yet</p>
              <p className="text-gray-400 text-xs mt-1">Start by importing your first contacts!</p>
            </div>
          ) : (
            recentContacts.map((contact: any, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
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
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          contact.tier === 'TIER_1' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          contact.tier === 'TIER_2' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {contact.tier === 'TIER_1' ? '⭐ Tier 1' : 
                           contact.tier === 'TIER_2' ? '🔸 Tier 2' : 
                           '◯ Tier 3'}
                        </span>
                      </div>
                      <p className="text-sm text-blue-600 hover:text-blue-700">{contact.email}</p>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="font-medium text-gray-700">{contact.company}</span>
                        <span className="mx-2">•</span>
                        <span>{contact.position}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-gray-100 rounded-full" title="Send Message">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full" title="View Profile">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
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
          <p className="text-sm text-gray-500 mt-1">Powerful tools to manage and analyze your network</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group cursor-pointer">
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group-hover:shadow-md">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Contacts</h3>
                  <p className="text-sm text-gray-600 mb-4">Drag & drop CSV files or connect to LinkedIn, CRM systems</p>
                  <div className="flex items-center justify-center text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">CSV • Excel • API</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group cursor-pointer">
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all duration-200 group-hover:shadow-md">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Network Analysis</h3>
                  <p className="text-sm text-gray-600 mb-4">Discover connections, identify influencers, find warm intros</p>
                  <div className="flex items-center justify-center text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">Powered by GPT-4</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group cursor-pointer">
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 group-hover:shadow-md">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Outreach</h3>
                  <p className="text-sm text-gray-600 mb-4">AI-generated personalized messages and campaigns</p>
                  <div className="flex items-center justify-center text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">Email • LinkedIn</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage