import React, { useState, useRef } from "react";
import { MdPermIdentity, MdDateRange, MdFileDownload, MdPrint } from "react-icons/md";

interface PaymentRecord {
  id: string;
  paymentDate: string;
  amount: number;
  center: string;
  counter: string;
  counterName: string;
  paymentMode: string;
  chequeNo: string;
  stubNo: string;
  user: string;
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

interface LatestUpdateTimeRecord {
  agent: string;
  center: string;
  lastUpdate: string;
  agentName: string;
  centerName: string;
}

interface PaymentInquiryResult {
  accountNumber: string;
  areaName: string;
  customerName: string;
  customerType: string;
  address1: string;
  address2: string;
  address3: string;
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
  const maroon = "text-[#7A0000]";
  const maroonBg = "bg-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

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
  const [latestUpdateTimes, setLatestUpdateTimes] = useState<LatestUpdateTimeRecord[] | null>(null);
  const [latestUpdateError, setLatestUpdateError] = useState<string | null>(null);
  const [latestUpdateLoading, setLatestUpdateLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
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

  const handlePaymentInquiry = async () => {
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
      };

      const response = await fetch("/api/customerdetails/payment-full-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const payload_response = await response.json();

      if (!response.ok || payload_response?.errorMessage) {
        throw new Error(payload_response?.errorMessage || "Failed to fetch payment inquiry");
      }

      const backendData = payload_response?.data;

      if (!backendData) {
        throw new Error("No data returned from server");
      }

      const paymentRecords =
        backendData.paymentRecords ||
        backendData.PaymentRecords ||
        backendData.records ||
        backendData.Records ||
        [];

      // helper to read multiple possible key formats (camelCase, PascalCase, snake_case)
      const getVal = (r: any, ...names: string[]) => {
        for (const n of names) {
          if (r == null) continue;
          if (r[n] !== undefined && r[n] !== null) return r[n];
          const pascal = n.charAt(0).toUpperCase() + n.slice(1);
          if (r[pascal] !== undefined && r[pascal] !== null) return r[pascal];
          const snake = n.replace(/([A-Z])/g, "_$1").toLowerCase();
          if (r[snake] !== undefined && r[snake] !== null) return r[snake];
        }
        return undefined;
      };

      // helper to clean counter name by removing leading numbers and separators
      const cleanCounterName = (name: string) => {
        if (!name) return '';
        return name.replace(/^\d+[\s\-]*/, '').trim();
      };

      const mappedResult: PaymentInquiryResult = {
        accountNumber: backendData.accountNumber || backendData.AccountNumber || acctNo,
        areaName: backendData.areaName || backendData.AreaName || "",
        customerName: backendData.customerName || backendData.CustomerName || "",
        customerType: backendData.customerType || backendData.CustomerType || "",
        address1: backendData.address1 || backendData.Address1 || "",
        address2: backendData.address2 || backendData.Address2 || "",
        address3: backendData.address3 || backendData.Address3 || "",
        fromDate: backendData.fromDate || backendData.FromDate || fromDate,
        toDate: backendData.toDate || backendData.ToDate || new Date().toISOString().split("T")[0],
        totalAmount: Number(backendData.totalAmount ?? backendData.TotalAmount ?? 0),
        paymentRecords: paymentRecords.map((record: any, idx: number) => ({
          id: String(idx + 1),
          // core fields
          paymentDate: String(getVal(record, 'transDate', 'TransDate', 'trans_date') ?? ''),
          amount: Number(getVal(record, 'transAmt', 'TransAmt', 'trans_amt') ?? getVal(record, 'amount', 'Amount') ?? 0) || 0,
          center: String(getVal(record, 'center', 'Center') ?? ''),
          centerName: String(getVal(record, 'centerName', 'CenterName') ?? ''),
          centerDisplay: (() => {
            const centerValue = String(getVal(record, 'center', 'Center') ?? '');
            const centerDescValue = String(getVal(record, 'centerDescription', 'CenterDescription', 'centerType', 'CenterType', 'centerCategory', 'CenterCategory') ?? '');
            const centerNameValue = String(getVal(record, 'centerName', 'CenterName') ?? '');
            const parts = [centerValue, centerDescValue, centerNameValue].filter(p => p && p.trim());
            return parts.join(' - ');
          })(),
          counter: String(getVal(record, 'countNo', 'CountNo', 'count_no') ?? ''),
          counterName: cleanCounterName(String(getVal(record, 'counterName', 'CounterName') ?? '')),
          // payment mode / description
          paymentMode: String(getVal(record, 'codeDescription', 'CodeDescription', 'payMode', 'PayMode', 'pay_mode') ?? ''),
          // cheque / stub
          chequeNo: String(getVal(record, 'chequeMoneyOrderNo', 'ChequeMoneyOrderNo', 'cheque_money_order_no') ?? ''),
          stubNo: String(getVal(record, 'stubNo', 'StubNo') ?? ''),
          // user / agent
          user: String(getVal(record, 'usrLot', 'UsrLot', 'usr_lot') ?? ''),
          agent: String(getVal(record, 'agent', 'Agent') ?? ''),
          agentName: String(getVal(record, 'agentName', 'AgentName') ?? ''),
          transTime: String(getVal(record, 'transTime', 'TransTime', 'trans_time') ?? ''),
          transType: String(getVal(record, 'transType', 'TransType', 'trans_type') ?? ''),
          rawRecord: record,
        })),
        errorMessage: null,
      };

      setPaymentResult(mappedResult);
      setActiveTab("individual");
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

  const handlePreviewLatestUpdateTimes = async () => {
    setLatestUpdateLoading(true);
    setLatestUpdateError(null);
    setLatestUpdateTimes(null);

    try {
      const response = await fetch("/api/customerdetails/latest-update-times", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.errorMessage || "Failed to load latest update times");
      }

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      // backend returns { data: LatestUpdateTimeResponse, errorMessage }
      // LatestUpdateTimeResponse has `Records` (PascalCase) on the server model
      const raw = payload?.data || null;

      let records: any[] = [];

      if (!raw) {
        records = [];
      } else if (Array.isArray(raw)) {
        records = raw;
      } else if (Array.isArray(raw.records)) {
        records = raw.records;
      } else if (Array.isArray(raw.Records)) {
        records = raw.Records;
      } else if (Array.isArray(payload?.records)) {
        records = payload.records;
      } else if (Array.isArray(payload?.Records)) {
        records = payload.Records;
      }

      // Normalize property names to the frontend record shape
      const mapped = records.map((r: any) => ({
        agent: r.agent ?? r.Agent ?? "",
        center: r.center ?? r.Center ?? "",
        lastUpdate: r.lastUpdate ?? r.LastUpdate ?? "",
        agentName: r.agentName ?? r.AgentName ?? "",
        centerName: r.centerName ?? r.CenterName ?? "",
      }));

      setLatestUpdateTimes(mapped);
      setCurrentPage(1);
    } catch (err: any) {
      setLatestUpdateError(err.message || "Failed to load latest update times");
    } finally {
      setLatestUpdateLoading(false);
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
    rows.push(`Area Name,${paymentResult.areaName || ""}`);
    rows.push(`Customer Name,${paymentResult.customerName}`);
    rows.push(`Customer Type,${paymentResult.customerType || ""}`);
    rows.push(`Address,${[paymentResult.address1, paymentResult.address2, paymentResult.address3].filter(Boolean).join(" | ")}`);
    rows.push(`From Date,${paymentResult.fromDate}`);
    rows.push("");
    rows.push("Payment Date,Amount,Center,Counter,Counter Name,Pay Mode,Cheque No,Stub No,User");
    
    paymentResult.paymentRecords.forEach((record) => {
      rows.push(
        `${record.paymentDate},"${record.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}",${record.centerDisplay || record.center},${record.counter},${record.counterName},${record.paymentMode},${record.chequeNo || ""},${record.stubNo || ""},${record.user || ""}`
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
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      )}

      {/* Form Section */}
      <div className="grid grid-cols-1 gap-4 mb-4 p-4 rounded-lg shadow-sm border border-gray-100 w-full bg-white">
        {/* Individual Payments Section */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white shadow">
          <h3 className={`text-xl font-bold mb-4 ${maroon}`}>Individual Payments</h3>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 mb-3">
            {/* Account Number */}
            <div className="flex flex-col w-full sm:w-[24%]">
              <label className={`${maroon} text-xs font-medium flex items-center gap-1.5 mb-1`}>
                <MdPermIdentity className={maroon} size={16} />
                Account No
              </label>
              <input
                type="text"
                value={acctNo}
                onChange={(e) => setAcctNo(e.target.value)}
                placeholder="e.g., 5390001419"
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              />
            </div>

            {/* From Date */}
            <div className="flex flex-col w-full sm:w-[24%]">
              <label className={`${maroon} text-xs font-medium flex items-center gap-1.5 mb-1`}>
                <MdDateRange className={maroon} size={16} />
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              />
            </div>

            {/* View Full Report Button */}
            <button
              onClick={handlePaymentInquiry}
              disabled={loading}
              className={`w-full sm:w-[24%] px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow ${maroonGrad} text-white flex items-center justify-center ${loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"}`}
            >
              {loading ? "Loading..." : "View Full Report"}
            </button>
          </div>
        </div>

        <div className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-xs font-semibold text-gray-800">Latest Update Times of Servers</h3>
            <button
              type="button"
              onClick={handlePreviewLatestUpdateTimes}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded-md text-xs font-medium text-white transition-colors"
            >
              Preview latest update times of servers
            </button>
          </div>

          {latestUpdateError && (
            <div className="mb-3 p-3 rounded-lg border border-red-100 bg-red-50">
              <p className="text-xs text-red-600">{latestUpdateError}</p>
            </div>
          )}

          {latestUpdateTimes && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLatestUpdateTimes(null)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium text-gray-700 transition-colors"
                  >
                    Back
                  </button>
                  {latestUpdateLoading && <span className="text-xs text-gray-500">Loading...</span>}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-200">
                  <thead className="bg-[#7A0000] text-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Agent</th>
                      <th className="px-3 py-2 text-left font-semibold">Center</th>
                      <th className="px-3 py-2 text-left font-semibold">Last Update</th>
                      <th className="px-3 py-2 text-left font-semibold">Agent Name</th>
                      <th className="px-3 py-2 text-left font-semibold">Center Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestUpdateTimes.length > 0 ? (
                      (() => {
                        const total = latestUpdateTimes.length;
                        const totalPages = Math.max(1, Math.ceil(total / pageSize));
                        const safePage = Math.min(Math.max(1, currentPage), totalPages);
                        const start = (safePage - 1) * pageSize;
                        const end = Math.min(start + pageSize, total);
                        const pageRecords = latestUpdateTimes.slice(start, end);

                        return (
                          <>
                            {pageRecords.map((record, idx) => (
                              <tr key={`${record.agent}-${record.center}-${start + idx}`} className={(start + idx) % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                <td className="px-3 py-2 border-t border-gray-200">{record.agent}</td>
                                <td className="px-3 py-2 border-t border-gray-200">{record.center}</td>
                                <td className="px-3 py-2 border-t border-gray-200">{record.lastUpdate}</td>
                                <td className="px-3 py-2 border-t border-gray-200">{record.agentName}</td>
                                <td className="px-3 py-2 border-t border-gray-200">{record.centerName}</td>
                              </tr>
                            ))}
                          </>
                        );
                      })()
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-3 text-center text-gray-500 border-t border-gray-200">
                          No update times found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {latestUpdateTimes.length > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, latestUpdateTimes.length)} - {Math.min(currentPage * pageSize, latestUpdateTimes.length)} of {latestUpdateTimes.length}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="text-xs p-1 border border-gray-200 rounded bg-white"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                      >
                        Prev
                      </button>

                      {/* Page numbers */}
                      {(() => {
                        const total = latestUpdateTimes.length;
                        const totalPages = Math.max(1, Math.ceil(total / pageSize));
                        const pages: number[] = [];
                        for (let i = 1; i <= totalPages; i += 1) pages.push(i);
                        return pages.map((p) => (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`px-2 py-1 text-xs border rounded ${p === currentPage ? 'bg-[#7A0000] text-white' : 'bg-white'}`}
                          >
                            {p}
                          </button>
                        ));
                      })()}

                      <button
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={currentPage * pageSize >= latestUpdateTimes.length}
                        className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* POS Counter Collection Section */}
        <div className="border border-gray-100 rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-xs font-semibold text-gray-800 mb-3">POS Counter Collection Breakup</h3>

          {/* Row 1: Province | Area | Counter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 mb-3">
            {/* Province */}
            <div className="flex flex-col w-full sm:w-[32%]">
              <label className="text-xs text-gray-600 mb-1">Province</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              >
                {provinces.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Area */}
            <div className="flex flex-col w-full sm:w-[32%]">
              <label className="text-xs text-gray-600 mb-1">Area</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Counter */}
            <div className="flex flex-col w-full sm:w-[32%]">
              <label className="text-xs text-gray-600 mb-1">Counter</label>
              <select
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              >
                {counters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Bill Type | Pay Mode | Date */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 mb-3">
            {/* Bill Type */}
            <div className="flex flex-col w-full sm:w-[32%]">
              <label className="text-xs text-gray-600 mb-1">Bill Type</label>
              <select
                value={billType}
                onChange={(e) => setBillType(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              >
                {billTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Pay Mode */}
            <div className="flex flex-col w-full sm:w-[32%]">
              <label className="text-xs text-gray-600 mb-1">Pay Mode</label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              >
                {payModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="flex flex-col w-full sm:w-[32%]">
              <label className="text-xs text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={posDate}
                onChange={(e) => setPosDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
              />
            </div>
          </div>

          {/* Row 3: View Report Button and Info */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-xs text-yellow-600">
              this option provides facility to access provincial server and extract information about payments
            </p>

            {/* View Report Button */}
            <button
              onClick={handlePOSInquiry}
              disabled={loading}
              className={`w-full sm:w-[32%] ${maroonBg} hover:bg-[#7A0000]/90 disabled:opacity-50 text-white font-medium py-2 px-3 rounded-md transition-colors text-xs h-8 flex items-center justify-center`}
            >
              {loading ? "Loading..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section - Payment Inquiry */}
      {activeTab === "individual" && paymentResult && (
        <div ref={paymentPrintRef} className="mt-4 p-4 rounded-xl shadow border border-gray-200 w-full bg-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className={`text-xl font-bold ${maroon} mb-2`}>Payment Inquiry Report</h2>
              {/* Legacy-style header: Account & Area on one line, customer name/address highlighted below */}
              <div className="w-full text-sm mb-2">
                <div className="text-sm text-[#7A0000] font-semibold whitespace-pre-line">
                  {`Account No: ${paymentResult.accountNumber} Area : ${paymentResult.areaName || "-"} ${paymentResult.customerName} ${[paymentResult.address1, paymentResult.address2, paymentResult.address3].filter(Boolean).join(", ") || "-"}`}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePaymentPrint}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
              >
                <MdPrint size={16} />
                Print
              </button>
              <button
                onClick={downloadPaymentCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              >
                <MdFileDownload size={16} />
                Download
              </button>
              <button
                onClick={() => setActiveTab(null)}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center"
              >
                Back to Form
              </button>
            </div>
          </div>

          {/* Summary removed per request */}

          {/* Payment Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className={`${maroonBg} text-white`}>
                  <th className="p-2 text-left font-semibold">Payment Date</th>
                  <th className="p-2 text-right font-semibold">Amount</th>
                  <th className="p-2 text-left font-semibold">Center</th>
                  <th className="p-2 text-left font-semibold">Counter</th>
                  <th className="p-2 text-left font-semibold">Counter Name</th>
                  <th className="p-2 text-left font-semibold">Pay Mode</th>
                  <th className="p-2 text-left font-semibold">Cheque No</th>
                  <th className="p-2 text-left font-semibold">Stub No</th>
                  <th className="p-2 text-left font-semibold">User</th>
                </tr>
              </thead>
              <tbody>
                {paymentResult.paymentRecords.map((record, idx) => (
                  <tr key={record.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-2 border-b border-gray-100">{record.paymentDate}</td>
                    <td className="p-2 text-right font-semibold border-b border-gray-100">
                      {record.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 border-b border-gray-100 whitespace-pre-line">{record.centerDisplay || record.center}</td>
                    <td className="p-2 border-b border-gray-100">{record.counter}</td>
                    <td className="p-2 border-b border-gray-100">{record.counterName}</td>
                    <td className="p-2 border-b border-gray-100">{record.paymentMode}</td>
                    <td className="p-2 border-b border-gray-100">{record.chequeNo || "-"}</td>
                    <td className="p-2 border-b border-gray-100">{record.stubNo || "-"}</td>
                    <td className="p-2 border-b border-gray-100">{record.user || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Timestamp similar to legacy page */}
          <div className="mt-3 text-xs text-gray-600">{new Date().toLocaleString()}</div>
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
              <button
                onClick={() => setActiveTab(null)}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center"
              >
                Back to Form
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
