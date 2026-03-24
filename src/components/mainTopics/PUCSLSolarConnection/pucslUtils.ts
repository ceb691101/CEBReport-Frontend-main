// ── pucslUtils.ts ─────────────────────────────────────────────────────────────
// Pure utility functions for PUCSL Solar Connection reports.

import { OrdinaryData, BulkData, TotalSolarCustomersResponse, RawSolarData, RawDataForSolarResponse, NetMeteringData, NetMeteringResponse } from "./pucslTypes.ts";

// ── Report types that support Net Metering in Solar Type dropdown ─────────────
// Add a report type value string here when it needs Net Metering shown.
export const NET_METERING_SUPPORTED_REPORTS: string[] = ["RawDataForSolar"];

// ── Report types that hide the Solar Type dropdown entirely ───────────────────
// Add a report type value string here when it has no Solar Type.
export const NO_SOLAR_TYPE_REPORTS: string[] = ["TotalSolarCustomers", "NetMetering"];

// ── Report title map ──────────────────────────────────────────────────────────
export const getReportTitle = (reportType: string): string => {
    const titles: { [key: string]: string } = {
        FixedSolarData: "PUCSL Fixed Solar Data Submission Report",
        VariableSolarData: "PUCSL Variable Solar Data Submission Report",
        TotalSolarCustomers: "Solar Connection Summary - Total No of Solar Customers",
        RawDataForSolar: "Solar Connection Summary - Raw Data for Solar",
        NetMetering: "Solar Connection Summary - Net Metering",
    };
    return titles[reportType] || "PUCSL Solar Connection Report";
};

// ── Value mappers ─────────────────────────────────────────────────────────────

export const getSolarTypeValue = (display: string): string => {
    const map: { [key: string]: string } = {
        "Net Metering": "NetMetering",
        "Net Accounting": "NetAccounting",
        "Net Plus": "NetPlus",
        "Net Plus Plus": "NetPlusPlus",
    };
    return map[display] || display;
};

export const getReportCategoryValue = (display: string): string => {
    const map: { [key: string]: string } = {
        Province: "Province",
        Division: "Region",
        "Entire CEB": "EntireCEB",
    };
    return map[display] || display;
};

// ── Number formatter ──────────────────────────────────────────────────────────

export const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

export const fetchWithErrorHandling = async (url: string) => {
    const response = await fetch(url, { headers: { Accept: "application/json" } });

    if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData.errorMessage) errorMsg = errorData.errorMessage;
        } catch {
            errorMsg = response.statusText;
        }
        throw new Error(errorMsg);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON response but got ${contentType}`);
    }

    return response.json();
};

// ── Generic CSV builder/downloader ────────────────────────────────────────────
// headerRows: pass [[singleRow]] for simple reports, or [[row1],[row2]] for
//             two-row headers (Variable Solar).
// solarType:  pass empty string "" for reports with no Solar Type.

export const buildAndDownloadCSV = (
    reportTitle: string,
    selectionInfo: string,
    billCycleDisplay: string,
    solarType: string,
    billCycle: string,
    headerRows: string[][],
    rows: any[][],
    filePrefix: string
) => {
    const metaRows: any[][] = [
        [reportTitle],
        [selectionInfo],
        [`Bill Cycle: ${billCycleDisplay}`],
        ...(solarType ? [[`Solar Type: ${solarType}`]] : []),
        [],
    ];

    const csvContent = [...metaRows, ...headerRows, ...rows]
        .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const suffix = solarType ? `_${solarType.replace(/ /g, "")}` : "";
    link.setAttribute("download", `PUCSL_${filePrefix}_${billCycle}${suffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ── Total Solar Customers — dedicated CSV builder ─────────────────────────────
// Outputs two sections (Ordinary + Bulk) with a blank line between them,
// matching the table view exactly.

export const buildTotalSolarCSV = (
    reportTitle: string,
    selectionInfo: string,
    billCycleDisplay: string,
    billCycle: string,
    data: TotalSolarCustomersResponse
) => {
    const ordHeader = [
        "Tariff Category",
        "Net Metering", "Net Metering (kWh)",
        "Net Accounting", "Net Accounting (kWh)",
        "Net Plus", "Net Plus (kWh)",
        "Net Plus Plus", "Net Plus Plus (kWh)",
    ];

    const bulkHeader = [
        "Tariff Category",
        "Net Metering", "Units Day (kWh)",
        "Net Accounting", "Units Day (kWh)",
        "Net Plus", "Units Day (kWh)",
        "Net Plus Plus", "Units Day (kWh)",
    ];

    const ordRow = (r: OrdinaryData) => [
        r.TariffCategory,
        r.NetMeteringCustomers, r.NetMeteringUnits,
        r.NetAccountingCustomers, r.NetAccountingUnits,
        r.NetPlusCustomers, r.NetPlusUnits,
        r.NetPlusPlusCustomers, r.NetPlusPlusUnits,
    ];

    const bulkRow = (r: BulkData) => [
        r.TariffCategory,
        r.NetMeteringCustomers, r.NetMeteringUnits,
        r.NetAccountingCustomers, r.NetAccountingUnits,
        r.NetPlusCustomers, r.NetPlusUnits,
        r.NetPlusPlusCustomers, r.NetPlusPlusUnits,
    ];

    const allRows: any[][] = [
        [reportTitle],
        [selectionInfo],
        [`Bill Cycle: ${billCycleDisplay}`],
        [],
        ["Ordinary"],
        ordHeader,
        ...data.Ordinary.map(ordRow),
        ordRow(data.OrdinaryTotal).map((v, i) => i === 0 ? "Total" : v),
        [],
        ["Bulk"],
        bulkHeader,
        ...data.Bulk.map(bulkRow),
        bulkRow(data.BulkTotal).map((v, i) => i === 0 ? "Total" : v),
    ];

    const csvContent = allRows
        .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PUCSL_TotalSolarCustomers_${billCycle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ── Raw Data for Solar — dedicated CSV builder ────────────────────────────────
// Two-section CSV (Ordinary + Bulk) with two-row headers matching the table.
// BroughtForward/CarryForward columns always included (empty for non-Net Metering).

export const buildRawDataForSolarCSV = (
    reportTitle: string,
    selectionInfo: string,
    billCycleDisplay: string,
    solarType: string,
    billCycle: string,
    data: RawDataForSolarResponse
) => {
    // Two-row header matching the table exactly
    const headerRow1 = [
        "", "", "",
        "Import", "", "",
        "Export", "", "",
        "",
        "",
    ];
    const headerRow2 = [
        "Tariff Category", "Year", "Month",
        "Day", "Peak", "Off Peak",
        "Day", "Peak", "Off Peak",
        "Brought Forward kWh (Only in Net Metering)", "Carry Forward kWh (Only in Net Metering)",
    ];

    const dataRow = (r: RawSolarData, isTotal = false) => [
        isTotal ? "Total" : r.Category,
        isTotal ? "" : r.Year,
        isTotal ? "" : r.Month,
        r.ImportDay || "",
        r.ImportPeak || "",
        r.ImportOffPeak || "",
        r.ExportDay || "",
        r.ExportPeak || "",
        r.ExportOffPeak || "",
        r.BroughtForwardKwh || "",
        r.CarryForwardKwh || "",
    ];

    const allRows: any[][] = [
        [reportTitle],
        [selectionInfo],
        [`Bill Cycle: ${billCycleDisplay}`],
        [`Solar Type: ${solarType}`],
        [],
        ["Ordinary"],
        headerRow1,
        headerRow2,
        ...data.Ordinary.map((r) => dataRow(r)),
        dataRow(data.OrdinaryTotal, true),
        [],
        ["Bulk"],
        headerRow1,
        headerRow2,
        ...data.Bulk.map((r) => dataRow(r)),
        dataRow(data.BulkTotal, true),
    ];

    const csvContent = allRows
        .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PUCSL_RawDataForSolar_${billCycle}_${solarType.replace(/ /g, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ── Net Metering — dedicated CSV builder ─────────────────────────────────────
// Simple single-section flat table matching the XLS exactly.

export const buildNetMeteringCSV = (
    reportTitle: string,
    selectionInfo: string,
    billCycleDisplay: string,
    billCycle: string,
    data: NetMeteringResponse
) => {
    const header = ["Category", "Year", "Month", "No of Consumers", "Units Day (kWh)"];

    const dataRow = (r: NetMeteringData, isTotal = false) => [
        isTotal ? "Total" : r.Category,
        isTotal ? "" : r.Year,
        isTotal ? "" : r.Month,
        r.NoOfCustomers,
        r.UnitsDayKwh,
    ];

    const allRows: any[][] = [
        [reportTitle],
        [selectionInfo],
        [`Bill Cycle: ${billCycleDisplay}`],
        [],
        header,
        ...data.Data.map((r) => dataRow(r)),
    ];

    const csvContent = allRows
        .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PUCSL_NetMetering_${billCycle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ── PDF printer ───────────────────────────────────────────────────────────────

export const printReportPDF = (
    tableHTML: string,
    reportTitle: string,
    selectionInfo: string,
    billCycleDisplay: string,
    solarType: string
) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const subheader = solarType
        ? `${selectionInfo} | Bill Cycle: ${billCycleDisplay} | Solar Type: ${solarType}`
        : `${selectionInfo} | Bill Cycle: ${billCycleDisplay}`;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${reportTitle}</title>
            <style>
                body { font-family: Arial; font-size: 10px; margin: 10mm; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { padding: 4px 6px; border: 0.1px solid #ddd; font-size: 10px; vertical-align: middle; }
                .text-right { text-align: right; }
                .header { font-weight: bold; margin-bottom: 5px; color: #7A0000; font-size: 12px; }
                .subheader { margin-bottom: 12px; font-size: 11px; }
                .footer { margin-top: 10px; font-size: 9px; color: #666; }
                @page {
                margin-bottom: 18mm;
                @bottom-left {
                    content: "Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Reporting@2026";
                    font-size: 9px;
                    color: #666;
                    font-family: Arial;
                }
                @bottom-right {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 9px;
                    color: #666;
                    font-family: Arial;
                }
                }
                th { background-color: #d3d3d3; font-weight: bold; text-align: center; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .font-medium, .font-semibold, .font-bold { font-weight: bold !important; }
                .whitespace-nowrap { white-space: nowrap; }
            </style>
        </head>
        <body>
            <div class="header">${reportTitle}</div>
            <div class="subheader">${subheader}</div>
            ${tableHTML}
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
};