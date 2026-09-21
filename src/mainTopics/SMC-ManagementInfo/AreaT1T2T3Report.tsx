// AreaT1T2T3Report.tsx
import React, { useState, useCallback } from "react";
import { Printer, X } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import ReusableCompanyList from "../../components/utils/ReusableCompanyList";

interface AreaT1T2T3Item {
    ApplicationNo: string | null;
    ApplicationId: string | null;
    ProjectNo: string | null;
    AccCreatedDate: string | null;
    Piv1Date: string | null;
    ApprovalDate: string | null;
    EstimateCost: number | null;
    Piv2Date: string | null;
    EnergizedDate: string | null;
    T1: number | null;
    T2Ln: number | null;
    T2Smc: number | null;
    T3: number | null;
    Loan: string | null;
    CompName: string | null;
}

interface AreaT1T2T3Summary {
    fromDate: string;
    toDate: string;
    compId: string;
    totalRecords: number;
    averageT1: number | null;
    averageT2Ln: number | null;
    averageT2Smc: number | null;
    averageT3: number | null;
}

/* ────── Constants ────── */
const FETCH_TIMEOUT_MS = 240000;
const COMPANY_NAME = "Electricity Distribution Lanka Private Limited";

/* ────── Helpers ────── */
const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr?.trim()) return "";
    const dt = dateStr.trim();

    if (dt.includes("T")) {
        return dt.split("T")[0].replace(/-/g, "/");
    }

    if (/^\d{8}$/.test(dt)) {
        return `${dt.slice(0, 4)}/${dt.slice(4, 6)}/${dt.slice(6)}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) {
        return dt.replace(/-/g, "/");
    }

    return dt;
};

const formatAmount = (amount: string | number | null | undefined): string => {
    if (amount == null || amount === "" || isNaN(Number(amount))) return "0.00";
    const num = parseFloat(String(amount));
    return num.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// T1/T2/T3 are DATE - DATE results from Oracle (fractional days)
const formatDays = (val: number | null | undefined): string => {
    if (val == null || isNaN(Number(val))) return "-";
    return Number(val).toFixed(1);
};

// t2_ln and t2_smc represent the same logical "T2" measured two different ways;
// display whichever one is populated for the row.
const getT2 = (it: AreaT1T2T3Item): number | null =>
    it.T2Ln != null ? it.T2Ln : it.T2Smc != null ? it.T2Smc : null;

const average = (nums: (number | null | undefined)[]): number | null => {
    const valid = nums.filter((n): n is number => n != null && !isNaN(Number(n)));
    if (valid.length === 0) return null;
    return valid.reduce((sum, n) => sum + n, 0) / valid.length;
};

/* ────── Table Modal Component ────── */
const AreaT1T2T3ReportTable: React.FC<{
    data: AreaT1T2T3Item[];
    summary: AreaT1T2T3Summary | null;
    fromDate: string;
    toDate: string;
    compId: string;
    onClose: () => void;
}> = ({ data, summary, fromDate, toDate, compId, onClose }) => {
    const maroon = "text-[#7A0000]";

    const fromLabel = formatDate(fromDate);
    const toLabel = formatDate(toDate);
    const areaLabel = data[0]?.CompName || compId;

    // Sort by Job No (Project No)
    const sortedData = [...data].sort((a, b) =>
        (a.ProjectNo || "").trim().localeCompare((b.ProjectNo || "").trim())
    );

    const totalRecords = summary?.totalRecords ?? sortedData.length;
    const avgT1 = average(sortedData.map((it) => it.T1));
    const avgT2 = average(sortedData.map((it) => getT2(it)));
    const avgT3 = average(sortedData.map((it) => it.T3));

    /* ────── Print PDF ────── */
    const printPDF = () => {
        let rowsHTML = "";
        sortedData.forEach((it, i) => {
            rowsHTML += `
        <tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">
          <td style="text-align:center;">${i + 1}</td>
          <td style="text-align:center;">${it.ProjectNo || ""}</td>
          <td style="text-align:center;">${it.ApplicationNo || ""}</td>
          <td style="text-align:center;">${it.ApplicationId || ""}</td>
          <td style="text-align:right;">${formatAmount(it.EstimateCost)}</td>
          <td style="text-align:center;">${it.Loan || ""}</td>
          <td style="text-align:center;">${formatDate(it.Piv1Date)}</td>
          <td style="text-align:center;">${formatDate(it.ApprovalDate)}</td>
          <td style="text-align:center;">${formatDate(it.Piv2Date)}</td>
          <td style="text-align:center;">${formatDate(it.EnergizedDate)}</td>
          <td style="text-align:center;">${formatDate(it.AccCreatedDate)}</td>
          <td style="text-align:right;">${formatDays(it.T1)}</td>
          <td style="text-align:right;">${formatDays(getT2(it))}</td>
          <td style="text-align:right;">${formatDays(it.T3)}</td>
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
      .company { margin: 10px 8px 2px; text-align:center; font-weight:bold; color:#7A0000; font-size:14px; }
      .title { margin: 2px 8px 4px; text-align:center; font-weight:bold; color:#7A0000; font-size:12px; }
      .info { margin:6px 8px 10px; font-size:9px; }
      table { border-collapse:collapse; width:100%; font-size:8px; }
      th, td { border:1px solid #d1d5db; padding:4px 5px; word-wrap:break-word; }
      th { background:#7A0000; color:#1f2937; text-align:center; font-weight:bold; }
      tr.bg-gray-50 { background:#f5f5f5; }
      .avg-table { margin-top:14px; padding:0 8px; }
      .avg-table table { width:220px; font-size:8.5px; }
      .avg-table td { border:1px solid #d1d5db; padding:4px 6px; }
      .avg-table td.label { font-weight:bold; background:#f5f5f5; }
      .avg-table td.value { text-align:right; }
      .notes { margin-top:14px; padding:0 8px; font-size:8.5px; line-height:1.6; }
      .sign-block { margin-top:34px; padding:0 8px; font-size:9px; }
      .sign-row { display:flex; justify-content:space-between; }
      .sign-col { width:23%; }
      .sign-line { border-top:1px solid #333; margin-top:26px; padding-top:3px; }
      @page {
        @bottom-left { content:"Printed on: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" })}"; font-size:7px; color:gray; }
        @bottom-right { content:"Page " counter(page) " of " counter(pages); font-size:7px; color:gray; }
      }
    }
  </style>
</head>
<body>
  <div class="company">${COMPANY_NAME} </div>
  <div class="title">Area Wise T1, T2, T3 Report From ${fromLabel} To ${toLabel}</div>
  <div class="info"><strong>Area:</strong> ${compId} / ${areaLabel} &nbsp;&nbsp; <strong>Records:</strong> ${totalRecords}</div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Job No</th>
        <th>Application No</th>
        <th>Application Id</th>
        <th>Estimate Cost</th>
        <th>Loan</th>
        <th>Application Submitted Date</th>
        <th>Estimate Approved Date</th>
        <th>PIV2 Date</th>
        <th>Energized Date</th>
        <th>Account Created Date</th>
        <th>T1</th>
        <th>T2</th>
        <th>T3</th>
      </tr>
    </thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <div class="avg-table">
    <table>
      <tbody>
        <tr><td class="label">Average of T1</td><td class="value">${formatDays(avgT1)}</td></tr>
        <tr><td class="label">Average of T2</td><td class="value">${formatDays(avgT2)}</td></tr>
        <tr><td class="label">Average of T3</td><td class="value">${formatDays(avgT3)}</td></tr>
      </tbody>
    </table>
  </div>
  <div class="notes">
    <div><strong>T1:</strong> Days between application submitted and estimate approved.</div>
    <div><strong>T2:</strong> Days between PIV 2 paid and energized.</div>
    <div><strong>T3:</strong> Days between energized and account opened.</div>
  </div>
  <div class="sign-block">
    <div class="sign-row">
      <div class="sign-col"><div class="sign-line">Prepared By</div></div>
      <div class="sign-col"><div class="sign-line">Checked By</div></div>
      <div class="sign-col"><div class="sign-line">Certified By (Area Engineer)</div></div>
      <div class="sign-col"><div class="sign-line">Checking Officer (Test Report)</div></div>
    </div>
  </div>
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
            <div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
                <div className="p-4 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
                    <div className="flex justify-end gap-3 mb-6 md:mb-8 print:hidden">
                        <button
                            onClick={printPDF}
                            className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
                        >
                            <Printer className="w-3 h-3" /> PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center gap-1 transition"
                        >
                            <X className="w-3 h-3" /> Close
                        </button>
                    </div>

                    <h2 className={`text-base md:text-lg font-bold text-center ${maroon}`}>
                        {COMPANY_NAME}
                    </h2>
                    <h3 className={`text-sm md:text-base font-semibold text-center mb-4 ${maroon}`}>
                        Area Wise T1, T2, T3 Report From {fromLabel} To {toLabel}
                    </h3>

                    <div className="flex flex-col sm:flex-row justify-between text-sm mb-4 gap-2 px-2">
                        <div>
                            <span className="font-bold">Area:</span> {compId} / {areaLabel}
                        </div>
                        <div className="flex gap-4 font-semibold text-gray-600">
                            <div>Records: {totalRecords}</div>
                        </div>
                    </div>

                    <div className="mt-1 mb-5 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
                        <div className="min-w-[1700px]">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#7A0000] text-white sticky top-0">
                                        <th className="px-3 py-2 border border-gray-300 font-bold">Item</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold">Job No</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold">Application No</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold">Application Id</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold text-right">Estimate Cost</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold">Loan</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold">Application Submitted Date</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold">Estimate Approved Date</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold">PIV2 Date</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold">Energized Date</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold">Account Created Date</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold text-right">T1</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold text-right">T2</th>
                                        <th className="px-3 py-2 border border-gray-300 font-bold text-right">T3</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedData.map((it, i) => (
                                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                            <td className="px-3 py-2 border-l border-r border-gray-300 text-center font-mono">{i + 1}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-center font-mono">{it.ProjectNo}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-center font-mono">{it.ApplicationNo}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-center font-mono">{it.ApplicationId}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-right font-mono">{formatAmount(it.EstimateCost)}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-center">{it.Loan}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-center font-mono">{formatDate(it.Piv1Date)}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-center font-mono">{formatDate(it.ApprovalDate)}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-center font-mono">{formatDate(it.Piv2Date)}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-center font-mono">{formatDate(it.EnergizedDate)}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-center font-mono">{formatDate(it.AccCreatedDate)}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-right font-mono">{formatDays(it.T1)}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-right font-mono">{formatDays(getT2(it))}</td>
                                            <td className="px-3 py-2 border-r border-gray-300 text-right font-mono">{formatDays(it.T3)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ────── Average summary table ────── */}
                    <div className="px-2 mb-6">
                        <table className="text-xs border-collapse border border-gray-300 w-56">
                            <tbody>
                                <tr>
                                    <td className="px-3 py-2 border border-gray-300 font-bold bg-gray-50">Average of T1</td>
                                    <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatDays(avgT1)}</td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-2 border border-gray-300 font-bold bg-gray-50">Average of T2</td>
                                    <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatDays(avgT2)}</td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-2 border border-gray-300 font-bold bg-gray-50">Average of T3</td>
                                    <td className="px-3 py-2 border border-gray-300 text-right font-mono">{formatDays(avgT3)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ────── T1/T2/T3 definitions ────── */}
                    <div className="px-2 mb-6 text-xs text-gray-700 space-y-1">
                        <div><span className="font-bold">T1:</span> Days between application submitted and estimate approved.</div>
                        <div><span className="font-bold">T2:</span> Days between PIV 2 paid and energized.</div>
                        <div><span className="font-bold">T3:</span> Days between energized and account opened.</div>
                    </div>

                    {/* ────── Signature / Sign-off block ────── */}
                    <div className="mt-8 mb-2 px-2 print:hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-xs">
                            <div>
                                <div className="border-b border-gray-400 h-8"></div>
                                <div className="mt-1 text-gray-600 font-semibold">Prepared By</div>
                            </div>
                            <div>
                                <div className="border-b border-gray-400 h-8"></div>
                                <div className="mt-1 text-gray-600 font-semibold">Checked By</div>
                            </div>
                            <div>
                                <div className="border-b border-gray-400 h-8"></div>
                                <div className="mt-1 text-gray-600 font-semibold">Certified By (Area Engineer)</div>
                            </div>
                            <div>
                                <div className="border-b border-gray-400 h-8"></div>
                                <div className="mt-1 text-gray-600 font-semibold">Checking Officer (Test Report)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ────── MAIN COMPONENT ────── */
const AreaT1T2T3Report: React.FC = () => {
    const { user } = useUser();
    const epfNo = user?.Userno || "";

    const maroon = "text-[#7A0000]";

    const todayStr = new Date().toISOString().slice(0, 10);
    const firstOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .slice(0, 10);

    const [fromDate, setFromDate] = useState(firstOfMonthStr);
    const [toDate, setToDate] = useState(todayStr);

    const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
    const [reportData, setReportData] = useState<AreaT1T2T3Item[]>([]);
    const [reportSummary, setReportSummary] = useState<AreaT1T2T3Summary | null>(null);
    const [showReport, setShowReport] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);

    /* ────── Fetch report for the selected area/company ────── */
    const handleViewReport = async (company: { id: string; name: string }) => {
        if (!fromDate || !toDate) {
            toast.error("Please select both From Date and To Date.");
            return;
        }
        if (new Date(toDate) < new Date(fromDate)) {
            toast.error("To date cannot be earlier than from date.");
            return;
        }

        setSelectedCompany(company);
        setReportLoading(true);
        setReportData([]);
        setReportSummary(null);
        setShowReport(true);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
            const url = `/misapi/api/areat1t2t3/report?fromDate=${fromDate}&toDate=${toDate}&compId=${encodeURIComponent(
                company.id
            )}`;
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            if (!json.success) throw new Error(json.message || "No data");

            const items: AreaT1T2T3Item[] = json.data || [];
            if (items.length === 0) {
                toast.warn("No records found.");
                setShowReport(false);
                setSelectedCompany(null);
                return;
            }

            setReportData(items);
            setReportSummary(json.summary || null);
            toast.success(`${items.length} records loaded.`);
        } catch (e: any) {
            toast.error(
                e.name === "AbortError"
                    ? "Request timed out."
                    : e.message.includes("Failed to fetch")
                        ? "Server unreachable."
                        : e.message
            );
            setReportData([]);
            setReportSummary(null);
            setShowReport(false);
            setSelectedCompany(null);
        } finally {
            setReportLoading(false);
        }
    };

    const closeReport = () => {
        setShowReport(false);
        setReportData([]);
        setReportSummary(null);
        setSelectedCompany(null);
        setReportLoading(false);
    };

    return (
        <div
            className="max-w-[95%] mx-auto p-6 bg-white rounded-lg shadow-md text-sm md:text-base relative ml-16 mt-8"
            style={{ marginLeft: "2rem" }}
        >
            <h2 className={`text-xl font-bold mb-4 ${maroon}`}>Area Wise T1, T2, T3 Report</h2>

            {/* ────── Date range filters ────── */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end max-w-xl">
                    <div className="flex flex-col gap-1">
                        <label className={`text-xs font-bold ${maroon}`}>From Date:</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={`text-xs font-bold ${maroon}`}>To Date:</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* ────── Area / Company List ────── */}
            <div className="mt-6">
                <ReusableCompanyList
                    fetchItems={useCallback(async () => {
                        if (!epfNo) {
                            toast.error("No EPF number available.");
                            return [];
                        }
                        try {
                            const res = await fetch(`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/50`);
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            const txt = await res.text();
                            const parsed = JSON.parse(txt);
                            const raw = Array.isArray(parsed) ? parsed : parsed.data || [];
                            return raw.map((c: any) => ({
                                id: c.CompId,
                                name: c.CompName,
                            }));
                        } catch (e: any) {
                            toast.error(e.message || "Failed to load areas");
                            return [];
                        }
                    }, [epfNo])}
                    onViewItem={(company: { id: string; name: string }) => handleViewReport(company)}
                    idColumnTitle="Area Code"
                    nameColumnTitle="Area Name"
                    loadingMessage="Loading areas..."
                    emptyMessage="No areas available for selection."
                />
            </div>

            {/* ────── REPORT MODAL ────── */}
            {showReport && selectedCompany && (
                <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
                    <div className="relative bg-white w-full max-w-[95vw] sm:max-w-4xl md:max-w-6xl lg:max-w-7xl rounded-2xl shadow-2xl overflow-hidden">
                        {reportLoading && (
                            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
                                <svg className="animate-spin h-14 w-14 text-[#7A0000]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <p className="text-xl font-bold text-[#7A0000]">Loading Report...</p>
                                <p className="text-sm text-gray-600">Fetching T1, T2, T3 details from server</p>
                            </div>
                        )}
                        {!reportLoading && reportData.length > 0 && (
                            <AreaT1T2T3ReportTable
                                data={reportData}
                                summary={reportSummary}
                                fromDate={fromDate}
                                toDate={toDate}
                                compId={selectedCompany.id}
                                onClose={closeReport}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AreaT1T2T3Report;