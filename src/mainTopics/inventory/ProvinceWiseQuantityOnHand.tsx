import React, { useEffect, useState } from "react";
import { Search, RotateCcw, Eye, Download, Printer } from "lucide-react";


interface Province {
  compId: string;
  CompNm: string;
}

interface PivotRow {
  MatCd: string;
  MatNm: string;
  UomCd: string;
  depts: Map<string, number>;
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

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  const paginatedProvinces = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Build pivot (cross-tab) from flat report data
  const buildPivot = (flatData: ProvinceStockData[]): { depts: string[]; rows: PivotRow[] } => {
    const deptSet = new Set<string>();
    const matMap = new Map<string, PivotRow>();
    flatData.forEach((item) => {
      const dept = item.DeptInfo?.trim() || "(Unknown)";
      deptSet.add(dept);
      const key = item.MatCd?.trim() || "";
      if (!matMap.has(key)) {
        matMap.set(key, {
          MatCd: item.MatCd?.trim() || "",
          MatNm: item.MatNm?.trim() || "",
          UomCd: item.UomCd?.trim() || "",
          depts: new Map(),
        });
      }
      const row = matMap.get(key)!;
      row.depts.set(dept, (row.depts.get(dept) || 0) + (item.CommittedCost || 0));
    });
    const depts = Array.from(deptSet).sort();
    const rows = Array.from(matMap.values()).sort((a, b) => a.MatCd.localeCompare(b.MatCd));
    return { depts, rows };
  };

  // Fetch provinces
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/committedstock/api/materialcommittedstock/provinces`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const txt = await res.text();
        const parsed = JSON.parse(txt);
        const rawData = Array.isArray(parsed) ? parsed : parsed.data || [];
        const final: Province[] = rawData.map((item: any) => ({
          compId: item.CompId || item.compId || "",
          CompNm: item.CompNm || item.compNm || "",
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
  }, []);

  // Filter provinces
  useEffect(() => {
    const f = data.filter(
      (d) =>
        (!searchId || d.compId.toLowerCase().includes(searchId.toLowerCase())) &&
        (!searchName || d.CompNm.toLowerCase().includes(searchName.toLowerCase()))
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
      let apiUrl = `/committedstock/api/materialcommittedstock/get?compId=${encodeURIComponent(selectedProvince.compId)}`;
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

  // CSV Export (pivot/cross-tab format)
  const downloadAsCSV = () => {
    if (!reportData || reportData.length === 0) return;
    const { depts, rows } = buildPivot(reportData);

    const deptTotals = depts.map((d) => rows.reduce((s, r) => s + (r.depts.get(d) || 0), 0));
    const grandTotal = deptTotals.reduce((s, v) => s + v, 0);

    const csvRows = [
      [`Province Wise Quantity on Hand (Provincial Stores Only)`],
      [`Province : ${selectedProvince?.compId} / ${selectedProvince?.CompNm?.toUpperCase()}${
        materialSelectionType === "specific" && materialCode ? ` / Material Code - ${materialCode}` : ""
      }`],
      [`Consider only Status=2 (Active) and Grade Code NEW Materials`],
      [],
      ["Mat_cd", "Material Name", "Unit of Measure", ...depts, "Total"],
      ...rows.map((row) => {
        const total = depts.reduce((s, d) => s + (row.depts.get(d) || 0), 0);
        return [
          row.MatCd,
          `"${row.MatNm.replace(/"/g, '""')}"`,
          row.UomCd,
          ...depts.map((d) => (row.depts.get(d) || 0).toFixed(2)),
          total.toFixed(2),
        ];
      }),
      [],
      ["", "", "TOTAL", ...deptTotals.map((v) => v.toFixed(2)), grandTotal.toFixed(2)],
      [],
      [`Generated: ${new Date().toLocaleString()}`],
      [`CEB@${new Date().getFullYear()}`],
    ];

    const csvContent = csvRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const suffix = materialSelectionType === "specific" && materialCode ? `_${materialCode}` : "";
    const dateStr = new Date().toLocaleDateString().replace(/\//g, "-");
    link.download = `ProvinceWiseQtyOnHand_${selectedProvince?.compId}${suffix}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PDF Export — window.open print approach (same as all other report pages)
  const printPDF = () => {
    if (!reportData || reportData.length === 0) return;
    const { depts, rows } = buildPivot(reportData);

    const deptTotals = depts.map((d) => rows.reduce((s, r) => s + (r.depts.get(d) || 0), 0));
    const grandTotal = deptTotals.reduce((s, v) => s + v, 0);

    const thCells = ["Mat_cd", "Material Name", "Unit of\nMeasure", ...depts, "Total"]
      .map((h) => `<th>${h.replace(/\n/g, "<br/>")}</th>`)
      .join("");

    const bodyRows = rows
      .map((row) => {
        const total = depts.reduce((s, d) => s + (row.depts.get(d) || 0), 0);
        const deptTds = depts
          .map((d) => {
            const v = row.depts.get(d);
            return `<td class="num">${v ? formatNumber(v) : ""}</td>`;
          })
          .join("");
        return `<tr>
          <td class="mono">${row.MatCd}</td>
          <td>${row.MatNm}</td>
          <td class="center">${row.UomCd}</td>
          ${deptTds}
          <td class="num bold">${formatNumber(total)}</td>
        </tr>`;
      })
      .join("");

    const totalTds = deptTotals
      .map((v) => `<td class="num bold">${formatNumber(v)}</td>`)
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Province Wise Quantity on Hand</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 9px; margin: 10mm; color: #000; }
            h2 { font-size: 13px; font-weight: bold; text-align: center; margin: 0 0 3px; }
            .subtitle { font-size: 10px; text-align: center; margin: 2px 0; }
            .note { font-size: 8px; text-align: center; color: #555; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            th { background-color: #7A0000; color: #fff; font-weight: bold; text-align: center;
                 padding: 3px 4px; border: 1px solid #600000; font-size: 8px; white-space: pre-line; }
            td { padding: 2px 4px; border: 1px solid #ccc; font-size: 8px; }
            tr:nth-child(even) td { background-color: #fafafa; }
            .num { text-align: right; font-family: monospace; }
            .center { text-align: center; }
            .mono { font-family: monospace; font-weight: bold; }
            .bold { font-weight: bold; }
            .total-row td { background-color: #f9f0f0 !important; font-weight: bold;
                            border-top: 2px solid #7A0000; }
            @media print {
              body { margin: 0; }
              tr { page-break-inside: avoid; }
              @page {
                size: A4 landscape;
                margin: 0.5in;
                @bottom-left  { content: "Printed on: ${new Date().toLocaleString()}";
                                font-size: 0.65rem; color: gray; }
                @bottom-right { content: "Page " counter(page) " of " counter(pages);
                                font-size: 0.65rem; color: gray; }
              }
            }
          </style>
        </head>
        <body>
          <h2>PROVINCE WISE QUANTITY ON HAND (PROVINCIAL STORES ONLY)</h2>
          <div class="subtitle">Province : ${selectedProvince?.compId} / ${selectedProvince?.CompNm}${
            materialSelectionType === "specific" && materialCode
              ? `&nbsp;&nbsp;|&nbsp;&nbsp;Material Code : ${materialCode}`
              : ""
          }</div>
          <div class="note">Consider only Status=2 (Active) and Grade Code NEW Materials &nbsp;&nbsp;|&nbsp;&nbsp; Date: ${new Date().toLocaleDateString()}</div>
          <table>
            <thead><tr>${thCells}</tr></thead>
            <tbody>
              ${bodyRows}
              <tr class="total-row">
                <td></td><td></td><td class="bold center">TOTAL</td>
                ${totalTds}
                <td class="num bold">${formatNumber(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
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
              <p className="text-xs text-gray-700 mt-0.5">{selectedProvince.CompNm}</p>
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

  // ── Results Modal (Pivot / Cross-tab) ────────────────────────────────────
  const ReportModal = () => {
    if (!reportModalOpen || !selectedProvince) return null;
    const { depts, rows } = buildPivot(reportData);
    const deptTotals = depts.map((d) => rows.reduce((s, r) => s + (r.depts.get(d) || 0), 0));
    const grandTotal = deptTotals.reduce((s, v) => s + v, 0);

    return (
      <div className="fixed inset-0 bg-white flex items-start justify-end z-50 pt-24 pb-8 pl-64">
        <div className="bg-white w-full max-w-7xl rounded-lg shadow-lg border border-gray-300 max-h-[85vh] flex flex-col mr-4">
          {/* Header */}
          <div className="p-5 border-b">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-gray-700">
                  PROVINCE: {selectedProvince.compId} / {selectedProvince.CompNm}
                  {materialSelectionType === "specific" && materialCode && (
                    <span className="ml-2 text-blue-600">/ MATERIAL CODE - {materialCode}</span>
                  )}
                </h3>
                <h4 className={`text-sm ${maroon} font-medium`}>
                  PROVINCE WISE QUANTITY ON HAND (PROVINCIAL STORES ONLY) — {new Date().toLocaleDateString()}
                </h4>
                <p className="text-xs text-gray-500 italic">
                  Consider only Status=2 (Active) and Grade Code NEW Materials
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={downloadAsCSV}
                  className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button
                  onClick={printPDF}
                  className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-green-50 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-200 transition"
                >
                  <Printer className="w-3 h-3" /> PDF
                </button>
                <button
                  onClick={closeReportModal}
                  className="flex items-center gap-1 px-3 py-1.5 border border-red-400 text-red-700 bg-white rounded-md text-xs font-medium shadow-sm hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 transition"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Summary stats */}
            <div className="mt-3 flex gap-4">
              <div className="bg-blue-50 rounded-lg px-4 py-2 text-center border border-blue-200">
                <div className="text-lg font-bold text-blue-700">{rows.length}</div>
                <div className="text-xs text-blue-600">Total Materials</div>
              </div>
              <div className="bg-purple-50 rounded-lg px-4 py-2 text-center border border-purple-200">
                <div className="text-lg font-bold text-purple-700">{depts.length}</div>
                <div className="text-xs text-purple-600">Departments</div>
              </div>
              <div className="bg-green-50 rounded-lg px-4 py-2 text-center border border-green-200">
                <div className="text-lg font-bold text-green-700">{formatNumber(grandTotal)}</div>
                <div className="text-xs text-green-600">Total Qty on Hand</div>
              </div>
            </div>
          </div>

          {/* Pivot Table */}
          <div className="overflow-auto flex-1">
            {rows.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                No data found for the selected province{materialSelectionType === "specific" && materialCode ? ` and material code "${materialCode}"` : ""}.
              </div>
            ) : (
              <table className="text-xs border-collapse" style={{ minWidth: "100%" }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#7A0000] text-white">
                    <th className="px-3 py-3 text-left font-semibold border border-[#600000] whitespace-nowrap sticky left-0 bg-[#7A0000] z-20">
                      Mat_cd
                    </th>
                    <th className="px-3 py-3 text-left font-semibold border border-[#600000] min-w-[200px]">
                      Material Name
                    </th>
                    <th className="px-3 py-3 text-center font-semibold border border-[#600000] whitespace-nowrap">
                      Unit of Measure
                    </th>
                    {depts.map((dept) => (
                      <th
                        key={dept}
                        className="px-3 py-3 text-right font-semibold border border-[#600000] whitespace-nowrap min-w-[120px]"
                        title={dept}
                      >
                        {dept}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right font-semibold border border-[#600000] whitespace-nowrap bg-[#5A0000]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const rowTotal = depts.reduce((s, d) => s + (row.depts.get(d) || 0), 0);
                    return (
                      <tr
                        key={row.MatCd}
                        className={idx % 2 === 0 ? "bg-white hover:bg-red-50" : "bg-gray-50 hover:bg-red-50"}
                      >
                        <td className="px-3 py-2 font-mono font-semibold border border-gray-200 whitespace-nowrap sticky left-0 bg-inherit">
                          {row.MatCd}
                        </td>
                        <td className="px-3 py-2 border border-gray-200">{row.MatNm}</td>
                        <td className="px-3 py-2 text-center border border-gray-200 whitespace-nowrap">{row.UomCd}</td>
                        {depts.map((d) => (
                          <td key={d} className="px-3 py-2 text-right font-mono border border-gray-200 whitespace-nowrap">
                            {row.depts.get(d) ? formatNumber(row.depts.get(d)) : "—"}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-mono font-bold border border-gray-200 whitespace-nowrap text-[#7A0000]">
                          {formatNumber(rowTotal)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Grand total row */}
                  <tr className="bg-[#f9f0f0] font-bold border-t-2 border-[#7A0000]">
                    <td className="px-3 py-2 border border-gray-300 sticky left-0 bg-[#f9f0f0] text-xs">TOTAL</td>
                    <td className="px-3 py-2 border border-gray-300" />
                    <td className="px-3 py-2 border border-gray-300" />
                    {deptTotals.map((total, i) => (
                      <td key={i} className="px-3 py-2 text-right font-mono border border-gray-300 whitespace-nowrap text-xs">
                        {formatNumber(total)}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-mono border border-gray-300 whitespace-nowrap text-xs text-[#7A0000]">
                      {formatNumber(grandTotal)}
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
                      <td className="px-4 py-2.5 text-xs border border-gray-200">{province.CompNm}</td>
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
