import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import GoogleContactsImport from '../components/GoogleContactsImport'
import { api } from '../utils/api'

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

interface ColumnMapping {
  originalColumn: string
  mappedTo: string
  confidence: 'high' | 'medium' | 'low' | 'manual'
  sampleValues: string[]
}

interface FilePreview {
  file: File
  columns: string[]
  sampleData: any[]
  suggestedMappings: ColumnMapping[]
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
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([])
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  const [currentMappingFile, setCurrentMappingFile] = useState<FilePreview | null>(null)
  const [fileErrors, setFileErrors] = useState<{[fileName: string]: string}>({})
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

  // Helper function to read Excel files and convert to CSV data
  const readExcelFile = async (file: File): Promise<{headers: string[], data: any[], sheetNames: string[]}> => {
    // Check file size (limit to 50MB)
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File too large. Please use files smaller than 50MB.')
    }
    
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    if (workbook.SheetNames.length === 0) {
      throw new Error('Excel file contains no sheets')
    }
    
    // Use the first sheet (could be enhanced to let user choose)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert to JSON with header row, handling empty cells
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '', // Default value for empty cells
      blankrows: false // Skip completely blank rows
    })
    
    if (jsonData.length === 0) {
      throw new Error(`Sheet "${sheetName}" is empty`)
    }
    
    if (jsonData.length < 2) {
      throw new Error(`Sheet "${sheetName}" must have at least a header row and one data row`)
    }
    
    // First row as headers, rest as data
    const headers = (jsonData[0] as any[]).map(h => String(h || '').trim()).filter(Boolean)
    
    if (headers.length === 0) {
      throw new Error('No valid column headers found')
    }
    
    const data = jsonData.slice(1).map(row => {
      const rowObj: any = {}
      headers.forEach((header, index) => {
        const value = (row as any[])[index]
        // Handle various data types from Excel
        rowObj[header] = value !== null && value !== undefined ? String(value).trim() : ''
      })
      return rowObj
    }).filter(row => {
      // Filter out completely empty rows
      return Object.values(row).some(val => val && String(val).trim())
    })
    
    return { headers, data, sheetNames: workbook.SheetNames }
  }

  // Smart column mapping based on header names and data analysis
  const generateSmartColumnMapping = (headers: string[], sampleData: any[]): ColumnMapping[] => {
    const mappings: ColumnMapping[] = []
    
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim().replace(/[_\s]+/g, '')
      const sampleValues = sampleData.slice(0, 5).map(row => 
        Array.isArray(row) ? row[index] : row[header]
      ).filter(v => v && v.toString().trim()).slice(0, 3)
      
      let mappedTo = 'skip' // Default to skip unknown columns
      let confidence: 'high' | 'medium' | 'low' | 'manual' = 'low'
      
      // High confidence mappings (exact or very close matches)
      if (normalizedHeader === 'firstname' || normalizedHeader === 'givenname') {
        mappedTo = 'firstName'
        confidence = 'high'
      } else if (normalizedHeader === 'lastname' || normalizedHeader === 'surname' || normalizedHeader === 'familyname') {
        mappedTo = 'lastName'
        confidence = 'high'
      } else if (normalizedHeader === 'emailaddress' || normalizedHeader === 'email' || normalizedHeader === 'emailaddresses') {
        mappedTo = 'email'
        confidence = 'high'
      } else if (normalizedHeader === 'company' || normalizedHeader === 'companyname' || normalizedHeader === 'organization') {
        mappedTo = 'company'
        confidence = 'high'
      } else if (normalizedHeader === 'position' || normalizedHeader === 'jobtitle' || normalizedHeader === 'title') {
        mappedTo = 'position'
        confidence = 'high'
      } else if (normalizedHeader === 'phone' || normalizedHeader === 'phonenumber' || normalizedHeader === 'mobile') {
        mappedTo = 'phone'
        confidence = 'high'
      } else if (normalizedHeader === 'url' || normalizedHeader === 'linkedinurl' || normalizedHeader === 'profileurl') {
        mappedTo = 'linkedinUrl'
        confidence = 'high'
      } else if (normalizedHeader === 'fullname' || normalizedHeader === 'name') {
        mappedTo = 'fullName'
        confidence = 'high'
      } else if (normalizedHeader.includes('first') && normalizedHeader.includes('name')) {
        mappedTo = 'firstName'
        confidence = 'medium'
      } else if (normalizedHeader.includes('last') && normalizedHeader.includes('name')) {
        mappedTo = 'lastName'
        confidence = 'medium'
      } else if (normalizedHeader.includes('email')) {
        mappedTo = 'email'
        confidence = 'medium'
      } else if (normalizedHeader.includes('phone')) {
        mappedTo = 'phone'
        confidence = 'medium'
      } else if (normalizedHeader.includes('company') || normalizedHeader.includes('organization')) {
        mappedTo = 'company'
        confidence = 'medium'
      } else if (normalizedHeader.includes('position') || normalizedHeader.includes('title') || normalizedHeader.includes('job')) {
        mappedTo = 'position'
        confidence = 'medium'
      } else {
        // Analyze sample data to make suggestions
        const dataType = detectDataType(sampleValues.map(v => v.toString()))
        if (dataType !== 'unknown') {
          mappedTo = dataType
          confidence = 'low'
        } else {
          // Keep as custom field instead of skipping
          mappedTo = 'custom'
          confidence = 'low'
        }
      }
      
      mappings.push({
        originalColumn: header,
        mappedTo,
        confidence,
        sampleValues: sampleValues.map(v => v.toString())
      })
    })
    
    return mappings
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
      createFilePreviews(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      createFilePreviews(files)
    }
  }

  const createFilePreviews = async (files: File[]) => {
    setUploading(true)
    const newUploadedFiles = [...uploadedFiles, ...files]
    setUploadedFiles(newUploadedFiles)
    
    const previews: FilePreview[] = []
    
    for (const file of files) {
      try {
        let columns: string[] = []
        let sampleData: any[] = []
        
        // Check if it's an Excel file
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const excelData = await readExcelFile(file)
          columns = excelData.headers
          sampleData = excelData.data.slice(0, 10) // Get first 10 rows for preview
        } else {
          // Handle CSV files
          // Check CSV file size (limit to 25MB for CSV since it's text)
          if (file.size > 25 * 1024 * 1024) {
            throw new Error('CSV file too large. Please use files smaller than 25MB.')
          }
          
          let text = await file.text()
          
          // Check for LinkedIn CSV format with 3-line header
          const lines = text.split('\n')
          if (lines.length > 3 && 
              lines[0].toLowerCase().startsWith('notes:') &&
              lines[1].toLowerCase().includes('missing email') &&
              lines[2].trim() === '' &&
              lines[3].toLowerCase().includes('first name')) {
            console.log('Detected LinkedIn CSV format, skipping 3-line header')
            text = lines.slice(3).join('\n')
          }
          
          // Parse for preview (no transformations, keep original headers)
          const results = Papa.parse<any>(text, {
            header: true,
            skipEmptyLines: true,
            preview: 10, // Get 10 rows for preview
            encoding: 'UTF-8' // Handle different encodings
          })
          
          if (results.meta.fields && results.data.length > 0) {
            columns = results.meta.fields
            sampleData = results.data
          } else if (results.meta.fields && results.data.length === 0) {
            throw new Error('CSV file has headers but no data rows')
          } else {
            throw new Error('CSV file format is invalid or empty')
          }
        }
        
        if (columns.length > 0 && sampleData.length > 0) {
          const suggestedMappings = generateSmartColumnMapping(columns, sampleData)
          
          previews.push({
            file,
            columns,
            sampleData,
            suggestedMappings
          })
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        setFileErrors(prev => ({
          ...prev,
          [file.name]: error instanceof Error ? error.message : 'Failed to process file'
        }))
      }
    }
    
    setFilePreviews(prev => [...prev, ...previews])
    setShowColumnMapping(true)
    setUploading(false)
  }

  const processFiles = async (files: File[]) => {
    setUploading(true)
    const newUploadedFiles = [...uploadedFiles, ...files]
    setUploadedFiles(newUploadedFiles)
    
    const newResults = { ...parseResults }
    
    for (const file of files) {
      try {
        let text = await file.text()
        
        // Check for LinkedIn CSV format with 3-line header
        const lines = text.split('\n')
        if (lines.length > 3 && 
            lines[0].toLowerCase().startsWith('notes:') &&
            lines[1].toLowerCase().includes('missing email') &&
            lines[2].trim() === '' &&
            lines[3].toLowerCase().includes('first name')) {
          console.log('Detected LinkedIn CSV format, skipping 3-line header')
          text = lines.slice(3).join('\n')
        }
        
        // Parse with proper transformations based on mapping
        const results = Papa.parse<any>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header // Keep original headers for now
        })

        const contacts: Contact[] = []
        const errors: string[] = []

        results.data.forEach((row: any, index: number) => {
          // Handle LinkedIn connections without email addresses  
          const isLinkedInFile = file.name.toLowerCase().includes('connection') || file.name.toLowerCase().includes('linkedin')
          const hasName = (row.firstName && row.lastName) || row.fullName
          
          if (!row.email || !row.email.includes('@')) {
            if (isLinkedInFile && hasName) {
              // For LinkedIn files, create a placeholder email for contacts without public email
              const firstName = row.firstName || (row.fullName ? row.fullName.split(' ')[0] : 'Unknown')
              const lastName = row.lastName || (row.fullName ? row.fullName.split(' ').slice(1).join(' ') : 'Contact')
              row.email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@linkedin-connection.placeholder`.replace(/[^a-zA-Z0-9@.-]/g, '')
            } else {
              // Only report as error if it looks like it should have data
              if (row.firstName || row.lastName || row.company) {
                errors.push(`Row ${index + 2}: Missing email address for ${row.firstName || ''} ${row.lastName || ''}`.trim())
              }
              return
            }
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

    try {
      // Save contacts one by one (could be optimized with bulk endpoint later)
      for (const contact of parsedContacts) {
        try {
          const response = await api.post('/api/contacts', {
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

  const processFilesWithMapping = async () => {
    setUploading(true)
    const newResults = { ...parseResults }
    
    for (const preview of filePreviews) {
      try {
        let data: any[] = []
        
        // Check if it's an Excel file
        if (preview.file.name.endsWith('.xlsx') || preview.file.name.endsWith('.xls')) {
          const excelData = await readExcelFile(preview.file)
          data = excelData.data
        } else {
          // Handle CSV files
          let text = await preview.file.text()
          
          // Check for LinkedIn CSV format with 3-line header
          const lines = text.split('\n')
          if (lines.length > 3 && 
              lines[0].toLowerCase().startsWith('notes:') &&
              lines[1].toLowerCase().includes('missing email') &&
              lines[2].trim() === '' &&
              lines[3].toLowerCase().includes('first name')) {
            text = lines.slice(3).join('\n')
          }
          
          // Parse with original headers
          const results = Papa.parse<any>(text, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8'
          })
          
          data = results.data
        }
        
        const contacts: Contact[] = []
        const errors: string[] = []
        
        // Create mapping from original column to target field
        const columnMap: {[key: string]: string} = {}
        preview.suggestedMappings.forEach(mapping => {
          if (mapping.mappedTo !== 'skip') {
            columnMap[mapping.originalColumn] = mapping.mappedTo
          }
        })
        
        data.forEach((row: any, index: number) => {
          // Transform row using column mappings
          const transformedRow: any = {}
          Object.entries(row).forEach(([originalColumn, value]) => {
            const mappedField = columnMap[originalColumn]
            if (mappedField) {
              if (mappedField === 'custom') {
                // Keep as custom field with original column name
                if (!transformedRow.customFields) transformedRow.customFields = {}
                transformedRow.customFields[originalColumn] = value
              } else {
                transformedRow[mappedField] = value
              }
            }
          })
          
          // Handle LinkedIn connections without email addresses  
          const isLinkedInFile = preview.file.name.toLowerCase().includes('connection') || preview.file.name.toLowerCase().includes('linkedin')
          const hasName = (transformedRow.firstName && transformedRow.lastName) || transformedRow.fullName
          
          if (!transformedRow.email || !transformedRow.email.includes('@')) {
            if (isLinkedInFile && hasName) {
              // For LinkedIn files, create a placeholder email for contacts without public email
              const firstName = transformedRow.firstName || (transformedRow.fullName ? transformedRow.fullName.split(' ')[0] : 'Unknown')
              const lastName = transformedRow.lastName || (transformedRow.fullName ? transformedRow.fullName.split(' ').slice(1).join(' ') : 'Contact')
              transformedRow.email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@linkedin-connection.placeholder`.replace(/[^a-zA-Z0-9@.-]/g, '')
            } else {
              if (transformedRow.firstName || transformedRow.lastName || transformedRow.company) {
                errors.push(`Row ${index + 2}: Missing email address for ${transformedRow.firstName || ''} ${transformedRow.lastName || ''}`.trim())
              }
              return
            }
          }
          
          // Handle different name formats
          let firstName = ''
          let lastName = ''
          
          if (transformedRow.fullName) {
            const parsed = parseFullName(transformedRow.fullName)
            firstName = parsed.firstName
            lastName = parsed.lastName
          } else if (transformedRow.firstName || transformedRow.lastName) {
            firstName = transformedRow.firstName || ''
            lastName = transformedRow.lastName || ''
          } else {
            errors.push(`Row ${index + 2}: Missing name`)
            return
          }
          
          const contact: Contact = {
            firstName,
            lastName,
            email: normalizeEmail(transformedRow.email),
            company: transformedRow.company || '',
            position: transformedRow.position || '',
            phone: transformedRow.phone || '',
            tier: 'TIER_3',
            linkedinUrl: transformedRow.linkedinUrl || '',
            relationshipNotes: '',
            tags: [],
            customFields: transformedRow.customFields,
            sources: [{
              fileName: preview.file.name,
              uploadedAt: new Date(),
              originalData: row
            }]
          }
          
          contacts.push(contact)
        })
        
        newResults[preview.file.name] = { contacts, errors }
      } catch (error) {
        console.error(`Error processing file ${preview.file.name}:`, error)
        newResults[preview.file.name] = { contacts: [], errors: [`Failed to process file: ${error}`] }
      }
    }
    
    setParseResults(newResults)
    
    // Combine all contacts
    const allContacts = Object.values(newResults).flatMap(result => result.contacts)
    setParsedContacts(allContacts)
    
    // Find duplicates
    const duplicateGroups = findDuplicates(allContacts)
    setDuplicates(duplicateGroups)
    
    if (duplicateGroups.length > 0) {
      setShowDuplicates(true)
    }
    
    // Clear previews
    setFilePreviews([])
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      {/* Column Mapping Modal */}
      {showColumnMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Map Your Columns</h2>
              <p className="text-gray-600 mt-1">Review and adjust how your CSV columns should be mapped to contact fields</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              {/* Show file errors */}
              {Object.keys(fileErrors).length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">File Processing Errors:</h4>
                  {Object.entries(fileErrors).map(([fileName, error]) => (
                    <div key={fileName} className="text-sm text-red-700">
                      <strong>{fileName}:</strong> {error}
                    </div>
                  ))}
                </div>
              )}
              
              {filePreviews.map((preview, fileIndex) => (
                <div key={fileIndex} className="mb-8 last:mb-0">
                  <h3 className="font-semibold text-lg mb-4">{preview.file.name}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {preview.suggestedMappings.map((mapping, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-2">
                          <label className="text-sm font-medium text-gray-900">{mapping.originalColumn}</label>
                          <div className="text-xs text-gray-500 mt-1">
                            Sample: {mapping.sampleValues.slice(0, 2).join(', ')}
                            {mapping.sampleValues.length > 2 && '...'}
                          </div>
                        </div>
                        
                        <select
                          value={mapping.mappedTo}
                          onChange={(e) => {
                            const newPreviews = [...filePreviews]
                            newPreviews[fileIndex].suggestedMappings[index].mappedTo = e.target.value
                            newPreviews[fileIndex].suggestedMappings[index].confidence = 'manual'
                            setFilePreviews(newPreviews)
                          }}
                          className="w-full mt-2 p-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="skip">Skip this column</option>
                          <option value="firstName">First Name</option>
                          <option value="lastName">Last Name</option>
                          <option value="fullName">Full Name</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="company">Company</option>
                          <option value="position">Position/Title</option>
                          <option value="linkedinUrl">LinkedIn URL</option>
                          <option value="custom">Custom Field</option>
                        </select>
                        
                        <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
                          mapping.confidence === 'high' ? 'bg-green-100 text-green-800' :
                          mapping.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          mapping.confidence === 'manual' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {mapping.confidence === 'high' ? 'High confidence' :
                           mapping.confidence === 'medium' ? 'Medium confidence' :
                           mapping.confidence === 'manual' ? 'Manual mapping' :
                           'Low confidence'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => {
                  setShowColumnMapping(false)
                  setFilePreviews([])
                  setFileErrors({})
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowColumnMapping(false)
                  setFileErrors({})
                  // Process files with the mappings
                  processFilesWithMapping()
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Import with these mappings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-3 p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <svg style={{width: '20px', height: '20px'}} className="mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm md:text-base">Back to Dashboard</span>
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Import Contacts</h1>
        <p className="text-sm md:text-base text-gray-600">Bulk import from CSV/Excel files, LinkedIn exports, or connect to CRM systems</p>
      </div>

      {/* Upload Section */}
      <div className="space-y-6 lg:space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Drag & Drop */}
          <div className="space-y-6">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">File Upload</h2>
              <div
                className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-all ${
                  dragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="mx-auto h-12 w-12 md:h-16 md:w-16 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg style={{width: '24px', height: '24px'}} className="text-blue-600 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-medium text-gray-900">
                      {dragOver ? 'Drop your files here' : 'Drag & drop your contact files'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Supports CSV, Excel files up to 10MB
                    </p>
                  </div>
                  <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
                    >
                      {uploading ? 'Uploading...' : 'Choose Files'}
                    </button>
                    <div className="flex items-center justify-center">
                      <span className="text-sm text-gray-500">or drag and drop</span>
                    </div>
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
              <h3 className="font-medium text-gray-900 mb-3">Supported Formats</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>CSV files with headers (firstname, lastname, email, company, position)</span>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>LinkedIn export files</span>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                  <span>Excel spreadsheets (.xlsx, .xls)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Options */}
          <div className="space-y-6">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Quick Import</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowGoogleImport(true)}
                  className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left hover:border-blue-300 transition-colors active:bg-gray-100"
                >
                  <div className="h-10 w-10 bg-red-500 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <svg style={{width: '20px', height: '20px'}} className="text-white" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">Google Contacts</h3>
                    <p className="text-sm text-gray-500">Import your contacts from Google account</p>
                  </div>
                  <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex-shrink-0">Available</div>
                </button>
              </div>
            </div>

            {/* Sample File */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Need a template?</h3>
              <p className="text-sm text-blue-700 mb-3">
                Download our sample CSV file to see the required format
              </p>
              <button className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Download Sample CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Parse Results */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-4 py-4 md:px-6 border-b border-gray-200">
              <h2 className="text-base md:text-lg font-medium text-gray-900">Import Summary</h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-blue-600">{uploadedFiles.length}</div>
                  <div className="text-xs md:text-sm text-gray-600">Files Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-green-600">{parsedContacts.length}</div>
                  <div className="text-xs md:text-sm text-gray-600">Unique Contacts</div>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-yellow-600">{duplicates.length}</div>
                  <div className="text-xs md:text-sm text-gray-600">Duplicates Found</div>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-bold text-red-600">
                    {Object.values(parseResults).flatMap(r => r.errors).length}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">Errors Found</div>
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
              <div className="flex justify-center px-4">
                <button 
                  onClick={saveToDatabase}
                  disabled={saving}
                  className="w-full max-w-md px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 flex items-center justify-center text-base md:text-sm md:py-3 transition-colors"
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
            <div className="px-4 py-4 md:px-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">Import from Google Contacts</h2>
                  <p className="text-sm text-gray-600">Connect your Google account to import contacts</p>
                </div>
                <button
                  onClick={() => setShowGoogleImport(false)}
                  className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                >
                  <svg style={{width: '20px', height: '20px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <GoogleContactsImport onContactsImported={handleGoogleContactsImported} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportContactsPage