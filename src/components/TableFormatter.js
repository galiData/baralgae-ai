import React from 'react';

const TableFormatter = ({ content }) => {
  const parseContent = (text) => {
    const parts = text.split(/(?=Key observations:)/);
    const mainContent = parts[0];
    const observations = parts[1] || '';

    // Extract table content
    const tableLines = mainContent.split('\n').filter(line => line.trim());
    const headerRow = tableLines[1];
    // const separator = tableLines[2];
    const dataRows = tableLines.slice(3);

    // Parse header columns
    const columns = headerRow.split('|').map(col => col.trim());

    // Parse data rows
    const rows = dataRows.map(row => 
      row.split('|').map(cell => cell.trim())
    );

    return {
      columns,
      rows,
      observations: observations.replace('Key observations:', '').trim()
    };
  };

  const { columns, rows, observations } = parseContent(content);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {observations && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium text-gray-900 mb-3">Key Observations</h3>
          <p className="text-gray-700">{observations}</p>
        </div>
      )}
    </div>
  );
};

export default TableFormatter;