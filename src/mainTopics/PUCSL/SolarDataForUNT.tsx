import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";
import {
    BillCycleOption, Province, Division, RawDataForSolarResponse
} from "../../components/mainTopics/PUCSLSolarConnection/pucslTypes.ts";
import {
    fetchWithErrorHandling, getSolarTypeValue, getReportCategoryValue, buildRawDataForSolarCSV, printReportPDF
} from "../../components/mainTopics/PUCSLSolarConnection/pucslUtils.ts";
import RawDataForSolarTable from "../../components/mainTopics/PUCSLSolarConnection/RawDataForSolarTable.tsx";

type ReportCategory = "Province" | "Division" | "Entire CEB";

const SolarDataForUNT = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── Form State ────────────────────────────────────────────────────────────
  const [reportCategory, setReportCategory] = useState<ReportCategory>("Province");
  const [typeCode, setTypeCode] = useState<string>("");
  const [billCycle, setBillCycle] = useState<string>("");
  const [netType, setNetType] = useState<string>("Net Metering");

  // ── Filters Dropdown Data State ───────────────────────────────────────────
  const [billCycleOptions, setBillCycleOptions] = useState<BillCycleOption[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  // ── Loading & UI State ────────────────────────────────────────────────────
  const [isLoadingFilters, setIsLoadingFilters] = useState<boolean>(true);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState<boolean>(false);

  // ── Generated Report Details State ────────────────────────────────────────
  const [exportResult, setExportResult] = useState<RawDataForSolarResponse | null>(null);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState<string>("");
  const [selectedBillCycleDisplay, setSelectedBillCycleDisplay] = useState<string>("");

  const printRef = useRef<HTMLDivElement>(null);

  // ── Fetch Filters on Mount ────────────────────────────────────────────────
  useEffect(() => {
    const loadFilters = async () => {
      setIsLoadingFilters(true);
      setReportError(null);

      try {
        const [cyclesRes, provinceRes, divisionRes] = await Promise.all([
          fetchWithErrorHandling("/misapi/api/ordinary/areas/billcycle/min"),
          fetchWithErrorHandling("/misapi/api/ordinary/province"),
          fetchWithErrorHandling("/misapi/api/ordinary/region"),
        ]) as [
          { data?: { BillCycles?: string[]; MaxBillCycle?: string } },
          { data?: Province[] },
          { data?: Division[] }
        ];

        const billCycles = cyclesRes.data?.BillCycles ?? [];
        const maxCycle = parseInt(cyclesRes.data?.MaxBillCycle ?? "0", 10);
        const generatedOptions = billCycles.map((cycle: string, index: number) => ({
          display: `${maxCycle - index} - ${cycle}`,
          code: String(maxCycle - index),
        }));

        setBillCycleOptions(generatedOptions);
        if (generatedOptions.length > 0) {
          setBillCycle(generatedOptions[0].code);
        }

        const sortedProvinces = [...(provinceRes.data ?? [])].sort((a, b) =>
          a.ProvinceName.localeCompare(b.ProvinceName)
        );
        const sortedDivisions = [...(divisionRes.data ?? [])].sort((a, b) =>
          a.RegionCode.localeCompare(b.RegionCode)
        );

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

  // Reset typeCode when category changes
  useEffect(() => {
    setTypeCode("");
  }, [reportCategory]);

  // Compute values for Province/Division dropdowns
  const typeOptions = useMemo(() => {
    if (reportCategory === "Province") {
      return provinces.map((item) => ({
        value: item.ProvinceCode,
        label: `${item.ProvinceCode} - ${item.ProvinceName}`,
      }));
    }

    if (reportCategory === "Division") {
      return divisions.map((item) => ({
        value: item.RegionCode,
        label: item.RegionCode,
      }));
    }

    return [];
  }, [provinces, divisions, reportCategory]);

  const billCycleDisplayMap = useMemo(() => {
    return new Map(billCycleOptions.map((option) => [option.code, option.display]));
  }, [billCycleOptions]);

  const getBillCycleDisplay = (cycle: string) => {
    return billCycleDisplayMap.get(cycle) ?? cycle;
  };

  const getFormattedLocation = () => {
    if (reportCategory === "Entire CEB") {
      return "Entire CEB";
    }

    if (!typeCode) {
      return "";
    }

    if (reportCategory === "Province") {
      const province = provinces.find((p) => p.ProvinceCode === typeCode);
      return province ? `${typeCode} - ${province.ProvinceName}` : typeCode;
    }

    if (reportCategory === "Division") {
      return typeCode;
    }

    return "";
  };

  const isFormInvalid = () => {
    if (isLoadingFilters || isLoadingReport) return true;
    if (!billCycle) return true;
    if (reportCategory !== "Entire CEB" && !typeCode) return true;
    return false;
  };

  // ── Form Submit (Fetch Data) ──────────────────────────────────────────────
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReportError(null);
    setExportResult(null);

    if (isFormInvalid()) {
      return;
    }

    try {
      setIsLoadingReport(true);

      const requestBody = {
        reportCategory: getReportCategoryValue(reportCategory),
        typeCode: reportCategory !== "Entire CEB" ? typeCode : "",
        billCycle,
        reportType: "RawDataForSolar",
        solarType: getSolarTypeValue(netType),
      };

      const response = await fetch("/misapi/api/pucsl/solarConnections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let msg = `HTTP error! status: ${response.status}`;
        try {
          const d = await response.json();
          if (d.errorMessage) msg = d.errorMessage;
        } catch { }
        throw new Error(msg);
      }

      const result = await response.json();
      if (result.errorMessage) {
        throw new Error(result.errorMessage);
      }

      const data = result.data as RawDataForSolarResponse;
      if (!data?.Ordinary?.length && !data?.Bulk?.length) {
        throw new Error("No data found for the selected criteria.");
      }

      setExportResult(data);
      setSelectedLocationLabel(getFormattedLocation());
      setSelectedBillCycleDisplay(getBillCycleDisplay(billCycle));
      setReportVisible(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate report.";
      setReportError(message);
      setExportResult(null);
      setReportVisible(false);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // ── Download CSV ──────────────────────────────────────────────────────────
  const downloadAsCSV = () => {
    if (!exportResult) return;
    const title = `Solar Data for UNT Calculation - ${netType}`;
    const selectionInfo = reportCategory === "Entire CEB"
        ? "Entire CEB"
        : `${reportCategory}: ${selectedLocationLabel}`;

    buildRawDataForSolarCSV(
        title,
        selectionInfo,
        selectedBillCycleDisplay,
        netType,
        billCycle,
        exportResult
    );
  };

  // ── Print PDF ─────────────────────────────────────────────────────────────
  const printPDF = () => {
    if (!printRef.current) return;
    const title = `Solar Data for UNT Calculation - ${netType}`;
    const selectionInfo = reportCategory === "Entire CEB"
      ? "Entire CEB"
      : `${reportCategory}: ${selectedLocationLabel}`;

    printReportPDF(
      printRef.current.innerHTML,
      title,
      selectionInfo,
      selectedBillCycleDisplay,
      netType
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans">
      
      {/* ── Form View ────────────────────────────────────────────────────── */}
      {!reportVisible && (
        <>
          <h2 className={`text-xl font-bold mb-6 ${maroon}`}>
            Solar Data for UNT Calculation
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              
              {/* Bill Cycle Select */}
              <div className="flex flex-col">
                <label className={`${maroon} text-xs font-medium mb-1`}>
                  Year & Month:
                </label>
                <select
                  value={billCycle}
                  onChange={(e) => setBillCycle(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent bg-white text-gray-800"
                  disabled={isLoadingFilters || isLoadingReport}
                  required
                >
                  {isLoadingFilters ? (
                    <option>Loading cycles...</option>
                  ) : (
                    billCycleOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.display}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Net Type Select */}
              <div className="flex flex-col">
                <label className={`${maroon} text-xs font-medium mb-1`}>
                  Net Type:
                </label>
                <select
                  value={netType}
                  onChange={(e) => setNetType(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent bg-white text-gray-800"
                  disabled={isLoadingFilters || isLoadingReport}
                  required
                >
                  <option value="Net Metering">Net Metering</option>
                  <option value="Net Accounting">Net Accounting</option>
                  <option value="Net Plus">Net Plus</option>
                  <option value="Net Plus Plus">Net Plus Plus</option>
                </select>
              </div>

              {/* Category Select */}
              <div className="flex flex-col">
                <label className={`${maroon} text-xs font-medium mb-1`}>Select Category:</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value as ReportCategory)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent bg-white text-gray-800"
                  disabled={isLoadingFilters || isLoadingReport}
                >
                  <option value="Province">Province</option>
                  <option value="Division">Division</option>
                  <option value="Entire CEB">Entire CEB</option>
                </select>
              </div>

              {/* Dynamic Province/Division select */}
              {reportCategory !== "Entire CEB" && (
                <div className="flex flex-col">
                  <label className={`${maroon} text-xs font-medium mb-1`}>
                    {reportCategory === "Province" ? "Select Province:" : "Select Division:"}
                  </label>
                  <select
                    value={typeCode}
                    onChange={(e) => setTypeCode(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent bg-white text-gray-800"
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

            </div>

            {/* Action Buttons */}
            <div className="w-full mt-6 flex justify-end">
              <button
                type="submit"
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow ${maroonGrad} text-white ${
                  isLoadingReport || isFormInvalid() ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
                }`}
                disabled={isFormInvalid()}
              >
                {isLoadingReport ? "Loading..." : "Generate Report"}
              </button>
            </div>
          </form>
        </>
      )}

      {/* ── Table Report View ────────────────────────────────────────────── */}
      {reportVisible && exportResult && (
        <div className="mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-xl font-bold ${maroon}`}>
                Solar Data for UNT Calculation
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {selectedLocationLabel} | Bill Cycle: {selectedBillCycleDisplay} | Net Type: {netType}
              </p>
            </div>

            <div className="flex space-x-2 mt-2 md:mt-0">
              <button
                onClick={downloadAsCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition cursor-pointer"
              >
                <FaFileDownload className="w-3 h-3" /> CSV
              </button>
              <button
                onClick={printPDF}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition cursor-pointer"
              >
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button
                onClick={() => setReportVisible(false)}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white flex items-center cursor-pointer"
              >
                Back to Form
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-250px)] border border-gray-300 rounded-lg">
            <div ref={printRef} className="min-w-full py-4 px-2">
              <RawDataForSolarTable data={exportResult} />
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {reportError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {reportError}
        </div>
      )}

    </div>
  );
};

export default SolarDataForUNT;
