import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

interface Province {
  ProvinceCode: string;
  ProvinceName: string;
  ErrorMessage?: string | null;
}

interface Division {
  RegionCode: string;
  ErrorMessage?: string | null;
}

interface BillCycleOption {
  display: string;
  code: string;
}

export interface SolarPaymentLissReconItem {
  NetType: string;
  SchemeName: string;
  Ordinary: number;
  buLK: number;
  oLiss: number;
  Bliss: number;
}


interface SolarPaymentLissReconResponse {
  Rows: SolarPaymentLissReconItem[];
  GrandTotal: SolarPaymentLissReconItem;
  BillCycle: string;
  ReportCategory: string;
  TypeCode: string;
}

const formatNumber = (num: number | undefined | null, decimals: number = 2): string => {
  if (num === undefined || num === null || isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const SolarPaymentLissReconciliation: React.FC = () => {
  const MAROON = "text-[#7A0000]";
  const MAROON_GRAD = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // Filters
  const [reportCategory, setReportCategory] = useState<string>("Province");
  const [categoryValue, setCategoryValue] = useState<string>("");
  const [billCycle, setBillCycle] = useState<string>("");

  // Options
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);

  // Loading & error states
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [isLoadingBillCycles, setIsLoadingBillCycles] = useState(false);
  const [loading, setLoading] = useState(false);

  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [divisionError, setDivisionError] = useState<string | null>(null);
  const [billCycleError, setBillCycleError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Report display states
  const [reportVisible, setReportVisible] = useState(false);
  const [reportData, setReportData] = useState<SolarPaymentLissReconResponse | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [selectedBillCycleDisplay, setSelectedBillCycleDisplay] = useState<string>("");

  const printRef = useRef<HTMLDivElement>(null);

  // Fetch wrapper
  const fetchWithErrorHandling = async (url: string) => {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      let errorMsg = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.errorMessage) errorMsg = errorData.errorMessage;
      } catch {}
      throw new Error(errorMsg);
    }
    return response.json();
  };

  // Fetch Bill Cycles
  useEffect(() => {
    const fetchBillCycles = async () => {
      setIsLoadingBillCycles(true);
      setBillCycleError(null);
      try {
        const response = await fetchWithErrorHandling("/misapi/api/ordinary/areas/billcycle/min");
        const { BillCycles, MaxBillCycle } = response?.data ?? {};
        if (!Array.isArray(BillCycles) || !MaxBillCycle) {
          throw new Error("Invalid bill cycle data format");
        }
        const max = parseInt(MaxBillCycle);
        setBillCycleOptions(
          BillCycles.map((cycle: string, i: number) => ({
            display: `${max - i} - ${cycle}`,
            code: String(max - i),
          }))
        );
      } catch (err: any) {
        setBillCycleError(err.message || "Failed to load bill cycles");
      } finally {
        setIsLoadingBillCycles(false);
      }
    };
    fetchBillCycles();
  }, []);

  // Fetch Provinces
  useEffect(() => {
    if (reportCategory !== "Province") return;
    const fetchProvinces = async () => {
      setIsLoadingProvinces(true);
      setProvinceError(null);
      try {
        const response = await fetchWithErrorHandling("/misapi/api/ordinary/province");
        if (!Array.isArray(response?.data)) throw new Error("Invalid provinces data format");
        setProvinces(response.data);
      } catch (err: any) {
        setProvinceError(err.message || "Failed to load provinces");
      } finally {
        setIsLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, [reportCategory]);

  // Fetch Divisions
  useEffect(() => {
    if (reportCategory !== "Division") return;
    const fetchDivisions = async () => {
      setIsLoadingDivisions(true);
      setDivisionError(null);
      try {
        const response = await fetchWithErrorHandling("/misapi/api/ordinary/region");
        if (!Array.isArray(response?.data)) throw new Error("Invalid divisions data format");
        setDivisions(response.data);
      } catch (err: any) {
        setDivisionError(err.message || "Failed to load divisions");
      } finally {
        setIsLoadingDivisions(false);
      }
    };
    fetchDivisions();
  }, [reportCategory]);

  const canSubmit = () => {
    return !!reportCategory && !!categoryValue && !!billCycle;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    setLoading(true);
    setReportError(null);
    setReportData(null);

    try {
      const url = `/misapi/solarapi/payment-liss-recon?billCycle=${encodeURIComponent(
        billCycle
      )}&reportCategory=${encodeURIComponent(
        reportCategory
      )}&typeCode=${encodeURIComponent(categoryValue)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        let msg = `HTTP error! status: ${response.status}`;
        try {
          const d = await response.json();
          if (d.errorMessage) msg = d.errorMessage;
        } catch {}
        throw new Error(msg);
      }

      const result = await response.json();
      if (result.errorMessage) {
        throw new Error(result.errorMessage);
      }

      if (!result.data || !result.data.Rows || result.data.Rows.length === 0) {
        throw new Error("No data found for the selected criteria.");
      }

      setReportData(result.data);

      if (reportCategory === "Province") {
        const p = provinces.find((prov) => prov.ProvinceCode === categoryValue);
        setSelectedCategoryName(p ? `${p.ProvinceCode} - ${p.ProvinceName}` : categoryValue);
      } else {
        setSelectedCategoryName(categoryValue);
      }

      const cycle = billCycleOptions.find((o) => o.code === billCycle);
      setSelectedBillCycleDisplay(cycle?.display || billCycle);
      setReportVisible(true);
    } catch (err: any) {
      setReportError(err.message || "Failed to generate reconciliation report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Solar Payment & LISS Reconciliation Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
            h2 { color: #7A0000; margin-bottom: 4px; text-align: center; }
            p { margin: 2px 0 16px; text-align: center; font-size: 11px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
            th, td { border: 1px solid #aaa; padding: 6px 8px; }
            th { background-color: #f3f4f6; color: #333; text-align: center; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .bg-total { background-color: #e5e7eb; font-weight: bold; }
            @media print {
              @page { size: landscape; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <h2>Solar Payment & LISS Reconciliation Report</h2>
          <p>${reportCategory}: ${selectedCategoryName} | Bill Cycle: ${selectedBillCycleDisplay}</p>
          ${printContent}
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

  const handleDownloadCSV = () => {
    if (!reportData) return;

    const headers = [
      "Net Type",
      "Ordinary",
      "Bulk",
      "Ordinary Liss",
      "Bulk Liss",
    ];

    const rows = reportData.Rows.map((item) => [
      item.SchemeName,
      item.Ordinary.toFixed(2),
      item.buLK.toFixed(2),
      item.oLiss.toFixed(2),
      item.Bliss.toFixed(2),
    ]);

    const csvContent =

      "data:text/csv;charset=utf-8," +
      [`Solar Payment & LISS Reconciliation Report`]
        .concat([`${reportCategory}: ${selectedCategoryName}, Bill Cycle: ${selectedBillCycleDisplay}`])
        .concat([""])
        .concat([headers.join(",")])
        .concat(rows.map((e) => e.map((val) => `"${val}"`).join(",")))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Solar_Payment_LISS_Reconciliation_${reportCategory}_${categoryValue}_${billCycle}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const th = "border border-gray-300 px-4 py-2.5 text-center text-xs font-semibold text-gray-800 bg-gray-100";
  const td = "border border-gray-300 px-4 py-2 text-xs";

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {!reportVisible && (
        <>
          <h2 className={`text-xl font-bold mb-6 ${MAROON}`}>
            Solar Payment &amp; LISS Reconciliation Report
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category */}
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${MAROON}`}>
                  Select Report Category:
                </label>
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
                </select>
              </div>

              {/* Province or Division dropdown */}
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${MAROON}`}>
                  {reportCategory === "Province" ? "Select Province:" : "Select Division:"}
                </label>
                {reportCategory === "Province" ? (
                  <select
                    value={categoryValue}
                    onChange={(e) => setCategoryValue(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                    required
                  >
                    <option value="">Select Province</option>
                    {isLoadingProvinces ? (
                      <option>Loading...</option>
                    ) : provinceError ? (
                      <option>Error loading provinces</option>
                    ) : (
                      provinces.map((p) => (
                        <option key={p.ProvinceCode} value={p.ProvinceCode}>
                          {p.ProvinceCode} - {p.ProvinceName}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <select
                    value={categoryValue}
                    onChange={(e) => setCategoryValue(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                    required
                  >
                    <option value="">Select Division</option>
                    {isLoadingDivisions ? (
                      <option>Loading...</option>
                    ) : divisionError ? (
                      <option>Error loading divisions</option>
                    ) : (
                      divisions.map((d) => (
                        <option key={d.RegionCode} value={d.RegionCode}>
                          {d.RegionCode}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Bill Cycle */}
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${MAROON}`}>Select Bill Cycle:</label>
                <select
                  value={billCycle}
                  onChange={(e) => setBillCycle(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  required
                >
                  <option value="">Select Bill Cycle</option>
                  {isLoadingBillCycles ? (
                    <option>Loading...</option>
                  ) : billCycleError ? (
                    <option>Error loading bill cycles</option>
                  ) : (
                    billCycleOptions.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.display}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={loading || !canSubmit()}
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow ${MAROON_GRAD} text-white ${
                  loading || !canSubmit() ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "Generate Report"
                )}
              </button>
            </div>
          </form>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {reportError}
            </div>
          )}
        </>
      )}

      {reportVisible && reportData && (
        <div className="mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-xl font-bold ${MAROON}`}>
                Solar Payment &amp; LISS Reconciliation Report
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {reportCategory}: {selectedCategoryName} | Bill Cycle: {selectedBillCycleDisplay}
              </p>
            </div>
            <div className="flex flex-wrap items-center space-x-2 mt-2 md:mt-0">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 transition"
              >
                <FaFileDownload className="w-3 h-3" /> CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 transition"
              >
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button
                onClick={() => setReportVisible(false)}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white transition"
              >
                Back to Form
              </button>
            </div>
          </div>

          {/* Exact table structure requested: Net Type | Ordinary | buLK | o Liss | B liss */}
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] border border-gray-300 rounded-lg">
            <div ref={printRef} className="min-w-full py-4 px-2">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className={`${th} text-left w-1/3`}>Net Type</th>
                    <th className={th}>Ordinary</th>
                    <th className={th}>Bulk</th>
                    <th className={th}>Ordinary Liss</th>
                    <th className={th}>Bulk Liss</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.Rows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                      <td className={`${td} font-medium text-gray-900`}>
                        {row.SchemeName}
                      </td>
                      <td className={`${td} text-right text-gray-800`}>
                        {formatNumber(row.Ordinary)}
                      </td>
                      <td className={`${td} text-right text-gray-800`}>
                        {formatNumber(row.buLK)}
                      </td>
                      <td className={`${td} text-right text-gray-800`}>
                        {formatNumber(row.oLiss)}
                      </td>
                      <td className={`${td} text-right text-gray-800`}>
                        {formatNumber(row.Bliss)}
                      </td>
                    </tr>
                  ))}
                </tbody>


              </table>
            </div>
          </div>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {reportError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SolarPaymentLissReconciliation;
