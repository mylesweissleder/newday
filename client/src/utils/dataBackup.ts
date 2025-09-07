// Mission Critical: Data Backup and Recovery System

export interface BackupData {
  contacts: any[]
  campaigns: any[]
  interactions: any[]
  metadata: {
    exportDate: string
    version: string
    userId: string
    accountId: string
    totalRecords: number
  }
}

export interface BackupOptions {
  includeCustomFields: boolean
  includeInteractions: boolean
  includeCampaigns: boolean
  format: 'json' | 'csv'
}

// Automatic local backup system
export class LocalBackupManager {
  private static readonly BACKUP_KEY = 'networkcrm_backup'
  private static readonly MAX_BACKUPS = 5
  private static readonly BACKUP_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

  // Create automatic backup
  static async createBackup(data: any[], userId: string, accountId: string): Promise<void> {
    try {
      const backup: BackupData = {
        contacts: data,
        campaigns: [], // Would be populated from API
        interactions: [], // Would be populated from API
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          userId,
          accountId,
          totalRecords: data.length
        }
      }

      // Get existing backups
      const existingBackups = this.getStoredBackups()
      
      // Add new backup
      existingBackups.unshift(backup)
      
      // Keep only the latest backups
      const trimmedBackups = existingBackups.slice(0, this.MAX_BACKUPS)
      
      // Store in localStorage
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(trimmedBackups))
      
      console.log(`Backup created: ${backup.metadata.totalRecords} records`)
    } catch (error) {
      console.error('Failed to create backup:', error)
    }
  }

  // Get stored backups
  static getStoredBackups(): BackupData[] {
    try {
      const stored = localStorage.getItem(this.BACKUP_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to retrieve backups:', error)
      return []
    }
  }

  // Check if backup is needed
  static needsBackup(): boolean {
    try {
      const backups = this.getStoredBackups()
      if (backups.length === 0) return true

      const lastBackup = new Date(backups[0].metadata.exportDate)
      const now = new Date()
      
      return (now.getTime() - lastBackup.getTime()) > this.BACKUP_INTERVAL
    } catch (error) {
      return true
    }
  }

  // Restore from backup
  static getLatestBackup(): BackupData | null {
    try {
      const backups = this.getStoredBackups()
      return backups.length > 0 ? backups[0] : null
    } catch (error) {
      console.error('Failed to get latest backup:', error)
      return null
    }
  }
}

// Export data for external backup
export const exportContactData = async (
  contacts: any[],
  options: BackupOptions = {
    includeCustomFields: true,
    includeInteractions: true,
    includeCampaigns: true,
    format: 'json'
  }
): Promise<string> => {
  try {
    if (options.format === 'csv') {
      return exportToCSV(contacts, options)
    } else {
      return exportToJSON(contacts, options)
    }
  } catch (error) {
    console.error('Export failed:', error)
    throw new Error('Failed to export contact data')
  }
}

// Export to JSON format
const exportToJSON = async (contacts: any[], options: BackupOptions): Promise<string> => {
  const exportData: BackupData = {
    contacts: contacts.map(contact => sanitizeContactForExport(contact, options)),
    campaigns: [], // Would fetch from API if needed
    interactions: [], // Would fetch from API if needed
    metadata: {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      userId: 'current-user', // Would get from auth
      accountId: 'current-account', // Would get from auth
      totalRecords: contacts.length
    }
  }

  return JSON.stringify(exportData, null, 2)
}

// Export to CSV format
const exportToCSV = async (contacts: any[], options: BackupOptions): Promise<string> => {
  const headers = [
    'firstName',
    'lastName', 
    'email',
    'company',
    'position',
    'phone',
    'tier',
    'linkedinUrl',
    'relationshipNotes',
    'tags',
    'source',
    'createdAt',
    'updatedAt'
  ]

  if (options.includeCustomFields) {
    headers.push('customFields')
  }

  const csvRows = [headers.join(',')]

  contacts.forEach(contact => {
    const row = headers.map(header => {
      let value = contact[header] || ''
      
      if (header === 'tags' && Array.isArray(value)) {
        value = value.join(';')
      } else if (header === 'customFields' && typeof value === 'object') {
        value = JSON.stringify(value)
      }
      
      // Escape commas and quotes
      if (typeof value === 'string') {
        value = value.replace(/"/g, '""')
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`
        }
      }
      
      return value
    })
    
    csvRows.push(row.join(','))
  })

  return csvRows.join('\n')
}

// Sanitize contact data for export
const sanitizeContactForExport = (contact: any, options: BackupOptions): any => {
  const sanitized: any = {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    company: contact.company,
    position: contact.position,
    phone: contact.phone,
    tier: contact.tier,
    linkedinUrl: contact.linkedinUrl,
    relationshipNotes: contact.relationshipNotes,
    tags: contact.tags,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt
  }

  if (options.includeCustomFields && contact.customFields) {
    sanitized.customFields = contact.customFields
  }

  // Remove any potentially sensitive or internal fields
  delete sanitized.id
  delete sanitized.userId
  delete sanitized.accountId

  return sanitized
}

// Download exported data as file
export const downloadBackup = (data: string, filename: string, mimeType: string = 'application/json'): void => {
  try {
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
    throw new Error('Failed to download backup file')
  }
}

// Data recovery utilities
export const validateBackupData = (data: any): boolean => {
  try {
    if (!data || typeof data !== 'object') return false
    
    // Check for required structure
    if (!data.contacts || !Array.isArray(data.contacts)) return false
    if (!data.metadata || typeof data.metadata !== 'object') return false
    
    // Validate metadata
    const requiredMetadata = ['exportDate', 'version', 'totalRecords']
    for (const field of requiredMetadata) {
      if (!data.metadata.hasOwnProperty(field)) return false
    }
    
    // Validate contact structure
    if (data.contacts.length > 0) {
      const contact = data.contacts[0]
      const requiredFields = ['firstName', 'lastName', 'email']
      for (const field of requiredFields) {
        if (!contact.hasOwnProperty(field)) return false
      }
    }
    
    return true
  } catch (error) {
    console.error('Backup validation failed:', error)
    return false
  }
}

// Emergency data recovery
export const emergencyDataRecovery = (): {
  localBackups: BackupData[]
  recommendations: string[]
} => {
  const backups = LocalBackupManager.getStoredBackups()
  const recommendations: string[] = []

  if (backups.length === 0) {
    recommendations.push('No local backups found. Contact support immediately.')
    recommendations.push('Check if you have exported data files saved elsewhere.')
  } else {
    recommendations.push(`Found ${backups.length} local backup(s).`)
    recommendations.push('Use the most recent backup to restore your data.')
    
    const latest = backups[0]
    recommendations.push(`Latest backup: ${latest.metadata.exportDate} (${latest.metadata.totalRecords} records)`)
  }

  return {
    localBackups: backups,
    recommendations
  }
}

// Health check for data integrity
export const performDataIntegrityCheck = (contacts: any[]): {
  isHealthy: boolean
  issues: string[]
  summary: {
    totalContacts: number
    missingEmails: number
    duplicateEmails: number
    incompleteRecords: number
  }
} => {
  const issues: string[] = []
  const emailSet = new Set()
  let missingEmails = 0
  let duplicateEmails = 0
  let incompleteRecords = 0

  contacts.forEach((contact, index) => {
    // Check for missing email
    if (!contact.email) {
      missingEmails++
      issues.push(`Contact at index ${index} missing email address`)
    } else if (emailSet.has(contact.email)) {
      duplicateEmails++
      issues.push(`Duplicate email found: ${contact.email}`)
    } else {
      emailSet.add(contact.email)
    }

    // Check for incomplete records
    if (!contact.firstName || !contact.lastName) {
      incompleteRecords++
      issues.push(`Contact at index ${index} missing name information`)
    }
  })

  const summary = {
    totalContacts: contacts.length,
    missingEmails,
    duplicateEmails,
    incompleteRecords
  }

  const isHealthy = issues.length === 0

  return { isHealthy, issues, summary }
}