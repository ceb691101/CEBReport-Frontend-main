import React, { useState, useRef } from "react";
import { Eye } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { toast } from "react-toastify";
import DateRangePicker from "../../components/utils/DateRangePicker";
import ReportViewer from "../../components/utils/ReportViewer";

export interface SawMillsReportItem {
    DeptId?: string | null;
    deptId?: string | null;

    PrjAssDt?: string | null;
    prjAssDt?: string | null;

    ProjectNo?: string | null;
    projectNo?: string | null;

    Phase?: string | null;
    phase?: string | null;

    ConnectionType?: string | null;
    connectionType?: string | null;

    TariffCatCode?: string | null;
    tariffCatCode?: string | null;

    ServiceLength?: number | null;
    serviceLength?: number | null;

    LineLength?: number | null;
    lineLength?: number | null;

    InsideLength?: number | null;
    insideLength?: number | null;

    ActualCost?: number | null;
    actualCost?: number | null;

    ConsumerPayable?: number | null;
    consumerPayable?: number | null;

    WeldingPlant?: number | null;
    weldingPlant?: number | null;

    MetalCrusher?: number | null;
    metalCrusher?: number | null;

    SawMills?: number | null;
    sawMills?: number | null;
}

const getDeptId = (item: SawMillsReportItem): string | null => item.DeptId ?? item.deptId ?? null;
const getPrjAssDt = (item: SawMillsReportItem): string | null => item.PrjAssDt ?? item.prjAssDt ?? null;
const getProjectNo = (item: SawMillsReportItem): string | null => item.ProjectNo ?? item.projectNo ?? null;
const getPhase = (item: SawMillsReportItem): string | null => item.Phase ?? item.phase ?? null;
const getConnectionType = (item: SawMillsReportItem): string | null => item.ConnectionType ?? item.connectionType ?? null;
const getTariffCatCode = (item: SawMillsReportItem): string | null => item.TariffCatCode ?? item.tariffCatCode ?? null;
const getServiceLength = (item: SawMillsReportItem): number | null => item.ServiceLength ?? item.serviceLength ?? null;
const getLineLength = (item: SawMillsReportItem): number | null => item.LineLength ?? item.lineLength ?? null;
const getInsideLength = (item: SawMillsReportItem): number | null => item.InsideLength ?? item.insideLength ?? null;
const getActualCost = (item: SawMillsReportItem): number | null => item.ActualCost ?? item.actualCost ?? null;
const getConsumerPayable = (item: SawMillsReportItem): number | null => item.ConsumerPayable ?? item.consumerPayable ?? null;
const getWeldingPlant = (item: SawMillsReportItem): number | null => item.WeldingPlant ?? item.weldingPlant ?? null;
const getMetalCrusher = (item: SawMillsReportItem): number | null => item.MetalCrusher ?? item.metalCrusher ?? null;
const getSawMills = (item: SawMillsReportItem): number | null => item.SawMills ?? item.sawMills ?? null;

const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr || !dateStr.trim()) return "-";
    const dt = dateStr.trim();
    if (dt.includes("T")) return dt.split("T")[0].replace(/-/g, "/");
    if (/^\d{8}$/.test(dt)) return `${dt.slice(0, 4)}/${dt.slice(4, 6)}/${dt.slice(6)}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) return dt.replace(/-/g, "/");
    return dt;
};

const parseToIsoDate = (dateVal: string | Date | number | null | undefined): string | null => {
    if (dateVal === null || dateVal === undefined) return null;
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, "0");
        const d = String(dateVal.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    const str = String(dateVal).trim();
    if (!str || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") {
        return null;
    }

    // Deterministic parsing from ISO strings like "2026-01-14T00:00:00"
    if (str.includes("T")) {
        const datePart = str.split("T")[0].trim();
        const m = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) {
            return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
        }
    }

    const ymdDash = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymdDash) {
        return `${ymdDash[1]}-${ymdDash[2].padStart(2, "0")}-${ymdDash[3].padStart(2, "0")}`;
    }

    const ymdSlash = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (ymdSlash) {
        return `${ymdSlash[1]}-${ymdSlash[2].padStart(2, "0")}-${ymdSlash[3].padStart(2, "0")}`;
    }

    if (/^\d{8}$/.test(str)) {
        return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
    }

    const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmy) {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, "0");
            const d = String(parsed.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }
    }

    return null;
};

const formatDateCsv = (dateVal: string | Date | number | null | undefined): string => {
    return parseToIsoDate(dateVal) ?? "null";
};

const parseNumberOrNull = (val: number | string | null | undefined): number | null => {
    if (val === null || val === undefined) {
        return null;
    }
    if (typeof val === "string") {
        const s = val.trim();
        if (s === "" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
            return null;
        }
    }
    const num = Number(val);
    if (isNaN(num)) {
        return null;
    }
    return num;
};

const formatMoney = (num: number | null | undefined): string => {
    if (num == null || isNaN(Number(num))) return "-";
    const n = Number(num);
    const absNum = Math.abs(n);
    const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(absNum);
    return n < 0 ? `(${formatted})` : formatted;
};

const formatTextCsv = (val: string | null | undefined): string => {
    if (val === null || val === undefined) return "null";
    const str = String(val).trim();
    if (!str || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") {
        return "null";
    }
    return str;
};

const formatTwoDecimalOrNull = (val: number | string | null | undefined): string => {
    const num = parseNumberOrNull(val);
    if (num === null) {
        return "null";
    }
    return num.toFixed(2);
};

const formatMoneyCsv = (val: number | string | null | undefined): string => {
    const num = parseNumberOrNull(val);
    if (num === null) {
        return "null";
    }
    return num.toFixed(2);
};

const formatLength = formatTwoDecimalOrNull;
const formatLengthCsv = formatTwoDecimalOrNull;
const formatPlant = formatTwoDecimalOrNull;
const formatPlantCsv = formatTwoDecimalOrNull;

const csvEscape = (val: string | number | null | undefined): string => {
    if (val == null) return "null";
    const str = String(val);
    if (/[,\n"\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
};

const escapeHtml = (text: string | null | undefined): string => {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
};

const SawMillsMetalCrushersWeldingPlantsDetails: React.FC = () => {
    useUser();

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [reportData, setReportData] = useState<SawMillsReportItem[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const maroon = "text-[#7A0000]";
    const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

    const handleFromDateChange = (val: string) => {
        setFromDate(val);
        if (toDate && val && val > toDate) {
            setToDate("");
        }
    };

    const handleToDateChange = (val: string) => {
        if (fromDate && val && val < fromDate) {
            toast.error("To Date cannot be earlier than From Date");
            return;
        }
        setToDate(val);
    };

    const isViewDisabled = !fromDate || !toDate || fromDate > toDate || reportLoading;

    const handleViewReport = async () => {
        if (!fromDate || !toDate) {
            toast.error("Please select both dates");
            return;
        }
        if (toDate < fromDate) {
            toast.error("To Date cannot be earlier than From Date");
            return;
        }

        setReportLoading(true);
        setReportData([]);
        setShowReport(true);

        try {
            const queryParams = `fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
            const urlsToTry = [
                `/misapi/api/saw-mills-metal-crushers-welding-plants-details/report?${queryParams}`,
                `/api/saw-mills-metal-crushers-welding-plants-details/report?${queryParams}`,
            ];

            let items: SawMillsReportItem[] = [];
            let loaded = false;
            let errorMsg = "";

            for (const url of urlsToTry) {
                try {
                    const res = await fetch(url, {
                        headers: { Accept: "application/json" },
                    });

                    if (!res.ok) {
                        errorMsg = `HTTP ${res.status}`;
                        continue;
                    }

                    const json = await res.json();
                    if (json.errorMessage) {
                        toast.error(json.errorMessage);
                        loaded = true;
                        break;
                    }

                    const parsed: SawMillsReportItem[] = Array.isArray(json.data)
                        ? json.data
                        : [];
                    items = parsed;
                    loaded = true;
                    break;
                } catch (fetchErr: any) {
                    errorMsg = fetchErr?.message || "Failed to fetch";
                }
            }

            if (!loaded) {
                throw new Error(errorMsg || "Unable to reach report server");
            }

            setReportData(items);

            if (items.length === 0) {
                toast.warn("No records found for the selected period");
            } else {
                toast.success(`${items.length} records loaded`);
            }
        } catch (err: any) {
            toast.error("Failed: " + err.message);
        } finally {
            setReportLoading(false);
        }
    };

    const closeReport = () => {
        setShowReport(false);
        setReportData([]);
    };

    // CSV Export
    const handleDownloadCSV = () => {
        if (reportData.length === 0) return;

        const title = `CONNECTION DETAILS FOR WELDING PLANTS, METAL CRUSHERS, SAW MILLS ETC. FROM ${fromDate} TO ${toDate}`;

        const headers = [
            "Dept Id",
            "Project Assign Date",
            "Project No",
            "Phase",
            "Connection Type",
            "Tariff Category Code",
            "Service Length",
            "Line Length",
            "Inside Line Length",
            "Actual Cost",
            "Consumer Payable",
            "Welding Plant",
            "Metal Crusher",
            "Saw Mills",
        ];

        const csvRows: string[] = [
            csvEscape(title),
            headers.map(csvEscape).join(","),
        ];

        reportData.forEach((item) => {
            const row = [
                csvEscape(formatTextCsv(getDeptId(item))),
                csvEscape(formatDateCsv(getPrjAssDt(item))),
                csvEscape(formatTextCsv(getProjectNo(item))),
                csvEscape(formatTextCsv(getPhase(item))),
                csvEscape(formatTextCsv(getConnectionType(item))),
                csvEscape(formatTextCsv(getTariffCatCode(item))),
                csvEscape(formatLengthCsv(getServiceLength(item))),
                csvEscape(formatLengthCsv(getLineLength(item))),
                csvEscape(formatLengthCsv(getInsideLength(item))),
                csvEscape(formatMoneyCsv(getActualCost(item))),
                csvEscape(formatMoneyCsv(getConsumerPayable(item))),
                csvEscape(formatPlantCsv(getWeldingPlant(item))),
                csvEscape(formatPlantCsv(getMetalCrusher(item))),
                csvEscape(formatPlantCsv(getSawMills(item))),
            ].join(",");
            csvRows.push(row);
        });

        const csvContent = "\uFEFF" + csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `SawMillsMetalCrushersWeldingPlantsDetails_${fromDate}_${toDate}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Print PDF
    const printPDF = () => {
        if (reportData.length === 0 || !iframeRef.current) return;

        const formattedFrom = fromDate.replace(/-/g, "/");
        const formattedTo = toDate.replace(/-/g, "/");

        const tableStyle = `
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8px; }
      th, td { border: 1px solid #aaa; padding: 4px 3px; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; box-sizing: border-box; vertical-align: top; }
      th { font-weight: bold; background-color: #7A0000 !important; color: white !important; text-align: left; -webkit-print-color-adjust: exact; }
      th.numeric, td.numeric { text-align: right !important; }
      th.center, td.center { text-align: center !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    `;

        const colWidths = [
            "5%",  // Dept Id
            "8%",  // Project Assign Date
            "9%",  // Project No
            "5%",  // Phase
            "8%",  // Connection Type
            "6%",  // Tariff Category Code
            "7%",  // Service Length
            "7%",  // Line Length
            "7%",  // Inside Line Length
            "10%", // Actual Cost
            "10%", // Consumer Payable
            "6%",  // Welding Plant
            "6%",  // Metal Crusher
            "6%",  // Saw Mills
        ];

        const colGroupHTML = `
      <colgroup>
        ${colWidths.map((w) => `<col style="width: ${w};" />`).join("")}
      </colgroup>
    `;

        let bodyHTML = "";
        reportData.forEach((item, idx) => {
            bodyHTML += `<tr class="${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}">
        <td>${escapeHtml(getDeptId(item) || "-")}</td>
        <td class="center">${escapeHtml(formatDate(getPrjAssDt(item)))}</td>
        <td>${escapeHtml(getProjectNo(item) || "-")}</td>
        <td>${escapeHtml(getPhase(item) || "-")}</td>
        <td>${escapeHtml(getConnectionType(item) || "-")}</td>
        <td>${escapeHtml(getTariffCatCode(item) || "-")}</td>
        <td class="numeric">${escapeHtml(formatLength(getServiceLength(item)))}</td>
        <td class="numeric">${escapeHtml(formatLength(getLineLength(item)))}</td>
        <td class="numeric">${escapeHtml(formatLength(getInsideLength(item)))}</td>
        <td class="numeric">${escapeHtml(formatMoney(getActualCost(item)))}</td>
        <td class="numeric">${escapeHtml(formatMoney(getConsumerPayable(item)))}</td>
        <td class="numeric">${escapeHtml(formatPlant(getWeldingPlant(item)))}</td>
        <td class="numeric">${escapeHtml(formatPlant(getMetalCrusher(item)))}</td>
        <td class="numeric">${escapeHtml(formatPlant(getSawMills(item)))}</td>
      </tr>`;
        });

        const headerHTML = `
      <thead>
        <tr>
          <th>Dept Id</th>
          <th class="center">Project Assign Date</th>
          <th>Project No</th>
          <th>Phase</th>
          <th>Connection Type</th>
          <th>Tariff Category Code</th>
          <th class="numeric">Service Length</th>
          <th class="numeric">Line Length</th>
          <th class="numeric">Inside Line Length</th>
          <th class="numeric">Actual Cost</th>
          <th class="numeric">Consumer Payable</th>
          <th class="numeric">Welding Plant</th>
          <th class="numeric">Metal Crusher</th>
          <th class="numeric">Saw Mills</th>
        </tr>
      </thead>`;

        const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>&nbsp;</title>
<style>${tableStyle}
@page { size: landscape; margin: 10mm; }
@page {
  @top-center { content: "Electricity Distribution Lanka Privated Limited"; font-size: 9px; font-weight: normal; color: #333; }
  @top-right { content: none; }
  @bottom-left { content: "Printed on: ${new Date().toLocaleString()}"; font-size: 9px; color: #666; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #666; }
}
body { font-family: Arial, sans-serif; margin: 8mm; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
h3 { text-align: center; color: #7A0000; font-size: 15px; font-weight: bold; margin: 0 0 6px 0; }
.subtitles { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 10px; }
.subtitle-left { text-align: left; }
.subtitle-right { text-align: right; }
.footer-print { margin-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: #666; }
@media print {
  .footer-print { display: none; }
}
</style>
</head>
<body>
<h3>Connection Details for Welding Plants, Metal Crushers, Saw Mills Etc.</h3>
<div class="subtitles">
  <div class="subtitle-left">
    <strong>Period :</strong> ${formattedFrom} to ${formattedTo}
  </div>
</div>

<table>${colGroupHTML}${headerHTML}<tbody>${bodyHTML}</tbody></table>
<div class="footer-print">
  <div>Printed on: ${new Date().toLocaleString()}</div>
</div>
</body>
</html>`;

        const doc = iframeRef.current!.contentDocument!;
        doc.open();
        doc.write(fullHTML);
        doc.close();

        setTimeout(() => iframeRef.current?.contentWindow?.print(), 1000);
    };

    const formattedDisplayFrom = fromDate ? fromDate.replace(/-/g, "/") : "";
    const formattedDisplayTo = toDate ? toDate.replace(/-/g, "/") : "";

    return (
        <div className="max-w-7xl mx-auto p-6 bg-white rounded-xl shadow border border-gray-200 text-sm">
            <iframe ref={iframeRef} style={{ display: "none" }} />

            <h2 className={`text-xl font-bold mb-4 ${maroon}`}>
                Saw Mills / Metal Crushers / Welding Plants Details
            </h2>

            <div className="flex justify-end items-center gap-6 mb-6">
                <DateRangePicker
                    fromDate={fromDate}
                    toDate={toDate}
                    onFromChange={handleFromDateChange}
                    onToChange={handleToDateChange}
                />
                <button
                    onClick={handleViewReport}
                    disabled={isViewDisabled}
                    className={`px-4 py-1.5 rounded text-white font-medium ${maroonGrad} disabled:opacity-50 hover:brightness-110 flex items-center gap-2`}
                >
                    <Eye className="w-4 h-4" />
                    View
                </button>
            </div>

            {showReport && (
                <ReportViewer
                    title="Connection Details for Welding Plants, Metal Crushers, Saw Mills Etc."
                    subtitlebold="Period:"
                    subtitlenormal={`${formattedDisplayFrom} to ${formattedDisplayTo}`}
                    currency=""
                    loading={reportLoading}
                    hasData={reportData.length > 0}
                    handleDownloadCSV={handleDownloadCSV}
                    printPDF={printPDF}
                    closeReport={closeReport}
                >
                    <table className="w-full text-xs border-collapse">
                        <thead className={`${maroonGrad} text-white`}>
                            <tr>
                                <th className="px-3 py-2.5 text-left font-semibold">Dept Id</th>
                                <th className="px-3 py-2.5 text-center font-semibold">Project Assign Date</th>
                                <th className="px-3 py-2.5 text-left font-semibold">Project No</th>
                                <th className="px-3 py-2.5 text-left font-semibold">Phase</th>
                                <th className="px-3 py-2.5 text-left font-semibold">Connection Type</th>
                                <th className="px-3 py-2.5 text-left font-semibold">Tariff Category Code</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Service Length</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Line Length</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Inside Line Length</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Actual Cost</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Consumer Payable</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Welding Plant</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Metal Crusher</th>
                                <th className="px-3 py-2.5 text-right font-semibold">Saw Mills</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((item, idx) => (
                                <tr
                                    key={idx}
                                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                >
                                    <td className="px-3 py-2 border border-gray-300 font-medium text-gray-800">
                                        {getDeptId(item) || "-"}
                                    </td>
                                    <td className="px-3 py-2 text-center border border-gray-300 text-gray-700 whitespace-nowrap">
                                        {formatDate(getPrjAssDt(item))}
                                    </td>
                                    <td className="px-3 py-2 border border-gray-300 text-gray-700 whitespace-nowrap">
                                        {getProjectNo(item) || "-"}
                                    </td>
                                    <td className="px-3 py-2 border border-gray-300 text-gray-700">
                                        {getPhase(item) || "-"}
                                    </td>
                                    <td className="px-3 py-2 border border-gray-300 text-gray-700 whitespace-nowrap">
                                        {getConnectionType(item) || "-"}
                                    </td>
                                    <td className="px-3 py-2 border border-gray-300 text-gray-700">
                                        {getTariffCatCode(item) || "-"}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300 text-gray-700">
                                        {formatLength(getServiceLength(item))}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300 text-gray-700">
                                        {formatLength(getLineLength(item))}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300 text-gray-700">
                                        {formatLength(getInsideLength(item))}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300 text-gray-700 whitespace-nowrap">
                                        {formatMoney(getActualCost(item))}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300 text-gray-700 whitespace-nowrap">
                                        {formatMoney(getConsumerPayable(item))}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300 text-gray-700">
                                        {formatPlant(getWeldingPlant(item))}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300 text-gray-700">
                                        {formatPlant(getMetalCrusher(item))}
                                    </td>
                                    <td className="px-3 py-2 text-right border border-gray-300 text-gray-700">
                                        {formatPlant(getSawMills(item))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </ReportViewer>
            )}
        </div>
    );
};

export default SawMillsMetalCrushersWeldingPlantsDetails;
