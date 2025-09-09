import React from 'react';
import { MessageCircle, Users, Building, MapPin, Target, Link } from 'lucide-react';

interface ChatExamplesProps {
  onExampleClick: (example: string) => void;
}

const ChatExamples: React.FC<ChatExamplesProps> = ({ onExampleClick }) => {
  const examples = [
    {
      category: "Find People",
      icon: <Users size={16} />,
      queries: [
        "Who in my network works at Google?",
        "Find me VCs in San Francisco",
        "Show me engineers in my network",
        "Who are my Tier 1 contacts?",
        "Find people in fintech",
      ]
    },
    {
      category: "Companies",
      icon: <Building size={16} />,
      queries: [
        "Show me all my Apple connections",
        "Who works at Y Combinator?",
        "Find startups in my network",
        "Show me Fortune 500 contacts",
      ]
    },
    {
      category: "Locations",
      icon: <MapPin size={16} />,
      queries: [
        "Who is based in New York?",
        "Find my London connections",
        "Show me people in Austin",
        "Who's in Silicon Valley?",
      ]
    },
    {
      category: "Introductions",
      icon: <Link size={16} />,
      queries: [
        "Who can introduce me to someone at Tesla?",
        "Find mutual connections with Microsoft",
        "Who knows people at Sequoia Capital?",
        "Help me get introduced to Netflix",
      ]
    },
    {
      category: "Opportunities",
      icon: <Target size={16} />,
      queries: [
        "What opportunities exist in my network?",
        "Find high-value networking opportunities",
        "Show me potential business connections",
        "Who should I reconnect with?",
      ]
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Try asking me...</h3>
        <p className="text-sm text-gray-600">Click any example to try it out!</p>
      </div>
      
      {examples.map((category, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            {category.icon}
            {category.category}
          </div>
          <div className="space-y-1">
            {category.queries.map((query, queryIndex) => (
              <button
                key={queryIndex}
                onClick={() => onExampleClick(query)}
                className="block w-full text-left p-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-200 transition-colors"
              >
                "{query}"
              </button>
            ))}
          </div>
        </div>
      ))}
      
      <div className="border-t pt-4 mt-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MessageCircle size={16} className="text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Pro tip:</p>
              <p className="text-xs text-blue-700">
                Be specific in your questions for better results. Mention companies, locations, 
                job titles, or relationship types you're interested in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatExamples;