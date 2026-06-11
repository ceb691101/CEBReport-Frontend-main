import React, { useState } from 'react';

const HeadOfficePOSCollection: React.FC = () => {
  const [reportType, setReportType] = useState('Bulk');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const handleViewReport = () => {
    // Implement report view logic here
    console.log({ reportType, fromDate, toDate });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
        Head Office POS Collection
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 w-fit">
              <input 
                type="radio" 
                name="reportType" 
                value="Bulk" 
                checked={reportType === 'Bulk'} 
                onChange={() => setReportType('Bulk')}
                className="w-4 h-4 text-[#7A0000] focus:ring-[#7A0000] border-gray-300"
              />
              <span className="font-medium">Bulk</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 w-fit">
              <input 
                type="radio" 
                name="reportType" 
                value="Ordinary" 
                checked={reportType === 'Ordinary'} 
                onChange={() => setReportType('Ordinary')}
                className="w-4 h-4 text-[#7A0000] focus:ring-[#7A0000] border-gray-300"
              />
              <span className="font-medium">Ordinary</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className={`${maroon} text-xs font-medium mb-1`}>
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              />
            </div>

            <div className="flex flex-col">
              <label className={`${maroon} text-xs font-medium mb-1`}>
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mt-6 flex justify-end">
        <button 
          onClick={handleViewReport}
          className={`px-6 py-2 rounded-md font-medium text-xs transition-opacity duration-300 shadow text-white flex items-center justify-center min-w-[120px] ${maroonGrad} hover:opacity-90`}
        >
          View Report
        </button>
      </div>
    </div>
  );
};

export default HeadOfficePOSCollection;
