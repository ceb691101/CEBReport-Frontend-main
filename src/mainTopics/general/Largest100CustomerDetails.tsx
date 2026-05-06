import React, { useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface TopCustomerRecord {
  accountNumber: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  kwh: number;
  totalAmount: number;
}

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

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const extractBillCycle = (payload: any): string => {
  const data = payload?.data ?? payload ?? {};
  return String(
    data?.BillCycle ?? data?.billCycle ?? data?.bill_cycle ??
    data?.MaxBillCycle ?? data?.maxBillCycle ?? ""
  ).trim();
};

const extractRecords = (payload: any): any[] => {
  const data = payload?.data ?? payload ?? {};
  return data?.records ?? data?.Records ?? [];
};

const escapeCsv = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const TopCustomers: React.FC = () => {
  const maroon     = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── Form state ──────────────────────────────────────────────────────────────
  const [takeCount, setTakeCount] = useState<number>(100);

  // ── Loading / error ─────────────────────────────────────────────────────────
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError]     = useState("");

  // ── Report state ─────────────────────────────────────────────────────────────
  const [reportData, setReportData]               = useState<TopCustomerRecord[]>([]);
  const [resolvedBillCycle, setResolvedBillCycle] = useState("");
  const [hasSearched, setHasSearched]             = useState(false);

  // ── Search / filter ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Fetch report — always uses max bill cycle from the backend ────────────────
  const fetchReport = useCallback(async () => {
    const takeSnapshot = takeCount <= 0 ? 100 : takeCount;

    setLoadingReport(true);
    setReportError("");

    try {
      const response = await apiFetch<any>(
        `/misapi/api/dashboard/top-customers/list?take=${takeSnapshot}`
      );

      if (response.errorMessage) {
        setReportError(response.errorMessage);
        return;
      }

      const records = extractRecords(response.data);
      if (!Array.isArray(records) || records.length === 0) {
        setReportError("No data available for the current bill cycle.");
        return;
      }

      const mapped: TopCustomerRecord[] = records.map((item: any) => ({
        accountNumber: item.AccountNumber ?? item.accountNumber ?? "",
        name:          item.Name          ?? item.name          ?? "",
        addressLine1:  item.AddressLine1  ?? item.addressLine1  ?? "",
        addressLine2:  item.AddressLine2  ?? item.addressLine2  ?? "",
        city:          item.City          ?? item.city          ?? "",
        kwh:           Number(item.Kwh    ?? item.kwh           ?? 0),
        totalAmount:   Number(item.TotalAmount ?? item.totalAmount ?? 0),
      }));

      setReportData(mapped);
      setResolvedBillCycle(extractBillCycle(response.data) || "—");
      setHasSearched(true);
      setSearchQuery("");
    } catch (err: any) {
      setReportError(err.message || "Failed to fetch report data. Please try again.");
    } finally {
      setLoadingReport(false);
    }
  }, [takeCount]);

  // ── Filtered rows ─────────────────────────────────────────────────────────────
  const filteredData = searchQuery.trim()
    ? reportData.filter((r) => {
        const q = searchQuery.toLowerCase();
        return (
          r.accountNumber.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.addressLine1.toLowerCase().includes(q)
        );
      })
    : reportData;

  // ── Shared UI helpers ─────────────────────────────────────────────────────────
  const spinnerIcon = (
    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  const handleBackToForm = () => {
    setHasSearched(false);
    setReportData([]);
    setReportError("");
    setResolvedBillCycle("");
    setSearchQuery("");
  };

  // ── Export CSV ────────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (!reportData.length) { setReportError("No data to export."); return; }
    const header = ["#", "Account No.", "Customer Name", "Address Line 1", "Address Line 2", "City", "Consumption (kWh)", "Total Amount"];
    const rows   = reportData.map((r, i) => [
      i + 1, r.accountNumber, r.name, r.addressLine1, r.addressLine2, r.city,
      r.kwh.toFixed(2), r.totalAmount.toFixed(2),
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    downloadTextFile(
      `top-customers_cycle-${resolvedBillCycle}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  };

  // ── Export PDF ────────────────────────────────────────────────────────────────
  const handleExportPdf = () => {
    if (!reportData.length) { setReportError("No data to export."); return; }
    const title    = "Largest Customers by Consumption";
    const subtitle = `Bill Cycle: ${resolvedBillCycle} &nbsp;|&nbsp; Top ${reportData.length} Customers`;
    const totalKwh    = reportData.reduce((s, r) => s + r.kwh, 0);
    const totalAmount = reportData.reduce((s, r) => s + r.totalAmount, 0);

    const rowsHtml = reportData.map((r, i) => `<tr>
      <td style="border:1px solid #999;padding:4px 6px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #999;padding:4px 6px;font-family:monospace">${escapeCsv(r.accountNumber)}</td>
      <td style="border:1px solid #999;padding:4px 6px">${escapeCsv(r.name)}</td>
      <td style="border:1px solid #999;padding:4px 6px">${escapeCsv(r.addressLine1)}${r.addressLine2 ? ", " + escapeCsv(r.addressLine2) : ""}</td>
      <td style="border:1px solid #999;padding:4px 6px">${escapeCsv(r.city)}</td>
      <td style="border:1px solid #999;padding:4px 6px;text-align:right;font-family:monospace">${fmt(r.kwh)}</td>
      <td style="border:1px solid #999;padding:4px 6px;text-align:right;font-family:monospace">${fmt(r.totalAmount)}</td>
    </tr>`).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;margin:20px;color:#111}
  h1{font-size:14px;margin:0 0 4px;color:#7A0000}
  .sub{font-size:10px;margin:0 0 10px;color:#444}
  table{width:100%;border-collapse:collapse;font-size:9px}
  th,td{border:1px solid #999;padding:4px 6px;vertical-align:top}
  th{background:#b0e0e8;text-align:left}
  th.r,td.r{text-align:right}
  tfoot td{font-weight:bold;background:#f3f4f6}
  @page{size:A4 landscape;margin:10mm}
</style>
</head><body>
<h1>${title}</h1><p class="sub">${subtitle}</p>
<table>
  <thead><tr>
    <th style="width:28px">#</th><th>Account No.</th><th>Customer Name</th>
    <th>Address</th><th>City</th>
    <th class="r">Consumption (kWh)</th><th class="r">Total Amount</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
  <tfoot><tr>
    <td colspan="5" style="text-align:right">Total</td>
    <td class="r">${fmt(totalKwh)}</td>
    <td class="r">${fmt(totalAmount)}</td>
  </tr></tfoot>
</table></body></html>`;

    const w = window.open("", "_blank");
    if (!w) { setReportError("Popup blocked. Please allow popups to export PDF."); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => { w.print(); setTimeout(() => w.close(), 500); }, 250);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">

      {/* ── FORM ──────────────────────────────────────────────────────────────── */}
      {!hasSearched && (
        <>
          <div className="mb-6">
            <h2 className={`text-xl font-bold ${maroon}`}>
              Largest Customers – Consumption Wise
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Displays top customers for the latest bill cycle
            </p>
          </div>

          <div className="space-y-5">

            {/* ── Number of Customers ─────────────────────────────────────────── */}
            <div className="flex flex-col">
              <label className={`text-xs font-medium mb-2 ${maroon}`}>
                Number of Top Customers:
              </label>
              <div className="flex flex-wrap items-center gap-4">
                {[10, 25, 50, 100].map((n) => (
                  <label key={n} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="takeCount"
                      value={n}
                      checked={takeCount === n}
                      onChange={() => setTakeCount(n)}
                      className="accent-[#7A0000]"
                    />
                    <span className="text-xs text-gray-700">{n}</span>
                  </label>
                ))}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="takeCount"
                    checked={![10, 25, 50, 100].includes(takeCount)}
                    onChange={() => setTakeCount(0)}
                    className="accent-[#7A0000]"
                  />
                  <span className="text-xs text-gray-700">Custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={![10, 25, 50, 100].includes(takeCount) && takeCount > 0 ? takeCount : ""}
                    onChange={(e) => setTakeCount(Number(e.target.value))}
                    onFocus={() => { if ([10, 25, 50, 100].includes(takeCount)) setTakeCount(0); }}
                    placeholder="e.g. 200"
                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  />
                </label>
              </div>
            </div>

            {/* ── Submit button ───────────────────────────────────────────────── */}
            <div>
              <button
                onClick={fetchReport}
                disabled={loadingReport || takeCount <= 0}
                className={`px-5 py-1.5 rounded-md font-medium text-xs shadow transition-opacity
                  ${maroonGrad} text-white
                  ${loadingReport || takeCount <= 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90"}`}
              >
                {loadingReport
                  ? <span className="flex items-center gap-2">{spinnerIcon} Loading...</span>
                  : "Generate Report"}
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

      {/* ── REPORT ────────────────────────────────────────────────────────────── */}
      {hasSearched && (
        <div>

          {/* Report header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
            <div>
              <h2 className={`text-xl font-bold ${maroon}`}>
                Largest Customers – Consumption Wise
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Bill Cycle: <strong>{resolvedBillCycle}</strong>
                {" "}| Showing: <strong>{reportData.length}</strong> customers
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Search filter */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, acc, city…"
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent w-44"
              />

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

          {/* Search result count */}
          {searchQuery.trim() && (
            <p className="text-xs text-gray-500 mb-2">
              Showing {filteredData.length} of {reportData.length} results for &ldquo;{searchQuery}&rdquo;
            </p>
          )}

          {/* Table */}
          <div className="overflow-x-auto max-h-[calc(100vh-350px)] border border-gray-300 rounded-lg">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#b0e0e8] text-gray-800 sticky top-0 z-10">
                  <th className="border border-gray-300 px-3 py-2 text-center font-bold w-10">#</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-bold">Account No.</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-bold">Customer Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-bold">Address Line 1</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-bold">Address Line 2</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-bold">City</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-bold">Consumption (kWh)</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-bold">Total Amount</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-gray-300 px-3 py-6 text-center text-gray-400">
                      No records match your search.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((r, i) => (
                    <tr key={`${r.accountNumber}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-3 py-1 text-center text-gray-400">
                        {reportData.indexOf(r) + 1}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 font-mono">{r.accountNumber}</td>
                      <td className="border border-gray-300 px-3 py-1">{r.name}</td>
                      <td className="border border-gray-300 px-3 py-1">{r.addressLine1}</td>
                      <td className="border border-gray-300 px-3 py-1">{r.addressLine2}</td>
                      <td className="border border-gray-300 px-3 py-1">{r.city}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.kwh)}</td>
                      <td className="border border-gray-300 px-3 py-1 text-right font-mono">{fmt(r.totalAmount)}</td>
                    </tr>
                  ))
                )}
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

export default TopCustomers;