import React, { useState, useEffect, useCallback } from "react";
import { Download, Printer, X, RotateCcw, Eye } from "lucide-react";
import { toast } from "react-toastify";
import { useUser } from "../../contexts/UserContext";

export interface SMCLineDetailsByProvinceItem {
  dept_id: string | null;
  phase: string | null;
  connection_type: string | null;
  tariff_cat_code: string | null;
  loop_cable: string | null;
  wiring_type: string | null;
  prj_ass_dt: string | null;
  project_no: string | null;
  line_length: string | number | null;
  actual_cost: number | null;
  Standard_Cost: number | null;
  comp_nm: string | null;
}

interface Branch {
  compId: string;
  compName: string;
}

async function apiFetch<T>(
  url: string
): Promise<{ data: T | null; errorMessage: string | null }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "include",
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      if (res.status === 404)
        throw new Error("API endpoint not found (404). Please check if the backend is running.");
      if (res.status === 500)
        throw new Error("Database error (500). Please check your database connection.");
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${res.statusText}${txt ? " - " + txt : ""}`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json"))
      throw new Error(`Expected JSON but got ${contentType}`);
    return await res.json();
  } catch (err: any) {
    if (err.name === "AbortError" || err.name === "TimeoutError")
      return { data: null, errorMessage: "Request timeout. Please check your connection." };
    if (err.message.includes("Failed to fetch"))
      return { data: null, errorMessage: "Cannot connect to server. Please ensure the backend is running." };
    return { data: null, errorMessage: err.message };
  }
}

const parseNumber = (value: any): number => {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  const num = parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
};

const formatAmount = (v: any): string =>
  parseNumber(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatLineLengthToFixed = (v: any): string => {
  if (v === undefined || v === null || v === "") return "";
  const num = parseNumber(v);
  return isNaN(num) ? "" : num.toFixed(2);
};

const formatDateYYYYMMDD = (dateStr: any): string => {
  if (dateStr == null || dateStr === "") return "";
  let dt = String(dateStr).trim();
  if (!dt) return "";
  if (dt.includes("T")) {
    dt = dt.split("T")[0];
  } else if (dt.includes(" ")) {
    dt = dt.split(" ")[0];
  }
  const parts = dt.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    }
  }
  const clean = dt.replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (/^\d{8}$/.test(dt)) return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6)}`;
  return clean;
};

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
const currentDay = String(today.getDate()).padStart(2, "0");
const maxDate = `${currentYear}-${currentMonth}-${currentDay}`;
const minDate = `${currentYear - 20}-${currentMonth}-${currentDay}`;

const SMCLineDetailsByProvince: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // Filter states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [wiringType, setWiringType] = useState("ALL");

  // Report & view states
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<SMCLineDetailsByProvinceItem[]>([]);
  const [resolvedCompId, setResolvedCompId] = useState("");
  const [resolvedFromDate, setResolvedFromDate] = useState("");
  const [resolvedToDate, setResolvedToDate] = useState("");
  const [resolvedWiringType, setResolvedWiringType] = useState("ALL");
  const [hasSearched, setHasSearched] = useState(false);

  /* ────── Wiring Type label helper ────── */
  const getWiringTypeLabel = (type: string): string => {
    switch (type) {
      case "OH":
        return "Over Head";
      case "UG":
        return "Under Ground";
      case "ALL":
      default:
        return "All (Both OH & UG)";
    }
  };

  /* ────── Validation state ────── */
  const isDateRangeInvalid = Boolean(
    fromDate && toDate && new Date(toDate) < new Date(fromDate)
  );

  const isViewDisabled =
    loadingReport ||
    !selectedCompId.trim() ||
    !fromDate.trim() ||
    !toDate.trim() ||
    isDateRangeInvalid;

  /* ────── Fetch Province Branches ────── */
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {

        const res = await fetch(
          `/misapi/api/incomeexpenditure/Usercompanies/${encodeURIComponent(epfNo)}/60`
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const parsed = await res.json();
        let rawData: any[] = [];
        if (Array.isArray(parsed)) {
          rawData = parsed;
        } else if (parsed.data && Array.isArray(parsed.data)) {
          rawData = parsed.data;
        } else if (parsed.result && Array.isArray(parsed.result)) {
          rawData = parsed.result;
        }

        const final: Branch[] = rawData
          .map((item: any) => ({
            compId: (item.CompId ?? item.compId ?? item.COMP_ID ?? "").toString().trim(),
            compName: (item.CompNm ?? item.CompName ?? item.compName ?? item.COMP_NM ?? "").toString().trim(),
          }))
          .filter((b) => b.compId !== "");

        setBranches(final);
      } catch (err: any) {
        console.error("Failed to load branches:", err);
        toast.error("Failed to load branch list.");
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [epfNo]);

  /* ────── Fetch report ────── */
  const fetchReport = useCallback(async () => {
    setReportError(null);

    if (!selectedCompId) {
      toast.error("Please select a Branch (Province)");
      return;
    }
    if (!fromDate) {
      toast.error("Please select 'From Date'");
      return;
    }
    if (!toDate) {
      toast.error("Please select 'To Date'");
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      toast.error("'To Date' cannot be earlier than 'From Date'");
      return;
    }

    const compIdSnapshot = selectedCompId;
    const fromSnapshot = fromDate;
    const toSnapshot = toDate;
    const wiringTypeSnapshot = wiringType;

    setLoadingReport(true);

    try {
      const url = `/misapi/api/smc-line-details-by-province?compId=${encodeURIComponent(compIdSnapshot)}&fromDate=${encodeURIComponent(fromSnapshot)}&toDate=${encodeURIComponent(toSnapshot)}&wiringType=${encodeURIComponent(wiringTypeSnapshot)}`;
      const response = await apiFetch<any>(url);

      if (response.errorMessage) {
        toast.error(response.errorMessage);
        setReportError(response.errorMessage);
        return;
      }

      const raw: any = response;
      if (!raw || raw.success === false) {
        const msg = raw?.message || "No data returned from server.";
        toast.error(msg);
        setReportError(msg);
        return;
      }

      const rows: any[] = Array.isArray(raw.data) ? raw.data : Array.isArray(raw) ? raw : [];
      if (rows.length === 0) {
        toast.warn("No records found for the selected criteria.");
        return;
      }

      const trimStr = (v: any): string | null => {
        if (v === undefined || v === null) return null;
        const s = String(v).trim();
        return s.length ? s : null;
      };

      const parseNum = (v: any): number | null => {
        if (v === undefined || v === null || v === "") return null;
        const num = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
        return isNaN(num) ? null : num;
      };

      const mapped: SMCLineDetailsByProvinceItem[] = rows.map((item: any) => ({
        dept_id: trimStr(item.dept_id ?? item.DeptId ?? item.DEPT_ID),
        phase: trimStr(item.phase ?? item.Phase ?? item.PHASE),
        connection_type: trimStr(item.connection_type ?? item.ConnectionType ?? item.CONNECTION_TYPE),
        tariff_cat_code: trimStr(item.tariff_cat_code ?? item.TariffCatCode ?? item.TARIFF_CAT_CODE),
        loop_cable: trimStr(item.loop_cable ?? item.LoopCable ?? item.LOOP_CABLE),
        wiring_type: trimStr(item.wiring_type ?? item.WiringType ?? item.WIRING_TYPE),
        prj_ass_dt: trimStr(item.prj_ass_dt ?? item.PrjAssDt ?? item.PRJ_ASS_DT),
        project_no: trimStr(item.project_no ?? item.ProjectNo ?? item.PROJECT_NO),
        line_length: trimStr(item.line_length ?? item.LineLength ?? item.LINE_LENGTH),
        actual_cost: parseNum(item.actual_cost ?? item.ActualCost ?? item.ACTUAL_COST),
        Standard_Cost: parseNum(item.Standard_Cost ?? item.StandardCost ?? item.standard_cost ?? item.STANDARD_COST),
        comp_nm: trimStr(item.comp_nm ?? item.CompNm ?? item.COMP_NM),
      }));

      setReportData(mapped);
      setResolvedCompId(compIdSnapshot);
      setResolvedFromDate(fromSnapshot);
      setResolvedToDate(toSnapshot);
      setResolvedWiringType(wiringTypeSnapshot);
      setHasSearched(true);
      toast.success(`${mapped.length} records loaded successfully.`);
    } catch (err: any) {
      const msg = err.message || "Failed to fetch report data. Please try again.";
      toast.error(msg);
      setReportError(msg);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedCompId, fromDate, toDate, wiringType]);

  const clearFilters = () => {
    setSelectedCompId("");
    setFromDate("");
    setToDate("");
    setWiringType("ALL");
    setReportError(null);
    toast.info("Filters cleared.");
  };

  const closeReport = () => {
    setHasSearched(false);
    setReportData([]);
    setReportError(null);
  };

  const selectedBranchObj = branches.find((b) => b.compId === resolvedCompId);
  const resolvedBranchName = selectedBranchObj ? `${selectedBranchObj.compId} - ${selectedBranchObj.compName}` : resolvedCompId;
  const resolvedWiringTypeLabel = getWiringTypeLabel(resolvedWiringType);

  /* ────── Export helpers ────── */
  const handleExportCsv = () => {
    if (!reportData.length) {
      toast.error("No data to export.");
      return;
    }

    const titleRows = [
      `"SMC Line Details"`,
      `"Branch (Province): ${resolvedBranchName.replace(/"/g, '""')}"`,
      `"From ${resolvedFromDate} To ${resolvedToDate}"`,
      `"Wiring Type: ${resolvedWiringTypeLabel.replace(/"/g, '""')}"`,
      `""`,
    ];

    const headers = [
      "Department Code",
      "Phase",
      "Connection Type",
      "Tariff Category",
      "Loop Cable",
      "Wiring Type",
      "Project Assign Date",
      "Project No",
      "Line Length",
      "Actual Cost",
      "Standard Cost",
    ];

    const dataRows = reportData.map((r) => {
      const assDate = formatDateYYYYMMDD(r.prj_ass_dt);
      const lineLen = formatLineLengthToFixed(r.line_length) || "0.00";
      const actCost = r.actual_cost != null && r.actual_cost !== undefined ? parseNumber(r.actual_cost).toFixed(2) : "0.00";
      const stdCost = r.Standard_Cost != null && r.Standard_Cost !== undefined ? parseNumber(r.Standard_Cost).toFixed(2) : "0.00";

      const toExcelText = (val: string) => `="${val.replace(/"/g, '""')}"`;
      const toCsvCell = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;

      return [
        toCsvCell(r.dept_id),
        toCsvCell(r.phase),
        toCsvCell(r.connection_type),
        toCsvCell(r.tariff_cat_code),
        toCsvCell(r.loop_cable),
        toCsvCell(r.wiring_type),
        toExcelText(assDate),
        toCsvCell(r.project_no),
        toExcelText(lineLen),
        toExcelText(actCost),
        toExcelText(stdCost),
      ].join(",");
    });

    const csvRows = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
      ...dataRows,
    ];

    const csvContent = [...titleRows, ...csvRows].join("\r\n");

    console.log("FINAL CSV CONTENT:", csvContent);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SMCLineDetails_${resolvedCompId}_${resolvedFromDate}_${resolvedToDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!reportData.length) {
      toast.error("No data to export.");
      return;
    }

    let rows = "";
    reportData.forEach((r, i) => {
      rows += `
        <tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">
          <td class="px-2 py-1 border border-gray-300 text-center text-xs font-mono">${r.dept_id || ""}</td>
          <td class="px-2 py-1 border border-gray-300 text-center text-xs">${r.phase || ""}</td>
          <td class="px-2 py-1 border border-gray-300 text-center text-xs">${r.connection_type || ""}</td>
          <td class="px-2 py-1 border border-gray-300 text-center text-xs">${r.tariff_cat_code || ""}</td>
          <td class="px-2 py-1 border border-gray-300 text-center text-xs">${r.loop_cable || ""}</td>
          <td class="px-2 py-1 border border-gray-300 text-center text-xs">${r.wiring_type || ""}</td>
          <td class="px-2 py-1 border border-gray-300 text-center text-xs font-mono">${formatDateYYYYMMDD(r.prj_ass_dt)}</td>
          <td class="px-2 py-1 border border-gray-300 text-center text-xs font-mono">${r.project_no || ""}</td>
          <td class="px-2 py-1 border border-gray-300 text-right text-xs font-mono" style="text-align:right;">${formatAmount(r.line_length)}</td>
          <td class="px-2 py-1 border border-gray-300 text-right text-xs font-mono" style="text-align:right;">${formatAmount(r.actual_cost)}</td>
          <td class="px-2 py-1 border border-gray-300 text-right text-xs font-mono" style="text-align:right;">${formatAmount(r.Standard_Cost)}</td>
        </tr>`;
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @media print {
      @page { size: landscape; margin: 8mm 5mm 10mm 5mm; }
      body { margin:0; font-family:Arial,Helvetica,sans-serif; }
      .title { margin: 10px 8px 10px; text-align:center; font-weight:bold; color:#7A0000; font-size:14px; }
      .info { margin:6px 8px 12px; font-size:9.5px; display:flex; justify-content:space-between; }
      table { border-collapse:collapse; width:100%; font-size:8.5px; }
      th, td { border:1px solid #d1d5db; padding:5px 6px; word-wrap:break-word; }
      th { background:linear-gradient(to right,#7A0000,#A52A2A); color:white; text-align:center; font-weight:bold; }
      .font-mono { font-family:monospace; }
      @page {
        @bottom-left  { content:"Printed on: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" })}"; font-size:7px; color:gray; }
        @bottom-right { content:"Page " counter(page) " of " counter(pages); font-size:7px; color:gray; }
      }
    }
  </style>
</head>
<body>
  <div class="title">SMC Line Details</div>
  <div class="info">
    <div><strong>Branch (Province):</strong> ${resolvedBranchName} &nbsp;&nbsp; <strong>Wiring Type:</strong> ${resolvedWiringTypeLabel}</div>
    <div><strong>From:</strong> ${resolvedFromDate} &nbsp;&nbsp; <strong>To:</strong> ${resolvedToDate}</div>
  </div>
  <table style="width:100%; border-collapse:collapse; font-size:8.5px; border:1px solid #d1d5db;">
    <thead>
      <tr style="background:linear-gradient(to right,#7A0000,#A52A2A); color:white;">
        <th style="padding:5px; width:9%;">Department Code</th>
        <th style="padding:5px; width:7%;">Phase</th>
        <th style="padding:5px; width:10%;">Connection Type</th>
        <th style="padding:5px; width:10%;">Tariff Category</th>
        <th style="padding:5px; width:8%;">Loop Cable</th>
        <th style="padding:5px; width:8%;">Wiring Type</th>
        <th style="padding:5px; width:11%;">Project Assign Date</th>
        <th style="padding:5px; width:11%;">Project No</th>
        <th style="padding:5px; width:8%; text-align:right;">Line Length</th>
        <th style="padding:5px; width:10%; text-align:right;">Actual Cost</th>
        <th style="padding:5px; width:9%; text-align:right;">Standard Cost</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup blocked. Please allow popups.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
    win.onafterprint = () => win.close();
  };

  /* ────── Render ────── */
  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold ${maroon}`}>
          SMC Line Details
        </h2>
      </div>

      {/* ── FORM SECTION ─────────────────────────────────────────────── */}
      {!hasSearched && (
        <>
          <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col">
                <label className={`text-xs font-bold ${maroon} mb-1`}>
                  Branch (Province): <span className="text-red-600">*</span>
                </label>
                <select
                  value={selectedCompId}
                  onChange={(e) => setSelectedCompId(e.target.value)}
                  disabled={loadingBranches}
                  className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingBranches ? "Loading provinces..." : "-- Select Branch (Province) --"}
                  </option>
                  {branches.map((b) => (
                    <option key={b.compId} value={b.compId}>
                      {b.compId} - {b.compName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className={`text-xs font-bold ${maroon} mb-1`}>
                  From Date: <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                />
              </div>

              <div className="flex flex-col">
                <label className={`text-xs font-bold ${maroon} mb-1`}>
                  To Date: <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                />
              </div>

              <div className="flex flex-col">
                <label className={`text-xs font-bold ${maroon} mb-1`}>
                  Wiring Type:
                </label>
                <select
                  value={wiringType}
                  onChange={(e) => setWiringType(e.target.value)}
                  className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                >
                  <option value="ALL">ALL — (Both OH & UG)</option>
                  <option value="OH">OH — Over Head</option>
                  <option value="UG">UG — Under Ground</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
              >
                <RotateCcw className="w-3 h-3" /> Clear All
              </button>
              <button
                onClick={fetchReport}
                disabled={isViewDisabled}
                className={`px-6 py-1.5 rounded-md font-medium transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2
                  ${maroonGrad} text-white hover:brightness-110`}
              >
                {loadingReport ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> View
                  </>
                )}
              </button>
            </div>
          </div>

          {reportError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {reportError}
            </div>
          )}
        </>
      )}

      {/* ── REPORT SECTION ───────────────────────────────────────────── */}
      {hasSearched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
          <div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
            {loadingReport && (
              <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#7A0000]"></div>
                <p className="text-xl font-bold text-[#7A0000]">Loading Report...</p>
                <p className="text-sm text-gray-600">Fetching SMC line details from server</p>
              </div>
            )}

            {!loadingReport && reportData.length > 0 && (
              <div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
                <div className="flex justify-end gap-3 mb-6 md:mb-8 print:hidden">
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50"
                  >
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50"
                  >
                    <Printer className="w-4 h-4" /> PDF
                  </button>
                  <button
                    onClick={closeReport}
                    className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50"
                  >
                    <X className="w-4 h-4" /> Close
                  </button>
                </div>

                <h2 className={`text-lg md:text-xl font-bold text-center md:mb-6 ${maroon}`}>
                  SMC Line Details
                </h2>
                <div className="flex justify-between text-sm mb-3 ml-5 mr-12 flex-wrap gap-2">
                  <div>
                    <span className="font-bold">Branch (Province):</span> {resolvedBranchName}
                  </div>
                  <div>
                    <span className="font-bold">From:</span> {resolvedFromDate} <span className="font-bold ml-2">To:</span> {resolvedToDate}
                  </div>
                  <div>
                    <span className="font-bold">Wiring Type:</span> {resolvedWiringTypeLabel}
                  </div>
                </div>

                <div className="ml-5 mt-1 mb-5 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
                  <div className="min-w-[1100px]">
                    <table className="w-full text-xs border-collapse">
                      <thead className={`${maroonGrad} text-white`}>
                        <tr>
                          <th className="px-3 py-2 border border-gray-300" style={{ width: "9%" }}>Department Code</th>
                          <th className="px-3 py-2 border border-gray-300" style={{ width: "7%" }}>Phase</th>
                          <th className="px-3 py-2 border border-gray-300" style={{ width: "10%" }}>Connection Type</th>
                          <th className="px-3 py-2 border border-gray-300" style={{ width: "10%" }}>Tariff Category</th>
                          <th className="px-3 py-2 border border-gray-300" style={{ width: "8%" }}>Loop Cable</th>
                          <th className="px-3 py-2 border border-gray-300" style={{ width: "8%" }}>Wiring Type</th>
                          <th className="px-3 py-2 border border-gray-300" style={{ width: "11%" }}>Project Assign Date</th>
                          <th className="px-3 py-2 border border-gray-300" style={{ width: "11%" }}>Project No</th>
                          <th className="px-3 py-2 border border-gray-300 text-right" style={{ width: "8%" }}>Line Length</th>
                          <th className="px-3 py-2 border border-gray-300 text-right" style={{ width: "10%" }}>Actual Cost</th>
                          <th className="px-3 py-2 border border-gray-300 text-right" style={{ width: "9%" }}>Standard Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((r, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-2 text-center font-mono border-l border-r border-gray-300">{r.dept_id || ""}</td>
                            <td className="px-3 py-2 text-center border-r border-gray-300">{r.phase || ""}</td>
                            <td className="px-3 py-2 text-center border-r border-gray-300">{r.connection_type || ""}</td>
                            <td className="px-3 py-2 text-center border-r border-gray-300">{r.tariff_cat_code || ""}</td>
                            <td className="px-3 py-2 text-center border-r border-gray-300">{r.loop_cable || ""}</td>
                            <td className="px-3 py-2 text-center border-r border-gray-300">{r.wiring_type || ""}</td>
                            <td className="px-3 py-2 text-center font-mono border-r border-gray-300">{formatDateYYYYMMDD(r.prj_ass_dt)}</td>
                            <td className="px-3 py-2 text-center font-mono border-r border-gray-300">{r.project_no || ""}</td>
                            <td className="px-3 py-2 text-right font-mono border-r border-gray-300">{formatAmount(r.line_length)}</td>
                            <td className="px-3 py-2 text-right font-mono border-r border-gray-300">{formatAmount(r.actual_cost)}</td>
                            <td className="px-3 py-2 text-right font-mono border-r border-gray-300">{formatAmount(r.Standard_Cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 mt-2 text-right px-2">
                      Total records: {reportData.length.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {reportError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {reportError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SMCLineDetailsByProvince;
