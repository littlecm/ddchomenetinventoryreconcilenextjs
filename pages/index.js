import React, { useState } from 'react'

export default function Home() {
  const [password, setPassword] = useState('');

  if (password !== "G@rber") {
    return (
      <div className="flex justify-center items-center h-screen">
        <input 
          type="password" 
          className="p-2 border rounded"
          placeholder="Enter password" 
          onChange={(e) => setPassword(e.target.value)} 
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">GMG Dealer.com VIN Reconciliation Tool</h1>
      {/* Place further UI components here */}
    </div>
  );
}
