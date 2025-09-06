import React, { useState, useEffect } from 'react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  position?: string
  tier: string
  relationshipNotes?: string
}

interface OutreachCampaign {
  id: string
  name: string
  contacts: Contact[]
  template: string
  subject: string
  status: 'draft' | 'sending' | 'sent' | 'paused'
  createdAt: string
  sentCount: number
  responseRate: number
}

interface GeneratedMessage {
  contactId: string
  subject: string
  message: string
  personalizations: string[]
}

interface SmartOutreachPageProps {
  onBack: () => void
}

const SmartOutreachPage: React.FC<SmartOutreachPageProps> = ({ onBack }) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([])
  const [activeTab, setActiveTab] = useState<'create' | 'campaigns'>('create')
  const [loading, setLoading] = useState(true)
  
  // Campaign creation state
  const [campaignName, setCampaignName] = useState('')
  const [outreachGoal, setOutreachGoal] = useState('')
  const [messageStyle, setMessageStyle] = useState<'professional' | 'casual' | 'warm'>('professional')
  const [generatingMessages, setGeneratingMessages] = useState(false)
  const [generatedMessages, setGeneratedMessages] = useState<GeneratedMessage[]>([])

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com'

  useEffect(() => {
    loadContacts()
    loadCampaigns()
  }, [])

  const loadContacts = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      
      if (token === 'demo-token') {
        // Demo contacts
        const demoContacts = [
          {
            id: '1',
            firstName: 'Sarah',
            lastName: 'Chen',
            email: 'sarah.chen@techventures.com',
            company: 'TechVentures',
            position: 'CEO',
            tier: 'TIER_1',
            relationshipNotes: 'Met at tech conference, interested in AI partnerships'
          },
          {
            id: '2',
            firstName: 'Michael',
            lastName: 'Rodriguez',
            email: 'michael@innovationlabs.com',
            company: 'Innovation Labs',
            position: 'CTO',
            tier: 'TIER_1',
            relationshipNotes: 'Former colleague, works on machine learning projects'
          },
          {
            id: '3',
            firstName: 'Jennifer',
            lastName: 'Kim',
            email: 'jen.kim@startupxyz.com',
            company: 'StartupXYZ',
            position: 'Founder',
            tier: 'TIER_2',
            relationshipNotes: 'Connected through mutual friend, building fintech startup'
          },
          {
            id: '4',
            firstName: 'David',
            lastName: 'Park',
            email: 'david@consulting.com',
            company: 'Park Consulting',
            position: 'Principal',
            tier: 'TIER_2'
          }
        ]
        setContacts(demoContacts)
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/contacts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Failed to load contacts:', error)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  const loadCampaigns = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      
      if (token === 'demo-token') {
        // Demo campaigns
        const demoCampaigns = [
          {
            id: '1',
            name: 'Q1 Partnership Outreach',
            contacts: [],
            template: '',
            subject: 'Partnership Opportunity',
            status: 'sent' as const,
            createdAt: '2024-03-01T10:00:00Z',
            sentCount: 15,
            responseRate: 26.7
          },
          {
            id: '2',
            name: 'Product Launch Announcement',
            contacts: [],
            template: '',
            subject: 'Exciting Product Update',
            status: 'draft' as const,
            createdAt: '2024-03-10T14:30:00Z',
            sentCount: 0,
            responseRate: 0
          }
        ]
        setCampaigns(demoCampaigns)
        return
      }

      // In real implementation, fetch from backend
    } catch (error) {
      console.error('Failed to load campaigns:', error)
    }
  }

  const generateAIMessages = async () => {
    if (selectedContacts.length === 0 || !outreachGoal.trim()) return

    setGeneratingMessages(true)
    
    try {
      const token = localStorage.getItem('auth-token')
      
      if (token === 'demo-token') {
        // Demo fallback with rule-based generation
        await new Promise(resolve => setTimeout(resolve, 2000))
        const messages: GeneratedMessage[] = selectedContacts.map(contact => {
          const personalizations = []
          if (contact.company) personalizations.push(`Works at ${contact.company}`)
          if (contact.position) personalizations.push(`${contact.position}`)
          if (contact.relationshipNotes) personalizations.push('Referenced relationship context')
          
          return {
            contactId: contact.id,
            subject: generateSubject(contact, outreachGoal),
            message: generateMessageForContact(contact, outreachGoal, messageStyle),
            personalizations
          }
        })
        setGeneratedMessages(messages)
        return
      }

      // Real OpenAI API integration
      const response = await fetch(`${API_BASE_URL}/api/ai/generate-outreach`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contacts: selectedContacts.map(contact => ({
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            company: contact.company,
            position: contact.position,
            relationshipNotes: contact.relationshipNotes,
            tier: contact.tier
          })),
          goal: outreachGoal,
          style: messageStyle,
          campaignName: campaignName
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate messages')
      }

      const data = await response.json()
      
      // Transform API response to our GeneratedMessage format
      const messages: GeneratedMessage[] = data.messages.map((msg: any) => ({
        contactId: msg.contactId,
        subject: msg.subject,
        message: msg.message,
        personalizations: msg.personalizations || []
      }))
      
      setGeneratedMessages(messages)
      
    } catch (error) {
      console.error('Failed to generate messages:', error)
      
      // Fallback to rule-based generation on API failure
      const fallbackMessages: GeneratedMessage[] = selectedContacts.map(contact => {
        const personalizations = []
        if (contact.company) personalizations.push(`Works at ${contact.company}`)
        if (contact.position) personalizations.push(`${contact.position}`)
        if (contact.relationshipNotes) personalizations.push('Used relationship context')
        
        return {
          contactId: contact.id,
          subject: generateSubject(contact, outreachGoal),
          message: generateMessageForContact(contact, outreachGoal, messageStyle),
          personalizations
        }
      })
      setGeneratedMessages(fallbackMessages)
      
    } finally {
      setGeneratingMessages(false)
    }
  }

  const generateMessageForContact = (contact: Contact, goal: string, style: string): string => {
    const greeting = style === 'casual' ? 'Hi' : style === 'warm' ? 'Hello' : 'Dear'
    const opener = contact.relationshipNotes ? 
      `I hope you're doing well. ${contact.relationshipNotes.includes('conference') ? 'It was great meeting you at the conference.' : 'I have been thinking about our previous conversation.'}` :
      `I hope this email finds you well.`
    
    const body = goal.toLowerCase().includes('partnership') ?
      `I am reaching out because I believe there could be a valuable partnership opportunity between our companies. Given your work at ${contact.company || 'your company'}${contact.position ? ` as ${contact.position}` : ''}, I think you would be interested in exploring how we might collaborate.` :
      `I wanted to share something that might be of interest to you given your role${contact.company ? ` at ${contact.company}` : ''}. ${goal}`
    
    const closing = style === 'casual' ? 
      `Would love to chat more about this. Are you free for a quick call next week?` :
      `I would welcome the opportunity to discuss this further. Would you have 15 minutes for a brief call in the coming days?`
    
    const signature = style === 'casual' ? 'Best,' : 'Best regards,'
    
    return `${greeting} ${contact.firstName},\n\n${opener}\n\n${body}\n\n${closing}\n\n${signature}\n[Your Name]`
  }

  const generateSubject = (contact: Contact, goal: string): string => {
    if (goal.toLowerCase().includes('partnership')) {
      return `Partnership opportunity with ${contact.company || contact.firstName}`
    }
    if (goal.toLowerCase().includes('product')) {
      return `Exciting update that might interest you`
    }
    return `Quick question for you, ${contact.firstName}`
  }

  const toggleContactSelection = (contact: Contact) => {
    setSelectedContacts(prev => 
      prev.find(c => c.id === contact.id)
        ? prev.filter(c => c.id !== contact.id)
        : [...prev, contact]
    )
  }

  const selectContactsByTier = (tier: string) => {
    const tierContacts = contacts.filter(c => c.tier === tier)
    setSelectedContacts(prev => {
      const existing = prev.filter(c => c.tier !== tier)
      return [...existing, ...tierContacts]
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-900">Smart Outreach</h1>
          <p className="text-gray-600">AI-powered personalized messaging campaigns</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            <span className="font-medium text-green-600">25%</span> avg response rate
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Campaign
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'campaigns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Campaigns ({campaigns.length})
          </button>
        </nav>
      </div>

      {/* Create Campaign Tab */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Contact Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Setup */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Campaign Setup</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Q2 Partnership Outreach"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Outreach Goal
                  </label>
                  <textarea
                    value={outreachGoal}
                    onChange={(e) => setOutreachGoal(e.target.value)}
                    rows={3}
                    placeholder="Describe what you want to achieve with this outreach..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Style
                  </label>
                  <div className="flex space-x-4">
                    {['professional', 'casual', 'warm'].map((style) => (
                      <label key={style} className="flex items-center">
                        <input
                          type="radio"
                          value={style}
                          checked={messageStyle === style}
                          onChange={(e) => setMessageStyle(e.target.value as any)}
                          className="mr-2"
                        />
                        <span className="capitalize">{style}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Selection */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Select Contacts ({selectedContacts.length} selected)
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => selectContactsByTier('TIER_1')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full hover:bg-green-200"
                    >
                      + Tier 1
                    </button>
                    <button
                      onClick={() => selectContactsByTier('TIER_2')}
                      className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full hover:bg-yellow-200"
                    >
                      + Tier 2
                    </button>
                  </div>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`px-6 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      selectedContacts.find(c => c.id === contact.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleContactSelection(contact)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedContacts.find(c => c.id === contact.id) !== undefined}
                          onChange={() => {}} // Handled by div click
                          className="mr-3"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              contact.tier === 'TIER_1' ? 'bg-green-100 text-green-700' :
                              contact.tier === 'TIER_2' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {contact.tier === 'TIER_1' ? '⭐ Tier 1' :
                               contact.tier === 'TIER_2' ? '🔸 Tier 2' : '◯ Tier 3'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {contact.position && contact.company && `${contact.position} at ${contact.company}`}
                            {contact.position && !contact.company && contact.position}
                            {!contact.position && contact.company && contact.company}
                            {!contact.position && !contact.company && contact.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Preview & Actions */}
          <div className="space-y-6">
            {/* Generate Messages */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">AI Message Generation</h3>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <svg style={{width: '24px', height: '24px'}} className="text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Ready to Generate</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    AI will create personalized messages for {selectedContacts.length} contacts
                  </p>
                  <button
                    onClick={generateAIMessages}
                    disabled={selectedContacts.length === 0 || !outreachGoal.trim() || generatingMessages}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                  >
                    {generatingMessages ? 'Generating...' : 'Generate Messages'}
                  </button>
                </div>
              </div>
            </div>

            {/* Campaign Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Expected Results</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Messages to send:</span>
                  <span className="font-medium">{selectedContacts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected responses:</span>
                  <span className="font-medium text-green-600">
                    {Math.round(selectedContacts.length * 0.25)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. completion:</span>
                  <span className="font-medium">2-3 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Messages Preview */}
      {generatedMessages.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Generated Messages Preview</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {generatedMessages.slice(0, 3).map((msg, index) => {
              const contact = selectedContacts.find(c => c.id === msg.contactId)
              return (
                <div key={index} className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      To: {contact?.firstName} {contact?.lastName}
                    </span>
                    <div className="flex items-center text-xs text-gray-500">
                      {msg.personalizations.map((p, i) => (
                        <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full mr-1">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium text-gray-700 mb-1">Subject: {msg.subject}</div>
                    <div className="text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded text-xs">
                      {msg.message.substring(0, 200)}...
                    </div>
                  </div>
                </div>
              )
            })}
            {generatedMessages.length > 3 && (
              <div className="px-6 py-4 text-center text-sm text-gray-500">
                And {generatedMessages.length - 3} more messages...
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Save as Draft
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Send Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {campaign.sentCount} sent
                    </div>
                    <div className="text-sm text-green-600">
                      {campaign.responseRate}% response rate
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    campaign.status === 'sent' ? 'bg-green-100 text-green-700' :
                    campaign.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                    campaign.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {campaigns.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="mx-auto h-12 w-12 text-gray-300 mb-4 flex items-center justify-center">
                <svg style={{width: '32px', height: '32px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p>No campaigns yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first outreach campaign to get started</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SmartOutreachPage