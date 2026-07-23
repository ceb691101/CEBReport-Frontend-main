// ProvincePeriodStatusReport.tsx
import React, {useEffect, useState} from "react";
import {Search, RotateCcw, Eye, Download, Printer, X} from "lucide-react";
import {FaChevronDown} from "react-icons/fa";
import {toast} from "react-toastify";
import {useUser} from "../../contexts/UserContext";
interface Company {
    compId: string;
    CompName: string;
}
interface PeriodStatusItem {
    DeptId: string | null;
    DeptNm: string | null; // Cost Center
    CompId: string | null; // Branch
    FinYear: string | null;
    FinPrd: string | null;
    Status: string | null; // Period Status
    CompNm: string | null; // Province name
}
/* ────── Constants ────── */
const MAX_RECORDS = 5000;
const FETCH_TIMEOUT_MS = 120000;
const PAGE_SIZE = 9;
/* ────── Helpers ────── */
const csvEscape = (val: string | number | null | undefined): string => {
    if (val == null) return "";
    const str = String(val);
    if (/[,\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
};
const getMonthName = (monthNum: number | null): string => {
    if (monthNum === null) return "Select Month";
    if (monthNum === 13) return "13th Period";
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];
    return monthNames[monthNum - 1] || "Select Month";
};
/* ────── MAIN COMPONENT ────── */
const ProvincePeriodStatusReport: React.FC = () => {
    const {user} = useUser();
    const epfNo = user?.Userno || "";
    /* ── Province list state ── */
    const [provinces, setCompanies] = useState<Company[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [searchId, setSearchId] = useState("");
    const [searchName, setSearchName] = useState("");
    const [page, setPage] = useState(1);
    const [provinceLoading, setLoading] = useState(true);
    const [provinceError, setError] = useState<string | null>(null);
    /* ── Selection state ── */
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
    const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
    /* ── Report state ── */
    const [selectedProvince, setSelectedProvince] = useState<Company | null>(null);
    const [reportData, setReportData] = useState<PeriodStatusItem[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const maroon = "text-[#7A0000]";
    const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";
    const years = Array.from({length: 21}, (_, i) => new Date().getFullYear() - i);
    const months = Array.from({length: 13}, (_, i) => i + 1);
    /* ────── Close dropdowns on outside click ────── */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest(".year-dropdown") && !target.closest(".month-dropdown")) {
                setYearDropdownOpen(false);
                setMonthDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    /* ────── Fetch Provinces/Companies ────── */
    useEffect(() => {
            const fetchCompanies = async () => {
                // Don't fetch if no EPF number
                if (!epfNo) {
                    setError("No EPF number available. Please login again.");
                    setLoading(false);
                    return;
                }
    
                setLoading(true);
                try {
                    const res = await fetch(
                        `/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/60`
                    );
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
                    const contentType = res.headers.get("content-type");
                    if (!contentType || !contentType.includes("application/json")) {
                        const text = await res.text();
                        throw new Error(
                            `Expected JSON but got ${contentType}. Response: ${text.substring(
                                0,
                                100
                            )}`
                        );
                    }
    
                    const parsed = await res.json();
    
                    let rawData = [];
                    if (Array.isArray(parsed)) {
                        rawData = parsed;
                    } else if (parsed.data && Array.isArray(parsed.data)) {
                        rawData = parsed.data;
                    } else {
                        rawData = [];
                    }
    
                    const companiesData: Company[] = rawData.map((item: any) => ({
                        compId: item.CompId,
                        CompName: item.CompName,
                    }));
    
                    setCompanies(companiesData);
                    setFilteredCompanies(companiesData);
                } catch (e: any) {
                    console.error("API Error:", e);
                    setError(
                        e.message.includes("JSON.parse")
                            ? "Invalid data format received from server. Please check if the API is returning valid JSON."
                            : e.message
                    );
                } finally {
                    setLoading(false);
                }
            };
            fetchCompanies();
        }, [epfNo]);
    /* ────── Filter Provinces ────── */
    useEffect(() => {
        const f = provinces.filter(
            (p) =>
                (!searchId || p.compId.toLowerCase().includes(searchId.toLowerCase())) &&
                (!searchName || p.CompName.toLowerCase().includes(searchName.toLowerCase()))
        );
        setFilteredCompanies(f);
        setPage(1);
    }, [searchId, searchName, provinces]);
    /* ────── Fetch report ────── */
    const fetchReport = async (province: Company) => {
        if (selectedYear === null || selectedMonth === null) {
            toast.error("Please select Year and Month");
            return;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        setSelectedProvince(province);
        setReportLoading(true);
        setReportData([]);
        setShowReport(true);
        try {
            const compIdParam = encodeURIComponent(province.compId);
            const url = `/misapi/api/provincewiseperiodstatus/report/${selectedYear}/${selectedMonth}/${compIdParam}`;
            const res = await fetch(url, {credentials: "include", signal: controller.signal});
            clearTimeout(timeoutId);
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`HTTP ${res.status}: ${txt}`);
            }
            const json = await res.json();
            if (!json.success) throw new Error(json.message || "Failed to load data");
            const items: PeriodStatusItem[] = json.data || [];
            if (items.length > MAX_RECORDS)
                throw new Error(`Too many records (${items.length}). Please refine your search.`);
            if (items.length === 0) {
                toast.warn("No records found for the selected criteria.");
                setShowReport(false);
                setSelectedProvince(null);
                return;
            }
            setReportData(items);
            toast.success(`${items.length} records loaded successfully.`);
        } catch (e: any) {
            if (e.name === "AbortError") {
                toast.error("Request timed out.");
            } else {
                const msg = e.message.includes("Failed to fetch")
                    ? "Server unreachable. Please check your connection."
                    : e.message;
                toast.error(msg);
            }
            setReportData([]);
            setShowReport(false);
            setSelectedProvince(null);
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
        setSelectedProvince(null);
        setReportLoading(false);
    };
    const sortedData = [...reportData].sort((a, b) =>
        (a.DeptId || "").localeCompare(b.DeptId || "")
    );
    const provinceName = reportData.find((r) => r.CompNm)?.CompNm || selectedProvince?.CompName || "";
    const provinceDisplay = selectedProvince?.compId || "";
    const periodLabel = `${getMonthName(selectedMonth)}/${selectedYear ?? ""}`;
    /* ────── CSV download ────── */
    const downloadCSV = () => {
        if (reportData.length === 0) return;
        const titleRows = [
            `Period Opening Status ${periodLabel}`,
            `Province: ${provinceDisplay}/${provinceName}`,
            "",
        ];
        const headers = ["No", "Department ID", "Cost Center", "Branch", "Period Status"];
        const rows: string[] = [headers.join(",")];
        sortedData.forEach((it, i) => {
            rows.push(
                [
                    csvEscape(i + 1),
                    csvEscape(it.DeptId),
                    csvEscape(it.DeptNm),
                    csvEscape(it.CompId),
                    csvEscape(it.Status),
                ].join(",")
            );
        });
        const csv = [...titleRows, ...rows].join("\n");
        const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ProvincePeriodStatus_${selectedYear}_${selectedMonth}_${provinceDisplay}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    /* ────── PDF print ────── */
    const printPDF = () => {
        if (reportData.length === 0) return;
        let rows = "";
        sortedData.forEach((it, i) => {
            rows += `
          <tr class="${i % 2 ? "bg-white" : "bg-gray-50"}">
            <td class="px-3 py-2 border-l border-r border-gray-300 text-center text-xs">${i + 1}</td>
            <td class="px-3 py-2 border-r border-gray-300 text-left text-xs font-mono">${it.DeptId || ""}</td>
            <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${it.DeptNm || ""}</td>
            <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${it.CompId || ""}</td>
            <td class="px-3 py-2 border-r border-gray-300 text-left text-xs">${it.Status || ""}</td>
          </tr>`;
        });
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @media print {
      @page { margin: 8mm 5mm 10mm 5mm; }
      body { margin:0; font-family:Arial,Helvetica,sans-serif; }
      .title { margin: 10px 8px 20px; text-align:center; font-weight:bold; color:#7A0000; font-size:13px; }
      .info { margin:6px 8px; font-size:9px; }
      table { border-collapse:collapse; width:100%; font-size:8.5px; }
      th, td { border:1px solid #d1d5db; padding:6px 8px; word-wrap:break-word; }
      th { background:linear-gradient(to right,#7A0000,#A52A2A); color:white; text-align:center; font-weight:bold; }
      .font-mono { font-family:monospace; }
      @page {
        @bottom-left  { content:"Printed on: ${new Date().toLocaleString("en-US", {timeZone: "Asia/Colombo"})}"; font-size:7px; color:gray; }
        @bottom-right { content:"Page " counter(page) " of " counter(pages); font-size:7px; color:gray; }
      }
    }
  </style>
</head>
<body>
  <div class="title">Period Opening Status ${periodLabel}</div>
  <div class="info">
    <strong>Province:</strong> ${provinceDisplay}/${provinceName}
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:6%;">No</th>
        <th style="width:22%;">Department ID</th>
        <th style="width:32%;">Cost Center</th>
        <th style="width:15%;">Branch</th>
        <th style="width:25%;">Period Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top:20px; display:flex; justify-content:space-between; padding:0 15px; font-size:9px;">
    <div>Prepared By: ____________________</div>
    <div>Checked By: ____________________</div>
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
    const paginated = filteredCompanies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    /* ────── Dropdown components ────── */
    const YearDropdown = () => (
        <div className="year-dropdown relative w-full">
            <button
                type="button"
                onClick={() => {
                    setYearDropdownOpen(!yearDropdownOpen);
                    setMonthDropdownOpen(false);
                }}
                className="w-full flex justify-between items-center px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition"
            >
                <span>{selectedYear !== null ? selectedYear : "Select Year"}</span>
                <FaChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${yearDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {yearDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                    {years.map((year) => (
                        <button
                            key={year}
                            type="button"
                            onClick={() => {
                                setSelectedYear(year);
                                setYearDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                                selectedYear === year ? "bg-[#7A0000] text-white" : "text-gray-700"
                            }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
    const MonthDropdown = () => (
        <div className="month-dropdown relative w-full">
            <button
                type="button"
                onClick={() => {
                    setMonthDropdownOpen(!monthDropdownOpen);
                    setYearDropdownOpen(false);
                }}
                className="w-full flex justify-between items-center px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition"
            >
                <span>{getMonthName(selectedMonth)}</span>
                <FaChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${monthDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {monthDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                    {months.map((month) => (
                        <button
                            key={month}
                            type="button"
                            onClick={() => {
                                setSelectedMonth(month);
                                setMonthDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                                selectedMonth === month ? "bg-[#7A0000] text-white" : "text-gray-700"
                            }`}
                        >
                            {getMonthName(month)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
    /* ────── RENDER ────── */
    return (
        <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold ${maroon}`}>Province Wise Period Status</h2>
            </div>
            {/* Search + Year/Month Controls */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="flex items-center gap-2">
                        <label className={`text-xs font-bold ${maroon} whitespace-nowrap`}>Year:</label>
                        <div className="flex-1">
                            <YearDropdown />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className={`text-xs font-bold ${maroon} whitespace-nowrap`}>Month:</label>
                        <div className="flex-1">
                            <MonthDropdown />
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchId}
                            placeholder="Search by ID"
                            onChange={(e) => setSearchId(e.target.value)}
                            className="pl-10 pr-3 py-1.5 w-40 md:w-48 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                        />
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchName}
                            placeholder="Search by Name"
                            onChange={(e) => setSearchName(e.target.value)}
                            className="pl-10 pr-3 py-1.5 w-40 md:w-48 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A0000] transition text-sm"
                        />
                    </div>
                    {(searchId || searchName) && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
                        >
                            <RotateCcw className="w-3 h-3" /> Clear
                        </button>
                    )}
                </div>
            </div>
            {provinceLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#7A0000]"></div>
                    <p className="mt-3 text-gray-600 text-sm">Loading provinces...</p>
                </div>
            )}
            {provinceError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                    {provinceError}
                </div>
            )}
            {!provinceLoading && !provinceError && filteredCompanies.length > 0 && (
                <>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <div className="max-h-[50vh] overflow-y-auto">
                            <table className="w-full table-fixed text-left text-xs md:text-sm">
                                <thead className={`${maroonGrad} text-white sticky top-0`}>
                                    <tr>
                                        <th className="px-4 py-2 w-1/4">Province Code</th>
                                        <th className="px-4 py-2 w-1/2">Province Name</th>
                                        <th className="px-4 py-2 w-1/4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((province, i) => (
                                        <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                                            <td className="px-4 py-2 truncate">{province.compId}</td>
                                            <td className="px-4 py-2 truncate">{province.CompName}</td>
                                            <td className="px-4 py-2 text-center">
                                                <button
                                                    onClick={() => fetchReport(province)}
                                                    disabled={selectedYear === null || selectedMonth === null}
                                                    className={`px-3 py-1 rounded text-xs font-medium hover:brightness-110 transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 mx-auto
                            ${selectedProvince?.compId === province.compId ? "bg-green-600 text-white" : `${maroonGrad} text-white`}`}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    {selectedProvince?.compId === province.compId ? "Viewing" : "View"}
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
                            className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-gray-600">
                            Page {page} of {Math.ceil(filteredCompanies.length / PAGE_SIZE)}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(Math.ceil(filteredCompanies.length / PAGE_SIZE), p + 1))}
                            disabled={page >= Math.ceil(filteredCompanies.length / PAGE_SIZE)}
                            className="px-3 py-1 border rounded bg-white text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
            {/* ────── REPORT MODAL ────── */}
            {showReport && selectedProvince && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white">
                    <div className="relative bg-white w-[95vw] sm:w-[85vw] md:w-[70vw] lg:w-[60vw] max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
                        {reportLoading && (
                            <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center gap-4">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#7A0000]"></div>
                                <p className="text-xl font-bold text-[#7A0000]">Loading Report...</p>
                                <p className="text-sm text-gray-600">Fetching period status from server</p>
                            </div>
                        )}
                        {!reportLoading && reportData.length > 0 && (
                            <div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
                                <div className="flex justify-end gap-3 mb-6 md:mb-8 print:hidden">
                                    <button
                                        onClick={downloadCSV}
                                        className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50"
                                    >
                                        <Download className="w-4 h-4" /> CSV
                                    </button>
                                    <button
                                        onClick={printPDF}
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
                                    Period Opening Status {periodLabel}
                                </h2>
                                <div className="text-sm mb-3 ml-5 mr-12">
                                    <span className="font-bold">Province:</span> {provinceDisplay}/{provinceName}
                                </div>
                                <div className="ml-5 mt-1 mb-5 border border-gray-200 rounded-lg overflow-x-auto print:ml-12 print:mt-12 print:overflow-visible">
                                    <table className="w-full text-xs border-collapse">
                                        <thead className={`${maroonGrad} text-white`}>
                                            <tr>
                                                <th className="px-4 py-2 border border-gray-300" style={{width: "6%"}}>No</th>
                                                <th className="px-4 py-2 border border-gray-300" style={{width: "22%"}}>Department ID</th>
                                                <th className="px-4 py-2 border border-gray-300" style={{width: "32%"}}>Cost Center</th>
                                                <th className="px-4 py-2 border border-gray-300" style={{width: "15%"}}>Branch</th>
                                                <th className="px-4 py-2 border border-gray-300" style={{width: "25%"}}>Period Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedData.map((it, i) => (
                                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                                    <td className="px-4 py-2 border-l border-r border-gray-300 text-center">{i + 1}</td>
                                                    <td className="px-4 py-2 font-mono border-r border-gray-300">{it.DeptId || ""}</td>
                                                    <td className="px-4 py-2 border-r border-gray-300">{it.DeptNm || ""}</td>
                                                    <td className="px-4 py-2 border-r border-gray-300">{it.CompId || ""}</td>
                                                    <td className="px-4 py-2 border-r border-gray-300">{it.Status || ""}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <p className="text-xs text-gray-500 mt-2 text-right px-2">
                                        Total records: {reportData.length.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default ProvincePeriodStatusReport;