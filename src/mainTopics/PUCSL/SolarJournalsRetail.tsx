import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";
import { fetchWithErrorHandling, printReportPDF } from "../../components/mainTopics/PUCSLSolarConnection/pucslUtils";
import type { BillCycleOption } from "../../components/mainTopics/PUCSLSolarConnection/pucslTypes";
import { useReportScope } from "../../hooks/useReportScope";

type AreaType = "Area" | "Province" | "Division" | "Entire CEB";

interface BillCycleResponse {
  data?: {
    MaxBillCycle?: string;
    BillCycles?: string[];
    ErrorMessage?: string | null;
  } | null;
  errorMessage?: string | null;
}

interface LocationOption { code: string; label: string; }
interface LocationResponse {
  data?: Array<{
    AreaCode?: string; AreaName?: string;
    ProvinceCode?: string; ProvinceName?: string;
    RegionCode?: string; ErrorMessage?: string | null;
  }> | null;
  errorMessage?: string | null;
}
interface JournalRow {
  AreaName: string;
  AccountNumber: string;
  NetType: string;
  TransactionDescription: string;
  CreditAmount: number | null;
  DebitAmount: number | null;
}
interface JournalReport { Rows: JournalRow[]; TotalCredit: number; TotalDebit: number; }

const getTransactionType = (row: JournalRow): string => {
  switch (row.NetType) {
    case "Net Accounting": return "Solar Sales Net Accounting";
    case "Net Plus": return "Solar Sales Net Plus";
    case "Net Plus Plus": return "Solar Sales NET++";
    default: return row.TransactionDescription;
  }
};

const SolarJournalsRetail = () => {
  const [areaType, setAreaType] = useState<AreaType>("Area");
  const [billCycle, setBillCycle] = useState("");
  const [billCycles, setBillCycles] = useState<BillCycleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [locationCode, setLocationCode] = useState("");
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [report, setReport] = useState<JournalReport | null>(null);
  const [reportSelection, setReportSelection] = useState({ location: "", billCycle: "" });
  const reportRequest = useRef<AbortController | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { allowedCategories, locked } = useReportScope();
  const scopeKey = areaType === "Division" ? "Region" : areaType;
  const locationLock = locked[scopeKey];
  const lockedCode = locationLock?.code;
  const lockedName = locationLock?.name;
  const regionCode = locked.Region?.code;
  const provinceCode = locked.Province?.code;

  const clearReport = () => {
    setReport(null);
    setReportError(null);
  };

  useEffect(() => () => reportRequest.current?.abort(), []);

  useEffect(() => {
    let cancelled = false;
    setReport(null);
    setReportError(null);
    setLocationError(null);
    setLocations([]);
    setLocationCode(lockedCode ?? "");

    if (areaType === "Entire CEB") {
      setLocationsLoading(false);
      return;
    }
    if (lockedCode) {
      setLocations([{ code: lockedCode, label: lockedName ? `${lockedCode} - ${lockedName}` : lockedCode }]);
      setLocationsLoading(false);
      return;
    }

    const loadLocations = async () => {
      setLocationsLoading(true);
      try {
        const params = new URLSearchParams();
        let path: string;
        if (areaType === "Area") {
          path = "areas";
          if (regionCode) params.set("regionCode", regionCode);
          else if (provinceCode) params.set("provCode", provinceCode);
        } else if (areaType === "Province") {
          path = "province";
          if (regionCode) params.set("regionCode", regionCode);
        } else {
          path = "region";
        }
        const response: LocationResponse = await fetchWithErrorHandling(
          `/misapi/api/ordinary/${path}${params.size ? `?${params}` : ""}`
        );
        const apiError = response.errorMessage || response.data?.find((row) => row.ErrorMessage)?.ErrorMessage;
        if (apiError) throw new Error(apiError);
        if (!Array.isArray(response.data)) throw new Error(`Failed to load ${areaType.toLowerCase()} choices.`);
        const options = response.data.map((row) => {
          const code = row.AreaCode ?? row.ProvinceCode ?? row.RegionCode ?? "";
          const name = row.AreaName ?? row.ProvinceName;
          return { code, label: name ? `${code} - ${name}` : code };
        }).filter((option) => option.code).sort((a, b) => a.label.localeCompare(b.label));
        if (!cancelled) {
          setLocations(options);
          if (!options.length) setLocationError(`No ${areaType.toLowerCase()} choices are available.`);
        }
      } catch (err) {
        if (!cancelled) setLocationError(err instanceof Error ? err.message : "Failed to load locations.");
      } finally {
        if (!cancelled) setLocationsLoading(false);
      }
    };
    void loadLocations();
    return () => { cancelled = true; };
  }, [areaType, lockedCode, lockedName, regionCode, provinceCode, retryCount]);

  useEffect(() => {
    let cancelled = false;

    const loadBillCycles = async () => {
      setLoading(true);
      setError(null);
      setReport(null);
      setReportError(null);
      setBillCycle("");
      setBillCycles([]);

      try {
        // SharedController.GetBillCycleFromArea: MAX(bill_cycle) from areas.
        const response: BillCycleResponse = await fetchWithErrorHandling(
          "/misapi/api/ordinary/areas/billcycle/min"
        );
        const apiError = response.errorMessage || response.data?.ErrorMessage;
        if (apiError) throw new Error(apiError);

        const maxCycle = Number(response.data?.MaxBillCycle);
        const cycles = response.data?.BillCycles;
        if (!Number.isInteger(maxCycle) || maxCycle <= 0 || !Array.isArray(cycles) || cycles.length === 0) {
          throw new Error("No bill cycles are available.");
        }

        const options = cycles.map((cycle, index) => ({
          code: String(maxCycle - index),
          display: `${maxCycle - index} - ${cycle}`,
        }));

        if (!cancelled) {
          setBillCycles(options);
          setBillCycle(options[0].code);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load bill cycles.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadBillCycles();
    return () => { cancelled = true; };
  }, [retryCount]);

  const selectClassName = "w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent bg-white text-gray-800 disabled:bg-gray-100";
  const canGenerateReport = !loading && !error && !reportLoading &&
    billCycles.some((cycle) => cycle.code === billCycle) && allowedCategories.includes(scopeKey) &&
    (areaType === "Entire CEB" || (!locationsLoading && !locationError && locations.some((location) => location.code === locationCode)));

  const generateReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canGenerateReport) return;
    const controller = new AbortController();
    reportRequest.current = controller;
    clearReport();
    setReportLoading(true);
    try {
      const response = await fetch("/misapi/api/pucsl/solarJournalsRetail", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ areaType, locationCode: areaType === "Entire CEB" ? "" : locationCode, billCycle }),
        signal: controller.signal,
      });
      const result = await response.json() as { data?: JournalReport | null; errorMessage?: string; Message?: string };
      if (!response.ok || result.errorMessage) {
        throw new Error(result.errorMessage || result.Message || `Failed to generate report (HTTP ${response.status}).`);
      }
      if (!result.data || !Array.isArray(result.data.Rows)) throw new Error("The report response is invalid. Please try again.");
      setReport(result.data);
      const location = areaType === "Entire CEB" ? areaType : `${areaType}: ${locations.find((option) => option.code === locationCode)?.label ?? locationCode}`;
      setReportSelection({ location, billCycle: billCycles.find((option) => option.code === billCycle)?.display ?? billCycle });
    } catch (err) {
      if (!controller.signal.aborted) setReportError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      if (!controller.signal.aborted) setReportLoading(false);
    }
  };
  const formatAmount = (amount: number) => amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const downloadCSV = () => {
    if (!report) return;
    const rows = [
      ["Solar Journals - Retail"],
      [reportSelection.location],
      ["Bill Cycle", reportSelection.billCycle],
      [],
      ["#", "Area Name", "Account Number", "Net Type", "Transaction Type", "Credit (Rs.)", "Debit (Rs.)"],
      ...report.Rows.map((row, index) => [index + 1, row.AreaName, row.AccountNumber, row.NetType, getTransactionType(row), row.CreditAmount?.toFixed(2) ?? "-", row.DebitAmount?.toFixed(2) ?? "-"]),
      ["", "", "", "", "Total:", report.TotalCredit.toFixed(2), report.TotalDebit.toFixed(2)],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `Solar_Journals_Retail_${billCycle}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printPDF = () => {
    if (!printRef.current) return;
    const escapeHTML = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]!);
    printReportPDF(
      printRef.current.innerHTML,
      "Solar Journals - Retail",
      escapeHTML(reportSelection.location),
      escapeHTML(reportSelection.billCycle),
      ""
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      {!report && <h2 className="text-xl font-bold mb-6 text-[#7A0000]">Solar Journals - Retail</h2>}
      {!report && <form onSubmit={generateReport}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex flex-col">
            <label htmlFor="solar-journals-area-type" className="text-[#7A0000] text-xs font-medium mb-1">
              Area Type:
            </label>
            <select
              id="solar-journals-area-type"
              value={areaType}
              onChange={(event) => {
                setAreaType(event.target.value as AreaType);
                setLocationCode("");
                clearReport();
              }}
              className={selectClassName}
              disabled={reportLoading}
            >
              {allowedCategories.map((category) => {
                const label = category === "Region" ? "Division" : category;
                return <option key={label} value={label}>{label}</option>;
              })}
            </select>
          </div>
          {areaType !== "Entire CEB" && (
            <div className="flex flex-col">
              <label htmlFor="solar-journals-location" className="text-[#7A0000] text-xs font-medium mb-1">Select {areaType}:</label>
              <select
                id="solar-journals-location"
                value={locationCode}
                onChange={(event) => { setLocationCode(event.target.value); clearReport(); }}
                className={selectClassName}
                disabled={reportLoading || locationsLoading || !!lockedCode}
                required
                aria-describedby={locationError ? "solar-journals-location-error" : undefined}
              >
                <option value="">{locationsLoading ? "Loading locations..." : `Select ${areaType}`}</option>
                {locations.map((location) => <option key={location.code} value={location.code}>{location.label}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col">
            <label htmlFor="solar-journals-bill-cycle" className="text-[#7A0000] text-xs font-medium mb-1">
              Bill Cycle:
            </label>
            <select
              id="solar-journals-bill-cycle"
              value={billCycle}
              onChange={(event) => {
                setBillCycle(event.target.value);
                clearReport();
              }}
              className={selectClassName}
              disabled={loading || reportLoading || billCycles.length === 0}
              required
              aria-describedby={error ? "solar-journals-bill-cycle-error" : undefined}
            >
              {billCycles.length === 0 && <option value="">{loading ? "Loading bill cycles..." : "No bill cycles available"}</option>}
              {billCycles.map((cycle) => (
                <option key={cycle.code} value={cycle.code}>{cycle.display}</option>
              ))}
            </select>
          </div>
        </div>
        {(error || locationError) && (
          <div role="alert" className="mt-4 text-sm text-red-700">
            {error && <p id="solar-journals-bill-cycle-error">{error}</p>}
            {locationError && <p id="solar-journals-location-error">{locationError}</p>}
            <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-2 underline font-medium">Retry</button>
          </div>
        )}
        <div className="w-full mt-6 flex justify-end">
          <button
            type="submit"
            disabled={!canGenerateReport}
            className="px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow bg-gradient-to-r from-[#7A0000] to-[#A52A2A] text-white enabled:hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {reportLoading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </form>}
      {reportLoading && <p role="status" className="mt-4 text-sm text-gray-600">Loading solar journals...</p>}
      {reportError && <p role="alert" className="mt-4 text-sm text-red-700">{reportError}</p>}
      {report && (
        <section aria-label="Solar Journals - Retail report">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold mb-1 text-[#7A0000]">Solar Journals - Retail Report</h2>
              <p className="text-xs text-gray-600">{reportSelection.location} | Bill Cycle: {reportSelection.billCycle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadCSV}
                disabled={report.Rows.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaFileDownload className="w-3 h-3" /> CSV
              </button>
              <button
                type="button"
                onClick={printPDF}
                disabled={report.Rows.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button
                type="button"
                onClick={clearReport}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center cursor-pointer"
              >
                Back to Form
              </button>
            </div>
          </div>
          {report.Rows.length === 0 ? (
            <p role="status" className="text-gray-600">No solar journals found for the selected criteria.</p>
          ) : (
            <>
              <p className="text-xs text-gray-600 mb-2">{report.Rows.length.toLocaleString()} transactions</p>
              <div className="max-h-[500px] overflow-auto border border-gray-200 rounded-md">
                <div ref={printRef}>
                <table className="w-full min-w-[900px] text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-100 text-gray-800">
                    <tr>
                      <th scope="col" className="border border-gray-300 px-3 py-2 text-center">#</th>
                      <th scope="col" className="border border-gray-300 px-3 py-2 text-left">Area Name</th>
                      <th scope="col" className="border border-gray-300 px-3 py-2 text-center">Account Number</th>
                      <th scope="col" className="border border-gray-300 px-3 py-2 text-left">Net Type</th>
                      <th scope="col" className="border border-gray-300 px-3 py-2 text-left">Transaction Type</th>
                      <th scope="col" className="border border-gray-300 px-3 py-2 text-right whitespace-nowrap">Credit (Rs.)</th>
                      <th scope="col" className="border border-gray-300 px-3 py-2 text-right whitespace-nowrap">Debit (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.Rows.map((row, index) => (
                      <tr key={index} className="even:bg-gray-50">
                        <td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
                        <td className="border border-gray-300 px-3 py-2">{row.AreaName}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">{row.AccountNumber}</td>
                        <td className="border border-gray-300 px-3 py-2 whitespace-nowrap">{row.NetType}</td>
                        <td className="border border-gray-300 px-3 py-2">{getTransactionType(row)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right tabular-nums font-semibold" style={{ color: "#115e59" }}>{row.CreditAmount == null ? "-" : formatAmount(row.CreditAmount)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right tabular-nums font-semibold" style={{ color: "#1e40af" }}>{row.DebitAmount == null ? "-" : formatAmount(row.DebitAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-200 font-semibold">
                    <tr>
                      <th scope="row" colSpan={5} className="border border-gray-300 px-3 py-2 text-right">Total:</th>
                      <td className="border border-gray-300 px-3 py-2 text-right tabular-nums" style={{ color: "#115e59" }}>{formatAmount(report.TotalCredit)}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right tabular-nums" style={{ color: "#1e40af" }}>{formatAmount(report.TotalDebit)}</td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default SolarJournalsRetail;
