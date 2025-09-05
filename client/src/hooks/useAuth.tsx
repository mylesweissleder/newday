import { useState, useEffect } from 'react'

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

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  useEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (token) {
      fetchUserProfile(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        localStorage.removeItem('auth-token')
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
      localStorage.removeItem('auth-token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    // Demo mode - simulate API call for demo credentials
    if (email === 'demo@networkcrm.com' && password === 'demo123456') {
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
      return { success: true }
    }

    // For production, try API call
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      
      if (response.ok) {
        localStorage.setItem('auth-token', data.token)
        setUser(data.user)
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      // Fallback to demo for connection errors
      if (email === 'demo@networkcrm.com' && password === 'demo123456') {
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
        return { success: true }
      }
      
      return { success: false, error: 'Connection error - please check your credentials' }
    }
  }

  const logout = () => {
    localStorage.removeItem('auth-token')
    setUser(null)
  }

  return {
    user,
    loading,
    login,
    logout
  }
}