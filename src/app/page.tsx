'use client';

import { useState, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface PersonData {
  firstname: string;
  lastname: string;
  barcode_range_count: number;
}

interface AnalysisData {
  people_data: PersonData[];
  statistics: {
    total_people: number;
    total_ranges: number;
    average_ranges_per_person: number;
  };
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid CSV file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisData(result.data);
      } else {
        setError(result.error || 'An error occurred while processing the file.');
      }
    } catch (error) {
      setError('Network error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeDefaultFile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-default');
      const result = await response.json();

      if (result.success) {
        setAnalysisData(result.data);
      } else {
        setError(result.error || 'An error occurred while analyzing the default file.');
      }
    } catch (error) {
      setError('Network error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    if (!analysisData) return;
    
    const csvContent = [
      ['First Name', 'Last Name', 'Barcode Ranges'],
      ...analysisData.people_data.map(person => [
        person.firstname,
        person.lastname,
        person.barcode_range_count.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barcode_analysis.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateColors = (count: number) => {
    const colors = [
      'rgba(102, 126, 234, 0.8)', 'rgba(118, 75, 162, 0.8)', 'rgba(240, 147, 251, 0.8)', 'rgba(245, 87, 108, 0.8)',
      'rgba(79, 172, 254, 0.8)', 'rgba(0, 242, 254, 0.8)', 'rgba(67, 233, 123, 0.8)', 'rgba(56, 249, 215, 0.8)',
      'rgba(255, 236, 210, 0.8)', 'rgba(252, 182, 159, 0.8)', 'rgba(168, 237, 234, 0.8)', 'rgba(254, 214, 227, 0.8)'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  const chartData = analysisData ? {
    labels: analysisData.people_data.map(person => `${person.firstname} ${person.lastname}`),
    datasets: [{
      label: 'Barcode Scanned',
      data: analysisData.people_data.map(person => person.barcode_range_count),
      backgroundColor: generateColors(analysisData.people_data.length),
      borderColor: generateColors(analysisData.people_data.length).map(color => color.replace('0.8', '1')),
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = analysisData?.people_data.reduce((a, b) => a + b.barcode_range_count, 0) || 0;
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed.toLocaleString()} ranges (${percentage}%)`;
          }
        }
      },
      datalabels: {
        display: true,
        color: '#333',
        font: {
          weight: 'bold' as const,
          size: 12
        },
        formatter: function(value: number) {
          return value.toLocaleString();
        },
        anchor: 'end' as const,
        align: 'top' as const,
        offset: 4
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value.toLocaleString();
          }
        },
        grid: {
          color: 'rgba(0,0,0,0.1)'
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">
            <i className="fas fa-warehouse mr-2"></i>
            Warehouse KPI Dashboard
          </h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              <i className="fas fa-upload mr-2"></i>
              Upload CSV File
            </h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
                  Choose CSV File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="csvFile"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: CSV files with tab or comma separators
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-upload mr-1"></i>
                  Upload & Analyze
                </button>
                <button
                  onClick={analyzeDefaultFile}
                  disabled={isLoading}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-database mr-1"></i>
                  Use Default
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Analyzing data...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}

        {/* Results Section */}
        {analysisData && (
          <div className="space-y-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <i className="fas fa-users text-4xl text-blue-600 mb-2"></i>
                <h3 className="text-2xl font-bold text-gray-900">
                  {analysisData.statistics.total_people.toLocaleString()}
                </h3>
                <p className="text-gray-600">Total People</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <i className="fas fa-barcode text-4xl text-green-600 mb-2"></i>
                <h3 className="text-2xl font-bold text-gray-900">
                  {analysisData.statistics.total_ranges.toLocaleString()}
                </h3>
                <p className="text-gray-600">Total Scanned</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <i className="fas fa-chart-line text-4xl text-yellow-600 mb-2"></i>
                <h3 className="text-2xl font-bold text-gray-900">
                  {analysisData.statistics.average_ranges_per_person.toLocaleString()}
                </h3>
                <p className="text-gray-600">Avg per Person</p>
              </div>
            </div>

            {/* Export Button */}
            <div className="text-center">
              <button
                onClick={exportData}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <i className="fas fa-download mr-1"></i>
                Export CSV
              </button>
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">
                <i className="fas fa-chart-bar mr-2"></i>
                Barcode Scanned by Person
              </h3>
              <div className="h-96">
                {chartData && (
                  <Bar data={chartData} options={chartOptions} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 mt-12 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            <i className="fas fa-warehouse mr-1"></i>
            Built by Nirvik
          </p>
        </div>
      </footer>
    </div>
  );
}