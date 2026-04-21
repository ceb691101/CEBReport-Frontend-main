import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Area {
  areaCode: string;
  areaName: string;
}

interface AreasPositionRow {
  readerCode: string;
  monthlyBill: string;
  totalBalance: string;
  noOfMonthsInArrears: string;
  noOfAccounts: string;
}

interface AreasPositionApiResult {
  billCycle: string;
  rows: AreasPositionRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API Base
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:44381";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function apiFetch<T>(
  url: string
): Promise<{ data: T | null; errorMessage: string | null }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      if (res.status === 404)
        throw new Error("API endpoint not found (404). Please check if the backend is running.");
      if (res.status === 500)
        throw new Error("Database error (500). Please check your database connection.");
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json"))
      throw new Error(`Expected JSON but got ${contentType}`);
    return await res.json();
  } catch (err: any) {
    if (err.name === "AbortError")
      return { data: null, errorMessage: "Request timeout. Please check your connection." };
    if (err.message.includes("Failed to fetch"))
      return {
        data: null,
        errorMessage: "Cannot connect to server. Please ensure the backend is running on port 44381.",
      };
    return { data: null, errorMessage: err.message };
  }
}

const parseNumber = (value: any): number => {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  const num = parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
};

// Build last-24-months bill cycle list going back from a given max cycle number.
// Bill cycles are sequential integers (e.g. 438 = latest month).
const buildBillCycleOptions = (maxCycle: string): string[] => {
  const max = parseInt(maxCycle, 10);
  if (isNaN(max)) return [maxCycle];
  const options: string[] = [];
  for (let i = 0; i < 24; i++) {
    options.push(String(max - i));
  }
  return options;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const AreasPosition: React.FC = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── Dropdown data ──────────────────────────────────────────────────────────
  const [areas, setAreas]                     = useState<Area[]>([]);
  const [billCycleOptions, setBillCycleOptions] = useState<string[]>([]);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedArea, setSelectedArea]         = useState("");
  const [selectedBillCycle, setSelectedBillCycle] = useState("");

  // ── Loading states ─────────────────────────────────────────────────────────
  const [loadingAreas, setLoadingAreas]       = useState(false);
  const [loadingCycles, setLoadingCycles]     = useState(false);
  const [loadingReport, setLoadingReport]     = useState(false);

  // ── Error states ───────────────────────────────────────────────────────────
  const [areaError, setAreaError]     = useState("");
  const [cycleError, setCycleError]   = useState("");
  const [reportError, setReportError] = useState("");

  // ── Report state ───────────────────────────────────────────────────────────
  const [reportData, setReportData]           = useState<AreasPositionRow[]>([]);
  const [resolvedBillCycle, setResolvedBillCycle] = useState("");
  const [selectedAreaName, setSelectedAreaName]   = useState("");
  const [hasSearched, setHasSearched]             = useState(false);

  // ── 1. Fetch areas on mount ────────────────────────────────────────────────
  useEffect(() => {
    const fetchAreas = async () => {
      setLoadingAreas(true);
      setAreaError("");
      try {
        const response = await apiFetch<any[]>(`${API_BASE}/api/shared/areas`);
        if (response.errorMessage) {
          setAreaError(response.errorMessage);
        } else if (response.data && Array.isArray(response.data)) {
          setAreas(
            response.data.map((item: any) => ({
              areaCode: item.AreaCode || item.areaCode || "",
              areaName: item.AreaName || item.areaName || "",
            }))
          );
        } else {
          setAreaError("No areas data received from server.");
        }
      } catch (err: any) {
        setAreaError(err.message || "Failed to load areas.");
      } finally {
        setLoadingAreas(false);
      }
    };
    fetchAreas();
  }, []);

  // ── 2. Fetch max bill cycle when area changes → build 24-month dropdown ────
  useEffect(() => {
    if (!selectedArea) {
      setBillCycleOptions([]);
      setSelectedBillCycle("");
      setCycleError("");
      return;
    }

    const fetchMaxCycle = async () => {
      setLoadingCycles(true);
      setCycleError("");
      setSelectedBillCycle("");
      setBillCycleOptions([]);

      try {
        const response = await apiFetch<{ billCycle: string }>(
          `${API_BASE}/api/areas-position/max-bill-cycle?areaCode=${encodeURIComponent(selectedArea)}`
        );

        if (response.errorMessage) {
          setCycleError(response.errorMessage);
          return;
        }

        const maxCycle = response.data?.billCycle;
        if (!maxCycle) {
          setCycleError("No bill cycle data found for this area.");
          return;
        }

        const options = buildBillCycleOptions(maxCycle);
        setBillCycleOptions(options);
        setSelectedBillCycle(options[0]); // default to latest (max)
      } catch (err: any) {
        setCycleError(err.message || "Failed to load bill cycles.");
      } finally {
        setLoadingCycles(false);
      }
    };

    fetchMaxCycle();
  }, [selectedArea]);

  // ── 3. Fetch report ────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!selectedArea || !selectedBillCycle) return;

    const areaCodeSnapshot  = selectedArea;
    const billCycleSnapshot = selectedBillCycle;
    const areaObj           = areas.find((a) => a.areaCode === areaCodeSnapshot);
    const areaNameSnapshot  = areaObj?.areaName ?? areaCodeSnapshot;

    setLoadingReport(true);
    setReportError("");

    try {
      const reportResponse = await apiFetch<AreasPositionApiResult>(
        `${API_BASE}/api/areas-position/report?areaCode=${encodeURIComponent(areaCodeSnapshot)}&billCycle=${encodeURIComponent(billCycleSnapshot)}`
      );

      if (reportResponse.errorMessage) {
        setReportError(reportResponse.errorMessage);
        return;
      }

      const result = reportResponse.data;

      if (!result || !Array.isArray(result.rows) || result.rows.length === 0) {
        setReportError("No data available for the selected area and bill cycle.");
        return;
      }

      const mappedRows: AreasPositionRow[] = result.rows.map((item: any) => ({
        readerCode:          item.ReaderCode          ?? item.readerCode          ?? "",
        monthlyBill:         item.MonthlyBill         ?? item.monthlyBill         ?? "0.00",
        totalBalance:        item.TotalBalance        ?? item.totalBalance        ?? "0.00",
        noOfMonthsInArrears: item.NoOfMonthsInArrears ?? item.noOfMonthsInArrears ?? "0.00",
        noOfAccounts:        item.NoOfAccounts        ?? item.noOfAccounts        ?? "0",
      }));

      setReportData(mappedRows);
      setResolvedBillCycle(result.billCycle ?? billCycleSnapshot);
      setSelectedAreaName(areaNameSnapshot);
      setHasSearched(true);
    } catch (err: any) {
      setReportError(err.message || "Failed to fetch report data. Please try again.");
    } finally {
      setLoadingReport(false);
    }
  }, [selectedArea, selectedBillCycle, areas]);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalMonthlyBill = reportData.reduce((s, r) => s + parseNumber(r.monthlyBill),  0);
  const totalBalance     = reportData.reduce((s, r) => s + parseNumber(r.totalBalance), 0);
  const totalAccounts    = reportData.reduce((s, r) => s + parseNumber(r.noOfAccounts), 0);

  // ── Shared UI helpers ──────────────────────────────────────────────────────
  const selectCls =
    "w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent";

  const loadingPlaceholder = (msg: string) => (
    <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
      {msg}
    </div>
  );

  const errorPlaceholder = (msg: string) => (
    <div className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-red-50 text-red-600">
      {msg}
    </div>
  );

  const spinnerIcon = (
    <svg
      className="animate-spin h-3 w-3 text-white"
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
  );

  const handleBackToForm = () => {
    setHasSearched(false);
    setReportData([]);
    setReportError("");
    setResolvedBillCycle("");
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const downloadTextFile = (filename: string, content: string, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const escapeCsv = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleExportCsv = () => {
    if (!reportData.length) { setReportError("No data to export."); return; }
    const header = ["Reader Code", "Monthly Bill", "Total Balance", "No. of Months in Arrears", "No. of Accounts"];
    const rows   = reportData.map((r) => [r.readerCode, r.monthlyBill, r.totalBalance, r.noOfMonthsInArrears, r.noOfAccounts]);
    const csv    = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    downloadTextFile(`areas-position_${selectedArea}_${resolvedBillCycle}_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
  };

  const handleExportPdf = () => {
    if (!reportData.length) { setReportError("No data to export."); return; }
    const title    = "Arrears Position \u2013 Meter Reader Wise";
    const subtitle = `Area: ${selectedAreaName} | Bill Cycle: ${resolvedBillCycle}`;
    const rowsHtml = reportData.map((r) => `<tr>
      <td style="border:1px solid #999;padding:5px 8px;text-align:center">${escapeCsv(r.readerCode)}</td>
      <td style="border:1px solid #999;padding:5px 8px;text-align:right">${r.monthlyBill}</td>
      <td style="border:1px solid #999;padding:5px 8px;text-align:right">${r.totalBalance}</td>
      <td style="border:1px solid #999;padding:5px 8px;text-align:right">${r.noOfMonthsInArrears}</td>
      <td style="border:1px solid #999;padding:5px 8px;text-align:right">${r.noOfAccounts}</td>
    </tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:15px;margin:0 0 4px}.sub{font-size:11px;margin:0 0 12px;color:#444}
table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #999;padding:5px 8px;vertical-align:top}
th{background:#b0e0e8}tfoot td{font-weight:bold;background:#f3f4f6}@page{size:A4 landscape;margin:12mm}</style>
</head><body><h1>${title}</h1><p class="sub">${subtitle}</p>
<table><thead><tr><th>Reader Code</th><th style="text-align:right">Monthly Bill</th><th style="text-align:right">Total Balance</th>
<th style="text-align:right">No. of Months in Arrears</th><th style="text-align:right">No. of Accounts</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr><td>Total</td>
<td style="text-align:right">${totalMonthlyBill.toLocaleString("en-US",{minimumFractionDigits:2})}</td>
<td style="text-align:right">${totalBalance.toLocaleString("en-US",{minimumFractionDigits:2})}</td>
<td></td><td style="text-align:right">${totalAccounts.toLocaleString("en-US")}</td></tr></tfoot>
</table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { setReportError("Popup blocked. Please allow popups to export PDF."); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => { w.print(); setTimeout(() => w.close(), 500); }, 250);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">

      {/* Connection warning */}
      {areaError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-sm text-yellow-800">⚠️ Database Connection Issues Detected</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Please ensure your backend API is running on port 44381 and the database is properly configured.
          </p>
        </div>
      )}

      {/* ── FORM ────────────────────────────────────────────────────────────── */}
      {!hasSearched && (
        <>
          <div className="mb-6">
            <h2 className={`text-xl font-bold ${maroon}`}>
              Arrears Position – Meter Reader Wise
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Select an area and bill cycle to view the meter reader arrears position
            </p>
          </div>

          <div className="space-y-5">

            {/* ── Area ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col">
              <label className={`text-xs font-medium mb-1 ${maroon}`}>
                Area: <span className="text-red-600">*</span>
              </label>
              {loadingAreas
                ? loadingPlaceholder("Loading areas...")
                : areaError
                ? errorPlaceholder(areaError)
                : (
                  <select
                    value={selectedArea}
                    onChange={(e) => {
                      setSelectedArea(e.target.value);
                      setReportError("");
                    }}
                    className={selectCls}
                  >
                    <option value="">Select Area</option>
                    {areas.map((area) => (
                      <option key={area.areaCode} value={area.areaCode}>
                        {area.areaCode} – {area.areaName}
                      </option>
                    ))}
                  </select>
                )}
            </div>

            {/* ── Bill Cycle ────────────────────────────────────────────────── */}
            <div className="flex flex-col">
              <label className={`text-xs font-medium mb-1 ${maroon}`}>
                Bill Cycle: <span className="text-red-600">*</span>
              </label>
              {!selectedArea ? (
                <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-400">
                  Please select an area first
                </div>
              ) : loadingCycles ? (
                loadingPlaceholder("Loading bill cycles...")
              ) : cycleError ? (
                errorPlaceholder(cycleError)
              ) : billCycleOptions.length === 0 ? (
                <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                  No bill cycles available for selected area
                </div>
              ) : (
                <select
                  value={selectedBillCycle}
                  onChange={(e) => setSelectedBillCycle(e.target.value)}
                  className={selectCls}
                >
                  {billCycleOptions.map((cycle) => (
                    <option key={cycle} value={cycle}>
                      {cycle}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ── Submit button ─────────────────────────────────────────────── */}
            <div>
              <button
                onClick={fetchReport}
                disabled={loadingReport || !selectedArea || !selectedBillCycle}
                className={`px-5 py-1.5 rounded-md font-medium text-xs shadow transition-opacity
                  ${maroonGrad} text-white
                  ${loadingReport || !selectedArea || !selectedBillCycle
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90"}`}
              >
                {loadingReport ? (
                  <span className="flex items-center gap-2">{spinnerIcon} Loading...</span>
                ) : (
                  "Generate Report"
                )}
              </button>
            </div>

          </div>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {reportError}
            </div>
          )}
        </>
      )}

      {/* ── REPORT ──────────────────────────────────────────────────────────── */}
      {hasSearched && (
        <div>
          {/* Report header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-xl font-bold ${maroon}`}>
                Arrears Position – Meter Reader Wise
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Area: <strong>{selectedAreaName}</strong>
                {resolvedBillCycle && (
                  <> | Bill Cycle: <strong>{resolvedBillCycle}</strong></>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
              {/* CSV */}
              <button
                onClick={handleExportCsv}
                disabled={!reportData.length}
                className={`flex items-center gap-1 px-3 py-1.5 border border-blue-400 rounded-md text-xs font-medium shadow-sm
                  ${!reportData.length ? "text-blue-300 bg-gray-50 cursor-not-allowed" : "text-blue-700 bg-white hover:bg-blue-50"}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v12a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>

              {/* PDF */}
              <button
                onClick={handleExportPdf}
                disabled={!reportData.length}
                className={`flex items-center gap-1 px-3 py-1.5 border border-green-400 rounded-md text-xs font-medium shadow-sm
                  ${!reportData.length ? "text-green-300 bg-gray-50 cursor-not-allowed" : "text-green-700 bg-white hover:bg-green-50"}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                PDF
              </button>

              {/* Back */}
              <button
                onClick={handleBackToForm}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white"
              >
                Back to Form
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[calc(100vh-350px)] border border-gray-300 rounded-lg">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#b0e0e8] text-gray-800 sticky top-0">
                  <th className="border border-gray-300 px-3 py-2 text-center font-bold">Reader Code</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-bold">Monthly Bill</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-bold">Total Balance</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-bold">No. of Months in Arrears</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-bold">No. of Accounts</th>
                </tr>
              </thead>

              <tbody>
                {reportData.map((r, i) => (
                  <tr key={`${r.readerCode}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-3 py-1 text-center font-mono">{r.readerCode}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right font-mono">{r.monthlyBill}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right font-mono">{r.totalBalance}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right font-mono">{r.noOfMonthsInArrears}</td>
                    <td className="border border-gray-300 px-3 py-1 text-right font-mono">{r.noOfAccounts}</td>
                  </tr>
                ))}
              </tbody>


            </table>
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

export default AreasPosition;