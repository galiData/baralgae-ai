import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ExpandableSQLResults = ({ results }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  return (
    <div className="mt-4">
      <div className="bg-gray-50 rounded-lg">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex justify-between items-center hover:bg-gray-100 transition-colors duration-200"
        >
          <h3 className="font-medium">Query Results</h3>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {isExpanded && (
          <div className="p-4 pt-0 border-t border-gray-200">
            {formatSqlResults(results)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandableSQLResults;