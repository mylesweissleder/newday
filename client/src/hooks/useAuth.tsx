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

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Try to get user profile - this will validate the HTTP-only cookie
        const response = await api.get('/api/auth/profile')

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          console.log('useAuth: User authenticated via cookie:', data.user)
        } else if (response.status === 401) {
          // No valid authentication cookie
          setUser(null)
        } else {
          console.warn('Profile endpoint returned unexpected status:', response.status)
          setUser(null)
        }
      } catch (err) {
        console.warn('Error checking auth status:', err)
        setUser(null)
      }
      
      setLoading(false)
    }

    checkAuthStatus()
  }, [])


  const refreshToken = async () => {
    try {
      const response = await api.post('/api/auth/refresh')

      if (response.ok) {
        console.log('Token refreshed successfully')
        return true
      } else {
        setUser(null)
        return false
      }
    } catch (err) {
      console.error('Error refreshing token:', err)
      setUser(null)
      return false
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('useAuth: Login attempt with email:', email)
      console.log('useAuth: Attempting real API authentication...')
      // Real authentication
      const response = await api.post('/api/auth/login', { email, password })
      console.log('useAuth: API response received:', response.status, response.statusText)

      const data = await response.json()
      console.log('useAuth: API response data:', data)

      if (response.ok) {
        // No need to store token in localStorage - it's now in HTTP-only cookie
        setUser(data.user)
        setLoading(false)
        console.log('useAuth: Real login successful')
        return { success: true }
      } else {
        const errorMessage = data.message || 'Login failed'
        console.log('useAuth: Login failed with error:', errorMessage)
        setError(errorMessage)
        setLoading(false)
        return { success: false, error: errorMessage }
      }
    } catch (err) {
      console.error('useAuth: Login error caught:', err)
      const errorMessage = 'Network error. Please try again.'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }

  const register = async (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    accountName?: string
  }) => {
    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await api.post('/api/auth/register', userData, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        const errorMessage = `Server error (${response.status}). Please try again.`
        setError(errorMessage)
        setLoading(false)
        return { success: false, error: errorMessage }
      }

      if (response.ok) {
        // No need to store token in localStorage - it's now in HTTP-only cookie
        setUser(data.user)
        setLoading(false)
        setError(null)
        return { success: true }
      } else {
        const errorMessage = data.error || data.message || `Registration failed (${response.status})`
        setError(errorMessage)
        setLoading(false)
        return { success: false, error: errorMessage }
      }
    } catch (err: any) {
      console.error('useAuth: Registration error caught:', err)
      let errorMessage = 'Network error. Please try again.'
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.'
      }
      
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      // Call logout endpoint to clear HTTP-only cookie
      await api.post('/api/auth/logout')
    } catch (err) {
      console.warn('Error calling logout endpoint:', err)
    }
    
    // Clear user state regardless of API call success
    setUser(null)
  }

  // Automatic token refresh disabled since tokens now last 1 year

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refreshToken
  }
}