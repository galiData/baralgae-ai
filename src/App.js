import React, { useState, useEffect, useRef, useCallback } from 'react';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Send, Bot, User, Timer } from 'lucide-react';
import ClaudeService from './components/ClaudeSQLagent';
import QueryInsights from './components/QueryInsights';

const App = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm the Baralgae assistant. How can I help you today?" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const [selectedSource, setSelectedSource] = useState('data-warehouse');
  
  const messagesEndRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const claudeService = useRef(new ClaudeService()).current;

  // Initialize S3 Client
  const s3Client = useRef(
    new S3Client({
      region: process.env.REACT_APP_AWS_REGION,
      credentials: {
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
      },
    })
  ).current;

  // Start loading timer
  useEffect(() => {
    if (isLoading) {
      loadingTimerRef.current = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(loadingTimerRef.current);
      setLoadingTime(0);
    }
    return () => clearInterval(loadingTimerRef.current);
  }, [isLoading]);

  // Function to fetch metadata from S3
  const fetchMetadata = useCallback(async () => {
    let isMounted = true;
    setIsLoading(true);
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.REACT_APP_S3_BUCKET,
        Key: process.env.REACT_APP_S3_KEY,
      });

      const response = await s3Client.send(command);
      const str = await response.Body.transformToString();
      const data = JSON.parse(str);
      
      if (isMounted) {
        setMetadata(data);
        console.log('Metadata loaded successfully');
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      if (isMounted) {
        setMetadata({ error: 'Failed to fetch metadata' });
        setError('Failed to load metadata. Please try again.');
      }
    } finally {
      if (isMounted) setIsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [s3Client]);

  // Load metadata when component mounts
  useEffect(() => {
    const cleanup = fetchMetadata();
    return () => cleanup;
  }, [fetchMetadata]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  // Function to format loading time
  const formatLoadingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to format SQL results for display
  const formatSqlResults = (results) => {
    if (!results || !Array.isArray(results.records) || !Array.isArray(results.columnMetadata)) {
      return null;
    }
  
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {results.columnMetadata.map((column, i) => (
                <th 
                  key={i} 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.name || column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.records.map((record, rowIndex) => (
              <tr key={rowIndex}>
                {record.map((value, cellIndex) => (
                  <td 
                    key={cellIndex} 
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {value !== null ? String(value) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);
    setStreamingResponse('');

    try {
      const response = await claudeService.generateAndExecuteQuery(
        userMessage,
        metadata
      );
      
      // Format the response object into a displayable string
      const formattedResponse = `Generated SQL Query:\n${response.query}\n\nInsights:\n${response.insights}`;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: formattedResponse,
        sqlData: response // Store the full response object
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setStreamingResponse('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-green-600 shadow-lg">
        <div className="w-full px-8 py-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bot className="w-8 h-8" />
            Baralgae Chatbot
          </h1>
          {isLoading && (
            <div className="flex items-center gap-2 text-white mt-2">
              <Timer className="w-4 h-4 animate-spin" />
              <span>Thinking... ({formatLoadingTime(loadingTime)})</span>
            </div>
          )}
        </div>
      </div>

      {/* Main chat container */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Messages container */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`px-8 py-2 ${message.role === 'user' ? 'bg-green-50' : 'bg-white'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {message.role === 'assistant' ? (
                    <Bot className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {message.role === 'assistant' ? 'Baralgae Bot' : 'You'}
                  </span>
                </div>
                <div className="pl-8">
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                  {message.sqlData && (
                    <div className="mt-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-2">Query Results</h3>
                        {formatSqlResults(message.sqlData.result)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Streaming response */}
            {streamingResponse && (
              <div className="px-8 py-2 bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <Bot className="w-5 h-5" />
                  <span className="font-medium">Baralgae Bot</span>
                </div>
                <div className="pl-8">
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                    {streamingResponse}
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="px-8 py-2 bg-red-50 text-red-600">
                {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <div className="border-t border-gray-200 bg-white px-8 py-4">
            <form onSubmit={sendMessage} className="flex gap-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-6 py-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 shadow-sm text-base"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="px-6 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                <Send className="w-6 h-6" />
              </button>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-green-500 shadow-sm text-base"
                disabled={isLoading}
              >
                <option value="data-warehouse">👨🏻‍💻 Data Warehouse</option>
                <option value="llm">🌐 Language Model</option>
                <option value="powerbi">📈 Power BI</option>
              </select>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;