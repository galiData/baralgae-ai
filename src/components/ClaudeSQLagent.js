import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { 
  RedshiftDataClient, 
  ExecuteStatementCommand, 
  DescribeStatementCommand,
  GetStatementResultCommand 
} from '@aws-sdk/client-redshift-data';

class ClaudeService {
  constructor() {
    const region = 'us-east-1';
    this.bedrockClient = new BedrockRuntimeClient({
      region: region,
      credentials: {
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
      }
    });

    this.redshiftClient = new RedshiftDataClient({
      region: process.env.REACT_APP_AWS_REGION,
      credentials: {
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
      }
    });
  }

  async getResponse(message, metadata, chatHistory = []) {
    const conversationContext = chatHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
      
    const prompt = `Given this conversation history:
${conversationContext}

And based on the following database schema:
${JSON.stringify(metadata, null, 2)}

Generate a Redshift SQL query for this question: "${message}"
Return only the SQL query without any explanation or additional text. Make sure to add the schema name to the query.`;

    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ]
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody)
    });

    try {
      const response = await this.bedrockClient.send(command);
      let sqlQuery = '';

      for await (const chunk of response.body) {
        const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
        const parsedChunk = JSON.parse(chunkText);
        if (parsedChunk.type === 'content_block_delta') {
          sqlQuery += parsedChunk.delta.text;
        }
      }

      console.log('Generated SQL Query:', sqlQuery.trim());
      return sqlQuery.trim();
    } catch (error) {
      console.error('Error generating SQL query:', error);
      throw error;
    }
  }

  async generateInsights(queryResults, originalQuery, chatHistory = []) {
    const conversationContext = chatHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `Given this conversation history:
${conversationContext}

Analyze the following SQL query results and provide insights:
    
Original Query: ${originalQuery}

Results:
${JSON.stringify({
  columnMetadata: queryResults.columnMetadata,
  records: queryResults.records,
  totalNumRows: queryResults.totalNumRows
}, null, 2)}

Please provide:
1. A brief summary of the data
2. Key patterns or trends
3. Notable outliers or anomalies
4. Business implications or recommendations

Format the response in a clear, structured way.`;

    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ]
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody)
    });

    try {
      const response = await this.bedrockClient.send(command);
      let insights = '';

      for await (const chunk of response.body) {
        const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
        const parsedChunk = JSON.parse(chunkText);
        if (parsedChunk.type === 'content_block_delta') {
          insights += parsedChunk.delta.text;
        }
      }

      return insights.trim();
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  async codeWhisper(message, metadata = []) {
  const prompt = `Based on the following database schema:
${JSON.stringify(metadata, null, 2)}

Generate a Redshift SQL query for this question: "${message}"
Return only the SQL query without any explanation or additional text. Make sure to add the schema name to the query.`;

    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ]
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody)
    });

    try {
      const response = await this.bedrockClient.send(command);
      let sqlQuery = '';

      for await (const chunk of response.body) {
        const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
        const parsedChunk = JSON.parse(chunkText);
        if (parsedChunk.type === 'content_block_delta') {
          sqlQuery += parsedChunk.delta.text;
        }
      }

      console.log('Generated SQL Query:', sqlQuery.trim());
      return sqlQuery.trim();
    } catch (error) {
      console.error('Error generating SQL query:', error);
      throw error;
    }
  }

  async answerQuestion(queryResults, message, chatHistory = []) {
    const conversationContext = chatHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `Given this conversation history:
${conversationContext}

Answer the question with the following SQL query results:
    
Original question: ${message}

Results:
${JSON.stringify({
  columnMetadata: queryResults.columnMetadata,
  records: queryResults.records,
  totalNumRows: queryResults.totalNumRows
}, null, 2)}

Format the response in a clear way.`;

    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ]
    };

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody)
    });

    try {
      const response = await this.bedrockClient.send(command);
      let insights = '';

      for await (const chunk of response.body) {
        const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
        const parsedChunk = JSON.parse(chunkText);
        if (parsedChunk.type === 'content_block_delta') {
          insights += parsedChunk.delta.text;
        }
      }

      return insights.trim();
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  async executeSqlQuery(sqlQuery) {
    try {
      if (!sqlQuery?.trim()) {
        throw new Error('SQL query cannot be empty');
      }
  
      const params = {
        Database: process.env.REACT_APP_REDSHIFT_DATABASE,
        SecretArn: process.env.REACT_APP_REDSHIFT_SECRET_ARN,
        WorkgroupName: process.env.REACT_APP_REDSHIFT_WORKGROUP_NAME,
        Sql: sqlQuery,
        WithEvent: true
      };
  
      console.log('Executing query with params:', {
        Database: params.Database,
        WorkgroupName: params.WorkgroupName,
        Sql: params.Sql,
        WithEvent: params.WithEvent
      });
  
      const command = new ExecuteStatementCommand(params);
      const response = await this.redshiftClient.send(command);
      
      if (!response?.Id) {
        throw new Error('No query ID returned from Redshift');
      }
  
      //console.log('Initial query response:', JSON.stringify(response, null, 2));
  
      const queryResult = await this.waitForQueryCompletion(response.Id);
      
      //console.log('Query result before formatting:', JSON.stringify(queryResult, null, 2));
  
      const formattedResults = {
        columnMetadata: queryResult.columnMetadata || [],
        records: queryResult.records || [],
        totalNumRows: queryResult.totalNumRows || 0,
        hasResultSet: queryResult.hasResultSet
      };
  
      // Transform records to proper format
      const transformedRecords = formattedResults.records.map(record => 
        record.map(field => {
          const fieldValue = field ? Object.values(field)[0] : null;
          return fieldValue;
        })
      );
  
      formattedResults.records = transformedRecords;
  
      console.log('Final formatted results:', {
        totalRows: formattedResults.totalNumRows,
        columns: formattedResults.columnMetadata.length,
        records: formattedResults.records.length,
        hasResultSet: formattedResults.hasResultSet,
        sampleRecord: transformedRecords[0]
      });
  
      return formattedResults;
    } catch (error) {
      console.error('Error executing SQL query:', {
        message: error.message,
        stack: error.stack,
        query: sqlQuery
      });
      throw error;
    }
  }

  formatRecordsForDisplay(records, columnMetadata) {
    // Transform records into a more readable format for console.table
    return records.map(record => {
      const formattedRow = {};
      record.forEach((value, index) => {
        const columnName = columnMetadata[index]?.label || `Column${index}`;
        formattedRow[columnName] = value;
      });
      return formattedRow;
    });
  }

  async waitForQueryCompletion(queryId) {
    const maxAttempts = 60;
    let attempts = 0;
  
    console.log(`Waiting for query ${queryId} to complete...`);
  
    while (attempts < maxAttempts) {
      try {
        const response = await this.redshiftClient.send(new DescribeStatementCommand({
          Id: queryId
        }));
  
        //console.log('Raw Redshift Response:', JSON.stringify(response, null, 2));
        console.log(`Query status: ${response.Status} (Attempt ${attempts + 1}/${maxAttempts})`);
  
        switch (response.Status) {
          case 'FINISHED':
            console.log('Query execution completed successfully');
            
            if (response.HasResultSet) {
              // Fetch the actual results using GetStatementResult
              console.log('Fetching result set...');
              const resultCommand = new GetStatementResultCommand({ Id: queryId });
              const resultResponse = await this.redshiftClient.send(resultCommand);
              
              //console.log('Result set response:', JSON.stringify(resultResponse, null, 2));
              
              return {
                records: resultResponse.Records || [],
                columnMetadata: resultResponse.ColumnMetadata || [],
                totalNumRows: resultResponse.TotalNumRows || 0,
                hasResultSet: true
              };
            } else {
              console.log('Query completed but has no result set');
              return {
                records: [],
                columnMetadata: [],
                totalNumRows: 0,
                hasResultSet: false
              };
            }
          case 'FAILED':
            console.error('Query execution failed:', response.Error);
            throw new Error(`Query execution failed: ${response.Error}`);
          case 'ABORTED':
            console.error('Query execution was aborted');
            throw new Error('Query execution was aborted');
          default:
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
            break;
        }
      } catch (error) {
        console.error('Error checking query status:', error);
        throw error;
      }
    }
  
    throw new Error('Query execution timed out');
  }

  async generateAndExecuteQuery(message, metadata, chatHistory) {
    try {
      console.log('\n=== Starting Query Generation and Execution ===');
      console.log('User Message:', message);
      
      const sqlQuery = await this.getResponse(message, metadata, chatHistory);
      console.log('\nExecuting generated query...');
      
      try {
        const queryResult = await this.executeSqlQuery(sqlQuery);
        console.log('\nGenerating Answer...');
        const insights = await this.answerQuestion(queryResult, message, chatHistory);
        
        return {
          query: sqlQuery,
          result: queryResult,
          insights: insights
        };
      } catch (error) {
        // Return the SQL query along with the error
        return {
          query: sqlQuery,
          error: error.message || 'Error executing query',
          type: 'execution_error'
        };
      }
    } catch (error) {
      // Handle query generation errors
      return {
        error: 'Failed to generate SQL query: ' + error.message,
        type: 'generation_error'
      };
    }
  }

}



export default ClaudeService;