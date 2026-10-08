import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaFileDownload, FaPrint, FaSearch } from "react-icons/fa";
import { useUser } from "../../contexts/UserContext";
import { useReportScope } from "../../hooks/useReportScope";

interface ProvinceOption {
  ProvCode: string;
  ProvName: string;
}

interface AreaOption {
  AreaCode: string;
  AreaName: string;
  ProvCode?: string;
  Region?: string;
}

interface CompletionStatusRecord {
  readerCode: string;
  readerName: string;
  areaName: string;
  totalMeters: number;
  completedMeters: number;
  pendingMeters: number;
  completionPercentage: number;
  lastReadDate: string;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const billCycleToLabel = (cycle: number): string => {
  const baseYear = 1988;
  const baseMonth = 8;
  const totalMonths = baseMonth + (cycle - 1);
  const year = baseYear + Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const yy = String(year).slice(-2);
  return `${cycle} - ${MONTHS[month]} ${yy}`;
};

const MeteringReadingCompletionStatusReport: React.FC = () => {
  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const { user } = useUser();
  const { level, locked } = useReportScope();

  const isProvinceUser = level >= 60 && level < 70;
  const isAreaUser = level < 60;

  const lockedAreaCode = isAreaUser ? (locked["Area"]?.code || user.AreaCode || "") : "";
  const lockedAreaName = isAreaUser ? (locked["Area"]?.name || user.AreaName || "") : "";
  const lockedProvinceCode = isProvinceUser
    ? (locked["Province"]?.code || "")
    : isAreaUser
    ? (user.ProvinceCode || "")
    : "";

  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>(lockedProvinceCode);
  const [selectedArea, setSelectedArea] = useState<string>(lockedAreaCode);

  const [billCycles, setBillCycles] = useState<number[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<number>(0);
  const [billType, setBillType] = useState<"O" | "B">("O");

  const [loadingFilters, setLoadingFilters] = useState<boolean>(true);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [reportData, setReportData] = useState<CompletionStatusRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Load provinces and areas
  useEffect(() => {
    let cancelled = false;

    const loadLookups = async () => {
      setLoadingFilters(true);
      try {
        const [provRes, areaRes, cycleRes] = await Promise.allSettled([
          fetch("/misapi/api/ordinary/province").then((r) => r.json()),
          fetch("/misapi/api/ordinary/areas").then((r) => r.json()),
          fetch("/misapi/api/receivable-position/billcycle/max?billType=O").then((r) => r.json()),
        ]);

        if (cancelled) return;

        if (provRes.status === "fulfilled" && Array.isArray(provRes.value?.data)) {
          setProvinces(provRes.value.data);
        }

        if (areaRes.status === "fulfilled" && Array.isArray(areaRes.value?.data)) {
          setAreas(areaRes.value.data);
        }

        if (cycleRes.status === "fulfilled" && cycleRes.value?.data?.max_billcycle) {
          const maxCycle = Number(cycleRes.value.data.max_billcycle);
          if (maxCycle > 0) {
            const cycles: number[] = [];
            for (let i = 0; i < 12; i++) {
              cycles.push(maxCycle - i);
            }
            setBillCycles(cycles);
            setSelectedCycle(maxCycle);
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load filter data", err);
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    };

    void loadLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter areas based on selected province
  const availableAreas = areas.filter((a) => {
    if (!selectedProvince) return true;
    return a.ProvCode === selectedProvince;
  });

  const handleGenerateReport = useCallback(async () => {
    setLoadingReport(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      // Endpoint call placeholder / query
      // Can be connected to the dedicated backend endpoint once available
      const areaParam = isAreaUser ? lockedAreaCode : selectedArea;
      const endpoint = `/misapi/api/meter-reading/completion-status?billCycle=${selectedCycle}&areaCode=${encodeURIComponent(
        areaParam
      )}&billType=${billType}`;

      const res = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);

      if (res && res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setReportData(json.data);
          return;
        }
      }

      // If dedicated endpoint is not yet present on backend, set empty report data
      setReportData([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate report.";
      setErrorMessage(msg);
      setReportData([]);
    } finally {
      setLoadingReport(false);
    }
  }, [billType, isAreaUser, lockedAreaCode, selectedArea, selectedCycle]);

  const handleDownloadCSV = () => {
    if (reportData.length === 0) return;

    const headers = [
      "Reader Code",
      "Reader Name",
      "Area",
      "Total Meters",
      "Completed Meters",
      "Pending Meters",
      "Completion %",
      "Last Read Date",
    ];

    const rows = reportData.map((row) => [
      `"${row.readerCode}"`,
      `"${row.readerName}"`,
      `"${row.areaName}"`,
      row.totalMeters,
      row.completedMeters,
      row.pendingMeters,
      `${row.completionPercentage}%`,
      `"${row.lastReadDate}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Metering_Reading_Completion_Status_${selectedCycle}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Metering Reading Completion Status Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { color: #7A0000; text-align: center; margin-bottom: 8px; }
            .info { text-align: center; font-size: 13px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; color: #7A0000; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>Ceylon Electricity Board</h2>
          <div class="info">
            <strong>Metering Reading Completion Status Report</strong><br/>
            Bill Cycle: ${selectedCycle > 0 ? billCycleToLabel(selectedCycle) : "N/A"} | Bill Type: ${
      billType === "O" ? "Ordinary" : "Bulk"
    }
          </div>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const totalMetersSum = reportData.reduce((acc, r) => acc + (r.totalMeters || 0), 0);
  const completedMetersSum = reportData.reduce((acc, r) => acc + (r.completedMeters || 0), 0);
  const pendingMetersSum = reportData.reduce((acc, r) => acc + (r.pendingMeters || 0), 0);
  const overallPercentage =
    totalMetersSum > 0 ? ((completedMetersSum / totalMetersSum) * 100).toFixed(1) : "0.0";

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className={`text-xl font-bold ${maroon} tracking-tight`}>
          Metering Reading Completion Status Report
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Monitor meter reader progress, completion rates, and outstanding accounts across areas.
        </p>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
          {errorMessage}
        </div>
      )}

      {/* Filters Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Bill Type */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Bill Type</label>
            <select
              value={billType}
              onChange={(e) => setBillType(e.target.value as "O" | "B")}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#7A0000]"
            >
              <option value="O">Ordinary</option>
              <option value="B">Bulk</option>
            </select>
          </div>

          {/* Bill Cycle */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Bill Cycle</label>
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(Number(e.target.value))}
              disabled={loadingFilters || billCycles.length === 0}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#7A0000] disabled:opacity-50"
            >
              {billCycles.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {billCycleToLabel(cycle)}
                </option>
              ))}
            </select>
          </div>

          {/* Province */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Province</label>
            <select
              value={isProvinceUser ? lockedProvinceCode : selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setSelectedArea("");
              }}
              disabled={isProvinceUser || isAreaUser || loadingFilters}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#7A0000] disabled:opacity-50"
            >
              <option value="">All Provinces</option>
              {provinces.map((p) => (
                <option key={p.ProvCode} value={p.ProvCode}>
                  {p.ProvName}
                </option>
              ))}
            </select>
          </div>

          {/* Area */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Area</label>
            <select
              value={isAreaUser ? lockedAreaCode : selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              disabled={isAreaUser || loadingFilters}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#7A0000] disabled:opacity-50"
            >
              <option value="">{isAreaUser ? lockedAreaName : "All Areas"}</option>
              {availableAreas.map((a) => (
                <option key={a.AreaCode} value={a.AreaCode}>
                  {a.AreaName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={loadingReport}
            className={`flex items-center gap-2 px-4 py-2 text-white text-xs font-semibold rounded shadow-sm hover:opacity-90 disabled:opacity-50 ${maroonGrad}`}
          >
            <FaSearch className="w-3.5 h-3.5" />
            {loadingReport ? "Generating..." : "Generate Report"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={reportData.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              <FaFileDownload className="w-3 h-3 text-green-600" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={reportData.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              <FaPrint className="w-3 h-3 text-blue-600" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Report Data Table or Placeholder */}
      <div ref={printRef} className="overflow-x-auto">
        {loadingReport ? (
          <div className="text-center py-12 text-gray-500 text-xs">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#7A0000] border-t-transparent mb-2" />
            <p>Loading meter reading completion data...</p>
          </div>
        ) : reportData.length > 0 ? (
          <table className="w-full text-xs text-left border border-gray-200">
            <thead className="bg-[#7A0000] text-white">
              <tr>
                <th className="px-3 py-2 border">Reader Code</th>
                <th className="px-3 py-2 border">Reader Name</th>
                <th className="px-3 py-2 border">Area</th>
                <th className="px-3 py-2 border text-right">Total Meters</th>
                <th className="px-3 py-2 border text-right">Completed</th>
                <th className="px-3 py-2 border text-right">Pending</th>
                <th className="px-3 py-2 border text-right">Completion %</th>
                <th className="px-3 py-2 border text-center">Last Read Date</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-3 py-2 border font-medium">{row.readerCode}</td>
                  <td className="px-3 py-2 border">{row.readerName}</td>
                  <td className="px-3 py-2 border">{row.areaName}</td>
                  <td className="px-3 py-2 border text-right">{row.totalMeters.toLocaleString()}</td>
                  <td className="px-3 py-2 border text-right text-green-700 font-semibold">
                    {row.completedMeters.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 border text-right text-red-600">
                    {row.pendingMeters.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 border text-right font-semibold">
                    {row.completionPercentage.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 border text-center">{row.lastReadDate || "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
              <tr>
                <td colSpan={3} className="px-3 py-2 border text-right">
                  Total:
                </td>
                <td className="px-3 py-2 border text-right">{totalMetersSum.toLocaleString()}</td>
                <td className="px-3 py-2 border text-right text-green-700">
                  {completedMetersSum.toLocaleString()}
                </td>
                <td className="px-3 py-2 border text-right text-red-600">
                  {pendingMetersSum.toLocaleString()}
                </td>
                <td className="px-3 py-2 border text-right">{overallPercentage}%</td>
                <td className="px-3 py-2 border" />
              </tr>
            </tfoot>
          </table>
        ) : hasSearched ? (
          <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-300 rounded text-gray-500 text-xs">
            <p>No completion status records found for the selected criteria.</p>
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-300 rounded text-gray-500 text-xs">
            <p>Select parameters and click &quot;Generate Report&quot; to view completion status.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeteringReadingCompletionStatusReport;
