import React, { useState, useRef } from "react";
import { MdPermIdentity } from "react-icons/md";
import { FaFileDownload, FaPrint } from "react-icons/fa";

export interface SettlementRecord {
  billMonth: string;
  fromDate: string;
  toDate: string;
  kwhUnits: number;
  kwhCharge: number;
  payments: number;
  openingBalance: number;
  closingBalance: number;
  billProcessTime: string;
  requestTimeBank: string;
  requestStatus: string;
}

export interface CustomerSettlementData {
  name: string;
  address: string;
  accountNumber: string;
  status: string;
  records: SettlementRecord[];
}

const formatCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return "0.00";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const StandingOrder: React.FC = () => {
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomerSettlementData | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const handleViewDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanAcct = accountNumber.trim();
    if (!cleanAcct) {
      setError("Please enter an Account Number.");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(
        `/misapi/api/customerdetails/standing-order-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acctNo: cleanAcct }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        const resData = json.data || json;

        if (resData) {
          const isRegistered = resData.isRegistered ?? resData.IsRegistered;
          const errMsg =
            resData.errorMessage ||
            resData.ErrorMessage ||
            json.errorMessage ||
            json.ErrorMessage;

          if (
            isRegistered === false ||
            errMsg?.toLowerCase().includes("not registered")
          ) {
            setError("Customer not registered for this service.");
            setData(null);
            return;
          }

          if (errMsg) {
            setError(errMsg);
            setData(null);
            return;
          }

          if (!isRegistered) {
            setError("Customer not registered for this service.");
            setData(null);
            return;
          }

          const formatted: CustomerSettlementData = {
            name: resData.name || resData.Name || "",
            address: resData.address || resData.Address || "",
            accountNumber: resData.accountNumber || resData.AccountNumber || cleanAcct,
            status: resData.status || resData.Status || "Active",
            records: (resData.records || resData.Records || []).map((r: any) => ({
              billMonth: r.billMonth || r.BillMonth || "",
              fromDate: r.fromDate || r.FromDate || "",
              toDate: r.toDate || r.ToDate || "",
              kwhUnits: Number(r.kwhUnits ?? r.KwhUnits ?? 0),
              kwhCharge: Number(r.kwhCharge ?? r.KwhCharge ?? 0),
              payments: Number(r.payments ?? r.Payments ?? 0),
              openingBalance: Number(r.openingBalance ?? r.OpeningBalance ?? 0),
              closingBalance: Number(r.closingBalance ?? r.ClosingBalance ?? 0),
              billProcessTime: r.billProcessTime || r.BillProcessTime || "",
              requestTimeBank: r.requestTimeBank || r.RequestTimeBank || "",
              requestStatus: r.requestStatus || r.RequestStatus || "fetched",
            })),
          };

          setData(formatted);
          return;
        }
      }

      setError("Failed to retrieve standing order details. Please verify backend connection.");
      setData(null);
    } catch (err: any) {
      console.error("API request error:", err);
      setError("Network or API error while connecting to server.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setData(null);
    setError(null);
  };

  const printPDF = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;

    const generatedDate = new Date().toLocaleDateString();
    const generatedTime = new Date().toLocaleTimeString();

    printWindow.document.write(`
      <html>
        <head>
          <title>Automatic Bill Settlement Inquiry</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 10mm; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; font-size: 11px; }
            th { background-color: #f0f0f0 !important; color: black !important; text-align: left; font-weight: bold; }
            tr.bg-\\[\\#7A0000\\] { background-color: #f0f0f0 !important; color: black !important; }
            .grid { display: grid; }
            .grid-cols-\\[150px_1fr\\] { grid-template-columns: 150px 1fr; }
            .gap-y-3 { row-gap: 8px; }
            .text-xl { font-size: 16px; }
            .font-bold { font-weight: bold; }
            .mb-6 { margin-bottom: 16px; }
            .mb-8 { margin-bottom: 24px; }
            .text-\\[\\#7A0000\\] { color: #7A0000; }
            .flex { display: flex; }
            .justify-end { justify-content: flex-end; }
            .ml-4 { margin-left: 16px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-semibold { font-weight: 600; }
            .bg-white { background-color: white; }
            .bg-gray-50 { background-color: #f9fafb; }
            
            @page {
              margin-bottom: 18mm;
              @bottom-left {
                content: "Generated on: ${generatedDate} at ${generatedTime} | Reporting@2026";
                font-size: 9px;
                color: #666;
                font-family: Arial;
              }
              @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9px;
                color: #666;
                font-family: Arial;
              }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const downloadAsCSV = () => {
    if (!data || !data.records || !data.records.length) return;

    const rows: string[] = [];
    rows.push("Automatic Bill Settlement Inquiry (Standing Order) Report");
    rows.push(`Account Number,${data.accountNumber}`);
    rows.push(`Customer Name,${data.name}`);
    rows.push(`Address,"${data.address}"`);
    rows.push(`Status,${data.status}`);
    rows.push("");
    rows.push(
      "Bill Month,From Date,To Date,kwh Units,kwh Charge (Rs),Payments (Rs),Opening Balance (Rs),Closing Balance (Rs),Bill Process Time,Request Time Bank,Request Status"
    );

    data.records.forEach((r) => {
      rows.push(
        `"${r.billMonth}","${r.fromDate}","${r.toDate}",${r.kwhUnits},"${r.kwhCharge.toFixed(
          2
        )}","${r.payments.toFixed(2)}","${r.openingBalance.toFixed(
          2
        )}","${r.closingBalance.toFixed(2)}","${r.billProcessTime}","${
          r.requestTimeBank
        }","${r.requestStatus}"`
      );
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StandingOrder_${data.accountNumber}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // If data exists, render the report in the exact format of TransactionHistoryOrdinary / Customer Details
  if (data) {
    return (
      <div className="max-w-7xl mx-auto p-4 bg-white rounded-lg shadow border border-gray-100 font-sans text-sm">
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <div className="flex gap-2">
            <button
              onClick={downloadAsCSV}
              className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
            >
              <FaFileDownload className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={printPDF}
              className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition cursor-pointer"
            >
              <FaPrint className="w-3 h-3" /> PDF
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center shadow-sm transition cursor-pointer"
            >
              Back to Form
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-4 bg-white">
          <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
            Automatic Bill Settlement Inquiry
          </h2>

          <div className="grid grid-cols-[150px_1fr] gap-y-3 mb-8 text-sm text-gray-900 font-medium">
            <div>Account No</div>
            <div>{data.accountNumber}</div>

            <div>Name</div>
            <div>{data.name || "-"}</div>

            <div>Address</div>
            <div>{data.address || "-"}</div>

            <div>Status</div>
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  data.status?.toLowerCase() === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {data.status || "Active"}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto mt-4 print:max-h-none print:overflow-visible">
            <table className="w-full text-xs border-collapse border border-gray-200">
              <thead className="sticky top-0 z-10 bg-[#7A0000] print:table-row-group">
                <tr className="bg-[#7A0000] text-white">
                  <th className="p-2 text-left font-semibold">Bill Month</th>
                  <th className="p-2 text-left font-semibold">From Date</th>
                  <th className="p-2 text-left font-semibold">To Date</th>
                  <th className="p-2 text-right font-semibold">kwh Units</th>
                  <th className="p-2 text-right font-semibold">kwh Charge (Rs)</th>
                  <th className="p-2 text-right font-semibold">Payments (Rs)</th>
                  <th className="p-2 text-right font-semibold">Opening Balance (Rs)</th>
                  <th className="p-2 text-right font-semibold">Closing Balance (Rs)</th>
                  <th className="p-2 text-left font-semibold">Bill Process Time</th>
                  <th className="p-2 text-left font-semibold">Request Time Bank</th>
                  <th className="p-2 text-center font-semibold">Request Status</th>
                </tr>
              </thead>
              <tbody>
                {data.records && data.records.length > 0 ? (
                  data.records.map((record, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="p-2 border-b border-gray-100 font-medium">
                        {record.billMonth}
                      </td>
                      <td className="p-2 border-b border-gray-100">
                        {record.fromDate}
                      </td>
                      <td className="p-2 border-b border-gray-100">
                        {record.toDate}
                      </td>
                      <td className="p-2 text-right font-semibold border-b border-gray-100">
                        {record.kwhUnits}
                      </td>
                      <td className="p-2 text-right font-semibold border-b border-gray-100">
                        {formatCurrency(record.kwhCharge)}
                      </td>
                      <td className="p-2 text-right font-semibold border-b border-gray-100">
                        {formatCurrency(record.payments)}
                      </td>
                      <td className="p-2 text-right font-semibold border-b border-gray-100">
                        {formatCurrency(record.openingBalance)}
                      </td>
                      <td className="p-2 text-right font-semibold border-b border-gray-100">
                        {formatCurrency(record.closingBalance)}
                      </td>
                      <td className="p-2 border-b border-gray-100 text-gray-500 text-[11px]">
                        {record.billProcessTime}
                      </td>
                      <td className="p-2 border-b border-gray-100 text-gray-500 text-[11px]">
                        {record.requestTimeBank}
                      </td>
                      <td className="p-2 text-center border-b border-gray-100">
                        <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {record.requestStatus || "Fetched"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="p-4 text-center text-gray-500">
                      No settlement records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Render search form (matching TransactionHistoryOrdinary / Customer Details form layout)
  return (
    <div className="max-w-7xl mx-auto p-4 text-sm font-sans">
      <div className="border border-gray-200 rounded-xl p-4 bg-white shadow w-full">
        <h3 className={`text-xl font-bold mb-4 ${maroon}`}>
          Automatic Bill Settlement Inquiry (Standing Order)
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleViewDetails}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="flex flex-col">
              <label
                className={`${maroon} text-xs font-medium flex items-center gap-1.5 mb-1`}
              >
                <MdPermIdentity className={maroon} size={16} />
                Account Number
              </label>
              <input
                type="text"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter account number (e.g. 4107121402)"
              />
            </div>
          </div>

          <div className="w-full mt-6 flex justify-end">
            <button
              type="submit"
              className={`px-6 py-2 rounded-md font-medium text-xs transition-opacity duration-300 shadow text-white flex items-center justify-center min-w-[120px] ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : `${maroonGrad} hover:opacity-90 cursor-pointer`
              }`}
              disabled={loading}
            >
              {loading ? "Loading..." : "View Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StandingOrder;
