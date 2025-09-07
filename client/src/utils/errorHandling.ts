// Mission Critical: Error Handling and Recovery System

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  timestamp: Date
  context?: any
}

export class NetworkCRMError extends Error {
  public code?: string
  public statusCode?: number
  public timestamp: Date
  public context?: any

  constructor(message: string, code?: string, statusCode?: number, context?: any) {
    super(message)
    this.name = 'NetworkCRMError'
    this.code = code
    this.statusCode = statusCode
    this.timestamp = new Date()
    this.context = context
  }
}

// Retry configuration
interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
}

// Exponential backoff retry mechanism
export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> => {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === fullConfig.maxRetries) {
        break
      }

      // Don't retry on certain error types
      if (lastError instanceof NetworkCRMError && lastError.statusCode) {
        if (lastError.statusCode === 400 || lastError.statusCode === 401 || lastError.statusCode === 403) {
          break
        }
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        fullConfig.baseDelay * Math.pow(fullConfig.backoffMultiplier, attempt),
        fullConfig.maxDelay
      )

      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Helper to get API headers
const getApiHeaders = (additionalHeaders: Record<string, string> = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  }
  
  return headers
}

// Enhanced fetch with error handling and retries
export const safeFetch = async (
  url: string,
  options: RequestInit = {},
  retryConfig?: Partial<RetryConfig>
): Promise<Response> => {
  return withRetry(async () => {
    const response = await fetch(url, {
      ...options,
      headers: getApiHeaders(options.headers as Record<string, string>)
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      let errorData: any = null

      try {
        errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch {
        // Response is not JSON, use status text
      }

      throw new NetworkCRMError(
        errorMessage,
        errorData?.code || 'HTTP_ERROR',
        response.status,
        { url, options, responseData: errorData }
      )
    }

    return response
  }, retryConfig)
}

// Contact operations with error handling
export const safeContactOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: any
): Promise<{ data?: T; error?: ApiError }> => {
  try {
    const data = await operation()
    return { data }
  } catch (error) {
    console.error(`${operationName} failed:`, error)

    let apiError: ApiError

    if (error instanceof NetworkCRMError) {
      apiError = {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        timestamp: error.timestamp,
        context: { ...error.context, operationName, ...context }
      }
    } else if (error instanceof Error) {
      apiError = {
        message: error.message,
        timestamp: new Date(),
        context: { operationName, ...context }
      }
    } else {
      apiError = {
        message: 'An unknown error occurred',
        timestamp: new Date(),
        context: { operationName, error: String(error), ...context }
      }
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      logErrorToService(apiError)
    }

    return { error: apiError }
  }
}

// Error logging service (placeholder for external logging)
const logErrorToService = async (error: ApiError) => {
  try {
    // In production, this would send to logging service like Sentry, LogRocket, etc.
    console.error('Production Error:', JSON.stringify(error, null, 2))
    
    // Could implement:
    // await fetch('/api/errors', { method: 'POST', body: JSON.stringify(error) })
    // or Sentry.captureException(error)
  } catch (loggingError) {
    console.error('Failed to log error:', loggingError)
  }
}

// User-friendly error messages
export const getUserFriendlyMessage = (error: ApiError): string => {
  if (error.statusCode === 401) {
    return 'Your session has expired. Please log in again.'
  }
  
  if (error.statusCode === 403) {
    return 'You do not have permission to perform this action.'
  }
  
  if (error.statusCode === 404) {
    return 'The requested resource was not found.'
  }
  
  if (error.statusCode === 413) {
    return 'The file you are trying to upload is too large.'
  }
  
  if (error.statusCode === 429) {
    return 'Too many requests. Please wait a moment and try again.'
  }
  
  if (error.statusCode && error.statusCode >= 500) {
    return 'A server error occurred. Our team has been notified. Please try again later.'
  }
  
  if (error.message.includes('network') || error.message.includes('fetch')) {
    return 'Network connection error. Please check your internet connection and try again.'
  }
  
  if (error.message.includes('timeout')) {
    return 'The request took too long to complete. Please try again.'
  }
  
  // Return original message for validation errors and other user-friendly messages
  return error.message || 'An unexpected error occurred. Please try again.'
}

// Global error boundary for React components
export const handleGlobalError = (error: Error, errorInfo?: any) => {
  const apiError: ApiError = {
    message: error.message,
    code: 'REACT_ERROR',
    timestamp: new Date(),
    context: {
      stack: error.stack,
      errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  }

  console.error('Global error:', apiError)
  
  if (process.env.NODE_ENV === 'production') {
    logErrorToService(apiError)
  }
}

// Data integrity checks
export const verifyDataIntegrity = (data: any, expectedSchema: any): boolean => {
  try {
    // Basic schema validation
    if (typeof data !== 'object' || data === null) {
      return false
    }

    for (const [key, expectedType] of Object.entries(expectedSchema)) {
      if (data.hasOwnProperty(key)) {
        if (expectedType === 'string' && typeof data[key] !== 'string') {
          return false
        }
        if (expectedType === 'number' && typeof data[key] !== 'number') {
          return false
        }
        if (expectedType === 'array' && !Array.isArray(data[key])) {
          return false
        }
      }
    }

    return true
  } catch (error) {
    console.error('Data integrity check failed:', error)
    return false
  }
}

// Performance monitoring
export const measurePerformance = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  const startTime = performance.now()
  
  try {
    const result = await operation()
    const endTime = performance.now()
    const duration = endTime - startTime

    console.log(`${operationName} completed in ${duration.toFixed(2)}ms`)

    // Log slow operations
    if (duration > 5000) { // 5 seconds
      console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`)
    }

    return result
  } catch (error) {
    const endTime = performance.now()
    const duration = endTime - startTime

    console.error(`${operationName} failed after ${duration.toFixed(2)}ms:`, error)
    throw error
  }
}