import React, { useState } from 'react'

interface GoogleContact {
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  position?: string
  source: string
}

interface GoogleContactsImportProps {
  onContactsImported: (contacts: GoogleContact[]) => void
}

const GoogleContactsImport: React.FC<GoogleContactsImportProps> = ({ onContactsImported }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // For demo purposes, we'll simulate the Google OAuth flow
  const authenticateWithGoogle = async () => {
    setLoading(true)
    setError('')

    try {
      // Simulate OAuth flow delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // In a real implementation, this would use the Google OAuth flow:
      // const auth = await gapi.auth2.getAuthInstance().signIn()
      
      setIsAuthenticated(true)
      
      // Demo message about OAuth implementation
      const shouldProceed = confirm(
        'This is a demo implementation. In production, this would:\n\n' +
        '1. Open Google OAuth consent screen\n' +
        '2. Request contacts.readonly permission\n' +
        '3. Fetch real Google Contacts data\n\n' +
        'Proceed with demo contacts?'
      )
      
      if (shouldProceed) {
        await importGoogleContacts()
      } else {
        setIsAuthenticated(false)
      }
      
    } catch (err) {
      setError('Authentication failed. Please try again.')
      console.error('Google auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  const importGoogleContacts = async () => {
    try {
      setLoading(true)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real implementation, this would be:
      // const response = await gapi.client.people.people.connections.list({
      //   resourceName: 'people/me',
      //   personFields: 'names,emailAddresses,phoneNumbers,organizations,photos'
      // })
      
      // Demo Google contacts data
      const demoGoogleContacts: GoogleContact[] = [
        {
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@gmail.com',
          phone: '+1-555-0123',
          company: 'Google',
          position: 'Product Manager',
          source: 'Google Contacts'
        },
        {
          firstName: 'Bob',
          lastName: 'Chen',
          email: 'bob.chen@gmail.com',
          phone: '+1-555-0124',
          company: 'Microsoft',
          position: 'Software Engineer',
          source: 'Google Contacts'
        },
        {
          firstName: 'Carol',
          lastName: 'Williams',
          email: 'carol.w@outlook.com',
          company: 'Apple',
          position: 'Design Lead',
          source: 'Google Contacts'
        },
        {
          firstName: 'David',
          lastName: 'Kim',
          email: 'david.kim@yahoo.com',
          phone: '+1-555-0126',
          company: 'Startup Inc',
          position: 'Founder',
          source: 'Google Contacts'
        },
        {
          firstName: 'Eva',
          lastName: 'Rodriguez',
          email: 'eva.rodriguez@company.com',
          company: 'Consulting Group',
          position: 'Senior Consultant',
          source: 'Google Contacts'
        }
      ]
      
      onContactsImported(demoGoogleContacts)
      
    } catch (err) {
      setError('Failed to import Google contacts. Please try again.')
      console.error('Google contacts import error:', err)
    } finally {
      setLoading(false)
    }
  }

  const disconnect = () => {
    setIsAuthenticated(false)
    setError('')
  }

  if (error) {
    return (
      <div className="border-2 border-dashed border-red-300 rounded-lg p-8 text-center bg-red-50">
        <div className="text-red-600 mb-4">
          <svg style={{width: '48px', height: '48px'}} className="mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-900 mb-2">Import Failed</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => setError('')}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
        <div className="text-blue-600 mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          {isAuthenticated ? 'Importing Contacts...' : 'Connecting to Google...'}
        </h3>
        <p className="text-blue-700">
          {isAuthenticated ? 'Fetching your Google contacts' : 'Please complete authentication in the popup window'}
        </p>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center bg-green-50">
        <div className="text-green-600 mb-4">
          <svg style={{width: '48px', height: '48px'}} className="mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-green-900 mb-2">Connected to Google</h3>
        <p className="text-green-700 mb-4">Ready to import your Google contacts</p>
        <div className="flex justify-center space-x-3">
          <button
            onClick={importGoogleContacts}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Import Contacts
          </button>
          <button
            onClick={disconnect}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
      <div className="text-gray-400 mb-4">
        <svg style={{width: '48px', height: '48px'}} className="mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Import from Google Contacts</h3>
      <p className="text-gray-600 mb-4">
        Connect your Google account to automatically import your contacts
      </p>
      <div className="text-sm text-gray-500 mb-6">
        <div className="flex items-center justify-center space-x-4 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span>Secure OAuth 2.0</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
            <span>Read-only access</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
            <span>Auto-deduplication</span>
          </div>
        </div>
      </div>
      <button
        onClick={authenticateWithGoogle}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center mx-auto"
      >
        <svg style={{width: '20px', height: '20px'}} className="mr-2" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Connect with Google
      </button>
      
      <div className="mt-6 text-xs text-gray-500">
        <p><strong>Note:</strong> This demo simulates the Google People API integration.</p>
        <p>Production implementation requires Google Cloud Console setup and OAuth credentials.</p>
      </div>
    </div>
  )
}

export default GoogleContactsImport