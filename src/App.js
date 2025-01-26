import React, { useState, useEffect, useRef, useCallback } from 'react';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Send, Bot, User, Timer } from 'lucide-react';
import ClaudeService from './components/ClaudeSQLagent';
import AIRouter from './components/AIRouter';
//import ExpandableSQLResults from './components/ExpandableSQLResults';
import IntentResponse from './components/IntentResponse';

const App = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm the Baralgae assistant. How can I help you today?" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [intent] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loadingTime, setLoadingTime] = useState(0);
  
  const messagesEndRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const claudeService = useRef(new ClaudeService()).current;
  const aiRouter = useRef(new AIRouter()).current;

  const s3Client = useRef(
    new S3Client({
      region: process.env.REACT_APP_AWS_REGION,
      credentials: {
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
      },
    })
  ).current;

  const formatChatHistory = (messages) => {
    return messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  };

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

  useEffect(() => {
    const cleanup = fetchMetadata();
    return () => cleanup;
  }, [fetchMetadata]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, intent]);

  const formatLoadingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
  
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);
  
    try {
      const chatHistory = formatChatHistory(messages);
      const detectedIntent = await aiRouter.classifyIntent(userMessage, chatHistory);
      
      let response;
      if (detectedIntent === 'chat') {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: userMessage,
          intent: 'chat',
          chatHistory: chatHistory
        }]);
        return;
      }
      
      if (detectedIntent === 'ql') {
        response = await claudeService.generateAndExecuteQuery(
          userMessage,
          metadata,
          chatHistory
        );
      } else if (detectedIntent === 'redshift') {
        response = await claudeService.codeWhisper(
          userMessage,
          metadata
        );
      } else {
        response = 'other';
      }
      
      if (response.error) {
        const errorMessage = response.type === 'execution_error' 
          ? `🛑 Error executing SQL query:\n${response.error}`
          : response.error;
          
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: errorMessage,
          error: true,
          query: response.query,
          intent: 'missing'
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.insights,
          sqlData: response,
          intent: detectedIntent
        }]);
      }
    } catch (error) {
      console.error('Error details:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error processing your request. Please try again.',
        error: true,
        intent: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
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

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4">
            {messages.map((message, index) => (
              message.role === 'user' ? (
                <div key={index} className="px-8 py-2 bg-green-50">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5" />
                    <span className="font-medium">You</span>
                  </div>
                  <div className="pl-8">
                    <div className="text-base leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              ) : (
                <IntentResponse key={index} message={message} intent={message.intent} metadata={message.metadata} chatHistory={message.chatHistory}/>
              )
            ))}

            {error && (
              <div className="px-8 py-2 bg-red-50 text-red-600">
                {error} 
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;