import React, { useState, useEffect } from 'react'

interface NetworkAnalysisPageProps {
  onBack: () => void
}

const NetworkAnalysisPage: React.FC<NetworkAnalysisPageProps> = ({ onBack }) => {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  const runAnalysis = async () => {
    setAnalyzing(true)
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setAnalysis({
      networkSize: 247,
      keyInfluencers: [
        { name: 'Sarah Chen', company: 'TechVentures', connections: 34, influence: 92 },
        { name: 'Michael Rodriguez', company: 'Innovation Labs', connections: 28, influence: 87 },
        { name: 'Jennifer Kim', company: 'StartupXYZ', connections: 31, influence: 84 }
      ],
      connectionPaths: [
        { target: 'James Wilson (Meta)', path: 'You → Sarah Chen → James Wilson', strength: 'Strong' },
        { target: 'Lisa Zhang (Google)', path: 'You → Michael Rodriguez → David Park → Lisa Zhang', strength: 'Medium' },
        { target: 'Robert Johnson (Microsoft)', path: 'You → Jennifer Kim → Robert Johnson', strength: 'Strong' }
      ],
      insights: [
        'Your network is strongest in the tech industry with 67% of connections',
        'You have 12 potential warm introductions to target companies',
        'San Francisco Bay Area represents 43% of your network density',
        'Consider connecting with more finance and healthcare professionals'
      ],
      opportunities: [
        { company: 'OpenAI', contact: 'Alex Thompson', path: '2 degrees via Sarah Chen', likelihood: 85 },
        { company: 'Stripe', contact: 'Maya Patel', path: '1 degree via Michael Rodriguez', likelihood: 92 },
        { company: 'Airbnb', contact: 'Daniel Kim', path: '3 degrees via Jennifer Kim', likelihood: 73 }
      ]
    })
    
    setAnalyzing(false)
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
          <h1 className="text-2xl font-bold text-gray-900">AI Network Analysis</h1>
          <p className="text-gray-600">Discover hidden connections, identify influencers, and find warm introduction paths</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
        >
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {analyzing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-3"></div>
            <div>
              <h3 className="font-medium text-green-900">AI Analysis in Progress</h3>
              <p className="text-sm text-green-700 mt-1">GPT-4 is analyzing your network connections, identifying patterns, and discovering opportunities...</p>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Network Size</p>
                  <p className="text-3xl font-bold text-gray-900">{analysis.networkSize}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg style={{width: '24px', height: '24px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Key Influencers</p>
                  <p className="text-3xl font-bold text-purple-600">{analysis.keyInfluencers.length}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg style={{width: '24px', height: '24px'}} className="text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Warm Intros</p>
                  <p className="text-3xl font-bold text-green-600">{analysis.connectionPaths.length}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg style={{width: '24px', height: '24px'}} className="text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Opportunities</p>
                  <p className="text-3xl font-bold text-orange-600">{analysis.opportunities.length}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg style={{width: '24px', height: '24px'}} className="text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Key Influencers */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Key Influencers in Your Network</h2>
              <p className="text-sm text-gray-500 mt-1">People with the highest connection density and influence scores</p>
            </div>
            <div className="divide-y divide-gray-100">
              {analysis.keyInfluencers.map((influencer: any, index: number) => (
                <div key={index} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                      {influencer.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{influencer.name}</p>
                      <p className="text-sm text-gray-600">{influencer.company}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{influencer.connections} connections</p>
                        <p className="text-gray-600">Influence: {influencer.influence}%</p>
                      </div>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{width: `${influencer.influence}%`}}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Paths */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Warm Introduction Paths</h2>
              <p className="text-sm text-gray-500 mt-1">Shortest paths to reach high-value targets</p>
            </div>
            <div className="divide-y divide-gray-100">
              {analysis.connectionPaths.map((path: any, index: number) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-900">{path.target}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      path.strength === 'Strong' ? 'bg-green-100 text-green-700' : 
                      path.strength === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {path.strength} Connection
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{path.path}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">AI Insights</h2>
              <p className="text-sm text-gray-500 mt-1">GPT-4 analysis of your network patterns and recommendations</p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {analysis.insights.map((insight: string, index: number) => (
                  <div key={index} className="flex items-start">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p className="text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Business Opportunities */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Business Opportunities</h2>
              <p className="text-sm text-gray-500 mt-1">High-probability connections based on your network analysis</p>
            </div>
            <div className="divide-y divide-gray-100">
              {analysis.opportunities.map((opp: any, index: number) => (
                <div key={index} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-orange-600 font-bold text-sm">{opp.company[0]}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{opp.contact} at {opp.company}</p>
                      <p className="text-sm text-gray-600">{opp.path}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-2">Success likelihood:</span>
                      <div className="flex items-center">
                        <span className="font-bold text-green-600">{opp.likelihood}%</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2 ml-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{width: `${opp.likelihood}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!analysis && !analyzing && (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg style={{width: '48px', height: '48px'}} className="text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze Your Network</h3>
          <p className="text-gray-600 mb-6">Click "Run Analysis" to let GPT-4 discover hidden connections and opportunities in your network</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg style={{width: '24px', height: '24px'}} className="text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Find Connections</h4>
              <p className="text-sm text-gray-600">Discover paths to any contact</p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg style={{width: '24px', height: '24px'}} className="text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Identify Influencers</h4>
              <p className="text-sm text-gray-600">Find key people in your network</p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg style={{width: '24px', height: '24px'}} className="text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="font-medium text-gray-900">Spot Opportunities</h4>
              <p className="text-sm text-gray-600">Uncover business opportunities</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NetworkAnalysisPage