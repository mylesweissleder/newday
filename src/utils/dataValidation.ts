// Mission Critical: Data Validation and Sanitization

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedData?: any
}

// Contact Data Validation
export const validateContact = (contact: any): ValidationResult => {
  const errors: string[] = []
  const sanitized: any = {}

  // Required fields validation
  if (!contact.firstName || typeof contact.firstName !== 'string') {
    errors.push('First name is required and must be a string')
  } else {
    sanitized.firstName = contact.firstName.trim().slice(0, 50)
  }

  if (!contact.lastName || typeof contact.lastName !== 'string') {
    errors.push('Last name is required and must be a string')
  } else {
    sanitized.lastName = contact.lastName.trim().slice(0, 50)
  }

  // Email validation with regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!contact.email || !emailRegex.test(contact.email)) {
    errors.push('Valid email address is required')
  } else {
    sanitized.email = contact.email.toLowerCase().trim()
  }

  // Optional fields validation and sanitization
  if (contact.company) {
    if (typeof contact.company === 'string') {
      sanitized.company = contact.company.trim().slice(0, 100)
    } else {
      errors.push('Company must be a string')
    }
  }

  if (contact.position) {
    if (typeof contact.position === 'string') {
      sanitized.position = contact.position.trim().slice(0, 100)
    } else {
      errors.push('Position must be a string')
    }
  }

  if (contact.phone) {
    // Basic phone sanitization - remove spaces, dashes, parentheses
    const phoneRegex = /^[\+]?[0-9\s\-\(\)\.]{10,20}$/
    if (typeof contact.phone === 'string' && phoneRegex.test(contact.phone)) {
      sanitized.phone = contact.phone.trim().slice(0, 20)
    } else {
      errors.push('Phone must be a valid phone number')
    }
  }

  // Tier validation
  const validTiers = ['TIER_1', 'TIER_2', 'TIER_3']
  if (contact.tier && !validTiers.includes(contact.tier)) {
    errors.push('Tier must be TIER_1, TIER_2, or TIER_3')
  } else if (contact.tier) {
    sanitized.tier = contact.tier
  }

  // LinkedIn URL validation
  if (contact.linkedinUrl) {
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\//
    if (typeof contact.linkedinUrl === 'string' && linkedinRegex.test(contact.linkedinUrl)) {
      sanitized.linkedinUrl = contact.linkedinUrl.trim()
    } else {
      errors.push('LinkedIn URL must be a valid LinkedIn profile URL')
    }
  }

  // Tags validation
  if (contact.tags) {
    if (Array.isArray(contact.tags)) {
      sanitized.tags = contact.tags
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => tag.trim().toLowerCase())
        .slice(0, 20) // Max 20 tags
    } else {
      errors.push('Tags must be an array of strings')
    }
  }

  // Relationship notes sanitization
  if (contact.relationshipNotes) {
    if (typeof contact.relationshipNotes === 'string') {
      sanitized.relationshipNotes = contact.relationshipNotes.trim().slice(0, 2000)
    } else {
      errors.push('Relationship notes must be a string')
    }
  }

  // Custom fields validation - ensure no malicious content
  if (contact.customFields && typeof contact.customFields === 'object') {
    sanitized.customFields = {}
    Object.entries(contact.customFields).forEach(([key, value]) => {
      // Sanitize field names and values
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50)
      if (sanitizedKey && typeof value === 'string' && value.length < 500) {
        sanitized.customFields[sanitizedKey] = value.trim()
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitized : undefined
  }
}

// Bulk contact validation
export const validateContactBatch = (contacts: any[]): {
  validContacts: any[]
  invalidContacts: { index: number, errors: string[], originalData: any }[]
} => {
  const validContacts: any[] = []
  const invalidContacts: { index: number, errors: string[], originalData: any }[] = []

  contacts.forEach((contact, index) => {
    const validation = validateContact(contact)
    if (validation.isValid && validation.sanitizedData) {
      validContacts.push(validation.sanitizedData)
    } else {
      invalidContacts.push({
        index,
        errors: validation.errors,
        originalData: contact
      })
    }
  })

  return { validContacts, invalidContacts }
}

// File upload validation
export const validateFileUpload = (file: File): ValidationResult => {
  const errors: string[] = []
  
  // File size limit (10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size must be less than 10MB')
  }

  // File type validation
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  
  if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
    errors.push('File must be CSV or Excel format')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// API response validation
export const validateApiResponse = (response: any, expectedFields: string[]): boolean => {
  if (!response || typeof response !== 'object') {
    return false
  }

  return expectedFields.every(field => response.hasOwnProperty(field))
}

// Sanitize search queries to prevent injection
export const sanitizeSearchQuery = (query: string): string => {
  if (typeof query !== 'string') return ''
  
  // Remove potentially dangerous characters and limit length
  return query
    .replace(/[<>\"']/g, '')
    .trim()
    .slice(0, 100)
}

// Database connection health check
export const validateDatabaseConnection = async (apiUrl: string, token: string): Promise<boolean> => {
  try {
    const response = await fetch(`${apiUrl}/api/health`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    } as RequestInit)

    return response.ok
  } catch (error) {
    console.error('Database connection validation failed:', error)
    return false
  }
}