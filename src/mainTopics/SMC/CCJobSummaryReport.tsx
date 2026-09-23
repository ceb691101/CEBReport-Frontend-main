// CCJobSummaryReport.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw, Eye, Download, Printer, X } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";

/* ────── Types ────── */
interface Department {
    DeptId: string;
    DeptName: string;
}

interface CCJobSummaryItem {
    JobNum: string | null;
    MatNm: string | null;
    QtyOnHand: number | null;
    MatCd: string | null;
    UnitCost: number | null;
    TrxType: string | null;
    TrxQty: number | null;
}

interface CCJobSummarySummary {
    repYear: string;
    costCtr: string;
    fromNo: string;
    toNo: string;
    totalRecords: number;
    totalTrxQty: number;
}

interface PivotRow {
    matCd: string;
    matNm: string;
    unitCost: number;
    qtyOnHand: number;
    values: Record<string, number>; // jobNum -> qty
}

/* ────── Constants ────── */
const FETCH_TIMEOUT_MS = 240000;

/* ────── Helpers ────── */
const formatQty = (val: number | null | undefined): string => {
    if (val == null || isNaN(Number(val))) return "0.00";
    return Number(val).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const csvEscape = (val: string | number | null | undefined): string => {
    if (val == null) return "";
    const str = String(val);
    return /[,\n"]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/* Group flat rows into (MatCd + UnitCost) pivot rows, with one dynamic column per job number */
function buildPivot(data: CCJobSummaryItem[]): { jobNumbers: string[]; rows: PivotRow[] } {
    const jobNumbers = Array.from(new Set(data.map((d) => (d.JobNum || "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
    );

    const rowMap = new Map<string, PivotRow>();
    data.forEach((it) => {
        const matCd = (it.MatCd || "").trim();
        const unitCost = it.UnitCost || 0;
        const key = `${matCd}||${unitCost}`;
        if (!rowMap.has(key)) {
            rowMap.set(key, {
                matCd,
                matNm: (it.MatNm || "").trim(),
                unitCost,
                qtyOnHand: it.QtyOnHand || 0,
                values: {},
            });
        }
        const row = rowMap.get(key)!;
        const job = (it.JobNum || "").trim();
        if (job) row.values[job] = (row.values[job] || 0) + (it.TrxQty || 0);
    });

    const rows = Array.from(rowMap.values()).sort(
        (a, b) => a.matCd.localeCompare(b.matCd) || a.unitCost - b.unitCost
    );

    return { jobNumbers, rows };
}

const rowTotal = (row: PivotRow, jobNumbers: string[]): number =>
    jobNumbers.reduce((sum, j) => sum + (row.values[j] || 0), 0);

const columnTotal = (rows: PivotRow[], job: string): number =>
    rows.reduce((sum, r) => sum + (r.values[job] || 0), 0);

/* ────── Report Table Component ────── */
const CCJobSummaryTable: React.FC<{
    data: CCJobSummaryItem[];
    summary: CCJobSummarySummary | null;
    repYear: string;
    fromNo: string;
    toNo: string;
    costCtr: string;
    departmentName: string;
    onClose: () => void;
}> = ({ data, summary, repYear, fromNo, toNo, costCtr, departmentName, onClose }) => {
    const maroon = "text-[#7A0000]";
    const reportTitle = `Cost Center Wise Job Summary From ${fromNo} To ${toNo}`;

    const pivot = useMemo(() => buildPivot(data), [data]);
    const { jobNumbers, rows } = pivot;
    const totalRecords = summary?.totalRecords ?? data.length;

    /* ────── CSV Download ────── */
    const downloadCSV = () => {
        const titleRows = [
            reportTitle,
            `Cost Center: ${costCtr} / ${departmentName}`,
            `Year: ${repYear}`,
            `Total Records: ${totalRecords}`,
            "",
        ];
        const headers = ["Item Code", "Material Name", "Unit Cost", "Qty on Hand", ...jobNumbers, "Total Qty"];
        const dataRows = rows.map((row) => [
            csvEscape(row.matCd),
            csvEscape(row.matNm),
            csvEscape(formatQty(row.unitCost)),
            csvEscape(formatQty(row.qtyOnHand)),
            ...jobNumbers.map((j) => csvEscape(formatQty(row.values[j] || 0))),
            csvEscape(formatQty(rowTotal(row, jobNumbers))),
        ]);
        const totalRow = [
            "", "Total", "", "",
            ...jobNumbers.map((j) => csvEscape(formatQty(columnTotal(rows, j)))),
            csvEscape(formatQty(rows.reduce((s, r) => s + rowTotal(r, jobNumbers), 0))),
        ];
        const csv = [...titleRows, headers.join(","), ...dataRows.map((r) => r.join(",")), totalRow.join(",")].join(
            "\n"
        );
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CCJobSummary_${costCtr}_${repYear}_${fromNo}-${toNo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ────── Print PDF ────── */
    const printPDF = () => {
        const headCells =
            `<th>Item Code</th><th>Material Name</th><th>Unit Cost</th><th>Qty on Hand</th>` +
            jobNumbers.map((j) => `<th>${j}</th>`).join("") +
            `<th>Total Qty</th>`;

        let bodyRows = "";
        rows.forEach((row, i) => {
            bodyRows += `<tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">`;
            bodyRows += `<td style="text-align:left;">${row.matCd}</td>`;
            bodyRows += `<td style="text-align:left;">${row.matNm}</td>`;
            bodyRows += `<td style="text-align:right;">${formatQty(row.unitCost)}</td>`;
            bodyRows += `<td style="text-align:right;">${formatQty(row.qtyOnHand)}</td>`;
            jobNumbers.forEach((j) => {
                bodyRows += `<td style="text-align:right;">${formatQty(row.values[j] || 0)}</td>`;
            });
            bodyRows += `<td style="text-align:right;font-weight:bold;">${formatQty(rowTotal(row, jobNumbers))}</td>`;
            bodyRows += `</tr>`;
        });

        let totalRowHtml = `<tr style="background:#d3d3d3;font-weight:bold;"><td colspan="4" style="text-align:right;">Total</td>`;
        jobNumbers.forEach((j) => {
            totalRowHtml += `<td style="text-align:right;">${formatQty(columnTotal(rows, j))}</td>`;
        });
        const grandTotal = rows.reduce((s, r) => s + rowTotal(r, jobNumbers), 0);
        totalRowHtml += `<td style="text-align:right;">${formatQty(grandTotal)}</td></tr>`;

        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @media print {
      @page { size: landscape; margin: 6mm 4mm 10mm 4mm; }
      body { margin:0; font-family:Arial,Helvetica,sans-serif; }
      .title { margin: 6px 6px 2px; text-align:center; font-weight:bold; color:#7A0000; font-size:12px; }
      .info { margin: 0 6px 8px; font-size:9px; display:flex; justify-content:space-between; }
      table { border-collapse:collapse; width:100%; font-size:6.5px; table-layout:fixed; }
      th, td { border:1px solid #d1d5db; padding:2px 3px; word-wrap:break-word; }
      th { background:#7A0000; color:#fff; text-align:center; font-weight:bold; }
      tr.bg-gray-50 { background:#f5f5f5; }
      .sign-block { margin-top:24px; padding:0 6px; font-size:9px; display:flex; justify-content:space-between; }
      .sign-col { width:30%; }
      .sign-line { border-top:1px solid #333; margin-top:20px; padding-top:3px; }
      @page {
        @bottom-left { content:"Date : ${new Date().toISOString().slice(0, 10)}"; font-size:7px; color:gray; }
        @bottom-right { content:"Page " counter(page) " of " counter(pages); font-size:7px; color:gray; }
      }
    }
  </style>
</head>
<body>
  <div class="title">${reportTitle}</div>
  <div class="info">
    <div><strong>Cost Centre:</strong> ${costCtr} / ${departmentName}</div>
    <div><strong>Year:</strong> ${repYear}</div>
  </div>
  <table>
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows}${totalRowHtml}</tbody>
  </table>
  <div class="sign-block">
    <div class="sign-col"><div class="sign-line">Prepared By</div></div>
    <div class="sign-col"><div class="sign-line">Checked By</div></div>
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
            <div className="relative bg-white w-[97vw] max-w-[1900px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-24 lg:mt-28 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
                <div className="p-4 max-h-[85vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible">
                    <div className="flex justify-end gap-3 mb-4 print:hidden">
                        <button
                            onClick={downloadCSV}
                            className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 transition"
                        >
                            <Download className="w-3 h-3" /> CSV
                        </button>
                        <button
                            onClick={printPDF}
                            className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 transition"
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

                    <h2 className={`text-base md:text-lg font-bold text-center ${maroon}`}>{reportTitle}</h2>
                    <div className="text-sm mb-4 px-2 text-gray-700 flex flex-wrap gap-x-6">
                        <div>
                            <span className="font-bold">Cost Center:</span> {costCtr} / {departmentName}
                        </div>
                        <div>
                            <span className="font-bold">Year:</span> {repYear}
                        </div>
                        <div className="text-gray-500">Records: {totalRecords}</div>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-x-auto">
                        <table className="border-collapse text-[10px]" style={{ minWidth: "100%" }}>
                            <thead>
                                <tr className="bg-[#7A0000] text-white">
                                    <th className="sticky left-0 z-10 bg-[#7A0000] px-2 py-1.5 border border-gray-300 min-w-[90px]">
                                        Item Code
                                    </th>
                                    <th className="sticky left-[90px] z-10 bg-[#7A0000] px-2 py-1.5 border border-gray-300 min-w-[220px] text-left">
                                        Material Name
                                    </th>
                                    <th className="px-2 py-1.5 border border-gray-300 min-w-[80px] text-right">Unit Cost</th>
                                    <th className="px-2 py-1.5 border border-gray-300 min-w-[80px] text-right">Qty on Hand</th>
                                    {jobNumbers.map((j) => (
                                        <th key={j} className="px-1.5 py-1 border border-gray-300 min-w-[60px] whitespace-nowrap">
                                            {j}
                                        </th>
                                    ))}
                                    <th className="px-2 py-1.5 border border-gray-300 min-w-[80px] text-right">Total Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={`${row.matCd}-${row.unitCost}-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                        <td className="sticky left-0 z-10 bg-inherit px-2 py-1 border border-gray-300 font-mono">
                                            {row.matCd}
                                        </td>
                                        <td className="sticky left-[90px] z-10 bg-inherit px-2 py-1 border border-gray-300">
                                            {row.matNm}
                                        </td>
                                        <td className="px-2 py-1 border border-gray-300 text-right font-mono">{formatQty(row.unitCost)}</td>
                                        <td className="px-2 py-1 border border-gray-300 text-right font-mono">{formatQty(row.qtyOnHand)}</td>
                                        {jobNumbers.map((j) => (
                                            <td key={j} className="px-1.5 py-1 border border-gray-300 text-right font-mono">
                                                {formatQty(row.values[j] || 0)}
                                            </td>
                                        ))}
                                        <td className="px-2 py-1 border border-gray-300 text-right font-mono font-semibold">
                                            {formatQty(rowTotal(row, jobNumbers))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-[#d3d3d3] font-bold">
                                    <td colSpan={4} className="px-2 py-1.5 border border-gray-300 text-right">
                                        Total
                                    </td>
                                    {jobNumbers.map((j) => (
                                        <td key={j} className="px-1.5 py-1 border border-gray-300 text-right font-mono">
                                            {formatQty(columnTotal(rows, j))}
                                        </td>
                                    ))}
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">
                                        {formatQty(rows.reduce((s, r) => s + rowTotal(r, jobNumbers), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* ────── Sign-off block ────── */}
                    <div className="mt-8 mb-2 px-2 print:hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs max-w-md">
                            <div>
                                <div className="border-b border-gray-400 h-8"></div>
                                <div className="mt-1 text-gray-600 font-semibold">Prepared By</div>
                            </div>
                            <div>
                                <div className="border-b border-gray-400 h-8"></div>
                                <div className="mt-1 text-gray-600 font-semibold">Checked By</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ────── MAIN COMPONENT ────── */
const PAGE_SIZE = 9;

const CCJobSummaryReport: React.FC = () => {
    const { user } = useUser();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [filtered, setFiltered] = useState<Department[]>([]);
    const [searchId, setSearchId] = useState("");
    const [searchName, setSearchName] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [repYear, setRepYear] = useState(String(new Date().getFullYear()));
    const [fromNo, setFromNo] = useState("0001");
    const [toNo, setToNo] = useState("0030");

    const [selectedDept, setSelectedDept] = useState<Department | null>(null);
    const [reportData, setReportData] = useState<CCJobSummaryItem[]>([]);
    const [reportSummary, setReportSummary] = useState<CCJobSummarySummary | null>(null);
    const [showReport, setShowReport] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);

    const epfNo = user?.Userno || "";
    const maroon = "text-[#7A0000]";
    const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

    // Generate list of years for selection (current year down to 10 years back)
    const currentYear = new Date().getFullYear();
    const yearsList = Array.from({ length: 11 }, (_, i) => String(currentYear - i));

    useEffect(() => {
        const fetchDepartments = async () => {
            if (!epfNo) {
                setError("No EPF number available.");
                toast.error("Login required.");
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(`/misapi/api/incomeexpenditure/departments/${epfNo}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const raw = Array.isArray(json)
                    ? json
                    : json.data || json.result || json.departments || [];
                const deps: Department[] = raw.map((d: any) => ({
                    DeptId: String(d.DeptId || d.deptId || ""),
                    DeptName: String(d.DeptName || d.deptName || "").trim(),
                }));
                setDepartments(deps);
                setFiltered(deps);
            } catch (e: any) {
                setError(e.message);
                toast.error("Failed to load cost centers.");
            } finally {
                setLoading(false);
            }
        };

        fetchDepartments();
    }, [epfNo]);

    useEffect(() => {
        const f = departments.filter(
            (d) =>
                (!searchId || d.DeptId.toLowerCase().includes(searchId.toLowerCase())) &&
                (!searchName || d.DeptName.toLowerCase().includes(searchName.toLowerCase()))
        );
        setFiltered(f);
        setPage(1);
    }, [searchId, searchName, departments]);

    const fetchReport = async (dept: Department) => {
        if (!repYear.trim() || repYear.trim().length !== 4 || isNaN(Number(repYear))) {
            toast.error("Please enter a valid 4-digit year.");
            return;
        }
        if (!fromNo.trim() || !toNo.trim()) {
            toast.error("Please enter both From No and To No.");
            return;
        }

        setReportLoading(true);
        setSelectedDept(dept);
        setReportData([]);
        setReportSummary(null);
        setShowReport(true);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
            const url = `/misapi/api/ccjobsummary/report?repYear=${repYear.trim()}&costCtr=${dept.DeptId}&fromNo=${encodeURIComponent(
                fromNo.trim()
            )}&toNo=${encodeURIComponent(toNo.trim())}`;
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            if (!json.success) throw new Error(json.message || "No data");

            const items: CCJobSummaryItem[] = json.data || [];
            if (items.length === 0) {
                toast.warn("No records found.");
                setShowReport(false);
                setSelectedDept(null);
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
            setSelectedDept(null);
        } finally {
            setReportLoading(false);
        }
    };

    const clearFilters = () => {
        setSearchId("");
        setSearchName("");
    };

    const closeReport = () => {
        setShowReport(false);
        setReportData([]);
        setReportSummary(null);
        setSelectedDept(null);
        setReportLoading(false);
    };

    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div
            className="max-w-[95%] mx-auto p-6 bg-white rounded-lg shadow-md text-sm md:text-base relative ml-16 mt-8"
            style={{ marginLeft: "2rem" }}
        >
            <h2 className={`text-xl font-bold mb-4 ${maroon}`}>
                Cost Center Wise Job Summary
            </h2>

            {/* ────── Year / Job No range filters ────── */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="flex items-center gap-2">
                        <label className={`text-xs font-bold ${maroon} whitespace-nowrap`}>
                            Year:
                        </label>
                        <select
                            value={repYear}
                            onChange={(e) => setRepYear(e.target.value)}
                            className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                        >
                            {yearsList.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className={`text-xs font-bold ${maroon} whitespace-nowrap`}>
                            Job No From:
                        </label>
                        <input
                            type="text"
                            value={fromNo}
                            placeholder="0001"
                            onChange={(e) => setFromNo(e.target.value)}
                            className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm font-mono"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className={`text-xs font-bold ${maroon} whitespace-nowrap`}>
                            Job No To:
                        </label>
                        <input
                            type="text"
                            value={toNo}
                            placeholder="0030"
                            onChange={(e) => setToNo(e.target.value)}
                            className="pl-3 pr-3 py-1.5 w-full rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm font-mono"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        value={searchId}
                        placeholder="Search by ID"
                        onChange={(e) => setSearchId(e.target.value)}
                        className="pl-10 pr-3 py-1.5 w-40 rounded-md border border-gray-300 focus:ring-2 focus:ring-[#7A0000] focus:border-transparent text-xs"
                    />
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        value={searchName}
                        placeholder="Search by Name"
                        onChange={(e) => setSearchName(e.target.value)}
                        className="pl-10 pr-3 py-1.5 w-40 rounded-md border border-gray-300 focus:ring-2 focus:ring-[#7A0000] focus:border-transparent text-xs"
                    />
                </div>
                {(searchId || searchName) && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-xs transition"
                    >
                        <RotateCcw className="w-3 h-3" /> Clear
                    </button>
                )}
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <svg className="animate-spin h-10 w-10 text-[#7A0000]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="mt-3 text-gray-600 text-sm">Loading cost centers...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
                    {error}
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <>
                    <div className="overflow-x-auto rounded-lg border border-gray-300">
                        <div className="max-h-[50vh] overflow-y-auto">
                            <table className="w-full table-fixed text-left text-xs md:text-sm border-collapse">
                                <thead>
                                    <tr className="bg-[#7A0000] text-white sticky top-0">
                                        <th className="border border-gray-300 px-4 py-2 w-1/4 text-center font-bold">Cost Center Code</th>
                                        <th className="border border-gray-300 px-4 py-2 w-1/2 text-center font-bold">Cost Center Name</th>
                                        <th className="border border-gray-300 px-4 py-2 w-1/4 text-center font-bold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((dept, i) => (
                                        <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                                            <td className="border border-gray-300 px-4 py-2 truncate font-mono">{dept.DeptId}</td>
                                            <td className="border border-gray-300 px-4 py-2 truncate">{dept.DeptName}</td>
                                            <td className="border border-gray-300 px-4 py-2 text-center">
                                                <button
                                                    onClick={() => fetchReport(dept)}
                                                    className={`px-3 py-1 rounded-md text-xs font-medium hover:opacity-90 transition shadow-sm flex items-center gap-1 mx-auto
                            ${selectedDept?.DeptId === dept.DeptId
                                                            ? "bg-green-600 text-white"
                                                            : `${maroonGrad} text-white`
                                                        }`}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    {selectedDept?.DeptId === dept.DeptId ? "Viewing" : "View"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-3 mt-3">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40 transition"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-gray-600">
                            Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}
                        </span>
                        <button
                            onClick={() =>
                                setPage((p) =>
                                    Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1)
                                )
                            }
                            disabled={page >= Math.ceil(filtered.length / PAGE_SIZE)}
                            className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40 transition"
                        >
                            Next
                        </button>
                    </div>
                </>
            )}

            {showReport && selectedDept && (
                <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
                    <div className="relative bg-white w-full max-w-[95vw] sm:max-w-4xl md:max-w-6xl lg:max-w-7xl rounded-2xl shadow-2xl overflow-hidden">
                        {reportLoading && (
                            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
                                <svg className="animate-spin h-14 w-14 text-[#7A0000]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <p className="text-xl font-bold text-[#7A0000]">Loading Report...</p>
                                <p className="text-sm text-gray-600">Fetching job summary from server</p>
                            </div>
                        )}
                        {!reportLoading && reportData.length > 0 && (
                            <CCJobSummaryTable
                                data={reportData}
                                summary={reportSummary}
                                repYear={repYear}
                                fromNo={fromNo}
                                toNo={toNo}
                                costCtr={selectedDept.DeptId}
                                departmentName={selectedDept.DeptName}
                                onClose={closeReport}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CCJobSummaryReport;