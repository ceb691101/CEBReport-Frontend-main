import { useCallback, useEffect, useRef, useState } from "react";
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
  const reportController = useRef<AbortController | null>(null);

  const fetchReport = useCallback(async () => {
    reportController.current?.abort();
    const controller = new AbortController();
    reportController.current = controller;
    setLoading(true);
    setReport(null);
    setReportError(null);
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

  return (
    <section
      aria-label={TOTAL_CUSTOMER_BASE_NAME}
      className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm"
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold text-[#7A0000]">{TOTAL_CUSTOMER_BASE_NAME}</h2>
        <button
          type="button"
          onClick={() => void fetchReport()}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-[#7A0000] text-white font-medium disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      {loading && <p role="status" className="py-6 text-gray-600">Loading customer base for all areas...</p>}
      {reportError && <p role="alert" className="mt-4 text-red-700">{reportError}</p>}
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
                    {["Province", "Area Code", "Area Name", "Active / Government (A/G)", "Finalized (F)"].map((heading) => (
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
