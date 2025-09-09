// API utility functions for HTTP-only cookie authentication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// Generic API call function with HTTP-only cookie authentication
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Always include HTTP-only cookies
  }

  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  }

  const response = await fetch(url, mergedOptions)
  return response
}

// Convenience methods for common HTTP verbs
export const api = {
  get: (endpoint: string, options: RequestInit = {}) => 
    apiCall(endpoint, { ...options, method: 'GET' }),
  
  post: (endpoint: string, data?: any, options: RequestInit = {}) => 
    apiCall(endpoint, { 
      ...options, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  put: (endpoint: string, data?: any, options: RequestInit = {}) => 
    apiCall(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  delete: (endpoint: string, options: RequestInit = {}) => 
    apiCall(endpoint, { ...options, method: 'DELETE' }),
  
  patch: (endpoint: string, data?: any, options: RequestInit = {}) => 
    apiCall(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined 
    }),
}

export { API_BASE_URL }