import React, { useState, useEffect } from 'react';
import { SparklesIcon, UserGroupIcon, TrendingUpIcon, StarIcon } from '@heroicons/react/24/outline';
import AIScoringBadge from './AIScoringBadge';
import OpportunityFlags from './OpportunityFlags';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  position?: string;
  email?: string;
  priorityScore?: number;
  opportunityScore?: number;
  strategicValue?: number;
  opportunityFlags?: string[];
  lastScoringUpdate?: string;
  networkAnalytics?: {
    totalConnections: number;
    influenceScore: number;
    betweennessCentrality: number;
  };
  _count?: {
    outreach: number;
    relationships: number;
    relatedTo: number;
  };
}

interface DashboardData {
  stats: {
    totalScored: number;
    averages: {
      priorityScore: number;
      opportunityScore: number;
      strategicValue: number;
    };
  };
  recommendations: {
    topPriority: Contact[];
    opportunities: Contact[];
    strategic: Contact[];
  };
}

interface AIDashboardProps {
  className?: string;
  onContactClick?: (contact: Contact) => void;
}

const AIDashboard: React.FC<AIDashboardProps> = ({
  className = '',
  onContactClick
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'priority' | 'opportunities' | 'strategic'>('priority');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai-scoring/dashboard', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
      setError(null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const triggerBatchScoring = async () => {
    try {
      const response = await fetch('/api/ai-scoring/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to trigger batch scoring');
      }

      // Refresh dashboard after starting batch scoring
      setTimeout(() => fetchDashboardData(), 2000);
    } catch (err) {
      console.error('Batch scoring error:', err);
    }
  };

  const ContactCard = ({ contact, showScore = 'priority' }: { contact: Contact; showScore?: 'priority' | 'opportunity' | 'strategic' }) => {
    const score = showScore === 'priority' ? contact.priorityScore :
                 showScore === 'opportunity' ? contact.opportunityScore :
                 contact.strategicValue;

    return (
      <div 
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onContactClick && onContactClick(contact)}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">
              {contact.firstName} {contact.lastName}
            </h3>
            {contact.company && (
              <p className="text-sm text-gray-600">{contact.company}</p>
            )}
            {contact.position && (
              <p className="text-sm text-gray-500">{contact.position}</p>
            )}
          </div>
          <AIScoringBadge
            priorityScore={showScore === 'priority' ? contact.priorityScore : undefined}
            opportunityScore={showScore === 'opportunity' ? contact.opportunityScore : undefined}
            strategicValue={showScore === 'strategic' ? contact.strategicValue : undefined}
            size="sm"
            showLabels={false}
          />
        </div>

        {contact.opportunityFlags && contact.opportunityFlags.length > 0 && (
          <div className="mb-3">
            <OpportunityFlags flags={contact.opportunityFlags} maxDisplay={2} />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {contact.networkAnalytics && (
              <span>{contact.networkAnalytics.totalConnections} connections</span>
            )}
            {contact._count && (
              <span>{contact._count.outreach} outreach</span>
            )}
          </div>
          {contact.lastScoringUpdate && (
            <span>Scored {new Date(contact.lastScoringUpdate).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading AI dashboard</div>
          <button
            onClick={fetchDashboardData}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-gray-500">No data available</div>
      </div>
    );
  }

  const tabs = [
    { key: 'priority', label: 'Top Priority', icon: StarIcon, contacts: data.recommendations.topPriority },
    { key: 'opportunities', label: 'Opportunities', icon: TrendingUpIcon, contacts: data.recommendations.opportunities },
    { key: 'strategic', label: 'Strategic', icon: UserGroupIcon, contacts: data.recommendations.strategic }
  ];

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <SparklesIcon className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Contact Insights</h2>
              <p className="text-sm text-gray-600">
                {data.stats.totalScored} contacts scored • 
                Avg Priority: {Math.round(data.stats.averages.priorityScore || 0)} • 
                Avg Opportunity: {Math.round(data.stats.averages.opportunityScore || 0)}
              </p>
            </div>
          </div>
          
          <button
            onClick={triggerBatchScoring}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors"
          >
            Refresh Scores
          </button>
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                {tab.contacts.length}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {tabs.find(tab => tab.key === activeTab)?.contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-lg mb-2">No {activeTab} contacts found</div>
              <div className="text-sm">
                {data.stats.totalScored === 0 ? 
                  'Click "Refresh Scores" to analyze your contacts' :
                  'Try adjusting your scoring criteria or import more contacts'
                }
              </div>
            </div>
          ) : (
            tabs.find(tab => tab.key === activeTab)?.contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                showScore={activeTab}
              />
            ))
          )}
        </div>

        {/* Show more link */}
        {tabs.find(tab => tab.key === activeTab)?.contacts.length === 5 && (
          <div className="text-center mt-6">
            <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">
              View all {activeTab} contacts →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDashboard;