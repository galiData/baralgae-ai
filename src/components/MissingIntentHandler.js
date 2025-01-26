import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { AlertCircle } from 'lucide-react';

const MissingIntentHandler = ({ message, metadata, chatHistory, onFeedback }) => {
  const [clarification, setClarification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastProcessedMessage = useRef('');

  const bedrockClient = useMemo(() => new BedrockRuntimeClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
    }
  }), []);

  const buildPrompt = useCallback((chatHistory, metadata, message) => {
    const chatHistoryText = chatHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `Given this conversation history:
${chatHistoryText}

And this database schema:
${JSON.stringify(metadata, null, 2)}

For the latest user message: "${message}"

1. Identify what information is missing to properly handle this request
2. Suggest 1-2 follow-up questions to get the missing information
3. Format the response as JSON with fields:
   - missingInfo: what's missing
   - questions: array of follow-up questions

Return only the JSON.`;
  }, []);

  const processAIResponse = async (response) => {
    let result = '';
    for await (const chunk of response.body) {
      const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
      const parsedChunk = JSON.parse(chunkText);
      if (parsedChunk.type === 'content_block_delta') {
        result += parsedChunk.delta.text;
      }
    }
    return JSON.parse(result);
  };

  useEffect(() => {
    const getClarification = async () => {
      if (message === lastProcessedMessage.current) return;
      
      setLoading(true);
      setError(null);

      try {
        const prompt = buildPrompt(chatHistory, metadata, message);
        const command = new InvokeModelWithResponseStreamCommand({
          modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: [{ type: "text", text: prompt }]
            }]
          })
        });

        const response = await bedrockClient.send(command);
        const clarificationData = await processAIResponse(response);
        setClarification(clarificationData);
        lastProcessedMessage.current = message;
        
        if (onFeedback) {
          onFeedback({
            type: 'missing_info',
            content: clarificationData
          });
        }
      } catch (err) {
        setError(err.message);
        console.error('Error getting clarification:', err);
      } finally {
        setLoading(false);
      }
    };

    getClarification();
  }, [message, buildPrompt, metadata, chatHistory, onFeedback, bedrockClient]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">Failed to get clarification: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 p-4 rounded-lg">
      <div className="space-y-4">
        {clarification?.missingInfo && (
          <div className="text-amber-700">
            <p className="font-medium">Missing Information:</p>
            <p>{clarification.missingInfo}</p>
          </div>
        )}
        {clarification?.questions?.length > 0 && (
          <div className="text-amber-700">
            <p className="font-medium">Follow-up Questions:</p>
            <ul className="list-disc pl-4 space-y-1">
              {clarification.questions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissingIntentHandler;