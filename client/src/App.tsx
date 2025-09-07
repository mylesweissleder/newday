import React, { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ImportContactsPage from './pages/ImportContactsPage'
import NetworkAnalysisPage from './pages/NetworkAnalysisPage'
import ContactsPage from './pages/ContactsPage'
import SmartOutreachPage from './pages/SmartOutreachPage'
import LoadingSpinner from './components/LoadingSpinner'

type Page = 'dashboard' | 'import' | 'analysis' | 'outreach' | 'contacts'

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
    <div className="App">
      {!user ? (
        <LoginPage />
      ) : (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🤝</span>
                    <h1 className="text-2xl font-bold text-gray-900">TrustCircle</h1>
                  </div>
                  <p className="text-sm text-gray-600">Welcome back, {user.firstName} — let's find your next opportunity</p>
                </div>
                <div className="flex items-center space-x-6">
                  <nav className="flex space-x-4">
                    <button
                      onClick={() => setCurrentPage('dashboard')}
                      className={`text-sm font-medium ${currentPage === 'dashboard' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentPage('contacts')}
                      className={`text-sm font-medium ${currentPage === 'contacts' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Network
                    </button>
                    <button
                      onClick={() => setCurrentPage('outreach')}
                      className={`text-sm font-medium ${currentPage === 'outreach' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Opportunities
                    </button>
                  </nav>
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
            {currentPage === 'contacts' && (
              <ContactsPage onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'outreach' && (
              <SmartOutreachPage onBack={() => setCurrentPage('dashboard')} />
            )}
          </main>
        </div>
      )}
    </div>
  )
}

export default App