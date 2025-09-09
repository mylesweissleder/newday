import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface ScoringFactor {
  score: number;
  reasoning: string;
  [key: string]: any;
}

interface ScoringFactors {
  networkPosition: ScoringFactor;
  relationshipStrength: ScoringFactor;
  professionalRelevance: ScoringFactor;
  mutualConnections: ScoringFactor;
  engagementPatterns: ScoringFactor;
  opportunityIndicators: ScoringFactor & { flags: string[] };
}

interface AIScoringPanelProps {
  priorityScore?: number;
  opportunityScore?: number;
  strategicValue?: number;
  scoringFactors?: ScoringFactors;
  opportunityFlags?: string[];
  lastScoringUpdate?: string;
  className?: string;
  collapsible?: boolean;
}

const AIScoringPanel: React.FC<AIScoringPanelProps> = ({
  priorityScore,
  opportunityScore,
  strategicValue,
  scoringFactors,
  opportunityFlags,
  lastScoringUpdate,
  className = '',
  collapsible = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!priorityScore && !opportunityScore && !strategicValue) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-gray-500">
          <SparklesIcon className="w-5 h-5 mr-2" />
          <span className="text-sm">AI scoring not yet available</span>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const ScoreBar = ({ score, label }: { score: number; label: string }) => (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${getScoreColor(score)}`}>
          {Math.round(score)}/100
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(score)}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );

  const FactorDetail = ({ title, factor }: { title: string; factor: ScoringFactor }) => (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <span className={`font-bold ${getScoreColor(factor.score)}`}>
          {Math.round(factor.score)}/100
        </span>
      </div>
      <p className="text-sm text-gray-600">{factor.reasoning}</p>
      {title === 'Opportunity Indicators' && factor.flags && factor.flags.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1">
            {factor.flags.map((flag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
              >
                {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <SparklesIcon className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">AI Contact Scoring</h3>
          </div>
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Main Scores */}
        <div className="space-y-3 mb-4">
          {priorityScore !== undefined && (
            <ScoreBar score={priorityScore} label="Priority Score" />
          )}
          {opportunityScore !== undefined && (
            <ScoreBar score={opportunityScore} label="Opportunity Score" />
          )}
          {strategicValue !== undefined && (
            <ScoreBar score={strategicValue} label="Strategic Value" />
          )}
        </div>

        {/* Opportunity Flags */}
        {opportunityFlags && opportunityFlags.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Opportunity Indicators</h4>
            <div className="flex flex-wrap gap-2">
              {opportunityFlags.map((flag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
                >
                  ⭐ {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        {lastScoringUpdate && (
          <div className="text-xs text-gray-500 mb-4">
            Last updated: {new Date(lastScoringUpdate).toLocaleDateString()}
          </div>
        )}

        {/* Detailed Factors (Collapsible) */}
        {(isExpanded || !collapsible) && scoringFactors && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-900 mb-4">Scoring Breakdown</h4>
            <div className="space-y-2">
              <FactorDetail title="Network Position" factor={scoringFactors.networkPosition} />
              <FactorDetail title="Relationship Strength" factor={scoringFactors.relationshipStrength} />
              <FactorDetail title="Professional Relevance" factor={scoringFactors.professionalRelevance} />
              <FactorDetail title="Mutual Connections" factor={scoringFactors.mutualConnections} />
              <FactorDetail title="Engagement Patterns" factor={scoringFactors.engagementPatterns} />
              <FactorDetail title="Opportunity Indicators" factor={scoringFactors.opportunityIndicators} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIScoringPanel;