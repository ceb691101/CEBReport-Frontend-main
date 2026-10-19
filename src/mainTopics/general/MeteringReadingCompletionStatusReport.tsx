import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint, FaSyncAlt } from "react-icons/fa";

interface MeterReadingRecord {
  Province: string;
  AreaCode: string;
  AreaName: string;
  LastCompletedCycle: string;
  LastReadingCompletedPack: string;
  LastPackCompletedDate: string;
  CurrentCycle: string;
  CurrentReadingCompletedPack: string;
  CurrentPackCompletedDate: string;
  Remarks: string;
}

interface MeterReadingResponse {
  CurrentCycle: number;
  CurrentCycleLabel: string;
  PreviousCycle: number;
  PreviousCycleLabel: string;
  Rows: MeterReadingRecord[];
}

const MeteringReadingCompletionStatusReport: React.FC = () => {
  const maroon = "text-[#7A0000]";

  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<MeterReadingRecord[]>([]);
  const [metaInfo, setMetaInfo] = useState<{ currentLabel: string; prevLabel: string }>({
    currentLabel: "",
    prevLabel: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    setLoading(true);
    setErrorMessage(null);

    // Direct localhost URL for testing with local IIS Express backend
    const url = "http://localhost:44381/api/meter-reading/completion-status";

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        let msg = `HTTP error! status: ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.errorMessage) msg = errData.errorMessage;
        } catch {}
        throw new Error(msg);
      }

      const json = await res.json();
      if (json.errorMessage) {
        throw new Error(json.errorMessage);
      }

      const data: MeterReadingResponse = json.data;
      if (!data || !data.Rows || data.Rows.length === 0) {
        throw new Error("No meter reading completion records found.");
      }

      setReportData(data.Rows);
      setMetaInfo({
        currentLabel: data.CurrentCycleLabel || String(data.CurrentCycle),
        prevLabel: data.PreviousCycleLabel || String(data.PreviousCycle),
      });
    } catch (err: any) {
      let msg = err.message || "Failed to connect to backend.";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        msg = "Cannot connect to local backend (http://localhost:44381). Please ensure Visual Studio IIS Express is running on port 44381.";
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleDownloadCSV = () => {
    if (!reportData || reportData.length === 0) return;

    const headers = [
      "Province",
      "Area Name",
      "Last Completed Cycle",
      "Last Reading Completed Pack",
      "Last Pack Completed Date",
      "Current Cycle",
      "Current Reading Completed Pack",
      "Current Pack Completed Date",
      "Remarks",
    ];

    const rows = reportData.map((r) => [
      r.Province,
      r.AreaName,
      r.LastCompletedCycle,
      r.LastReadingCompletedPack,
      r.LastPackCompletedDate,
      r.CurrentCycle,
      r.CurrentReadingCompletedPack,
      r.CurrentPackCompletedDate,
      r.Remarks,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [`Metering Reading Completion Status Report`]
        .concat([`Bill Cycle : ${metaInfo.currentLabel}`])
        .concat([""])
        .concat([headers.join(",")])
        .concat(rows.map((e) => e.map((val) => `"${val || ""}"`).join(",")))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Metering_Reading_Completion_Status_${metaInfo.currentLabel.replace(/[\s-]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Metering Reading Completion Status Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
            h2 { color: #7A0000; margin-bottom: 4px; }
            .cycle-sub { font-weight: bold; color: #7A0000; font-size: 13px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 5px 6px; font-size: 10px; }
            th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .font-medium { font-weight: 500; }
          </style>
        </head>
        <body>
          <h2>Metering Reading Completion Status Report</h2>
          <div class="cycle-sub">Bill Cycle : ${metaInfo.currentLabel}</div>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const th = "border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-800 bg-gray-100";
  const td = "border border-gray-300 px-3 py-1.5 text-xs text-gray-700";

  return (
    <div className="p-6 bg-white rounded-lg shadow-md min-h-[500px]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-2 border-b border-gray-200">
        <div>
          <h2 className={`text-xl font-bold ${maroon}`}>Metering Reading Completion Status Report</h2>
          {metaInfo.currentLabel && (
            <p className={`text-sm font-bold mt-1 ${maroon}`}>
              Bill Cycle : {metaInfo.currentLabel}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 bg-white rounded text-xs font-medium hover:bg-gray-50 transition shadow-sm"
          >
            <FaSyncAlt className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={loading || reportData.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded text-xs font-medium hover:bg-blue-50 transition shadow-sm disabled:opacity-50"
          >
            <FaFileDownload className="w-3 h-3" /> CSV
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || reportData.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-500 text-green-700 bg-white rounded text-xs font-medium hover:bg-green-50 transition shadow-sm disabled:opacity-50"
          >
            <FaPrint className="w-3 h-3" /> Print
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#7A0000]"></div>
          <span className="mt-4 text-sm font-medium text-gray-600">Loading Meter Reading Completion Status...</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && !loading && (
        <div className="p-4 my-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md shadow-sm">
          <p className="font-semibold">Error Loading Report:</p>
          <p className="mt-1">{errorMessage}</p>
          <button
            onClick={fetchReport}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Report Data Table */}
      {!loading && !errorMessage && reportData.length > 0 && (
        <div className="overflow-x-auto border border-gray-300 rounded-lg max-h-[calc(100vh-230px)] shadow-sm">
          <div ref={printRef} className="min-w-full">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-gray-100 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className={`${th} text-left`}>Province</th>
                  <th className={`${th} text-left`}>Area Name</th>
                  <th className={th}>Last Completed Cycle</th>
                  <th className={th}>Last Reading Completed Pack</th>
                  <th className={th}>Last Pack Completed Date</th>
                  <th className={th}>Current Cycle</th>
                  <th className={th}>Current Reading Completed Pack</th>
                  <th className={th}>Current Pack Completed Date</th>
                  <th className={th}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => {
                  const isFirstOfProvince = idx === 0 || row.Province !== reportData[idx - 1].Province;
                  const isFirstOfArea =
                    isFirstOfProvince ||
                    row.AreaCode !== reportData[idx - 1].AreaCode ||
                    row.AreaName !== reportData[idx - 1].AreaName;

                  return (
                    <tr
                      key={idx}
                      className={
                        isFirstOfArea
                          ? "bg-white border-t border-gray-300"
                          : idx % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50/50"
                      }
                    >
                      {/* Province */}
                      <td className={`${td} font-semibold text-gray-900 align-top`}>
                        {isFirstOfProvince ? row.Province : ""}
                      </td>

                      {/* Area Name */}
                      <td className={`${td} font-medium text-gray-800 align-top`}>
                        {isFirstOfArea ? row.AreaName : ""}
                      </td>

                      {/* Last Completed Cycle */}
                      <td className={`${td} text-center font-mono text-gray-600`}>
                        {row.LastCompletedCycle}
                      </td>

                      {/* Last Reading Completed Pack */}
                      <td className={`${td} text-center font-semibold text-gray-800`}>
                        {row.LastReadingCompletedPack}
                      </td>

                      {/* Last Pack Completed Date */}
                      <td className={`${td} text-center font-mono text-gray-600`}>
                        {row.LastPackCompletedDate}
                      </td>

                      {/* Current Cycle */}
                      <td className={`${td} text-center font-mono text-gray-600`}>
                        {row.CurrentCycle}
                      </td>

                      {/* Current Reading Completed Pack */}
                      <td className={`${td} text-center font-semibold text-gray-800`}>
                        {row.CurrentReadingCompletedPack}
                      </td>

                      {/* Current Pack Completed Date */}
                      <td className={`${td} text-center font-mono text-gray-600`}>
                        {row.CurrentPackCompletedDate}
                      </td>

                      {/* Remarks */}
                      <td className={`${td} text-center font-semibold text-amber-700`}>
                        {row.Remarks}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeteringReadingCompletionStatusReport;
