import React, { useState } from 'react'
import DocumentsTab from '../components/DocumentsTab'

interface OnboardingStep {
  id: string
  title: string
  subtitle: string
  description: string
  icon: string
  completed: boolean
  active: boolean
}

interface OnboardingPageProps {
  onComplete?: () => void
  onBack?: () => void
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'linkedin',
      title: 'LinkedIn Data',
      subtitle: 'Download your network data',
      description: 'Export your LinkedIn connections, messages, and activity to build your crew network',
      icon: '💼',
      completed: false,
      active: true
    },
    {
      id: 'google',
      title: 'Google Data',
      subtitle: 'Export your communication history',
      description: 'Use Google Takeout to download contacts and Gmail data for comprehensive networking',
      icon: '📧',
      completed: false,
      active: false
    },
    {
      id: 'documents',
      title: 'Personal Documents',
      subtitle: 'Share your professional identity',
      description: 'Upload your resume, bio, and work samples for AI-powered connection insights',
      icon: '📄',
      completed: false,
      active: false
    },
    {
      id: 'query',
      title: 'Resource Discovery',
      subtitle: 'Query your crew\'s collective knowledge',
      description: 'Ask questions and discover resources from your crew\'s shared network and documents',
      icon: '🔍',
      completed: false,
      active: false
    }
  ])

  const handleStepComplete = (stepId: string) => {
    setSteps(prevSteps => {
      const newSteps = prevSteps.map(step => {
        if (step.id === stepId) {
          return { ...step, completed: true, active: false }
        }
        return step
      })
      
      // Activate next step
      const currentIndex = newSteps.findIndex(step => step.id === stepId)
      if (currentIndex < newSteps.length - 1) {
        newSteps[currentIndex + 1].active = true
        setCurrentStep(currentIndex + 1)
      }
      
      return newSteps
    })
  }

  const handleMessage = (msg: { type: 'success' | 'error'; text: string }) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 5000)
  }

  const goToStep = (index: number) => {
    setCurrentStep(index)
    setSteps(prevSteps => 
      prevSteps.map((step, i) => ({
        ...step,
        active: i === index
      }))
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-100 to-yellow-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ← Back
                </button>
              )}
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🤝</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Welcome to TrueCrew</h1>
                  <p className="text-gray-600">Let's maximize your network potential together</p>
                </div>
              </div>
            </div>
            
            {onComplete && (
              <button
                onClick={onComplete}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Skip Setup
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Breadcrumb Progress */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
                  index <= currentStep ? 'opacity-100' : 'opacity-50'
                }`}
                onClick={() => goToStep(index)}
              >
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold mb-2 transition-all duration-300
                  ${step.completed 
                    ? 'bg-green-500 text-white' 
                    : step.active 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {step.completed ? '✓' : index + 1}
                </div>
                <div className="text-center">
                  <div className={`text-sm font-medium ${
                    step.active ? 'text-orange-600' : step.completed ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 max-w-24">
                    {step.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Progress Line */}
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 -z-10">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-500"
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-orange-200 overflow-hidden">
          {/* Step 1: LinkedIn Data */}
          {currentStep === 0 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">💼</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Your LinkedIn Network</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Your LinkedIn network is the foundation of TrueCrew. Let's get your connections, messages, and activity data to build your crew's collective network.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                      <span className="mr-2">📋</span> Step-by-Step Instructions
                    </h3>
                    
                    <ol className="space-y-3 text-sm text-blue-800">
                      <li className="flex items-start">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">1</span>
                        <div>
                          <strong>Visit LinkedIn Settings:</strong>
                          <a href="https://www.linkedin.com/settings/privacy" target="_blank" rel="noopener noreferrer" 
                             className="ml-2 text-blue-600 underline hover:text-blue-800">
                            linkedin.com/settings/privacy
                          </a>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">2</span>
                        <span>Click "Get a copy of your data" → "Want something specific?"</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">3</span>
                        <div>
                          <strong>Select these data types:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>✓ Connections</li>
                            <li>✓ Messages</li>
                            <li>✓ Reactions</li>
                            <li>✓ Profile</li>
                          </ul>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">4</span>
                        <span>Request archive (you'll receive an email in 10-20 minutes)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">5</span>
                        <span>Download the ZIP file when ready</span>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-start">
                      <span className="text-yellow-600 text-lg mr-2">⚡</span>
                      <div>
                        <h4 className="font-medium text-yellow-800 mb-1">Pro Tip</h4>
                        <p className="text-sm text-yellow-700">
                          While waiting for your LinkedIn export, you can continue with Step 2 (Google data) or Step 3 (documents).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <div className="text-4xl mb-2">📁</div>
                    <h4 className="font-medium text-gray-900 mb-2">Upload LinkedIn Data</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Drop your LinkedIn export ZIP file here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".zip"
                      className="hidden"
                      id="linkedin-upload"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleMessage({ type: 'success', text: 'LinkedIn data uploaded successfully! Processing...' })
                          setTimeout(() => {
                            handleStepComplete('linkedin')
                          }, 1500)
                        }
                      }}
                    />
                    <label
                      htmlFor="linkedin-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                    >
                      <span className="mr-2">📤</span> Choose File
                    </label>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <span className="mr-2">🔒</span> Your Data is Secure
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Only accessible to your crew members</li>
                      <li>• Encrypted storage and transmission</li>
                      <li>• Never shared with third parties</li>
                      <li>• You can delete anytime</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Google Data */}
          {currentStep === 1 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">📧</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Your Google Data</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Google holds a wealth of your communication history and contacts. Let's capture this data to enhance your crew's networking power.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <h3 className="font-semibold text-red-900 mb-4 flex items-center">
                      <span className="mr-2">🥡</span> Google Takeout Instructions
                    </h3>
                    
                    <ol className="space-y-3 text-sm text-red-800">
                      <li className="flex items-start">
                        <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">1</span>
                        <div>
                          <strong>Visit Google Takeout:</strong>
                          <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" 
                             className="ml-2 text-red-600 underline hover:text-red-800">
                            takeout.google.com
                          </a>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">2</span>
                        <span>Click "Deselect all" then select only:</span>
                      </li>
                      <li className="ml-8">
                        <div>
                          <ul className="space-y-1">
                            <li>✓ <strong>Contacts</strong> - Your address book</li>
                            <li>✓ <strong>Mail</strong> - Gmail messages (optional, large file)</li>
                          </ul>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">3</span>
                        <span>Choose delivery method: "Send download link via email"</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">4</span>
                        <span>Export format: .zip, Size: 2GB (for Gmail, 50GB max)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">5</span>
                        <span>Create export and wait for email (can take several hours)</span>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start">
                      <span className="text-blue-600 text-lg mr-2">💡</span>
                      <div>
                        <h4 className="font-medium text-blue-800 mb-1">Smart Tip</h4>
                        <p className="text-sm text-blue-700">
                          Start with just Contacts if you want to get going quickly. Gmail export is huge and optional - your contacts are the most valuable for networking.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 hover:bg-red-50 transition-colors">
                    <div className="text-4xl mb-2">📮</div>
                    <h4 className="font-medium text-gray-900 mb-2">Upload Google Data</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Drop your Google Takeout ZIP file here
                    </p>
                    <input
                      type="file"
                      accept=".zip"
                      className="hidden"
                      id="google-upload"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleMessage({ type: 'success', text: 'Google data uploaded successfully! Processing...' })
                          setTimeout(() => {
                            handleStepComplete('google')
                          }, 1500)
                        }
                      }}
                    />
                    <label
                      htmlFor="google-upload"
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer transition-colors"
                    >
                      <span className="mr-2">📤</span> Choose File
                    </label>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">What we'll extract:</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Contact names, emails, phone numbers</li>
                        <li>• Company affiliations and job titles</li>
                        <li>• Communication frequency patterns</li>
                        <li>• Relationship strength indicators</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2">Alternative: Manual Contact Upload</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Don't want to use Takeout? Export contacts directly:
                      </p>
                      <a 
                        href="https://contacts.google.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        contacts.google.com → Export → CSV
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 2 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">📄</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Your Professional Documents</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Upload your resume, bio, and work samples so your crew can better understand your background and make smarter introductions.
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                <DocumentsTab onMessage={handleMessage} />
                
                <div className="mt-8 text-center">
                  <button
                    onClick={() => handleStepComplete('documents')}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    Continue to Resource Discovery →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Query Functionality */}
          {currentStep === 3 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Discover Resources & Connections</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Now you can query your crew's collective knowledge and network. Ask questions to find the right connections and resources.
                </p>
              </div>

              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-4 flex items-center">
                    <span className="mr-2">🧠</span> AI-Powered Resource Discovery
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-white/60 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Try asking questions like:</h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-sm text-blue-800 font-medium">Connection Discovery</p>
                          <p className="text-xs text-blue-600 mt-1">
                            "Who in my crew knows someone at Stripe?"<br/>
                            "Find connections in renewable energy"
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <p className="text-sm text-green-800 font-medium">Expertise Matching</p>
                          <p className="text-xs text-green-600 mt-1">
                            "Who has experience with Series A fundraising?"<br/>
                            "Find crew members with ML expertise"
                          </p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                          <p className="text-sm text-purple-800 font-medium">Resource Discovery</p>
                          <p className="text-xs text-purple-600 mt-1">
                            "What white papers mention climate tech?"<br/>
                            "Find resumes from product managers"
                          </p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                          <p className="text-sm text-orange-800 font-medium">Introduction Requests</p>
                          <p className="text-xs text-orange-600 mt-1">
                            "Help me get intro to head of design at Figma"<br/>
                            "Connect me with YC founders"
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <label htmlFor="query-input" className="block text-sm font-medium text-gray-700 mb-2">
                        Ask your crew's AI:
                      </label>
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          id="query-input"
                          placeholder="e.g., Who in my network works at early-stage startups in healthcare?"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                        />
                        <button
                          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-lg hover:from-orange-600 hover:to-purple-700 transition-colors font-medium"
                          onClick={() => {
                            handleMessage({ type: 'success', text: 'Great question! AI is analyzing your crew\'s collective network and documents...' })
                            setTimeout(() => {
                              handleStepComplete('query')
                            }, 2000)
                          }}
                        >
                          🔍 Search
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                    <div className="text-2xl mb-3">🎯</div>
                    <h4 className="font-medium text-gray-900 mb-2">Smart Matching</h4>
                    <p className="text-sm text-gray-600">
                      AI finds the best connections based on shared interests, companies, and expertise
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                    <div className="text-2xl mb-3">📊</div>
                    <h4 className="font-medium text-gray-900 mb-2">Relationship Insights</h4>
                    <p className="text-sm text-gray-600">
                      Understand connection strength and best paths for warm introductions
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                    <div className="text-2xl mb-3">💼</div>
                    <h4 className="font-medium text-gray-900 mb-2">Resource Library</h4>
                    <p className="text-sm text-gray-600">
                      Search across resumes, bios, and documents to find relevant expertise
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <button
                  onClick={() => {
                    if (onComplete) {
                      onComplete()
                    }
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors font-medium text-lg"
                >
                  🎉 Complete Setup & Start Networking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage