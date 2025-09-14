import React, { useState, useEffect } from 'react';

interface UserDocument {
  id: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  category: 'RESUME' | 'BIO' | 'WHITE_PAPER' | 'PORTFOLIO' | 'OTHER';
  description?: string;
  uploadedAt: string;
  url?: string;
  aiInsights?: string;
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERROR';
}

interface DocumentsTabProps {
  onMessage: (message: { type: 'success' | 'error'; text: string }) => void;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ onMessage }) => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'RESUME' | 'BIO' | 'WHITE_PAPER' | 'PORTFOLIO' | 'OTHER'>('RESUME');
  const [description, setDescription] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://network-crm-api.onrender.com';

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/documents`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    const allowedTypes = [
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      onMessage({ type: 'error', text: 'Please upload PDF, DOC, DOCX, TXT, or MD files only.' });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      onMessage({ type: 'error', text: 'File size must be less than 10MB.' });
      return;
    }

    setUploading(true);
    
    const formData = new FormData();
    formData.append('document', file);
    formData.append('category', selectedCategory);
    if (description) {
      formData.append('description', description);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/documents`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(prev => [data.document, ...prev]);
        setDescription('');
        onMessage({ type: 'success', text: 'Document uploaded successfully!' });
        
        // Reset file input
        event.target.value = '';
      } else {
        const errorData = await response.json();
        onMessage({ type: 'error', text: errorData.error || 'Failed to upload document' });
      }
    } catch (error) {
      onMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        onMessage({ type: 'success', text: 'Document deleted successfully!' });
      } else {
        const errorData = await response.json();
        onMessage({ type: 'error', text: errorData.error || 'Failed to delete document' });
      }
    } catch (error) {
      onMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'RESUME': return '📄';
      case 'BIO': return '👤';
      case 'WHITE_PAPER': return '📝';
      case 'PORTFOLIO': return '💼';
      default: return '📎';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'RESUME': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BIO': return 'bg-green-50 text-green-700 border-green-200';
      case 'WHITE_PAPER': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PORTFOLIO': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UPLOADING':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Uploading...</span>;
      case 'PROCESSING':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Processing...</span>;
      case 'READY':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Ready</span>;
      case 'ERROR':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Error</span>;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Documents & AI Insights</h3>
        <div className="text-sm text-gray-500">
          Upload documents to help AI connect dots in your network
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Upload New Document</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="RESUME">📄 Resume/CV</option>
              <option value="BIO">👤 Bio/About</option>
              <option value="WHITE_PAPER">📝 White Paper/Article</option>
              <option value="PORTFOLIO">💼 Portfolio/Work Sample</option>
              <option value="OTHER">📎 Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={handleFileUpload}
              disabled={uploading}
              className="sr-only"
            />
            <div className={`
              border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer
              hover:border-blue-400 hover:bg-blue-50 transition-colors
              ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}>
              {uploading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              ) : (
                <>
                  <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX, TXT, MD up to 10MB
                  </p>
                </>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900">Your Documents</h4>
        
        {documents.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-gray-400 text-4xl mb-2">📁</div>
            <p className="text-sm text-gray-600">No documents uploaded yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Upload your resume, bio, or other documents to help AI understand your background
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{getCategoryIcon(doc.category)}</span>
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">{doc.originalName}</h5>
                        <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)} • {doc.fileType}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getCategoryColor(doc.category)}`}>
                        {doc.category.replace('_', ' ')}
                      </span>
                      {getStatusBadge(doc.status)}
                    </div>
                    
                    {doc.description && (
                      <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                    )}
                    
                    {doc.aiInsights && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-2">
                        <div className="flex items-start space-x-2">
                          <span className="text-blue-500 text-sm">🤖</span>
                          <div>
                            <p className="text-xs font-medium text-blue-800 mb-1">AI Insights</p>
                            <p className="text-xs text-blue-700">{doc.aiInsights}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                        title="View document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                      title="Delete document"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Insights Summary */}
      {documents.some(doc => doc.aiInsights) && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-purple-900 mb-2 flex items-center">
            <span className="mr-2">🧠</span> AI-Powered Network Insights
          </h4>
          <p className="text-sm text-purple-800 mb-3">
            Based on your uploaded documents, here are some insights that can help with networking:
          </p>
          <div className="space-y-2">
            {documents
              .filter(doc => doc.aiInsights)
              .slice(0, 3)
              .map((doc) => (
                <div key={doc.id} className="bg-white bg-opacity-50 rounded-md p-2">
                  <p className="text-xs text-purple-700">
                    <span className="font-medium">{doc.category}:</span> {doc.aiInsights}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;