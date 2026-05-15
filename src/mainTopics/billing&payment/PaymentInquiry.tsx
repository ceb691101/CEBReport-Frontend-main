import React, { useState, useRef } from "react";
import { MdPermIdentity, MdDateRange, MdFileDownload, MdPrint } from "react-icons/md";

interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  paymentMode: string;
  reference: string;
  status: string;
  [key: string]: any;
}

interface POSCollectionRecord {
  id: string;
  date: string;
  counter: string;
  billType: string;
  amount: number;
  payMode: string;
  [key: string]: any;
}

interface PaymentInquiryResult {
  accountNumber: string;
  customerName: string;
  fromDate: string;
  toDate: string;
  totalAmount: number;
  paymentRecords: PaymentRecord[];
  errorMessage: string | null;
}

interface POSCollectionResult {
  province: string;
  area: string;
  counter: string;
  billType: string;
  payMode: string;
  date: string;
  totalAmount: number;
  totalTransactions: number;
  collectionRecords: POSCollectionRecord[];
  errorMessage: string | null;
}

const PaymentInquiry: React.FC = () => {
  const maroon = "text-[#800000]";
  const maroonBg = "bg-[#800000]";

  // Form State - Individual Payments
  const [acctNo, setAcctNo] = useState("");
  const [fromDate, setFromDate] = useState("");

  // Form State - POS Collection
  const [province, setProvince] = useState("");
  const [area, setArea] = useState("");
  const [counter, setCounter] = useState("");
  const [billType, setBillType] = useState("All");
  const [payMode, setPayMode] = useState("All");
  const [posDate, setPosDate] = useState("");

  // Result State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentInquiryResult | null>(null);
  const [posResult, setPosResult] = useState<POSCollectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"individual" | "pos" | null>(null);

  // Print refs
  const paymentPrintRef = useRef<HTMLDivElement>(null);
  const posPrintRef = useRef<HTMLDivElement>(null);

  // Mock data for dropdowns
  const provinces = [
    { id: "", label: "Select Province" },
    { id: "WN", label: "Western Province North" },
    { id: "WS", label: "Western Province South" },
    { id: "CC", label: "Colombo City" },
    { id: "NP", label: "Northern Province" },
    { id: "CP", label: "Central Province" },
  ];

  const areas = [
    { id: "", label: "Select Area" },
    { id: "A1", label: "Area 1" },
    { id: "A2", label: "Area 2" },
    { id: "A3", label: "Area 3" },
  ];

  const counters = [
    { id: "", label: "Select Counter" },
    { id: "C1", label: "Counter 1" },
    { id: "C2", label: "Counter 2" },
    { id: "C3", label: "Counter 3" },
  ];

  const billTypes = ["All", "Type A", "Type B", "Type C"];
  const payModes = ["All", "Cash", "Cheque", "Online"];

  const handlePaymentInquiry = async (type: "full" | "paymentsOnly") => {
    setLoading(true);
    setError(null);
    setPaymentResult(null);
    setActiveTab(null);

    try {
      if (!acctNo) throw new Error("Please enter Account Number");
      if (!fromDate) throw new Error("Please select From Date");

      const payload = {
        acctNo,
        fromDate,
        inquiryType: type,
      };

      // Mock API call - replace with actual endpoint
      const response = await fetch("/CEBINFO_API_2025/api/paymentinquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Mock response for demonstration
        const mockData: PaymentInquiryResult = {
          accountNumber: acctNo,
          customerName: "Sample Customer",
          fromDate,
          toDate: new Date().toISOString().split("T")[0],
          totalAmount: 15500.00,
          paymentRecords: [
            {
              id: "1",
              date: fromDate,
              amount: 5000,
              paymentMode: "Cash",
              reference: "REF001",
              status: "Completed",
            },
            {
              id: "2",
              date: new Date(new Date(fromDate).getTime() + 86400000).toISOString().split("T")[0],
              amount: 10500,
              paymentMode: "Cheque",
              reference: "CHK123456",
              status: "Completed",
            },
          ],
          errorMessage: null,
        };
        setPaymentResult(mockData);
        setActiveTab("individual");
      } else {
        const data: PaymentInquiryResult = await response.json();
        setPaymentResult(data);
        setActiveTab("individual");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch payment inquiry");
    } finally {
      setLoading(false);
    }
  };

  const handlePOSInquiry = async () => {
    setLoading(true);
    setError(null);
    setPosResult(null);
    setActiveTab(null);

    try {
      if (!province) throw new Error("Please select Province");
      if (!posDate) throw new Error("Please select Date");

      const payload = {
        province,
        area,
        counter,
        billType,
        payMode,
        date: posDate,
      };

      // Mock API call - replace with actual endpoint
      const response = await fetch("/CEBINFO_API_2025/api/poscollection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Mock response for demonstration
        const mockData: POSCollectionResult = {
          province,
          area,
          counter,
          billType,
          payMode,
          date: posDate,
          totalAmount: 125750.50,
          totalTransactions: 48,
          collectionRecords: [
            {
              id: "1",
              date: posDate,
              counter: counter || "All",
              billType: billType,
              amount: 5250.50,
              payMode: payMode,
            },
            {
              id: "2",
              date: posDate,
              counter: counter || "All",
              billType: billType,
              amount: 12500.00,
              payMode: payMode,
            },
          ],
          errorMessage: null,
        };
        setPosResult(mockData);
        setActiveTab("pos");
      } else {
        const data: POSCollectionResult = await response.json();
        setPosResult(data);
        setActiveTab("pos");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch POS collection data");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentPrint = () => {
    if (paymentPrintRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(paymentPrintRef.current.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handlePosPrint = () => {
    if (posPrintRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(posPrintRef.current.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const downloadPaymentCSV = () => {
    if (!paymentResult?.paymentRecords.length) return;

    const rows: string[] = [];
    rows.push("Payment Inquiry Report");
    rows.push(`Account Number,${paymentResult.accountNumber}`);
    rows.push(`Customer Name,${paymentResult.customerName}`);
    rows.push(`From Date,${paymentResult.fromDate}`);
    rows.push(`To Date,${paymentResult.toDate}`);
    rows.push(`Total Amount,"${paymentResult.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`);
    rows.push("");
    rows.push("Date,Amount,Payment Mode,Reference,Status");
    
    paymentResult.paymentRecords.forEach((record) => {
      rows.push(
        `${record.date},"${record.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}",${record.paymentMode},${record.reference},${record.status}`
      );
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Payment_Inquiry_${acctNo}.csv`;
    a.click();
  };

  const downloadPosCSV = () => {
    if (!posResult?.collectionRecords.length) return;

    const rows: string[] = [];
    rows.push("POS Collection Report");
    rows.push(`Province,${posResult.province}`);
    rows.push(`Area,${posResult.area}`);
    rows.push(`Counter,${posResult.counter}`);
    rows.push(`Date,${posResult.date}`);
    rows.push(`Total Amount,"${posResult.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}"`);
    rows.push(`Total Transactions,${posResult.totalTransactions}`);
    rows.push("");
    rows.push("Date,Counter,Bill Type,Amount,Pay Mode");
    
    posResult.collectionRecords.forEach((record) => {
      rows.push(
        `${record.date},${record.counter},${record.billType},"${record.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}",${record.payMode}`
      );
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS_Collection_${posResult.province}.csv`;
    a.click();
  };

  return (
    <div className="w-full max-w-[2000px] mx-auto p-2 sm:p-2 md:p-1">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      )}

      {/* Form Section */}
      <div className="grid grid-cols-1 gap-4 mb-4 p-4 rounded-lg shadow-sm border border-gray-100 w-full bg-white">
        {/* Individual Payments Section */}
        <div className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-xs font-semibold text-gray-800 mb-3">Individual Payments.....</h3>

          <div className="space-y-3">
            {/* Account Number */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 flex items-center gap-1.5 mb-1">
                <MdPermIdentity className={maroon} size={16} />
                Account No
              </label>
              <input
                type="text"
                value={acctNo}
                onChange={(e) => setAcctNo(e.target.value)}
                placeholder="e.g., 5390001419"
                className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              />
            </div>

            {/* From Date */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 flex items-center gap-1.5 mb-1">
                <MdDateRange className={maroon} size={16} />
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => handlePaymentInquiry("full")}
                disabled={loading}
                className={`w-full ${maroonBg} hover:bg-[#800000]/90 disabled:opacity-50 text-white font-medium py-2 px-3 rounded-md transition-colors text-xs h-8 flex items-center justify-center`}
              >
                {loading ? "Loading..." : "View Full Report"}
              </button>
              <button
                onClick={() => handlePaymentInquiry("paymentsOnly")}
                disabled={loading}
                className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2 px-3 rounded-md transition-colors text-xs h-8 flex items-center justify-center"
              >
                {loading ? "Loading..." : "View payments only"}
              </button>
              <p className="text-xs text-yellow-600">
                this option may be a little faster than above
              </p>
            </div>

            <div className="text-xs">
              <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                Preview latest update times of servers
              </a>
            </div>
          </div>
        </div>

        {/* POS Counter Collection Section */}
        <div className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-xs font-semibold text-gray-800 mb-3">POS Counter Collection Breakup.....</h3>

          <div className="space-y-3">
            {/* Province */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              >
                {provinces.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Area */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Area</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Counter */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Counter</label>
              <select
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
                className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              >
                {counters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bill Type */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Bill Type</label>
              <select
                value={billType}
                onChange={(e) => setBillType(e.target.value)}
                className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              >
                {billTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Pay Mode */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Pay Mode</label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              >
                {payModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={posDate}
                onChange={(e) => setPosDate(e.target.value)}
                className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors"
              />
            </div>

            {/* View Report Button */}
            <button
              onClick={handlePOSInquiry}
              disabled={loading}
              className={`w-full ${maroonBg} hover:bg-[#800000]/90 disabled:opacity-50 text-white font-medium py-2 px-3 rounded-md transition-colors text-xs h-8 flex items-center justify-center mt-2`}
            >
              {loading ? "Loading..." : "View Report"}
            </button>

            <p className="text-xs text-yellow-600">
              this option provides facility to access provincial server and extract information about payments
            </p>
          </div>
        </div>
      </div>

      {/* Results Section - Payment Inquiry */}
      {activeTab === "individual" && paymentResult && (
        <div ref={paymentPrintRef} className="mt-4 p-4 rounded-lg shadow-sm border border-gray-100 w-full bg-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className={`text-sm font-bold ${maroon} mb-2`}>Payment Inquiry Report</h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-600">Account Number</p>
                  <p className="font-semibold">{paymentResult.accountNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600">Customer Name</p>
                  <p className="font-semibold">{paymentResult.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-600">From Date</p>
                  <p className="font-semibold">{paymentResult.fromDate}</p>
                </div>
                <div>
                  <p className="text-gray-600">To Date</p>
                  <p className="font-semibold">{paymentResult.toDate}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePaymentPrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium text-gray-700 transition-colors"
              >
                <MdPrint size={16} />
                Print
              </button>
              <button
                onClick={downloadPaymentCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-md text-xs font-medium text-blue-700 transition-colors"
              >
                <MdFileDownload size={16} />
                Download
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">Total Payment Amount</p>
            <p className={`text-lg font-bold ${maroon}`}>
              {paymentResult.totalAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {/* Payment Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className={`${maroonBg} text-white`}>
                  <th className="p-2 text-left font-semibold">Date</th>
                  <th className="p-2 text-right font-semibold">Amount</th>
                  <th className="p-2 text-left font-semibold">Payment Mode</th>
                  <th className="p-2 text-left font-semibold">Reference</th>
                  <th className="p-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentResult.paymentRecords.map((record, idx) => (
                  <tr key={record.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-2 border-b border-gray-100">{record.date}</td>
                    <td className="p-2 text-right font-semibold border-b border-gray-100">
                      {record.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 border-b border-gray-100">{record.paymentMode}</td>
                    <td className="p-2 border-b border-gray-100">{record.reference}</td>
                    <td className="p-2 border-b border-gray-100">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results Section - POS Collection */}
      {activeTab === "pos" && posResult && (
        <div ref={posPrintRef} className="mt-4 p-4 rounded-lg shadow-sm border border-gray-100 w-full bg-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className={`text-sm font-bold ${maroon} mb-2`}>POS Collection Report</h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-600">Province</p>
                  <p className="font-semibold">{posResult.province}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-semibold">{posResult.date}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Transactions</p>
                  <p className="font-semibold">{posResult.totalTransactions}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePosPrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium text-gray-700 transition-colors"
              >
                <MdPrint size={16} />
                Print
              </button>
              <button
                onClick={downloadPosCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-md text-xs font-medium text-blue-700 transition-colors"
              >
                <MdFileDownload size={16} />
                Download
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">Total Collection Amount</p>
            <p className={`text-lg font-bold ${maroon}`}>
              {posResult.totalAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {/* Collection Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className={`${maroonBg} text-white`}>
                  <th className="p-2 text-left font-semibold">Date</th>
                  <th className="p-2 text-left font-semibold">Counter</th>
                  <th className="p-2 text-left font-semibold">Bill Type</th>
                  <th className="p-2 text-right font-semibold">Amount</th>
                  <th className="p-2 text-left font-semibold">Pay Mode</th>
                </tr>
              </thead>
              <tbody>
                {posResult.collectionRecords.map((record, idx) => (
                  <tr key={record.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-2 border-b border-gray-100">{record.date}</td>
                    <td className="p-2 border-b border-gray-100">{record.counter}</td>
                    <td className="p-2 border-b border-gray-100">{record.billType}</td>
                    <td className="p-2 text-right font-semibold border-b border-gray-100">
                      {record.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 border-b border-gray-100">{record.payMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentInquiry;
