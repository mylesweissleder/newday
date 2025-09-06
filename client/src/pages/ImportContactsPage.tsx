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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
            const normalized = header.toLowerCase().trim()
            if (normalized.includes('first') && normalized.includes('name')) return 'firstName'
            if (normalized.includes('last') && normalized.includes('name')) return 'lastName'
            if (normalized.includes('email')) return 'email'
            if (normalized.includes('company')) return 'company'
            if (normalized.includes('position') || normalized.includes('title') || normalized.includes('job')) return 'position'
            if (normalized.includes('phone')) return 'phone'
            if (normalized.includes('tier')) return 'tier'
            return header
          }
        })

        const contacts: Contact[] = []
        const errors: string[] = []

        results.data.forEach((row: any, index: number) => {
          // Basic validation
          if (!row.email || !row.email.includes('@')) {
            errors.push(`Row ${index + 1}: Invalid or missing email address`)
            return
          }

          if (!row.firstName && !row.lastName) {
            errors.push(`Row ${index + 1}: Missing both first and last name`)
            return
          }

          const contact: Contact = {
            firstName: row.firstName || '',
            lastName: row.lastName || '',
            email: row.email.toLowerCase().trim(),
            company: row.company || '',
            position: row.position || '',
            phone: row.phone || '',
            tier: row.tier || 'TIER_3'
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
    
    // Update total parsed contacts
    const allContacts = Object.values(newResults).flatMap(result => result.contacts)
    setParsedContacts(allContacts)
    
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{uploadedFiles.length}</div>
                  <div className="text-sm text-gray-600">Files Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{parsedContacts.length}</div>
                  <div className="text-sm text-gray-600">Contacts Parsed</div>
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