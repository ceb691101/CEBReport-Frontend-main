import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

interface BillCycleOption {
  display: string;
  code: string;
}

interface Area {
  AreaCode: string;
  AreaName: string;
}

interface Province {
  ProvinceCode: string;
  ProvinceName: string;
}

interface Division {
  RegionCode: string;
}

interface MonthlyCount {
  BillCycle: string;
  Count: number;
}

interface SMSRegisteredResponse {
  data?: {
    LocationName?: string;
    MonthlyCounts?: MonthlyCount[];
  };
  errorMessage?: string | null;
}

type ReportType = "area" | "province" | "division" | "entireceb";

const RegisteredConsumersForSMSAlerts = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const [reportType, setReportType] = useState<ReportType>("area");
  const [typeCode, setTypeCode] = useState<string>("");

  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);
  const [fromCycle, setFromCycle] = useState<string>("");
  const [toCycle, setToCycle] = useState<string>("");

  const [areas, setAreas] = useState<Area[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [isLoadingFilters, setIsLoadingFilters] = useState<boolean>(true);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState<boolean>(false);

  const [monthlyCounts, setMonthlyCounts] = useState<MonthlyCount[]>([]);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState<string>("");
  const [selectedFromCycleLabel, setSelectedFromCycleLabel] = useState<string>("");
  const [selectedToCycleLabel, setSelectedToCycleLabel] = useState<string>("");

  const printRef = useRef<HTMLDivElement>(null);

  const fetchWithErrorHandling = async <T,>(url: string): Promise<T> => {
    const response = await fetch(url, { headers: { Accept: "application/json" } });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const err = (await response.json()) as { errorMessage?: string };
        if (err.errorMessage) {
          message = err.errorMessage;
        }
      } catch {
        message = response.statusText || message;
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  };

  useEffect(() => {
    const loadFilters = async () => {
      setIsLoadingFilters(true);
      setReportError(null);

      try {
        const [cyclesRes, areaRes, provinceRes, divisionRes] = await Promise.all([
          fetchWithErrorHandling<{ data?: { BillCycles?: string[]; MaxBillCycle?: string } }>(
            "/misapi/api/billcycle/max"
          ),
          fetchWithErrorHandling<{ data?: Area[] }>("/misapi/api/ordinary/areas"),
          fetchWithErrorHandling<{ data?: Province[] }>("/misapi/api/ordinary/province"),
          fetchWithErrorHandling<{ data?: Division[] }>("/misapi/api/ordinary/region"),
        ]);

        const billCycles = cyclesRes.data?.BillCycles ?? [];
        const maxCycle = parseInt(cyclesRes.data?.MaxBillCycle ?? "0", 10);
        const generatedOptions = billCycles.map((cycle, index) => ({
          display: `${maxCycle - index} - ${cycle}`,
          code: String(maxCycle - index),
        }));

        setBillCycleOptions(generatedOptions);
        if (generatedOptions.length > 0) {
          setFromCycle(generatedOptions[0].code);
          setToCycle(generatedOptions[0].code);
        }

        const sortedAreas = [...(areaRes.data ?? [])].sort((a, b) =>
          a.AreaName.localeCompare(b.AreaName)
        );
        const sortedProvinces = [...(provinceRes.data ?? [])].sort((a, b) =>
          a.ProvinceName.localeCompare(b.ProvinceName)
        );
        const sortedDivisions = [...(divisionRes.data ?? [])].sort((a, b) =>
          a.RegionCode.localeCompare(b.RegionCode)
        );

        setAreas(sortedAreas);
        setProvinces(sortedProvinces);
        setDivisions(sortedDivisions);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load filters.";
        setReportError(message);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    setTypeCode("");
  }, [reportType]);

  const typeOptions = useMemo(() => {
    if (reportType === "area") {
      return areas.map((item) => ({
        value: item.AreaCode,
        label: `${item.AreaCode} - ${item.AreaName}`,
      }));
    }

    if (reportType === "province") {
      return provinces.map((item) => ({
        value: item.ProvinceCode,
        label: item.ProvinceName,
      }));
    }

    if (reportType === "division") {
      return divisions.map((item) => ({ value: item.RegionCode, label: item.RegionCode }));
    }

    return [];
  }, [areas, divisions, provinces, reportType]);

  const billCycleDisplayMap = useMemo(() => {
    return new Map(billCycleOptions.map((option) => [option.code, option.display]));
  }, [billCycleOptions]);

  const getBillCycleDisplay = (billCycle: string) => {
    return billCycleDisplayMap.get(billCycle) ?? billCycle;
  };

  const getFormattedLocation = () => {
    if (!typeCode && reportType !== "entireceb") {
      return "";
    }

    if (reportType === "entireceb") {
      return "Entire CEB";
    }

    if (reportType === "area") {
      const area = areas.find((a) => a.AreaCode === typeCode);
      return area ? `${typeCode} - ${area.AreaName}` : typeCode;
    }

    if (reportType === "province") {
      const province = provinces.find((p) => p.ProvinceCode === typeCode);
      return province ? `${typeCode} - ${province.ProvinceName}` : typeCode;
    }

    if (reportType === "division") {
      return typeCode;
    }

    return "";
  };

  const getDisplayLocationLabel = (apiLocationName?: string) => {
    const fallback = getFormattedLocation();
    const apiLocation = apiLocationName?.trim();

    if (!apiLocation) {
      return fallback;
    }

    if (reportType === "entireceb") {
      return apiLocation;
    }

    if (apiLocation === typeCode) {
      return fallback;
    }

    return apiLocation;
  };

  const isBillCycleDisabled = () => {
    if (reportType === "entireceb") {
      return isLoadingFilters || isLoadingReport;
    }

    return !typeCode || isLoadingFilters || isLoadingReport;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReportError(null);

    if (!fromCycle || !toCycle) {
      setReportError("Please select both from and to bill cycles.");
      return;
    }

    if (reportType !== "entireceb" && !typeCode) {
      setReportError("Please select a value for the selected category.");
      return;
    }

    try {
      setIsLoadingReport(true);

      const query = new URLSearchParams({
        fromCycle,
        toCycle,
        reportType,
      });

      query.append("typeCode", reportType === "entireceb" ? "" : typeCode);

      const response = await fetchWithErrorHandling<SMSRegisteredResponse>(
        `/api/original/smsRegisteredRange?${query.toString()}`
      );

      if (response.errorMessage) {
        throw new Error(response.errorMessage);
      }

      setMonthlyCounts(response.data?.MonthlyCounts ?? []);
      setSelectedLocationLabel(getDisplayLocationLabel(response.data?.LocationName));
      setSelectedFromCycleLabel(getBillCycleDisplay(fromCycle));
      setSelectedToCycleLabel(getBillCycleDisplay(toCycle));
      setReportVisible(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate report.";
      setReportError(message);
      setMonthlyCounts([]);
      setReportVisible(false);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const downloadAsCSV = () => {
    if (!monthlyCounts.length) return;

    const rows = monthlyCounts.map((row) => {
      const month = getBillCycleDisplay(row.BillCycle).replace(/,/g, "");
      return `${month},${row.Count}`;
    });

    const csvContent = [
      "Registered Consumers for SMS Alerts",
      selectedLocationLabel || getFormattedLocation(),
      `From: ${selectedFromCycleLabel} | To: ${selectedToCycleLabel}`,
      "",
      "Month,Registered Count",
      ...rows,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sms_alerts_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printPDF = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Registered Consumers for SMS Alerts</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #1f2937; }
            h2 { color: #7A0000; margin-bottom: 4px; }
            p { margin: 0 0 12px; font-size: 12px; color: #4b5563; }
            table { width: auto; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
            th:first-child, td:first-child { width: 208px; }
            th:last-child, td:last-child { width: 208px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; }
            th { background: #f3f4f6; text-align: left; }
            td:last-child, th:last-child { text-align: right; }
          </style>
        </head>
        <body>
          <h2>Registered Consumers for SMS Alerts</h2>
          <p>${selectedLocationLabel || getFormattedLocation()} | From: ${selectedFromCycleLabel} | To: ${selectedToCycleLabel}</p>
          ${content.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 text-sm font-sans">
      {!reportVisible && (
        <>
          <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
            Registered Consumers for SMS Alerts
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="flex flex-col">
                <label className={`${maroon} text-xs font-medium mb-1`}>Select Category:</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                  disabled={isLoadingFilters || isLoadingReport}
                >
                  <option value="area">Area</option>
                  <option value="province">Province</option>
                  <option value="division">Division</option>
                  <option value="entireceb">Entire CEB</option>
                </select>
              </div>

              {reportType !== "entireceb" && (
                <div className="flex flex-col">
                  <label className={`${maroon} text-xs font-medium mb-1`}>
                    {reportType === "area"
                      ? "Select Area:"
                      : reportType === "province"
                      ? "Select Province:"
                      : "Select Division:"}
                  </label>
                  <select
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                    disabled={isLoadingFilters || isLoadingReport}
                    required
                  >
                    <option value="">Select Value</option>
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col">
                <label
                  className={`text-xs font-medium mb-1 ${
                    isBillCycleDisabled() ? "text-gray-400" : maroon
                  }`}
                >
                  From Bill Cycle:
                </label>
                <select
                  value={fromCycle}
                  onChange={(e) => setFromCycle(e.target.value)}
                  className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${
                    isBillCycleDisabled()
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "border-gray-300"
                  }`}
                  disabled={isBillCycleDisabled()}
                  required
                >
                  <option value="">Select Cycle</option>
                  {billCycleOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.display}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label
                  className={`text-xs font-medium mb-1 ${
                    isBillCycleDisabled() ? "text-gray-400" : maroon
                  }`}
                >
                  To Bill Cycle:
                </label>
                <select
                  value={toCycle}
                  onChange={(e) => setToCycle(e.target.value)}
                  className={`w-full px-2 py-1.5 text-xs border rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent ${
                    isBillCycleDisabled()
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "border-gray-300"
                  }`}
                  disabled={isBillCycleDisabled()}
                  required
                >
                  <option value="">Select Cycle</option>
                  {billCycleOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.display}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full mt-6 flex justify-end">
              <button
                type="submit"
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow ${maroonGrad} text-white ${
                  isLoadingReport ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
                }`}
                disabled={isLoadingFilters || isLoadingReport}
              >
                {isLoadingReport ? "Loading..." : "Generate Report"}
              </button>
            </div>
          </form>
        </>
      )}

      {reportVisible && (
        <div className="mt-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-xl font-bold ${maroon}`}>
                Registered Consumers for SMS Alerts Report
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedLocationLabel || getFormattedLocation()} | From: {selectedFromCycleLabel} | To: {selectedToCycleLabel}
              </p>
            </div>

            <div className="flex space-x-2 mt-2 md:mt-0">
              <button
                onClick={downloadAsCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              >
                <FaFileDownload className="w-3 h-3" /> CSV
              </button>
              <button
                onClick={printPDF}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
              >
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button
                onClick={() => setReportVisible(false)}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center"
              >
                Back to Form
              </button>
            </div>
          </div>

          <div className="inline-block max-w-full overflow-hidden rounded-xl border border-gray-300 bg-white">
            <div className="w-fit max-w-full overflow-x-auto max-h-[calc(100vh-250px)]">
              <div ref={printRef} className="w-fit">
              <table className="w-auto border-collapse text-xs table-fixed">
                <colgroup>
                  <col className="w-52" />
                  <col className="w-52" />
                </colgroup>
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left border-b border-gray-300">Month</th>
                    <th className="px-3 py-2 text-right border-l border-b border-gray-300">Registered Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {monthlyCounts.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-3 text-center text-gray-500">
                        No data available for selected filters.
                      </td>
                    </tr>
                  ) : (
                    monthlyCounts.map((row) => (
                      <tr key={row.BillCycle}>
                        <td className="px-3 py-2 text-gray-700">
                          {getBillCycleDisplay(row.BillCycle)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-800 border-l border-gray-300">
                          {row.Count.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {reportError}
        </div>
      )}
    </div>
  );
};

export default RegisteredConsumersForSMSAlerts;