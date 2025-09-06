import React, { useState } from 'react'
import SiteAccessGate from './components/SiteAccessGate'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ImportContactsPage from './pages/ImportContactsPage'
import NetworkAnalysisPage from './pages/NetworkAnalysisPage'
import LoadingSpinner from './components/LoadingSpinner'

type Page = 'dashboard' | 'import' | 'analysis' | 'outreach'

function App() {
  const { user, loading, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  console.log('App render - user:', user, 'loading:', loading)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <SiteAccessGate>
      {!user ? (
        <LoginPage />
      ) : (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Network CRM</h1>
                  <p className="text-sm text-gray-600">Welcome back, {user.firstName}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">{user.email}</span>
                  <button
                    onClick={logout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {currentPage === 'dashboard' && (
              <DashboardPage 
                onImportContacts={() => setCurrentPage('import')}
                onNetworkAnalysis={() => setCurrentPage('analysis')}
                onSmartOutreach={() => setCurrentPage('outreach')}
              />
            )}
            {currentPage === 'import' && (
              <ImportContactsPage onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'analysis' && (
              <NetworkAnalysisPage onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'outreach' && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Smart Outreach</h2>
                <p className="text-gray-600 mb-4">Coming soon! AI-powered outreach campaigns.</p>
                <button 
                  onClick={() => setCurrentPage('dashboard')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </main>
        </div>
      )}
    </SiteAccessGate>
  )
}

export default App