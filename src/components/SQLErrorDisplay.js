import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const SQLErrorDisplay = ({ error, query }) => {
  // Parse different types of Redshift errors
  const parseError = (error) => {
    if (typeof error === 'string') {
      // Handle string error messages
      return {
        title: 'Query Error',
        description: error
      };
    }

    if (error?.message) {
      if (error.message.includes('syntax error')) {
        return {
          title: 'SQL Syntax Error',
          description: error.message
        };
      }
      if (error.message.includes('permission denied')) {
        return {
          title: 'Permission Error',
          description: 'You do not have permission to execute this query.'
        };
      }
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return {
          title: 'Table Not Found',
          description: error.message
        };
      }
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        return {
          title: 'Column Not Found',
          description: error.message
        };
      }
      // Default error handling
      return {
        title: 'Query Error',
        description: error.message
      };
    }

    // Fallback for unknown error types
    return {
      title: 'Unknown Error',
      description: 'An unexpected error occurred while executing the query.'
    };
  };

  const errorInfo = parseError(error);

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{errorInfo.title}</AlertTitle>
        <AlertDescription>{errorInfo.description}</AlertDescription>
      </Alert>
      
      <div className="bg-slate-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Attempted Query:</h4>
        <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
          {query}
        </pre>
      </div>
    </div>
  );
};

export default SQLErrorDisplay;