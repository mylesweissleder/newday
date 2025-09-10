// API utility functions for HTTP-only cookie authentication

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

// Generic API call function with HTTP-only cookie authentication
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  
  // Get token from localStorage as fallback for mobile incognito mode
  const token = localStorage.getItem('auth-token')
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      // Include Authorization header if token exists (for mobile incognito fallback)
      ...(token && { 'Authorization': `Bearer ${token}` })
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

  try {
    console.log('🌐 API Call:', { url, method: mergedOptions.method || 'GET' });
    const response = await fetch(url, mergedOptions)
    console.log('📡 API Response:', { status: response.status, ok: response.ok });
    return response
  } catch (error) {
    console.error('❌ API Call Failed:', { url, error });
    throw error;
  }
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