import React, { useEffect, useState } from "react";
import { Search, RotateCcw, Eye, Download, Printer } from "lucide-react";
import { useUser } from "../../contexts/UserContext";

interface Province {
  compId: string;
  CompName: string;
}

interface ProvinceStockData {
  MatCd: string;
  MatNm: string;
  CommittedCost: number;
  DeptInfo: string;
  Area: string;
  UomCd: string;
  Region: string;
}

const ProvinceWiseQuantityOnHand: React.FC = () => {
  const { user } = useUser();

  // Province list state
  const [data, setData] = useState<Province[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filtered, setFiltered] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // Selection state
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);

  // Material selection modal
  const [showMaterialSelection, setShowMaterialSelection] = useState(false);
  const [materialSelectionType, setMaterialSelectionType] = useState<"all" | "specific">("all");
  const [materialCode, setMaterialCode] = useState("");

  // Results modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<ProvinceStockData[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const epfNo = user?.Userno || "";

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const paginatedProvinces = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Fetch provinces
  useEffect(() => {
    const fetchProvinces = async () => {
      if (!epfNo) {
        setError("No EPF number available. Please login again.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/misapi/api/incomeexpenditure/Usercompanies/${epfNo}/60`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const txt = await res.text();
        const parsed = JSON.parse(txt);
        const rawData = Array.isArray(parsed) ? parsed : parsed.data || [];
        const final: Province[] = rawData.map((item: any) => ({
          compId: item.CompId || item.compId || "",
          CompName: item.CompName || item.compName || "",
        }));
        setData(final);
        setFiltered(final);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProvinces();
  }, [epfNo]);

  // Filter provinces
  useEffect(() => {
    const f = data.filter(
      (d) =>
        (!searchId || d.compId.toLowerCase().includes(searchId.toLowerCase())) &&
        (!searchName || d.CompName.toLowerCase().includes(searchName.toLowerCase()))
    );
    setFiltered(f);
    setPage(1);
  }, [searchId, searchName, data]);

  const handleProvinceSelect = (province: Province) => {
    setSelectedProvince(province);
    setShowMaterialSelection(true);
    setReportError(null);
    setMaterialCode("");
    setMaterialSelectionType("all");
  };

  const fetchReportData = async () => {
    if (!selectedProvince) return;
    if (materialSelectionType === "specific" && !materialCode.trim()) {
      setReportError("Please enter a material code.");
      return;
    }

    setReportLoading(true);
    setReportError(null);
    try {
      let apiUrl = `/misapi/api/materialcommittedstock/get?compId=${encodeURIComponent(selectedProvince.compId)}`;
      if (materialSelectionType === "specific" && materialCode.trim()) {
        apiUrl += `&matCode=${encodeURIComponent(materialCode.trim())}`;
      }

      const res = await fetch(apiUrl, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
      }

      const jsonData = await res.json();
      let arr: ProvinceStockData[] = [];
      if (Array.isArray(jsonData)) arr = jsonData;
      else if (jsonData.data && Array.isArray(jsonData.data)) arr = jsonData.data;
      else if (jsonData.result && Array.isArray(jsonData.result)) arr = jsonData.result;

      setReportData(arr);
      setShowMaterialSelection(false);
      setReportModalOpen(true);
    } catch (err: any) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const closeReportModal = () => {
    setReportModalOpen(false);
    setReportData([]);
    setSelectedProvince(null);
    setShowMaterialSelection(false);
    setMaterialCode("");
    setMaterialSelectionType("all");
  };

  const clearFilters = () => {
    setSearchId("");
    setSearchName("");
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || num === 0) return "0.00";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // CSV download
  const downloadAsCSV = () => {
    if (!reportData || reportData.length === 0) return;
    const totalQty = reportData.reduce((sum, r) => sum + (r.CommittedCost || 0), 0);

    const csvRows = [
      [`Province Wise Quantity on Hand (Provincial Stores Only) - ${new Date().toLocaleDateString()}`],
      [`Province: ${selectedProvince?.compId} / ${selectedProvince?.CompName.toUpperCase()}${materialSelectionType === "specific" && materialCode ? ` / Material Code - ${materialCode}` : ""}`],
      [],
      ["Material Code", "Material Name", "UOM", "Cost Centre", "Area", "Qty On Hand"],
      ...reportData.map((item) => [
        item.MatCd?.trim() || "",
        `"${(item.MatNm?.trim() || "").replace(/"/g, '""')}"`,
        item.UomCd?.trim() || "",
        `"${(item.DeptInfo?.trim() || "").replace(/"/g, '""')}"`,
        `"${(item.Area?.trim() || "").replace(/"/g, '""')}"`,
        (item.CommittedCost || 0).toFixed(2),
      ]),
      [],
      ["", "", "", "", "TOTAL", totalQty.toFixed(2)],
      [],
      [`Generated: ${new Date().toLocaleString()}`],
      [`CEB@${new Date().getFullYear()}`],
    ];

    const csvContent = csvRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const materialSuffix = materialSelectionType === "specific" && materialCode ? `_${materialCode}` : "";
    link.download = `ProvinceWiseQtyOnHand_${selectedProvince?.compId}${materialSuffix}_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print PDF
  const printPDF = () => {
    if (!reportData || reportData.length === 0) return;
    const totalQty = reportData.reduce((sum, r) => sum + (r.CommittedCost || 0), 0);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let tableRowsHTML = "";
    reportData.forEach((item) => {
      tableRowsHTML += `
        <tr>
          <td style="padding:4px 8px;border:1px solid #333;font-family:monospace;font-size:11px;">${item.MatCd?.trim() || ""}</td>
          <td style="padding:4px 8px;border:1px solid #333;font-size:11px;">${item.MatNm?.trim() || ""}</td>
          <td style="padding:4px 8px;border:1px solid #333;text-align:center;font-size:11px;">${item.UomCd?.trim() || ""}</td>
          <td style="padding:4px 8px;border:1px solid #333;font-size:11px;">${item.DeptInfo?.trim() || ""}</td>
          <td style="padding:4px 8px;border:1px solid #333;font-size:11px;">${item.Area?.trim() || ""}</td>
          <td style="padding:4px 8px;border:1px solid #333;text-align:right;font-family:monospace;font-size:11px;">${formatNumber(item.CommittedCost)}</td>
        </tr>`;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Province Wise Quantity on Hand - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 15px; font-size: 11px; color: #000; line-height: 1.2; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header h1 { font-size: 14px; margin: 0; font-weight: bold; text-transform: uppercase; }
          .header h2 { font-size: 12px; margin: 3px 0; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th { background-color: #fff; color: #000; font-weight: bold; text-align: center; padding: 6px 8px; border: 1px solid #333; font-size: 11px; }
          .total-row td { font-weight: bold; background-color: #f5f5f5; }
          .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #666; border-top: 1px solid #333; padding-top: 10px; }
          @media print { body { margin: 0; } tr { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CEYLON ELECTRICITY BOARD</h1>
          <h1>PROVINCE WISE QUANTITY ON HAND (PROVINCIAL STORES ONLY)</h1>
          <h2>Province: ${selectedProvince?.compId} / ${selectedProvince?.CompName}${materialSelectionType === "specific" && materialCode ? ` | Material Code: ${materialCode}` : ""}</h2>
          <h2>Generated: ${new Date().toLocaleDateString()}</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:12%;text-align:left;">MATERIAL CODE</th>
              <th style="width:28%;text-align:left;">MATERIAL NAME</th>
              <th style="width:8%;text-align:center;">UOM</th>
              <th style="width:22%;text-align:left;">COST CENTRE</th>
              <th style="width:16%;text-align:left;">AREA</th>
              <th style="width:14%;text-align:right;">QTY ON HAND</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
            <tr class="total-row">
              <td colspan="5" style="padding:4px 8px;border:1px solid #333;text-align:right;font-size:11px;">TOTAL</td>
              <td style="padding:4px 8px;border:1px solid #333;text-align:right;font-family:monospace;font-size:11px;">${formatNumber(totalQty)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on: ${new Date().toLocaleString()} | CEB Inventory System</p>
        </div>
      </body>
      </html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); printWindow.close(); };
  };

  // ── Material Selection Modal ──────────────────────────────────────────────
  const MaterialSelectionModal = () => {
    if (!showMaterialSelection || !selectedProvince) return null;
    return (
      <div className="fixed inset-0 bg-white bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 pt-24 pb-8 pl-64 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl mx-4">
          <div className={`${maroonGrad} rounded-t-2xl p-4 text-white`}>
            <h3 className="text-lg font-bold">Material Selection</h3>
            <p className="text-xs text-white text-opacity-90 mt-1">Configure report parameters</p>
          </div>
          <div className="p-5">
            {/* Province Info Card */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 mb-4 border border-gray-200">
              <p className="text-xs text-gray-500 mb-0.5 font-medium">Selected Province</p>
              <p className="text-sm font-bold text-gray-800">{selectedProvince.compId}</p>
              <p className="text-xs text-gray-700 mt-0.5">{selectedProvince.CompName}</p>
            </div>

            <div className="space-y-4">
              {/* Radio selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Select Report Scope</label>
                <div className="space-y-2">
                  {(["all", "specific"] as const).map((type) => (
                    <label
                      key={type}
                      className={`flex items-center cursor-pointer p-2 rounded-lg border-2 transition-all ${
                        materialSelectionType === type
                          ? "border-[#7A0000] bg-red-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="materialType"
                        value={type}
                        checked={materialSelectionType === type}
                        onChange={() => setMaterialSelectionType(type)}
                        className="mr-2.5 w-4 h-4 text-[#7A0000] focus:ring-[#7A0000]"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-gray-800 block">
                          {type === "all" ? "All Materials" : "Specific Material"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {type === "all" ? "Generate report for all materials" : "Generate report for a single material code prefix"}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Material Code Input */}
              {materialSelectionType === "specific" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">Material Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={materialCode}
                      onChange={(e) => setMaterialCode(e.target.value.toUpperCase())}
                      placeholder="Enter material code prefix"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A0000] focus:border-transparent text-sm font-mono tracking-wide transition-all"
                      autoComplete="off"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">💡 Matches all codes starting with this prefix</p>
                </div>
              )}

              {/* Error */}
              {reportError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded-lg">
                  <p className="text-xs font-medium text-red-800">{reportError}</p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowMaterialSelection(false);
                  setSelectedProvince(null);
                  setMaterialCode("");
                  setMaterialSelectionType("all");
                  setReportError(null);
                }}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={fetchReportData}
                disabled={reportLoading}
                className={`px-6 py-2.5 ${maroonGrad} text-white rounded-xl hover:brightness-110 text-sm font-semibold shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2`}
              >
                {reportLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    View Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Results Modal ─────────────────────────────────────────────────────────
  const ReportModal = () => {
    if (!reportModalOpen || !selectedProvince) return null;
    const totalQty = reportData.reduce((sum, r) => sum + (r.CommittedCost || 0), 0);

    return (
      <div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
        <div className="bg-white w-full max-w-7xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
          {/* Header */}
          <div className="p-5 border-b">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-gray-800">
                  CEYLON ELECTRICITY BOARD – INVENTORY REPORT
                </h2>
                <h3 className="text-sm font-semibold text-gray-700">
                  PROVINCE: {selectedProvince.compId} / {selectedProvince.CompName}
                  {materialSelectionType === "specific" && materialCode && (
                    <span className="ml-2 text-blue-600">/ MATERIAL CODE - {materialCode}</span>
                  )}
                </h3>
                <h4 className={`text-sm ${maroon} font-medium`}>
                  PROVINCE WISE QUANTITY ON HAND (PROVINCIAL STORES ONLY) — {new Date().toLocaleDateString()}
                </h4>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={downloadAsCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={printPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={closeReportModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium transition-colors border border-gray-300"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-3 flex gap-4">
              <div className="bg-blue-50 rounded-lg px-4 py-2 text-center border border-blue-200">
                <div className="text-lg font-bold text-blue-700">{reportData.length}</div>
                <div className="text-xs text-blue-600">Total Records</div>
              </div>
              <div className="bg-green-50 rounded-lg px-4 py-2 text-center border border-green-200">
                <div className="text-lg font-bold text-green-700">{formatNumber(totalQty)}</div>
                <div className="text-xs text-green-600">Total Qty on Hand</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1">
            {reportData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                No data found for the selected province{materialSelectionType === "specific" && materialCode ? ` and material code "${materialCode}"` : ""}.
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0">
                  <tr className="bg-[#7A0000] text-white">
                    <th className="px-3 py-3 text-left font-semibold border border-[#600000] whitespace-nowrap">MATERIAL CODE</th>
                    <th className="px-3 py-3 text-left font-semibold border border-[#600000]">MATERIAL NAME</th>
                    <th className="px-3 py-3 text-center font-semibold border border-[#600000] whitespace-nowrap">UOM</th>
                    <th className="px-3 py-3 text-left font-semibold border border-[#600000]">COST CENTRE</th>
                    <th className="px-3 py-3 text-left font-semibold border border-[#600000]">AREA</th>
                    <th className="px-3 py-3 text-right font-semibold border border-[#600000] whitespace-nowrap">QTY ON HAND</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white hover:bg-red-50" : "bg-gray-50 hover:bg-red-50"}
                    >
                      <td className="px-3 py-2 font-mono font-semibold border border-gray-200 whitespace-nowrap">
                        {item.MatCd?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2 border border-gray-200">{item.MatNm?.trim() || "—"}</td>
                      <td className="px-3 py-2 text-center border border-gray-200 whitespace-nowrap">
                        {item.UomCd?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2 border border-gray-200">{item.DeptInfo?.trim() || "—"}</td>
                      <td className="px-3 py-2 border border-gray-200">{item.Area?.trim() || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono border border-gray-200 whitespace-nowrap">
                        {item.CommittedCost === 0 ? "—" : formatNumber(item.CommittedCost)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-[#f9f0f0] font-bold border-t-2 border-[#7A0000]">
                    <td colSpan={5} className="px-3 py-2 text-right border border-gray-300 text-xs">
                      TOTAL
                    </td>
                    <td className="px-3 py-2 text-right font-mono border border-gray-300 text-xs text-[#7A0000]">
                      {formatNumber(totalQty)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render (Province Picker) ─────────────────────────────────────────
  return (
    <div className="p-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Province ID</label>
          <div className="relative">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Search by ID..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#7A0000]"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Province Name</label>
          <div className="relative">
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#7A0000]"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 text-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Province Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#7A0000] border-t-transparent mr-3" />
          Loading provinces...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#7A0000] text-white">
                  <th className="px-4 py-3 text-left font-semibold text-xs border border-[#600000] w-1/4">
                    PROVINCE ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs border border-[#600000]">
                    PROVINCE NAME
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-xs border border-[#600000] w-28">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedProvinces.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-xs">
                      No provinces found.
                    </td>
                  </tr>
                ) : (
                  paginatedProvinces.map((province, idx) => (
                    <tr
                      key={province.compId}
                      className={`cursor-pointer transition-colors ${
                        idx % 2 === 0 ? "bg-white hover:bg-red-50" : "bg-gray-50 hover:bg-red-50"
                      }`}
                      onClick={() => handleProvinceSelect(province)}
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-xs border border-gray-200">
                        {province.compId}
                      </td>
                      <td className="px-4 py-2.5 text-xs border border-gray-200">{province.CompName}</td>
                      <td className="px-4 py-2.5 text-center border border-gray-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleProvinceSelect(province); }}
                          className={`inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-[#7A0000] to-[#A52A2A] text-white rounded-lg text-xs font-medium hover:brightness-110 transition-all shadow-sm`}
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
              <span>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹ Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
                  disabled={page >= Math.ceil(filtered.length / pageSize)}
                  className="px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <MaterialSelectionModal />
      <ReportModal />
    </div>
  );
};

export default ProvinceWiseQuantityOnHand;
