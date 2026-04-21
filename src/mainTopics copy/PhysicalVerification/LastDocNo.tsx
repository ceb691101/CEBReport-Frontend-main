import React, { useState, useRef, useEffect } from "react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import ReportViewer from "../../components/utils/ReportViewer";
import { Search, RotateCcw, Eye } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CostCentre {
  DeptId: string;
  DeptName: string;
}

interface LastDocItem {
  DocPrefix: string;
  MaxDocNo: string;
  MaxTrxDate: string | null;
  CostCenterName?: string;
  [key: string]: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const parseApiResponse = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.result && Array.isArray(response.result)) return response.result;
  if (response.departments && Array.isArray(response.departments)) return response.departments;
  if (response.Data && Array.isArray(response.Data)) return response.Data;
  console.warn("Unexpected API response format:", response);
  return [];
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const day   = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year  = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

// Format date for PDF footer: "2026-February-12"
const formatDateLong = (date: Date): string => {
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  return `${date.getFullYear()}-${months[date.getMonth()]}-${String(date.getDate()).padStart(2, "0")}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const LastDocNumbers: React.FC = () => {
  const { user } = useUser();
  const epfNo = user?.Userno || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Cost Centre state
  const [data, setData]           = useState<CostCentre[]>([]);
  const [searchId, setSearchId]   = useState("");
  const [searchName, setSearchName] = useState("");
  const [filtered, setFiltered]   = useState<CostCentre[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [page, setPage]           = useState(1);

  // Selections — dept + year only (no month, no warehouse)
  const [selectedDept, setSelectedDept]   = useState<CostCentre | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Report state
  const [reportData, setReportData]       = useState<LastDocItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [showReport, setShowReport]       = useState(false);

  const maroon     = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
  const pageSize   = 9;
  const currentYear = new Date().getFullYear();
const yearOptions = Array.from(
  { length: currentYear - 2006 + 1 },
  (_, i) => currentYear - i
);
  // ── Fetch Cost Centres ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!epfNo) {
        setError("No EPF number available. Please login again.");
        toast.error("No EPF number available. Please login again.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/misapi/api/incomeexpenditure/departments/${encodeURIComponent(epfNo)}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (!contentType?.includes("application/json")) throw new Error("Expected JSON response");
        const parsed  = await res.json();
        const rawData = parseApiResponse(parsed);
        const final: CostCentre[] = rawData.map((item: any) => ({
          DeptId:   item.DeptId?.toString() || "",
          DeptName: item.DeptName?.toString().trim() || "",
        }));
        setData(final);
        setFiltered(final);
      } catch (e: any) {
        setError(e.message);
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDepartments();
  }, [epfNo]);

  // ── Filter Cost Centres ──────────────────────────────────────────────────────

  useEffect(() => {
    const f = data.filter(
      (d) =>
        (!searchId   || d.DeptId.toLowerCase().includes(searchId.toLowerCase())) &&
        (!searchName || d.DeptName.toLowerCase().includes(searchName.toLowerCase()))
    );
    setFiltered(f);
    setPage(1);
  }, [searchId, searchName, data]);

  // ── View Report ──────────────────────────────────────────────────────────────

  const handleViewReport = async () => {
    if (!selectedDept || !selectedYear) {
      toast.error("Please select a cost centre and year");
      return;
    }
    setReportLoading(true);
    setShowReport(true);
    setReportData([]);
    try {
      const res = await fetch(
        `/misapi/api/last-doc/list?deptId=${encodeURIComponent(
          selectedDept.DeptId
        )}&repYear=${selectedYear}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json  = await res.json();
      const items: LastDocItem[] = Array.isArray(json) ? json : json.data || [];
      setReportData(items);
      items.length === 0
        ? toast.warn("No records found")
        : toast.success("Report loaded successfully");
    } catch (err: any) {
      toast.error("Failed to load report: " + (err.message || "Unknown error"));
    } finally {
      setReportLoading(false);
    }
  };

  const closeReport = () => {
    setShowReport(false);
    setReportData([]);
    setSelectedDept(null);
    setSelectedYear(null);
  };

  // ── CSV Download ─────────────────────────────────────────────────────────────

  const handleDownloadCSV = () => {
    if (!reportData.length || !selectedDept) return;

    const rows: string[] = [];
    rows.push(`"Last Document Numbers"`);
    rows.push(`"Cost Centre: ${selectedDept.DeptId} / ${selectedDept.DeptName}"`);
    rows.push(`"Year: ${selectedYear}"`);
    rows.push("");
    rows.push([`"Document Profile"`, `"Document No"`, `"Trx. Date"`].join(","));

    reportData.forEach((item) => {
      const row = [
        item.DocPrefix?.trim() || "",
        item.MaxDocNo?.trim()  || "",
        formatDate(item.MaxTrxDate),
      ];
      rows.push(row.map((v) => `"${v}"`).join(","));
    });

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `LastDocNumbers_${selectedDept.DeptId}_${selectedYear}.csv`;
    link.click();
  };

  // ── Print PDF ─────────────────────────────────────────────────────────────────

  const printPDF = () => {
    if (!iframeRef.current || !selectedDept || reportData.length === 0) {
      toast.error("Please load the report before printing");
      return;
    }

    // ── PAGE LAYOUT (A4 Portrait) ─────────────────────────────────────────────
    const PAGE_W  = 210;
    const PAGE_H  = 297;
    const M_TB    = 15;
    const M_LR    = 15;

    const HEADER_H      = 30;
    const THEAD_H       = 8;
    const FTR_H         = 8;
    const ROW_H         = 7;

    const DATA_AREA_H   = PAGE_H - 2 * M_TB - HEADER_H - THEAD_H - FTR_H - 4;
    const ROWS_PER_PAGE = Math.floor(DATA_AREA_H / ROW_H);

    // ── PAGINATION ────────────────────────────────────────────────────────────
    const chunks: LastDocItem[][] = [];
    for (let i = 0; i < reportData.length; i += ROWS_PER_PAGE) {
      chunks.push(reportData.slice(i, i + ROWS_PER_PAGE));
    }
    if (chunks.length === 0) chunks.push([]);

    const totalPages = chunks.length;
    const today      = new Date();

    const hh = String(today.getHours()).padStart(2, "0");
    const mm = String(today.getMinutes()).padStart(2, "0");
    const ss = String(today.getSeconds()).padStart(2, "0");
    const generatedAt = `${formatDateLong(today)} ${hh}:${mm}:${ss}`;

    // ── CSS ───────────────────────────────────────────────────────────────────
    const css = `
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; }

      .page {
        position: relative;
        width:  ${PAGE_W}mm;
        height: ${PAGE_H}mm;
        page-break-after: always;
      }
      .page:last-child { page-break-after: auto; }

      .inner {
        position: absolute;
        top: ${M_TB}mm; bottom: ${M_TB}mm;
        left: ${M_LR}mm; right: ${M_LR}mm;
      }

      /* ── HEADER ── */
      .header {
        height: ${HEADER_H}mm;
        border-bottom: 1.5pt solid #000;
        padding-bottom: 2mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
      }
      .header-title {
        font-size: 13pt;
        font-weight: bold;
        color: #7A0000;
        margin-bottom: 2.5mm;
        text-align: center;
      }
      .header-cc {
        font-size: 9pt;
        font-weight: bold;
        color: #000;
        margin-bottom: 1.5mm;
        text-align: center;
      }
      .header-year {
        font-size: 9pt;
        font-weight: bold;
        color: #000;
        text-align: center;
      }

      /* ── TABLE ── */
      .table-area {
        position: absolute;
        top: ${HEADER_H}mm;
        left: 0; right: 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 8.5pt;
      }
      th, td {
        border: 0.6pt solid #555;
        padding: 1mm 2mm;
        vertical-align: middle;
        word-wrap: break-word;
      }
      th {
        background: #e8e8e8;
        font-weight: bold;
        text-align: center;
        height: ${THEAD_H}mm;
        font-size: 8.5pt;
        color: #000;
      }
      td { color: #000; }

      .c-profile { width: 35%; text-align: left; }
      .c-docno   { width: 40%; text-align: left; font-family: "Courier New", monospace; font-size: 8pt; }
      .c-date    { width: 25%; text-align: center; }

      tr:nth-child(even) td { background: #f5f5f5; }

      /* ── FOOTER ── */
      .footer {
        position: absolute;
        bottom: 0;
        left: 0; right: 0;
        height: ${FTR_H}mm;
        font-size: 8pt;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding-bottom: 0.5mm;
        color: #000;
        border-top: 0.6pt solid #000;
        padding-top: 1mm;
      }
    `;

    // ── HEADER HTML ───────────────────────────────────────────────────────────
    const headerHTML = `
      <div class="header">
        <div class="header-title">Last Document Numbers</div>
        <div class="header-cc">Cost Centre: ${esc(selectedDept!.DeptId)} / ${esc(selectedDept!.DeptName)}</div>
        <div class="header-year">Year : ${selectedYear}</div>
      </div>`;

    // ── TABLE HEADER ──────────────────────────────────────────────────────────
    const theadHTML = `
      <thead>
        <tr>
          <th class="c-profile">Document Profile</th>
          <th class="c-docno">Document No</th>
          <th class="c-date">Trx. Date</th>
        </tr>
      </thead>`;

    // ── BUILD PAGES ───────────────────────────────────────────────────────────
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${css}</style></head><body>`;

    chunks.forEach((chunk, idx) => {
      const pageNum = idx + 1;

      const rowsHTML = chunk.map((item) => `
        <tr style="height:${ROW_H}mm;">
          <td class="c-profile">${esc((item.DocPrefix || "").trim())}</td>
          <td class="c-docno">${esc((item.MaxDocNo || "").trim())}</td>
          <td class="c-date">${esc(formatDate(item.MaxTrxDate))}</td>
        </tr>`).join("");

      html += `
        <div class="page">
          <div class="inner">
            ${headerHTML}
            <div class="table-area">
              <table>
                ${theadHTML}
                <tbody>${rowsHTML}</tbody>
              </table>
            </div>
            <div class="footer">
              <span>Report Generated : ${generatedAt}</span>
              <span>Page ${pageNum} of ${totalPages}</span>
            </div>
          </div>
        </div>`;
    });

    html += `</body></html>`;

    const doc = iframeRef.current.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => iframeRef.current?.contentWindow?.print(), 800);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[95%] mx-auto p-2 md:p-4 bg-white rounded-xl shadow border border-gray-200 text-sm md:text-base font-sans">
      <iframe ref={iframeRef} style={{ display: "none" }} title="print-frame" />

      <h2 className={`text-lg md:text-xl font-bold mb-4 ${maroon}`}>
        Last Document Numbers
      </h2>

      {/* ── Top Controls: Year + View ── */}
      <div className="flex justify-end mb-4">
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className={`text-xs font-semibold ${maroon}`}>Year</label>
            <select
              value={selectedYear ?? ""}
              onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
              className="pl-3 pr-8 py-2 w-36 rounded-md border-2 border-[#7A0000] bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm text-gray-700 appearance-none cursor-pointer shadow-sm"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A0000' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
            >
<option value="">Select Year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleViewReport}
            disabled={!selectedDept || !selectedYear || loading}
            className={`px-3 py-1.5 ${maroonGrad} text-white rounded-md text-xs md:text-sm font-medium hover:brightness-110 transition shadow ${
              !selectedDept || !selectedYear || loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Eye className="inline-block mr-1 w-3 h-3" />
            View
          </button>
        </div>
      </div>

      {/* ── Cost Centre Search ── */}
      <div className="flex flex-col md:flex-row flex-wrap gap-2 md:gap-3 mb-2 md:mb-4">
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            type="text"
            value={searchId}
            placeholder="Search by Cost Center ID"
            onChange={(e) => setSearchId(e.target.value)}
            className="pl-8 pr-2 py-1 md:py-1.5 w-full md:w-44 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
            autoComplete="off"
          />
        </div>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
          <input
            type="text"
            value={searchName}
            placeholder="Search by Name"
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-8 pr-2 py-1 md:py-1.5 w-full md:w-44 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-xs md:text-sm"
            autoComplete="off"
          />
        </div>
        {(searchId || searchName) && (
          <button
            onClick={() => { setSearchId(""); setSearchName(""); }}
            className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs md:text-sm"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Loading / Error / Empty ── */}
      {loading && (
        <div className="text-center py-4 md:py-8">
          <div className="animate-spin rounded-full h-6 md:h-8 w-6 md:w-8 border-b-2 border-[#7A0000] mx-auto" />
          <p className="mt-1 md:mt-2 text-gray-600 text-xs md:text-sm">Loading cost centers...</p>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-2 md:px-4 py-2 md:py-3 rounded mb-2 md:mb-4 text-xs md:text-sm">
          Error: {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-gray-600 bg-gray-100 p-2 md:p-4 rounded text-xs md:text-sm">
          No cost centers found.
        </div>
      )}

      {/* ── Cost Centre Table ── */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full table-fixed text-left text-gray-700 text-xs md:text-sm">
                <thead className={`${maroonGrad} text-white sticky top-0`}>
                  <tr>
                    <th className="px-2 md:px-4 py-1 md:py-2 w-1/3 md:w-auto">Cost Center Code</th>
                    <th className="px-2 md:px-4 py-1 md:py-2 w-2/3 md:w-auto">Cost Center Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * pageSize, page * pageSize).map((dept, i) => (
                    <tr
                      key={`${dept.DeptId}-${i}`}
                      onClick={() => setSelectedDept(dept)}
                      className={`cursor-pointer ${
                        selectedDept?.DeptId === dept.DeptId
                          ? "bg-[#7A0000] text-white"
                          : i % 2
                          ? "bg-white hover:bg-gray-100"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <td className="px-2 md:px-4 py-1 md:py-2 truncate">{dept.DeptId}</td>
                      <td className="px-2 md:px-4 py-1 md:py-2 truncate">{dept.DeptName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-end items-center gap-2 md:gap-3 mt-2 md:mt-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 md:px-3 py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs md:text-sm text-gray-600">
              Page {page} of {Math.ceil(filtered.length / pageSize)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
              disabled={page >= Math.ceil(filtered.length / pageSize)}
              className="px-2 md:px-3 py-1 border rounded bg-white text-gray-600 text-xs md:text-sm hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* ── Report Viewer ── */}
      {showReport && selectedDept && (
        <ReportViewer
          title={`LAST DOCUMENT NUMBERS - ${selectedYear}`}
          subtitlebold2="Cost Centre :"
          subtitlenormal2={`${selectedDept.DeptId} / ${selectedDept.DeptName}`}
          loading={reportLoading}
          hasData={reportData.length > 0}
          handleDownloadCSV={handleDownloadCSV}
          printPDF={printPDF}
          closeReport={closeReport}
        >
          <table className="w-full text-xs border-collapse">
            <thead className={`${maroonGrad} text-white`}>
              <tr>
                <th className="border border-gray-400 px-2 py-2 text-left">Document Profile</th>
                <th className="border border-gray-400 px-2 py-2 text-left">Document No</th>
                <th className="border border-gray-400 px-2 py-2 text-center">Trx. Date</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 px-2 py-2 text-left">{item.DocPrefix?.trim()}</td>
                  <td className="border border-gray-300 px-2 py-2 text-left font-mono">{item.MaxDocNo?.trim()}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">{formatDate(item.MaxTrxDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportViewer>
      )}
    </div>
  );
};

export default LastDocNumbers;