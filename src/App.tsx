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

type Page = 'dashboard' | 'import' | 'analysis' | 'outreach' | 'opportunities' | 'contacts' | 'campaigns' | 'visualization' | 'about' | 'settings' | 'crew' | 'join-crew'
type AppView = 'landing' | 'login' | 'app'

function App() {
  const { user, loading, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [appView, setAppView] = useState<AppView>(!user ? 'landing' : 'app')

  // Debug logging removed for production

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Handle view changes based on user state
  React.useEffect(() => {
    if (user && appView === 'landing') {
      setAppView('app')
    } else if (!user && appView === 'app') {
      setAppView('landing')
    }
  }, [!!user, appView])

  return (
    <div className="App">
      {appView === 'landing' && (
        <LandingPage 
          onGetStarted={() => setAppView('login')}
          onLogin={() => setAppView('login')}
        />
      )}
      
      {appView === 'login' && (
        <LoginPage onBack={() => setAppView('landing')} />
      )}
      
      {appView === 'app' && user && (
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
                    <span className="text-sm text-gray-700 hidden xl:inline">{user?.email || ''}</span>
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

              {/* Welcome message - shown on larger screens */}
              <div className="hidden sm:block pb-4 lg:pb-2">
                <p className="text-sm text-gray-600">Welcome back, {user?.firstName || 'there'} — let's find your next opportunity</p>
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
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      Dashboard
                    </button>
                    <button
                      onClick={() => {setCurrentPage('contacts'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'contacts' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Network
                    </button>
                    <button
                      onClick={() => {setCurrentPage('campaigns'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'campaigns' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM8 15v4M16 15v4" />
                      </svg>
                      Campaigns
                    </button>
                    <button
                      onClick={() => {setCurrentPage('opportunities'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'opportunities' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Opportunities
                    </button>
                    <button
                      onClick={() => {setCurrentPage('visualization'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'visualization' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Visualization
                    </button>
                    {(user?.role === 'CREW_LEADER' || user?.role === 'ADMIN') && (
                      <button
                        onClick={() => {setCurrentPage('crew'); setMobileMenuOpen(false)}}
                        className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                          currentPage === 'crew' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        Crew
                      </button>
                    )}
                    <button
                      onClick={() => {setCurrentPage('join-crew'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'join-crew' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Join Crew
                    </button>
                    <button
                      onClick={() => {setCurrentPage('about'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'about' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      About
                    </button>
                    <button
                      onClick={() => {setCurrentPage('settings'); setMobileMenuOpen(false)}}
                      className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        currentPage === 'settings' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-gray-200 mt-4 pt-4 px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {(user?.firstName?.[0] || '')}{(user?.lastName?.[0] || '')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user?.firstName || ''} {user?.lastName || ''}</p>
                          <p className="text-xs text-gray-500">{user?.email || ''}</p>
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
          
          {/* AI Network Chatbot - Available on all pages */}
          <NetworkChatbot onContactSelect={(contact) => {
            // Navigate to contacts page and potentially highlight the selected contact
            setCurrentPage('contacts');
          }} />
        </div>
      )}
    </div>
  )
}

export default App