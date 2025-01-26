import React, { useState, useEffect, useRef } from 'react';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ChatHandler = ({ message, chatHistory = [] }) => {
  const [streamedText, setStreamedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bedrockClient = useRef(null);
  const responseInProgress = useRef(false);

  useEffect(() => {
    if (!message || responseInProgress.current) return;

    const getResponse = async () => {
      if (!bedrockClient.current) {
        bedrockClient.current = new BedrockRuntimeClient({
          region: 'us-east-1',
          credentials: {
            accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
          }
        });
      }

      setLoading(true);
      setError(null);
      setStreamedText('');
      responseInProgress.current = true;

      try {
        const context = chatHistory.length > 0 
          ? chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')
          : '';

        const command = new InvokeModelWithResponseStreamCommand({
          modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 2000,
            messages: [{
              role: "user",
              content: [{
                type: "text", 
                text: `Given this conversation context:\n${context}\n\nRespond to: "${message}"`
              }]
            }]
          })
        });

        const response = await bedrockClient.current.send(command);
        let accumulatedText = '';

        for await (const chunk of response.body) {
          const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
          try {
            const parsedChunk = JSON.parse(chunkText);
            if (parsedChunk.type === 'content_block_delta' && parsedChunk.delta.text) {
              accumulatedText += parsedChunk.delta.text;
              setStreamedText(accumulatedText);
            }
          } catch (parseError) {
            console.error('Error parsing chunk:', parseError);
          }
        }

      } catch (err) {
        console.error('Error getting chat response:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        responseInProgress.current = false;
      }
    };

    getResponse();
  }, [message, chatHistory]);

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <Bot className="w-5 h-5" />
          <p>Failed to get response: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm relative">
        {loading && (
          <div className="absolute top-2 right-2">
            <div className="animate-pulse h-2 w-2 bg-green-600 rounded-full" />
          </div>
        )}
        <div className="prose max-w-none">
          <ReactMarkdown>{streamedText || (loading ? '...' : '')}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default ChatHandler;