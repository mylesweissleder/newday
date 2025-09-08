import React from 'react';
import { NetworkStats } from './NetworkGraph';

interface NetworkAnalyticsProps {
  stats: NetworkStats;
  className?: string;
}

const NetworkAnalytics: React.FC<NetworkAnalyticsProps> = ({ stats, className = '' }) => {
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Analytics</h3>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{formatNumber(stats.totalNodes)}</div>
          <div className="text-sm text-blue-700">Total Contacts</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{formatNumber(stats.totalEdges)}</div>
          <div className="text-sm text-green-700">Relationships</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.averageConnections.toFixed(1)}</div>
          <div className="text-sm text-purple-700">Avg Connections</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">{formatPercentage(stats.networkDensity)}</div>
          <div className="text-sm text-orange-700">Network Density</div>
        </div>
      </div>

      {/* Relationship Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Relationship Quality</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Verified Relationships</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(stats.verifiedRelationships / stats.totalEdges) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stats.verifiedRelationships}/{stats.totalEdges}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Mutual Relationships</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${(stats.mutualRelationships / stats.totalEdges) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {stats.mutualRelationships}/{stats.totalEdges}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Tiers */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Contact Distribution</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Tier 1 (VIP)</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.tierDistribution.tier1}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Tier 2 (Important)</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.tierDistribution.tier2}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Tier 3 (Regular)</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.tierDistribution.tier3}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Untiered</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats.tierDistribution.untiered}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Influencers and Connected */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Top Influencers</h4>
          <div className="space-y-2">
            {stats.topInfluencers.map((influencer, index) => (
              <div key={influencer.id} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs font-medium text-purple-600">{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{influencer.name}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {formatPercentage(influencer.influenceScore)}
                </div>
              </div>
            ))}
            {stats.topInfluencers.length === 0 && (
              <div className="text-sm text-gray-500 py-4">No influence data available</div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Most Connected</h4>
          <div className="space-y-2">
            {stats.mostConnected.map((contact, index) => (
              <div key={contact.id} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs font-medium text-green-600">{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {formatNumber(contact.totalConnections)} connections
                </div>
              </div>
            ))}
            {stats.mostConnected.length === 0 && (
              <div className="text-sm text-gray-500 py-4">No connection data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Network Health Indicators */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-md font-medium text-gray-900 mb-3">Network Health</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              stats.networkDensity > 0.1 ? 'text-green-600' :
              stats.networkDensity > 0.05 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {stats.networkDensity > 0.1 ? 'Strong' :
               stats.networkDensity > 0.05 ? 'Moderate' : 'Sparse'}
            </div>
            <div className="text-sm text-gray-600">Connectivity</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${
              (stats.verifiedRelationships / stats.totalEdges) > 0.7 ? 'text-green-600' :
              (stats.verifiedRelationships / stats.totalEdges) > 0.5 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {(stats.verifiedRelationships / stats.totalEdges) > 0.7 ? 'High' :
               (stats.verifiedRelationships / stats.totalEdges) > 0.5 ? 'Medium' : 'Low'}
            </div>
            <div className="text-sm text-gray-600">Reliability</div>
          </div>

          <div className="text-center">
            <div className={`text-2xl font-bold ${
              stats.averageConnections > 5 ? 'text-green-600' :
              stats.averageConnections > 2 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {stats.averageConnections > 5 ? 'Active' :
               stats.averageConnections > 2 ? 'Growing' : 'Limited'}
            </div>
            <div className="text-sm text-gray-600">Engagement</div>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium text-blue-900 mb-2">💡 Quick Insights</h5>
        <div className="text-sm text-blue-800 space-y-1">
          {stats.networkDensity < 0.05 && (
            <div>• Your network is quite sparse - consider strengthening existing connections</div>
          )}
          {(stats.verifiedRelationships / stats.totalEdges) < 0.5 && (
            <div>• Many relationships are unverified - reach out to confirm connections</div>
          )}
          {stats.tierDistribution.untiered > stats.totalNodes * 0.5 && (
            <div>• {stats.tierDistribution.untiered} contacts need tier classification</div>
          )}
          {stats.mutualRelationships < stats.totalEdges * 0.3 && (
            <div>• Focus on building mutual relationships for stronger network foundation</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkAnalytics;