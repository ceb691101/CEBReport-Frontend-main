import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

interface JournalRow {
  AreaName: string;
  AccountNumber: string;
  NetType: string;
  SchemeName: string;
  JournalDescription: string;
  TxnAmount: number;
  AmountStatus: string;
}

interface ReportData {
  BillCycle: string;
  ReportCategory: string;
  TypeCode: string;
  Rows: JournalRow[];
  TotalAmount: number;
  TotalCredit?: number;
  TotalDebit?: number;
}

interface BillCycleOption {
  display: string;
  code: string;
}

const MAROON = "text-[#7A0000]";
const MAROON_GRAD = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

const SolarJournalsBulk: React.FC = () => {
  const [reportCategory, setReportCategory] = useState<string>("Province");
  const [categoryValue, setCategoryValue] = useState<string>("");
  const [billCycle, setBillCycle] = useState<string>("");

  const [provinces, setProvinces] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);

  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [selectedBillCycleDisplay, setSelectedBillCycleDisplay] = useState<string>("");

  const printRef = useRef<HTMLDivElement>(null);

  const fetchWithErrorHandling = async (url: string) => {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        let msg = `HTTP error! status: ${res.status}`;
        try {
          const d = await res.json();
          if (d.errorMessage) msg = d.errorMessage;
        } catch {}
        throw new Error(msg);
      }
      return res.json();
    } catch (err: any) {
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        throw new Error(
          "Cannot connect to backend server. Please verify network connection or server status."
        );
      }
      throw err;
    }
  };

  // Fetch Bill Cycles and Provinces on mount
  useEffect(() => {
    const initData = async () => {
      try {
        // Fetch Bulk Bill Cycles
        const bcRes = await fetchWithErrorHandling("/misapi/api/bulk/netmtcons/billcycle/max");
        const { BillCycles, MaxBillCycle } = bcRes?.data ?? {};
        if (Array.isArray(BillCycles) && MaxBillCycle) {
          const max = parseInt(MaxBillCycle);
          const options: BillCycleOption[] = BillCycles.map((cycle: string, i: number) => ({
            display: `${max - i} - ${cycle}`,
            code: String(max - i),
          }));
          setBillCycleOptions(options);
          if (options.length > 0) setBillCycle(options[0].code);
        }

        // Fetch Bulk Provinces
        const provRes = await fetchWithErrorHandling("/misapi/api/bulk/province");
        if (Array.isArray(provRes?.data)) {
          setProvinces(provRes.data);
        }
      } catch (err: any) {
        console.error("Error loading dropdown data:", err);
      }
    };

    initData();
  }, []);

  // Fetch Division when category changes
  useEffect(() => {
    setCategoryValue("");
    if (reportCategory === "Division") {
      fetchWithErrorHandling("/misapi/api/bulk/region")
        .then((res) => {
          if (Array.isArray(res?.data)) setDivisions(res.data);
        })
        .catch(console.error);
    }
  }, [reportCategory]);

  const canSubmit = () => {
    if (!billCycle) return false;
    if (reportCategory !== "EntireCEB" && !categoryValue) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    setLoading(true);
    setReportError(null);
    setReportData(null);

    try {
      const url = `/misapi/solarapi/solar-journals/bulk?billCycle=${encodeURIComponent(
        billCycle
      )}&reportCategory=${encodeURIComponent(reportCategory)}&typeCode=${encodeURIComponent(categoryValue)}`;

      const res = await fetchWithErrorHandling(url);
      if (res.errorMessage) throw new Error(res.errorMessage);

      if (!res.data || !res.data.Rows || res.data.Rows.length === 0) {
        throw new Error("No solar journal transactions found for the selected criteria.");
      }

      setReportData(res.data);

      // Set display names
      if (reportCategory === "Province") {
        const p = provinces.find((x) => x.ProvinceCode === categoryValue);
        setSelectedCategoryName(p ? `${p.ProvinceCode} - ${p.ProvinceName}` : categoryValue);
      } else if (reportCategory === "Division") {
        setSelectedCategoryName(categoryValue);
      } else {
        setSelectedCategoryName("Entire CEB");
      }

      const cycle = billCycleOptions.find((o) => o.code === billCycle);
      setSelectedBillCycleDisplay(cycle?.display || billCycle);

      setReportVisible(true);
    } catch (err: any) {
      setReportError(err.message || "Failed to load solar journals bulk report");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (val: number) =>
    (val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getDisplayStatus = (status: string) => {
    if (!status) return "";
    const s = status.trim();
    if (s === "-1" || s.toLowerCase().includes("credit") || s.toLowerCase() === "cr") return "Cr";
    if (s === "1" || s.toLowerCase().includes("debit") || s.toLowerCase() === "dr") return "Dr";
    return s;
  };

  const totalCredit =
    typeof reportData?.TotalCredit === "number" && reportData.TotalCredit > 0
      ? reportData.TotalCredit
      : reportData?.Rows?.reduce(
          (sum, r) => sum + (getDisplayStatus(r.AmountStatus) === "Cr" ? (r.TxnAmount || 0) : 0),
          0
        ) ?? 0;

  const totalDebit =
    typeof reportData?.TotalDebit === "number" && reportData.TotalDebit > 0
      ? reportData.TotalDebit
      : reportData?.Rows?.reduce(
          (sum, r) => sum + (getDisplayStatus(r.AmountStatus) === "Dr" ? (r.TxnAmount || 0) : 0),
          0
        ) ?? 0;

  const handleDownloadCSV = () => {
    if (!reportData) return;
    const headers = [
      "Area Name",
      "Account Number",
      "Net Type",
      "Transaction Type",
      "Credit (Rs.)",
      "Debit (Rs.)",
    ];

    const rows = reportData.Rows.map((r) => {
      const isCredit = getDisplayStatus(r.AmountStatus) === "Cr";
      const isDebit = getDisplayStatus(r.AmountStatus) === "Dr";
      return [
        r.AreaName,
        r.AccountNumber,
        r.SchemeName,
        r.JournalDescription,
        isCredit ? r.TxnAmount.toFixed(2) : "0.00",
        isDebit ? r.TxnAmount.toFixed(2) : "0.00",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [`Solar Journals - Bulk Report`]
        .concat([`${reportCategory}: ${selectedCategoryName} | Bill Cycle: ${selectedBillCycleDisplay}`])
        .concat([""])
        .concat([headers.join(",")])
        .concat(rows.map((e) => e.map((val) => `"${val}"`).join(",")))
        .concat([`"Total","","","","${totalCredit.toFixed(2)}","${totalDebit.toFixed(2)}"`])
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Solar_Journals_Bulk_${reportCategory}_${billCycle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Solar Journals - Bulk Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
            h2 { color: #7A0000; margin-bottom: 4px; }
            .meta { margin-bottom: 15px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .total-row { background-color: #eaeaea; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Solar Journals - Bulk Report</h2>
          <div class="meta">${reportCategory}: ${selectedCategoryName} | Bill Cycle: ${selectedBillCycleDisplay}</div>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const th = "border border-gray-300 px-4 py-2.5 text-center text-xs font-semibold text-gray-800 bg-gray-100";
  const td = "border border-gray-300 px-4 py-2 text-xs";

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {!reportVisible && (
        <>
          <h2 className={`text-xl font-bold mb-6 ${MAROON}`}>Solar Journals - Bulk Report</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category */}
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${MAROON}`}>Select Category:</label>
                <select
                  value={reportCategory}
                  onChange={(e) => {
                    setReportCategory(e.target.value);
                    setCategoryValue("");
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  required
                >
                  <option value="Province">Province</option>
                  <option value="Division">Division</option>
                  <option value="EntireCEB">Entire CEB</option>
                </select>
              </div>

              {/* Sub-Selection */}
              {reportCategory !== "EntireCEB" && (
                <div className="flex flex-col">
                  <label className={`text-xs font-medium mb-1 ${MAROON}`}>Select {reportCategory}:</label>
                  <select
                    value={categoryValue}
                    onChange={(e) => setCategoryValue(e.target.value)}
                    required
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  >
                    <option value="">Select {reportCategory}</option>
                    {reportCategory === "Province" &&
                      provinces.map((p) => (
                        <option key={p.ProvinceCode} value={p.ProvinceCode}>
                          {p.ProvinceCode} - {p.ProvinceName}
                        </option>
                      ))}
                    {reportCategory === "Division" &&
                      divisions.map((d) => (
                        <option key={d.RegionCode} value={d.RegionCode}>
                          {d.RegionCode}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Bill Cycle */}
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${MAROON}`}>Select Bill Cycle:</label>
                <select
                  value={billCycle}
                  onChange={(e) => setBillCycle(e.target.value)}
                  required
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                >
                  <option value="">Select Bill Cycle</option>
                  {billCycleOptions.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.display}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={loading || !canSubmit()}
                className={`px-6 py-2 rounded-md font-medium text-white shadow ${MAROON_GRAD} ${
                  loading || !canSubmit() ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
                }`}
              >
                {loading ? "Loading..." : "Generate Report"}
              </button>
            </div>
          </form>

          {loading && (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000]"></div>
              <span className="ml-3 text-sm text-gray-600">Loading Report Data...</span>
            </div>
          )}

          {reportError && (
            <div className="p-4 mt-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {reportError}
            </div>
          )}
        </>
      )}

      {reportVisible && reportData && (
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-xl font-bold ${MAROON}`}>Solar Journals - Bulk Report</h2>
              <p className="text-xs text-gray-500 mt-1">
                {reportCategory}: {selectedCategoryName} | Bill Cycle: {selectedBillCycleDisplay}
              </p>
            </div>
            <div className="flex flex-wrap items-center space-x-2 mt-2 md:mt-0">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded text-xs font-medium hover:bg-blue-50 transition"
              >
                <FaFileDownload className="w-3 h-3" /> CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded text-xs font-medium hover:bg-green-50 transition"
              >
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button
                onClick={() => setReportVisible(false)}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded text-white transition"
              >
                Back to Form
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-300 rounded-lg max-h-[calc(100vh-250px)]">
            <div ref={printRef} className="min-w-full py-2 px-2">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className={th}>#</th>
                    <th className={`${th} text-left`}>Area Name</th>
                    <th className={th}>Account Number</th>
                    <th className={`${th} text-left`}>Net Type</th>
                    <th className={`${th} text-left`}>Transaction Type</th>
                    <th className={`${th} text-right`}>Credit (Rs.)</th>
                    <th className={`${th} text-right`}>Debit (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.Rows.map((row, idx) => {
                    const isCredit = getDisplayStatus(row.AmountStatus) === "Cr";
                    const isDebit = getDisplayStatus(row.AmountStatus) === "Dr";
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                        <td className={`${td} text-center`}>{idx + 1}</td>
                        <td className={`${td} font-medium text-gray-800`}>{row.AreaName}</td>
                        <td className={`${td} text-center font-mono text-gray-700`}>{row.AccountNumber}</td>
                        <td className={td}>{row.SchemeName}</td>
                        <td className={td}>{row.JournalDescription}</td>
                        <td className={`${td} text-right font-semibold text-emerald-800`}>
                          {isCredit ? formatNumber(row.TxnAmount) : "-"}
                        </td>
                        <td className={`${td} text-right font-semibold text-blue-800`}>
                          {isDebit ? formatNumber(row.TxnAmount) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr className="bg-gray-200 font-bold">
                    <td colSpan={5} className={`${td} text-right font-bold text-gray-900`}>
                      Total:
                    </td>
                    <td className={`${td} text-right font-bold text-emerald-900`}>
                      {formatNumber(totalCredit)}
                    </td>
                    <td className={`${td} text-right font-bold text-blue-900`}>
                      {formatNumber(totalDebit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolarJournalsBulk;

