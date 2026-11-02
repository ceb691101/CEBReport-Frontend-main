import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

interface BillCycleOption {
  BillCycle: number;
  Display: string;
  Code: string;
}

interface DropdownItem {
  Code: string;
  Name: string;
}

interface ReportRow {
  TariffName: string;
  TotalAmount: number;
}

interface ReportResponseData {
  ReportType: string;
  BillCycle: number;
  BillCycleLabel: string;
  Category: string;
  CategoryValue: string;
  InterestRate: number | null;
  InterestYear: number;
  GrandTotal: number;
  Rows: ReportRow[];
}

const fmt = (num: number | null | undefined, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const SecurityDepositInterestPayments: React.FC = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── Form State ─────────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState<string>("Bulk"); // "Bulk" or "Ordinary"
  const [billCycle, setBillCycle] = useState<string>("");
  const [reportCategory, setReportCategory] = useState<string>("Area"); // "Area", "Province", "Division", "Entire CEB"
  const [categoryValue, setCategoryValue] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [selectedBillCycleDisplay, setSelectedBillCycleDisplay] = useState<string>("");

  // ── Dropdown Lists ─────────────────────────────────────────────────────────
  const [billCycles, setBillCycles] = useState<BillCycleOption[]>([]);
  const [areas, setAreas] = useState<DropdownItem[]>([]);
  const [provinces, setProvinces] = useState<DropdownItem[]>([]);
  const [divisions, setDivisions] = useState<DropdownItem[]>([]);

  // ── Loading & Error States ─────────────────────────────────────────────────
  const [isLoadingCycles, setIsLoadingCycles] = useState<boolean>(false);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(false);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState<boolean>(false);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [billCycleError, setBillCycleError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // ── Report Visibility & Data ───────────────────────────────────────────────
  const [reportData, setReportData] = useState<ReportResponseData | null>(null);
  const [reportVisible, setReportVisible] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // ── 1. Fetch Bill Cycles when Consumer Type (Bulk / Ordinary) changes ───────
  useEffect(() => {
    const fetchBillCycles = async () => {
      setIsLoadingCycles(true);
      setBillCycleError(null);
      setBillCycles([]);
      setBillCycle("");
      setReportVisible(false);

      try {
        const typeParam = reportType.toLowerCase();
        const res = await fetch(`/misapi/api/security-deposit-interest/billcycles?type=${typeParam}`, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Failed to load bill cycles (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (json.errorMessage) {
          throw new Error(json.errorMessage);
        }

        const data: BillCycleOption[] = json.data || [];
        setBillCycles(data);
        if (data.length > 0) {
          setBillCycle(String(data[0].BillCycle));
        } else {
          setBillCycleError("No bill cycles available for this type.");
        }
      } catch (err: any) {
        setBillCycleError(err.message || "Failed to load bill cycles.");
      } finally {
        setIsLoadingCycles(false);
      }
    };

    fetchBillCycles();
  }, [reportType]);

  // ── 2. Fetch Areas, Provinces, and Divisions on mount ───────────────────────
  useEffect(() => {
    const fetchAreas = async () => {
      setIsLoadingAreas(true);
      try {
        const res = await fetch("/misapi/api/bulk/areas", { headers: { Accept: "application/json" } });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setAreas(
              json.data.map((a: any) => ({
                Code: String(a.AreaCode || a.area_code || a.code || "").trim(),
                Name: String(a.AreaName || a.area_name || a.name || "").trim(),
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error fetching areas:", err);
      } finally {
        setIsLoadingAreas(false);
      }
    };

    const fetchProvinces = async () => {
      setIsLoadingProvinces(true);
      try {
        const res = await fetch("/misapi/api/bulk/province", { headers: { Accept: "application/json" } });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setProvinces(
              json.data.map((p: any) => ({
                Code: String(p.ProvinceCode || p.prov_code || p.code || "").trim(),
                Name: String(p.ProvinceName || p.prov_name || p.name || "").trim(),
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error fetching provinces:", err);
      } finally {
        setIsLoadingProvinces(false);
      }
    };

    const fetchDivisions = async () => {
      setIsLoadingDivisions(true);
      try {
        const res = await fetch("/misapi/api/bulk/region", { headers: { Accept: "application/json" } });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            setDivisions(
              json.data.map((d: any) => ({
                Code: String(d.RegionCode || d.region_code || d.region || d.code || "").trim(),
                Name: String(d.RegionName || d.region_name || d.name || d.region || "").trim(),
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error fetching divisions:", err);
      } finally {
        setIsLoadingDivisions(false);
      }
    };

    fetchAreas();
    fetchProvinces();
    fetchDivisions();
  }, []);

  // 3. Reset category value when report category changes 
  useEffect(() => {
    setCategoryValue("");
    setSelectedCategoryName("");
  }, [reportCategory]);

  //Validation Guard 
  const canSubmit = () => {
    if (!billCycle) return false;
    if (reportCategory === "Entire CEB") return true;
    return !!categoryValue;
  };

  // Submit / Generate Report 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    setLoading(true);
    setReportError(null);

    try {
      const payload = {
        ReportType: reportType,
        BillCycle: parseInt(billCycle, 10),
        Category: reportCategory,
        CategoryValue: reportCategory === "Entire CEB" ? "" : categoryValue,
      };

      const res = await fetch("/misapi/api/security-deposit-interest/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      if (json.errorMessage) {
        throw new Error(json.errorMessage);
      }

      if (json.data && json.data.Rows && Array.isArray(json.data.Rows)) {
        setReportData(json.data);
        setReportVisible(true);

        const currentOpt = billCycles.find((o) => String(o.BillCycle) === String(billCycle));
        setSelectedBillCycleDisplay(currentOpt ? currentOpt.Display : billCycle);

        if (reportCategory === "Area") {
          const a = areas.find((x) => x.Code === categoryValue);
          setSelectedCategoryName(a ? `${a.Code} - ${a.Name}` : categoryValue);
        } else if (reportCategory === "Province") {
          const p = provinces.find((x) => x.Code === categoryValue);
          setSelectedCategoryName(p ? `${p.Code} - ${p.Name}` : categoryValue);
        } else if (reportCategory === "Division") {
          const d = divisions.find((x) => x.Code === categoryValue);
          setSelectedCategoryName(d ? `${d.Code} - ${d.Name}` : categoryValue);
        } else {
          setSelectedCategoryName("Entire CEB (All Island)");
        }
      } else {
        setReportError("No data available for the selected criteria.");
      }
    } catch (err: any) {
      setReportError(err.message || "Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── CSV Export 
  const downloadAsCSV = () => {
    if (!reportData || !reportData.Rows || reportData.Rows.length === 0) return;

    const rateText = reportData.InterestRate !== null ? `${reportData.InterestRate}%` : "N/A";
    const rows = [
      `"CEYLON ELECTRICITY BOARD"`,
      `"Security Deposit Interest Payments - ${reportData.ReportType}"`,
      `"Bill Month : ${selectedBillCycleDisplay}"`,
      `"Report Category : ${reportCategory} (${selectedCategoryName})"`,
      `"Applicable Interest Rate : ${rateText}"`,
      `"Generated At : ${new Date().toLocaleString()}"`,
      ``,
      `"#","Tariff Description","Interest Paid Amount (LKR)"`,
    ];

    reportData.Rows.forEach((r, idx) => {
      const safeDesc = `"${r.TariffName.replace(/"/g, '""')}"`;
      rows.push(`${idx + 1},${safeDesc},${r.TotalAmount.toFixed(2)}`);
    });

    rows.push(`,Grand Total,${reportData.GrandTotal.toFixed(2)}`);

    const blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SecurityDepositInterest_${reportData.ReportType}_Cycle${reportData.BillCycle}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Print Report ───────────────────────────────────────────────────────────
  const printReport = () => {
    if (!printRef.current || !reportData) return;

    const rateText = reportData.InterestRate !== null ? `${reportData.InterestRate}%` : "N/A";
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Security Deposit Interest Payments</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; margin: 15mm; }
            h2 { color: #7A0000; font-size: 15px; margin-bottom: 6px; }
            .meta { font-size: 12px; margin-bottom: 12px; color: #333; line-height: 1.5; }
            .meta span { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #e5e7eb; font-weight: bold; text-align: center; padding: 6px 8px; border: 1px solid #9ca3af; font-size: 11px; }
            td { padding: 5px 8px; border: 1px solid #d1d5db; font-size: 11px; vertical-align: top; }
            tr:nth-child(even) { background: #f9fafb; }
            .total-row td { background: #e5e7eb; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            @page { margin-bottom: 15mm; }
          </style>
        </head>
        <body>
          <h2>Security Deposit Interest Payments - ${reportData.ReportType}</h2>
          <div class="meta">
            ${reportCategory} : &nbsp;<span>${selectedCategoryName}</span><br>
            Bill Month : &nbsp;<span>${selectedBillCycleDisplay}</span><br>
            Applicable Interest Rate : &nbsp;<span>${rateText}</span>
          </div>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      {/* ── 1. FORM VIEW (When report is NOT visible) ────────────────────────── */}
      {!reportVisible && (
        <>
          <h1 className={`text-xl font-bold ${maroon} mb-4`}>
            Security Deposit Interest Payments
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Row: Consumer Type + Select Month */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Consumer Type */}
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${maroon}`}>
                  Select Consumer Type: <span className="text-red-600">*</span>
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent font-medium"
                  required
                >
                  <option value="Bulk">Bulk Consumers</option>
                  <option value="Ordinary">Ordinary Consumers</option>
                </select>
              </div>

              {/* Bill Cycle / Month */}
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${maroon}`}>
                  Select Month: <span className="text-red-600">*</span>
                </label>
                {isLoadingCycles ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Loading bill cycles...
                  </div>
                ) : billCycleError ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-red-50 text-red-600">
                    {billCycleError}
                  </div>
                ) : (
                  <select
                    value={billCycle}
                    onChange={(e) => setBillCycle(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent font-medium"
                    required
                  >
                    <option value="">Select Month</option>
                    {billCycles.map((o) => (
                      <option key={o.BillCycle} value={o.BillCycle}>
                        {o.Display}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Report Category */}
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${!billCycle ? "text-gray-400" : maroon}`}>
                  Select Report Category: <span className="text-red-600">*</span>
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  disabled={!billCycle}
                  className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent font-medium ${
                    !billCycle ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "border-gray-300"
                  }`}
                  required
                >
                  <option value="Area">Area</option>
                  <option value="Province">Province</option>
                  <option value="Division">Division</option>
                  <option value="Entire CEB">Entire CEB</option>
                </select>
              </div>
            </div>

            {/* Second Row: Specific Category Target (Area / Province / Division) */}
            {reportCategory !== "Entire CEB" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className={`text-xs font-medium mb-1 ${!billCycle ? "text-gray-400" : maroon}`}>
                    Select {reportCategory}: <span className="text-red-600">*</span>
                  </label>

                  {reportCategory === "Area" && (
                    <>
                      {isLoadingAreas ? (
                        <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                          Loading areas...
                        </div>
                      ) : (
                        <select
                          value={categoryValue}
                          onChange={(e) => setCategoryValue(e.target.value)}
                          disabled={!billCycle}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent font-medium"
                          required
                        >
                          <option value="">Select Area</option>
                          {areas.map((a) => (
                            <option key={a.Code} value={a.Code}>
                              {a.Code} - {a.Name}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}

                  {reportCategory === "Province" && (
                    <>
                      {isLoadingProvinces ? (
                        <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                          Loading provinces...
                        </div>
                      ) : (
                        <select
                          value={categoryValue}
                          onChange={(e) => setCategoryValue(e.target.value)}
                          disabled={!billCycle}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent font-medium"
                          required
                        >
                          <option value="">Select Province</option>
                          {provinces.map((p) => (
                            <option key={p.Code} value={p.Code}>
                              {p.Code} - {p.Name}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}

                  {reportCategory === "Division" && (
                    <>
                      {isLoadingDivisions ? (
                        <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                          Loading divisions...
                        </div>
                      ) : (
                        <select
                          value={categoryValue}
                          onChange={(e) => setCategoryValue(e.target.value)}
                          disabled={!billCycle}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent font-medium"
                          required
                        >
                          <option value="">Select Division</option>
                          {divisions.map((d) => (
                            <option key={d.Code} value={d.Code}>
                              {d.Code} - {d.Name}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="w-full mt-6 flex justify-end">
              <button
                type="submit"
                disabled={loading || !canSubmit()}
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow text-xs text-white ${maroonGrad} ${
                  loading || !canSubmit() ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs">
              {reportError}
            </div>
          )}
        </>
      )}

      {/* ── 2. REPORT VIEW (When report IS visible) ──────────────────────────── */}
      {reportVisible && reportData && (
        <div className="mt-2">
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-3 border-b border-gray-200 gap-3">
            <div>
              <h2 className={`text-lg font-bold ${maroon}`}>
                Security Deposit Interest Payments - {reportData.ReportType} for {reportCategory}
              </h2>
              <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  {reportCategory} : <strong className="text-gray-900">{selectedCategoryName}</strong>
                </span>
                <span>
                  Bill Month : <strong className="text-gray-900">{selectedBillCycleDisplay}</strong>
                </span>
                <span>
                  Applicable Interest Rate :{" "}
                  <strong className="text-[#7A0000]">
                    {reportData.InterestRate !== null ? `${reportData.InterestRate}%` : "Not Configured"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-2 md:mt-0">
              <button
                type="button"
                onClick={downloadAsCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              >
                <FaFileDownload className="w-3 h-3" /> CSV
              </button>
              <button
                type="button"
                onClick={printReport}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
              >
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportVisible(false);
                  setReportError(null);
                }}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center transition"
              >
                Back to Form
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div ref={printRef} className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-center w-16 font-bold text-gray-700">#</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-bold text-gray-700">Tariff Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-right font-bold text-gray-700">Interest Paid Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {reportData.Rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-gray-300 text-center py-6 text-gray-500">
                      No interest payment records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  reportData.Rows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-3 py-1.5 text-center text-gray-500 font-mono">
                        {i + 1}
                      </td>
                      <td className="border border-gray-300 px-4 py-1.5 font-medium text-gray-800">
                        {r.TariffName}
                      </td>
                      <td className="border border-gray-300 px-4 py-1.5 text-right font-mono font-semibold text-gray-900">
                        {fmt(r.TotalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {reportData.Rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-gray-900">
                    <td colSpan={2} className="border border-gray-300 px-4 py-2 text-right uppercase tracking-wider text-xs">
                      Grand Total (LKR):
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-mono text-sm text-[#7A0000]">
                      Rs. {fmt(reportData.GrandTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDepositInterestPayments;
