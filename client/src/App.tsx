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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
              <div className="flex justify-between items-center py-4 lg:py-6">
                <div className="flex items-center space-x-2">
                  <span className="text-xl sm:text-2xl">🤝</span>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900">TrueCrew</h1>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center space-x-6">
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
                    <span className="text-sm text-gray-700 hidden xl:inline">{user.email}</span>
                    <button
                      onClick={logout}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                {/* Mobile menu button */}
                <div className="lg:hidden">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 p-2 rounded-md"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {mobileMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Welcome message - shown on larger screens */}
              <div className="hidden sm:block pb-4 lg:pb-2">
                <p className="text-sm text-gray-600">Welcome back, {user.firstName} — let's find your next opportunity</p>
              </div>

              {/* Mobile menu */}
              {mobileMenuOpen && (
                <div className="lg:hidden border-t border-gray-200 py-4">
                  <div className="space-y-1">
                    <button
                      onClick={() => {setCurrentPage('dashboard'); setMobileMenuOpen(false)}}
                      className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                        currentPage === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => {setCurrentPage('contacts'); setMobileMenuOpen(false)}}
                      className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                        currentPage === 'contacts' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Network
                    </button>
                    <button
                      onClick={() => {setCurrentPage('outreach'); setMobileMenuOpen(false)}}
                      className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                        currentPage === 'outreach' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Opportunities
                    </button>
                  </div>
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <div className="px-3 py-2">
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
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