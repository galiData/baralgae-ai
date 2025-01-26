import React from 'react';
import { Bot, AlertCircle } from 'lucide-react';
import TableFormatter from './TableFormatter';
import ExpandableSQLResults from './ExpandableSQLResults';
import MissingIntentHandler from './MissingIntentHandler';
import ChatHandler from './ChatHandler';

const IntentResponse = ({ message, intent, metadata, chatHistory = [] }) => {
  if (!message) return null;

  const handleFeedback = (feedback) => {
    console.log('Feedback received:', feedback);
  };

  const getLayoutClasses = () => {
    const baseClasses = {
      ql: 'pl-8 space-y-4',
      redshift: 'pl-8 bg-slate-50 p-4 rounded-lg',
      missing: 'pl-8 bg-yellow-50 text-yellow-800 p-4 rounded-lg',
      chat: 'pl-8 prose max-w-none',
      default: 'pl-8'
    };
    return baseClasses[intent] || baseClasses.default;
  };

  const formatSQLContent = (content) => {
    // Check if content contains a table (has | character and dashed separator line)
    const hasTable = content.includes('|') && /[-|]+/.test(content);
    
    if (hasTable) {
      return <TableFormatter content={content} />;
    }

    // Original numbered list formatting
    const sections = content.split(/(?:\d+\.\s+)/);
    const summary = sections[0];
    const points = sections.slice(1).filter(s => s.trim());

    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <p className="text-gray-800">{summary}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium text-gray-900 mb-3">Key Findings</h3>
          <div className="space-y-2">
            {points.map((point, index) => (
              <div key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <p className="text-gray-700">{point.trim()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (intent) {
      case 'ql':
        return (
          <>
            {formatSQLContent(message.content)}
            {message.sqlData && (
              <>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Generated Query:</h4>
                  <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                    {message.sqlData.query}
                  </pre>
                </div>
                <ExpandableSQLResults results={message.sqlData.result} />
              </>
            )}
          </>
        );

      case 'redshift':
        return (
          <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
            {message.content}
          </pre>
        );

      case 'missing':
        return (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Missing Information</p>
              <MissingIntentHandler
                message={message.content}
                metadata={metadata}
                chatHistory={chatHistory}
                onFeedback={handleFeedback}
              />
            </div>
          </div>
        );

        case 'chat':
           return <ChatHandler message={message.content || ''} chatHistory={chatHistory} />;

      default:
        return (
          <div className="text-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        );
    }
  };

  return (
    <div className="px-8 py-2 bg-white">
      <div className="flex items-center gap-3 mb-2">
        <Bot className="w-5 h-5" />
        <span className="font-medium">Baralgae Bot</span>
      </div>
      <div className={getLayoutClasses()}>
        {renderContent()}
      </div>
    </div>
  );
};

export default IntentResponse;