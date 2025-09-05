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

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

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
    // Skip API call for demo mode to avoid CORS issues
    console.log('Skipping API profile fetch for demo mode')
    setLoading(false)
  }

  const login = async (email: string, password: string) => {
    console.log('Login called with:', { email, password })
    
    // Demo mode - simulate API call for demo credentials
    if (email === 'demo@networkcrm.com' && password === 'demo123456') {
      console.log('Using demo login')
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
      console.log('Setting demo user:', demoUser)
      setUser(demoUser)
      console.log('Demo user set, state should update')
      return { success: true }
    }

    // For now, return error for non-demo credentials to avoid CORS issues
    return { success: false, error: 'Invalid credentials. Use demo@networkcrm.com / demo123456' }
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