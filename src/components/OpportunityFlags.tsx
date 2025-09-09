import React from 'react';

interface OpportunityFlagsProps {
  flags: string[];
  className?: string;
  maxDisplay?: number;
  size?: 'sm' | 'md';
}

const OpportunityFlags: React.FC<OpportunityFlagsProps> = ({
  flags,
  className = '',
  maxDisplay = 3,
  size = 'sm'
}) => {
  if (!flags || flags.length === 0) {
    return null;
  }

  const getFlagConfig = (flag: string) => {
    const configs: Record<string, { label: string; color: string; icon: string }> = {
      recent_job_change: {
        label: 'Job Change',
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: '🚀'
      },
      role_expansion_potential: {
        label: 'Role Growth',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: '📈'
      },
      company_growth: {
        label: 'Company Growth',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: '🌱'
      },
      reconnection_opportunity: {
        label: 'Reconnect',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: '🔄'
      },
      high_network_value: {
        label: 'High Network Value',
        color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: '🌐'
      },
      warm_intro_available: {
        label: 'Warm Intro',
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: '🤝'
      }
    };

    return configs[flag] || {
      label: flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: '⭐'
    };
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-2'
  };

  const displayFlags = flags.slice(0, maxDisplay);
  const remainingCount = flags.length - maxDisplay;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {displayFlags.map((flag, index) => {
        const config = getFlagConfig(flag);
        return (
          <span
            key={index}
            className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${config.color}`}
            title={`Opportunity: ${config.label}`}
          >
            <span className="mr-1">{config.icon}</span>
            {config.label}
          </span>
        );
      })}
      
      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} bg-gray-100 text-gray-600 border-gray-200`}
          title={`${remainingCount} more opportunity${remainingCount > 1 ? 's' : ''}`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

export default OpportunityFlags;