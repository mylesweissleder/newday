import React from 'react'
import { Routes, Route, Navigate, HashRouter } from 'react-router-dom'
import SiteAccessGate from './components/SiteAccessGate'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <HashRouter>
      <SiteAccessGate>
        {!user ? (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
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
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        )}
      </SiteAccessGate>
    </HashRouter>
  )
}

export default App