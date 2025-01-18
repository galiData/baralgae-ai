import React from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const QueryInsights = ({ data, insights }) => {
  const determineChartType = () => {
    if (!data?.records?.length || !data?.columnMetadata?.length) return null;

    const columns = data.columnMetadata;
    const records = data.records;

    // Check if we have numeric columns
    const numericColumns = columns.filter(col => 
      ['int', 'float', 'double', 'decimal', 'numeric']
        .includes(col.typeName?.toLowerCase())
    );

    // Check if we have date/timestamp columns
    const dateColumns = columns.filter(col => 
      ['date', 'timestamp', 'datetime']
        .includes(col.typeName?.toLowerCase())
    );

    // If we have a date column and numeric columns, create a line chart
    if (dateColumns.length && numericColumns.length) {
      return 'line';
    }

    // If we have 2-3 columns with one being numeric, create a bar chart
    if (columns.length <= 3 && numericColumns.length) {
      return 'bar';
    }

    // If we have exactly 2 columns with one being numeric and less than 10 records
    if (columns.length === 2 && numericColumns.length === 1 && records.length < 10) {
      return 'pie';
    }

    return 'bar'; // Default to bar chart
  };

  const prepareChartData = () => {
    const records = data.records;
    const columns = data.columnMetadata;

    return records.map((record) => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col.name] = record[index];
      });
      return obj;
    });
  };

  const renderChart = () => {
    const chartType = determineChartType();
    const chartData = prepareChartData();
    const numericColumns = data.columnMetadata
      .filter(col => ['int', 'float', 'double', 'decimal', 'numeric']
        .includes(col.typeName?.toLowerCase()))
      .map(col => col.name);
    
    const nonNumericColumn = data.columnMetadata
      .find(col => !numericColumns.includes(col.name))?.name;

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nonNumericColumn} />
              <YAxis />
              <Tooltip />
              <Legend />
              {numericColumns.map((col, index) => (
                <Line 
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={COLORS[index % COLORS.length]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                nameKey={nonNumericColumn}
                dataKey={numericColumns[0]}
                cx="50%"
                cy="50%"
                outerRadius={150}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={nonNumericColumn} />
              <YAxis />
              <Tooltip />
              <Legend />
              {numericColumns.map((col, index) => (
                <Bar 
                  key={col}
                  dataKey={col}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4 bg-white rounded-lg shadow">
      {data?.records?.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Data Visualization</h3>
          {renderChart()}
        </div>
      )}
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Analysis Insights</h3>
        <div className="whitespace-pre-wrap">
          {insights}
        </div>
      </div>
    </div>
  );
};

export default QueryInsights;