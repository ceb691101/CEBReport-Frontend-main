import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MdPermIdentity, MdDateRange } from "react-icons/md";
import { FaFileDownload, FaPrint, FaArrowLeft } from "react-icons/fa";
import { postJSON } from "../../helpers/LoginHelper";
import axios from "axios";
import debounce from "lodash/debounce";

type YrMnthDetail = {
  yrMonth: string;
};

const TransactionHistoryOrdinary: React.FC = () => {
  const [accountNumber, setAccountNumber] = useState('');
  const [fromBillCycle, setFromBillCycle] = useState('');
  const [months, setMonths] = useState<YrMnthDetail[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  useEffect(() => {
    // Display bill cycles from 101 to 453 with formatted dates (e.g. "453 - May 26")
    const generatedMonths: YrMnthDetail[] = [];
    
    // Start date: May 2026 (Month is 0-indexed in JS, so 4 is May)
    let currentDate = new Date(2026, 4, 1); 
    
    for (let i = 453; i >= 101; i--) {
      const monthStr = currentDate.toLocaleString('en-US', { month: 'short' });
      const yearStr = currentDate.getFullYear().toString().slice(-2);
      
      generatedMonths.push({ yrMonth: `${i} - ${monthStr} ${yearStr}` });
      
      // Subtract 1 month
      currentDate.setMonth(currentDate.getMonth() - 1);
    }
    
    setMonths(generatedMonths);
  }, []);

  const handleViewDetails = async () => {
    if (!accountNumber) {
      setError("Please enter an Account Number.");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const cycleNumber = fromBillCycle.split(" - ")[0] || fromBillCycle;

      const payload = {
        account_no: accountNumber,
        from_cycle: cycleNumber
      };

      const result = await postJSON("/MRMSAPI/API/Customer/GetOrdinaryCustomertranhst_asc", payload);
      
      if (result && result.error) {
        throw new Error(result.error);
      }
      if (result && result.common_exception && result.common_exception.Message) {
        throw new Error("API Database Error: " + result.common_exception.Message);
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching the transaction history.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setData(null);
    setError(null);
  };

  const printPDF = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const downloadAsCSV = () => {
    if (!data || !data.trxList) return;
    
    const rows: string[] = [];
    rows.push("Transaction History - Ordinary Report");
    rows.push(`Account Number,${data.customer_master_detail?.acct_number || ''}`);
    rows.push("");
    rows.push("Bill Month,Transaction Date,Description,Payment Date,Transaction Amount,Balance");
    
    data.trxList.forEach((t: any) => {
      let billMonthStr = "";
      if (t.trnsac_date) {
        const parts = t.trnsac_date.split("-");
        if (parts.length >= 2) {
          billMonthStr = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase() + " " + parts[0];
        }
      }
      const amtStr = t.trnsac_amt != null ? t.trnsac_amt.toFixed(2) + " " + (t.crdt_code || "") : "";
      const isCr = t.cf_amt < 0;
      const balStr = t.cf_amt != null ? Math.abs(t.cf_amt).toFixed(2) + (isCr ? " Cr" : " Dr") : "";

      rows.push(`"${billMonthStr}","${t.trnsac_date || ''}","${t.transac_desc || ''}","${t.pmnt_date || ''}","${amtStr}","${balStr}"`);
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TransactionHistory_${data.customer_master_detail?.acct_number || 'export'}.csv`;
    a.click();
  };

  // If data exists, render the report
  if (data) {
    const customer = data.customer_master_detail || {};
    const trxList = data.trxList || [];

    // Map table data
    const tableData = trxList.map((t: any) => {
      let billMonthStr = "";
      if (t.trnsac_date) {
        const parts = t.trnsac_date.split("-");
        if (parts.length >= 2) {
          billMonthStr = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase() + " " + parts[0];
        }
      }

      const amtStr = t.trnsac_amt != null ? t.trnsac_amt.toFixed(2) + " " + (t.crdt_code || "") : "";
      const isCr = t.cf_amt < 0;
      const balStr = t.cf_amt != null ? Math.abs(t.cf_amt).toFixed(2) + (isCr ? " Cr" : " Dr") : "";

      return {
        billMonth: billMonthStr,
        transactionDate: t.trnsac_date,
        description: t.transac_desc,
        paymentDate: t.pmnt_date,
        transactionAmount: amtStr,
        balance: balStr
      };
    });

    // Determine B/F Balance from the first transaction
    let bfBalanceStr = "0.00";
    if (trxList.length > 0) {
      const bfAmt = trxList[0].bf_amt;
      const isCr = bfAmt < 0;
      bfBalanceStr = Math.abs(bfAmt).toFixed(2) + (isCr ? " Cr" : " Dr");
    }

    return (
      <div className="max-w-6xl mx-auto p-4 bg-white rounded-lg shadow border border-gray-100 font-sans text-sm">
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <div className="flex gap-2">
            <button
              onClick={downloadAsCSV}
              className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
            >
              <FaFileDownload className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={printPDF}
              className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
            >
              <FaPrint className="w-3 h-3" /> PDF
            </button>
            <button 
              onClick={handleBack}
              className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center shadow-sm transition"
            >
              Back to Form
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-4 bg-white">
          <style>{`
            @media print {
              @page { margin: 0; }
              body { padding: 1.5cm; }
            }
          `}</style>
          <h2 className={`text-xl font-bold mb-6 ${maroon}`}>Transaction History - Ordinary</h2>
          
          <div className="grid grid-cols-[150px_1fr] gap-y-3 mb-8 text-sm text-gray-900 font-medium">
            <div>Account No</div>
            <div>{customer.acct_number}</div>
            
            <div>Name</div>
            <div>{customer.cust_fname} {customer.cust_lname}</div>
            
            <div>Address</div>
            <div>{customer.address_1} {customer.address_2} {customer.address_3}</div>
            
            <div>Tariff</div>
            <div>{customer.tariff_code}</div>
            
            <div>Area</div>
            <div>{customer.area_code} - {customer.area_name}</div>
          </div>

          <div className="flex justify-end font-bold text-sm text-gray-900 mb-2">
            B/F Balance: <span className="ml-4">{bfBalanceStr}</span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto mt-4 print:max-h-none print:overflow-visible">
            <table className="w-full text-xs border-collapse border border-gray-200">
              <thead className="sticky top-0 z-10 bg-[#7A0000] print:table-row-group">
                <tr className="bg-[#7A0000] text-white">
                  <th className="p-2 text-left font-semibold">Bill Month</th>
                  <th className="p-2 text-left font-semibold">Transaction Date</th>
                  <th className="p-2 text-left font-semibold">Description</th>
                  <th className="p-2 text-left font-semibold">Payment Date</th>
                  <th className="p-2 text-right font-semibold">Transaction Amount</th>
                  <th className="p-2 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length > 0 ? (
                  tableData.map((record: any, idx: number) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="p-2 border-b border-gray-100">{record.billMonth}</td>
                      <td className="p-2 border-b border-gray-100">{record.transactionDate}</td>
                      <td className="p-2 border-b border-gray-100">{record.description}</td>
                      <td className="p-2 border-b border-gray-100">{record.paymentDate}</td>
                      <td className="p-2 text-right font-semibold border-b border-gray-100">{record.transactionAmount}</td>
                      <td className="p-2 text-right font-semibold border-b border-gray-100">{record.balance}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-500">
                      No data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-3 text-xs text-gray-600 text-center sm:text-left">
            {new Date().toLocaleString("en-US", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            }).replace(",", "")}
          </div>
        </div>
      </div>
    );
  }

  // Render form
  return (
    <div className="max-w-7xl mx-auto p-4 text-sm font-sans">
      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow w-full">
        <h3 className={`text-xl font-bold mb-4 ${maroon}`}>Transaction History (Including Finalized Accounts)</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="flex flex-col">
            <label className={`${maroon} text-xs font-medium flex items-center gap-1.5 mb-1`}>
              <MdPermIdentity className={maroon} size={16} />
              Account Number
            </label>
            <input 
              type="text" 
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number"
            />
          </div>
          
          <div className="flex flex-col">
            <label className={`${maroon} text-xs font-medium flex items-center gap-1.5 mb-1`}>
              <MdDateRange className={maroon} size={16} />
              From Bill Cycle
            </label>
            <select 
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent text-gray-700"
              value={fromBillCycle}
              onChange={(e) => setFromBillCycle(e.target.value)}
            >
              <option value="">Select bill cycle</option>
              {months.map((month) => (
                <option key={month.yrMonth} value={month.yrMonth}>
                  {month.yrMonth}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full mt-6 flex justify-end">
          <button 
            className={`px-6 py-2 rounded-md font-medium text-xs transition-opacity duration-300 shadow text-white flex items-center justify-center min-w-[120px] ${
              loading ? "bg-gray-400 cursor-not-allowed" : `${maroonGrad} hover:opacity-90`
            }`}
            onClick={handleViewDetails}
            disabled={loading}
          >
            {loading ? "Loading..." : "View Details"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistoryOrdinary;
