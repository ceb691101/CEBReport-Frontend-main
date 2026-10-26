import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Download, Printer, X, RotateCcw, Eye, Search } from "lucide-react";
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

const COMPANY_NAME = "Electricity Distribution Lanka Private Limited";

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

/* ────── Formatting helpers ────── */
const csvEscape = (val: string | number | null | undefined): string => {
  if (val == null) return "";
  const str = String(val);
  if (/[,\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const SMCLineDetailsByProvince: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user } = useUser();
  const epfNo = user?.Userno || "";

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
  const isExportingCsvRef = useRef(false);

  // Filter states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [selectedCompId, setSelectedCompId] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Branch | null>(null);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [companyPage, setCompanyPage] = useState(1);
  const pageSize = 50;
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


  /* ────── Fetch Province Branches / Companies ────── */
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      setBranchError(null);
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
            compName: (item.CompName ?? item.compName ?? item.CompNm ?? item.COMP_NM ?? "").toString().trim(),
          }))
          .filter((b) => b.compId !== "");

        setBranches(final);
      } catch (err: any) {
        console.error("Failed to load branches:", err);
        setBranchError(err.message || "Failed to load branch list.");
        toast.error("Failed to load branch list.");
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [epfNo]);

  /* ────── Search & Filter Branches / Companies ────── */
  const filteredBranches = useMemo(() => {
    return branches.filter(
      (b) =>
        (!searchId || b.compId.toLowerCase().includes(searchId.toLowerCase())) &&
        (!searchName || b.compName.toLowerCase().includes(searchName.toLowerCase()))
    );
  }, [searchId, searchName, branches]);

  useEffect(() => {
    setCompanyPage(1);
  }, [searchId, searchName]);

  const paginatedBranches = useMemo(() => {
    return filteredBranches.slice((companyPage - 1) * pageSize, companyPage * pageSize);
  }, [filteredBranches, companyPage, pageSize]);

  /* ────── Fetch report on View click ────── */
  const handleViewReport = useCallback(
    async (company: Branch) => {
      setReportError(null);

      if (!fromDate || !toDate) {
        toast.error("Please select both dates");
        return;
      }
      if (new Date(toDate) < new Date(fromDate)) {
        toast.error("'To Date' cannot be earlier than 'From Date'");
        return;
      }

      setSelectedCompany(company);
      setSelectedCompId(company.compId);

      const compIdSnapshot = company.compId;
      const fromSnapshot = fromDate;
      const toSnapshot = toDate;
      const wiringTypeSnapshot = wiringType;

      setResolvedCompId(compIdSnapshot);
      setResolvedFromDate(fromSnapshot);
      setResolvedToDate(toSnapshot);
      setResolvedWiringType(wiringTypeSnapshot);
      setReportData([]);
      setLoadingReport(true);
      setHasSearched(true);

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
        toast.success(`${mapped.length} records loaded successfully.`);
      } catch (err: any) {
        const msg = err.message || "Failed to fetch report data. Please try again.";
        toast.error(msg);
        setReportError(msg);
      } finally {
        setLoadingReport(false);
      }
    },
    [fromDate, toDate, wiringType]
  );

  const clearFilters = () => {
    setSelectedCompany(null);
    setSelectedCompId("");
    setFromDate("");
    setToDate("");
    setWiringType("ALL");
    setSearchId("");
    setSearchName("");
    setReportError(null);
    toast.info("Filters cleared.");
  };

  const closeReport = () => {
    setHasSearched(false);
    setReportData([]);
    setReportError(null);
  };

  const selectedBranchObj = branches.find((b) => b.compId === resolvedCompId) || selectedCompany;
  const resolvedBranchName = selectedBranchObj ? `${selectedBranchObj.compId} - ${selectedBranchObj.compName}` : resolvedCompId;
  const resolvedWiringTypeLabel = getWiringTypeLabel(resolvedWiringType);

  /* ────── Export helpers ────── */
  const handleExportCsv = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isExportingCsvRef.current) return;
    if (!reportData.length) {
      toast.error("No data to export.");
      return;
    }

    isExportingCsvRef.current = true;
    try {
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

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SMCLineDetails_${resolvedCompId}_${resolvedFromDate}_${resolvedToDate}.csv`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err: any) {
      console.error("Failed to export CSV:", err);
      toast.error("Failed to export CSV. Please try again.");
    } finally {
      setTimeout(() => {
        isExportingCsvRef.current = false;
      }, 500);
    }
  };

  const handleExportPdf = () => {
    if (!reportData.length) {
      toast.error("No data to export.");
      return;
    }

    let rows = "";
    reportData.forEach((r, i) => {
      rows += `
        <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
          <td style="text-align: center; font-family: monospace;">${r.dept_id || ""}</td>
          <td style="text-align: center;">${r.phase || ""}</td>
          <td style="text-align: center;">${r.connection_type || ""}</td>
          <td style="text-align: center;">${r.tariff_cat_code || ""}</td>
          <td style="text-align: center;">${r.loop_cable || ""}</td>
          <td style="text-align: center;">${r.wiring_type || ""}</td>
          <td style="text-align: center; font-family: monospace;">${formatDateYYYYMMDD(r.prj_ass_dt)}</td>
          <td style="text-align: center; font-family: monospace;">${r.project_no || ""}</td>
          <td style="text-align: right; font-family: monospace;">${formatAmount(r.line_length)}</td>
          <td style="text-align: right; font-family: monospace;">${formatAmount(r.actual_cost)}</td>
          <td style="text-align: right; font-family: monospace;">${formatAmount(r.Standard_Cost)}</td>
        </tr>`;
    });

    const printedTimestamp = new Date().toLocaleString();

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>&nbsp;</title>
  <style>
    @page {
      size: landscape;
      margin: 10mm 8mm 14mm 8mm;
      @top-left { content: ""; }
      @top-center {
        content: "${COMPANY_NAME}";
        font-size: 8.5px;
        font-weight: normal;
        color: #333;
        font-family: Arial, sans-serif;
      }
      @top-right { content: ""; }
      @bottom-left {
        content: "Printed on: ${printedTimestamp}";
        font-size: 8px;
        color: #666;
        font-family: Arial, sans-serif;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8px;
        color: #666;
        font-family: Arial, sans-serif;
      }
    }
    @media print {
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      table {
        page-break-inside: auto;
        border-collapse: collapse;
        width: 100%;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      td, th {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group !important;
      }
    }
    body {
      font-size: 8.5px;
      line-height: 1.25;
      font-family: Arial, sans-serif;
      padding: 0 4px;
      margin: 0;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .title {
      text-align: center;
      font-weight: bold;
      color: #7A0000;
      font-size: 14px;
      margin: 0 0 6px 0;
    }
    .header-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9px;
      margin-bottom: 8px;
      color: #333;
    }
    .header-left div {
      margin-bottom: 2px;
    }
    .header-right {
      font-weight: bold;
      color: #555;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background-color: #7A0000 !important;
      color: #ffffff !important;
      font-weight: bold;
      border: 1px solid #5a0000;
      font-size: 8.5px;
      padding: 3px 4px;
      text-align: center;
      white-space: nowrap;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    td {
      font-size: 8.5px;
      border: 1px solid #d1d5db;
      padding: 3px 4px;
      white-space: nowrap;
    }
    .font-mono {
      font-family: monospace;
    }
  </style>
</head>
<body>
  <h2 class="title">SMC Line Details</h2>
  <div class="header-info">
    <div class="header-left">
      <div><strong>Branch (Province):</strong> ${resolvedBranchName}</div>
      <div><strong>Period:</strong> ${resolvedFromDate} To ${resolvedToDate}</div>
      <div><strong>Wiring Type:</strong> ${resolvedWiringTypeLabel}</div>
    </div>
    <div class="header-right">
      <div><strong>Total Records:</strong> ${reportData.length} &nbsp;|&nbsp; <strong>Currency:</strong> LKR</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="padding: 3px 4px; width: 9%;">Department Code</th>
        <th style="padding: 3px 4px; width: 7%;">Phase</th>
        <th style="padding: 3px 4px; width: 10%;">Connection Type</th>
        <th style="padding: 3px 4px; width: 10%;">Tariff Category</th>
        <th style="padding: 3px 4px; width: 8%;">Loop Cable</th>
        <th style="padding: 3px 4px; width: 8%;">Wiring Type</th>
        <th style="padding: 3px 4px; width: 11%;">Project Assign Date</th>
        <th style="padding: 3px 4px; width: 11%;">Project No</th>
        <th style="padding: 3px 4px; width: 8%; text-align: right;">Line Length</th>
        <th style="padding: 3px 4px; width: 10%; text-align: right;">Actual Cost</th>
        <th style="padding: 3px 4px; width: 9%; text-align: right;">Standard Cost</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          iframeRef.current?.contentWindow?.focus();
          iframeRef.current?.contentWindow?.print();
        }, 500);
      }
    } catch (err: any) {
      console.error("Failed to generate PDF:", err);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  /* ────── Render ────── */
  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      {/* Hidden iframe for PDF printing */}
      <iframe ref={iframeRef} style={{ display: "none" }} title="print_frame" />

      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold ${maroon}`}>
          SMC Line Details
        </h2>
      </div>

      {/* ── FORM SECTION ─────────────────────────────────────────────── */}
      {!hasSearched && (
        <>
          {/* Date & Wiring Type Filters */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-4">
            <div className="flex items-center gap-2">
              <label htmlFor="fromDate" className={`text-xs font-bold ${maroon} whitespace-nowrap`}>
                From Date:
              </label>
              <input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                min={minDate}
                max={maxDate}
                className="pl-3 pr-3 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="toDate" className={`text-xs font-bold ${maroon} whitespace-nowrap`}>
                To Date:
              </label>
              <input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={minDate}
                max={maxDate}
                className="pl-3 pr-3 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="wiringType" className={`text-xs font-bold ${maroon} whitespace-nowrap`}>
                Wiring Type:
              </label>
              <select
                id="wiringType"
                name="wiringType"
                value={wiringType}
                onChange={(e) => setWiringType(e.target.value)}
                className="pl-3 pr-3 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm min-w-[210px]"
              >
                <option value="ALL">ALL — (Both OH & UG)</option>
                <option value="OH">OH — Over Head</option>
                <option value="UG">UG — Under Ground</option>
              </select>
            </div>
          </div>

          {reportError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {reportError}
            </div>
          )}

          {/* ── COMPANY / BRANCH SELECTION TABLE ──────────────────────── */}
          <div className="mb-4">
            {/* Search */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by ID"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by Name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-10 pr-4 py-1.5 w-48 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                />
              </div>
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 text-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear All
            </button>
            </div>

            {/* Companies List */}
            {loadingBranches && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A0000] mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading companies...</p>
              </div>
            )}
            {branchError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                Error: {branchError}
              </div>
            )}
            {!loadingBranches && !branchError && filteredBranches.length > 0 && (
              <>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className={`${maroonGrad} text-white`}>
                      <tr>
                        <th className="px-4 py-2 w-1/3">Company Code</th>
                        <th className="px-4 py-2 w-1/2">Company Name</th>
                        <th className="px-4 py-2 text-center w-1/6">Action</th>
                      </tr>
                    </thead>
                  </table>

                  <div className="max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <tbody>
                      {paginatedBranches.map((c, i) => (
                        <tr
                          key={c.compId || i}
                          className="hover:bg-gray-50 border-b border-gray-100"
                        >
                          <td className="px-4 py-2 font-mono w-1/3">{c.compId}</td>
                          <td className="px-4 py-2 w-1/2">{c.compName}</td>
                          <td className="px-4 py-2 text-center w-1/6">
                            <button
                              type="button"
                              onClick={() => handleViewReport(c)}
                              disabled={!fromDate || !toDate}
                              className={`px-3 py-1 rounded text-white text-xs font-medium ${maroonGrad} disabled:opacity-50 hover:brightness-110 flex items-center justify-center gap-1 mx-auto`}
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end items-center gap-3 mt-4">
                  <button
                    onClick={() => setCompanyPage((p) => Math.max(1, p - 1))}
                    disabled={companyPage === 1}
                    className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {companyPage} of {Math.ceil(filteredBranches.length / pageSize)}
                  </span>
                  <button
                    onClick={() =>
                      setCompanyPage((p) =>
                        Math.min(
                          Math.ceil(filteredBranches.length / pageSize),
                          p + 1
                        )
                      )
                    }
                    disabled={companyPage >= Math.ceil(filteredBranches.length / pageSize)}
                    className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </>
            )}

            {!loadingBranches && !branchError && filteredBranches.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No companies found.
              </div>
            )}
          </div>
        </>
      )}

      {/* ── REPORT SECTION ───────────────────────────────────────────── */}
      {hasSearched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90">
          <div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto">
            {loadingReport && (
              <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#7A0000]"></div>
                <p className="text-xl font-bold text-[#7A0000]">Loading Report...</p>
                <p className="text-sm text-gray-600">Fetching SMC line details from server</p>
              </div>
            )}

            {!loadingReport && reportData.length > 0 && (
              <div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-end gap-3 mb-6 md:mb-8">
                  <button
                    type="button"
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

                <div className="ml-5 mt-1 mb-5 border border-gray-200 rounded-lg overflow-x-auto">
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
