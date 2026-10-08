import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

type ReportType = "Detailed" | "Full" | "Summary";
type Sector = { CatCode: string; CatDesc: string };
const governmentAgeReportName = "Age Analysis For Government Customers(Bulk Customers)";
const governmentAgeApiRoot = import.meta.env.DEV ? "/api/debtors" : "/misapi/api/debtors";
const billCycleMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatBillCycle = (code: string) => {
  const cycle = Number(code);
  if (!Number.isInteger(cycle) || cycle < 101) return code;
  const monthIndex = (cycle - 101) % 12;
  const year = 1997 + Math.floor((cycle - 101) / 12);
  return `${code} - ${billCycleMonths[monthIndex]} ${String(year).slice(-2)}`;
};

type AgeAmounts = {
  BalanceMonthEnd: number;
  Age0: number; Age1: number; Age2: number; Age3: number; Age4: number;
  Age5: number; Age6: number; Age7: number; Age8: number; Age9: number;
  Age10: number; Age11: number; Age12: number;
  Over12: number; Over24: number; Over36: number;
};

type DetailedRow = AgeAmounts & {
  AreaName: string;
  SectorName: string;
  AccountNumber: string;
  CustomerName: string;
  AddressLine1: string;
  AddressLine2: string;
  City: string;
  CustomerCode: string;
  Tariff: string;
  ContractDemand: number;
  SecurityDeposit: number;
};

type SummaryRow = AgeAmounts & {
  CatCode: string;
  CatDesc: string;
  CustomerCount: number;
};

type Column<T> = { key: keyof T; label: string; numeric?: boolean; integer?: boolean };

const ageColumns: Column<AgeAmounts>[] = [
  { key: "BalanceMonthEnd", label: "Balance Month End", numeric: true },
  ...Array.from({ length: 13 }, (_, month) => ({
    key: `Age${month}` as keyof AgeAmounts,
    label: `Age ${month}`,
    numeric: true,
  })),
  { key: "Over12", label: "Over 12", numeric: true },
  { key: "Over24", label: "Over 24", numeric: true },
  { key: "Over36", label: "Over 36", numeric: true },
];

const detailedColumns: Column<DetailedRow>[] = [
  { key: "AreaName", label: "Area" },
  { key: "SectorName", label: "Sector" },
  { key: "AccountNumber", label: "Account Number" },
  { key: "CustomerName", label: "Name" },
  { key: "AddressLine1", label: "Address 1" },
  { key: "AddressLine2", label: "Address 2" },
  { key: "City", label: "City" },
  { key: "CustomerCode", label: "Customer Code" },
  { key: "Tariff", label: "Tariff" },
  { key: "ContractDemand", label: "Contract Demand", numeric: true },
  { key: "SecurityDeposit", label: "Security Deposit", numeric: true },
  ...ageColumns,
];

const summaryColumns: Column<SummaryRow>[] = [
  { key: "CatCode", label: "Sector Code" },
  { key: "CatDesc", label: "Sector" },
  { key: "CustomerCount", label: "Customers", numeric: true, integer: true },
  ...ageColumns,
];

const amount = (value: unknown) => Number(value ?? 0).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const integer = (value: unknown) => Number(value ?? 0).toLocaleString("en-US", {
  maximumFractionDigits: 0,
});
const displayValue = (row: DetailedRow | SummaryRow, column: Column<DetailedRow> | Column<SummaryRow>) => {
  const value = row[column.key as keyof typeof row];
  return column.integer ? integer(value) : column.numeric ? amount(value) : String(value ?? "");
};

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char] ?? char);

const getData = async <T,>(url: string): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Cannot connect to the government report API. Start the updated MISReports_Api locally or deploy it to the report server.");
  }
  if (response.status === 404) {
    throw new Error("Government report API routes are missing. Start the updated MISReports_Api locally or deploy it to the report server.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.errorMessage) {
    throw new Error(payload?.errorMessage ?? payload?.Message ?? `Government report API request failed (${response.status}). Check that the updated API is running.`);
  }
  if (!payload) throw new Error("The government report API returned an invalid response.");
  return payload.data as T;
};

const GovernmentCustomerAgeAnalysis = () => {
  const [reportType, setReportType] = useState<ReportType>("Detailed");
  const [sectorCode, setSectorCode] = useState("");
  const [billCycle, setBillCycle] = useState("");
  const [billCycles, setBillCycles] = useState<string[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [rows, setRows] = useState<(DetailedRow | SummaryRow)[]>([]);
  const [generatedType, setGeneratedType] = useState<ReportType | null>(null);
  const [generatedSector, setGeneratedSector] = useState("");
  const [generatedCycle, setGeneratedCycle] = useState("");
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 100;

  useEffect(() => {
    let active = true;
    getData<{ sectors: Sector[]; billCycles: string[] }>(`${governmentAgeApiRoot}/sectors`).then((data) => {
      if (!active) return;
      setSectors(data.sectors);
      setBillCycles(data.billCycles);
      setBillCycle(data.billCycles[0] ?? "");
      if (!data.billCycles.length) setError("No bill cycle found for government age analysis.");
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Unable to load report filters.");
    }).finally(() => {
      if (active) setLoadingFilters(false);
    });
    return () => { active = false; };
  }, []);

  const selectedSector = sectors.find((sector) => sector.CatCode === generatedSector);
  const columns = generatedType === "Summary" ? summaryColumns : detailedColumns;
  const visibleRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);
  const pageCount = Math.ceil(rows.length / pageSize);

  const generateReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!billCycle || (reportType === "Detailed" && !sectorCode)) return;
    setLoadingReport(true);
    setError(null);
    setRows([]);
    setGeneratedType(null);
    const params = new URLSearchParams({ billCycle, reportType });
    if (reportType === "Detailed") params.set("sectorCode", sectorCode);
    try {
      const data = await getData<(DetailedRow | SummaryRow)[]>(`${governmentAgeApiRoot}/government-age-analysis?${params}`);
      setRows(data);
      setGeneratedType(reportType);
      setGeneratedSector(reportType === "Detailed" ? sectorCode : "");
      setGeneratedCycle(billCycle);
      setPage(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate report.");
    } finally {
      setLoadingReport(false);
    }
  };

  const reportTitle = `${governmentAgeReportName} - ${generatedType} report`;
  const metadata = [
    `Bill Cycle: ${formatBillCycle(generatedCycle)}`,
    generatedType === "Detailed"
      ? `Sector: ${generatedSector}${selectedSector?.CatDesc ? ` - ${selectedSector.CatDesc}` : ""}`
      : "Sector: All sectors",
  ];

  const downloadCSV = () => {
    if (!generatedType) return;
    const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [
      [reportTitle], ...metadata.map((line) => [line]), [],
      columns.map((column) => column.label),
      ...rows.map((row) => columns.map((column) => row[column.key as keyof typeof row])),
    ].map((line) => line.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `GovernmentAgeAnalysis_${generatedType}_Cycle${generatedCycle}${generatedSector ? `_Sector${generatedSector}` : ""}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printPDF = () => {
    if (!generatedType) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("Please allow pop-ups to print this report.");
      return;
    }
    const tableRows = rows.map((row) => `<tr>${columns.map((column) =>
      `<td>${escapeHtml(displayValue(row, column))}</td>`
    ).join("")}</tr>`).join("");
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(reportTitle)}</title>
      <style>@page { size: A4 landscape; margin: 10mm; } body { font-family: Arial, sans-serif; font-size: 10px; }
      h1 { font-size: 16px; color: #7A0000; } table { border-collapse: collapse; width: 100%; }
      th,td { border: 1px solid #ccc; padding: 3px; } th { background: #eee; } tr { break-inside: avoid; }
      </style></head><body><h1>${escapeHtml(reportTitle)}</h1>
      ${metadata.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      <table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
      <tbody>${tableRows}</tbody></table></body></html>`);
    printWindow.document.close();
    const openPrint = () => { printWindow.focus(); printWindow.print(); };
    if (printWindow.document.readyState === "complete") setTimeout(openPrint, 250);
    else printWindow.addEventListener("load", openPrint, { once: true });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm">
      {!generatedType ? (
        <>
          <h2 className="text-xl font-bold text-[#7A0000] mb-6">{governmentAgeReportName}</h2>
          <form onSubmit={generateReport}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-[#7A0000]">
                Report Type
                <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className="border border-gray-300 rounded-md p-2 text-gray-800">
                  <option value="Detailed">Detailed report</option>
                  <option value="Full">Full report</option>
                  <option value="Summary">Summary report</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[#7A0000]">
                Bill Cycle
                <select value={billCycle} onChange={(event) => setBillCycle(event.target.value)} className="border border-gray-300 rounded-md p-2 text-gray-800" disabled={loadingFilters} required>
                  <option value="">Select Bill Cycle</option>
                  {billCycles.map((cycle) => <option key={cycle} value={cycle}>{formatBillCycle(cycle)}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[#7A0000]">
                Sector
                <select value={reportType === "Detailed" ? sectorCode : ""} onChange={(event) => setSectorCode(event.target.value)} className="border border-gray-300 rounded-md p-2 text-gray-800" disabled={loadingFilters || reportType !== "Detailed"} required={reportType === "Detailed"}>
                  <option value="">{reportType === "Detailed" ? "Select Sector" : "All sectors"}</option>
                  {sectors.map((sector) => <option key={sector.CatCode} value={sector.CatCode}>{sector.CatCode} - {sector.CatDesc}</option>)}
                </select>
                {reportType !== "Detailed" && <span className="text-gray-500">Full and Summary reports include all sectors.</span>}
              </label>
            </div>
            <div className="flex justify-end mt-6">
              <button type="submit" disabled={loadingFilters || loadingReport || !billCycle || (reportType === "Detailed" && !sectorCode)} className="px-6 py-2 rounded-md bg-[#7A0000] text-white disabled:opacity-50">
                {loadingReport ? "Loading..." : "Generate Report"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#7A0000]">{reportTitle}</h2>
              {metadata.map((line) => <p key={line} className="text-sm text-gray-600">{line}</p>)}
              <p className="text-sm text-gray-600">{rows.length} {generatedType === "Summary" ? "sectors" : "accounts"}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={downloadCSV} className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 rounded-md text-xs"><FaFileDownload /> CSV</button>
              <button type="button" onClick={printPDF} className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 rounded-md text-xs"><FaPrint /> PDF</button>
              <button type="button" onClick={() => setGeneratedType(null)} className="px-3 py-1.5 bg-[#7A0000] text-white rounded-md text-xs">Back to Form</button>
            </div>
          </div>
          {rows.length ? (
            <>
              <div className="overflow-auto max-h-[70vh] border border-gray-300 rounded-md">
                <table className="border-collapse text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>{columns.map((column) => <th key={String(column.key)} className="border border-gray-300 px-2 py-1 text-left">{column.label}</th>)}</tr>
                  </thead>
                  <tbody>{visibleRows.map((row, index) => (
                    <tr key={index} className={index % 2 ? "bg-gray-50" : "bg-white"}>
                      {columns.map((column) => <td key={String(column.key)} className={`border border-gray-300 px-2 py-1 ${column.numeric ? "text-right" : ""}`}>
                        {displayValue(row, column)}
                      </td>)}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {pageCount > 1 && <div className="flex items-center justify-center gap-3 mt-3">
                <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
                <span>Page {page} of {pageCount}</span>
                <button type="button" disabled={page === pageCount} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>}
            </>
          ) : <p className="text-gray-600">No data found for this selection.</p>}
        </>
      )}
      {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    </div>
  );
};

export default GovernmentCustomerAgeAnalysis;
