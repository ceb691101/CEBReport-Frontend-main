import { useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";

interface Province {
  ProvinceCode: string;
  ProvinceName: string;
}

interface Division {
  RegionCode: string;
}

interface BillCycleOption {
  code: string;
  display: string;
}

interface BillCycleData {
  BillCycles?: string[];
  MaxBillCycle?: string;
}

interface ApiResponse<T> {
  data?: T;
  errorMessage?: string;
}

interface RooftopReportRow {
  NetType?: string;
  Region?: string;
  TariffCode?: string;
  TariffCategory?: string;
  CalcCycle?: string;
  BillCycle?: string;
  Rate?: number | string;
  Units?: number | string;
  PaymentAmount?: number | string;
  ExportUnits?: number | string;
}

type CustomerType = "Ordinary" | "Bulk";

const SolarRooftopPaymentsandExportunits = () => {
  const [customerType, setCustomerType] = useState<CustomerType | "">("");
  const [selectionType, setSelectionType] = useState<"Province" | "Division" | "">("");
  const [province, setProvince] = useState("");
  const [division, setDivision] = useState("");
  const [billCycle, setBillCycle] = useState("");
  const [reportType, setReportType] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const reportInFlight = useRef(false);
  const [provinceError, setProvinceError] = useState("");
  const [billCycleError, setBillCycleError] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportVisible, setReportVisible] = useState(false);
  const [reportSummary, setReportSummary] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const [reportData, setReportData] = useState<RooftopReportRow[]>([]);
  const [generatedReportType, setGeneratedReportType] = useState("");
  const valueColumns: { key: "Units" | "PaymentAmount" | "ExportUnits"; label: string }[] =
    generatedReportType === "payments"
      ? [{ key: "Units", label: "Units" }, { key: "PaymentAmount", label: "Payment Amount" }]
      : [{ key: "ExportUnits", label: "Export Units" }];

  useEffect(() => {
    setProvince("");
    setDivision("");
    setSelectionType("");
    setBillCycle("");
    setReportType("");
    setProvinces([]);
    setDivisions([]);
    setBillCycleOptions([]);
    setProvinceError("");
    setBillCycleError("");
    setSelectionError("");

    if (!customerType) return;

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const apiRoot = customerType.toLowerCase();
        const [provinceResponse, billCycleResponse, divisionResponse] = await Promise.all([
          fetch(`/misapi/api/${apiRoot}/province`, { headers: { Accept: "application/json" } }),
          fetch(`/misapi/api/${apiRoot}/netmtcons/billcycle/max`, { headers: { Accept: "application/json" } }),
          fetch(`/misapi/api/${apiRoot}/region`, { headers: { Accept: "application/json" } }),
        ]);

        if (!provinceResponse.ok) throw new Error("Unable to load provinces.");
        if (!billCycleResponse.ok) throw new Error("Unable to load bill cycles.");
        if (!divisionResponse.ok) throw new Error("Unable to load divisions.");

        const provinceResult: ApiResponse<Province[]> = await provinceResponse.json();
        const billCycleResult: ApiResponse<BillCycleData> = await billCycleResponse.json();
        const divisionResult: ApiResponse<Division[]> = await divisionResponse.json();
        const cycleData = billCycleResult.data;
        const maxCycle = Number(cycleData?.MaxBillCycle);

        setProvinces(
          (provinceResult.data ?? []).sort((first, second) =>
            first.ProvinceName.localeCompare(second.ProvinceName)
          )
        );
        setBillCycleOptions(
          (cycleData?.BillCycles ?? []).map((cycle, index) => ({
            code: String(maxCycle - index),
            display: `${maxCycle - index} - ${cycle}`,
          }))
        );
        setDivisions(divisionResult.data ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load report options.";
        setProvinceError(message.includes("provinces") ? message : "Unable to load provinces.");
        setBillCycleError(message.includes("bill cycles") ? message : "Unable to load bill cycles.");
        setSelectionError(message.includes("divisions") ? message : "");
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [customerType]);

  useEffect(() => {
    setProvince("");
    setDivision("");
    setSelectionError("");
  }, [selectionType]);

  const optionsReady = Boolean(customerType) && !loadingOptions && !provinceError && !billCycleError;
  const selectedScopeValue = selectionType === "Province" ? province : division;
  const selectionComplete = Boolean(customerType && selectionType && selectedScopeValue && billCycle && reportType);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectionComplete || reportInFlight.current) return;
    reportInFlight.current = true;
    let url = "";

    setLoadingReport(true);
    setReportError("");

    try {
      // Build parameters only with non-empty values
      const params = new URLSearchParams();
      params.append("customerType", customerType.toLowerCase());
      params.append("type", selectionType);
      params.append("divisionOrProvince", selectedScopeValue);
      params.append("billCycle", billCycle);
      params.append("reportType", reportType);
      

      url = `/misapi/solarapi/solar-rooftop-payments-export-units?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        if (import.meta.env.DEV) {
          console.error("Solar report request failed", {
            url, status: response.status, statusText: response.statusText, error: errorBody,
          });
        }
        throw new Error(`Unable to load solar rooftop report (HTTP ${response.status}). Check that the report API is running.`);
      }

      const result: ApiResponse<RooftopReportRow[]> = await response.json();
      if (result.errorMessage) {
        if (import.meta.env.DEV) {
          console.error("Solar report backend error", {
            url, status: response.status, statusText: response.statusText, error: result,
          });
        }
        throw new Error(result.errorMessage);
      }
      if (!Array.isArray(result.data)) {
        throw new Error("Unexpected solar rooftop report response.");
      }
      const rows = result.data;

      if (rows.length === 0) {
        setReportData([]);
        setReportError("No data available for the selected criteria.");
        return;
      }

      setReportSummary(
        `${selectionType}: ${selectedScopeValue} | Bill Cycle: ${billCycleOptions.find(option => option.code === billCycle)?.display ?? billCycle} | Customer Type: ${customerType} | Report Type: ${reportType === "payments" ? "Payments" : "Export Units"}`
      );
      setReportData(rows);
      setGeneratedReportType(reportType);
      setReportVisible(true);
      setReportError("");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Solar report generation failed", { url, error });
      }
      setReportError(error instanceof Error ? error.message : "Unable to load solar rooftop report.");
      setReportData([]);
    } finally {
      reportInFlight.current = false;
      setLoadingReport(false);
    }
  };

  const formatNumber = (value: number | string | undefined) =>
    Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const downloadAsCSV = () => {
    const rows = [
      ["Solar Rooftop Payments and Export Units"],
      [reportSummary],
      ["Net Type", "Division", "Tariff", "Rate", ...valueColumns.map(column => column.label)],
      ...reportData.map(row => [row.NetType, row.Region, row.TariffCode ?? row.TariffCategory,
        row.Rate, ...valueColumns.map(column => row[column.key])]),
      ["Total", "", "", "", ...valueColumns
        .map(column => reportData.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0).toFixed(2))],
    ];
    const csv = rows.map(row => row.map(value => {
      const text = String(value ?? "");
      const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    }).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Solar_Rooftop_Payments_and_Export_Units.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printPDF = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setReportError("Please allow pop-ups to print or save the report as PDF.");
      return;
    }
    const doc = printWindow.document;
    doc.title = "Solar Rooftop Payments and Export Units";
    const style = doc.createElement("style");
    style.textContent = `
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 10px; }
      h2 { color: #7A0000; font-size: 18px; } p { margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { border: 1px solid #d1d5db; padding: 4px 8px; }
      th { background: #f3f4f6; } td:nth-child(n+4) { text-align: right; }
      tbody tr:nth-child(even) { background: #f9fafb; }
      tfoot { font-weight: bold; background: #f0fdf4; }
      thead { display: table-header-group; } tfoot { display: table-row-group; }
      tr { break-inside: avoid; }
    `;
    doc.head.appendChild(style);
    const heading = doc.createElement("h2");
    heading.textContent = "Solar Rooftop Payments and Export Units";
    const summary = doc.createElement("p");
    summary.textContent = reportSummary;
    doc.body.append(heading, summary, printRef.current.cloneNode(true));
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="mx-auto max-w-7xl rounded-xl border border-gray-200 bg-white p-4 text-sm font-sans shadow">
      {!reportVisible && <>
      <h2 className="mb-6 text-xl font-bold text-[#7A0000]">
        Solar Rooftop Payments and Export Units
      </h2>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-5">
          <div className="flex flex-col">
            <label htmlFor="solar-customer-type" className="mb-1 text-xs font-medium text-[#7A0000]">
              Select Customer Type:
            </label>
            <select
              id="solar-customer-type"
              value={customerType}
              onChange={(event) => setCustomerType(event.target.value as CustomerType | "")}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-transparent focus:ring-2 focus:ring-[#7A0000]"
              required
            >
              <option value="">Select Customer Type</option>
              <option value="Ordinary">Ordinary</option>
              <option value="Bulk">Bulk</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="solar-selection-type" className={`mb-1 text-xs font-medium ${optionsReady ? "text-[#7A0000]" : "text-gray-400"}`}>
              Select Type:
            </label>
            <select
              id="solar-selection-type"
              value={selectionType}
              onChange={(event) => setSelectionType(event.target.value as "Province" | "Division" | "")}
              disabled={!optionsReady}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-transparent focus:ring-2 focus:ring-[#7A0000] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              required
            >
              <option value="">Select Province or Division</option>
              <option value="Province">Province</option>
              <option value="Division">Division</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="solar-scope-value" className={`mb-1 text-xs font-medium ${selectionType ? "text-[#7A0000]" : "text-gray-400"}`}>
              {selectionType ? `Select ${selectionType}:` : "Select Province or Division:"}
            </label>
            <select
              id="solar-scope-value"
              value={selectedScopeValue}
              onChange={(event) => selectionType === "Province" ? setProvince(event.target.value) : setDivision(event.target.value)}
              disabled={!selectionType || !optionsReady}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-transparent focus:ring-2 focus:ring-[#7A0000] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              required
            >
              <option value="">{!selectionType ? "Select Type First" : selectionError ? "Error loading options" : `Select ${selectionType}`}</option>
              {selectionType === "Province" && provinces.map((item) => (
                <option key={item.ProvinceCode} value={item.ProvinceCode}>
                  {item.ProvinceCode} - {item.ProvinceName}
                </option>
              ))}
              {selectionType === "Division" && divisions.map((item) => (
                <option key={item.RegionCode} value={item.RegionCode}>
                  {item.RegionCode}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="solar-bill-cycle" className={`mb-1 text-xs font-medium ${optionsReady ? "text-[#7A0000]" : "text-gray-400"}`}>
              Select Bill Cycle:
            </label>
            <select
              id="solar-bill-cycle"
              value={billCycle}
              onChange={(event) => setBillCycle(event.target.value)}
              disabled={!optionsReady}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-transparent focus:ring-2 focus:ring-[#7A0000] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              required
            >
              <option value="">{!customerType ? "Select Customer Type First" : loadingOptions ? "Loading..." : billCycleError ? "Error loading bill cycles" : "Select Bill Cycle"}</option>
              {billCycleOptions.map((option) => (
                <option key={option.code} value={option.code}>{option.display}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="solar-report-type" className={`mb-1 text-xs font-medium ${selectedScopeValue && billCycle ? "text-[#7A0000]" : "text-gray-400"}`}>
              Select Report Type:
            </label>
            <select
              id="solar-report-type"
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
              disabled={!selectedScopeValue || !billCycle}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-transparent focus:ring-2 focus:ring-[#7A0000] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              required
            >
              <option value="">{!selectedScopeValue || !billCycle ? "Select Province or Division and Bill Cycle First" : "Select Report Type"}</option>
              <option value="payments">Payments</option>
              <option value="exportUnits">Export Units</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex w-full justify-end">
          <button
            type="submit"
            disabled={!selectionComplete || loadingReport}
            className="rounded-md bg-gradient-to-r from-[#7A0000] to-[#A52A2A] px-6 py-2 font-medium text-white shadow transition-opacity disabled:cursor-not-allowed disabled:opacity-70 hover:opacity-90"
          >
            {loadingReport ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </form>
      </>}

      {reportError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {reportError}
        </div>
      )}

      {reportVisible && reportData.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#7A0000]">Solar Rooftop Payments and Export Units</h2>
              <p className="text-sm text-gray-600 mt-1">{reportSummary}</p>
            </div>
            <div className="flex space-x-2 mt-2 md:mt-0">
              <button type="button" onClick={downloadAsCSV} className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition">
                <Download className="w-3 h-3" /> CSV
              </button>
              <button type="button" onClick={printPDF} className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition">
                <Printer className="w-3 h-3" /> PDF
              </button>
              <button type="button" onClick={() => { setReportVisible(false); setReportError(""); }} className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center whitespace-nowrap">
                Back to Form
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] border border-gray-300 rounded-lg">
          <div ref={printRef} className="min-w-full py-4">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Net Type</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Division</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Tariff</th>
                <th className="border border-gray-300 px-2 py-1 font-semibold">Rate</th>
                {valueColumns.map(column => (
                  <th key={column.key} className="border border-gray-300 px-2 py-1 font-semibold">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, index) => (
                <tr key={`${row.NetType ?? "row"}-${row.TariffCode ?? "tariff"}-${index}`} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1">{row.NetType ?? "-"}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.Region ?? "-"}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.TariffCode ?? row.TariffCategory ?? "-"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatNumber(row.Rate)}</td>
                  {valueColumns.map(column => (
                    <td key={column.key} className="border border-gray-300 px-2 py-1 text-right">{formatNumber(row[column.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-green-50 font-semibold">
              <tr>
                <td colSpan={4} className="border border-gray-300 px-2 py-1 text-center">Total</td>
                {valueColumns.map(({ key }) => (
                  <td key={key} className="border border-gray-300 px-2 py-1 text-right">
                    {formatNumber(reportData.reduce((sum, row) => sum + Number(row[key] ?? 0), 0))}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolarRooftopPaymentsandExportunits;
