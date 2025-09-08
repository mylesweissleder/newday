import React from 'react';

interface AIScoringBadgeProps {
  priorityScore?: number;
  opportunityScore?: number;
  strategicValue?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

const AIScoringBadge: React.FC<AIScoringBadgeProps> = ({
  priorityScore,
  opportunityScore,
  strategicValue,
  size = 'md',
  showLabels = true,
  className = ''
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const badgeClass = `inline-flex items-center rounded-full border font-medium ${sizeClasses[size]}`;

  if (!priorityScore && !opportunityScore && !strategicValue) {
    return (
      <span className={`${badgeClass} bg-gray-100 text-gray-500 border-gray-200 ${className}`}>
        {showLabels ? 'Not scored' : '-'}
      </span>
    );
  }

  // If we have multiple scores, show priority as primary
  const primaryScore = priorityScore || opportunityScore || strategicValue || 0;
  const primaryLabel = priorityScore ? 'Priority' : opportunityScore ? 'Opportunity' : 'Strategic';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`${badgeClass} ${getScoreColor(primaryScore)}`}>
        {showLabels && `${primaryLabel}: `}{Math.round(primaryScore)}
      </span>
      
      {/* Show additional scores as smaller badges if available */}
      {size !== 'sm' && (
        <>
          {priorityScore && opportunityScore && opportunityScore !== primaryScore && (
            <span className={`${badgeClass} ${getScoreColor(opportunityScore)} opacity-75`} style={{ fontSize: '0.75em' }}>
              {showLabels && 'Opp: '}{Math.round(opportunityScore)}
            </span>
          )}
          {priorityScore && strategicValue && strategicValue !== primaryScore && (
            <span className={`${badgeClass} ${getScoreColor(strategicValue)} opacity-75`} style={{ fontSize: '0.75em' }}>
              {showLabels && 'Strategic: '}{Math.round(strategicValue)}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default AIScoringBadge;