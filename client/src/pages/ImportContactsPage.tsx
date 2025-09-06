import React, { useState, useRef } from 'react'
import Papa from 'papaparse'

interface Contact {
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  phone?: string
  tier?: string
  sources?: Array<{
    fileName: string
    uploadedBy?: string
    uploadedAt: Date
    originalData: any
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

  // Intelligently merge duplicate contacts
  const mergeContacts = (contacts: Array<Contact & { sourceFile: string }>): Contact => {
    const merged: Contact = {
      firstName: '',
      lastName: '',
      email: contacts[0].email,
      sources: []
    }

    // Track all sources
    contacts.forEach(contact => {
      merged.sources!.push({
        fileName: contact.sourceFile,
        uploadedAt: new Date(),
        originalData: contact
      })
    })

    // Merge fields - prefer non-empty values
    contacts.forEach(contact => {
      if (!merged.firstName && contact.firstName) merged.firstName = contact.firstName
      if (!merged.lastName && contact.lastName) merged.lastName = contact.lastName
      if (!merged.company && contact.company) merged.company = contact.company
      if (!merged.position && contact.position) merged.position = contact.position
      if (!merged.phone && contact.phone) merged.phone = contact.phone
      // Use highest tier
      if (!merged.tier || (contact.tier && contact.tier < merged.tier)) {
        merged.tier = contact.tier
      }
    })

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
        const results = Papa.parse<any>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => {
            // Normalize common header variations
            const normalized = header.toLowerCase().trim().replace(/[_\s]+/g, '')
            
            // Name fields
            if (normalized === 'fullname' || normalized === 'name') return 'fullName'
            if (normalized.includes('first') && normalized.includes('name')) return 'firstName'
            if (normalized.includes('last') && normalized.includes('name')) return 'lastName'
            
            // Contact fields
            if (normalized.includes('email')) return 'email'
            if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('cell')) return 'phone'
            
            // Professional fields
            if (normalized.includes('company') || normalized === 'organization' || normalized === 'org') return 'company'
            if (normalized.includes('position') || normalized.includes('title') || normalized.includes('job') || normalized === 'role') return 'position'
            
            // LinkedIn specific
            if (normalized === 'linkedinurl' || normalized.includes('linkedin')) return 'linkedinUrl'
            
            // Tier/priority
            if (normalized.includes('tier') || normalized.includes('priority') || normalized.includes('level')) return 'tier'
            
            return header
          }
        })

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

          const contact: Contact = {
            firstName,
            lastName,
            email: normalizeEmail(row.email),
            company: row.company || row.organization || '',
            position: row.position || row.title || row.role || '',
            phone: row.phone || row.mobile || '',
            tier: row.tier || row.priority || 'TIER_3',
            sources: [{
              fileName: file.name,
              uploadedAt: new Date(),
              originalData: row
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Integrations</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">in</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">LinkedIn</h3>
                  <p className="text-sm text-gray-500">Import connections and contact details</p>
                </div>
                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Coming Soon</div>
              </button>

              <button className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">SF</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Salesforce</h3>
                  <p className="text-sm text-gray-500">Sync contacts from your CRM</p>
                </div>
                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Coming Soon</div>
              </button>

              <button className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <div className="h-10 w-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Google Contacts</h3>
                  <p className="text-sm text-gray-500">Import from Gmail and Google Workspace</p>
                </div>
                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Coming Soon</div>
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
            <div className="flex justify-center">
              <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                Save {parsedContacts.length} Contacts to Database
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ImportContactsPage