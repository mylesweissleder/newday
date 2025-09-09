import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader, MessageCircle, X, Minimize2, Maximize2, HelpCircle } from 'lucide-react';
import ChatExamples from './ChatExamples';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  contacts?: any[];
  insights?: any;
  suggestions?: string[];
  query_understood?: boolean;
}

interface NetworkChatbotProps {
  onContactSelect?: (contact: any) => void;
}

const NetworkChatbot: React.FC<NetworkChatbotProps> = ({ onContactSelect }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hello! I'm your AI network assistant. Ask me questions like:\n\n• \"Who in my network works at Google?\"\n• \"Find me VCs in San Francisco\"\n• \"Show me fintech connections\"\n• \"Who can introduce me to someone at Apple?\"",
      timestamp: new Date(),
      query_understood: true
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          question: userMessage.content
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.answer,
        timestamp: new Date(),
        contacts: data.contacts,
        insights: data.insights,
        suggestions: data.suggestions,
        query_understood: data.query_understood
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "I'm sorry, I encountered an error processing your request. Please try again or rephrase your question.",
        timestamp: new Date(),
        query_understood: false
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const ContactCard = ({ contact }: { contact: any }) => (
    <div 
      className="bg-gray-50 border rounded-lg p-3 mb-2 hover:bg-gray-100 cursor-pointer transition-colors"
      onClick={() => onContactSelect?.(contact)}
    >
      <div className="font-medium text-gray-900">
        {contact.firstName} {contact.lastName}
      </div>
      <div className="text-sm text-gray-600">
        {contact.position && `${contact.position} • `}
        {contact.company || 'No company'}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {contact.tier && (
          <span className={`inline-block px-2 py-1 rounded text-xs ${
            contact.tier === 'TIER_1' ? 'bg-green-100 text-green-800' :
            contact.tier === 'TIER_2' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {contact.tier.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  );

  const ChatWindow = () => (
    <div className={`bg-white rounded-lg shadow-lg border flex flex-col ${
      isMinimized ? 'h-12' : 'h-96'
    } w-80 transition-all duration-200`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} />
          <span className="font-medium">Network AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="hover:bg-blue-700 p-1 rounded"
            title="Show example questions"
          >
            <HelpCircle size={14} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-blue-700 p-1 rounded"
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-blue-700 p-1 rounded"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages or Examples */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {showExamples ? (
              <ChatExamples 
                onExampleClick={(example) => {
                  setInputValue(example);
                  setShowExamples(false);
                }} 
              />
            ) : (
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    message.type === 'user' ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    {message.type === 'user' ? (
                      <User size={12} className="text-white" />
                    ) : (
                      <Bot size={12} className="text-gray-600" />
                    )}
                  </div>
                  <div className={`rounded-lg p-2 ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    
                    {/* Show contacts if any */}
                    {message.contacts && message.contacts.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600 mb-2">
                          Found {message.contacts.length} contact{message.contacts.length > 1 ? 's' : ''}:
                        </div>
                        {message.contacts.slice(0, 3).map((contact: any) => (
                          <ContactCard key={contact.id} contact={contact} />
                        ))}
                        {message.contacts.length > 3 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            ... and {message.contacts.length - 3} more
                          </div>
                        )}
                      </div>
                    )}

                    {/* Show suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-600 mb-1">💡 Suggestions:</div>
                        <ul className="text-xs space-y-1">
                          {message.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-gray-600">• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <Bot size={12} className="text-gray-600" />
                  </div>
                  <div className="bg-gray-100 text-gray-800 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Loader size={14} className="animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your network..."
                className="flex-1 resize-none border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
          title="Ask AI about your network"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <ChatWindow />
        </div>
      )}
    </>
  );
};

export default NetworkChatbot;