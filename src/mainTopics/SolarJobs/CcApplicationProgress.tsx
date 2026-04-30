import React, {useState, useRef} from "react";
import {toast} from "react-toastify";
import {Eye} from "lucide-react";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReportViewer from "../../components/utils/ReportViewer";
import {API_BASE} from "../../config/apiBase";

interface CcApplicationRow {
ApplicationId: string;
ApplicationNo: string;
SubmitDate: string | null;
ApprovedDate: string | null;
ProjectNo: string;
PivDate: string | null;
ApplicationSubType: string;
PaidDate: string | null;
Piv2PaidDate: string | null;
EnergizedDate: string | null;
ExistingAccNo: string;
CctName: string;
}

const today = new Date();
const formatLocalYmd = (date: Date) => {
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");
return `${year}-${month}-${day}`;
};

const defaultFromDate = formatLocalYmd(new Date(today.getFullYear(), today.getMonth(), 1));
const defaultToDate = formatLocalYmd(today);

const formatDate = (date: string | null): string => {
if (!date) return "";
const dateObj = new Date(date);
if (Number.isNaN(dateObj.getTime())) return date;
return dateObj.toLocaleDateString("en-GB", {
year: "numeric",
month: "2-digit",
day: "2-digit",
});
};

const csvEscape = (val: string | number | null | undefined): string => {
if (val == null) return '""';
const str = String(val);
if (/[,\n"']/.test(str)) return `"${str.replace(/"/g, '""')}"`;
return str;
};

const buildApiUrl = (fromDate: string, toDate: string, costctr: string) => {
        const base = API_BASE || "/misreportsapi";
        const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
        const params = new URLSearchParams({
                fromDate,
                toDate,
                costctr,
        });
        return `${normalizedBase}/api/solarjobs/ccapplication/list?${params.toString()}`;
};

const columns = [
"Application ID",
"Application No",
"Submit Date",
"Approved Date",
"Project No",
"PIV Date",
"Application Sub Type",
"Paid Date",
"PIV2 Paid Date",
"Energized Date",
"Existing Acc No",
"Cost Center"
];

const CcApplicationProgress: React.FC = () => {
const iframeRef = useRef<HTMLIFrameElement>(null);

const [fromDate, setFromDate] = useState(defaultFromDate);
const [toDate, setToDate] = useState(defaultToDate);
const [costctr, setCostctr] = useState("");
// removed ccProgress filter state (UI removed)
const [reportData, setReportData] = useState<CcApplicationRow[]>([]);
const [reportLoading, setReportLoading] = useState(false);
const [showReport, setShowReport] = useState(false);

const maroon = "text-[#7A0000]";
const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

const handleViewReport = async () => {
if (!fromDate || !toDate || !costctr.trim()) {
toast.error("Please select Dates and Cost Center");
return;
}

if (new Date(toDate) < new Date(fromDate)) {
toast.error("To Date cannot be earlier than From Date");
return;
}

setReportLoading(true);
setReportData([]);
setShowReport(true);

                try {
                        const url = buildApiUrl(fromDate, toDate, costctr.trim());
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
const items: CcApplicationRow[] = Array.isArray(data)
? data
: data.data || [];

if (data.errorMessage) {
throw new Error(data.errorMessage);
}

setReportData(items);
items.length === 0
? toast.warn("No records found")
: toast.success("Report loaded successfully");
} catch (err: any) {
toast.error("Failed to load report: " + err.message);
setShowReport(false);
} finally {
setReportLoading(false);
}
};

const closeReport = () => {
setShowReport(false);
setReportData([]);
};

const handleDownloadCSV = () => {
if (reportData.length === 0) return;

        const csvRows: string[] = [
                "Solar Retail Roof-top Job Progress",
                `Cost Center: ${costctr}`,
                `Period: ${fromDate} to ${toDate}`,
                "",
                columns.map(csvEscape).join(",")
        ];

reportData.forEach((item) => {
const row = [
`="${item.ApplicationId ?? ""}"`,
`="${item.ApplicationNo ?? ""}"`,
formatDate(item.SubmitDate),
formatDate(item.ApprovedDate),
`="${item.ProjectNo ?? ""}"`,
formatDate(item.PivDate),
item.ApplicationSubType || "",
formatDate(item.PaidDate),
formatDate(item.Piv2PaidDate),
formatDate(item.EnergizedDate),
`="${item.ExistingAccNo ?? ""}"`,
`="${item.CctName ?? ""}"`
];
csvRows.push(row.map(csvEscape).join(","));
});

const csvContent = csvRows.join("\n");
const blob = new Blob(["\uFEFF" + csvContent], {
type: "text/csv;charset=utf-8;",
});
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = `Cc_Application_Progress_${costctr}_${fromDate}_to_${toDate}.csv`;
link.click();
URL.revokeObjectURL(url);
};

const printPDF = () => {
if (reportData.length === 0 || !iframeRef.current) return;

const tableStyle = `
        table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 10px; }
        th, td { border: 1px solid #aaa; padding: 6px; word-wrap: break-word; vertical-align: top; text-align: left; }
        th { font-weight: bold; background-color: #f0f0f0; }
        .center { text-align: center; }
        `;

        let html = `
        <html><head><title>Solar Retail Roof-top Job Progress</title>
        <style>${tableStyle}</style></head>
        <body>
        <h2 style="color: #7A0000; text-align: center;">Solar Retail Roof-top Job Progress</h2>
        <p><strong>Cost Center:</strong> ${costctr}<br/>
        <strong>Period:</strong> ${fromDate} to ${toDate}</p>
        <table>
        <thead><tr>
        ${columns.map((c) => `<th>${c}</th>`).join("")}
        </tr></thead>
        <tbody>
        `;

reportData.forEach((item) => {
html += `<tr>
                <td>${escapeHtml(item.ApplicationId)}</td>
                <td>${escapeHtml(item.ApplicationNo)}</td>
                <td>${formatDate(item.SubmitDate)}</td>
                <td>${formatDate(item.ApprovedDate)}</td>
                <td>${escapeHtml(item.ProjectNo)}</td>
                <td>${formatDate(item.PivDate)}</td>
                <td>${escapeHtml(item.ApplicationSubType)}</td>
                <td>${formatDate(item.PaidDate)}</td>
                <td>${formatDate(item.Piv2PaidDate)}</td>
                <td>${formatDate(item.EnergizedDate)}</td>
                <td>${escapeHtml(item.ExistingAccNo)}</td>
                <td>${escapeHtml(item.CctName)}</td>
            </tr>`;
});

html += "</tbody></table></body></html>";

const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
if (doc) {
doc.open();
doc.write(html);
doc.close();

setTimeout(() => {
iframeRef.current?.contentWindow?.focus();
iframeRef.current?.contentWindow?.print();
}, 500);
}
};

const escapeHtml = (text: string | null | undefined): string => {
if (text == null) return "";
const div = document.createElement("div");
div.textContent = text;
return div.innerHTML;
};

return (
<div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
<iframe ref={iframeRef} style={{display: "none"}} title="print-frame" />

<h2 className={`text-xl font-bold mb-4 ${maroon}`}>
Solar Retail Roof-top Job Progress
</h2>

<div className="flex flex-wrap items-end justify-start sm:justify-end gap-3 mb-6">
<DateRangePicker
fromDate={fromDate}
toDate={toDate}
onFromChange={setFromDate}
onToChange={setToDate}
/>

<div className="flex flex-col gap-1 w-[160px]">
<input
type="text"
value={costctr}
onChange={(e) => setCostctr(e.target.value)}
placeholder="Cost Center (E.g. 510.30)"
className="px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#7A0000]"
/>
</div>

 

<button
onClick={handleViewReport}
className={`flex items-center justify-center gap-2 px-5 py-2 rounded text-white font-medium ${maroonGrad} hover:-translate-y-0.5 hover:shadow-lg transition-all`}
>
<Eye className="w-4 h-4" /> View
</button>
</div>

{showReport && (
<ReportViewer
title="Solar Retail Roof-top Job Progress"
subtitlebold="Date Period:"
subtitlenormal={`${fromDate} to ${toDate}`}
subtitlebold2="Cost Center:"
subtitlenormal2={costctr}
                
loading={reportLoading}
hasData={reportData.length > 0}
handleDownloadCSV={handleDownloadCSV}
printPDF={printPDF}
closeReport={closeReport}
currency=""
>
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-max border border-gray-300">
<thead className="bg-[#f0f0f0] sticky top-0 z-10">
<tr className="text-gray-800 uppercase font-bold text-[10px]">
{columns.map((c, i) => (
<th key={i} className="p-2 border border-gray-300">{c}</th>
))}
</tr>
</thead>
<tbody className="bg-white">
{reportData.map((item, idx) => (
<tr key={idx} className="hover:bg-gray-50 transition-colors">
<td className="p-2 border border-gray-300 whitespace-nowrap">{item.ApplicationId}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{item.ApplicationNo}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{formatDate(item.SubmitDate)}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{formatDate(item.ApprovedDate)}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{item.ProjectNo}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{formatDate(item.PivDate)}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{item.ApplicationSubType}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{formatDate(item.PaidDate)}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{formatDate(item.Piv2PaidDate)}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{formatDate(item.EnergizedDate)}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{item.ExistingAccNo}</td>
<td className="p-2 border border-gray-300 whitespace-nowrap">{item.CctName}</td>
</tr>
))}
</tbody>
</table>
</div>
</ReportViewer>
)}
</div>
);
};

export default CcApplicationProgress;
