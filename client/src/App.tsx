import React, { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import LandingPage from './components/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ImportContactsPage from './pages/ImportContactsPage'
import NetworkAnalysisPage from './pages/NetworkAnalysisPage'
import ContactsPage from './pages/ContactsPage'
import SmartOutreachPage from './pages/SmartOutreachPage'
import OpportunitiesPage from './pages/OpportunitiesPage'
import AboutPage from './pages/AboutPage'
import SettingsPage from './pages/SettingsPage'
import CrewManagementPage from './pages/CrewManagementPage'
import JoinCrewPage from './pages/JoinCrewPage'
import CampaignsPage from './pages/CampaignsPage'
import NetworkVisualizationPage from './pages/NetworkVisualizationPage'
import LoadingSpinner from './components/LoadingSpinner'
import NetworkChatbot from './components/NetworkChatbot'
import AcceptInvitationPage from './components/AcceptInvitationPage'

type Page = 'dashboard' | 'import' | 'analysis' | 'outreach' | 'opportunities' | 'contacts' | 'campaigns' | 'visualization' | 'about' | 'settings' | 'crew' | 'join-crew'
type AppView = 'landing' | 'login' | 'app'

function App() {
  const { user, loading, logout, isAuthenticated } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [appView, setAppView] = useState<AppView>('landing')

  // Check for invitation token in URL
  const urlParams = new URLSearchParams(window.location.search)
  const invitationToken = urlParams.get('token')

  // Show loading while checking authentication
  if (loading) {
    console.log('🔄 App: Still loading authentication state...')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Handle invitation acceptance
  if (invitationToken) {
    return (
      <AcceptInvitationPage 
        token={invitationToken} 
        onComplete={() => {
          // Clear the URL parameters and redirect to login
          window.history.replaceState({}, '', '/')
          window.location.reload()
        }} 
      />
    )
  }

  // User is authenticated - show the app
  if (isAuthenticated && user) {
    console.log('✅ App: User is authenticated, showing app')
    return (
      <div className="App">
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
                      onClick={() => setCurrentPage('campaigns')}
                      className={`text-sm font-medium ${currentPage === 'campaigns' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Campaigns
                    </button>
                    <button
                      onClick={() => setCurrentPage('opportunities')}
                      className={`text-sm font-medium ${currentPage === 'opportunities' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Opportunities
                    </button>
                    <button
                      onClick={() => setCurrentPage('visualization')}
                      className={`text-sm font-medium ${currentPage === 'visualization' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Visualization
                    </button>
                    {(user?.role === 'CREW_LEADER' || user?.role === 'ADMIN') && (
                      <button
                        onClick={() => setCurrentPage('crew')}
                        className={`text-sm font-medium ${currentPage === 'crew' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        Crew
                      </button>
                    )}
                    <button
                      onClick={() => setCurrentPage('join-crew')}
                      className={`text-sm font-medium ${currentPage === 'join-crew' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Join Crew
                    </button>
                    <button
                      onClick={() => setCurrentPage('about')}
                      className={`text-sm font-medium ${currentPage === 'about' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      About
                    </button>
                  </nav>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700 hidden xl:inline">{user.email}</span>
                    <button
                      onClick={() => setCurrentPage('settings')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentPage === 'settings' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title="Settings"
                    >
                      ⚙️
                    </button>
                    <button
                      onClick={logout}
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      title="Sign Out"
                    >
                      🚪
                    </button>
                  </div>
                </div>

                {/* Mobile menu button */}
                <div className="lg:hidden">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 p-3 rounded-md -mr-2"
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                  >
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {mobileMenuOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Welcome message */}
              <div className="hidden sm:block pb-4 lg:pb-2">
                <p className="text-sm text-gray-600">Welcome back, {user.firstName} — let's find your next opportunity</p>
              </div>

              {/* Mobile menu */}
              {mobileMenuOpen && (
                <div className="lg:hidden border-t border-gray-200 py-2 bg-white">
                  <div className="space-y-1 px-2">
                    <button
                      onClick={() => {setCurrentPage('dashboard'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'dashboard' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => {setCurrentPage('contacts'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'contacts' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      Network
                    </button>
                    <button
                      onClick={() => {setCurrentPage('campaigns'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'campaigns' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      Campaigns
                    </button>
                    <button
                      onClick={() => {setCurrentPage('opportunities'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'opportunities' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      Opportunities
                    </button>
                    <button
                      onClick={() => {setCurrentPage('visualization'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'visualization' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      Visualization
                    </button>
                    {(user?.role === 'CREW_LEADER' || user?.role === 'ADMIN') && (
                      <button
                        onClick={() => {setCurrentPage('crew'); setMobileMenuOpen(false)}}
                        className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                          currentPage === 'crew' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        Crew
                      </button>
                    )}
                    <button
                      onClick={() => {setCurrentPage('join-crew'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'join-crew' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      Join Crew
                    </button>
                    <button
                      onClick={() => {setCurrentPage('about'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'about' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      About
                    </button>
                    <button
                      onClick={() => {setCurrentPage('settings'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'settings' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-200 mt-4 pt-4 px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={logout}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                        title="Sign Out"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <main className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
            {currentPage === 'dashboard' && (
              <DashboardPage 
                onImportContacts={() => setCurrentPage('import')}
                onNetworkAnalysis={() => setCurrentPage('analysis')}
                onSmartOutreach={() => setCurrentPage('outreach')}
                onCampaigns={() => setCurrentPage('campaigns')}
                onVisualization={() => setCurrentPage('visualization')}
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
            {currentPage === 'campaigns' && (
              <CampaignsPage onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'outreach' && (
              <SmartOutreachPage onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'opportunities' && (
              <OpportunitiesPage />
            )}
            {currentPage === 'visualization' && (
              <NetworkVisualizationPage />
            )}
            {currentPage === 'about' && (
              <AboutPage onBack={() => setCurrentPage('dashboard')} />
            )}
            {currentPage === 'settings' && (
              <SettingsPage />
            )}
            {currentPage === 'crew' && (
              <CrewManagementPage />
            )}
            {currentPage === 'join-crew' && (
              <JoinCrewPage />
            )}
          </main>
          
          {/* AI Network Chatbot */}
          <NetworkChatbot onContactSelect={(contact) => {
            setCurrentPage('contacts');
          }} />
        </div>
      </div>
    )
  }

  // User is not authenticated - show landing or login
  console.log('❌ App: User not authenticated, showing public views')
  
  if (appView === 'login') {
    return <LoginPage onBack={() => setAppView('landing')} />
  }

  return (
    <LandingPage 
      onGetStarted={() => setAppView('login')}
      onLogin={() => setAppView('login')}
    />
  )
}

export default App