import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import GoogleContactsImport from '../components/GoogleContactsImport'

interface ContactHistory {
  email?: string
  company?: string
  position?: string
  phone?: string
  detectedAt: Date
  source: string
  confidence: 'high' | 'medium' | 'low'
}

interface LinkedInMessage {
  id: string
  conversationId: string
  sender: string // Email of who sent the message
  recipient: string // Email of who received the message  
  content: string
  sentAt: Date
  direction: 'sent' | 'received'
  importedBy: string // Email of user who imported this data
  messageThread?: string // Thread identifier
}

interface LinkedInInteraction {
  type: 'profile_view' | 'post_like' | 'post_comment' | 'connection_request' | 'endorsement'
  actor: string // Who performed the action
  target: string // Who was the target
  content?: string // Comment text, etc.
  occurredAt: Date
  importedBy: string // Who imported this data
  platform: 'linkedin' | 'email' | 'other'
}

interface Contact {
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  phone?: string
  tier?: string
  linkedinUrl?: string
  relationshipNotes?: string
  tags?: string[]
  customFields?: Record<string, any>
  careerHistory?: ContactHistory[]
  linkedinMessages?: LinkedInMessage[] // Messages segmented by user
  linkedinInteractions?: LinkedInInteraction[] // All interactions with clear attribution
  sources?: Array<{
    fileName: string
    uploadedBy?: string
    uploadedAt: Date
    originalData: any
    customFieldsDetected?: string[]
    dataType?: 'contacts' | 'messages' | 'interactions' | 'connections'
  }>
}

interface DuplicateGroup {
  primaryEmail: string
  contacts: Array<Contact & { sourceFile: string }>
  mergedContact?: Contact
}

interface ImportContactsPageProps {
  onBack: () => void
}

const ImportContactsPage: React.FC<ImportContactsPageProps> = ({ onBack }) => {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [parsedContacts, setParsedContacts] = useState<Contact[]>([])
  const [parseResults, setParseResults] = useState<{[key: string]: {contacts: Contact[], errors: string[]}}>({})
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{success: number, failed: number, errors: string[]} | null>(null)
  const [showGoogleImport, setShowGoogleImport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Helper function to parse full name into first and last
  const parseFullName = (fullName: string): { firstName: string, lastName: string } => {
    const trimmed = fullName.trim()
    const parts = trimmed.split(/\s+/)
    
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' }
    } else if (parts.length === 2) {
      return { firstName: parts[0], lastName: parts[1] }
    } else {
      // Handle middle names or complex names
      // Assume first word is first name, rest is last name
      return { 
        firstName: parts[0], 
        lastName: parts.slice(1).join(' ')
      }
    }
  }

  // Helper function to normalize email for deduplication
  const normalizeEmail = (email: string): string => {
    return email.toLowerCase().trim().replace(/\+.*@/, '@') // Remove + aliases
  }

  // Helper function to detect data type based on content
  const detectDataType = (values: string[]): string => {
    const nonEmptyValues = values.filter(v => v && v.trim()).slice(0, 10) // Sample first 10 non-empty values
    if (nonEmptyValues.length === 0) return 'unknown'

    let emailCount = 0
    let phoneCount = 0
    let nameCount = 0
    let companyCount = 0
    let urlCount = 0

    nonEmptyValues.forEach(value => {
      const val = value.trim().toLowerCase()
      
      // Email detection
      if (val.includes('@') && val.includes('.')) emailCount++
      
      // Phone detection (various formats)
      if (/^[\+\-\s\(\)0-9]{10,}$/.test(val.replace(/\s/g, ''))) phoneCount++
      
      // URL detection
      if (val.startsWith('http') || val.includes('linkedin.com') || val.includes('www.')) urlCount++
      
      // Name detection (2-3 words, mostly letters)
      if (/^[a-zA-Z\s\-\'\.]{2,50}$/.test(val) && val.split(' ').length <= 3 && val.split(' ').length >= 2) {
        nameCount++
      }
      
      // Company detection (contains common business words or Inc, LLC, Corp, etc.)
      if (/\b(inc|llc|corp|ltd|company|group|solutions|services|technologies|tech|consulting)\b/i.test(val) ||
          /\b(co\.|co$|corporation|limited)\b/i.test(val)) {
        companyCount++
      }
    })

    const total = nonEmptyValues.length
    
    // Determine type based on highest confidence
    if (emailCount / total > 0.7) return 'email'
    if (phoneCount / total > 0.6) return 'phone'
    if (urlCount / total > 0.5) return 'linkedinUrl'
    if (companyCount / total > 0.4) return 'company'
    if (nameCount / total > 0.6) return 'fullName'
    
    return 'unknown'
  }

  // Helper function to analyze headerless data structure
  const analyzeHeaderlessData = (data: any[]): {[colIndex: number]: string} => {
    const columnMappings: {[colIndex: number]: string} = {}
    
    if (data.length === 0) return columnMappings
    
    // Get column count from first row
    const firstRow = data[0]
    const columnCount = Array.isArray(firstRow) ? firstRow.length : Object.keys(firstRow).length
    
    // Analyze each column
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const columnValues = data.map(row => {
        if (Array.isArray(row)) {
          return row[colIndex] || ''
        } else {
          const keys = Object.keys(row)
          return row[keys[colIndex]] || ''
        }
      }).map(val => String(val))
      
      const detectedType = detectDataType(columnValues)
      columnMappings[colIndex] = detectedType
    }
    
    // Post-process: ensure we have required fields and handle duplicates
    const usedTypes = Object.values(columnMappings)
    
    // If we found a fullName but no firstName/lastName, split it
    const fullNameIndex = Object.keys(columnMappings).find(key => columnMappings[parseInt(key)] === 'fullName')
    if (fullNameIndex && !usedTypes.includes('firstName') && !usedTypes.includes('lastName')) {
      // Keep fullName mapping, we'll handle splitting in processing
    }
    
    return columnMappings
  }

  // Helper function to process LinkedIn message data with proper attribution
  const processLinkedInMessages = (messageData: any[], importedBy: string): LinkedInMessage[] => {
    return messageData.map((row, index) => ({
      id: `msg_${Date.now()}_${index}`,
      conversationId: row.conversationId || `conv_${row.participant || index}`,
      sender: row.direction === 'OUTGOING' ? importedBy : (row.participant || 'unknown'),
      recipient: row.direction === 'INCOMING' ? importedBy : (row.participant || 'unknown'),
      content: row.content || row.message || '',
      sentAt: new Date(row.date || row.timestamp || Date.now()),
      direction: row.direction === 'OUTGOING' ? 'sent' : 'received',
      importedBy,
      messageThread: row.conversationId || `thread_${row.participant}`
    }))
  }

  // Helper function to process LinkedIn interactions with attribution  
  const processLinkedInInteractions = (interactionData: any[], importedBy: string): LinkedInInteraction[] => {
    return interactionData.map(row => ({
      type: detectInteractionType(row.action || row.type),
      actor: row.direction === 'OUTGOING' ? importedBy : (row.person || row.target),
      target: row.direction === 'INCOMING' ? importedBy : (row.person || row.target), 
      content: row.content || row.comment || '',
      occurredAt: new Date(row.date || row.timestamp || Date.now()),
      importedBy,
      platform: 'linkedin'
    }))
  }

  // Helper function to detect interaction type
  const detectInteractionType = (action: string): LinkedInInteraction['type'] => {
    const normalized = action?.toLowerCase() || ''
    if (normalized.includes('view')) return 'profile_view'
    if (normalized.includes('like')) return 'post_like' 
    if (normalized.includes('comment')) return 'post_comment'
    if (normalized.includes('connect')) return 'connection_request'
    if (normalized.includes('endorse')) return 'endorsement'
    return 'profile_view' // default
  }

  // Helper function to detect career progression and merge contacts
  const mergeContactWithHistory = (existingContact: Contact, newContactData: Contact & { sourceFile: string }): Contact => {
    const merged = { ...existingContact }
    const newHistory: ContactHistory[] = []
    
    // Check for changes that indicate career progression
    if (newContactData.email !== existingContact.email && newContactData.email) {
      newHistory.push({
        email: existingContact.email,
        detectedAt: new Date(),
        source: newContactData.sourceFile,
        confidence: 'high'
      })
      merged.email = newContactData.email // Update to most recent email
    }
    
    if (newContactData.company !== existingContact.company && newContactData.company) {
      newHistory.push({
        company: existingContact.company,
        detectedAt: new Date(),
        source: newContactData.sourceFile,
        confidence: 'high'
      })
      merged.company = newContactData.company // Update to most recent company
    }
    
    if (newContactData.position !== existingContact.position && newContactData.position) {
      newHistory.push({
        position: existingContact.position,
        detectedAt: new Date(),
        source: newContactData.sourceFile,
        confidence: 'high'
      })
      merged.position = newContactData.position // Update to most recent position
    }
    
    if (newContactData.phone !== existingContact.phone && newContactData.phone) {
      newHistory.push({
        phone: existingContact.phone,
        detectedAt: new Date(),
        source: newContactData.sourceFile,
        confidence: 'medium'
      })
      merged.phone = newContactData.phone // Update to most recent phone
    }
    
    // Merge career history
    merged.careerHistory = [...(existingContact.careerHistory || []), ...newHistory]
    
    // Merge other fields
    merged.relationshipNotes = [existingContact.relationshipNotes, newContactData.relationshipNotes]
      .filter(Boolean).join('\\n\\n')
    
    merged.tags = [...new Set([...(existingContact.tags || []), ...(newContactData.tags || [])])]
    
    // Merge custom fields
    merged.customFields = {
      ...existingContact.customFields,
      ...newContactData.customFields
    }
    
    // Merge sources
    merged.sources = [...(existingContact.sources || []), ...(newContactData.sources || [])]
    
    return merged
  }

  // Find duplicates across all parsed contacts
  const findDuplicates = (allContacts: Array<Contact & { sourceFile: string }>): DuplicateGroup[] => {
    const emailGroups = new Map<string, Array<Contact & { sourceFile: string }>>()
    
    allContacts.forEach(contact => {
      const normalizedEmail = normalizeEmail(contact.email)
      if (!emailGroups.has(normalizedEmail)) {
        emailGroups.set(normalizedEmail, [])
      }
      emailGroups.get(normalizedEmail)!.push(contact)
    })

    const duplicateGroups: DuplicateGroup[] = []
    
    emailGroups.forEach((contacts, email) => {
      if (contacts.length > 1) {
        // Merge contact data intelligently
        const merged = mergeContacts(contacts)
        duplicateGroups.push({
          primaryEmail: email,
          contacts,
          mergedContact: merged
        })
      }
    })

    return duplicateGroups
  }

  // Intelligently merge duplicate contacts with career progression tracking
  const mergeContacts = (contacts: Array<Contact & { sourceFile: string }>): Contact => {
    if (contacts.length === 1) return contacts[0]
    
    // Start with the first contact as base
    let merged = contacts[0]
    
    // Apply career progression logic for each subsequent contact
    for (let i = 1; i < contacts.length; i++) {
      merged = mergeContactWithHistory(merged, contacts[i])
    }

    return merged
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'text/csv' || file.name.endsWith('.csv') || 
              file.type === 'application/vnd.ms-excel' ||
              file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const processFiles = async (files: File[]) => {
    setUploading(true)
    const newUploadedFiles = [...uploadedFiles, ...files]
    setUploadedFiles(newUploadedFiles)
    
    const newResults = { ...parseResults }
    
    for (const file of files) {
      try {
        const text = await file.text()
        // Try to parse with headers first
        let results = Papa.parse<any>(text, {
          header: true,
          skipEmptyLines: true,
          preview: 5 // Preview to check if headers exist
        })
        
        let hasValidHeaders = false
        if (results.meta.fields && results.meta.fields.length > 0) {
          const fields = results.meta.fields
          // Check if first row looks like headers (contains common field names or no @ symbols)
          hasValidHeaders = fields.some(field => {
            const normalized = field.toLowerCase()
            return normalized.includes('name') || normalized.includes('email') || 
                   normalized.includes('company') || normalized.includes('phone') ||
                   (field && !field.includes('@'))
          })
        }
        
        if (!hasValidHeaders) {
          // Parse as headerless data
          results = Papa.parse<any>(text, {
            header: false,
            skipEmptyLines: true
          })
          
          // Analyze column patterns
          const columnMappings = analyzeHeaderlessData(results.data)
          
          // Transform data using detected patterns
          const transformedData = results.data.map(row => {
            const transformedRow: any = {}
            
            if (Array.isArray(row)) {
              row.forEach((value, index) => {
                const detectedType = columnMappings[index] || 'unknown'
                if (detectedType !== 'unknown') {
                  transformedRow[detectedType] = value
                } else {
                  transformedRow[`column_${index}`] = value
                }
              })
            }
            
            return transformedRow
          })
          
          results.data = transformedData
        } else {
          // Re-parse with proper header transformation
          results = Papa.parse<any>(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => {
              const normalized = header.toLowerCase().trim().replace(/[_\s]+/g, '')
              
              if (normalized === 'fullname' || normalized === 'name') return 'fullName'
              if (normalized.includes('first') && normalized.includes('name')) return 'firstName'
              if (normalized.includes('last') && normalized.includes('name')) return 'lastName'
              if (normalized.includes('email')) return 'email'
              if (normalized.includes('phone')) return 'phone'
              if (normalized.includes('company')) return 'company'
              if (normalized.includes('position') || normalized.includes('title')) return 'position'
              
              return header
            }
          })
        }

        const contacts: Contact[] = []
        const errors: string[] = []

        results.data.forEach((row: any, index: number) => {
          // Basic validation
          if (!row.email || !row.email.includes('@')) {
            errors.push(`Row ${index + 2}: Invalid or missing email address`)
            return
          }

          // Handle different name formats
          let firstName = ''
          let lastName = ''
          
          if (row.fullName) {
            // Parse full name into first and last
            const parsed = parseFullName(row.fullName)
            firstName = parsed.firstName
            lastName = parsed.lastName
          } else if (row.firstName || row.lastName) {
            firstName = row.firstName || ''
            lastName = row.lastName || ''
          } else {
            errors.push(`Row ${index + 2}: Missing name (no fullName, firstName, or lastName)`)
            return
          }

          // Parse tags from various formats
          let parsedTags: string[] = []
          if (row.tags) {
            if (typeof row.tags === 'string') {
              parsedTags = row.tags.split(/[,;|]/).map(tag => tag.trim()).filter(Boolean)
            }
          }

          // Collect all unmapped custom fields for preservation
          const customFields: Record<string, any> = {}
          const standardFields = new Set([
            'firstName', 'lastName', 'fullName', 'email', 'phone', 'mobile', 'company', 
            'organization', 'position', 'title', 'role', 'linkedinUrl', 'tier', 'notes', 
            'relationshipNotes', 'tags', 'lastContactDate', 'source', 'interactionHistory',
            'mutualConnections', 'personalNotes', 'industry'
          ])
          
          Object.entries(row).forEach(([key, value]) => {
            if (!standardFields.has(key) && value && value.toString().trim()) {
              customFields[key] = value
            }
          })

          const contact: Contact = {
            firstName,
            lastName,
            email: normalizeEmail(row.email),
            company: row.company || row.organization || '',
            position: row.position || row.title || row.role || '',
            phone: row.phone || row.mobile || '',
            tier: row.tier || row.priority || 'TIER_3',
            linkedinUrl: row.linkedinUrl || '',
            relationshipNotes: [
              row.relationshipNotes,
              row.notes,
              row.personalNotes,
              row.interactionHistory
            ].filter(Boolean).join('\\n\\n'),
            tags: parsedTags,
            customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
            sources: [{
              fileName: file.name,
              uploadedAt: new Date(),
              originalData: row,
              customFieldsDetected: Object.keys(customFields)
            }]
          }

          contacts.push(contact)
        })

        newResults[file.name] = { contacts, errors }

        if (results.errors && results.errors.length > 0) {
          results.errors.forEach(error => {
            errors.push(`Parse error: ${error.message}`)
          })
        }

      } catch (error) {
        newResults[file.name] = {
          contacts: [],
          errors: [`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }
      }
    }

    setParseResults(newResults)
    
    // Collect all contacts with their source files
    const allContactsWithSource = Object.entries(newResults).flatMap(([fileName, result]) => 
      result.contacts.map(contact => ({ ...contact, sourceFile: fileName }))
    )
    
    // Find duplicates
    const duplicateGroups = findDuplicates(allContactsWithSource)
    setDuplicates(duplicateGroups)
    
    // Create deduplicated contact list
    const deduplicatedContacts: Contact[] = []
    const processedEmails = new Set<string>()
    
    allContactsWithSource.forEach(contact => {
      const normalizedEmail = normalizeEmail(contact.email)
      
      if (!processedEmails.has(normalizedEmail)) {
        processedEmails.add(normalizedEmail)
        
        // Check if this email is in duplicates
        const duplicateGroup = duplicateGroups.find(g => g.primaryEmail === normalizedEmail)
        
        if (duplicateGroup && duplicateGroup.mergedContact) {
          deduplicatedContacts.push(duplicateGroup.mergedContact)
        } else {
          deduplicatedContacts.push(contact)
        }
      }
    })
    
    setParsedContacts(deduplicatedContacts)
    
    // Show duplicates if found
    if (duplicateGroups.length > 0) {
      setShowDuplicates(true)
    }
    
    setUploading(false)
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const saveToDatabase = async () => {
    setSaving(true)
    setSaveResult(null)

    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'
    const token = localStorage.getItem('auth-token')

    // If demo token, simulate save
    if (token === 'demo-token') {
      await new Promise(resolve => setTimeout(resolve, 2000))
      result.success = parsedContacts.length
      setSaveResult(result)
      setSaving(false)
      alert(`Demo Mode: Successfully "saved" ${parsedContacts.length} contacts to database!`)
      return
    }

    try {
      // Save contacts one by one (could be optimized with bulk endpoint later)
      for (const contact of parsedContacts) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/contacts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
              company: contact.company,
              position: contact.position,
              phone: contact.phone,
              tier: contact.tier?.toUpperCase() || 'TIER_3',
              source: contact.sources?.map(s => s.fileName).join(', ') || 'CSV Import',
              tags: ['imported', ...uploadedFiles.map(f => f.name.replace(/\.[^/.]+$/, ''))]
            })
          })

          if (response.ok) {
            result.success++
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            result.failed++
            result.errors.push(`${contact.firstName} ${contact.lastName}: ${errorData.error || 'Failed to save'}`)
          }
        } catch (error) {
          result.failed++
          result.errors.push(`${contact.firstName} ${contact.lastName}: Network error`)
        }
      }

      setSaveResult(result)
      
      if (result.success > 0) {
        alert(`Successfully saved ${result.success} contacts to database!${result.failed > 0 ? ` (${result.failed} failed)` : ''}`)
      } else {
        alert('Failed to save contacts. Please check the errors and try again.')
      }

    } catch (error) {
      result.failed = parsedContacts.length
      result.errors.push('Network connection failed')
      setSaveResult(result)
      alert('Failed to connect to server. Please check your connection and try again.')
    }

    setSaving(false)
  }

  // Handle Google Contacts import
  const handleGoogleContactsImported = (googleContacts: any[]) => {
    // Transform Google contacts to match our Contact interface
    const transformedContacts: Contact[] = googleContacts.map(gc => ({
      firstName: gc.firstName,
      lastName: gc.lastName,
      email: gc.email,
      company: gc.company,
      position: gc.position,
      phone: gc.phone,
      tier: 'TIER_3', // Default tier for Google imports
      sources: [{
        fileName: 'Google Contacts',
        uploadedBy: 'current-user',
        uploadedAt: new Date(),
        originalData: gc
      }]
    }))

    // Add to existing parsed contacts for deduplication
    const allContacts = [...parsedContacts, ...transformedContacts]
    setParsedContacts(allContacts)

    // Run deduplication 
    const duplicateGroups = findDuplicates(allContacts)
    setDuplicates(duplicateGroups)
    
    // Close Google import modal
    setShowGoogleImport(false)

    // Show duplicates if any found
    if (duplicateGroups.length > 0) {
      setShowDuplicates(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg style={{width: '20px', height: '20px'}} className="mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Import Contacts</h1>
          <p className="text-gray-600">Bulk import from CSV files, LinkedIn exports, or connect to CRM systems</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Drag & Drop */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">File Upload</h2>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="mx-auto h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg style={{width: '32px', height: '32px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {dragOver ? 'Drop your files here' : 'Drag & drop your contact files'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Supports CSV, Excel files up to 10MB
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {uploading ? 'Uploading...' : 'Choose Files'}
                  </button>
                  <span className="text-sm text-gray-500 self-center">or drag and drop</span>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Supported Formats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Supported Formats</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                CSV files with headers (firstname, lastname, email, company, position)
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                LinkedIn export files
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Excel spreadsheets (.xlsx, .xls)
              </div>
            </div>
          </div>
        </div>

        {/* Integration Options */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Import</h2>
            <div className="space-y-3">

              <button 
                onClick={() => setShowGoogleImport(true)}
                className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left hover:border-blue-300 transition-colors"
              >
                <div className="h-10 w-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                  <svg style={{width: '20px', height: '20px'}} className="text-white" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Google Contacts</h3>
                  <p className="text-sm text-gray-500">Import your contacts from Google account</p>
                </div>
                <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Available</div>
              </button>


            </div>
          </div>

          {/* Sample File */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Need a template?</h3>
            <p className="text-sm text-blue-700 mb-3">
              Download our sample CSV file to see the required format
            </p>
            <button className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
              Download Sample CSV
            </button>
          </div>
        </div>
      </div>

      {/* Parse Results */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Import Summary</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{uploadedFiles.length}</div>
                  <div className="text-sm text-gray-600">Files Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{parsedContacts.length}</div>
                  <div className="text-sm text-gray-600">Unique Contacts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{duplicates.length}</div>
                  <div className="text-sm text-gray-600">Duplicates Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {Object.values(parseResults).flatMap(r => r.errors).length}
                  </div>
                  <div className="text-sm text-gray-600">Errors Found</div>
                </div>
              </div>
            </div>
          </div>

          {/* Duplicates Section */}
          {duplicates.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow">
              <div className="px-6 py-4 border-b border-yellow-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-yellow-900">Duplicate Contacts Detected</h2>
                  <button
                    onClick={() => setShowDuplicates(!showDuplicates)}
                    className="text-sm text-yellow-700 hover:text-yellow-900"
                  >
                    {showDuplicates ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
              </div>
              {showDuplicates && (
                <div className="p-6 space-y-4">
                  <p className="text-sm text-yellow-800 mb-4">
                    We found {duplicates.length} duplicate email addresses across your uploaded files. 
                    We've automatically merged the data, keeping the most complete information from each source.
                  </p>
                  {duplicates.slice(0, 3).map((group, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-yellow-300">
                      <div className="mb-3">
                        <span className="font-medium text-gray-900">Email: </span>
                        <span className="text-gray-700">{group.primaryEmail}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Sources:</h4>
                          {group.contacts.map((contact, idx) => (
                            <div key={idx} className="text-sm text-gray-600 mb-1">
                              • {contact.sourceFile}: {contact.firstName} {contact.lastName}
                              {contact.company && ` (${contact.company})`}
                            </div>
                          ))}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Merged Result:</h4>
                          <div className="text-sm text-gray-900">
                            <div><strong>Name:</strong> {group.mergedContact?.firstName} {group.mergedContact?.lastName}</div>
                            {group.mergedContact?.company && <div><strong>Company:</strong> {group.mergedContact.company}</div>}
                            {group.mergedContact?.position && <div><strong>Position:</strong> {group.mergedContact.position}</div>}
                            <div className="mt-1 text-xs text-gray-500">
                              Data from {group.mergedContact?.sources?.length} sources
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {duplicates.length > 3 && (
                    <p className="text-sm text-yellow-700 font-medium">
                      + {duplicates.length - 3} more duplicate groups...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File Results */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">File Processing Results</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {uploadedFiles.map((file, index) => {
                const result = parseResults[file.name]
                return (
                  <div key={index} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center mr-3 ${
                          result?.errors.length > 0 ? 'bg-yellow-100' : 'bg-green-100'
                        }`}>
                          <svg style={{width: '16px', height: '16px'}} className={`${
                            result?.errors.length > 0 ? 'text-yellow-600' : 'text-green-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                              result?.errors.length > 0 ? 
                              "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.348 16.5c-.77.833.192 2.5 1.732 2.5z" :
                              "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            } />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB • 
                            {result ? ` ${result.contacts.length} contacts` : ' Processing...'}
                            {result?.errors.length > 0 && ` • ${result.errors.length} errors`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg style={{width: '16px', height: '16px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Show errors */}
                    {result?.errors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                        <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                        <ul className="text-sm text-red-700 space-y-1">
                          {result.errors.slice(0, 5).map((error, errorIndex) => (
                            <li key={errorIndex}>• {error}</li>
                          ))}
                          {result.errors.length > 5 && (
                            <li className="font-medium">+ {result.errors.length - 5} more errors...</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Show sample contacts */}
                    {result?.contacts.length > 0 && (
                      <div className="bg-gray-50 rounded p-3">
                        <h4 className="font-medium text-gray-800 mb-2">Sample Contacts:</h4>
                        <div className="space-y-2">
                          {result.contacts.slice(0, 3).map((contact, contactIndex) => (
                            <div key={contactIndex} className="text-sm">
                              <span className="font-medium">{contact.firstName} {contact.lastName}</span>
                              <span className="text-gray-600 ml-2">{contact.email}</span>
                              {contact.company && <span className="text-gray-600 ml-2">at {contact.company}</span>}
                            </div>
                          ))}
                          {result.contacts.length > 3 && (
                            <div className="text-sm text-gray-600">+ {result.contacts.length - 3} more contacts...</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save to Database Button */}
          {parsedContacts.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <button 
                  onClick={saveToDatabase}
                  disabled={saving}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 flex items-center"
                >
                  {saving && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  )}
                  {saving ? 'Saving...' : `Save ${parsedContacts.length} Contacts to Database`}
                </button>
              </div>

              {/* Save Results */}
              {saveResult && (
                <div className="bg-white rounded-lg shadow border p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Save Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{saveResult.success}</div>
                      <div className="text-sm text-gray-600">Successfully Saved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{saveResult.failed}</div>
                      <div className="text-sm text-gray-600">Failed to Save</div>
                    </div>
                  </div>

                  {saveResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-4">
                      <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                      <div className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                        {saveResult.errors.slice(0, 10).map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                        {saveResult.errors.length > 10 && (
                          <div className="font-medium">+ {saveResult.errors.length - 10} more errors...</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Google Contacts Import Modal */}
      {showGoogleImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Import from Google Contacts</h2>
                  <p className="text-sm text-gray-600">Connect your Google account to import contacts</p>
                </div>
                <button
                  onClick={() => setShowGoogleImport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <GoogleContactsImport onContactsImported={handleGoogleContactsImported} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportContactsPage