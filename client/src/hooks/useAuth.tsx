import { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  accountId: string
  accountName: string
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    try {
      console.log('🔍 Checking authentication status...')
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await api.get('/api/auth/profile')
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ User authenticated:', data.user)
        setAuthState({
          user: data.user,
          loading: false,
          error: null
        })
        return true
      } else {
        console.log('❌ User not authenticated')
        setAuthState({
          user: null,
          loading: false,
          error: null
        })
        return false
      }
    } catch (error) {
      console.error('🚨 Auth check failed:', error)
      setAuthState({
        user: null,
        loading: false,
        error: null
      })
      return false
    }
  }, [])

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔑 Attempting login for:', email)
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const response = await api.post('/api/auth/login', { email, password })
      const data = await response.json()

      if (response.ok) {
        console.log('✅ Login successful:', data.user)
        
        // Store token in localStorage as fallback for mobile incognito mode
        if (data.token) {
          localStorage.setItem('auth-token', data.token)
        }
        
        setAuthState({
          user: data.user,
          loading: false,
          error: null
        })
        // Force a page refresh to ensure the app shows the authenticated state
        setTimeout(() => window.location.reload(), 500)
        return { success: true, user: data.user }
      } else {
        const errorMessage = data.error || data.message || 'Login failed'
        console.error('❌ Login failed:', errorMessage)
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }))
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      console.error('🚨 Login error:', error)
      const errorMessage = 'Network error. Please try again.'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }, [])

  // Register function
  const register = useCallback(async (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    accountName?: string
  }) => {
    try {
      console.log('📝 Attempting registration for:', userData.email)
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const response = await api.post('/api/auth/register', userData)
      const data = await response.json()

      if (response.ok) {
        console.log('✅ Registration successful:', data.user)
        
        // Store token in localStorage as fallback for mobile incognito mode
        if (data.token) {
          localStorage.setItem('auth-token', data.token)
        }
        
        setAuthState({
          user: data.user,
          loading: false,
          error: null
        })
        // Force a page refresh to ensure the app shows the authenticated state
        setTimeout(() => window.location.reload(), 500)
        return { success: true, user: data.user }
      } else {
        const errorMessage = data.error || data.message || 'Registration failed'
        console.error('❌ Registration failed:', errorMessage)
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage
        }))
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      console.error('🚨 Registration error:', error)
      const errorMessage = 'Network error. Please try again.'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }, [])

  // Logout function
  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...')
      await api.post('/api/auth/logout')
    } catch (error) {
      console.error('🚨 Logout API error:', error)
    } finally {
      console.log('✅ User logged out')
      // Clear localStorage token
      localStorage.removeItem('auth-token')
      setAuthState({
        user: null,
        loading: false,
        error: null
      })
    }
  }, [])

  // Invite user function
  const inviteUser = useCallback(async (email: string, role: 'USER' | 'ADMIN') => {
    try {
      const response = await api.post('/api/crew/invite', { email, role })
      const data = await response.json()

      if (response.ok) {
        return { 
          success: true, 
          invitationUrl: data.invitationUrl || '',
          message: data.message || 'Invitation sent successfully'
        }
      } else {
        return { 
          success: false, 
          error: data.error || 'Failed to send invitation' 
        }
      }
    } catch (error) {
      console.error('🚨 Invite user error:', error)
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      }
    }
  }, [])

  // Resend invitation function
  const resendInvitation = useCallback(async (memberId: string) => {
    try {
      const response = await api.post(`/api/crew/resend-invitation/${memberId}`)
      const data = await response.json()

      if (response.ok) {
        return { 
          success: true, 
          message: data.message || 'Invitation resent successfully'
        }
      } else {
        return { 
          success: false, 
          error: data.error || 'Failed to resend invitation' 
        }
      }
    } catch (error) {
      console.error('🚨 Resend invitation error:', error)
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      }
    }
  }, [])

  // Check auth on mount
  useEffect(() => {
    console.log('🔄 useAuth hook mounted, checking authentication...')
    checkAuth()
  }, [])

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    login,
    register,
    logout,
    inviteUser,
    resendInvitation,
    checkAuth
  }
}