import React, { useState } from 'react';

const TransactionHistoryOrdinary: React.FC = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [fromBillCycle, setFromBillCycle] = useState('');

  const handleViewDetails = () => {
    // TODO: Implement the fetch logic
    console.log("Fetching details for:", { accountNumber, fromBillCycle });
  };

  return (
    <div className="p-4 w-full text-sm">
      <h2 className="text-lg font-bold text-[#7A0000] mb-4">
        Transaction History (Including Finalized Accounts)
      </h2>
      
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200 max-w-2xl">
        <div className="grid grid-cols-[150px_1fr] gap-4 items-center mb-4">
          <label className="font-semibold text-gray-700">Account Number</label>
          <input 
            type="text" 
            className="border border-gray-300 rounded px-3 py-1.5 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-[#7A0000] focus:border-[#7A0000]"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
          
          <label className="font-semibold text-gray-700">From Bill Cycle</label>
          <select 
            className="border border-gray-300 rounded px-3 py-1.5 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-[#7A0000] focus:border-[#7A0000]"
            value={fromBillCycle}
            onChange={(e) => setFromBillCycle(e.target.value)}
          >
            <option value="">-- Select --</option>
            {/* Populate dynamically if needed */}
          </select>
        </div>

        <div className="grid grid-cols-[150px_1fr] gap-4 mt-6">
          <div></div>
          <button 
            className="bg-gray-200 text-gray-700 border border-gray-300 px-4 py-1.5 rounded font-medium hover:bg-gray-300 transition-colors w-max"
            onClick={handleViewDetails}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistoryOrdinary;
