import React, { useState, useEffect, useCallback } from 'react';
import NetworkGraph, { NetworkNode, NetworkEdge, NetworkStats } from '../components/NetworkGraph';
import NetworkAnalytics from '../components/NetworkAnalytics';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  position?: string;
  email?: string;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: NetworkStats;
  metadata: {
    generatedAt: string;
    filters: {
      includeInactive: boolean;
      minStrength: number;
      maxNodes: number;
      contactIds: number | null;
    };
  };
}

interface PathData {
  fromContact: Contact;
  toContact: Contact;
  paths: Array<{
    path: Contact[];
    pathLength: number;
    totalWeight: number;
    relationshipTypes: string[];
    strength: number;
  }>;
  pathsFound: number;
}

const NetworkVisualizationPage: React.FC = () => {
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [pathData, setPathData] = useState<PathData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Visualization controls
  const [layout, setLayout] = useState<'force' | 'hierarchical' | 'circular' | 'grid'>('force');
  const [showLabels, setShowLabels] = useState(true);
  const [highlightConnections, setHighlightConnections] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Filter controls
  const [filters, setFilters] = useState({
    includeInactive: false,
    minStrength: 0.2,
    maxNodes: 300,
    contactIds: ''
  });
  
  // View controls
  const [activeView, setActiveView] = useState<'network' | 'analytics' | 'paths'>('network');
  const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 600 });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com';

  // Fetch network data
  const fetchNetworkData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        includeInactive: filters.includeInactive.toString(),
        minStrength: filters.minStrength.toString(),
        maxNodes: filters.maxNodes.toString()
      });

      if (filters.contactIds.trim()) {
        params.append('contactIds', filters.contactIds.trim());
      }

      const response = await fetch(`${API_BASE_URL}/api/network/graph?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch network data: ${response.statusText}`);
      }

      const data = await response.json();
      setNetworkData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load network data';
      setError(errorMessage);
      console.error('Network data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch contacts for path analysis
  const fetchContacts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/contacts?limit=100&status=ACTIVE`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedContacts(data.contacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }, []);

  // Load network data on mount and filter changes
  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  // Load contacts for path analysis
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Handle responsive graph sizing
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('network-container');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const width = Math.max(800, containerRect.width - 40);
        const height = Math.max(600, window.innerHeight - 300);
        setGraphDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle node click
  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNodeId(node.id);
    console.log('Selected node:', node);
  };

  // Find path between two contacts
  const findPath = async (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/network/paths/${fromId}/${toId}?maxDegrees=4&minStrength=0.2`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        setPathData(data);
      }
    } catch (error) {
      console.error('Error finding path:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export network data
  const exportNetwork = async (format: 'json' | 'csv' | 'graphml') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/network/export?format=${format}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-export.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  if (loading && !networkData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading network visualization...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">⚠️ Error loading network</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={fetchNetworkData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Network Visualization</h1>
              <p className="text-gray-600">Interactive network map of your contacts and relationships</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Export Options */}
              <div className="relative">
                <select
                  onChange={(e) => e.target.value && exportNetwork(e.target.value as any)}
                  className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value=""
                >
                  <option value="">Export...</option>
                  <option value="json">Export as JSON</option>
                  <option value="csv">Export as CSV</option>
                  <option value="graphml">Export as GraphML</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchNetworkData}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['network', 'analytics', 'paths'].map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeView === view
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {view === 'paths' ? 'Connection Paths' : view}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeView === 'network' && networkData && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                  <select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="force">Force-Directed</option>
                    <option value="hierarchical">Hierarchical</option>
                    <option value="circular">Circular</option>
                    <option value="grid">Grid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Strength</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.minStrength}
                    onChange={(e) => setFilters(prev => ({ ...prev, minStrength: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">{filters.minStrength}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Nodes</label>
                  <select
                    value={filters.maxNodes}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxNodes: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={300}>300</option>
                    <option value={500}>500</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Show Labels</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={highlightConnections}
                      onChange={(e) => setHighlightConnections(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Highlight on Hover</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Network Graph */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div id="network-container" className="relative">
                <NetworkGraph
                  nodes={networkData.nodes}
                  edges={networkData.edges}
                  stats={networkData.stats}
                  width={graphDimensions.width}
                  height={graphDimensions.height}
                  onNodeClick={handleNodeClick}
                  selectedNodeId={selectedNodeId}
                  layout={layout}
                  showLabels={showLabels}
                  highlightConnections={highlightConnections}
                />
              </div>
            </div>

            {/* Network Statistics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{networkData.stats.totalNodes}</div>
                <div className="text-sm text-gray-600">Contacts</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{networkData.stats.totalEdges}</div>
                <div className="text-sm text-gray-600">Relationships</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{networkData.stats.averageConnections.toFixed(1)}</div>
                <div className="text-sm text-gray-600">Avg Connections</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{(networkData.stats.networkDensity * 100).toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Density</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{networkData.stats.verifiedRelationships}</div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'analytics' && networkData && (
          <NetworkAnalytics stats={networkData.stats} />
        )}

        {activeView === 'paths' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Path Analysis</h3>
              <p className="text-gray-600 mb-6">Find the shortest connection path between any two contacts in your network.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Contact</label>
                  <select
                    onChange={(e) => {
                      const toSelect = document.getElementById('to-contact') as HTMLSelectElement;
                      if (toSelect && toSelect.value) {
                        findPath(e.target.value, toSelect.value);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select a contact...</option>
                    {selectedContacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName} {contact.company && `(${contact.company})`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Contact</label>
                  <select
                    id="to-contact"
                    onChange={(e) => {
                      const fromSelect = document.querySelector('select') as HTMLSelectElement;
                      if (fromSelect && fromSelect.value) {
                        findPath(fromSelect.value, e.target.value);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select a contact...</option>
                    {selectedContacts.map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName} {contact.company && `(${contact.company})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {pathData && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Paths from {pathData.fromContact.firstName} {pathData.fromContact.lastName} to{' '}
                    {pathData.toContact.firstName} {pathData.toContact.lastName}
                  </h4>
                  
                  {pathData.pathsFound === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No connection path found between these contacts.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pathData.paths.map((path, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">Path {index + 1}</h5>
                            <div className="text-sm text-gray-600">
                              {path.pathLength} degrees • Strength: {(path.strength * 100).toFixed(0)}%
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {path.path.map((contact, contactIndex) => (
                              <React.Fragment key={contact.id}>
                                <div className="flex items-center bg-white rounded-md px-3 py-2 border">
                                  <div>
                                    <div className="font-medium text-sm">{contact.firstName} {contact.lastName}</div>
                                    {contact.company && (
                                      <div className="text-xs text-gray-500">{contact.company}</div>
                                    )}
                                  </div>
                                </div>
                                
                                {contactIndex < path.path.length - 1 && (
                                  <div className="flex flex-col items-center">
                                    <div className="text-xs text-gray-500 mb-1">
                                      {path.relationshipTypes[contactIndex]?.replace('_', ' ').toLowerCase()}
                                    </div>
                                    <div className="w-8 h-0.5 bg-gray-300"></div>
                                  </div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkVisualizationPage;