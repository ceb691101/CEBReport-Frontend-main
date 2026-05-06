/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';

const HeadOfficeCollectionTotal: React.FC = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatApiDate = (date: Date | null): string => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fetchPdfBlob = async (): Promise<Blob | null> => {
    if (!fromDate || !dueDate) return null;

    setLoading(true);
    setError(null);

    try {
      const from = formatApiDate(fromDate);
      const to = formatApiDate(dueDate);

      const response = await axios.get(
        "http://10.128.1.59:5030/api/Collection/pdf", // ✅ Updated to published URL
        {
          responseType: "blob",
          params: {
            fromDate: from,
            toDate: to
          }
        }
      );

      return response.data;
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch PDF';
      console.error("Error downloading PDF:", err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async () => {
    if (!fromDate || !dueDate) {
      alert('Please select both From Date and To Date');
      return;
    }

    const blob = await fetchPdfBlob();
    if (!blob) return;

    const fileURL = window.URL.createObjectURL(blob);
    setPdfUrl(fileURL);
  };

  const handleDownloadPDF = async () => {
    if (!fromDate || !dueDate) {
      alert('Please select both From Date and To Date');
      return;
    }

    const blob = await fetchPdfBlob();
    if (!blob) return;

    const fileURL = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = fileURL;
    link.download = "CollectionReport.pdf";
    document.body.appendChild(link);
    link.click();

    window.URL.revokeObjectURL(fileURL);
  };

  const handleNewSearch = () => {
    setFromDate(null);
    setDueDate(null);
    setPdfUrl(null);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
        Head Office Collection Total
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleViewReport();
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex flex-col">
            <label className={`${maroon} text-xs font-medium mb-1`}>
              From Date
            </label>
            <DatePicker
              selected={fromDate}
              onChange={(date: Date | null) => setFromDate(date)}
              selectsStart
              startDate={fromDate ?? undefined}
              endDate={dueDate ?? undefined}
              maxDate={dueDate ?? new Date()}
              dateFormat="dd-MM-yyyy"
              placeholderText="Select from date"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent outline-none"
              wrapperClassName="w-full"
            />
          </div>

          <div className="flex flex-col">
            <label className={`${maroon} text-xs font-medium mb-1`}>
              To Date
            </label>
            <DatePicker
              selected={dueDate}
              onChange={(date: Date | null) => setDueDate(date)}
              selectsEnd
              startDate={fromDate ?? undefined}
              endDate={dueDate ?? undefined}
              minDate={fromDate ?? undefined}
              maxDate={new Date()}
              dateFormat="dd-MM-yyyy"
              placeholderText="Select to date"
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent outline-none"
              wrapperClassName="w-full"
            />
          </div>

          <div className="hidden md:block" />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="w-full mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 rounded-md font-medium shadow ${maroonGrad} text-white hover:opacity-90 min-w-[140px] transition-opacity ${
              loading ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Loading...' : 'View Report'}
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={loading}
            className={`px-6 py-2 rounded-md font-medium shadow ${maroonGrad} text-white hover:opacity-90 min-w-[140px] transition-opacity ${
              loading ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Loading...' : 'Download PDF'}
          </button>
        </div>
      </form>

      {pdfUrl && (
        <div className="mt-8 border border-gray-300 rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 className={`text-lg font-semibold ${maroon}`}>
              Head Office Collection Total Report
            </h3>
            <div className="flex gap-3">
              <button
                onClick={handleNewSearch}
                className={`px-4 py-1.5 ${maroonGrad} text-white text-sm rounded shadow`}
              >
                New Search
              </button>
            </div>
          </div>

          <div className="p-2 bg-white">
            <iframe
              src={pdfUrl}
              className="w-full h-[70vh] border-0"
              title="PDF Preview"
            />
          </div>

          <p className="text-xs text-gray-500 text-center py-2">
            From {fromDate?.toLocaleDateString('en-GB')} to {dueDate?.toLocaleDateString('en-GB')}
          </p>
        </div>
      )}
    </div>
  );
};

export default HeadOfficeCollectionTotal;