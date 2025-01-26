import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import ClaudeService from './ClaudeSQLagent';

class AIRouter {
  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
      }
    });
  }

  async classifyIntent(message, chatHistory) {
    const chatHistoryText = chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    const prompt = `Given the following chat history and the latest user message, determine if the user's request requires:
  1. SQL query generation (return "ql") - if the user is asking for specific data, metrics, such as "what is the average temperature in the last 30 days"
  2. Redshift SQL query generation (return "ql") - if the user is asking to generate a Redshift SQL query or a query to generate a table, for example "generate a query with the last 10 rows of scada"
  3. General chat/analysis (return "chat") - if the user wants a summary, analysis, or general conversation
  4. Missing information (return "missing") - if there are missing information in the chat history or the latest user message that would help the agent to generate a better response. For example, if the user asks for the average temperature in the last 30 days, but the chat history does not contain any information about temperature, the agent should return "missing".

  Chat history:
  ${chatHistoryText}

  Latest user message: "${message}"

  Return only "redshift", "ql", "missing" or "chat" without any explanation.`;

    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }]
        }
      ]
    };

    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody)
      });

      const response = await this.bedrockClient.send(command);
      let result = '';

      for await (const chunk of response.body) {
        const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
        const parsedChunk = JSON.parse(chunkText);
        if (parsedChunk.type === 'content_block_delta') {
          result += parsedChunk.delta.text;
        }
      }

      return result.trim().toLowerCase();
    } catch (error) {
      console.error('Error classifying intent:', error);
      throw error;
    }
  }

  async processMessage(message, metadata) {
    try {
      console.log('Processing message:', message);
      const intent = await this.classifyIntent(message);
      console.log('Detected intent:', intent);

      switch (intent) {
        case 'ql':
          return await this.handleSQLIntent(message, metadata);
        case 'chat':
          return await this.handleChatIntent(message);
        default:
          throw new Error('Unknown intent detected');
      }
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  async handleSQLIntent(message, metadata) {
    // Reuse existing Claude SQL generation logic
    const claudeService = new ClaudeService();
    return await claudeService.generateAndExecuteQuery(message, metadata);
  }

  async handleChatIntent(message) {
    const prompt = `Provide a thoughtful analysis or summary for the following request:
    "${message}"
    
    Focus on providing clear insights and actionable recommendations if applicable.`;

    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }]
        }
      ]
    };

    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody)
      });

      const response = await this.bedrockClient.send(command);
      let analysis = '';

      for await (const chunk of response.body) {
        const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
        const parsedChunk = JSON.parse(chunkText);
        if (parsedChunk.type === 'content_block_delta') {
          analysis += parsedChunk.delta.text;
        }
      }

      return {
        type: 'chat',
        content: analysis.trim()
      };
    } catch (error) {
      console.error('Error generating analysis:', error);
      throw error;
    }
  }
}

export default AIRouter;