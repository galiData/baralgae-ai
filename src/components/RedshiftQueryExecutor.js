import React, { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';

class RedshiftService {
  constructor() {
    this.connection = {
      host: process.env.REACT_APP_REDSHIFT_HOST,
      port: process.env.REACT_APP_REDSHIFT_PORT,
      database: process.env.REACT_APP_REDSHIFT_DATABASE,
      user: process.env.REACT_APP_REDSHIFT_USER,
      password: process.env.REACT_APP_REDSHIFT_PASSWORD,
    };
  }

  async executeQuery(query) {
    try {
      const response = await fetch('/api/execute-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          connection: this.connection
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }
}

const RedshiftQueryExecutor = ({ query }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const redshiftService = new RedshiftService();

  const executeQuery = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryResults = await redshiftService.executeQuery(query);
      
      // Transform results for DataGrid
      const columns = Object.keys(queryResults[0] || {}).map(field => ({
        field,
        headerName: field.charAt(0).toUpperCase() + field.slice(1),
        flex: 1,
        minWidth: 150
      }));

      const rows = queryResults.map((row, index) => ({
        id: index,
        ...row
      }));

      setResults({ columns, rows });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="bg-gray-100 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm">{query}</pre>
          </div>
        </div>
        <button
          onClick={executeQuery}
          disabled={loading}
          className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Executing...' : 'Run Query'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {results && (
        <div className="h-96 w-full">
          <DataGrid
            rows={results.rows}
            columns={results.columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            density="compact"
          />
        </div>
      )}
    </div>
  );
};

export default RedshiftQueryExecutor;