import React, { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [password, setPassword] = useState('');
  const [selectedFilename, setSelectedFilename] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [enableApiCall, setEnableApiCall] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleReconcileData = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/reconcile', {
        selectedFilename,
        selectedType,
        selectedDealerId,
        enableApiCall
      });
      setResults(response.data.results);
      setLoading(false);
    } catch (error) {
      console.error('Failed to reconcile data:', error);
      setLoading(false);
    }
  };

  const downloadResults = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      results.map(e => Object.values(e).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reconciliation_results.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (password !== "G@rber") {
    return (
      <div className="flex justify-center items-center h-screen">
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Enter password" 
          className="p-2 border rounded"
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">GMG Dealer.com VIN Reconciliation Tool</h1>
      <div className="my-4">
        <input
          className="border p-2 mr-2 rounded"
          value={selectedFilename}
          onChange={e => setSelectedFilename(e.target.value)}
          placeholder="Enter filename"
        />
        <select
          className="border p-2 mr-2 rounded"
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
        >
          <option value="All">All</option>
          <option value="New">New</option>
          <option value="Used">Used</option>
        </select>
        <input
          className="border p-2 rounded"
          value={selectedDealerId}
          onChange={e => setSelectedDealerId(e.target.value)}
          placeholder="Enter Dealer ID"
        />
        <label className="block my-2">
          <input
            type="checkbox"
            checked={enableApiCall}
            onChange={e => setEnableApiCall(e.target.checked)}
            className="mr-2"
          />
          Enable API Call for VIN reconciliation
        </label>
        <button
          onClick={handleReconcileData}
          className="bg-blue-500 text-white p-2 rounded"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Reconcile Data'}
        </button>
        {results.length > 0 && (
          <button
            onClick={downloadResults}
            className="ml-4 bg-green-500 text-white p-2 rounded"
          >
            Download Results
          </button>
        )}
      </div>
      <div>
        {results.map((result, index) => (
          <div key={index} className="p-2 border my-2">
            {Object.entries(result).map(([key, value]) => (
              <p key={key}>{`${key}: ${value}`}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
