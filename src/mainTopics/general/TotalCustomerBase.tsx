import { useCallback, useEffect, useRef, useState } from "react";
import { FaFileCsv, FaFilePdf } from "react-icons/fa";
import { TOTAL_CUSTOMER_BASE_NAME } from "../../utils/generalSubtopics";

type CustomerBaseRow = {
  ProvinceName: string;
  AreaCode: string;
  AreaName: string;
  AgTotal: number;
  FTotal: number;
};
type CustomerBaseReport = {
  CurrentCycle: number;
  CurrentCycleLabel: string;
  PreviousCycle: number;
  PreviousCycleLabel: string;
  Rows: CustomerBaseRow[];
};
type ApiResponse<T> = {
  data?: T | null;
  errorMessage?: string | null;
  Message?: string;
};

const reportEndpoint = "/misapi/api/general/total-customer-base";
const reportColumns = ["Province", "Area Code", "Area Name", "Active / Government (A/G)", "Finalized (F)"];

async function readReportResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || !result || result.errorMessage || result.data == null) {
    throw new Error(result?.errorMessage || result?.Message || `Unable to load report data (HTTP ${response.status}).`);
  }
  return result.data;
}

const TotalCustomerBase = () => {
  const [report, setReport] = useState<CustomerBaseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const reportController = useRef<AbortController | null>(null);

  const fetchReport = useCallback(async () => {
    reportController.current?.abort();
    const controller = new AbortController();
    reportController.current = controller;
    setLoading(true);
    setReport(null);
    setReportError(null);
    setExportError(null);
    try {
      const response = await fetch(reportEndpoint, {
        headers: { Accept: "application/json" }, signal: controller.signal,
      });
      const data = await readReportResponse<CustomerBaseReport>(response);
      if (!Array.isArray(data.Rows)) throw new Error("Invalid report data.");
      if (!controller.signal.aborted) setReport(data);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setReportError(cause instanceof Error ? cause.message : "Unable to generate report.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReport();
    return () => reportController.current?.abort();
  }, [fetchReport]);

  const rows = report?.Rows ?? [];
  const totals = (rows ?? []).reduce((sum, row) => ({
    ag: sum.ag + row.AgTotal, f: sum.f + row.FTotal,
  }), { ag: 0, f: 0 });
  const canExport = Boolean(report && !loading && rows.length > 0);

  const downloadCsv = () => {
    if (!report || !canExport) return;
    const csvRows = [
      [TOTAL_CUSTOMER_BASE_NAME],
      ["All areas"],
      ["Bill Cycle", report.CurrentCycleLabel],
      ["Previous Cycle", report.PreviousCycleLabel],
      [],
      reportColumns,
      ...rows.map(row => [row.ProvinceName, row.AreaCode, row.AreaName, row.AgTotal, row.FTotal]),
      ["Total", "", "", totals.ag, totals.f],
    ];
    const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `Total_Customer_Base_${report.CurrentCycle}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!report || !canExport || exportingPdf) return;
    setExportingPdf(true);
    setExportError(null);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"), import("jspdf-autotable"),
      ]);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      pdf.setProperties({ title: TOTAL_CUSTOMER_BASE_NAME });
      autoTable(pdf, {
        head: [reportColumns],
        body: rows.map(row => [
          row.ProvinceName, row.AreaCode, row.AreaName,
          row.AgTotal.toLocaleString("en-US"), row.FTotal.toLocaleString("en-US"),
        ]),
        foot: [[
          { content: "Total", colSpan: 3 },
          totals.ag.toLocaleString("en-US"), totals.f.toLocaleString("en-US"),
        ]],
        showFoot: "lastPage",
        startY: 40,
        margin: { top: 40, bottom: 16, left: 14, right: 14 },
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [122, 0, 0] },
        footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
        didDrawPage: () => {
          pdf.setTextColor(122, 0, 0);
          pdf.setFontSize(16);
          pdf.text(TOTAL_CUSTOMER_BASE_NAME, 14, 14);
          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(10);
          pdf.text("All areas", 14, 22);
          pdf.text(`Bill Cycle: ${report.CurrentCycleLabel}`, 14, 28);
          pdf.text(`Previous Cycle: ${report.PreviousCycleLabel}`, 14, 34);
        },
      });
      const pages = pdf.getNumberOfPages();
      for (let page = 1; page <= pages; page++) {
        pdf.setPage(page);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${page} of ${pages}`, pdf.internal.pageSize.getWidth() - 14,
          pdf.internal.pageSize.getHeight() - 7, { align: "right" });
      }
      pdf.save(`Total_Customer_Base_${report.CurrentCycle}.pdf`);
    } catch {
      setExportError("Unable to generate PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <section
      aria-label={TOTAL_CUSTOMER_BASE_NAME}
      className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold text-[#7A0000]">{TOTAL_CUSTOMER_BASE_NAME}</h2>
        <div role="group" aria-label="Report actions" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!canExport}
            aria-label="Download CSV"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-green-700 text-green-800 font-medium disabled:opacity-50"
          >
            <FaFileCsv aria-hidden="true" /> CSV
          </button>
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={!canExport || exportingPdf}
            aria-label="Download PDF"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-[#7A0000] text-[#7A0000] font-medium disabled:opacity-50"
          >
            <FaFilePdf aria-hidden="true" /> {exportingPdf ? "Generating..." : "PDF"}
          </button>
          <button
            type="button"
            onClick={() => void fetchReport()}
            disabled={loading || exportingPdf}
            className="px-4 py-2 rounded-md bg-[#7A0000] text-white font-medium disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>
      {loading && <p role="status" className="py-6 text-gray-600">Loading customer base for all areas...</p>}
      {reportError && <p role="alert" className="mt-4 text-red-700">{reportError}</p>}
      {exportError && <p role="alert" className="mt-4 text-red-700">{exportError}</p>}
      {report && !loading && (
        <div className="mt-6" aria-live="polite">
          <div className="flex flex-wrap gap-2 mb-3 text-gray-600">
            <span>All areas</span>
            <span className="rounded bg-red-50 px-2 text-[#7A0000]">Bill Cycle: {report.CurrentCycleLabel}</span>
            {report.PreviousCycleLabel && <span>Previous Cycle: {report.PreviousCycleLabel}</span>}
          </div>
          {rows.length === 0 ? <p>No data found for the selected criteria.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-100 text-[#7A0000]">
                  <tr>
                    {reportColumns.map((heading) => (
                      <th key={heading} scope="col" className="border border-gray-300 p-2 text-left">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.ProvinceName}-${row.AreaCode}`} className={index % 2 ? "bg-gray-50" : "bg-white"}>
                      <td className="border border-gray-300 p-2">{row.ProvinceName}</td>
                      <td className="border border-gray-300 p-2">{row.AreaCode}</td>
                      <td className="border border-gray-300 p-2">{row.AreaName}</td>
                      <td className="border border-gray-300 p-2 text-right">{row.AgTotal.toLocaleString("en-US")}</td>
                      <td className="border border-gray-300 p-2 text-right">{row.FTotal.toLocaleString("en-US")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <th scope="row" colSpan={3} className="border border-gray-300 p-2 text-left">Total</th>
                    <td className="border border-gray-300 p-2 text-right">{totals.ag.toLocaleString("en-US")}</td>
                    <td className="border border-gray-300 p-2 text-right">{totals.f.toLocaleString("en-US")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default TotalCustomerBase;
