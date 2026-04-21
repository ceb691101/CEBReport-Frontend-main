import { FormEvent, useEffect, useMemo, useState } from "react";
import { MdDateRange } from "react-icons/md";

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
  const [error, setError] = useState<string | null>(null);
  const [hasRequestedReport, setHasRequestedReport] = useState<boolean>(false);

  const [monthlyCounts, setMonthlyCounts] = useState<MonthlyCount[]>([]);

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
      setError(null);

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
        setError(message);
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
      return areas.map((item) => ({ value: item.AreaCode, label: item.AreaName }));
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!fromCycle || !toCycle) {
      setError("Please select both from and to bill cycles.");
      return;
    }

    if (reportType !== "entireceb" && !typeCode) {
      setError("Please select a value for the selected report type.");
      return;
    }

    try {
      setHasRequestedReport(true);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate report.";
      setError(message);
      setMonthlyCounts([]);
    } finally {
      setIsLoadingReport(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="p-4 rounded-lg shadow-sm border border-gray-100 w-full bg-white"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="text-xs text-gray-600 block mb-1">Report Type</label>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-700 h-8">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="reportType"
                  value="area"
                  checked={reportType === "area"}
                  onChange={() => setReportType("area")}
                  disabled={isLoadingFilters || isLoadingReport}
                />
                Area
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="reportType"
                  value="province"
                  checked={reportType === "province"}
                  onChange={() => setReportType("province")}
                  disabled={isLoadingFilters || isLoadingReport}
                />
                Province
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="reportType"
                  value="division"
                  checked={reportType === "division"}
                  onChange={() => setReportType("division")}
                  disabled={isLoadingFilters || isLoadingReport}
                />
                Division
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="reportType"
                  value="entireceb"
                  checked={reportType === "entireceb"}
                  onChange={() => setReportType("entireceb")}
                  disabled={isLoadingFilters || isLoadingReport}
                />
                Entire CEB
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">
              <MdDateRange className="inline text-[#800000] text-sm mr-1" />
              From Bill Cycle
            </label>
            <select
              value={fromCycle}
              onChange={(e) => setFromCycle(e.target.value)}
              className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors text-gray-700 w-full"
              disabled={isLoadingFilters || isLoadingReport}
              required
            >
              <option value="">Select cycle</option>
              {billCycleOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.display}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">
              <MdDateRange className="inline text-[#800000] text-sm mr-1" />
              To Bill Cycle
            </label>
            <select
              value={toCycle}
              onChange={(e) => setToCycle(e.target.value)}
              className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors text-gray-700 w-full"
              disabled={isLoadingFilters || isLoadingReport}
              required
            >
              <option value="">Select cycle</option>
              {billCycleOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.display}
                </option>
              ))}
            </select>
          </div>

          {reportType !== "entireceb" && (
            <div className="md:col-span-2 lg:col-span-3">
              <label className="text-xs text-gray-600 block mb-1">
                {reportType === "area"
                  ? "Area"
                  : reportType === "province"
                  ? "Province"
                  : "Division"}
              </label>
              <select
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
                className="rounded-md bg-gray-50 h-8 px-3 text-xs border border-gray-200 focus:border-[#800000] focus:ring-1 focus:ring-[#800000] outline-none transition-colors text-gray-700 w-full"
                disabled={isLoadingFilters || isLoadingReport}
                required
              >
                <option value="">Select value</option>
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-1 flex items-end">
            <button
              type="submit"
              className="rounded-md bg-[#8B0000] text-white text-sm font-semibold h-8 px-4 hover:bg-[#6a0000] transition-colors disabled:opacity-60 w-full"
              disabled={isLoadingFilters || isLoadingReport}
            >
              {isLoadingReport ? "Generating..." : "View Report"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {hasRequestedReport && (
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          {getFormattedLocation() && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-700">
                {getFormattedLocation()}
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-200 px-3 py-2 text-left">Month</th>
                  <th className="border border-gray-200 px-3 py-2 text-right">
                    Registered Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyCounts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="border border-gray-200 px-3 py-3 text-center text-gray-500"
                    >
                      {isLoadingReport
                        ? "Loading report..."
                        : "No data to display. Select filters and click View Report."}
                    </td>
                  </tr>
                ) : (
                  monthlyCounts.map((row) => (
                    <tr key={row.BillCycle}>
                      <td className="border border-gray-200 px-3 py-2 text-gray-700">
                        {getBillCycleDisplay(row.BillCycle)}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right font-medium text-gray-800">
                        {row.Count.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisteredConsumersForSMSAlerts;