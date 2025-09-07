import { useState, useEffect, useCallback } from 'react'

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

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'
  
  // Helper to get API headers with site password
  const getApiHeaders = (includeAuth = false) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    
    // Add auth token if needed
    if (includeAuth) {
      const token = localStorage.getItem('auth-token')
      if (token && token !== 'demo-token') {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    
    return headers
  }

  useEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (token && token !== 'demo-token') {
      fetchUserProfile(token)
    } else if (token === 'demo-token') {
      // Restore demo user from localStorage
      const demoUser = {
        id: 'demo-user-id',
        email: 'demo@networkcrm.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'ADMIN',
        accountId: 'demo-account-id',
        accountName: 'Demo Account'
      }
      setUser(demoUser)
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserProfile = async (token: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: getApiHeaders(true)
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('auth-token')
        setUser(null)
      } else {
        // Profile endpoint might not exist - don't show error to user
        console.warn('Profile endpoint not available, continuing without user data')
      }
    } catch (err) {
      console.warn('Error fetching user profile:', err)
      // Don't set error - allow user to continue
    }
    
    setLoading(false)
  }

  const refreshToken = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      if (!token || token === 'demo-token') return false

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: getApiHeaders(true)
      })

      if (response.ok) {
        const { token: newToken } = await response.json()
        localStorage.setItem('auth-token', newToken)
        return true
      } else {
        localStorage.removeItem('auth-token')
        setUser(null)
        return false
      }
    } catch (err) {
      console.error('Error refreshing token:', err)
      return false
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Demo mode - keep existing demo functionality
      if ((email === 'demo@truecrew.com' || email === 'demo@trustcircle.com' || email === 'demo@smartpack.com' || email === 'demo@networkcrm.com') && password === 'demo123456') {
        const demoUser = {
          id: 'demo-user-id',
          email: 'demo@networkcrm.com',
          firstName: 'Demo',
          lastName: 'User',
          role: 'ADMIN',
          accountId: 'demo-account-id',
          accountName: 'Demo Account'
        }
        
        localStorage.setItem('auth-token', 'demo-token')
        setUser(demoUser)
        setLoading(false)
        return { success: true }
      }

      // Real authentication
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('auth-token', data.token)
        setUser(data.user)
        setLoading(false)
        return { success: true }
      } else {
        setError(data.message || 'Login failed')
        setLoading(false)
        return { success: false, error: data.message || 'Invalid credentials' }
      }
    } catch (err) {
      console.error('Login error:', err)
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

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(userData),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        const errorMessage = `Server error (${response.status}). Please try again.`
        setError(errorMessage)
        setLoading(false)
        return { success: false, error: errorMessage }
      }

      if (response.ok) {
        localStorage.setItem('auth-token', data.token)
        setUser(data.user)
        setLoading(false)
        return { success: true }
      } else {
        const errorMessage = data.error || data.message || `Registration failed (${response.status})`
        setError(errorMessage)
        setLoading(false)
        return { success: false, error: errorMessage }
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      let errorMessage = 'Network error. Please try again.'
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.'
      }
      
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    localStorage.removeItem('auth-token')
    setUser(null)
  }

  // Set up automatic token refresh
  useEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (token && token !== 'demo-token' && user) {
      // Refresh token every 50 minutes (assuming 1-hour expiry)
      const interval = setInterval(() => {
        refreshToken()
      }, 50 * 60 * 1000)

      return () => clearInterval(interval)
    }
  }, [user])

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